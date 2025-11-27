"use client"

import { useQuery, useMutation } from "convex/react"
import { useConvexAuth } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Id } from "@/convex/_generated/dataModel"
import { Plus, Trash2, PenSquare } from "lucide-react"
import { DaimonIcon } from "@/components/icons/daimon-icon"

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DocumentsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const documents = useQuery(api.documents.list)
  const createDocument = useMutation(api.documents.create)
  const removeDocument = useMutation(api.documents.remove)
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner className="w-6 h-6 text-daemon" />
      </div>
    )
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-foreground mb-3">
            Welcome to Daimon
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Your creative companion awaits. Sign in to begin your writing journey.
          </p>
          <Button asChild size="lg">
            <Link href="/signin">
              Get Started
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleCreateDocument = async () => {
    setIsCreating(true)
    try {
      const documentId = await createDocument({ title: "Untitled" })
      router.push(`/${documentId}`)
    } catch (error) {
      console.error("Failed to create document:", error)
      setIsCreating(false)
    }
  }

  const handleDeleteDocument = async (id: Id<"documents">) => {
    try {
      await removeDocument({ id })
    } catch (error) {
      console.error("Failed to delete document:", error)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
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
            <Button
              onClick={handleCreateDocument}
              disabled={isCreating}
              className="bg-daemon hover:bg-daemon/90 text-daemon-foreground"
            >
              {isCreating ? (
                <>
                  <Spinner className="w-4 h-4" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>New Piece</span>
                </>
              )}
            </Button>
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
              Your daimon awaits to whisper ideas and connections as you write.
            </p>
            <Button
              onClick={handleCreateDocument}
              disabled={isCreating}
              size="lg"
              className="bg-daemon hover:bg-daemon/90 text-daemon-foreground"
            >
              Start Writing
            </Button>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete &ldquo;{doc.title || "Untitled"}&rdquo;. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDocument(doc._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
