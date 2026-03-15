"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Lock, Zap, Paintbrush, HardHat, Droplets, Thermometer, Trees, Hammer } from "lucide-react";

const branchen = [
  {
    name: "Schlosser",
    href: "/branchenspezifisch/schlosser",
    icon: Lock,
    description: "Metallbau, Schweißarbeiten, Tore, Geländer, Schlösser & Sicherheitstechnik",
    color: "bg-slate-600",
    available: true,
  },
  {
    name: "Elektriker",
    href: "/branchenspezifisch/elektriker",
    icon: Zap,
    description: "Elektroinstallation, Smart Home, Photovoltaik & Netzwerktechnik",
    color: "bg-yellow-600",
    available: false,
  },
  {
    name: "Maler",
    href: "/branchenspezifisch/maler",
    icon: Paintbrush,
    description: "Innen- & Außenanstrich, Tapezierarbeiten, Fassadengestaltung",
    color: "bg-pink-600",
    available: false,
  },
  {
    name: "Maurer",
    href: "/branchenspezifisch/maurer",
    icon: HardHat,
    description: "Mauerwerk, Betonarbeiten, Rohbau & Sanierung",
    color: "bg-orange-600",
    available: false,
  },
  {
    name: "Sanitär",
    href: "/branchenspezifisch/sanitaer",
    icon: Droplets,
    description: "Sanitärinstallation, Badsanierung, Rohrleitungsbau",
    color: "bg-blue-600",
    available: false,
  },
  {
    name: "Heizung & Klima",
    href: "/branchenspezifisch/heizung",
    icon: Thermometer,
    description: "Heizungsanlagen, Wärmepumpen, Klimatechnik & Wartung",
    color: "bg-red-600",
    available: false,
  },
  {
    name: "Garten- & Landschaftsbau",
    href: "/branchenspezifisch/gala",
    icon: Trees,
    description: "Gartengestaltung, Pflasterarbeiten, Zaunbau & Begrünung",
    color: "bg-green-600",
    available: false,
  },
  {
    name: "Zimmerer",
    href: "/branchenspezifisch/zimmerer",
    icon: Hammer,
    description: "Dachkonstruktion, Holzbau, Carports & Innenausbau",
    color: "bg-amber-700",
    available: false,
  },
];

export default function BranchenspezifischPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Branchenspezifisch</h1>
        <p className="mt-1 text-gray-500">
          Spezialisierte Werkzeuge, Vorlagen und Berechnungen für deine Branche
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {branchen.map((branche) => {
          const content = (
            <Card
              key={branche.name}
              className={`relative overflow-hidden p-5 transition-all ${
                branche.available
                  ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                  : "opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${branche.color} text-white`}
                >
                  <branche.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{branche.name}</h3>
                    {!branche.available && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                        Demnächst
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{branche.description}</p>
                </div>
              </div>
            </Card>
          );

          if (branche.available) {
            return (
              <Link key={branche.name} href={branche.href}>
                {content}
              </Link>
            );
          }
          return <div key={branche.name}>{content}</div>;
        })}
      </div>
    </div>
  );
}
