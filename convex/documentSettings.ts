import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { DEFAULT_SYSTEM_PROMPT } from "./aiAgent";

// Available AI models configuration
export const AVAILABLE_MODELS = {
  anthropic: {
    "claude-opus-4-5-20250514": { name: "Claude Opus 4.5", context: "200k" },
    "claude-sonnet-4-5-20250826": { name: "Claude Sonnet 4.5", context: "1M" },
    "claude-haiku-4-5-20241022": { name: "Claude Haiku 4.5", context: "200k" },
  },
  openai: {
    "gpt-5.2": { name: "GPT-5.2 Thinking", context: "200k" },
    "gpt-5.2-chat-latest": { name: "GPT-5.2 Instant", context: "200k" },
    "gpt-5.2-pro": { name: "GPT-5.2 Pro", context: "200k" },
    "gpt-4.1": { name: "GPT-4.1", context: "1M" },
    "gpt-4.1-mini": { name: "GPT-4.1 Mini", context: "1M" },
    "o4-mini": { name: "o4-mini", context: "200k" },
  },
} as const;

// Default settings values
export const DEFAULT_SETTINGS = {
  model: "claude-sonnet-4-5-20250826" as string,
  provider: "anthropic" as const,
  temperature: 0.7,
  maxSteps: 5,
  tools: {
    searchSources: true,
    webSearch: false,
    citation: false,
  },
};

// Settings type for internal use
export type DocumentSettingsData = {
  documentId: Id<"documents">;
  ownerId: Id<"users">;
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

// Validators for tools object
const toolsValidator = v.object({
  searchSources: v.boolean(),
  webSearch: v.boolean(),
  citation: v.boolean(),
});

// Get settings for a document (returns defaults if none exist)
export const get = query({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.object({
      _id: v.optional(v.id("documentSettings")),
      documentId: v.id("documents"),
      model: v.string(),
      provider: v.union(v.literal("anthropic"), v.literal("openai")),
      temperature: v.number(),
      maxSteps: v.number(),
      systemPrompt: v.string(),
      description: v.optional(v.string()),
      tools: toolsValidator,
      hasCustomSettings: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Verify document ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) {
      return null;
    }

    // Look for existing settings
    const settings = await ctx.db
      .query("documentSettings")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .first();

    if (settings) {
      return {
        _id: settings._id,
        documentId: settings.documentId,
        model: settings.model,
        provider: settings.provider,
        temperature: settings.temperature,
        maxSteps: settings.maxSteps,
        systemPrompt: settings.systemPrompt,
        description: settings.description,
        tools: settings.tools,
        hasCustomSettings: true,
      };
    }

    // Return defaults if no settings exist
    return {
      _id: undefined,
      documentId: args.documentId,
      model: DEFAULT_SETTINGS.model,
      provider: DEFAULT_SETTINGS.provider,
      temperature: DEFAULT_SETTINGS.temperature,
      maxSteps: DEFAULT_SETTINGS.maxSteps,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      description: undefined,
      tools: DEFAULT_SETTINGS.tools,
      hasCustomSettings: false,
    };
  },
});

// Internal query for use in actions (no auth check - caller must verify)
export const getInternal = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.object({
    documentId: v.id("documents"),
    model: v.string(),
    provider: v.union(v.literal("anthropic"), v.literal("openai")),
    temperature: v.number(),
    maxSteps: v.number(),
    systemPrompt: v.string(),
    description: v.optional(v.string()),
    tools: toolsValidator,
  }),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("documentSettings")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .first();

    if (settings) {
      return {
        documentId: settings.documentId,
        model: settings.model,
        provider: settings.provider,
        temperature: settings.temperature,
        maxSteps: settings.maxSteps,
        systemPrompt: settings.systemPrompt,
        description: settings.description,
        tools: settings.tools,
      };
    }

    // Return defaults
    return {
      documentId: args.documentId,
      model: DEFAULT_SETTINGS.model,
      provider: DEFAULT_SETTINGS.provider,
      temperature: DEFAULT_SETTINGS.temperature,
      maxSteps: DEFAULT_SETTINGS.maxSteps,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      description: undefined,
      tools: DEFAULT_SETTINGS.tools,
    };
  },
});

// Create or update settings for a document
export const upsert = mutation({
  args: {
    documentId: v.id("documents"),
    model: v.string(),
    provider: v.union(v.literal("anthropic"), v.literal("openai")),
    temperature: v.number(),
    maxSteps: v.number(),
    systemPrompt: v.string(),
    description: v.optional(v.string()),
    tools: toolsValidator,
  },
  returns: v.id("documentSettings"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify document ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== userId) {
      throw new Error("Document not found or access denied");
    }

    // Validate temperature range
    if (args.temperature < 0 || args.temperature > 2) {
      throw new Error("Temperature must be between 0 and 2");
    }

    // Validate maxSteps range
    if (args.maxSteps < 1 || args.maxSteps > 10) {
      throw new Error("Max steps must be between 1 and 10");
    }

    // Check for existing settings
    const existing = await ctx.db
      .query("documentSettings")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        model: args.model,
        provider: args.provider,
        temperature: args.temperature,
        maxSteps: args.maxSteps,
        systemPrompt: args.systemPrompt,
        description: args.description,
        tools: args.tools,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("documentSettings", {
        documentId: args.documentId,
        ownerId: userId,
        model: args.model,
        provider: args.provider,
        temperature: args.temperature,
        maxSteps: args.maxSteps,
        systemPrompt: args.systemPrompt,
        description: args.description,
        tools: args.tools,
        updatedAt: now,
      });
      return settingsId;
    }
  },
});

// Copy settings from one document to another
export const copyFrom = mutation({
  args: {
    targetDocumentId: v.id("documents"),
    sourceDocumentId: v.id("documents"),
  },
  returns: v.id("documentSettings"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify ownership of both documents
    const targetDoc = await ctx.db.get(args.targetDocumentId);
    const sourceDoc = await ctx.db.get(args.sourceDocumentId);

    if (!targetDoc || targetDoc.ownerId !== userId) {
      throw new Error("Target document not found or access denied");
    }
    if (!sourceDoc || sourceDoc.ownerId !== userId) {
      throw new Error("Source document not found or access denied");
    }

    // Get source settings (or defaults)
    const sourceSettings = await ctx.db
      .query("documentSettings")
      .withIndex("by_documentId", (q) =>
        q.eq("documentId", args.sourceDocumentId)
      )
      .first();

    const settingsToApply = sourceSettings || {
      model: DEFAULT_SETTINGS.model,
      provider: DEFAULT_SETTINGS.provider,
      temperature: DEFAULT_SETTINGS.temperature,
      maxSteps: DEFAULT_SETTINGS.maxSteps,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      description: undefined,
      tools: DEFAULT_SETTINGS.tools,
    };

    // Check for existing target settings
    const existingTarget = await ctx.db
      .query("documentSettings")
      .withIndex("by_documentId", (q) =>
        q.eq("documentId", args.targetDocumentId)
      )
      .first();

    const now = Date.now();

    if (existingTarget) {
      // Update existing
      await ctx.db.patch(existingTarget._id, {
        model: settingsToApply.model,
        provider: settingsToApply.provider,
        temperature: settingsToApply.temperature,
        maxSteps: settingsToApply.maxSteps,
        systemPrompt: settingsToApply.systemPrompt,
        description: settingsToApply.description,
        tools: settingsToApply.tools,
        updatedAt: now,
      });
      return existingTarget._id;
    } else {
      // Create new
      const settingsId = await ctx.db.insert("documentSettings", {
        documentId: args.targetDocumentId,
        ownerId: userId,
        model: settingsToApply.model,
        provider: settingsToApply.provider,
        temperature: settingsToApply.temperature,
        maxSteps: settingsToApply.maxSteps,
        systemPrompt: settingsToApply.systemPrompt,
        description: settingsToApply.description,
        tools: settingsToApply.tools,
        updatedAt: now,
      });
      return settingsId;
    }
  },
});

// List user's documents for "copy from" dropdown
export const listUserDocumentsForCopy = query({
  args: { excludeDocumentId: v.id("documents") },
  returns: v.array(
    v.object({
      _id: v.id("documents"),
      title: v.string(),
      hasCustomSettings: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .collect();

    // Filter out archived and the excluded document
    const filteredDocs = documents.filter(
      (doc) => !doc.isArchived && doc._id !== args.excludeDocumentId
    );

    // Check which have custom settings
    const result = await Promise.all(
      filteredDocs.map(async (doc) => {
        const settings = await ctx.db
          .query("documentSettings")
          .withIndex("by_documentId", (q) => q.eq("documentId", doc._id))
          .first();
        return {
          _id: doc._id,
          title: doc.title,
          hasCustomSettings: settings !== null,
        };
      })
    );

    return result;
  },
});

// Get the default system prompt (for display in UI)
export const getDefaultPrompt = query({
  args: {},
  returns: v.string(),
  handler: async () => {
    return DEFAULT_SYSTEM_PROMPT;
  },
});

// Get available models (for display in UI)
export const getAvailableModels = query({
  args: {},
  returns: v.object({
    anthropic: v.record(
      v.string(),
      v.object({ name: v.string(), context: v.string() })
    ),
    openai: v.record(
      v.string(),
      v.object({ name: v.string(), context: v.string() })
    ),
  }),
  handler: async () => {
    return AVAILABLE_MODELS;
  },
});
