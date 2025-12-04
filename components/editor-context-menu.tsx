"use client";

import { useCallback, useEffect, useState, ReactNode } from "react";
import { Editor } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DaimonIcon } from "@/components/icons/daimon-icon";
import { MessageSquarePlus } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface EditorContextMenuProps {
  editor: Editor | null;
  documentId: Id<"documents">;
  children: ReactNode;
  onCommentCreated?: (commentDbId?: Id<"comments">) => void;
}

/**
 * EditorContextMenu
 *
 * Wraps the editor content and provides a right-click context menu
 * with the "Summon Daimon" option when text is selected.
 */
export function EditorContextMenu({
  editor,
  documentId,
  children,
  onCommentCreated,
}: EditorContextMenuProps) {
  const createComment = useMutation(api.comments.create);
  const createCommentWithoutAI = useMutation(api.comments.createWithoutAI);
  const [hasSelection, setHasSelection] = useState(false);

  // Track selection state
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { from, to, empty } = editor.state.selection;
      setHasSelection(!empty && to - from > 0);
    };

    editor.on("selectionUpdate", updateSelection);
    editor.on("transaction", updateSelection);

    return () => {
      editor.off("selectionUpdate", updateSelection);
      editor.off("transaction", updateSelection);
    };
  }, [editor]);

  // Handle keyboard shortcuts (Cmd+Shift+D for Summon, Cmd+Shift+C for Add Comment)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+D for Summon Daimon
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "d") {
        e.preventDefault();
        if (hasSelection) {
          handleSummonDaimon();
        }
      }
      // Cmd+Shift+C for Add Comment
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        if (hasSelection) {
          handleAddComment();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasSelection, editor, documentId]);

  const handleSummonDaimon = useCallback(async () => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    // Get the selected text
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    // Generate a UUID for this comment
    const commentId = uuidv4();

    // Apply the comment mark to the selected text
    editor.chain().focus().setComment(commentId).run();

    // Create the comment in Convex (this triggers AI response)
    try {
      await createComment({
        documentId,
        commentId,
        selectedText,
      });

      // Notify parent that a comment was created (to open sidebar)
      onCommentCreated?.();
    } catch (error) {
      console.error("Failed to create comment:", error);
      // Remove the mark if the API call failed
      editor.chain().focus().unsetComment().run();
    }
  }, [editor, documentId, createComment, onCommentCreated]);

  // Handle "Add Comment" - creates without AI, user types first
  const handleAddComment = useCallback(async () => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    // Get the selected text
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    // Generate a UUID for this comment
    const commentId = uuidv4();

    // Apply the comment mark to the selected text
    editor.chain().focus().setComment(commentId).run();

    // Create the comment without triggering AI
    try {
      const commentDbId = await createCommentWithoutAI({
        documentId,
        commentId,
        selectedText,
      });

      // Notify parent with the comment ID (to open sidebar and focus input)
      onCommentCreated?.(commentDbId);
    } catch (error) {
      console.error("Failed to create comment:", error);
      // Remove the mark if the API call failed
      editor.chain().focus().unsetComment().run();
    }
  }, [editor, documentId, createCommentWithoutAI, onCommentCreated]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={handleAddComment}
          disabled={!hasSelection}
          className="gap-2"
        >
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          <span>Add Comment</span>
          <ContextMenuShortcut>⌘⇧C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleSummonDaimon}
          disabled={!hasSelection}
          className="gap-2"
        >
          <DaimonIcon className="h-4 w-4 text-daemon" />
          <span>Summon Daimon</span>
          <ContextMenuShortcut>⌘⇧D</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default EditorContextMenu;
