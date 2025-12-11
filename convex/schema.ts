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

  // Sources for documents - RAG indexed
  // Supports file uploads, web links, and pasted text
  sources: defineTable({
    documentId: v.id("documents"),
    // Source type discriminator (optional for backwards compatibility with existing file sources)
    sourceType: v.optional(v.union(
      v.literal("file"), // Uploaded file
      v.literal("web"), // Web link scraped via Firecrawl
      v.literal("text") // Pasted text
    )),
    // Display name (filename, page title, or user-provided title)
    // Legacy sources use 'filename' field instead
    title: v.optional(v.string()),
    filename: v.optional(v.string()), // Legacy field, kept for backwards compatibility
    // For file sources
    storageId: v.optional(v.id("_storage")),
    mimeType: v.optional(v.string()),
    // For web sources
    url: v.optional(v.string()),
    // Status tracking
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

  // Document-level AI settings
  documentSettings: defineTable({
    documentId: v.id("documents"),
    ownerId: v.id("users"),

    // Model configuration
    model: v.string(), // e.g., "claude-sonnet-4-20250514", "gpt-5"
    provider: v.union(v.literal("anthropic"), v.literal("openai")),
    temperature: v.number(), // 0.0 - 2.0
    maxSteps: v.number(), // 1-10

    // System prompt configuration
    systemPrompt: v.string(),

    // Document context for AI
    description: v.optional(v.string()), // Brief description of document/audience

    // Tool configuration
    tools: v.object({
      searchSources: v.boolean(),
      webSearch: v.boolean(),
      citation: v.boolean(),
    }),

    updatedAt: v.number(),
  })
    .index("by_documentId", ["documentId"])
    .index("by_ownerId", ["ownerId"]),
});
