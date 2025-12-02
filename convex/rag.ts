"use node";

import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

/**
 * RAG (Retrieval Augmented Generation) setup for document sources.
 *
 * Sources are namespaced by document ID, so each document has its own
 * isolated set of searchable content.
 */
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});
