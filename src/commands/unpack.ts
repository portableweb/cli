import { Command } from "commander";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

export const unpackCommand = new Command("unpack")
  .description("Unpack a .pweb bundle into a directory")
  .argument("<file>", ".pweb file to unpack")
  .option("-o, --output <dir>", "output directory (default: <bundle-name> in current directory)")
  .action(async (file: string, options: { output?: string }) => {
    const filePath = path.resolve(file);

    if (!fs.existsSync(filePath)) {
      console.error(`Error: file not found: ${filePath}`);
      process.exit(1);
    }

    const basename = path.basename(file, path.extname(file));
    const outDir = options.output
      ? path.resolve(options.output)
      : path.join(process.cwd(), basename);

    if (fs.existsSync(outDir)) {
      console.error(`Error: output directory already exists: ${outDir}`);
      console.error("Use -o to specify a different output path.");
      process.exit(1);
    }

    const data = fs.readFileSync(filePath);
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(data);
    } catch {
      console.error("Error: file is not a valid .pweb bundle (not a ZIP archive)");
      process.exit(1);
    }

    fs.mkdirSync(outDir, { recursive: true });

    const entries = Object.values(zip.files);
    for (const entry of entries) {
      const entryPath = path.join(outDir, entry.name);

      // Prevent path traversal
      if (!entryPath.startsWith(outDir + path.sep) && entryPath !== outDir) {
        console.error(`Error: suspicious entry path skipped: ${entry.name}`);
        continue;
      }

      if (entry.dir) {
        fs.mkdirSync(entryPath, { recursive: true });
      } else {
        const dir = path.dirname(entryPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const content = await entry.async("nodebuffer");
        fs.writeFileSync(entryPath, content);
      }
    }

    console.log(`Unpacked: ${filePath}`);
    console.log(`      to: ${outDir}`);
  });
