import { Command } from "commander";
import readline from "readline";
import fs from "fs";
import path from "path";

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function prompt(rl: readline.Interface, label: string, defaultValue?: string): Promise<string> {
  const hint = defaultValue ? ` (${defaultValue})` : "";
  const answer = await ask(rl, `  ${label}${hint}: `);
  return answer || defaultValue || "";
}

async function promptRequired(rl: readline.Interface, label: string): Promise<string> {
  while (true) {
    const answer = await ask(rl, `  ${label}: `);
    if (answer) return answer;
    console.log(`    ${label} is required.`);
  }
}

async function promptSelect(rl: readline.Interface, label: string, choices: { label: string; value: string }[], defaultIndex = 0): Promise<string> {
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

async function promptYesNo(rl: readline.Interface, label: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await ask(rl, `  ${label} [${hint}]: `);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

function deriveId(title: string, authorName: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "bundle";
  const author = authorName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "example";
  return `com.${author}.${slug}`;
}

function generateHTML(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(title)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1>${escapeHTML(title)}</h1>
    <p>Edit <code>index.html</code>, <code>style.css</code>, and <code>script.js</code> to build your bundle.</p>
    <button id="btn">Click me</button>
    <p id="output"></p>
  </main>
  <script src="script.js"></script>
</body>
</html>
`;
}

function generateCSS(): string {
  return `*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, sans-serif;
  background: #fff;
  color: #111;
}

@media (prefers-color-scheme: dark) {
  body { background: #111; color: #eee; }
  button { background: #333; color: #eee; border-color: #555; }
}

main {
  max-width: 640px;
  margin: 0 auto;
}

h1 { font-size: 2rem; margin-bottom: 1rem; }

button {
  padding: 0.5rem 1.25rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
}

button:hover { background: #e8e8e8; }
`;
}

function generateJS(): string {
  return `(function () {
  var btn = document.getElementById("btn");
  var output = document.getElementById("output");
  var count = 0;

  btn.addEventListener("click", function () {
    count += 1;
    output.textContent = "Clicked " + count + " time" + (count === 1 ? "" : "s") + ".";
  });
})();
`;
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const initCommand = new Command("init")
  .description("Scaffold a new .pweb project")
  .argument("[dir]", "target directory (default: current directory)")
  .action(async (dir?: string) => {
    const targetDir = dir ? path.resolve(dir) : process.cwd();

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(path.join(targetDir, "manifest.json"))) {
      console.error("Error: manifest.json already exists. Run 'pweb pack' to build.");
      process.exit(1);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    try {
      console.log("\nInitializing a new PortableWeb bundle\n");

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

      rl.close();

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

      fs.writeFileSync(path.join(targetDir, "mimetype"), "application/vnd.portableweb+zip");
      fs.writeFileSync(path.join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
      fs.writeFileSync(path.join(targetDir, "index.html"), generateHTML(title));
      fs.writeFileSync(path.join(targetDir, "style.css"), generateCSS());
      fs.writeFileSync(path.join(targetDir, "script.js"), generateJS());

      console.log("\nCreated:");
      ["manifest.json", "mimetype", "index.html", "style.css", "script.js"].forEach((f) =>
        console.log(`  ${path.join(targetDir, f)}`)
      );
      console.log(`\nNext: pweb pack ${dir ?? "."}`);
    } catch (err) {
      rl.close();
      throw err;
    }
  });
