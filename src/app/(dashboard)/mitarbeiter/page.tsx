"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  BAULEITER: "Bauleiter",
  MITARBEITER: "Mitarbeiter",
};

export default function MitarbeiterPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mitarbeiter").then((r) => r.json()).then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/mitarbeiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setDialogOpen(false);
    const res = await fetch("/api/mitarbeiter");
    setUsers(await res.json());
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitarbeiter</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} Mitarbeiter</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Neuer Mitarbeiter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuer Mitarbeiter</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <Input name="firstName" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <Input name="lastName" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <Input name="email" type="email" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
                <Input name="password" type="password" defaultValue="changeme123" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                  <NativeSelect name="role" defaultValue="MITARBEITER">
                    <option value="ADMIN">Administrator</option>
                    <option value="BAULEITER">Bauleiter</option>
                    <option value="MITARBEITER">Mitarbeiter</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <Input name="position" placeholder="z.B. Dachdecker" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <Input name="phone" />
              </div>
              <Button type="submit" className="w-full">Mitarbeiter anlegen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Link key={user.id} href={`/mitarbeiter/${user.id}`}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer ${!user.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-500">{user.position || "–"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {roleLabels[user.role] || user.role}
                      </Badge>
                      {!user.isActive && <Badge variant="destructive">Deaktiviert</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
