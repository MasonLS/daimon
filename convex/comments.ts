import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { daimon } from "./aiAgent";

// ============================================================================
// Queries
// ============================================================================

/**
 * List all comments for a document with their messages
 */
export const listByDocument = query({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      _creationTime: v.number(),
      documentId: v.id("documents"),
      commentId: v.string(),
      selectedText: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("streaming"),
        v.literal("complete"),
        v.literal("error")
      ),
      ownerId: v.id("users"),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
      messages: v.array(
        v.object({
          _id: v.id("commentMessages"),
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
          createdAt: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get document to verify ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) return [];

    // Get all unresolved comments for this document
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.eq(q.field("resolvedAt"), undefined))
      .collect();

    // Get messages for each comment
    const commentsWithMessages = await Promise.all(
      comments.map(async (comment) => {
        const messages = await ctx.db
          .query("commentMessages")
          .withIndex("by_commentId", (q) => q.eq("commentId", comment._id))
          .collect();

        return {
          ...comment,
          messages: messages.map((m) => ({
            _id: m._id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        };
      })
    );

    return commentsWithMessages;
  },
});

/**
 * Get comment count for a document (for badge display)
 */
export const countByDocument = query({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) return 0;

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.eq(q.field("resolvedAt"), undefined))
      .collect();

    return comments.length;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new comment and trigger AI response
 */
export const create = mutation({
  args: {
    documentId: v.id("documents"),
    commentId: v.string(), // UUID from frontend
    selectedText: v.string(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify document ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) {
      throw new Error("Document not found");
    }

    // Create the comment
    const commentDbId = await ctx.db.insert("comments", {
      documentId: args.documentId,
      commentId: args.commentId,
      selectedText: args.selectedText,
      status: "pending",
      ownerId: userId,
      createdAt: Date.now(),
    });

    // Store the user's highlighted text as initial message
    await ctx.db.insert("commentMessages", {
      commentId: commentDbId,
      role: "user",
      content: args.selectedText,
      createdAt: Date.now(),
    });

    // Schedule AI response generation
    await ctx.scheduler.runAfter(0, internal.comments.generateAIResponse, {
      commentDbId,
      documentId: args.documentId,
      selectedText: args.selectedText,
      userId,
    });

    return commentDbId;
  },
});

/**
 * Add a user reply to a comment thread
 */
export const addReply = mutation({
  args: {
    commentDbId: v.id("comments"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentDbId);
    if (!comment || comment.ownerId !== userId) {
      throw new Error("Comment not found");
    }

    // Add user message
    await ctx.db.insert("commentMessages", {
      commentId: args.commentDbId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });

    // Update status to pending
    await ctx.db.patch(args.commentDbId, { status: "pending" });

    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.comments.generateReply, {
      commentDbId: args.commentDbId,
      documentId: comment.documentId,
      userId,
    });

    return null;
  },
});

/**
 * Resolve (dismiss) a comment
 */
export const resolve = mutation({
  args: {
    commentDbId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentDbId);
    if (!comment || comment.ownerId !== userId) {
      throw new Error("Comment not found");
    }

    await ctx.db.patch(args.commentDbId, {
      resolvedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// Internal mutations for AI response handling
// ============================================================================

export const updateCommentStatus = internalMutation({
  args: {
    commentDbId: v.id("comments"),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("error")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentDbId, { status: args.status });
    return null;
  },
});

export const saveAIMessage = internalMutation({
  args: {
    commentDbId: v.id("comments"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("commentMessages", {
      commentId: args.commentDbId,
      role: "assistant",
      content: args.content,
      createdAt: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// Actions for AI generation
// ============================================================================

/**
 * Generate initial AI response for a new comment
 */
export const generateAIResponse = internalAction({
  args: {
    commentDbId: v.id("comments"),
    documentId: v.id("documents"),
    selectedText: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Update status to streaming
      await ctx.runMutation(internal.comments.updateCommentStatus, {
        commentDbId: args.commentDbId,
        status: "streaming",
      });

      // Create a thread for this comment
      const { threadId } = await daimon.createThread(ctx, {
        userId: args.userId,
      });

      // Generate response from Daimon, including documentId in context for the search tool
      const result = await daimon.generateText(
        ctx,
        { threadId },
        {
          prompt: `[Context: documentId=${args.documentId}]\n\n${args.selectedText}`,
        }
      );

      // Save the AI response
      await ctx.runMutation(internal.comments.saveAIMessage, {
        commentDbId: args.commentDbId,
        content: result.text,
      });

      // Update status to complete
      await ctx.runMutation(internal.comments.updateCommentStatus, {
        commentDbId: args.commentDbId,
        status: "complete",
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      await ctx.runMutation(internal.comments.updateCommentStatus, {
        commentDbId: args.commentDbId,
        status: "error",
      });
    }

    return null;
  },
});

/**
 * Generate AI response for a reply in an existing thread
 */
export const generateReply = internalAction({
  args: {
    commentDbId: v.id("comments"),
    documentId: v.id("documents"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Update status to streaming
      await ctx.runMutation(internal.comments.updateCommentStatus, {
        commentDbId: args.commentDbId,
        status: "streaming",
      });

      // Get all messages for this comment to build context
      const comment = await ctx.runQuery(internal.comments.getCommentWithMessages, {
        commentDbId: args.commentDbId,
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      // Create a new thread (we don't persist thread IDs, so each reply is fresh but with context)
      const { threadId } = await daimon.createThread(ctx, {
        userId: args.userId,
      });

      // Build conversation context
      const conversationContext = comment.messages
        .map((m) => `${m.role === "user" ? "Writer" : "Daimon"}: ${m.content}`)
        .join("\n\n");

      const prompt = `[Context: documentId=${args.documentId}]\n\nPrevious conversation about highlighted text "${comment.selectedText}":\n\n${conversationContext}\n\nContinue the conversation as Daimon, responding to the writer's latest message.`;

      // Generate response from Daimon
      const result = await daimon.generateText(
        ctx,
        { threadId },
        {
          prompt,
        }
      );

      // Save the AI response
      await ctx.runMutation(internal.comments.saveAIMessage, {
        commentDbId: args.commentDbId,
        content: result.text,
      });

      // Update status to complete
      await ctx.runMutation(internal.comments.updateCommentStatus, {
        commentDbId: args.commentDbId,
        status: "complete",
      });
    } catch (error) {
      console.error("Error generating reply:", error);
      await ctx.runMutation(internal.comments.updateCommentStatus, {
        commentDbId: args.commentDbId,
        status: "error",
      });
    }

    return null;
  },
});

// Internal query to get comment with messages for reply context
export const getCommentWithMessages = internalQuery({
  args: {
    commentDbId: v.id("comments"),
  },
  returns: v.union(
    v.null(),
    v.object({
      selectedText: v.string(),
      messages: v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentDbId);
    if (!comment) return null;

    const messages = await ctx.db
      .query("commentMessages")
      .withIndex("by_commentId", (q) => q.eq("commentId", args.commentDbId))
      .collect();

    return {
      selectedText: comment.selectedText,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  },
});
