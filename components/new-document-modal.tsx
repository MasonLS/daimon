"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  WRITING_PRESETS,
  PROFESSIONAL_PRESETS,
  DocumentPreset,
  getPresetById,
} from "@/lib/document-presets";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  PenLine,
  Briefcase,
  Copy,
  Sparkles,
  GraduationCap,
  Rss,
  BookOpen,
  Film,
  Feather,
  NotebookPen,
  Code,
  BarChart3,
  Lightbulb,
  Users,
  Mail,
  LucideIcon,
} from "lucide-react";

// Map icon names to components
const iconMap: Record<string, LucideIcon> = {
  GraduationCap,
  Rss,
  BookOpen,
  Film,
  Feather,
  NotebookPen,
  Code,
  BarChart3,
  Lightbulb,
  Users,
  Mail,
};

function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || PenLine;
}

interface NewDocumentModalProps {
  children: React.ReactNode;
}

export function NewDocumentModal({ children }: NewDocumentModalProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const router = useRouter();
  const createWithPreset = useMutation(api.documents.createWithPreset);
  const createWithCopy = useMutation(api.documents.createWithCopy);
  const documents = useQuery(api.documents.list);

  const handleSelectPreset = async (presetId: string | null) => {
    setIsCreating(true);
    try {
      const preset = presetId ? getPresetById(presetId) : null;
      const documentId = await createWithPreset({
        title: "Untitled",
        preset: preset?.settings ?? null,
      });
      router.push(`/${documentId}`);
      setOpen(false);
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyFrom = async (sourceDocId: string) => {
    setIsCreating(true);
    try {
      const documentId = await createWithCopy({
        title: "Untitled",
        sourceDocumentId: sourceDocId as Id<"documents">,
      });
      router.push(`/${documentId}`);
      setOpen(false);
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)]">
            Create New Document
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="writing" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="writing" className="gap-1.5">
              <PenLine className="h-3.5 w-3.5" />
              Writing
            </TabsTrigger>
            <TabsTrigger value="professional" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Professional
            </TabsTrigger>
          </TabsList>

          <TabsContent value="writing" className="mt-4">
            <PresetGrid
              presets={WRITING_PRESETS}
              onSelect={handleSelectPreset}
              isCreating={isCreating}
            />
          </TabsContent>

          <TabsContent value="professional" className="mt-4">
            <PresetGrid
              presets={PROFESSIONAL_PRESETS}
              onSelect={handleSelectPreset}
              isCreating={isCreating}
            />
          </TabsContent>
        </Tabs>

        {/* Blank and Copy From section */}
        <div className="border-t pt-4 mt-2 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleSelectPreset(null)}
            disabled={isCreating}
          >
            {isCreating ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Start from scratch
          </Button>

          {documents && documents.length > 0 && (
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select onValueChange={handleCopyFrom} disabled={isCreating}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Copy settings from existing document..." />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((doc) => (
                    <SelectItem key={doc._id} value={doc._id}>
                      {doc.title || "Untitled"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Preset card grid component
function PresetGrid({
  presets,
  onSelect,
  isCreating,
}: {
  presets: DocumentPreset[];
  onSelect: (id: string) => void;
  isCreating: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {presets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          onClick={() => onSelect(preset.id)}
          disabled={isCreating}
        />
      ))}
    </div>
  );
}

// Individual preset card
function PresetCard({
  preset,
  onClick,
  disabled,
}: {
  preset: DocumentPreset;
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = getIconComponent(preset.icon);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-2 p-4 rounded-lg border border-border/50",
        "hover:border-daemon/40 hover:bg-daemon/5 transition-all text-left",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      <div className="w-8 h-8 rounded-md bg-daemon/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-daemon" />
      </div>
      <div>
        <p className="font-medium text-sm">{preset.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {preset.description}
        </p>
      </div>
    </button>
  );
}

export default NewDocumentModal;
