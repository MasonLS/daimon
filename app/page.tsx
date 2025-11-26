"use client"

import { useQuery, useMutation } from "convex/react"
import { useConvexAuth } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Id } from "@/convex/_generated/dataModel"

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
            Please sign in to view and create documents.
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

  const handleCreateDocument = async () => {
    setIsCreating(true)
    try {
      const documentId = await createDocument({ title: "Untitled document" })
      router.push(`/${documentId}`)
    } catch (error) {
      console.error("Failed to create document:", error)
      setIsCreating(false)
    }
  }

  const handleDeleteDocument = async (id: Id<"documents">, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await removeDocument({ id })
      } catch (error) {
        console.error("Failed to delete document:", error)
      }
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Documents
          </h1>
          <button
            onClick={handleCreateDocument}
            disabled={isCreating}
            className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Document
              </>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {documents === undefined ? (
          // Loading documents
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse"
              >
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
              No documents yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Create your first document to get started.
            </p>
            <button
              onClick={handleCreateDocument}
              disabled={isCreating}
              className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              Create your first document
            </button>
          </div>
        ) : (
          // Document list
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Link
                key={doc._id}
                href={`/${doc._id}`}
                className="group bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white">
                      {doc.title || "Untitled document"}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Last edited {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDocument(doc._id, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
                    title="Delete document"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
