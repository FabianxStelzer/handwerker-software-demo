#!/usr/bin/env node
/**
 * Erstellt Symlink /tmp/individuelle-handwerker-software -> Projekt
 * Behebt ChunkLoadError bei Turbopack (Pfad mit Leerzeichen)
 */
import { symlinkSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");
const symlinkPath = "/tmp/individuelle-handwerker-software";

if (!existsSync(symlinkPath)) {
  try {
    symlinkSync(projectDir, symlinkPath, "dir");
  } catch {
    // Symlink existiert evtl. bereits oder Berechtigung fehlt
  }
}
