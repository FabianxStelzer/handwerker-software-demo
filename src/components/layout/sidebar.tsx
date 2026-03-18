"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FolderKanban, Package, FileText,
  UserCog, Clock, Bot, Menu, X, Hammer, Wrench, Settings,
  Calculator, ChevronDown, ChevronRight, FileStack, Building2,
  PackageSearch, Banknote, CalendarDays, ClipboardList,
  Bell, LogOut, User, Car, Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavChild = { name: string; href: string; icon: React.ElementType };
type NavItem = { name: string; href: string; icon: React.ElementType; children?: NavChild[]; expandKey?: string };

const buchhaltungSubItems: NavChild[] = [
  { name: "Dashboard", href: "/buchhaltung", icon: LayoutDashboard },
  { name: "Belege", href: "/buchhaltung/belege", icon: FileStack },
  { name: "Kunden", href: "/kunden", icon: Users },
  { name: "Lieferanten", href: "/buchhaltung/lieferanten", icon: Building2 },
  { name: "Artikel", href: "/katalog", icon: PackageSearch },
  { name: "Buchhaltung", href: "/buchhaltung/uebersicht", icon: Calculator },
  { name: "Lohn", href: "/buchhaltung/lohn", icon: Banknote },
];

const mitarbeiterSubItems: NavChild[] = [
  { name: "Übersicht", href: "/mitarbeiter", icon: Users },
  { name: "Zeiterfassung", href: "/mitarbeiter/zeiterfassung", icon: Clock },
  { name: "Urlaubsplanung", href: "/mitarbeiter/urlaubsplanung", icon: CalendarDays },
];

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Meine Aufgaben", href: "/meine-aufgaben", icon: ClipboardList },
  { name: "Kunden", href: "/kunden", icon: Users },
  { name: "Projekte", href: "/projekte", icon: FolderKanban },
  { name: "Katalog", href: "/katalog", icon: Package },
  { name: "Aufmaß", href: "/aufmass", icon: Ruler },
  { name: "Aufträge", href: "/auftraege", icon: FileText },
  { name: "Buchhaltung", href: "/buchhaltung", icon: Calculator, children: buchhaltungSubItems, expandKey: "buchhaltung" },
  { name: "Mitarbeiter", href: "/mitarbeiter", icon: UserCog, children: mitarbeiterSubItems, expandKey: "mitarbeiter" },
  { name: "Fahrzeuge", href: "/fahrzeuge", icon: Car },
  { name: "KI-Assistent", href: "/ki-assistent", icon: Bot },
  { name: "Branchenspezifisch", href: "/branchenspezifisch", icon: Wrench },
  { name: "Einstellungen", href: "/einstellungen", icon: Settings },
];

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  BAULEITER: "Bauleiter",
  MITARBEITER: "Mitarbeiter",
};

function isGroupOpen(pathname: string, item: NavItem): boolean {
  if (item.expandKey === "buchhaltung") return pathname.startsWith("/buchhaltung");
  if (item.expandKey === "mitarbeiter") return pathname.startsWith("/mitarbeiter");
  return false;
}

interface SidebarProps {
  user?: { name: string; email: string; role: string } | null;
  onSignOut?: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const userSection = user && (
    <div className="border-t border-white/10 px-3 py-3">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#9eb552" }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{roleLabels[user.role] || user.role}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/benachrichtigungen"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Benachrichtigungen"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <button
            onClick={onSignOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
            title="Abmelden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-6 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "#9eb552" }}>
          <Hammer className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">Handwerker</h1>
          <p className="text-xs text-gray-400">Betriebssoftware</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.children) {
            const open = isGroupOpen(pathname, item);
            return (
              <div key={item.name} className="space-y-0.5">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href) ? "text-white" : "text-gray-300 hover:text-white"
                  )}
                  style={isActive(item.href) ? { backgroundColor: "#9eb552" } : undefined}
                  onMouseEnter={(e) => { if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { if (!isActive(item.href)) e.currentTarget.style.backgroundColor = ""; }}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                  {open ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
                {open && (
                  <div className="ml-4 pl-2 border-l border-white/15 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive(child.href) ? "text-white" : "text-gray-400 hover:text-white"
                        )}
                        style={isActive(child.href) ? { backgroundColor: "rgba(158,181,82,0.7)" } : undefined}
                        onMouseEnter={(e) => { if (!isActive(child.href)) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                        onMouseLeave={(e) => { if (!isActive(child.href)) e.currentTarget.style.backgroundColor = ""; }}
                      >
                        <child.icon className="h-4 w-4 shrink-0" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href) ? "text-white" : "text-gray-300 hover:text-white"
              )}
              style={isActive(item.href) ? { backgroundColor: "#9eb552" } : undefined}
              onMouseEnter={(e) => { if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { if (!isActive(item.href)) e.currentTarget.style.backgroundColor = ""; }}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      {userSection}
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg p-2 text-white shadow-lg"
        style={{ backgroundColor: "#212f46" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div
            className="fixed inset-y-0 left-0 w-64 flex flex-col z-50"
            style={{ background: "linear-gradient(180deg, #212f46 0%, #354360 100%)" }}
          >
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

      <aside
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0"
        style={{ background: "linear-gradient(180deg, #212f46 0%, #354360 100%)" }}
      >
        {navContent}
      </aside>
    </>
  );
}
