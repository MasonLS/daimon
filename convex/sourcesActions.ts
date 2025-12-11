"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { rag } from "./rag";
import FirecrawlApp from "@mendable/firecrawl-js";

/**
 * Index a source with pre-extracted text into RAG.
 * Used for file sources (text extracted client-side) and text sources.
 */
export const indexSource = internalAction({
  args: {
    sourceId: v.id("sources"),
    documentId: v.id("documents"),
    title: v.string(),
    extractedText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      if (!args.extractedText || args.extractedText.trim().length === 0) {
        throw new Error("No text content provided");
      }

      // Add to RAG index with document ID as namespace
      // This ensures each document has isolated sources
      const { entryId } = await rag.add(ctx, {
        namespace: args.documentId,
        key: args.sourceId,
        text: args.extractedText,
        metadata: {
          sourceId: args.sourceId,
          title: args.title,
        },
      });

      // Update status to indexed and save the RAG entry ID
      await ctx.runMutation(internal.sources.updateStatus, {
        sourceId: args.sourceId,
        status: "indexed",
        ragEntryId: entryId,
      });
    } catch (error) {
      console.error("Error indexing source:", error);
      await ctx.runMutation(internal.sources.updateStatus, {
        sourceId: args.sourceId,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }

    return null;
  },
});

/**
 * Scrape a web URL using Firecrawl and index the content.
 */
export const scrapeAndIndexWebSource = internalAction({
  args: {
    sourceId: v.id("sources"),
    documentId: v.id("documents"),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        throw new Error("FIRECRAWL_API_KEY environment variable not set");
      }

      const firecrawl = new FirecrawlApp({ apiKey });

      // Scrape the URL
      const result = await firecrawl.scrape(args.url, {
        formats: ["markdown"],
      });

      const markdown = result.markdown;
      if (!markdown || markdown.trim().length === 0) {
        throw new Error("No content extracted from URL");
      }

      // Get page title from metadata or use URL
      const pageTitle = result.metadata?.title || new URL(args.url).hostname;

      // Update the source title with the page title
      await ctx.runMutation(internal.sources.updateTitle, {
        sourceId: args.sourceId,
        title: pageTitle,
      });

      // Add to RAG index
      const { entryId } = await rag.add(ctx, {
        namespace: args.documentId,
        key: args.sourceId,
        text: markdown,
        metadata: {
          sourceId: args.sourceId,
          title: pageTitle,
          url: args.url,
        },
      });

      // Update status to indexed
      await ctx.runMutation(internal.sources.updateStatus, {
        sourceId: args.sourceId,
        status: "indexed",
        ragEntryId: entryId,
      });
    } catch (error) {
      console.error("Error scraping/indexing web source:", error);
      await ctx.runMutation(internal.sources.updateStatus, {
        sourceId: args.sourceId,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Failed to scrape URL",
      });
    }

    return null;
  },
});

/**
 * Cleanup RAG entries when a source is deleted.
 */
export const cleanupRagEntries = internalAction({
  args: {
    ragEntryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Delete the RAG entry
      await rag.delete(ctx, {
        entryId: args.ragEntryId as any, // Type assertion needed for RAG library
      });
    } catch (error) {
      // Log but don't fail - the source is already deleted
      console.error("Error cleaning up RAG entries:", error);
    }
    return null;
  },
});
