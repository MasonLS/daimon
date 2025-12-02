"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { rag } from "./rag";

/**
 * Index a source with pre-extracted text into RAG.
 * Text extraction happens client-side (PDF.js, etc.) for better performance.
 */
export const indexSource = internalAction({
  args: {
    sourceId: v.id("sources"),
    documentId: v.id("documents"),
    filename: v.string(),
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
          filename: args.filename,
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
