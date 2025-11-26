"use client"

import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { JSONContent } from "@tiptap/react"

interface DocumentPageProps {
  documentId: Id<"documents">
}

type SaveStatus = "saved" | "saving" | "unsaved"

export function DocumentPage({ documentId }: DocumentPageProps) {
  const document = useQuery(api.documents.get, { id: documentId })
  const updateDocument = useMutation(api.documents.update)
  
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [title, setTitle] = useState("")
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingContentRef = useRef<string | null>(null)
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Parse the stored content only once when document first loads
  // We use a ref to track if we've already initialized
  const initialContentRef = useRef<JSONContent | null>(null)
  const initialContent = useMemo(() => {
    // If we already have initial content, don't re-parse (prevents editor recreation)
    if (initialContentRef.current !== null) {
      return initialContentRef.current
    }
    
    if (!document) {
      return { type: "doc", content: [] } as JSONContent
    }
    
    try {
      const parsed = JSON.parse(document.content) as JSONContent
      initialContentRef.current = parsed
      return parsed
    } catch {
      const fallback = { type: "doc", content: [] } as JSONContent
      initialContentRef.current = fallback
      return fallback
    }
  }, [document])

  // Initialize title when document loads
  useEffect(() => {
    if (document) {
      setTitle(document.title)
    }
  }, [document])

  // Debounced save function for content
  const handleContentUpdate = useCallback(
    (content: JSONContent) => {
      setSaveStatus("unsaved")
      pendingContentRef.current = JSON.stringify(content)

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Set new timeout for debounced save
      saveTimeoutRef.current = setTimeout(async () => {
        if (pendingContentRef.current) {
          setSaveStatus("saving")
          try {
            await updateDocument({
              id: documentId,
              content: pendingContentRef.current,
            })
            setSaveStatus("saved")
          } catch (error) {
            console.error("Failed to save document:", error)
            setSaveStatus("unsaved")
          }
          pendingContentRef.current = null
        }
      }, 500) // 500ms debounce
    },
    [documentId, updateDocument]
  )

  // Debounced save function for title
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
      setSaveStatus("unsaved")

      // Clear existing timeout
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current)
      }

      // Set new timeout for debounced save
      titleTimeoutRef.current = setTimeout(async () => {
        setSaveStatus("saving")
        try {
          await updateDocument({
            id: documentId,
            title: newTitle,
          })
          setSaveStatus("saved")
        } catch (error) {
          console.error("Failed to save title:", error)
          setSaveStatus("unsaved")
        }
      }, 500)
    },
    [documentId, updateDocument]
  )

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current)
      }
    }
  }, [])

  // Loading state
  if (document === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <p className="ml-2 text-slate-600 dark:text-slate-400">Loading document...</p>
        </div>
      </div>
    )
  }

  // Not found / access denied
  if (document === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Document not found
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            This document doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with title and save status */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 text-xl font-semibold bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            placeholder="Untitled document"
          />
          <SaveStatusIndicator status={saveStatus} />
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1">
        <SimpleEditor
          initialContent={initialContent}
          onUpdate={handleContentUpdate}
        />
      </main>
    </div>
  )
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "saved" && (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-slate-500 dark:text-slate-400">Saved</span>
        </>
      )}
      {status === "saving" && (
        <>
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-slate-500 dark:text-slate-400">Saving...</span>
        </>
      )}
      {status === "unsaved" && (
        <>
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="text-slate-500 dark:text-slate-400">Unsaved</span>
        </>
      )}
    </div>
  )
}

