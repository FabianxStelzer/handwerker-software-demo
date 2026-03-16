"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Receipt, FileStack, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export default function BuchhaltungDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/buchhaltung/uebersicht?year=${year}`).then((r) => r.json()),
      fetch("/api/rechnungen/analytics").then((r) => r.json()).catch(() => null),
    ]).then(([o, a]) => {
      setOverview(o);
      setLoading(false);
    });
  }, [year]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buchhaltungs-Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Übersicht Umsatz, Ausgaben und Kennzahlen</p>
        </div>
        <NativeSelect
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="w-32"
        >
          {[year - 2, year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </NativeSelect>
      </div>

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Umsatz (bezahlt)</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(overview.umsatzBezahlt)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Offene Forderungen</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(overview.umsatzOffen)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ausgaben</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(overview.ausgaben)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Gewinn</p>
                  <p className={`text-2xl font-bold mt-1 ${overview.gewinn >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(overview.gewinn)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/buchhaltung/belege">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <FileStack className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Belege</p>
                  <p className="text-sm text-gray-500">Angebote und Rechnungen verwalten</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/buchhaltung/uebersicht">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Buchhaltung</p>
                  <p className="text-sm text-gray-500">Ausgaben erfassen und verwalten</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
