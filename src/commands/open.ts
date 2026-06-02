import { Command } from "commander";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";

// Swift script template for a native WKWebView window on macOS.
// Entry path, read-access directory, title, width, height are passed
// as command-line arguments to avoid any string-escaping issues.
const SWIFT_VIEWER = `
import AppKit
import WebKit

class PWebDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!

    func applicationDidFinishLaunching(_ n: Notification) {
        let args = CommandLine.arguments
        let entryURL  = URL(fileURLWithPath: args[1])
        let accessURL = URL(fileURLWithPath: args[2])
        let title     = args[3]
        let w         = Double(args[4]) ?? 960
        let h         = Double(args[5]) ?? 720

        let config = WKWebViewConfiguration()
        let wv = WKWebView(frame: NSRect(x: 0, y: 0, width: w, height: h), configuration: config)
        wv.navigationDelegate = self
        wv.loadFileURL(entryURL, allowingReadAccessTo: accessURL)

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: w, height: h),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = title
        window.contentView = wv
        window.setContentSize(NSSize(width: w, height: h))
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }

    func webView(_ wv: WKWebView, didFinish navigation: WKNavigation!) {
        // Update window title once the page title is available
        wv.evaluateJavaScript("document.title") { result, _ in
            if let pageTitle = result as? String, !pageTitle.isEmpty {
                DispatchQueue.main.async { self.window.title = pageTitle }
            }
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = PWebDelegate()
app.delegate = delegate
app.run()
`;

async function extractToTemp(filePath: string): Promise<string> {
  const data = fs.readFileSync(filePath);
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    console.error("Error: file is not a valid .pweb bundle (not a ZIP archive)");
    process.exit(1);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pweb-open-"));

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    const entryPath = path.join(tempDir, entry.name);
    if (!entryPath.startsWith(tempDir + path.sep) && entryPath !== tempDir) continue;
    if (entry.dir) {
      fs.mkdirSync(entryPath, { recursive: true });
    } else {
      const dir = path.dirname(entryPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(entryPath, await entry.async("nodebuffer"));
    }
  }

  return tempDir;
}

function readManifest(tempDir: string): { title: string; entry: string; width: number; height: number } {
  const defaults = { title: "PortableWeb", entry: "index.html", width: 960, height: 720 };
  const manifestPath = path.join(tempDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return defaults;
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return {
      title: m.title ?? defaults.title,
      entry: m.entry ?? defaults.entry,
      width: m.viewport?.preferred_width ?? defaults.width,
      height: m.viewport?.preferred_height ?? defaults.height,
    };
  } catch {
    return defaults;
  }
}

function openMacOS(entryPath: string, tempDir: string, title: string, width: number, height: number): void {
  // Write the Swift viewer script to a temp file
  const scriptPath = path.join(os.tmpdir(), `pweb-viewer-${process.pid}.swift`);
  fs.writeFileSync(scriptPath, SWIFT_VIEWER);

  console.log(`Opening: ${title}`);
  console.log("(first launch may take a few seconds while Swift compiles the viewer)");

  const result = spawnSync(
    "swift",
    [scriptPath, entryPath, tempDir, title, String(width), String(height)],
    { stdio: "inherit" }
  );

  // Clean up regardless of outcome
  try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error("Error: swift not found. Install Xcode Command Line Tools:");
      console.error("  xcode-select --install");
    } else {
      console.error(`Error launching viewer: ${result.error.message}`);
    }
    process.exit(1);
  }
}

export const openCommand = new Command("open")
  .description("Open a .pweb bundle in the OS native webview")
  .argument("<file>", ".pweb file to open")
  .action(async (file: string) => {
    const filePath = path.resolve(file);

    if (!fs.existsSync(filePath)) {
      console.error(`Error: file not found: ${filePath}`);
      process.exit(1);
    }

    const tempDir = await extractToTemp(filePath);
    const { title, entry, width, height } = readManifest(tempDir);
    const entryPath = path.join(tempDir, entry);

    if (!fs.existsSync(entryPath)) {
      console.error(`Error: entry file not found in bundle: ${entry}`);
      fs.rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }

    switch (process.platform) {
      case "darwin":
        openMacOS(entryPath, tempDir, title, width, height);
        break;
      default:
        console.error(`Error: 'open' is not yet supported on ${process.platform}.`);
        console.error("Contributions welcome at https://github.com/portableweb/cli");
        fs.rmSync(tempDir, { recursive: true, force: true });
        process.exit(1);
    }
  });
