"use client"

import { useParams } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { DocumentPage } from "@/components/document-page"
import { Id } from "@/convex/_generated/dataModel"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function DocumentEditPage() {
  const params = useParams()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const documentId = params.id as Id<"documents">

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
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground mb-3">
            Sign in to continue
          </h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to view this document.
          </p>
          <Button asChild>
            <Link href="/signin">
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return <DocumentPage documentId={documentId} />
}
