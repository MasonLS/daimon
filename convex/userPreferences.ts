import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get user preferences for the current user.
 * Returns null if not authenticated or no preferences exist.
 */
export const get = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("userPreferences"),
      _creationTime: v.number(),
      userId: v.id("users"),
      hasSeenOnboarding: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Mark onboarding as seen for the current user.
 * Creates preferences record if it doesn't exist.
 */
export const markOnboardingSeen = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        hasSeenOnboarding: true,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        hasSeenOnboarding: true,
      });
    }
    return null;
  },
});
