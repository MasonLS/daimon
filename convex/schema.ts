import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),
  documents: defineTable({
    title: v.string(),
    content: v.string(), // JSON-stringified TipTap content
    ownerId: v.id("users"),
    updatedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]),
});
