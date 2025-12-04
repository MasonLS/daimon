import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  documents: defineTable({
    title: v.string(),
    content: v.string(), // JSON-stringified TipTap content
    ownerId: v.id("users"),
    updatedAt: v.number(),
    isArchived: v.optional(v.boolean()),
  }).index("by_ownerId", ["ownerId"]),

  // Comments for AI-powered feedback
  comments: defineTable({
    documentId: v.id("documents"),
    commentId: v.string(), // UUID stored in TipTap mark
    selectedText: v.string(), // The text that was highlighted
    status: v.union(
      v.literal("awaiting_input"), // Waiting for user's initial message (Add Comment flow)
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("error")
    ),
    ownerId: v.id("users"),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_documentId", ["documentId"])
    .index("by_commentId", ["commentId"]),

  // Comment messages for threaded conversations
  commentMessages: defineTable({
    commentId: v.id("comments"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_commentId", ["commentId"]),

  // Sources (file attachments) for documents - RAG indexed
  sources: defineTable({
    documentId: v.id("documents"),
    filename: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("indexed"),
      v.literal("error")
    ),
    ragEntryId: v.optional(v.string()), // RAG entry ID for deletion
    errorMessage: v.optional(v.string()),
    ownerId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_documentId", ["documentId"])
    .index("by_storageId", ["storageId"]),
});
