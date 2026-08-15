import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const sourceRoots = ["app", "build", "db", "examples", "lib", "scripts", "tests", "worker"];
const checkedExtensions = new Set([".css", ".js", ".mjs", ".sh", ".ts", ".tsx"]);

async function sourceFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relativePath);
    return checkedExtensions.has(path.extname(entry.name)) ? [relativePath] : [];
  }));
  return nested.flat();
}

test("source files stay below the 500-line module limit", async () => {
  const files = (await Promise.all(sourceRoots.map(sourceFiles))).flat();
  const oversized = [];
  for (const file of files) {
    const contents = await readFile(path.join(root, file), "utf8");
    const lines = contents.split(/\r?\n/).length;
    if (lines > 500) oversized.push(`${file} (${lines} lines)`);
  }
  assert.deepEqual(oversized, []);
});

test("shared UI primitives remain the only overlay and status implementations", async () => {
  const files = (await sourceFiles("app")).filter((file) => /\.(tsx|ts)$/.test(file));
  const sources = await Promise.all(files.map(async (file) => ({
    file,
    contents: await readFile(path.join(root, file), "utf8"),
  })));
  const combined = sources.map(({ contents }) => contents).join("\n");

  assert.equal((combined.match(/role="dialog"/g) || []).length, 1, "dialogs must use the shared Modal");
  assert.equal((combined.match(/function ConnectionStatus\(/g) || []).length, 1);
  assert.equal((combined.match(/function Notification\(/g) || []).length, 1);
  assert.equal(combined.includes("window.confirm"), false, "confirmations must use the shared Modal");
  assert.equal(combined.includes("keeper-sync"), false, "connection status must not be reimplemented");
});
