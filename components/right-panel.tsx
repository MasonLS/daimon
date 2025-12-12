"use client";

import { useState, useCallback, useRef, createContext, useContext, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Send,
  Check,
  MessageSquare,
} from "lucide-react";
import { DaimonIcon } from "@/components/icons/daimon-icon";

// ============================================================================
// Context
// ============================================================================

interface RightPanelContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  open: () => void;
  focusedCommentId: Id<"comments"> | null;
  setFocusedCommentId: (id: Id<"comments"> | null) => void;
  activeCommentId: string | null;  // UUID of the comment highlighted in the editor
  setActiveCommentId: (id: string | null) => void;
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
}

export function RightPanelProvider({
  children,
  defaultOpen = false,
}: RightPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [focusedCommentId, setFocusedCommentId] = useState<Id<"comments"> | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);

  return (
    <RightPanelContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle,
        open,
        focusedCommentId,
        setFocusedCommentId,
        activeCommentId,
        setActiveCommentId,
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
  const { isOpen } = useRightPanel();
  const comments = useQuery(api.comments.listByDocument, { documentId });

  const commentCount = comments?.length ?? 0;

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
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-daemon" />
              <span className="text-sm font-medium">Comments</span>
              {commentCount > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-semibold px-1 bg-daemon text-daemon-foreground">
                  {commentCount}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <CommentsContent
              documentId={documentId}
              editor={editor}
              comments={comments}
            />
          </div>
        </>
      )}
    </div>
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
}: RightPanelTriggerProps) {
  const { isOpen, toggle } = useRightPanel();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      className="relative flex-shrink-0"
      title={isOpen ? "Close comments" : "Open comments"}
    >
      <DaimonIcon
        className={cn(
          "h-4 w-4 transition-colors",
          isOpen ? "text-daemon" : "text-muted-foreground"
        )}
      />
      {!isOpen && commentCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-daemon text-daemon-foreground text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {commentCount}
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
        Highlight text and right-click to add a comment or summon Daimon
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

  const { focusedCommentId, setFocusedCommentId, setActiveCommentId } = useRightPanel();

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

    // Set this comment as active (highlights it in the editor)
    setActiveCommentId(comment.commentId);

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
  }, [editor, comment.commentId, setActiveCommentId]);

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
      // Clear active state before resolving
      setActiveCommentId(null);

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
  }, [editor, comment.commentId, comment._id, resolveComment, setActiveCommentId]);

  const aiMessages = comment.messages.filter((m) => m.role === "assistant");
  const userMessages = comment.messages.filter((m) => m.role === "user");

  // Highlight the referenced text when interacting with the card
  const handleCardInteraction = useCallback(() => {
    if (!editor) return;

    // Find and select the comment text in the editor
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
        found = true;
        return false;
      }
    });
  }, [editor, comment.commentId]);

  return (
    <div
      className="rounded-lg border border-border/50 bg-background/50 overflow-hidden group hover:border-daemon/30 transition-colors"
      onMouseEnter={handleCardInteraction}
      onFocusCapture={handleCardInteraction}
    >
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
            Daimon could not respond. Please try again.
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
