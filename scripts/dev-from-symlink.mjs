#!/usr/bin/env node
/**
 * Startet den Dev-Server aus einem Pfad ohne Leerzeichen (Symlink),
 * um ChunkLoadError bei Projektpfaden mit Leerzeichen zu vermeiden.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");
const symlinkPath = "/tmp/individuelle-handwerker-software";

// Symlink erstellen falls nicht vorhanden
if (!existsSync(symlinkPath)) {
  try {
    const { symlinkSync } = await import("node:fs");
    symlinkSync(projectDir, symlinkPath, "dir");
  } catch (err) {
    console.warn("Symlink konnte nicht erstellt werden, starte aus Projektpfad mit --webpack");
  }
}

const cwd = existsSync(symlinkPath) ? symlinkPath : projectDir;
const env = { ...process.env, WATCHPACK_WATCHER_LIMIT: "20" };

const child = spawn("npx", ["next", "dev", "--webpack", "--hostname", "localhost"], {
  cwd,
  env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
