"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { useConvexAuth } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  Plus,
  FileText,
  Settings,
  LogOut,
  BookOpen,
  Sun,
  Moon,
  ChevronsUpDown,
  ChevronRight,
  MoreHorizontal,
  Archive,
  Trash2,
  ArchiveRestore,
} from "lucide-react"
import { useAuthActions } from "@convex-dev/auth/react"
import { useTheme } from "next-themes"

import { DaimonIcon } from "@/components/icons/daimon-icon"
import { Spinner } from "@/components/ui/spinner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const documents = useQuery(
    api.documents.list,
    isAuthenticated ? undefined : "skip"
  )
  const archivedDocuments = useQuery(
    api.documents.listArchived,
    isAuthenticated ? undefined : "skip"
  )
  const createDocument = useMutation(api.documents.create)
  const archiveDocument = useMutation(api.documents.archive)
  const restoreDocument = useMutation(api.documents.restore)
  const removeDocument = useMutation(api.documents.remove)
  const router = useRouter()
  const pathname = usePathname()
  const { signOut } = useAuthActions()
  const { theme, setTheme } = useTheme()
  const [isCreating, setIsCreating] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    docId: Id<"documents"> | null
    docTitle: string
  }>({ open: false, docId: null, docTitle: "" })
  const [archivedOpen, setArchivedOpen] = React.useState(false)

  // Avoid hydration mismatch for theme
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateDocument = async () => {
    setIsCreating(true)
    try {
      const documentId = await createDocument({ title: "Untitled" })
      router.push(`/${documentId}`)
    } catch (error) {
      console.error("Failed to create document:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/signin")
  }

  const handleArchive = async (docId: Id<"documents">) => {
    await archiveDocument({ id: docId })
    // If viewing the archived doc, redirect to home
    if (pathname === `/${docId}`) {
      router.push("/")
    }
  }

  const handleRestore = async (docId: Id<"documents">) => {
    await restoreDocument({ id: docId })
  }

  const handleDelete = async () => {
    if (!deleteDialog.docId) return
    await removeDocument({ id: deleteDialog.docId })
    setDeleteDialog({ open: false, docId: null, docTitle: "" })
    // If viewing the deleted doc, redirect to home
    if (pathname === `/${deleteDialog.docId}`) {
      router.push("/")
    }
  }

  const openDeleteDialog = (docId: Id<"documents">, docTitle: string) => {
    setDeleteDialog({ open: true, docId, docTitle })
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* Header with logo */}
      <SidebarHeader className="border-b border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="group/logo hover:bg-transparent"
            >
              <Link href="/" className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-daemon/10 text-daemon transition-colors group-hover/logo:bg-daemon/15">
                  <DaimonIcon className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                    Daimon
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Writing companion
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        {/* Documents Group */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>
            Writings
          </SidebarGroupLabel>
          <SidebarGroupAction
            onClick={handleCreateDocument}
            disabled={isCreating || !isAuthenticated}
            title="New piece"
          >
            {isCreating ? (
              <Spinner className="size-3.5" />
            ) : (
              <Plus className="size-4" />
            )}
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {authLoading ? (
                // Loading state
                <div className="flex items-center justify-center py-8">
                  <Spinner className="size-4 text-muted-foreground" />
                </div>
              ) : !isAuthenticated ? (
                // Not authenticated
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href="/signin"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="size-4" />
                      <span>Sign in to view</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : documents === undefined ? (
                // Loading documents
                <div className="flex items-center justify-center py-8">
                  <Spinner className="size-4 text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                // Empty state
                <div className="px-2 py-6 text-center">
                  <BookOpen className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No writings yet
                  </p>
                </div>
              ) : (
                // Document list
                documents.slice(0, 10).map((doc) => {
                  const isActive = pathname === `/${doc._id}`
                  return (
                    <SidebarMenuItem key={doc._id} className="group/menu-item">
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={doc.title || "Untitled"}
                        className="peer/menu-button"
                      >
                        <Link href={`/${doc._id}`}>
                          <FileText className="size-4 shrink-0" />
                          <span className="truncate">
                            {doc.title || "Untitled"}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover>
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">More options</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(doc._id); }}>
                            <Archive className="size-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(doc._id, doc.title || "Untitled"); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  )
                })
              )}

              {/* View all link when there are many documents */}
              {documents && documents.length > 10 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Link href="/">
                      <span className="text-xs">
                        View all {documents.length} pieces
                      </span>
                      <ChevronRight className="size-3 ml-auto" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Archived Documents Group */}
        {archivedDocuments && archivedDocuments.length > 0 && (
          <SidebarGroup>
            <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors">
                  <ChevronRight
                    className={`size-3 mr-1 transition-transform ${archivedOpen ? "rotate-90" : ""}`}
                  />
                  Archived ({archivedDocuments.length})
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {archivedDocuments.map((doc) => {
                      const isActive = pathname === `/${doc._id}`
                      return (
                        <SidebarMenuItem key={doc._id} className="group/menu-item">
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={doc.title || "Untitled"}
                            className="peer/menu-button text-muted-foreground"
                          >
                            <Link href={`/${doc._id}`}>
                              <FileText className="size-4 shrink-0" />
                              <span className="truncate">
                                {doc.title || "Untitled"}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <SidebarMenuAction showOnHover>
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">More options</span>
                              </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right" align="start">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRestore(doc._id); }}>
                                <ArchiveRestore className="size-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); openDeleteDialog(doc._id, doc.title || "Untitled"); }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with user menu */}
      <SidebarFooter className="border-t border-sidebar-border/50">
        <SidebarMenu>
          {/* Theme toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )
              ) : (
                <Sun className="size-4" />
              )}
              <span>{mounted && theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* User menu */}
          {isAuthenticated && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <DaimonIcon className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Writer</span>
                      <span className="truncate text-xs text-muted-foreground">
                        Your account
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem disabled className="opacity-50">
                    <Settings className="size-4 mr-2" />
                    Settings
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Soon
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
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
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}
