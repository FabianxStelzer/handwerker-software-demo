import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PruefungPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: objektId } = await params;

  return (
    <div className="space-y-4">
      <Link href={`/branchenspezifisch/schlosser/${objektId}`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
      </Link>
      <Card className="p-12 text-center text-gray-400">
        Kein Element ausgewählt. Bitte wählen Sie ein Element aus der Objektansicht.
      </Card>
    </div>
  );
}
