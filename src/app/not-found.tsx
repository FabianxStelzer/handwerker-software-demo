import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Seite nicht gefunden</h1>
        <p className="mt-2 text-gray-600">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Zum Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  );
}
