"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { useConvexAuth } from "convex/react"
import { api } from "@/convex/_generated/api"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const documents = useQuery(
    api.documents.list,
    isAuthenticated ? undefined : "skip"
  )
  const createDocument = useMutation(api.documents.create)
  const router = useRouter()
  const pathname = usePathname()
  const { signOut } = useAuthActions()
  const { theme, setTheme } = useTheme()
  const [isCreating, setIsCreating] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

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
                    <SidebarMenuItem key={doc._id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={doc.title || "Untitled"}
                      >
                        <Link href={`/${doc._id}`}>
                          <FileText className="size-4 shrink-0" />
                          <span className="truncate">
                            {doc.title || "Untitled"}
                          </span>
                        </Link>
                      </SidebarMenuButton>
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
    </Sidebar>
  )
}
