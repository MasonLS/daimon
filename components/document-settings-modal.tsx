"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { extractTextFromFile } from "@/lib/extract-text";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Bot,
  MessageSquare,
  Wrench,
  FileText,
  Upload,
  Globe,
  FileType,
  Link,
  X,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Copy,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface DocumentSettingsModalProps {
  documentId: Id<"documents">;
}

type Provider = "anthropic" | "openai";

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

// ============================================================================
// Available Models
// ============================================================================

const ANTHROPIC_MODELS = {
  "claude-opus-4-5-20251101": { name: "Claude Opus 4.5", context: "200k" },
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", context: "200k" },
  "claude-haiku-4-5-20251001": { name: "Claude Haiku 4.5", context: "200k" },
};

const OPENAI_MODELS = {
  "gpt-5.2": { name: "GPT-5.2 Thinking", context: "200k" },
  "gpt-5.2-chat-latest": { name: "GPT-5.2 Instant", context: "200k" },
  "gpt-5.2-pro": { name: "GPT-5.2 Pro", context: "200k" },
  "gpt-4.1": { name: "GPT-4.1", context: "1M" },
  "gpt-4.1-mini": { name: "GPT-4.1 Mini", context: "1M" },
  "o4-mini": { name: "o4-mini", context: "200k" },
};

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

// ============================================================================
// Main Component
// ============================================================================

export function DocumentSettingsModal({
  documentId,
}: DocumentSettingsModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="flex-shrink-0"
          title="Document settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)]">
            Document Settings
          </DialogTitle>
        </DialogHeader>
        <DocumentSettingsContent documentId={documentId} />
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Settings Content (inside modal)
// ============================================================================

interface DocumentSettingsContentProps {
  documentId: Id<"documents">;
}

function DocumentSettingsContent({
  documentId,
}: DocumentSettingsContentProps) {
  const settings = useQuery(api.documentSettings.get, { documentId });
  const defaultPrompt = useQuery(api.documentSettings.getDefaultPrompt);
  const documentsForCopy = useQuery(api.documentSettings.listUserDocumentsForCopy, {
    excludeDocumentId: documentId,
  });

  const upsertSettings = useMutation(api.documentSettings.upsert);
  const copySettings = useMutation(api.documentSettings.copyFrom);

  // Local state for form
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState("claude-sonnet-4-5-20250929");
  const [temperature, setTemperature] = useState(0.7);
  const [maxSteps, setMaxSteps] = useState(5);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [tools, setTools] = useState({
    searchSources: true,
    webSearch: false,
    citation: false,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize form from settings
  useEffect(() => {
    if (settings && !isInitialized) {
      setProvider(settings.provider);
      setModel(settings.model);
      setTemperature(settings.temperature);
      setMaxSteps(settings.maxSteps);
      setSystemPrompt(settings.systemPrompt);
      setDescription(settings.description || "");
      setTools(settings.tools);
      setIsInitialized(true);
    }
  }, [settings, isInitialized]);

  // Autosave with debounce
  useEffect(() => {
    if (!isInitialized || !defaultPrompt) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await upsertSettings({
          documentId,
          provider,
          model,
          temperature,
          maxSteps,
          systemPrompt: systemPrompt || defaultPrompt,
          description: description || undefined,
          tools,
        });
      } catch (error) {
        console.error("Failed to save settings:", error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [documentId, provider, model, temperature, maxSteps, systemPrompt, description, tools, defaultPrompt, upsertSettings, isInitialized]);

  const handleCopyFrom = useCallback(
    async (sourceDocId: string) => {
      try {
        await copySettings({
          targetDocumentId: documentId,
          sourceDocumentId: sourceDocId as Id<"documents">,
        });
        // Reset initialized to pick up new settings
        setIsInitialized(false);
      } catch (error) {
        console.error("Failed to copy settings:", error);
      }
    },
    [documentId, copySettings]
  );

  const handleResetPrompt = useCallback(() => {
    if (defaultPrompt) {
      setSystemPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  // Handle provider change - switch to default model for that provider
  const handleProviderChange = useCallback((newProvider: Provider) => {
    setProvider(newProvider);
    if (newProvider === "anthropic") {
      setModel("claude-sonnet-4-5-20250929");
    } else {
      setModel("gpt-5.2");
    }
  }, []);

  if (!settings || defaultPrompt === undefined) {
    return (
      <div className="h-[436px] flex items-center justify-center">
        <Spinner className="h-6 w-6 text-daemon" />
      </div>
    );
  }

  const models = provider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS;

  return (
    <>
      <Tabs defaultValue="model" className="flex flex-col">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="model" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Model
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Sources
          </TabsTrigger>
        </TabsList>

        {/* Fixed height container for all tab content */}
        <div className="h-[400px] mt-4">
          {/* Model Tab */}
          <TabsContent value="model" className="h-full overflow-y-auto m-0">
            <div className="space-y-6 pr-2">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="flex gap-2">
                <Button
                  variant={provider === "anthropic" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleProviderChange("anthropic")}
                  className="flex-1"
                >
                  Anthropic
                </Button>
                <Button
                  variant={provider === "openai" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleProviderChange("openai")}
                  className="flex-1"
                >
                  OpenAI
                </Button>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>
                      {provider === "anthropic" ? "Anthropic Models" : "OpenAI Models"}
                    </SelectLabel>
                    {Object.entries(models).map(([id, info]) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{info.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {info.context} context
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([value]) => setTemperature(value)}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values are more focused, higher values are more creative.
              </p>
            </div>

            {/* Max Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Steps</Label>
                <span className="text-sm text-muted-foreground">{maxSteps}</span>
              </div>
              <Slider
                value={[maxSteps]}
                onValueChange={([value]) => setMaxSteps(value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum tool use iterations per response.
              </p>
            </div>

            {/* Copy From */}
            {documentsForCopy && documentsForCopy.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Copy settings from another document
                </Label>
                <Select onValueChange={handleCopyFrom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documentsForCopy.map((doc) => (
                      <SelectItem key={doc._id} value={doc._id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{doc.title}</span>
                          {doc.hasCustomSettings && (
                            <span className="text-xs text-daemon bg-daemon/10 px-1.5 py-0.5 rounded">
                              Custom
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          </TabsContent>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="h-full overflow-hidden m-0">
            <div className="h-full flex flex-col gap-4 pr-2">
              {/* Document Description - fixed height */}
              <div className="space-y-2 shrink-0">
                <Label>Document Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this document and its intended audience..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This context will be included in every AI interaction for this document.
                </p>
              </div>

              {/* System Prompt - fills remaining space */}
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <Label>System Prompt</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {systemPrompt.length} chars
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetPrompt}
                      className="h-7 gap-1.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="flex-1 resize-none font-mono text-xs min-h-0"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="h-full overflow-y-auto m-0">
            <div className="space-y-4 pr-2">
            <p className="text-sm text-muted-foreground">
              Enable or disable tools that Daimon can use when responding to your comments.
            </p>

            <div className="space-y-3">
              {/* Search Sources */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-daemon" />
                    <span className="font-medium text-sm">Search Sources</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search through attached source materials for relevant context.
                  </p>
                </div>
                <Switch
                  checked={tools.searchSources}
                  onCheckedChange={(checked) =>
                    setTools((prev) => ({ ...prev, searchSources: checked }))
                  }
                />
              </div>

              {/* Web Search */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-daemon" />
                    <span className="font-medium text-sm">Web Search</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search the web for current information and facts.
                  </p>
                </div>
                <Switch
                  checked={tools.webSearch}
                  onCheckedChange={(checked) =>
                    setTools((prev) => ({ ...prev, webSearch: checked }))
                  }
                />
              </div>

              {/* Citations */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-daemon" />
                    <span className="font-medium text-sm">Citations</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate formatted citations from attached sources.
                  </p>
                </div>
                <Switch
                  checked={tools.citation}
                  onCheckedChange={(checked) =>
                    setTools((prev) => ({ ...prev, citation: checked }))
                  }
                />
              </div>
              </div>
            </div>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="h-full overflow-y-auto m-0">
            <SourcesTab documentId={documentId} />
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}

// ============================================================================
// Sources Tab (moved from right panel)
// ============================================================================

interface SourcesTabProps {
  documentId: Id<"documents">;
}

type AddSourceMode = "none" | "file" | "url" | "text";

function SourcesTab({ documentId }: SourcesTabProps) {
  const sources = useQuery(api.sources.listByDocument, { documentId });

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
    <div className="space-y-4 pr-2">
      {/* Add source section */}
      <div className="space-y-3">
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
            <p className="text-sm text-muted-foreground">
              Add research materials for Daimon to reference when responding.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border border-border/50 hover:border-daemon/40 hover:bg-daemon/5 transition-all"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Upload File
                </span>
              </button>
              <button
                onClick={() => setAddMode("url")}
                disabled={isProcessing}
                className="flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border border-border/50 hover:border-daemon/40 hover:bg-daemon/5 transition-all"
              >
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Add URL
                </span>
              </button>
              <button
                onClick={() => setAddMode("text")}
                disabled={isProcessing}
                className="flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border border-border/50 hover:border-daemon/40 hover:bg-daemon/5 transition-all"
              >
                <FileType className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Paste Text
                </span>
              </button>
            </div>
          </>
        ) : addMode === "url" ? (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Add webpage</span>
              <button
                onClick={resetForm}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
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
              className="w-full text-sm bg-background border border-border/50 rounded-md px-3 py-2 outline-none focus:border-daemon/50"
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
                  <Spinner className="h-4 w-4 mr-2" />
                  Scraping...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Add URL
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Add text</span>
              <button
                onClick={resetForm}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full text-sm bg-background border border-border/50 rounded-md px-3 py-2 outline-none focus:border-daemon/50"
              disabled={isProcessing}
              autoFocus
            />
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your text here..."
              rows={4}
              className="resize-none"
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
                  <Spinner className="h-4 w-4 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FileType className="h-4 w-4 mr-2" />
                  Add Text
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>

      {/* Sources list */}
      <div className="space-y-2">
        {sources === undefined ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-5 w-5 text-daemon" />
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-daemon/10 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-daemon/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              No sources added yet
            </p>
          </div>
        ) : (
          sources.map((source: Source) => (
            <SourceCard key={source._id} source={source} />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Source Card
// ============================================================================

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
        return (
          <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500" />
        );
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
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-background/50 group hover:border-daemon/30 transition-colors">
      {/* Source type badge */}
      <div className="shrink-0 w-9 h-9 rounded-md bg-daemon/10 flex items-center justify-center">
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
          className="text-sm font-medium truncate text-foreground/90"
          title={source.title}
        >
          {source.title}
        </p>
        {source.url && (
          <p
            className="text-xs text-muted-foreground truncate"
            title={source.url}
          >
            {new URL(source.url).hostname}
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          {getStatusIcon()}
          <span
            className={cn(
              "text-xs",
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
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
      >
        {isDeleting ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export default DocumentSettingsModal;
