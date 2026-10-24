import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(siteDir, "_site");
const basePath = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");

if (basePath && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) {
  throw new Error(`Unexpected GitHub Pages base path: ${basePath}`);
}

// Publish only the same public files as the original site. Pages manages its
// custom domain separately; do not copy CNAME into temporary preview artifacts.
const publicPaths = [
  "index.html", ".nojekyll", "robots.txt", "sitemap.xml",
  "assets", "research", "talks", "cv",
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir);
for (const path of publicPaths) {
  await cp(join(siteDir, path), join(outputDir, path), { recursive: true });
}

async function prepareDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await prepareDirectory(path);
    } else if (basePath && entry.name.endsWith(".html")) {
      const original = await readFile(path, "utf8");
      const preview = original.replace(
        /(\b(?:href|src|action)\s*=\s*["'])\/(?!\/)/g,
        `$1${basePath}/`,
      );
      await writeFile(path, preview, "utf8");
    }
  }
}

await prepareDirectory(outputDir);
console.log(`Prepared static site for ${basePath || "/"}.`);
