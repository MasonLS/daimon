"use client"

import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { JSONContent, Editor } from "@tiptap/react"

import { Spinner } from "@/components/ui/spinner"
import { EditorContextMenu } from "@/components/editor-context-menu"
import {
  RightPanel,
  RightPanelProvider,
  RightPanelTrigger,
  useRightPanel,
} from "@/components/right-panel"
import { DocumentSettingsModal } from "@/components/document-settings-modal"

interface DocumentPageProps {
  documentId: Id<"documents">
}

type SaveStatus = "saved" | "saving" | "unsaved"

export function DocumentPage({ documentId }: DocumentPageProps) {
  return (
    <RightPanelProvider>
      <DocumentPageContent documentId={documentId} />
    </RightPanelProvider>
  )
}

function DocumentPageContent({ documentId }: DocumentPageProps) {
  const document = useQuery(api.documents.get, { id: documentId })
  const updateDocument = useMutation(api.documents.update)
  const commentCount = useQuery(api.comments.countByDocument, { documentId })
  const sourcesCount = useQuery(api.sources.countByDocument, { documentId })
  const { open, setFocusedCommentId } = useRightPanel()

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [title, setTitle] = useState("")
  const [editor, setEditor] = useState<Editor | null>(null)
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

  // Open sidebar when a comment is created
  const handleCommentCreated = useCallback((commentDbId?: Id<"comments">) => {
    open()
    if (commentDbId) {
      setFocusedCommentId(commentDbId)
    }
  }, [open, setFocusedCommentId])

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
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner className="w-6 h-6 text-daemon" />
      </div>
    )
  }

  // Not found / access denied
  if (document === null) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground mb-3">
            Document not found
          </h1>
          <p className="text-muted-foreground">
            This document doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 bg-background overflow-hidden">
      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {/* Document header with title and save status */}
        <div className="flex items-center justify-center w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-2">
          <div className="flex items-center gap-3 w-full max-w-[680px]">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 font-[family-name:var(--font-display)] text-2xl font-medium bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground min-w-0"
              placeholder="Untitled"
            />
            <SaveStatusIndicator status={saveStatus} />
            <DocumentSettingsModal documentId={documentId} />
            <RightPanelTrigger
              commentCount={commentCount ?? 0}
              sourceCount={sourcesCount ?? 0}
            />
          </div>
        </div>

        {/* Editor with context menu */}
        <div className="flex flex-1 flex-col min-h-0">
          <EditorContextMenu
            editor={editor}
            documentId={documentId}
            onCommentCreated={handleCommentCreated}
          >
            <div className="flex flex-1 flex-col min-h-0">
              <SimpleEditor
                initialContent={initialContent}
                onUpdate={handleContentUpdate}
                onEditorReady={setEditor}
              />
            </div>
          </EditorContextMenu>
        </div>
      </div>

      {/* Right panel for Comments/Sources */}
      <RightPanel documentId={documentId} editor={editor} />
    </div>
  )
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "saved" ? (
        <>
          <div className="w-1.5 h-1.5 bg-green-600 dark:bg-green-500 rounded-full"></div>
          <span className="text-muted-foreground">Saved</span>
        </>
      ) : (
        <>
          <div className="w-1.5 h-1.5 bg-daemon rounded-full"></div>
          <span className="text-muted-foreground">Unsaved</span>
        </>
      )}
    </div>
  )
}

