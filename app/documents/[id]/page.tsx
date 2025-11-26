"use client"

import { useParams, useRouter } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { DocumentPage } from "@/components/document-page"
import { Id } from "@/convex/_generated/dataModel"
import Link from "next/link"

export default function DocumentEditPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const documentId = params.id as Id<"documents">

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Sign in required
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please sign in to view this document.
          </p>
          <Link
            href="/signin"
            className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Back navigation */}
      <div className="fixed top-4 left-4 z-30">
        <button
          onClick={() => router.push("/documents")}
          className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="text-sm font-medium">Documents</span>
        </button>
      </div>

      <DocumentPage documentId={documentId} />
    </div>
  )
}

