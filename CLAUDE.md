# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daimon is an AI-powered writing companion application built with Next.js 16 and Convex backend. Users can create, edit, and manage documents using a TipTap rich text editor. The app uses Convex Auth with password-based authentication.

## Commands

- `npm run dev` - Start both frontend and backend concurrently (runs `npm-run-all --parallel dev:frontend dev:backend`)
- `npm run dev:frontend` - Start Next.js dev server only
- `npm run dev:backend` - Start Convex dev server only
- `npm run build` - Build Next.js for production
- `npm run lint` - Run ESLint (ignores `convex/_generated/**`)

## Architecture

### Frontend (Next.js App Router)
- `app/` - Next.js pages using App Router
  - `page.tsx` - Document list / home page
  - `[id]/page.tsx` - Document editor page
  - `signin/page.tsx` - Authentication page
- `components/` - React components
  - `ui/` - shadcn/ui components
  - `tiptap-*/` - TipTap editor components and primitives
  - Root level: `ConvexClientProvider.tsx`, `header.tsx`, `document-page.tsx`, etc.
- `lib/utils.ts` - Utility functions including `cn()` for Tailwind class merging

### Backend (Convex)
- `convex/schema.ts` - Database schema with `documents` table and auth tables
- `convex/documents.ts` - CRUD queries/mutations for documents (list, get, create, update, remove)
- `convex/auth.ts` - Convex Auth setup with Password provider
- `convex/http.ts` - HTTP routes for auth
- `convex/_generated/` - Auto-generated types and API (do not edit)

### Key Patterns
- All Convex functions use the new function syntax with explicit `args`, `returns`, and `handler`
- Documents are owned by users; queries/mutations check `ownerId` against authenticated user
- Document content is stored as JSON-stringified TipTap content
- Debounced autosave (500ms) for document content and title changes

## Convex Guidelines

When writing Convex functions:
- Always include argument and return validators (use `v.null()` for void returns)
- Use `query`/`mutation`/`action` for public functions, `internalQuery`/`internalMutation`/`internalAction` for private functions
- Use `withIndex` instead of `filter` for database queries
- Use `Id<"tableName">` types for document IDs
- Import from `./_generated/server` for function types and `convex/values` for validators
- Use `getAuthUserId(ctx)` from `@convex-dev/auth/server` for authentication

See `.cursor/rules/convex_rules.mdc` for comprehensive Convex coding guidelines.
