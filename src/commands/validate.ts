import { Command } from "commander";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

export interface PwebManifest {
  spec_version: string;
  id: string;
  version: string;
  title: string;
  entry: string;
  description?: string;
  author?: string;
  created?: string;
  icon?: string;
  permissions?: string[];
  rights?: string;
  viewport?: string;
}

export const validateCommand = new Command("validate")
  .description("Validate a .pweb bundle against the spec")
  .argument("<file>", ".pweb file to validate")
  .action(async (file: string) => {
    const filePath = path.resolve(file);

    if (!fs.existsSync(filePath)) {
      console.error(`Error: file not found: ${filePath}`);
      process.exit(1);
    }

    const errors = await validateBundle(filePath);

    if (errors.length === 0) {
      console.log(`Valid: ${filePath}`);
    } else {
      console.error(`Invalid: ${filePath}`);
      errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }
  });

async function validateBundle(filePath: string): Promise<string[]> {
  const errors: string[] = [];
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  // Check mimetype entry exists
  const mimetypeFile = zip.file("mimetype");
  if (!mimetypeFile) {
    errors.push("missing required file: mimetype");
  } else {
    const mimetype = await mimetypeFile.async("string");
    if (mimetype.trim() !== "application/vnd.portableweb+zip") {
      errors.push(`mimetype must be "application/vnd.portableweb+zip", got "${mimetype.trim()}"`);
    }
  }

  // Check manifest.json exists and is valid
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    errors.push("missing required file: manifest.json");
    return errors;
  }

  let manifest: Partial<PwebManifest>;
  try {
    const raw = await manifestFile.async("string");
    manifest = JSON.parse(raw);
  } catch {
    errors.push("manifest.json is not valid JSON");
    return errors;
  }

  const required: (keyof PwebManifest)[] = ["spec_version", "id", "version", "title", "entry"];
  for (const field of required) {
    if (!manifest[field]) {
      errors.push(`manifest.json missing required field: ${field}`);
    }
  }

  // Validate id is reverse-domain format
  if (manifest.id && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(manifest.id)) {
    errors.push(`manifest.json "id" should be reverse-domain format (e.g. org.portableweb.hello)`);
  }

  // Check entry file exists in bundle
  if (manifest.entry && !zip.file(manifest.entry)) {
    errors.push(`entry file not found in bundle: ${manifest.entry}`);
  }

  return errors;
}

export function loadAndValidateManifest(manifestPath: string): { manifest: PwebManifest | null; errors: string[] } {
  const errors: string[] = [];
  let manifest: Partial<PwebManifest>;

  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    return { manifest: null, errors: ["manifest.json is not valid JSON"] };
  }

  const required: (keyof PwebManifest)[] = ["spec_version", "id", "version", "title", "entry"];
  for (const field of required) {
    if (!manifest[field]) {
      errors.push(`missing required field: ${field}`);
    }
  }

  if (errors.length > 0) return { manifest: null, errors };
  return { manifest: manifest as PwebManifest, errors: [] };
}
