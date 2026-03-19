"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, FileText, FileCheck, Package, Upload, X, Copy, ExternalLink,
  ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Clock, CheckCircle2,
  Ban, Archive, MoreHorizontal, Pencil, Mail, Printer, ChevronDown,
  Receipt, Eye, Loader2, Image, File, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

/* ── Unified Beleg type ─────────────────────────────── */
interface Beleg {
  id: string;
  typ: "rechnung" | "angebot" | "eingang" | "lieferschein" | "ausgabe";
  typLabel: string;
  nummer: string;
  kontakt: string;
  kontaktId?: string;
  datum: string;
  faellig?: string | null;
  betrag: number;
  status: string;
  statusLabel: string;
  statusColor: string;
  raw: any;
}

function buildBelege(invoices: any[], quotations: any[], incomingInvoices: any[], deliveryNotes: any[], expenses: any[]): Beleg[] {
  const belege: Beleg[] = [];

  for (const inv of invoices) {
    const isOverdue = inv.status === "UEBERFAELLIG";
    const isPaid = inv.status === "BEZAHLT";
    const isDraft = inv.status === "ENTWURF";
    belege.push({
      id: inv.id,
      typ: "rechnung",
      typLabel: "Rechnung",
      nummer: inv.invoiceNumber || "",
      kontakt: inv.customerName || "",
      datum: inv.createdAt,
      faellig: inv.dueDate,
      betrag: inv.grossTotal || 0,
      status: inv.status,
      statusLabel: isOverdue ? `seit ${daysSince(inv.dueDate)} Tagen überfällig` : isPaid ? "bezahlt" : isDraft ? "Entwurf" : `zu erhalten ${formatCurrency(inv.grossTotal)}`,
      statusColor: isOverdue ? "text-red-600" : isPaid ? "text-green-600" : isDraft ? "text-gray-500" : "text-green-600",
      raw: inv,
    });
  }

  for (const q of quotations) {
    belege.push({
      id: q.id,
      typ: "angebot",
      typLabel: "Angebot",
      nummer: q.quotationNumber || "",
      kontakt: q.customerName || "",
      datum: q.createdAt,
      faellig: q.validUntil,
      betrag: q.grossTotal || 0,
      status: q.status,
      statusLabel: q.status === "ANGENOMMEN" ? "angenommen" : q.status === "ABGELEHNT" ? "abgelehnt" : q.status === "VERSENDET" ? "offen" : "Entwurf",
      statusColor: q.status === "ANGENOMMEN" ? "text-green-600" : q.status === "ABGELEHNT" ? "text-red-600" : "text-gray-500",
      raw: q,
    });
  }

  for (const ein of incomingInvoices) {
    const isOverdue = ein.status === "UEBERFAELLIG";
    const isPaid = ein.status === "BEZAHLT";
    belege.push({
      id: ein.id,
      typ: "eingang",
      typLabel: "Ausgabe",
      nummer: ein.referenceNo || "",
      kontakt: ein.vendor?.name || "Unbekannt",
      datum: ein.date,
      faellig: ein.dueDate,
      betrag: ein.grossAmount || 0,
      status: ein.status,
      statusLabel: isPaid ? "bezahlt" : isOverdue ? "überfällig" : "zu prüfen",
      statusColor: isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-amber-600",
      raw: ein,
    });
  }

  for (const d of deliveryNotes) {
    belege.push({
      id: d.id,
      typ: "lieferschein",
      typLabel: "Lieferschein",
      nummer: d.noteNumber || "",
      kontakt: d.customerName || "",
      datum: d.date,
      betrag: 0,
      status: "ERSTELLT",
      statusLabel: "erstellt",
      statusColor: "text-gray-500",
      raw: d,
    });
  }

  for (const ex of expenses) {
    belege.push({
      id: ex.id,
      typ: "ausgabe",
      typLabel: "Ausgabe",
      nummer: ex.id.slice(0, 8).toUpperCase(),
      kontakt: ex.vendor || ex.category || "Sonstige",
      datum: ex.date,
      betrag: ex.grossAmount || 0,
      status: "GEBUCHT",
      statusLabel: "wird abgebucht",
      statusColor: "text-gray-500",
      raw: ex,
    });
  }

  belege.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  return belege;
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

/* ── Filter categories ──────────────────────────────── */
type FilterKey = "alle" | "ausgang" | "eingang" | "ueberfaellig" | "offen" | "entwurf" | "pruefen" | "storniert" | "archiviert";

function filterBelege(belege: Beleg[], filterKey: FilterKey): Beleg[] {
  switch (filterKey) {
    case "ausgang": return belege.filter((b) => b.typ === "rechnung" || b.typ === "angebot" || b.typ === "lieferschein");
    case "eingang": return belege.filter((b) => b.typ === "eingang" || b.typ === "ausgabe");
    case "ueberfaellig": return belege.filter((b) => b.status === "UEBERFAELLIG" || (b.faellig && new Date(b.faellig) < new Date() && b.status !== "BEZAHLT" && b.status !== "ANGENOMMEN" && b.status !== "ERLEDIGT"));
    case "offen": return belege.filter((b) => b.status === "VERSENDET" || b.status === "OFFEN");
    case "entwurf": return belege.filter((b) => b.status === "ENTWURF");
    case "pruefen": return belege.filter((b) => b.statusLabel.includes("prüfen") || b.status === "OFFEN");
    case "storniert": return belege.filter((b) => b.status === "STORNIERT");
    case "archiviert": return belege.filter((b) => b.status === "ARCHIVIERT");
    default: return belege;
  }
}

const FILTERS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
  { key: "alle", label: "Alle Belege", icon: FileText },
  { key: "ausgang", label: "Ausgangsbelege", icon: ArrowUpFromLine },
  { key: "eingang", label: "Eingangsbelege", icon: ArrowDownToLine },
  { key: "ueberfaellig", label: "Überfällige", icon: AlertTriangle },
  { key: "offen", label: "Offene", icon: Clock },
  { key: "entwurf", label: "Entwürfe", icon: Pencil },
  { key: "pruefen", label: "Zu prüfen", icon: Eye },
  { key: "storniert", label: "Storniert", icon: Ban },
  { key: "archiviert", label: "Archiviert", icon: Archive },
];

/* ── Page Component ─────────────────────────────────── */
export default function BelegePage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [incomingInvoices, setIncomingInvoices] = useState<any[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("alle");
  const [search, setSearch] = useState("");
  const [selectedBeleg, setSelectedBeleg] = useState<Beleg | null>(null);
  const [sortBy, setSortBy] = useState<"datum" | "betrag">("datum");

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialogs
  const [neuBelegOpen, setNeuBelegOpen] = useState(false);
  const [eingangDialogOpen, setEingangDialogOpen] = useState(false);
  const [angebotDialogOpen, setAngebotDialogOpen] = useState(false);
  const [rechnungDialogOpen, setRechnungDialogOpen] = useState(false);
  const [lieferscheinDialogOpen, setLieferscheinDialogOpen] = useState(false);
  const [createError, setCreateError] = useState("");

  function load() {
    Promise.all([
      fetch("/api/rechnungen").then((r) => r.json()),
      fetch("/api/angebote").then((r) => r.json()),
      fetch("/api/belege/eingangsrechnungen").then((r) => r.json()),
      fetch("/api/belege/lieferscheine").then((r) => r.json()),
      fetch(`/api/buchhaltung/expenses?year=${new Date().getFullYear()}`).then((r) => r.json()),
      fetch("/api/kunden").then((r) => r.json()),
      fetch("/api/projekte").then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()).catch(() => []),
      fetch("/api/auftraege").then((r) => r.json()),
    ]).then(([inv, q, ein, ls, ex, c, p, v, o]) => {
      setInvoices(inv);
      setQuotations(q);
      setIncomingInvoices(ein);
      setDeliveryNotes(ls);
      setExpenses(ex);
      setCustomers(c);
      setProjects(p);
      setVendors(v);
      setOrders(o);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetch("/api/belege/dokumente").then((r) => r.json()).then(setUploadedDocs).catch(() => {});
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    try {
      const res = await fetch("/api/belege/dokumente", { method: "POST", body: fd });
      if (res.ok) {
        const newDocs = await res.json();
        setUploadedDocs((prev) => [...newDocs, ...prev]);
      }
    } catch {}
    setUploading(false);
  }, []);

  async function deleteDoc(id: string) {
    await fetch("/api/belege/dokumente", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
  }

  const allBelege = useMemo(() => buildBelege(invoices, quotations, incomingInvoices, deliveryNotes, expenses), [invoices, quotations, incomingInvoices, deliveryNotes, expenses]);

  const filteredBelege = useMemo(() => {
    let list = filterBelege(allBelege, activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.kontakt.toLowerCase().includes(q) ||
        b.nummer.toLowerCase().includes(q) ||
        b.typLabel.toLowerCase().includes(q) ||
        b.betrag.toString().includes(q)
      );
    }
    if (sortBy === "betrag") {
      list = [...list].sort((a, b) => b.betrag - a.betrag);
    }
    return list;
  }, [allBelege, activeFilter, search, sortBy]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {} as any;
    for (const f of FILTERS) counts[f.key] = filterBelege(allBelege, f.key).length;
    return counts;
  }, [allBelege]);

  const ordersWithoutInvoice = orders.filter((o) => !o.invoice);

  // ── Create handlers ──
  async function handleCreateAngebot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { const val = String(v).trim(); if (k === "projectId" && !val) return; data[k] = val; });
    if (!data.customerId) { setCreateError("Bitte Kunde auswählen."); return; }
    const res = await fetch("/api/angebote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, projectId: data.projectId || null }) });
    if (!res.ok) { setCreateError((await res.json()).error || "Fehler"); return; }
    const quotation = await res.json();
    setAngebotDialogOpen(false);
    router.push(`/angebote/${quotation.id}`);
  }

  async function handleCreateRechnung(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const orderId = fd.get("orderId") as string;
    if (!orderId) { setCreateError("Bitte Auftrag wählen."); return; }
    const res = await fetch("/api/rechnungen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
    if (!res.ok) { setCreateError((await res.json()).error || "Fehler"); return; }
    const invoice = await res.json();
    setRechnungDialogOpen(false);
    router.push(`/rechnungen/${invoice.id}`);
  }

  async function handleCreateEingang(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (!data.vendorId) { setCreateError("Bitte Lieferant wählen."); return; }
    if (!data.referenceNo?.trim()) { setCreateError("Rechnungsnummer erforderlich."); return; }
    const res = await fetch("/api/belege/eingangsrechnungen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId: data.vendorId, referenceNo: data.referenceNo.trim(), date: data.date || new Date().toISOString().slice(0, 10), dueDate: data.dueDate || null, grossAmount: parseFloat(data.grossAmount) || 0, notes: data.notes || null }) });
    if (!res.ok) { setCreateError((await res.json()).error || "Fehler"); return; }
    setEingangDialogOpen(false);
    load();
  }

  async function handleCreateLieferschein(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (!data.customerId) { setCreateError("Bitte Kunde wählen."); return; }
    const res = await fetch("/api/belege/lieferscheine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: data.customerId, projectId: data.projectId || null, date: data.date || new Date().toISOString().slice(0, 10), notes: data.notes || null }) });
    if (!res.ok) { setCreateError((await res.json()).error || "Fehler"); return; }
    setLieferscheinDialogOpen(false);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  function getBelegLink(b: Beleg) {
    if (b.typ === "rechnung") return `/rechnungen/${b.id}`;
    if (b.typ === "angebot") return `/angebote/${b.id}`;
    return null;
  }

  function getBelegDescription(b: Beleg) {
    const parts: string[] = [b.typLabel];
    if (b.nummer) parts.push(`- ${b.nummer}`);
    parts.push(`vom ${formatDate(b.datum)}`);
    if (b.faellig) {
      const fLabel = b.typ === "angebot" ? "gültig bis" : "fällig zum";
      parts.push(`- ${fLabel} ${formatDate(b.faellig)}`);
    }
    return parts.join(" ");
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-80px)] overflow-hidden -mx-4 -my-6 sm:-mx-6">
      {/* ── Left Sidebar ──────────────────────── */}
      <div className="w-56 shrink-0 border-r bg-white flex flex-col overflow-y-auto">
        {/* Neuer Beleg Button */}
        <div className="p-3">
          <Button className="w-full gap-1.5 bg-[#9eb552] hover:bg-[#8da448] text-white" onClick={() => setNeuBelegOpen(true)}>
            <Plus className="h-4 w-4" />
            Neuer Beleg
          </Button>
        </div>

        {/* Filter Navigation */}
        <nav className="flex-1 px-2 pb-4">
          {FILTERS.map((f) => {
            const count = filterCounts[f.key];
            const Icon = f.icon;
            const isActive = activeFilter === f.key;
            const showBadge = f.key === "ueberfaellig" || f.key === "pruefen";
            return (
              <button
                key={f.key}
                onClick={() => { setActiveFilter(f.key); setSelectedBeleg(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-[#354360]/10 text-[#212f46] font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{f.label}</span>
                {showBadge && count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    f.key === "ueberfaellig" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Main Content ──────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">
              {FILTERS.find((f) => f.key === activeFilter)?.label || "Alle Belege"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Sortieren nach</span>
              <NativeSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as "datum" | "betrag")} className="h-7 text-xs w-auto">
                <option value="datum">Letzte Veränderung</option>
                <option value="betrag">Betrag</option>
              </NativeSelect>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen nach Name, Belegnummer oder Betrag"
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Upload area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-3 border-2 border-dashed rounded-lg px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
              dragOver ? "border-green-500 bg-green-100/60" : "border-green-300 bg-green-50/50 hover:bg-green-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xml,.gif,.webp"
              className="hidden"
              onChange={(e) => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ""; }}
            />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600 shrink-0">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </div>
            <p className="text-xs text-green-800">
              <strong>Bilddokumente hinzufügen</strong> (hier ablegen oder <span className="underline font-semibold text-green-700">auswählen</span>)
              <span className="block text-green-600/70 text-[10px]">PDF, JPEG, PNG oder XML – max. 5MB pro Datei</span>
            </p>
          </div>

          {/* Uploaded documents */}
          {uploadedDocs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {uploadedDocs.slice(0, 8).map((doc) => {
                const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(doc.fileType);
                return (
                  <div key={doc.id} className="group relative flex items-center gap-2 bg-white border rounded-lg px-2.5 py-1.5 text-xs">
                    {isImage ? <Image className="h-3.5 w-3.5 text-blue-500 shrink-0" /> : <File className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <a href={`/api/uploads/${doc.fileUrl.replace(/^\/uploads\//, "")}`} target="_blank" rel="noopener" className="text-gray-700 hover:text-blue-600 truncate max-w-[120px]">
                      {doc.fileName}
                    </a>
                    <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {uploadedDocs.length > 8 && (
                <span className="text-xs text-gray-400 self-center">+{uploadedDocs.length - 8} weitere</span>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredBelege.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileText className="h-10 w-10 mb-2" />
              <p className="text-sm">Keine Belege gefunden</p>
            </div>
          ) : (
            <div>
              {filteredBelege.map((b) => {
                const isSelected = selectedBeleg?.id === b.id;
                return (
                  <button
                    key={`${b.typ}-${b.id}`}
                    onClick={() => setSelectedBeleg(b)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 text-left transition-colors ${
                      isSelected ? "bg-blue-50/60 border-l-2 border-l-blue-500" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Checkbox placeholder */}
                    <div className={`h-4 w-4 rounded border shrink-0 ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{b.kontakt}</p>
                      <p className="text-xs text-gray-500 truncate">{getBelegDescription(b)}</p>
                    </div>

                    {/* Amount & Status */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.betrag)}</p>
                      <p className={`text-xs font-medium ${b.statusColor}`}>{b.statusLabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Detail Panel ────────────────── */}
      {selectedBeleg ? (
        <div className="w-80 shrink-0 border-l bg-white overflow-y-auto">
          {/* Preview placeholder */}
          <div className="bg-gray-100 h-44 flex items-center justify-center border-b">
            <div className="text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400">Belegvorschau</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-1 py-2 border-b">
            {getBelegLink(selectedBeleg) && (
              <Link href={getBelegLink(selectedBeleg)!}>
                <button className="p-2 rounded hover:bg-gray-100" title="Bearbeiten"><Pencil className="h-4 w-4 text-gray-500" /></button>
              </Link>
            )}
            <button className="p-2 rounded hover:bg-gray-100" title="E-Mail senden"><Mail className="h-4 w-4 text-gray-500" /></button>
            <button className="p-2 rounded hover:bg-gray-100" title="Drucken"><Printer className="h-4 w-4 text-gray-500" /></button>
            <button className="p-2 rounded hover:bg-gray-100" title="Weitere Optionen"><MoreHorizontal className="h-4 w-4 text-gray-500" /></button>
          </div>

          {/* Dates */}
          <div className="px-4 py-3 border-b text-xs text-gray-500 space-y-0.5">
            <p>erstellt am {formatDate(selectedBeleg.datum)}</p>
          </div>

          {/* Details */}
          <div className="px-4 py-3 border-b">
            <h3 className="text-xs font-bold text-gray-900 mb-3">{selectedBeleg.typLabel}</h3>
            <div className="space-y-2">
              <DetailRow label="Belegnummer" value={selectedBeleg.nummer} />
              <DetailRow label="Belegdatum" value={formatDate(selectedBeleg.datum)} />
              <DetailRow label="Kontakt" value={selectedBeleg.kontakt} isLink />
              {selectedBeleg.faellig && (
                <DetailRow
                  label={selectedBeleg.typ === "angebot" ? "Gültig bis" : "Fällig am"}
                  value={formatDate(selectedBeleg.faellig)}
                />
              )}
              <DetailRow label="Betrag" value={formatCurrency(selectedBeleg.betrag)} bold />
            </div>
          </div>

          {/* Status */}
          <div className="px-4 py-3 border-b">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Status</h3>
            <span className={`text-sm font-medium ${selectedBeleg.statusColor}`}>{selectedBeleg.statusLabel}</span>
          </div>

          {/* Beleglink */}
          <div className="px-4 py-3 border-b">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Beleglink</h3>
            {getBelegLink(selectedBeleg) ? (
              <div className="flex items-center gap-2">
                <Link href={getBelegLink(selectedBeleg)!} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />Link öffnen
                </Link>
                <button
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  onClick={() => navigator.clipboard.writeText(window.location.origin + getBelegLink(selectedBeleg)!)}
                >
                  <Copy className="h-3 w-3" />Kopieren
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Kein Link verfügbar</p>
            )}
          </div>

          {/* Tags */}
          <div className="px-4 py-3 border-b">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Tags</h3>
            <Input placeholder="Tag suchen oder erfassen" className="h-7 text-xs" />
          </div>

          {/* Kommentare */}
          <div className="px-4 py-3">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Kommentare</h3>
            <Textarea placeholder="Kommentar eingeben" className="text-xs" rows={2} />
          </div>
        </div>
      ) : (
        <div className="w-80 shrink-0 border-l bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Beleg auswählen,<br />um Details zu sehen</p>
          </div>
        </div>
      )}

      {/* ── Dialogs ───────────────────────────── */}
      {/* Neuer Beleg Auswahl */}
      <Dialog open={neuBelegOpen} onOpenChange={setNeuBelegOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Neuen Beleg erfassen</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            <button onClick={() => { setNeuBelegOpen(false); setRechnungDialogOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><ArrowUpFromLine className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium text-gray-900">Rechnung</p><p className="text-xs text-gray-500">Aus bestehendem Auftrag</p></div>
            </button>
            <button onClick={() => { setNeuBelegOpen(false); setAngebotDialogOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600"><FileCheck className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium text-gray-900">Angebot</p><p className="text-xs text-gray-500">Neues Angebot erstellen</p></div>
            </button>
            <button onClick={() => { setNeuBelegOpen(false); setEingangDialogOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600"><ArrowDownToLine className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium text-gray-900">Eingangsrechnung</p><p className="text-xs text-gray-500">Rechnung von Lieferant</p></div>
            </button>
            <button onClick={() => { setNeuBelegOpen(false); setLieferscheinDialogOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><Package className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium text-gray-900">Lieferschein</p><p className="text-xs text-gray-500">Neuen Lieferschein anlegen</p></div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Eingangsrechnung */}
      <Dialog open={eingangDialogOpen} onOpenChange={setEingangDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Eingangsrechnung</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateEingang} className="space-y-4">
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lieferant *</label>
              <NativeSelect name="vendorId" required>
                <option value="">Lieferant wählen...</option>
                {vendors.map((v: any) => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer *</label>
              <Input name="referenceNo" required placeholder="z.B. RE-2024-001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label><Input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fällig am</label><Input name="dueDate" type="date" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bruttobetrag (€) *</label><Input name="grossAmount" type="number" step="0.01" required defaultValue="0" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label><Textarea name="notes" rows={2} /></div>
            <Button type="submit" className="w-full">Anlegen</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Angebot */}
      <Dialog open={angebotDialogOpen} onOpenChange={setAngebotDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neues Angebot</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateAngebot} className="space-y-4">
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
              <NativeSelect name="customerId" required>
                <option value="">Kunde wählen...</option>
                {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.type === "GESCHAEFT" && c.company ? c.company : `${c.firstName} ${c.lastName}`}</option>))}
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projekt (optional)</label>
              <NativeSelect name="projectId"><option value="">Kein Projekt</option>{projects.map((p: any) => (<option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>))}</NativeSelect>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Gültig bis (optional)</label><Input name="validUntil" type="date" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label><Textarea name="notes" rows={2} /></div>
            <Button type="submit" className="w-full">Angebot anlegen</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rechnung */}
      <Dialog open={rechnungDialogOpen} onOpenChange={setRechnungDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechnung aus Auftrag erstellen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRechnung} className="space-y-4">
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            {ordersWithoutInvoice.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Aufträge ohne Rechnung vorhanden.</p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auftrag *</label>
                  <NativeSelect name="orderId" required>
                    <option value="">Auftrag wählen...</option>
                    {ordersWithoutInvoice.map((o: any) => (<option key={o.id} value={o.id}>{o.orderNumber} – {o.customerName} – {formatCurrency(o.grossTotal)}</option>))}
                  </NativeSelect>
                </div>
                <Button type="submit" className="w-full">Rechnung erstellen</Button>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Lieferschein */}
      <Dialog open={lieferscheinDialogOpen} onOpenChange={setLieferscheinDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuer Lieferschein</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateLieferschein} className="space-y-4">
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
              <NativeSelect name="customerId" required><option value="">Kunde wählen...</option>{customers.map((c: any) => (<option key={c.id} value={c.id}>{c.type === "GESCHAEFT" && c.company ? c.company : `${c.firstName} ${c.lastName}`}</option>))}</NativeSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projekt (optional)</label>
              <NativeSelect name="projectId"><option value="">Kein Projekt</option>{projects.map((p: any) => (<option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>))}</NativeSelect>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Datum</label><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label><Textarea name="notes" rows={2} /></div>
            <Button type="submit" className="w-full">Anlegen</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Helper Components ──────────────────────────────── */
function DetailRow({ label, value, bold, isLink }: { label: string; value: string; bold?: boolean; isLink?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs text-gray-500 shrink-0">{label}</p>
      <p className={`text-xs text-right ${bold ? "font-bold text-gray-900" : isLink ? "text-blue-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
