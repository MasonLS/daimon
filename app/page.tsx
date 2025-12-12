"use client"

import { useQuery, useMutation } from "convex/react"
import { useConvexAuth } from "convex/react"
import { api } from "@/convex/_generated/api"
import Link from "next/link"
import { useState } from "react"
import { Id } from "@/convex/_generated/dataModel"
import { Plus, Trash2, PenSquare, MoreHorizontal, Archive } from "lucide-react"
import { DaimonIcon } from "@/components/icons/daimon-icon"
import { NewDocumentModal } from "@/components/new-document-modal"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DocumentsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const documents = useQuery(api.documents.list)
  const archiveDocument = useMutation(api.documents.archive)
  const removeDocument = useMutation(api.documents.remove)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    docId: Id<"documents"> | null
    docTitle: string
  }>({ open: false, docId: null, docTitle: "" })

  // Landing page for unauthenticated users (show immediately, even during auth loading)
  if (!isAuthenticated) {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Hero Section */}
        <section className="min-h-svh flex flex-col justify-center px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Icon */}
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <DaimonIcon className="w-24 h-24 mx-auto text-daemon" />
            </div>

            {/* Main headline */}
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
              An AI editor for
              <br />
              <span className="text-daemon">thinking better</span>
            </h1>

            {/* Subheadline */}
            <p className="font-[family-name:var(--font-serif)] text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
              Daimon is the AI that prompts you&mdash;asking questions, surfacing connections, provoking insight. It never writes for you.
            </p>

            {/* CTA */}
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
              <Button asChild size="lg" className="bg-daemon hover:bg-daemon/90 text-daemon-foreground text-lg px-8 py-6 h-auto">
                <Link href="/signin">
                  Begin Writing
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-6 py-24">
          <div className="max-w-4xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-16">
              <p className="font-[family-name:var(--font-sans)] text-sm uppercase tracking-[0.2em] text-daemon mb-4">
                How It Works
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-foreground">
                A companion for the blank page
              </h2>
            </div>

            {/* Steps */}
            <div className="space-y-16 md:space-y-24">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-daemon/30 flex items-center justify-center">
                  <span className="font-[family-name:var(--font-display)] text-2xl text-daemon">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-semibold text-foreground mb-3">
                    Write freely in a distraction-free editor
                  </h3>
                  <p className="font-[family-name:var(--font-serif)] text-muted-foreground leading-relaxed text-lg">
                    A clean, focused writing environment with rich formatting. No clutter, no AI suggestions popping up mid-sentence. Just you and the page.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-daemon/30 flex items-center justify-center">
                  <span className="font-[family-name:var(--font-display)] text-2xl text-daemon">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-semibold text-foreground mb-3">
                    When you&apos;re stuck, summon Daimon
                  </h3>
                  <p className="font-[family-name:var(--font-serif)] text-muted-foreground leading-relaxed text-lg">
                    Hit a wall? Daimon reads what you&apos;ve written and asks probing questions. &ldquo;What would happen if...?&rdquo; &ldquo;Have you considered...?&rdquo; &ldquo;This connects to...&rdquo;
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-daemon/30 flex items-center justify-center">
                  <span className="font-[family-name:var(--font-display)] text-2xl text-daemon">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-semibold text-foreground mb-3">
                    Follow the thread that resonates
                  </h3>
                  <p className="font-[family-name:var(--font-serif)] text-muted-foreground leading-relaxed text-lg">
                    Pick the prompt that sparks something. Ignore the rest. Daimon offers possibilities—you decide which paths to explore. Every word remains yours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="px-6 py-24 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="font-[family-name:var(--font-sans)] text-sm uppercase tracking-[0.2em] text-daemon mb-4">
                Made For
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-foreground">
                Writers who think on the page
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Use case cards */}
              <div className="group p-6 rounded-lg border border-border/50 bg-background hover:border-daemon/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-daemon-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-daemon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground mb-2">Essays & Articles</h3>
                <p className="font-[family-name:var(--font-serif)] text-sm text-muted-foreground">Develop arguments and find the throughline in your thinking.</p>
              </div>

              <div className="group p-6 rounded-lg border border-border/50 bg-background hover:border-daemon/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-daemon-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-daemon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground mb-2">Fiction & Stories</h3>
                <p className="font-[family-name:var(--font-serif)] text-sm text-muted-foreground">Unstick plot problems and discover character depths.</p>
              </div>

              <div className="group p-6 rounded-lg border border-border/50 bg-background hover:border-daemon/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-daemon-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-daemon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground mb-2">Academic Writing</h3>
                <p className="font-[family-name:var(--font-serif)] text-sm text-muted-foreground">Structure complex ideas and strengthen your thesis.</p>
              </div>

              <div className="group p-6 rounded-lg border border-border/50 bg-background hover:border-daemon/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-daemon-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-daemon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground mb-2">Journaling</h3>
                <p className="font-[family-name:var(--font-serif)] text-sm text-muted-foreground">Go deeper with reflective prompts that illuminate patterns.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="px-6 py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-6">
              Your thinking deserves a companion,
              <br />
              not a replacement.
            </h2>
            <p className="font-[family-name:var(--font-serif)] text-lg text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              The AI that prompts you, never writes for you.
            </p>
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              <Button asChild size="lg" className="bg-daemon hover:bg-daemon/90 text-daemon-foreground text-lg px-8 py-6 h-auto">
                <Link href="/signin">
                  Begin Writing
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-border/50">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <DaimonIcon className="w-4 h-4 text-daemon" />
              <span className="font-[family-name:var(--font-display)]">Daimon</span>
            </div>
            <p className="font-[family-name:var(--font-serif)] italic">
              Daimon whispers. You write.
            </p>
          </div>
        </footer>
      </div>
    )
  }

  const handleArchiveDocument = async (id: Id<"documents">) => {
    try {
      await archiveDocument({ id })
    } catch (error) {
      console.error("Failed to archive document:", error)
    }
  }

  const handleDeleteDocument = async () => {
    if (!deleteDialog.docId) return
    try {
      await removeDocument({ id: deleteDialog.docId })
      setDeleteDialog({ open: false, docId: null, docTitle: "" })
    } catch (error) {
      console.error("Failed to delete document:", error)
    }
  }

  const openDeleteDialog = (docId: Id<"documents">, docTitle: string) => {
    setDeleteDialog({ open: true, docId, docTitle })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <>
    <div className="flex-1 bg-background">
      {/* Page header */}
      <div className="bg-background/50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground tracking-tight">
                Your Writing
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {documents?.length || 0} {documents?.length === 1 ? 'piece' : 'pieces'}
              </p>
            </div>
            <NewDocumentModal>
              <Button className="bg-daemon hover:bg-daemon/90 text-daemon-foreground">
                <Plus className="w-4 h-4" />
                <span>New Piece</span>
              </Button>
            </NewDocumentModal>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {documents === undefined ? (
          // Loading documents
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="px-5 py-3">
                  <Skeleton className="h-5 w-2/5 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          // Empty state
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="w-20 h-20 bg-daemon-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <PenSquare className="w-10 h-10 text-daemon" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground mb-3">
              Begin your first piece
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Daimon awaits to whisper ideas and connections as you write.
            </p>
            <NewDocumentModal>
              <Button
                size="lg"
                className="bg-daemon hover:bg-daemon/90 text-daemon-foreground"
              >
                Start Writing
              </Button>
            </NewDocumentModal>
          </div>
        ) : (
          // Document list
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card
                key={doc._id}
                className="group border-border/50 hover:border-daemon/40 hover:shadow-sm transition-all duration-200"
              >
                <Link href={`/${doc._id}`} className="block">
                  <CardContent className="px-5 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-[family-name:var(--font-serif)] text-lg text-foreground truncate group-hover:text-daemon transition-colors">
                          {doc.title || "Untitled"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(doc.updatedAt)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveDocument(doc._id); }}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(doc._id, doc.title || "Untitled"); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteDialog.docTitle}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}
