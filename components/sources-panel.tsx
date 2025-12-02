"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { extractTextFromFile } from "@/lib/extract-text";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface SourcesPanelProps {
  documentId: Id<"documents">;
  isOpen: boolean;
  onClose: () => void;
}

interface Source {
  _id: Id<"sources">;
  _creationTime: number;
  filename: string;
  mimeType: string;
  status: "uploading" | "processing" | "indexed" | "error";
  errorMessage?: string;
  createdAt: number;
}

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

/**
 * SourcesPanel
 *
 * A sidebar panel for managing document sources (file attachments).
 * Allows uploading files that get RAG-indexed for Daimon to search.
 */
export function SourcesPanel({
  documentId,
  isOpen,
  onClose,
}: SourcesPanelProps) {
  const sources = useQuery(api.sources.listByDocument, { documentId });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.sources.generateUploadUrl);
  const createSource = useMutation(api.sources.create);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const isValidType =
        ACCEPTED_FILE_TYPES.some((type) =>
          type.startsWith(".") ? file.name.endsWith(type) : file.type === type
        );

      if (!isValidType) {
        setUploadError(
          "Invalid file type. Please upload .txt, .md, .pdf, or .docx files."
        );
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError("File too large. Maximum size is 10MB.");
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        // Extract text client-side (PDF.js for PDFs, mammoth for DOCX)
        const extractedText = await extractTextFromFile(file);

        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("Could not extract text from file");
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload the file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = await result.json();

        // Create the source record with pre-extracted text
        await createSource({
          documentId,
          filename: file.name,
          storageId,
          mimeType: file.type || "application/octet-stream",
          extractedText,
        });
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadError(
          error instanceof Error ? error.message : "Failed to upload file"
        );
      } finally {
        setIsUploading(false);
        // Reset the input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [documentId, generateUploadUrl, createSource]
  );

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
          <FileText className="h-4 w-4 text-daemon" />
          <span className="font-medium text-sm">Sources</span>
          {sources && sources.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({sources.length})
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Upload Button */}
      <div className="px-4 py-3 border-b border-border/50">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Spinner className="h-4 w-4 mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Add Source
            </>
          )}
        </Button>
        {uploadError && (
          <p className="text-xs text-destructive mt-2">{uploadError}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Supports .txt, .md, .pdf, .docx (max 10MB)
        </p>
      </div>

      {/* Sources List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {sources === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-5 w-5 text-daemon" />
            </div>
          ) : sources.length === 0 ? (
            <EmptyState />
          ) : (
            sources.map((source: Source) => (
              <SourceCard key={source._id} source={source} />
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
      <FileText className="h-8 w-8 text-daemon/40 mb-3" />
      <p className="text-sm text-muted-foreground">
        Upload research documents for Daimon to reference
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
        return <Spinner className="h-3.5 w-3.5 text-daemon" />;
      case "indexed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (source.status) {
      case "uploading":
        return "Uploading...";
      case "processing":
        return "Processing...";
      case "indexed":
        return "Ready";
      case "error":
        return source.errorMessage || "Error";
      default:
        return "Pending";
    }
  };

  const getFileIcon = () => {
    if (source.filename.endsWith(".pdf")) {
      return "PDF";
    } else if (source.filename.endsWith(".docx")) {
      return "DOC";
    } else if (source.filename.endsWith(".md")) {
      return "MD";
    }
    return "TXT";
  };

  return (
    <div className="rounded-lg border border-border/50 hover:border-daemon/40 transition-colors bg-card p-3">
      <div className="flex items-start gap-3">
        {/* File type badge */}
        <div className="shrink-0 w-10 h-10 rounded bg-daemon/10 flex items-center justify-center">
          <span className="text-xs font-medium text-daemon">
            {getFileIcon()}
          </span>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={source.filename}>
            {source.filename}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {getStatusIcon()}
            <span
              className={cn(
                "text-xs",
                source.status === "error"
                  ? "text-destructive"
                  : source.status === "indexed"
                    ? "text-green-500"
                    : "text-muted-foreground"
              )}
            >
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={isDeleting || source.status === "uploading"}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          {isDeleting ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Error message */}
      {source.status === "error" && source.errorMessage && (
        <p className="text-xs text-destructive mt-2 pl-13">
          {source.errorMessage}
        </p>
      )}
    </div>
  );
}

export default SourcesPanel;
