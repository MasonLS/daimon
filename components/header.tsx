"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PenLine, BookOpen, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { DaimonIcon } from "@/components/icons/daimon-icon"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"

const navigation = [
  { name: "Writing", href: "/", icon: PenLine },
  { name: "Sources", href: "/sources", icon: BookOpen, disabled: true },
  { name: "Prompts", href: "/prompts", icon: Sparkles, disabled: true },
]

export function Header() {
  const pathname = usePathname()

  // Don't show header on signin page
  if (pathname === "/signin") {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <div className="w-8 h-8 bg-daemon/15 rounded-full flex items-center justify-center">
            <DaimonIcon className="w-4 h-4 text-daemon" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
            Daimon
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            if (item.disabled) {
              return (
                <span
                  key={item.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground/50 cursor-not-allowed"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Soon</Badge>
                </span>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                  isActive
                    ? "bg-daemon/10 text-daemon font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: Theme toggle and User menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
