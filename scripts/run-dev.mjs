#!/usr/bin/env node
/**
 * Startet Next.js Dev-Server mit --webpack (nicht Turbopack).
 * Behebt ChunkLoadError bei Projektpfaden mit Leerzeichen.
 * WICHTIG: Immer "npm run dev" verwenden – nie "next dev" direkt.
 */
import { spawn } from "node:child_process";
import { existsSync, symlinkSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");
const symlinkPath = "/tmp/individuelle-handwerker-software";

// Symlink erstellen falls Projektpfad Leerzeichen enthält
if (projectDir.includes(" ") && !existsSync(symlinkPath)) {
  try {
    symlinkSync(projectDir, symlinkPath, "dir");
  } catch {}
}

// Bei Leerzeichen im Pfad: .next löschen – verhindert gemischten Webpack/Turbopack-Cache
if (projectDir.includes(" ") && !process.env.DEV_SKIP_CLEAN) {
  const nextDir = join(projectDir, ".next");
  if (existsSync(nextDir)) {
    try {
      rmSync(nextDir, { recursive: true });
      console.log("Cache (.next) gelöscht – sauberer Start.\n");
    } catch {}
  }
}

// Immer aus Symlink starten (Pfad ohne Leerzeichen) – verhindert ChunkLoadError
const cwd = projectDir.includes(" ") && existsSync(symlinkPath) ? symlinkPath : projectDir;
// Next-Binary direkt aufrufen mit --webpack (umgeht npx/Cursor-Override)
const nextBin = join(projectDir, "node_modules", "next", "dist", "bin", "next");
const args = ["dev", "--webpack", "--hostname", "localhost", "--port", "3000"];
const env = { ...process.env, WATCHPACK_WATCHER_LIMIT: "20" };

console.log("Next.js mit Webpack (Turbopack deaktiviert – behebt ChunkLoadError)\n");

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd,
  stdio: "inherit",
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));
