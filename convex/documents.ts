import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// List all non-archived documents for the current user
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("documents"),
      _creationTime: v.number(),
      title: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();

    return documents
      .filter((doc) => !doc.isArchived)
      .map((doc) => ({
        _id: doc._id,
        _creationTime: doc._creationTime,
        title: doc.title,
        updatedAt: doc.updatedAt,
      }));
  },
});

// List all archived documents for the current user
export const listArchived = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("documents"),
      _creationTime: v.number(),
      title: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();

    return documents
      .filter((doc) => doc.isArchived === true)
      .map((doc) => ({
        _id: doc._id,
        _creationTime: doc._creationTime,
        title: doc.title,
        updatedAt: doc.updatedAt,
      }));
  },
});

// Get a single document by ID (with ownership check)
export const get = query({
  args: { id: v.id("documents") },
  returns: v.union(
    v.object({
      _id: v.id("documents"),
      _creationTime: v.number(),
      title: v.string(),
      content: v.string(),
      ownerId: v.id("users"),
      updatedAt: v.number(),
      isArchived: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const document = await ctx.db.get(args.id);
    if (!document || document.ownerId !== userId) {
      return null;
    }

    return document;
  },
});

// Create a new document
export const create = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content ?? JSON.stringify({ type: "doc", content: [] }),
      ownerId: userId,
      updatedAt: now,
    });

    return documentId;
  },
});

// Update document title and/or content
export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document || document.ownerId !== userId) {
      throw new Error("Document not found or access denied");
    }

    const updates: { title?: string; content?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.content !== undefined) {
      updates.content = args.content;
    }

    await ctx.db.patch(args.id, updates);
    return null;
  },
});

// Delete a document
export const remove = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document || document.ownerId !== userId) {
      throw new Error("Document not found or access denied");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Archive a document
export const archive = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document || document.ownerId !== userId) {
      throw new Error("Document not found or access denied");
    }

    await ctx.db.patch(args.id, { isArchived: true });
    return null;
  },
});

// Restore an archived document
export const restore = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document || document.ownerId !== userId) {
      throw new Error("Document not found or access denied");
    }

    await ctx.db.patch(args.id, { isArchived: false });
    return null;
  },
});

