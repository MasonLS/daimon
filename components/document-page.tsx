"use client"

import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { JSONContent, Editor } from "@tiptap/react"

import { Spinner } from "@/components/ui/spinner"
import { DaimonIcon } from "@/components/icons/daimon-icon"
import { Button } from "@/components/ui/button"
import { EditorContextMenu } from "@/components/editor-context-menu"
import { CommentsSidebar } from "@/components/comments-sidebar"
import { SourcesPanel } from "@/components/sources-panel"
import { FileText } from "lucide-react"

interface DocumentPageProps {
  documentId: Id<"documents">
}

type SaveStatus = "saved" | "saving" | "unsaved"

export function DocumentPage({ documentId }: DocumentPageProps) {
  const document = useQuery(api.documents.get, { id: documentId })
  const updateDocument = useMutation(api.documents.update)
  const commentCount = useQuery(api.comments.countByDocument, { documentId })
  const sourcesCount = useQuery(api.sources.countByDocument, { documentId })

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [title, setTitle] = useState("")
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState(false)
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false)
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
  const handleCommentCreated = useCallback(() => {
    setIsCommentsSidebarOpen(true)
  }, [])

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
    <div className="flex flex-1 flex-col bg-background">
      {/* Document header with title and save status - aligned with toolbar controls */}
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
          {/* Sources toggle button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setIsSourcesPanelOpen(!isSourcesPanelOpen)
              if (!isSourcesPanelOpen) setIsCommentsSidebarOpen(false)
            }}
            className="relative flex-shrink-0"
            title="Toggle sources"
          >
            <FileText className="h-4 w-4 text-daemon" />
            {sourcesCount !== undefined && sourcesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-daemon text-daemon-foreground text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {sourcesCount}
              </span>
            )}
          </Button>
          {/* Comments toggle button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setIsCommentsSidebarOpen(!isCommentsSidebarOpen)
              if (!isCommentsSidebarOpen) setIsSourcesPanelOpen(false)
            }}
            className="relative flex-shrink-0"
            title="Toggle comments"
          >
            <DaimonIcon className="h-4 w-4 text-daemon" />
            {commentCount !== undefined && commentCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-daemon text-daemon-foreground text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {commentCount}
              </span>
            )}
          </Button>
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

      {/* Sources panel */}
      <SourcesPanel
        documentId={documentId}
        isOpen={isSourcesPanelOpen}
        onClose={() => setIsSourcesPanelOpen(false)}
      />

      {/* Comments sidebar */}
      <CommentsSidebar
        documentId={documentId}
        editor={editor}
        isOpen={isCommentsSidebarOpen}
        onClose={() => setIsCommentsSidebarOpen(false)}
      />
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

