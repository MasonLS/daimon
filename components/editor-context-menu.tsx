"use client";

import { useCallback, useEffect, useState, ReactNode } from "react";
import { Editor } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DaimonIcon } from "@/components/icons/daimon-icon";
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
  onCommentCreated?: () => void;
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

  // Handle keyboard shortcut (Cmd+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "d") {
        e.preventDefault();
        if (hasSelection) {
          handleSummonDaimon();
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
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
