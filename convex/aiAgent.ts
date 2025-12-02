"use node";

import { Agent, createTool } from "@convex-dev/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { components } from "./_generated/api";
import { z } from "zod";
import { Id } from "./_generated/dataModel";
import { rag } from "./rag";

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
 * Daimon - The AI writing companion
 *
 * Named after the ancient Greek concept of a guiding spirit or inner voice,
 * Daimon provides thoughtful feedback and prompts to help writers develop
 * their ideas without writing for them.
 */
export const daimon = new Agent(components.agent, {
  name: "Daimon",
  languageModel: anthropic("claude-sonnet-4-20250514"),
  instructions: `You are Daimon, a thoughtful writing companion—a guiding spirit for serious writers and bloggers.

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
- When using the searchSources tool, always pass the documentId from the context provided at the start of the conversation`,
  tools: {
    searchSources: searchSourcesTool,
  },
  callSettings: {
    temperature: 0.7,
  },
  maxSteps: 5,
});
