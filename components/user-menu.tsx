"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { LogOut, User, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

export function UserMenu() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const router = useRouter()

  if (isLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/signin")}
      >
        Sign in
      </Button>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/signin")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-daemon/20 text-daemon text-sm font-medium">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">My Account</p>
            <p className="text-xs text-muted-foreground">
              Manage your profile
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          Profile
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          Settings
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
