import { Command } from "commander";
import readline from "readline";
import fs from "fs";
import path from "path";
import { promptForManifest } from "../prompts";

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

      const { manifest, title } = await promptForManifest(rl);

      rl.close();

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
