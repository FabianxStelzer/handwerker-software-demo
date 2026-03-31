"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Users, FolderKanban, Package, FileText, FileSignature,
  UserCog, Clock, Bot, Menu, X, Wrench, Settings, Drill, GraduationCap, HeartPulse, BookOpen,
  Calculator, ChevronDown, ChevronRight, FileStack, Building2, MapPin,
  PackageSearch, Banknote, CalendarDays, ClipboardList,
  Bell, LogOut, User, Car, Ruler, FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

type NavChild = { name: string; href: string; icon: React.ElementType; tKey?: TranslationKey };
type NavItem = { name: string; href: string; icon: React.ElementType; children?: NavChild[]; expandKey?: string; tKey?: TranslationKey };

const buchhaltungSubItems: NavChild[] = [
  { name: "Dashboard", href: "/buchhaltung", icon: LayoutDashboard, tKey: "nav.dashboard" },
  { name: "Belege", href: "/buchhaltung/belege", icon: FileStack, tKey: "nav.belege" },
  { name: "Kontakte", href: "/buchhaltung/kontakte", icon: Users, tKey: "nav.kontakte" },
  { name: "Buchhaltung", href: "/buchhaltung/uebersicht", icon: Calculator, tKey: "nav.buchhaltung" },
  { name: "Lohn", href: "/buchhaltung/lohn", icon: Banknote, tKey: "nav.lohn" },
  { name: "Belegprüfung", href: "/buchhaltung/belegpruefung", icon: FileCheck2, tKey: "nav.belegpruefung" },
];

const mitarbeiterSubItems: NavChild[] = [
  { name: "Übersicht", href: "/mitarbeiter", icon: Users, tKey: "nav.uebersicht" },
  { name: "Zeiterfassung", href: "/mitarbeiter/zeiterfassung", icon: Clock, tKey: "nav.zeiterfassung" },
  { name: "Urlaubsplanung", href: "/mitarbeiter/urlaubsplanung", icon: CalendarDays, tKey: "nav.urlaubsplanung" },
  { name: "Schulungen", href: "/mitarbeiter/schulungen", icon: GraduationCap, tKey: "nav.schulungen" },
  { name: "Ausfälle", href: "/mitarbeiter/ausfaelle", icon: HeartPulse, tKey: "nav.ausfaelle" },
  { name: "Azubi", href: "/mitarbeiter/azubi", icon: BookOpen, tKey: "nav.azubi" },
];

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, tKey: "nav.dashboard" },
  { name: "Alltagsverwaltung", href: "/alltagsverwaltung", icon: MapPin, tKey: "nav.alltagsverwaltung" },
  { name: "Meine Aufgaben", href: "/meine-aufgaben", icon: ClipboardList, tKey: "nav.meineAufgaben" },
  { name: "Termine", href: "/termine", icon: CalendarDays, tKey: "nav.termine" },
  { name: "Kunden", href: "/kunden", icon: Users, tKey: "nav.kunden" },
  { name: "Projekte", href: "/projekte", icon: FolderKanban, tKey: "nav.projekte" },
  { name: "Vereinbarungen", href: "/vereinbarungen", icon: FileSignature, tKey: "nav.vereinbarungen" },
  { name: "Katalog", href: "/katalog", icon: Package, tKey: "nav.katalog" },
  { name: "Aufmaß", href: "/aufmass", icon: Ruler, tKey: "nav.aufmass" },
  { name: "Buchhaltung", href: "/buchhaltung", icon: Calculator, children: buchhaltungSubItems, expandKey: "buchhaltung", tKey: "nav.buchhaltung" },
  { name: "Mitarbeiter", href: "/mitarbeiter", icon: UserCog, children: mitarbeiterSubItems, expandKey: "mitarbeiter", tKey: "nav.mitarbeiter" },
  { name: "Fahrzeuge", href: "/fahrzeuge", icon: Car, tKey: "nav.fahrzeuge" },
  { name: "Werkzeuge", href: "/werkzeuge", icon: Drill, tKey: "nav.werkzeuge" },
  { name: "KI-Assistent", href: "/ki-assistent", icon: Bot, tKey: "nav.kiAssistent" },
  { name: "Branchenspezifisch", href: "/branchenspezifisch", icon: Wrench, tKey: "nav.branchenspezifisch" },
  { name: "Einstellungen", href: "/einstellungen", icon: Settings, tKey: "nav.einstellungen" },
];

function isGroupOpen(pathname: string, item: NavItem, fromBuchhaltung = false): boolean {
  if (item.expandKey === "buchhaltung") return pathname.startsWith("/buchhaltung") || (fromBuchhaltung && pathname.startsWith("/kunden/"));
  if (item.expandKey === "mitarbeiter") return pathname.startsWith("/mitarbeiter");
  return false;
}

interface SidebarProps {
  user?: { name: string; email: string; role: string } | null;
  onSignOut?: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  const fromBuchhaltung = searchParams.get("from") === "buchhaltung";

  const roleLabels: Record<string, string> = {
    ADMIN: t("role.ADMIN"),
    BAULEITER: t("role.BAULEITER"),
    MITARBEITER: t("role.MITARBEITER"),
  };

  const isActive = (href: string, exact?: boolean) => {
    if (href === "/") return pathname === "/";
    if (exact) return pathname === href;
    if (href === "/kunden") {
      return (pathname === "/kunden" || pathname.startsWith("/kunden/")) && !fromBuchhaltung;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const userSection = user && (
    <div className="border-t border-white/10 px-3 py-3">
      <div className="flex items-center gap-3 px-2">
        <Link href="/profil" onClick={() => setMobileOpen(false)} className="shrink-0" title={t("profil.title")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white hover:ring-2 hover:ring-[#9eb552] transition-all" style={{ backgroundColor: "#9eb552" }}>
            {initials}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href="/profil" onClick={() => setMobileOpen(false)} className="hover:underline">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
          </Link>
          <p className="text-xs text-gray-400 truncate">{roleLabels[user.role] || user.role}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/benachrichtigungen"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={t("nav.benachrichtigungen")}
          >
            <Bell className="h-4 w-4" />
          </Link>
          <button
            onClick={onSignOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
            title={t("nav.abmelden")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const navContent = (
    <>
      <div className="px-4 py-5 border-b border-white/10">
        <img src="/logo-white.png" alt="Handwerk Voran" className="h-10 w-auto" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.children) {
            const open = isGroupOpen(pathname, item, fromBuchhaltung);
            const parentExact = isActive(item.href, true);
            return (
              <div key={item.name} className="space-y-0.5">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    parentExact ? "text-white" : open ? "text-gray-200" : "text-gray-300 hover:text-white"
                  )}
                  style={parentExact ? { backgroundColor: "#9eb552" } : open ? { backgroundColor: "rgba(255,255,255,0.06)" } : undefined}
                  onMouseEnter={(e) => { if (!parentExact) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { if (!parentExact) e.currentTarget.style.backgroundColor = open ? "rgba(255,255,255,0.06)" : ""; }}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.tKey ? t(item.tKey) : item.name}
                  {open ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
                {open && (
                  <div className="ml-4 pl-2 border-l border-white/15 space-y-0.5">
                    {item.children.map((child) => {
                      let childActive = isActive(child.href, true);
                      if (child.href === "/buchhaltung/kontakte" && fromBuchhaltung && pathname.startsWith("/kunden/")) {
                        childActive = true;
                      }
                      return (
                      <Link
                        key={child.name}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          childActive ? "text-white" : "text-gray-400 hover:text-white"
                        )}
                        style={childActive ? { backgroundColor: "rgba(158,181,82,0.7)" } : undefined}
                        onMouseEnter={(e) => { if (!childActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                        onMouseLeave={(e) => { if (!childActive) e.currentTarget.style.backgroundColor = ""; }}
                      >
                        <child.icon className="h-4 w-4 shrink-0" />
                        {child.tKey ? t(child.tKey) : child.name}
                      </Link>
                      );
                    })}
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
              {item.tKey ? t(item.tKey) : item.name}
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
