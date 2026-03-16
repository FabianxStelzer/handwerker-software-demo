"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Package,
  FileText,
  Receipt,
  UserCog,
  Clock,
  Bot,
  Menu,
  X,
  Hammer,
  Wrench,
  Settings,
  FileCheck,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Kunden", href: "/kunden", icon: Users },
  { name: "Projekte", href: "/projekte", icon: FolderKanban },
  { name: "Katalog", href: "/katalog", icon: Package },
  { name: "Angebote", href: "/angebote", icon: FileCheck },
  { name: "Aufträge", href: "/auftraege", icon: FileText },
  { name: "Rechnungen", href: "/rechnungen", icon: Receipt },
  { name: "Buchhaltung", href: "/buchhaltung", icon: Calculator },
  { name: "Mitarbeiter", href: "/mitarbeiter", icon: UserCog },
  { name: "Zeiterfassung", href: "/zeiterfassung", icon: Clock },
  { name: "KI-Assistent", href: "/ki-assistent", icon: Bot },
  { name: "Branchenspezifisch", href: "/branchenspezifisch", icon: Wrench },
  { name: "Einstellungen", href: "/einstellungen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  };

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
          <Hammer className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">Handwerker</h1>
          <p className="text-xs text-gray-400">Betriebssoftware</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-gray-900 p-2 text-white shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 flex flex-col z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </div>
        </div>
      )}

      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-gray-900">
        {navContent}
      </aside>
    </>
  );
}
