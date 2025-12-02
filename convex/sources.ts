import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Generate a presigned URL for uploading a file to Convex storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new source (file attachment) for a document.
 * Text should be extracted client-side and passed here for RAG indexing.
 */
export const create = mutation({
  args: {
    documentId: v.id("documents"),
    filename: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    extractedText: v.string(), // Text extracted client-side (PDF.js, etc.)
  },
  returns: v.id("sources"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify document ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) {
      throw new Error("Document not found or not authorized");
    }

    // Create the source record
    const sourceId = await ctx.db.insert("sources", {
      documentId: args.documentId,
      filename: args.filename,
      storageId: args.storageId,
      mimeType: args.mimeType,
      status: "processing",
      ownerId: userId,
      createdAt: Date.now(),
    });

    // Schedule async RAG indexing with the pre-extracted text
    await ctx.scheduler.runAfter(0, internal.sourcesActions.indexSource, {
      sourceId,
      documentId: args.documentId,
      filename: args.filename,
      extractedText: args.extractedText,
    });

    return sourceId;
  },
});

/**
 * Get source count for a document (for badge display).
 */
export const countByDocument = query({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return 0;
    }

    // Verify document ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) {
      return 0;
    }

    const sources = await ctx.db
      .query("sources")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();

    return sources.length;
  },
});

/**
 * List all sources for a document.
 */
export const listByDocument = query({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.array(
    v.object({
      _id: v.id("sources"),
      _creationTime: v.number(),
      filename: v.string(),
      mimeType: v.string(),
      status: v.union(
        v.literal("uploading"),
        v.literal("processing"),
        v.literal("indexed"),
        v.literal("error")
      ),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify document ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) {
      return [];
    }

    const sources = await ctx.db
      .query("sources")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();

    return sources.map((source) => ({
      _id: source._id,
      _creationTime: source._creationTime,
      filename: source.filename,
      mimeType: source.mimeType,
      status: source.status,
      errorMessage: source.errorMessage,
      createdAt: source.createdAt,
    }));
  },
});

/**
 * Remove a source and its RAG entries.
 */
export const remove = mutation({
  args: {
    sourceId: v.id("sources"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const source = await ctx.db.get(args.sourceId);
    if (!source || source.ownerId !== userId) {
      throw new Error("Source not found or not authorized");
    }

    // Delete the file from storage
    await ctx.storage.delete(source.storageId);

    // Delete the source record
    await ctx.db.delete(args.sourceId);

    // Schedule RAG cleanup if we have an entry ID
    if (source.ragEntryId) {
      await ctx.scheduler.runAfter(0, internal.sourcesActions.cleanupRagEntries, {
        ragEntryId: source.ragEntryId,
      });
    }

    return null;
  },
});

/**
 * Internal mutation to update source status.
 */
export const updateStatus = internalMutation({
  args: {
    sourceId: v.id("sources"),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("indexed"),
      v.literal("error")
    ),
    ragEntryId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: {
      status: typeof args.status;
      errorMessage?: string;
      ragEntryId?: string;
    } = {
      status: args.status,
    };
    if (args.errorMessage !== undefined) {
      patch.errorMessage = args.errorMessage;
    }
    if (args.ragEntryId !== undefined) {
      patch.ragEntryId = args.ragEntryId;
    }
    await ctx.db.patch(args.sourceId, patch);
    return null;
  },
});

/**
 * Internal query to get source data for processing.
 */
export const getSourceInternal = internalQuery({
  args: {
    sourceId: v.id("sources"),
  },
  returns: v.union(
    v.object({
      _id: v.id("sources"),
      documentId: v.id("documents"),
      storageId: v.id("_storage"),
      filename: v.string(),
      mimeType: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return null;
    return {
      _id: source._id,
      documentId: source.documentId,
      storageId: source.storageId,
      filename: source.filename,
      mimeType: source.mimeType,
    };
  },
});
