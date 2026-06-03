import { Command } from "commander";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import readline from "readline";
import { loadAndValidateManifest } from "./validate";
import { promptForManifest } from "../prompts";

export const packCommand = new Command("pack")
  .description("Pack a source directory into a .pweb bundle")
  .argument("[source]", "source directory containing manifest.json and entry HTML (default: current directory)")
  .option("-o, --output <file>", "output .pweb file path")
  .action(async (source: string | undefined, options: { output?: string }) => {
    const sourceDir = source ? path.resolve(source) : process.cwd();

    if (!fs.existsSync(sourceDir)) {
      console.error(`Error: source directory not found: ${sourceDir}`);
      process.exit(1);
    }

    const manifestPath = path.join(sourceDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      console.log("\nNo manifest.json found — let's generate one.\n");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      let generated: { manifest: Record<string, unknown> };
      try {
        generated = await promptForManifest(rl);
      } finally {
        rl.close();
      }
      fs.writeFileSync(manifestPath, JSON.stringify(generated!.manifest, null, 2) + "\n");
      console.log(`\nGenerated: ${manifestPath}\n`);
    }

    const { manifest, errors } = loadAndValidateManifest(manifestPath);
    if (errors.length > 0) {
      console.error("Error: invalid manifest.json:");
      errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }

    const outputPath = options.output ?? path.join(process.cwd(), `${manifest!.title.replace(/\s+/g, "-").toLowerCase()}.pweb`);

    await packBundle(sourceDir, outputPath);
    console.log(`Packed: ${outputPath}`);
  });

async function packBundle(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    // mimetype must be first entry, uncompressed, no extra fields (EPUB convention)
    const mimetypePath = path.join(sourceDir, "mimetype");
    if (fs.existsSync(mimetypePath)) {
      archive.append(fs.createReadStream(mimetypePath), {
        name: "mimetype",
        store: true, // uncompressed
      });
    } else {
      archive.append("application/vnd.portableweb+zip", {
        name: "mimetype",
        store: true,
      });
    }

    // Add all other files except mimetype
    archive.glob("**/*", {
      cwd: sourceDir,
      ignore: ["mimetype"],
    });

    archive.finalize();
  });
}
