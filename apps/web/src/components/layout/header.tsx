"use client";

import { signOut } from "next-auth/react";
import { LogOut, User, Menu } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ThemeControls } from "@/components/theme/theme-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { AuthUser } from "@/types";

export function Header({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-card sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-6 backdrop-blur-md sm:h-19">
      <div className="flex items-center gap-4">
        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="text-muted-foreground hover:bg-accent rounded-lg p-2 transition-colors md:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent className="w-72 p-0">
            <SidebarContent
              role={user.role as string}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <h2 className="hidden text-lg font-semibold tracking-tight md:block">
          แดชบอร์ด
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <ThemeControls />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-full p-1 transition-colors outline-none focus-visible:ring-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <User className="text-primary h-4 w-4" />
                )}
              </div>
              <div className="mr-2 hidden text-left sm:block">
                <p className="text-sm leading-none font-medium">
                  {user.name || user.email}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {user.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
