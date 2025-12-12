"use client"

import { useConvexAuth } from "convex/react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const pathname = usePathname()

  // Pages that should never show sidebar
  const isPublicPage = pathname === "/" || pathname === "/signin"

  // For unauthenticated users or public pages, render without sidebar
  if (!isAuthenticated || (isPublicPage && !isAuthenticated)) {
    return (
      <div className="h-svh max-h-svh flex flex-col bg-background">
        {children}
      </div>
    )
  }

  // For authenticated users on app pages, render with sidebar
  return (
    <SidebarProvider className="h-svh max-h-svh">
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        {/* Mobile sidebar trigger */}
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
