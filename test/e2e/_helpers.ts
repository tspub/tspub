import { cp, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(__dirname, "../fixtures");

export function fixture(name: string) {
  return join(fixturesDir, name);
}

export async function makeTmpCopy(fixtureName: string): Promise<string> {
  const src = fixture(fixtureName);
  const tmp = join(tmpdir(), `tspub-test-${fixtureName}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await cp(src, tmp, {
    recursive: true,
    filter: (s) => !s.includes("/dist"),
  });
  return tmp;
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
