"use client";

import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user?: { name: string; email: string; role: string } | null;
  onSignOut?: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="lg:hidden w-10" />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>
        {user && (
          <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role === "ADMIN" ? "Administrator" : user.role === "BAULEITER" ? "Bauleiter" : "Mitarbeiter"}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <User className="h-5 w-5" />
            </div>
            <Button variant="ghost" size="icon" onClick={onSignOut} title="Abmelden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
