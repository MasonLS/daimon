"use node";

import { Agent, createTool } from "@convex-dev/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";
import { z } from "zod";
import { Id } from "./_generated/dataModel";
import { rag } from "./rag";

/**
 * Default system prompt for Daimon
 * Exported so it can be used as the default in document settings
 */
export const DEFAULT_SYSTEM_PROMPT = `You are Daimon, a thoughtful writing companion—a guiding spirit for serious writers and bloggers.

Your role is to be a whisper, not a shout. You never write for users or suggest specific phrasing. Instead, you prompt with ideas and point toward source material they might explore.

When a user highlights text and summons you:

1. **If the text is a question or prompt** (contains "?", starts with action words like "help", "what", "how", "should", "can you", etc.):
   - Respond helpfully to their question
   - Offer perspective, considerations, or references
   - Ask clarifying questions if the request is ambiguous
   - If the question relates to their research or source materials, use the searchSources tool to find relevant context

2. **If the text is their writing**:
   - Offer observations about what you notice (not prescriptions)
   - Ask questions that might deepen their thinking
   - Point toward themes, tensions, or possibilities you see
   - Suggest areas they might want to explore further
   - Reference relevant concepts, authors, or works if appropriate
   - If relevant, search their attached sources to connect their writing to their research

Guidelines:
- Be concise but insightful—a margin note, not an essay
- Match your tone to their writing style
- Honor their voice; don't impose your own
- When uncertain, ask rather than assume
- Offer one or two focused thoughts rather than a list
- You are a creative partner, not a critic or editor
- You have access to the writer's attached source materials (research documents, PDFs, etc.)—use them when relevant to provide grounded insights
- When using the searchSources tool, always pass the documentId from the context provided at the start of the conversation`;

/**
 * Tool for searching the writer's attached source materials.
 * Takes documentId as a parameter so the agent can search the correct namespace.
 */
const searchSourcesTool = createTool({
  description:
    "Search the writer's attached source materials (research documents, PDFs, notes) for relevant context, quotes, or information. Use this when the writer asks about their research or when their writing could benefit from connecting to their sources. You must provide the documentId from the conversation context.",
  args: z.object({
    documentId: z
      .string()
      .describe("The document ID provided in the conversation context"),
    query: z
      .string()
      .describe(
        "What to search for in the sources. Be specific about the concept, quote, or information you're looking for."
      ),
  }),
  handler: async (ctx, { documentId, query }) => {
    try {
      const results = await rag.search(ctx, {
        namespace: documentId as Id<"documents">,
        query,
        limit: 5,
      });

      if (!results.text || results.text.trim().length === 0) {
        return "No relevant content found in the attached sources.";
      }

      return `Found relevant content from the writer's sources:\n\n${results.text}`;
    } catch (error) {
      console.error("Error searching sources:", error);
      return "Unable to search sources at this time.";
    }
  },
});

/**
 * Web search tool for finding current information from the internet.
 * Requires TAVILY_API_KEY environment variable to be set.
 */
const webSearchTool = createTool({
  description:
    "Search the web for current information, facts, references, or recent events. Use this when the writer needs up-to-date information or wants to verify facts that may not be in their source materials.",
  args: z.object({
    query: z
      .string()
      .describe("The search query to find relevant information on the web"),
  }),
  handler: async (_ctx, { query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return "Web search is not available. The TAVILY_API_KEY environment variable is not configured.";
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          include_answer: true,
          max_results: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.answer) {
        let result = `Summary: ${data.answer}\n\nSources:\n`;
        for (const item of data.results || []) {
          result += `- ${item.title}: ${item.url}\n`;
        }
        return result;
      }

      if (data.results && data.results.length > 0) {
        let result = "Web search results:\n\n";
        for (const item of data.results) {
          result += `**${item.title}**\n${item.content}\nSource: ${item.url}\n\n`;
        }
        return result;
      }

      return "No relevant results found for this search query.";
    } catch (error) {
      console.error("Error performing web search:", error);
      return "Unable to perform web search at this time.";
    }
  },
});

/**
 * Citation tool for generating formatted citations from document sources.
 */
const citationTool = createTool({
  description:
    "Generate a formatted citation for one of the writer's attached sources. Use this when the writer wants to properly cite a source in their document.",
  args: z.object({
    documentId: z
      .string()
      .describe("The document ID provided in the conversation context"),
    sourceTitle: z
      .string()
      .describe(
        "The title or name of the source to cite (from the document's attached sources)"
      ),
    format: z
      .enum(["apa", "mla", "chicago"])
      .optional()
      .describe("Citation format (defaults to APA if not specified)"),
  }),
  handler: async (ctx, { documentId, sourceTitle, format = "apa" }) => {
    try {
      // Search for the source in the document's sources
      const sources = await ctx.runQuery(
        // @ts-expect-error - Internal API access
        "sources:listByDocument",
        { documentId: documentId as Id<"documents"> }
      );

      // Find the matching source
      const source = sources?.find(
        (s: { title?: string; filename?: string; url?: string }) =>
          s.title?.toLowerCase().includes(sourceTitle.toLowerCase()) ||
          s.filename?.toLowerCase().includes(sourceTitle.toLowerCase())
      );

      if (!source) {
        return `Could not find a source matching "${sourceTitle}" in the document's attached sources.`;
      }

      const title = source.title || source.filename || "Untitled Source";
      const url = source.url;
      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Generate citation based on format
      switch (format) {
        case "mla":
          if (url) {
            return `"${title}." Web. Accessed ${date}. <${url}>.`;
          }
          return `"${title}." Document.`;
        case "chicago":
          if (url) {
            return `"${title}." Accessed ${date}. ${url}.`;
          }
          return `"${title}."`;
        case "apa":
        default:
          if (url) {
            return `${title}. Retrieved ${date}, from ${url}`;
          }
          return `${title}. [Document].`;
      }
    } catch (error) {
      console.error("Error generating citation:", error);
      return "Unable to generate citation at this time.";
    }
  },
});

/**
 * Document settings type for creating dynamic agents
 */
export type DocumentSettings = {
  model: string;
  provider: "anthropic" | "openai";
  temperature: number;
  maxSteps: number;
  systemPrompt: string;
  description?: string;
  tools: {
    searchSources: boolean;
    webSearch: boolean;
    citation: boolean;
  };
};

/**
 * Creates a Daimon agent configured with document-specific settings.
 * This factory function allows each document to have its own AI configuration.
 */
export function createDaimonAgent(settings: DocumentSettings) {
  // Select the language model based on provider
  const languageModel =
    settings.provider === "anthropic"
      ? anthropic(settings.model)
      : openai(settings.model);

  // Build tools object based on settings
  // Using `as const` pattern to satisfy the Agent tools type
  const tools: Record<string, typeof searchSourcesTool | typeof webSearchTool | typeof citationTool> = {};

  if (settings.tools.searchSources) {
    tools.searchSources = searchSourcesTool;
  }
  if (settings.tools.webSearch) {
    tools.webSearch = webSearchTool;
  }
  if (settings.tools.citation) {
    tools.citation = citationTool;
  }

  // Use the stored system prompt
  const basePrompt = settings.systemPrompt;

  // Append document description if provided
  const instructions = settings.description
    ? `${basePrompt}\n\n[Document Context: ${settings.description}]`
    : basePrompt;

  return new Agent(components.agent, {
    name: "Daimon",
    languageModel,
    instructions,
    tools,
    callSettings: {
      temperature: settings.temperature,
    },
    maxSteps: settings.maxSteps,
  });
}

/**
 * Default Daimon agent - used when no custom settings exist
 * Kept for backwards compatibility
 */
export const daimon = new Agent(components.agent, {
  name: "Daimon",
  languageModel: anthropic("claude-sonnet-4-5-20250929"),
  instructions: DEFAULT_SYSTEM_PROMPT,
  tools: {
    searchSources: searchSourcesTool,
  },
  callSettings: {
    temperature: 0.7,
  },
  maxSteps: 5,
});
