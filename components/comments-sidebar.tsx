"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Check } from "lucide-react";
import { DaimonIcon } from "@/components/icons/daimon-icon";

interface CommentsSidebarProps {
  documentId: Id<"documents">;
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Comment {
  _id: Id<"comments">;
  _creationTime: number;
  documentId: Id<"documents">;
  commentId: string;
  selectedText: string;
  status: "pending" | "streaming" | "complete" | "error";
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

/**
 * CommentsSidebar
 *
 * A sidebar panel that displays all comments for a document.
 * Shows AI responses, allows replies, and provides navigation
 * to commented text in the editor.
 */
export function CommentsSidebar({
  documentId,
  editor,
  isOpen,
  onClose,
}: CommentsSidebarProps) {
  const comments = useQuery(api.comments.listByDocument, { documentId });

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-14 bottom-0 w-80 bg-card border-l border-border/50",
        "transform transition-transform duration-200 ease-in-out z-40",
        "flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <DaimonIcon className="h-4 w-4 text-daemon" />
          <span className="font-medium text-sm">Comments</span>
          {comments && comments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {comments === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-5 w-5 text-daemon" />
            </div>
          ) : comments.length === 0 ? (
            <EmptyState />
          ) : (
            comments.map((comment) => (
              <CommentCard
                key={comment._id}
                comment={comment}
                editor={editor}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <DaimonIcon className="h-8 w-8 text-daemon/40 mb-3" />
      <p className="text-sm text-muted-foreground">
        Highlight text and summon Daimon for guidance
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
  const addReply = useMutation(api.comments.addReply);
  const resolveComment = useMutation(api.comments.resolve);

  const handleScrollToComment = useCallback(() => {
    if (!editor) return;

    // Find the mark with this commentId in the document
    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;

      const commentMark = node.marks.find(
        (mark) =>
          mark.type.name === "comment" &&
          mark.attrs.commentId === comment.commentId
      );

      if (commentMark) {
        // Scroll to and select the commented text
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

  const handleResolve = useCallback(async () => {
    try {
      // Remove the comment mark from the editor
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

  // Get the assistant's messages (AI responses)
  const aiMessages = comment.messages.filter((m) => m.role === "assistant");
  const userMessages = comment.messages.filter((m) => m.role === "user");

  return (
    <div className="rounded-lg border border-border/50 hover:border-daemon/40 transition-colors bg-card">
      {/* Selected Text Quote */}
      <button
        onClick={handleScrollToComment}
        className="w-full text-left px-3 py-2 border-b border-border/30 hover:bg-daemon/5 transition-colors"
      >
        <p className="text-xs text-muted-foreground mb-1">Highlighted text</p>
        <blockquote className="text-sm font-serif italic text-foreground/80 line-clamp-2">
          "{comment.selectedText}"
        </blockquote>
      </button>

      {/* Messages */}
      <div className="px-3 py-2 space-y-3">
        {/* Show AI responses */}
        {aiMessages.map((message, index) => (
          <div key={message._id}>
            {/* Show user reply if this isn't the first response */}
            {index > 0 && userMessages[index] && (
              <div className="mb-2 pl-2 border-l-2 border-muted">
                <p className="text-xs text-muted-foreground mb-0.5">You</p>
                <p className="text-sm">{userMessages[index].content}</p>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <DaimonIcon className="h-3 w-3 text-daemon" />
                <span className="text-xs text-daemon font-medium">Daimon</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {/* Loading state */}
        {(comment.status === "pending" || comment.status === "streaming") && (
          <div className="flex items-center gap-2 py-1">
            <Spinner className="h-3 w-3 text-daemon" />
            <span className="text-xs text-muted-foreground">
              Daimon is thinking...
            </span>
          </div>
        )}

        {/* Error state */}
        {comment.status === "error" && (
          <p className="text-xs text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      {/* Reply input (only show when complete) */}
      {comment.status === "complete" && (
        <div className="px-3 py-2 border-t border-border/30">
          <div className="flex gap-2">
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
              placeholder="Reply to Daimon..."
              className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              disabled={isReplying}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleReply}
              disabled={!replyText.trim() || isReplying}
              className="shrink-0"
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
        <div className="px-3 py-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResolve}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            <Check className="h-3 w-3 mr-1" />
            Resolve
          </Button>
        </div>
      )}
    </div>
  );
}

export default CommentsSidebar;
