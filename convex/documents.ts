import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// TEMPORARY: Clear all dev data for testing
export const clearAllDevData = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();
    const comments = await ctx.db.query("comments").collect();
    const messages = await ctx.db.query("commentMessages").collect();
    const settings = await ctx.db.query("documentSettings").collect();
    const prefs = await ctx.db.query("userPreferences").collect();
    for (const doc of documents) await ctx.db.delete(doc._id);
    for (const comment of comments) await ctx.db.delete(comment._id);
    for (const msg of messages) await ctx.db.delete(msg._id);
    for (const setting of settings) await ctx.db.delete(setting._id);
    for (const pref of prefs) await ctx.db.delete(pref._id);
    return null;
  },
});

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

// Validator for preset settings (matches documentSettings structure)
const presetSettingsValidator = v.object({
  model: v.string(),
  provider: v.union(v.literal("anthropic"), v.literal("openai")),
  temperature: v.number(),
  maxSteps: v.number(),
  systemPrompt: v.string(),
  description: v.string(),
  tools: v.object({
    searchSources: v.boolean(),
    webSearch: v.boolean(),
    citation: v.boolean(),
  }),
});

// Create a document with optional preset settings
export const createWithPreset = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    preset: v.union(presetSettingsValidator, v.null()),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Create the document
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content ?? JSON.stringify({ type: "doc", content: [] }),
      ownerId: userId,
      updatedAt: now,
    });

    // If preset provided, create document settings
    if (args.preset) {
      await ctx.db.insert("documentSettings", {
        documentId,
        ownerId: userId,
        model: args.preset.model,
        provider: args.preset.provider,
        temperature: args.preset.temperature,
        maxSteps: args.preset.maxSteps,
        systemPrompt: args.preset.systemPrompt,
        description: args.preset.description,
        tools: args.preset.tools,
        updatedAt: now,
      });
    }

    return documentId;
  },
});

// Create a document with settings copied from another document
export const createWithCopy = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    sourceDocumentId: v.id("documents"),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify source document ownership
    const sourceDoc = await ctx.db.get(args.sourceDocumentId);
    if (!sourceDoc || sourceDoc.ownerId !== userId) {
      throw new Error("Source document not found or access denied");
    }

    const now = Date.now();

    // Create the document
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content ?? JSON.stringify({ type: "doc", content: [] }),
      ownerId: userId,
      updatedAt: now,
    });

    // Get source settings (if any)
    const sourceSettings = await ctx.db
      .query("documentSettings")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.sourceDocumentId))
      .first();

    // Copy settings if source has them
    if (sourceSettings) {
      await ctx.db.insert("documentSettings", {
        documentId,
        ownerId: userId,
        model: sourceSettings.model,
        provider: sourceSettings.provider,
        temperature: sourceSettings.temperature,
        maxSteps: sourceSettings.maxSteps,
        systemPrompt: sourceSettings.systemPrompt,
        description: sourceSettings.description,
        tools: sourceSettings.tools,
        updatedAt: now,
      });
    }

    return documentId;
  },
});

// Create an onboarding document with Daimon's introduction
export const createOnboardingDocument = mutation({
  args: {
    title: v.string(),
    preset: v.union(presetSettingsValidator, v.null()),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Generate unique comment IDs for each section
    const welcomeCommentId = crypto.randomUUID();
    const summonCommentId = crypto.randomUUID();
    const sourcesCommentId = crypto.randomUUID();
    const settingsCommentId = crypto.randomUUID();

    // Create rich onboarding content with multiple commented sections
    const onboardingContent = {
      type: "doc",
      content: [
        // Welcome header
        {
          type: "heading",
          attrs: { level: 1 },
          content: [
            {
              type: "text",
              text: "Welcome to Daimon",
              marks: [{ type: "comment", attrs: { commentId: welcomeCommentId } }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is your writing space. Daimon is here to help you think more deeply—not to write for you, but to ask questions and surface connections. Delete this guide whenever you're ready to begin.",
            },
          ],
        },
        // Empty paragraph for spacing
        { type: "paragraph", content: [] },
        // Summoning Daimon & Comments section
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            {
              type: "text",
              text: "Summoning Daimon & Comments",
              marks: [{ type: "comment", attrs: { commentId: summonCommentId } }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "There are two ways to get feedback on your writing:",
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Summon Daimon",
                      marks: [{ type: "bold" }],
                    },
                    {
                      type: "text",
                      text: " (",
                    },
                    {
                      type: "text",
                      text: "Cmd+Shift+D",
                      marks: [{ type: "code" }],
                    },
                    {
                      type: "text",
                      text: "): Select text and I'll immediately respond with thoughts on what you've highlighted.",
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Add Comment",
                      marks: [{ type: "bold" }],
                    },
                    {
                      type: "text",
                      text: " (",
                    },
                    {
                      type: "text",
                      text: "Cmd+Shift+C",
                      marks: [{ type: "code" }],
                    },
                    {
                      type: "text",
                      text: "): Select text and write your own question or note first—then I'll respond to your specific question.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "You can also right-click on selected text to access both options. Comments appear in the sidebar on the right.",
            },
          ],
        },
        // Empty paragraph for spacing
        { type: "paragraph", content: [] },
        // Research Sources section
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            {
              type: "text",
              text: "Adding Research Sources",
              marks: [{ type: "comment", attrs: { commentId: sourcesCommentId } }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Click the gear icon to open Settings, then go to the Sources tab. You can upload PDFs, Word documents, paste web URLs, or add text directly. When you summon me, I'll search through your sources to give more informed feedback.",
            },
          ],
        },
        // Empty paragraph for spacing
        { type: "paragraph", content: [] },
        // Customization section
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            {
              type: "text",
              text: "Customizing Your Experience",
              marks: [{ type: "comment", attrs: { commentId: settingsCommentId } }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "In Settings, you can adjust the AI model, temperature (creativity level), and even write a custom system prompt to change how I respond. The Tools tab lets you enable or disable web search and citation features.",
            },
          ],
        },
        // Empty paragraph for spacing
        { type: "paragraph", content: [] },
        // Horizontal rule
        { type: "horizontalRule" },
        // Final note
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Ready to begin? Delete this text and start writing. I'll be here when you need me.",
              marks: [{ type: "italic" }],
            },
          ],
        },
        // Empty paragraph at end
        { type: "paragraph", content: [] },
      ],
    };

    // Create the document with onboarding content
    const documentId = await ctx.db.insert("documents", {
      title: "Getting Started with Daimon",
      content: JSON.stringify(onboardingContent),
      ownerId: userId,
      updatedAt: now,
    });

    // If preset provided, create document settings
    if (args.preset) {
      await ctx.db.insert("documentSettings", {
        documentId,
        ownerId: userId,
        model: args.preset.model,
        provider: args.preset.provider,
        temperature: args.preset.temperature,
        maxSteps: args.preset.maxSteps,
        systemPrompt: args.preset.systemPrompt,
        description: args.preset.description,
        tools: args.preset.tools,
        updatedAt: now,
      });
    }

    // Create comments for each section with helpful Daimon messages

    // 1. Welcome comment
    const welcomeDbId = await ctx.db.insert("comments", {
      documentId,
      commentId: welcomeCommentId,
      selectedText: "Welcome to Daimon",
      status: "complete",
      ownerId: userId,
      createdAt: now,
    });
    await ctx.db.insert("commentMessages", {
      commentId: welcomeDbId,
      role: "assistant",
      content: `Hello! I'm Daimon, your writing companion. You're reading this in the **comment sidebar**—click the chat icon in the top right to toggle it anytime.

I'm here to help you think more deeply about your writing—asking questions, surfacing connections, and prompting new ideas. I never write for you; every word remains yours.

Click the highlighted sections in your document to learn more, or just start writing whenever you're ready.`,
      createdAt: now,
    });

    // 2. Summoning & Comments comment
    const summonDbId = await ctx.db.insert("comments", {
      documentId,
      commentId: summonCommentId,
      selectedText: "Summoning Daimon & Comments",
      status: "complete",
      ownerId: userId,
      createdAt: now + 1,
    });
    await ctx.db.insert("commentMessages", {
      commentId: summonDbId,
      role: "assistant",
      content: `Try it now! Select any text in this document and press **Cmd+Shift+D** to summon me, or **Cmd+Shift+C** to ask a specific question.

Each comment becomes a conversation thread—you can reply to continue the discussion. I'll appear here in the sidebar with my thoughts.

When you're satisfied with a thread, click the checkmark to resolve it and remove the highlight from your text.`,
      createdAt: now + 1,
    });

    // 3. Sources comment
    const sourcesDbId = await ctx.db.insert("comments", {
      documentId,
      commentId: sourcesCommentId,
      selectedText: "Adding Research Sources",
      status: "complete",
      ownerId: userId,
      createdAt: now + 2,
    });
    await ctx.db.insert("commentMessages", {
      commentId: sourcesDbId,
      role: "assistant",
      content: `Sources make me much more useful. When you attach research materials, I can:

• Search through your PDFs and documents
• Pull relevant quotes and information
• Generate proper citations (APA, MLA, Chicago)

Upload files up to 10MB, paste URLs for web articles, or add text snippets directly.`,
      createdAt: now + 2,
    });

    // 4. Settings comment
    const settingsDbId = await ctx.db.insert("comments", {
      documentId,
      commentId: settingsCommentId,
      selectedText: "Customizing Your Experience",
      status: "complete",
      ownerId: userId,
      createdAt: now + 3,
    });
    await ctx.db.insert("commentMessages", {
      commentId: settingsDbId,
      role: "assistant",
      content: `Each document can have its own AI settings:

**Model**: Choose between Claude and OpenAI models
**Temperature**: Lower = focused & precise, Higher = creative & exploratory
**System Prompt**: Tell me how you'd like me to respond—formal, casual, Socratic, etc.

You can also copy settings from one document to another when creating new pieces.`,
      createdAt: now + 3,
    });

    return documentId;
  },
});

