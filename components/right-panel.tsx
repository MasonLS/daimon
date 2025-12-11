"use client";

import { useState, useCallback, useRef, createContext, useContext, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { extractTextFromFile } from "@/lib/extract-text";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Send,
  Check,
  MessageSquare,
  Link,
  FileType,
  Globe,
  X,
} from "lucide-react";
import { DaimonIcon } from "@/components/icons/daimon-icon";

// ============================================================================
// Context
// ============================================================================

type RightPanelTab = "comments" | "sources";

interface RightPanelContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: RightPanelTab;
  setActiveTab: (tab: RightPanelTab) => void;
  toggle: () => void;
  openToTab: (tab: RightPanelTab) => void;
  focusedCommentId: Id<"comments"> | null;
  setFocusedCommentId: (id: Id<"comments"> | null) => void;
}

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (!context) {
    throw new Error("useRightPanel must be used within RightPanelProvider");
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

interface RightPanelProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  defaultTab?: RightPanelTab;
}

export function RightPanelProvider({
  children,
  defaultOpen = false,
  defaultTab = "comments",
}: RightPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<RightPanelTab>(defaultTab);
  const [focusedCommentId, setFocusedCommentId] = useState<Id<"comments"> | null>(null);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const openToTab = useCallback((tab: RightPanelTab) => {
    setActiveTab(tab);
    setIsOpen(true);
  }, []);

  return (
    <RightPanelContext.Provider
      value={{
        isOpen,
        setIsOpen,
        activeTab,
        setActiveTab,
        toggle,
        openToTab,
        focusedCommentId,
        setFocusedCommentId,
      }}
    >
      {children}
    </RightPanelContext.Provider>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

interface RightPanelProps {
  documentId: Id<"documents">;
  editor: Editor | null;
  className?: string;
}

export function RightPanel({ documentId, editor, className }: RightPanelProps) {
  const { isOpen, setIsOpen, activeTab, setActiveTab } = useRightPanel();
  const comments = useQuery(api.comments.listByDocument, { documentId });
  const sources = useQuery(api.sources.listByDocument, { documentId });

  const commentCount = comments?.length ?? 0;
  const sourceCount = sources?.length ?? 0;

  return (
    <div
      className={cn(
        "flex flex-col bg-card/80 backdrop-blur-sm border-l border-border/40",
        "transition-all duration-300 ease-out overflow-hidden min-h-0",
        isOpen ? "w-80 min-w-80" : "w-0 min-w-0 border-l-0",
        className
      )}
    >
      {isOpen && (
        <>
          {/* Header with custom tabs */}
          <div className="flex flex-col border-b border-border/40">
            {/* Tabs */}
            <div className="flex px-3 py-3 gap-1">
              <TabButton
                active={activeTab === "comments"}
                onClick={() => setActiveTab("comments")}
                count={commentCount}
                icon={<MessageSquare className="h-3.5 w-3.5" />}
              >
                Comments
              </TabButton>
              <TabButton
                active={activeTab === "sources"}
                onClick={() => setActiveTab("sources")}
                count={sourceCount}
                icon={<FileText className="h-3.5 w-3.5" />}
              >
                Sources
              </TabButton>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === "comments" ? (
              <CommentsContent
                documentId={documentId}
                editor={editor}
                comments={comments}
              />
            ) : (
              <SourcesContent documentId={documentId} sources={sources} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Tab Button
// ============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function TabButton({ active, onClick, count, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
        active
          ? "bg-daemon/10 text-daemon border border-daemon/20"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      <span>{children}</span>
      {count > 0 && (
        <span
          className={cn(
            "min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-semibold px-1",
            active
              ? "bg-daemon text-daemon-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Trigger Button (for header)
// ============================================================================

interface RightPanelTriggerProps {
  commentCount?: number;
  sourceCount?: number;
}

export function RightPanelTrigger({
  commentCount = 0,
  sourceCount = 0,
}: RightPanelTriggerProps) {
  const { isOpen, toggle } = useRightPanel();
  const totalCount = commentCount + sourceCount;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      className="relative flex-shrink-0"
      title={isOpen ? "Close panel" : "Open panel"}
    >
      <DaimonIcon
        className={cn(
          "h-4 w-4 transition-colors",
          isOpen ? "text-daemon" : "text-muted-foreground"
        )}
      />
      {!isOpen && totalCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-daemon text-daemon-foreground text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {totalCount}
        </span>
      )}
    </Button>
  );
}

// ============================================================================
// Comments Content
// ============================================================================

interface Comment {
  _id: Id<"comments">;
  _creationTime: number;
  documentId: Id<"documents">;
  commentId: string;
  selectedText: string;
  status: "awaiting_input" | "pending" | "streaming" | "complete" | "error";
  ownerId: Id<"users">;
  createdAt: number;
  resolvedAt?: number;
  messages: Array<{
    _id: Id<"commentMessages">;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  }>;
}

interface CommentsContentProps {
  documentId: Id<"documents">;
  editor: Editor | null;
  comments: Comment[] | undefined;
}

function CommentsContent({ editor, comments }: CommentsContentProps) {
  return (
    <div className="relative flex-1 min-h-0">
      <div className="absolute inset-0 overflow-y-auto">
        <div className="p-3 space-y-3">
          {comments === undefined ? (
            <LoadingState />
          ) : comments.length === 0 ? (
            <EmptyCommentsState />
          ) : (
            comments.map((comment) => (
              <CommentCard key={comment._id} comment={comment} editor={editor} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyCommentsState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-daemon/10 flex items-center justify-center mb-4">
        <DaimonIcon className="h-6 w-6 text-daemon/50" />
      </div>
      <p className="font-[family-name:var(--font-display)] text-base text-foreground/80 mb-1">
        Start a conversation
      </p>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        Highlight text and right-click to add a comment or summon your daemon
      </p>
    </div>
  );
}

interface CommentCardProps {
  comment: Comment;
  editor: Editor | null;
}

function CommentCard({ comment, editor }: CommentCardProps) {
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { focusedCommentId, setFocusedCommentId } = useRightPanel();

  const addReply = useMutation(api.comments.addReply);
  const addInitialMessage = useMutation(api.comments.addInitialMessage);
  const resolveComment = useMutation(api.comments.resolve);

  // Auto-focus input when this comment is focused
  useEffect(() => {
    if (focusedCommentId === comment._id && inputRef.current) {
      inputRef.current.focus();
      setFocusedCommentId(null);
    }
  }, [focusedCommentId, comment._id, setFocusedCommentId]);

  const handleScrollToComment = useCallback(() => {
    if (!editor) return;

    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;

      const commentMark = node.marks.find(
        (mark) =>
          mark.type.name === "comment" &&
          mark.attrs.commentId === comment.commentId
      );

      if (commentMark) {
        editor.commands.setTextSelection({ from: pos, to: pos + node.nodeSize });
        editor.commands.scrollIntoView();
        found = true;
        return false;
      }
    });
  }, [editor, comment.commentId]);

  const handleReply = useCallback(async () => {
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      await addReply({
        commentDbId: comment._id,
        content: replyText.trim(),
      });
      setReplyText("");
    } catch (error) {
      console.error("Failed to add reply:", error);
    } finally {
      setIsReplying(false);
    }
  }, [addReply, comment._id, replyText]);

  // Handle initial message submission for "Add Comment" flow
  const handleInitialMessage = useCallback(async () => {
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      await addInitialMessage({
        commentDbId: comment._id,
        content: replyText.trim(),
      });
      setReplyText("");
    } catch (error) {
      console.error("Failed to add initial message:", error);
    } finally {
      setIsReplying(false);
    }
  }, [addInitialMessage, comment._id, replyText]);

  // Determine which handler to use based on status
  const handleSubmit =
    comment.status === "awaiting_input" ? handleInitialMessage : handleReply;

  const handleResolve = useCallback(async () => {
    try {
      if (editor) {
        editor.state.doc.descendants((node, pos) => {
          const commentMark = node.marks.find(
            (mark) =>
              mark.type.name === "comment" &&
              mark.attrs.commentId === comment.commentId
          );

          if (commentMark) {
            editor
              .chain()
              .focus()
              .setTextSelection({ from: pos, to: pos + node.nodeSize })
              .unsetComment()
              .run();
          }
        });
      }

      await resolveComment({ commentDbId: comment._id });
    } catch (error) {
      console.error("Failed to resolve comment:", error);
    }
  }, [editor, comment.commentId, comment._id, resolveComment]);

  const aiMessages = comment.messages.filter((m) => m.role === "assistant");
  const userMessages = comment.messages.filter((m) => m.role === "user");

  return (
    <div className="rounded-lg border border-border/50 bg-background/50 overflow-hidden group hover:border-daemon/30 transition-colors">
      {/* Selected Text Quote */}
      <button
        onClick={handleScrollToComment}
        className="w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-daemon/5 transition-colors"
      >
        <blockquote className="font-[family-name:var(--font-serif)] text-sm italic text-foreground/70 line-clamp-2 leading-relaxed">
          &ldquo;{comment.selectedText}&rdquo;
        </blockquote>
      </button>

      {/* Initial input for awaiting_input state (Add Comment flow) */}
      {comment.status === "awaiting_input" && (
        <div className="px-3 py-3 border-b border-border/30 bg-daemon/5">
          <p className="text-xs text-daemon mb-2 font-medium">
            What would you like to ask about this text?
          </p>
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Type your question or comment..."
              className="flex-1 text-sm bg-background border border-border/50 rounded px-2 py-1.5 outline-none focus:border-daemon/50 placeholder:text-muted-foreground/50"
              disabled={isReplying}
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSubmit}
              disabled={!replyText.trim() || isReplying}
              className="h-7 w-7 shrink-0"
            >
              {isReplying ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Messages - only show if there are messages */}
      {comment.messages.length > 0 && (
      <div className="px-3 py-2.5 space-y-2.5">
        {aiMessages.map((message, index) => (
          <div key={message._id}>
            {index > 0 && userMessages[index] && (
              <div className="mb-2 pl-2 border-l-2 border-daemon/20">
                <p className="text-xs text-muted-foreground mb-0.5">You</p>
                <p className="text-sm text-foreground/80">
                  {userMessages[index].content}
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <DaimonIcon className="h-3 w-3 text-daemon" />
                <span className="text-[10px] text-daemon font-medium uppercase tracking-wide">
                  Daimon
                </span>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {(comment.status === "pending" || comment.status === "streaming") && (
          <div className="flex items-center gap-2 py-1">
            <Spinner className="h-3 w-3 text-daemon" />
            <span className="text-xs text-muted-foreground italic">
              Contemplating...
            </span>
          </div>
        )}

        {comment.status === "error" && (
          <p className="text-xs text-destructive">
            The daemon could not respond. Please try again.
          </p>
        )}
      </div>
      )}

      {/* Reply input */}
      {comment.status === "complete" && (
        <div className="px-3 py-2 border-t border-border/30 bg-muted/20">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
              placeholder="Continue the dialogue..."
              className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
              disabled={isReplying}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleReply}
              disabled={!replyText.trim() || isReplying}
              className="h-6 w-6 shrink-0"
            >
              {isReplying ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Resolve button */}
      {comment.status === "complete" && (
        <div className="px-3 py-1.5 border-t border-border/30">
          <button
            onClick={handleResolve}
            className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground py-1 transition-colors"
          >
            <Check className="h-3 w-3" />
            <span>Resolve</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sources Content
// ============================================================================

const ACCEPTED_FILE_TYPES = [
  ".txt",
  ".md",
  ".pdf",
  ".docx",
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface Source {
  _id: Id<"sources">;
  _creationTime: number;
  sourceType: "file" | "web" | "text";
  title: string;
  url?: string;
  mimeType?: string;
  status: "uploading" | "processing" | "indexed" | "error";
  errorMessage?: string;
  createdAt: number;
}

interface SourcesContentProps {
  documentId: Id<"documents">;
  sources: Source[] | undefined;
}

type AddSourceMode = "none" | "file" | "url" | "text";

function SourcesContent({ documentId, sources }: SourcesContentProps) {
  const [addMode, setAddMode] = useState<AddSourceMode>("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL input state
  const [urlInput, setUrlInput] = useState("");

  // Text input state
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.sources.generateUploadUrl);
  const createFileSource = useMutation(api.sources.createFileSource);
  const createWebSource = useMutation(api.sources.createWebSource);
  const createTextSource = useMutation(api.sources.createTextSource);

  const resetForm = useCallback(() => {
    setAddMode("none");
    setError(null);
    setUrlInput("");
    setTextTitle("");
    setTextContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const isValidType = ACCEPTED_FILE_TYPES.some((type) =>
        type.startsWith(".") ? file.name.endsWith(type) : file.type === type
      );

      if (!isValidType) {
        setError("Invalid file type. Accepts .txt, .md, .pdf, .docx");
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("File too large. Maximum size is 10MB.");
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const extractedText = await extractTextFromFile(file);

        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("Could not extract text from file");
        }

        const uploadUrl = await generateUploadUrl();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = await result.json();

        await createFileSource({
          documentId,
          filename: file.name,
          storageId,
          mimeType: file.type || "application/octet-stream",
          extractedText,
        });

        resetForm();
      } catch (err) {
        console.error("Upload failed:", err);
        setError(err instanceof Error ? err.message : "Failed to upload file");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [documentId, generateUploadUrl, createFileSource, resetForm]
  );

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      await createWebSource({
        documentId,
        url: urlInput.trim(),
      });
      resetForm();
    } catch (err) {
      console.error("Failed to add URL:", err);
      setError(err instanceof Error ? err.message : "Failed to add URL");
    } finally {
      setIsProcessing(false);
    }
  }, [documentId, urlInput, createWebSource, resetForm]);

  const handleTextSubmit = useCallback(async () => {
    if (!textContent.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      await createTextSource({
        documentId,
        title: textTitle.trim() || "Pasted text",
        text: textContent.trim(),
      });
      resetForm();
    } catch (err) {
      console.error("Failed to add text:", err);
      setError(err instanceof Error ? err.message : "Failed to add text");
    } finally {
      setIsProcessing(false);
    }
  }, [documentId, textTitle, textContent, createTextSource, resetForm]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Add source section */}
      <div className="px-3 py-3 border-b border-border/30">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />

        {addMode === "none" ? (
          <>
            {/* Source type buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border/50 hover:border-daemon/40 hover:bg-daemon/5 transition-all"
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">File</span>
              </button>
              <button
                onClick={() => setAddMode("url")}
                disabled={isProcessing}
                className="flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border/50 hover:border-daemon/40 hover:bg-daemon/5 transition-all"
              >
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">URL</span>
              </button>
              <button
                onClick={() => setAddMode("text")}
                disabled={isProcessing}
                className="flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border/50 hover:border-daemon/40 hover:bg-daemon/5 transition-all"
              >
                <FileType className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">Text</span>
              </button>
            </div>
          </>
        ) : addMode === "url" ? (
          /* URL input form */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Add webpage</span>
              <button
                onClick={resetForm}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUrlSubmit();
                }
              }}
              placeholder="https://example.com/article"
              className="w-full text-sm bg-background border border-border/50 rounded px-2.5 py-1.5 outline-none focus:border-daemon/50 placeholder:text-muted-foreground/50"
              disabled={isProcessing}
              autoFocus
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isProcessing}
              className="w-full"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Spinner className="h-3.5 w-3.5 mr-2" />
                  Scraping...
                </>
              ) : (
                <>
                  <Link className="h-3.5 w-3.5 mr-2" />
                  Add URL
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Text input form */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Add text</span>
              <button
                onClick={resetForm}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full text-sm bg-background border border-border/50 rounded px-2.5 py-1.5 outline-none focus:border-daemon/50 placeholder:text-muted-foreground/50"
              disabled={isProcessing}
              autoFocus
            />
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your text here..."
              rows={4}
              className="w-full text-sm bg-background border border-border/50 rounded px-2.5 py-1.5 outline-none focus:border-daemon/50 placeholder:text-muted-foreground/50 resize-none"
              disabled={isProcessing}
            />
            <Button
              onClick={handleTextSubmit}
              disabled={!textContent.trim() || isProcessing}
              className="w-full"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Spinner className="h-3.5 w-3.5 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FileType className="h-3.5 w-3.5 mr-2" />
                  Add Text
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive mt-2 text-center">
            {error}
          </p>
        )}
      </div>

      {/* Sources list */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="p-3 space-y-2">
            {sources === undefined ? (
              <LoadingState />
            ) : sources.length === 0 ? (
              <EmptySourcesState />
            ) : (
              sources.map((source: Source) => (
                <SourceCard key={source._id} source={source} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptySourcesState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-daemon/10 flex items-center justify-center mb-4">
        <FileText className="h-6 w-6 text-daemon/50" />
      </div>
      <p className="font-[family-name:var(--font-display)] text-base text-foreground/80 mb-1">
        Research materials
      </p>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        Upload documents for your daemon to reference when offering guidance
      </p>
    </div>
  );
}

interface SourceCardProps {
  source: Source;
}

function SourceCard({ source }: SourceCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const removeSource = useMutation(api.sources.remove);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await removeSource({ sourceId: source._id });
    } catch (error) {
      console.error("Failed to delete source:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [source._id, removeSource, isDeleting]);

  const getStatusIcon = () => {
    switch (source.status) {
      case "uploading":
      case "processing":
        return <Spinner className="h-3 w-3 text-daemon" />;
      case "indexed":
        return <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getSourceBadge = () => {
    switch (source.sourceType) {
      case "file":
        const ext = source.title.split(".").pop()?.toUpperCase();
        return ext || "FILE";
      case "web":
        return "WEB";
      case "text":
        return "TXT";
      default:
        return "SRC";
    }
  };

  const getSourceIcon = () => {
    switch (source.sourceType) {
      case "file":
        return <FileText className="h-3.5 w-3.5 text-daemon" />;
      case "web":
        return <Globe className="h-3.5 w-3.5 text-daemon" />;
      case "text":
        return <FileType className="h-3.5 w-3.5 text-daemon" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-daemon" />;
    }
  };

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg border border-border/40 bg-background/50 group hover:border-daemon/30 transition-colors">
      {/* Source type badge */}
      <div className="shrink-0 w-8 h-8 rounded bg-daemon/10 flex items-center justify-center">
        {source.sourceType === "file" ? (
          <span className="text-[9px] font-bold text-daemon tracking-tight">
            {getSourceBadge()}
          </span>
        ) : (
          getSourceIcon()
        )}
      </div>

      {/* Source info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium truncate text-foreground/90"
          title={source.title}
        >
          {source.title}
        </p>
        {source.url && (
          <p
            className="text-[10px] text-muted-foreground truncate"
            title={source.url}
          >
            {new URL(source.url).hostname}
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          {getStatusIcon()}
          <span
            className={cn(
              "text-[10px]",
              source.status === "error"
                ? "text-destructive"
                : source.status === "indexed"
                  ? "text-green-600 dark:text-green-500"
                  : "text-muted-foreground"
            )}
          >
            {source.status === "indexed"
              ? "Ready"
              : source.status === "error"
                ? source.errorMessage || "Error"
                : "Processing..."}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        disabled={isDeleting || source.status === "uploading"}
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
      >
        {isDeleting ? (
          <Spinner className="h-3 w-3" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="h-5 w-5 text-daemon" />
    </div>
  );
}

export default RightPanel;
