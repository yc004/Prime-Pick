import { app, protocol, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname$1, "../public");
let win;
let pythonProcess = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);
function splitDelimited(value) {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
  if (typeof value === "string") return value.split(";").map((v) => v.trim()).filter((v) => v.length > 0);
  return [];
}
function toNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}
function normalizeMetricsRecord(record) {
  const sharpnessScore = toNumber(record?.sharpness?.score ?? record?.sharpness_score, 0);
  const isBlurry = toBool(record?.sharpness?.is_blurry ?? record?.is_blurry, false);
  const exposureScore = toNumber(record?.exposure?.score ?? record?.exposure_score, 0);
  const exposureFlags = Array.isArray(record?.exposure?.flags) ? record.exposure.flags.map((v) => String(v)) : splitDelimited(record?.exposure_flags);
  const reasons = Array.isArray(record?.reasons) ? record.reasons.map((v) => String(v)) : splitDelimited(record?.reasons);
  return {
    filename: String(record?.filename ?? ""),
    sharpness: { score: sharpnessScore, is_blurry: isBlurry },
    exposure: { score: exposureScore, flags: exposureFlags },
    technical_score: toNumber(record?.technical_score, 0),
    is_unusable: toBool(record?.is_unusable, false),
    reasons
  };
}
function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = values[j] ?? "";
    rows.push(row);
  }
  return rows;
}
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(process.env.VITE_PUBLIC, "logo.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.cjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: "hidden",
    // Custom title bar
    autoHideMenuBar: true,
    backgroundColor: "#020617"
    // Match design system
  });
  ipcMain.on("window-minimize", () => win?.minimize());
  ipcMain.on("window-maximize", () => {
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.on("window-close", () => win?.close());
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    if (pythonProcess) {
      pythonProcess.kill();
    }
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(() => {
  protocol.registerFileProtocol("media", (request, callback) => {
    try {
      const url = request.url.replace(/^media:\/\//, "");
      const decoded = decodeURIComponent(url);
      callback({ path: decoded });
    } catch (e) {
      callback({ error: -324 });
    }
  });
  createWindow();
  setupIpc();
});
function setupIpc() {
  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
  ipcMain.handle("read-results", async (_, dirPath) => {
    const jsonPath = path.join(dirPath, "results.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const data = fs.readFileSync(jsonPath, "utf-8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed.map(normalizeMetricsRecord);
        return parsed;
      } catch (e) {
        console.error("Failed to read results.json", e);
        return null;
      }
    }
    const csvPath = path.join(dirPath, "results.csv");
    if (fs.existsSync(csvPath)) {
      try {
        const data = fs.readFileSync(csvPath, "utf-8");
        const parsed = parseCsv(data);
        return parsed.map(normalizeMetricsRecord);
      } catch (e) {
        console.error("Failed to read results.csv", e);
        return null;
      }
    }
    return null;
  });
  ipcMain.on("start-compute", (event, args) => {
    if (pythonProcess) {
      pythonProcess.kill();
    }
    const { inputDir, profile, config, rebuildCache } = args;
    const configPath = path.join(app.getPath("userData"), "temp_config.json");
    fs.writeFileSync(configPath, JSON.stringify(config));
    const projectRoot = path.resolve(__dirname$1, "../../");
    const scriptPath = path.join(projectRoot, "photo_selector/cli.py");
    console.log("Spawning python:", scriptPath, "in", projectRoot);
    const cliArgs = [
      scriptPath,
      "compute",
      "--input-dir",
      inputDir,
      "--profile",
      profile,
      "--config-json",
      configPath
    ];
    if (rebuildCache) cliArgs.push("--rebuild-cache");
    pythonProcess = spawn("python", cliArgs, {
      cwd: projectRoot,
      env: { ...process.env, PYTHONPATH: projectRoot }
    });
    pythonProcess.stdout?.on("data", (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          event.reply("compute-progress", json);
        } catch (e) {
          console.log("Python stdout:", line);
        }
      }
    });
    pythonProcess.stderr?.on("data", (data) => {
      console.error(`Python stderr: ${data}`);
    });
    pythonProcess.on("close", (code) => {
      event.reply("compute-done", code);
      pythonProcess = null;
    });
  });
  ipcMain.on("cancel-compute", () => {
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
    }
  });
  ipcMain.on("write-xmp", (event, args) => {
    const { inputDir, selection, config, onlySelected } = args;
    const selectionPath = path.join(app.getPath("userData"), "temp_selection.json");
    fs.writeFileSync(selectionPath, JSON.stringify(selection));
    const configPath = path.join(app.getPath("userData"), "temp_config.json");
    fs.writeFileSync(configPath, JSON.stringify(config));
    const projectRoot = path.resolve(__dirname$1, "../../");
    const scriptPath = path.join(projectRoot, "photo_selector/cli.py");
    const cliArgs = [
      scriptPath,
      "write-xmp",
      "--input-dir",
      inputDir,
      "--selection-file",
      selectionPath,
      "--config-json",
      configPath
    ];
    if (onlySelected) cliArgs.push("--only-selected");
    const child = spawn("python", cliArgs, {
      cwd: projectRoot,
      env: { ...process.env, PYTHONPATH: projectRoot }
    });
    child.stdout?.on("data", (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          event.reply("write-xmp-progress", json);
        } catch (e) {
        }
      }
    });
    child.on("close", (code) => {
      event.reply("write-xmp-done", code);
    });
  });
}
