import readline from "readline";

export function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

export async function prompt(rl: readline.Interface, label: string, defaultValue?: string): Promise<string> {
  const hint = defaultValue ? ` (${defaultValue})` : "";
  const answer = await ask(rl, `  ${label}${hint}: `);
  return answer || defaultValue || "";
}

export async function promptRequired(rl: readline.Interface, label: string): Promise<string> {
  while (true) {
    const answer = await ask(rl, `  ${label}: `);
    if (answer) return answer;
    console.log(`    ${label} is required.`);
  }
}

export async function promptSelect(
  rl: readline.Interface,
  label: string,
  choices: { label: string; value: string }[],
  defaultIndex = 0
): Promise<string> {
  console.log(`  ${label}:`);
  choices.forEach((c, i) => console.log(`    ${i + 1}. ${c.label}`));
  while (true) {
    const answer = await ask(rl, `  Select [${defaultIndex + 1}]: `);
    if (!answer) return choices[defaultIndex].value;
    const n = parseInt(answer, 10);
    if (!isNaN(n) && n >= 1 && n <= choices.length) return choices[n - 1].value;
    console.log(`    Enter a number between 1 and ${choices.length}.`);
  }
}

export async function promptYesNo(rl: readline.Interface, label: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await ask(rl, `  ${label} [${hint}]: `);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

export function deriveId(title: string, authorName: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "bundle";
  const author = authorName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "example";
  return `com.${author}.${slug}`;
}

export interface ManifestAnswers {
  manifest: Record<string, unknown>;
  title: string;
}

export async function promptForManifest(rl: readline.Interface): Promise<ManifestAnswers> {
  const title = await promptRequired(rl, "Title");
  const description = await prompt(rl, "Description");
  const authorName = await prompt(rl, "Author name");
  const authorUrl = await prompt(rl, "Author URL");
  const defaultId = deriveId(title, authorName);
  const id = await prompt(rl, "Bundle ID", defaultId);
  const version = await prompt(rl, "Version", "1.0.0");

  const licenseChoice = await promptSelect(rl, "License", [
    { label: "MIT", value: "MIT" },
    { label: "CC0 (Public Domain)", value: "CC0-1.0" },
    { label: "CC BY 4.0", value: "CC-BY-4.0" },
    { label: "All Rights Reserved", value: "All Rights Reserved" },
  ]);

  const enableStorage = await promptYesNo(rl, "Enable isolated storage?", true);
  const enableFullscreen = await promptYesNo(rl, "Enable fullscreen?", true);

  const manifest: Record<string, unknown> = {
    spec_version: "0.1",
    id,
    version,
    title,
    entry: "index.html",
    created: new Date().toISOString(),
    permissions: {
      network: false,
      camera: false,
      microphone: false,
      storage: enableStorage ? "isolated" : false,
      fullscreen: enableFullscreen,
    },
    viewport: {
      preferred_width: 960,
      preferred_height: 720,
      resizable: true,
      min_width: 480,
      min_height: 360,
    },
  };

  if (description) manifest.description = description;

  if (authorName || authorUrl) {
    const author: Record<string, string> = {};
    if (authorName) author.name = authorName;
    if (authorUrl) author.url = authorUrl;
    manifest.author = author;
  }

  manifest.rights = {
    copyright: `© ${new Date().getFullYear()}${authorName ? " " + authorName : ""}`.trim(),
    license: licenseChoice,
  };

  return { manifest, title };
}
