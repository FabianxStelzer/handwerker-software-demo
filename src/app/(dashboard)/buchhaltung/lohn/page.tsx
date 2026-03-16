"use client";

import { useEffect, useState } from "react";
import { Banknote, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function LohnPage() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/buchhaltung/lohn")
      .then((r) => r.json())
      .then(setPayslips)
      .catch(() => setPayslips([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lohn</h1>
        <p className="text-sm text-gray-500 mt-1">Gehaltsabrechnungen verwalten</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gehaltsabrechnungen</CardTitle>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Banknote className="h-8 w-8" />
                </div>
              </div>
              <p className="text-sm text-gray-500">Noch keine Gehaltsabrechnungen hinterlegt</p>
              <p className="text-xs text-gray-400 mt-1">
                Gehaltsabrechnungen können bei den Mitarbeitern unter Mitarbeiter → [Name] → Dokumente hochgeladen werden.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Mitarbeiter</th>
                    <th className="px-4 py-3">Monat</th>
                    <th className="px-4 py-3">Jahr</th>
                    <th className="px-4 py-3">Datei</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {p.user?.firstName} {p.user?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{MONTHS[p.month - 1]}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.year}</td>
                      <td className="px-4 py-3">
                        {p.fileUrl ? (
                          <a
                            href={p.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            {p.fileName}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
