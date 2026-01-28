import { app as d, protocol as F, BrowserWindow as T, ipcMain as h, dialog as N } from "electron";
import l from "path";
import { fileURLToPath as v } from "url";
import { spawn as b } from "child_process";
import y from "fs";
const S = l.dirname(v(import.meta.url));
process.env.DIST = l.join(S, "../dist");
process.env.VITE_PUBLIC = d.isPackaged ? process.env.DIST : l.join(S, "../public");
let m, u = null;
const A = process.env.VITE_DEV_SERVER_URL;
F.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      standard: !0,
      secure: !0,
      supportFetchAPI: !0,
      corsEnabled: !0,
      stream: !0
    }
  }
]);
function I(e) {
  return Array.isArray(e) ? e.map((t) => String(t)).filter((t) => t.trim().length > 0) : typeof e == "string" ? e.split(";").map((t) => t.trim()).filter((t) => t.length > 0) : [];
}
function P(e, t = 0) {
  const o = typeof e == "number" ? e : Number(e);
  return Number.isFinite(o) ? o : t;
}
function D(e, t = !1) {
  if (typeof e == "boolean") return e;
  if (typeof e == "string") {
    const o = e.trim().toLowerCase();
    if (o === "true") return !0;
    if (o === "false") return !1;
  }
  return typeof e == "number" ? e !== 0 : t;
}
function R(e) {
  const t = P(e?.sharpness?.score ?? e?.sharpness_score, 0), o = D(e?.sharpness?.is_blurry ?? e?.is_blurry, !1), a = P(e?.exposure?.score ?? e?.exposure_score, 0), s = Array.isArray(e?.exposure?.flags) ? e.exposure.flags.map((c) => String(c)) : I(e?.exposure_flags), n = Array.isArray(e?.reasons) ? e.reasons.map((c) => String(c)) : I(e?.reasons);
  return {
    filename: String(e?.filename ?? ""),
    sharpness: { score: t, is_blurry: o },
    exposure: { score: a, flags: s },
    technical_score: P(e?.technical_score, 0),
    is_unusable: D(e?.is_unusable, !1),
    reasons: n
  };
}
function O(e) {
  const t = e.split(/\r?\n/).filter((n) => n.trim().length > 0);
  if (t.length === 0) return [];
  const o = (n) => {
    const c = [];
    let r = "", i = !1;
    for (let f = 0; f < n.length; f++) {
      const p = n[f];
      if (p === '"') {
        const w = n[f + 1];
        i && w === '"' ? (r += '"', f += 1) : i = !i;
        continue;
      }
      if (p === "," && !i) {
        c.push(r), r = "";
        continue;
      }
      r += p;
    }
    return c.push(r), c;
  }, a = o(t[0]).map((n) => n.trim()), s = [];
  for (let n = 1; n < t.length; n++) {
    const c = o(t[n]), r = {};
    for (let i = 0; i < a.length; i++) r[a[i]] = c[i] ?? "";
    s.push(r);
  }
  return s;
}
function E() {
  m = new T({
    width: 1400,
    height: 900,
    icon: l.join(process.env.VITE_PUBLIC, "logo.svg"),
    webPreferences: {
      preload: l.join(S, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "hidden",
    // Custom title bar
    autoHideMenuBar: !0,
    backgroundColor: "#020617"
    // Match design system
  }), h.on("window-minimize", () => m?.minimize()), h.on("window-maximize", () => {
    m?.isMaximized() ? m.unmaximize() : m?.maximize();
  }), h.on("window-close", () => m?.close()), A ? m.loadURL(A) : m.loadFile(l.join(process.env.DIST, "index.html"));
}
d.on("window-all-closed", () => {
  process.platform !== "darwin" && (d.quit(), u && u.kill());
});
d.on("activate", () => {
  T.getAllWindows().length === 0 && E();
});
d.whenReady().then(() => {
  F.registerFileProtocol("media", (e, t) => {
    try {
      const o = e.url.replace(/^media:\/\//, ""), a = decodeURIComponent(o);
      t({ path: a });
    } catch {
      t({ error: -324 });
    }
  }), E(), L();
});
function L() {
  h.handle("select-directory", async () => {
    const e = await N.showOpenDialog(m, {
      properties: ["openDirectory"]
    });
    return e.canceled ? null : e.filePaths[0];
  }), h.handle("read-results", async (e, t) => {
    const o = l.join(t, "results.json");
    if (y.existsSync(o))
      try {
        const s = y.readFileSync(o, "utf-8"), n = JSON.parse(s);
        return Array.isArray(n) ? n.map(R) : n;
      } catch (s) {
        return console.error("Failed to read results.json", s), null;
      }
    const a = l.join(t, "results.csv");
    if (y.existsSync(a))
      try {
        const s = y.readFileSync(a, "utf-8");
        return O(s).map(R);
      } catch (s) {
        return console.error("Failed to read results.csv", s), null;
      }
    return null;
  }), h.on("start-compute", (e, t) => {
    u && u.kill();
    const { inputDir: o, profile: a, config: s, rebuildCache: n } = t, c = l.join(d.getPath("userData"), "temp_config.json");
    y.writeFileSync(c, JSON.stringify(s));
    const r = l.resolve(S, "../../"), i = l.join(r, "photo_selector/cli.py");
    console.log("Spawning python:", i, "in", r);
    const f = [
      i,
      "compute",
      "--input-dir",
      o,
      "--profile",
      a,
      "--config-json",
      c
    ];
    n && f.push("--rebuild-cache"), u = b("python", f, {
      cwd: r,
      env: { ...process.env, PYTHONPATH: r }
    }), u.stdout?.on("data", (p) => {
      const w = p.toString().split(`
`);
      for (const g of w)
        if (g.trim())
          try {
            const j = JSON.parse(g);
            e.reply("compute-progress", j);
          } catch {
            console.log("Python stdout:", g);
          }
    }), u.stderr?.on("data", (p) => {
      console.error(`Python stderr: ${p}`);
    }), u.on("close", (p) => {
      e.reply("compute-done", p), u = null;
    });
  }), h.on("cancel-compute", () => {
    u && (u.kill(), u = null);
  }), h.on("write-xmp", (e, t) => {
    const { inputDir: o, selection: a, config: s, onlySelected: n } = t, c = l.join(d.getPath("userData"), "temp_selection.json");
    y.writeFileSync(c, JSON.stringify(a));
    const r = l.join(d.getPath("userData"), "temp_config.json");
    y.writeFileSync(r, JSON.stringify(s));
    const i = l.resolve(S, "../../"), p = [
      l.join(i, "photo_selector/cli.py"),
      "write-xmp",
      "--input-dir",
      o,
      "--selection-file",
      c,
      "--config-json",
      r
    ];
    n && p.push("--only-selected");
    const w = b("python", p, {
      cwd: i,
      env: { ...process.env, PYTHONPATH: i }
    });
    w.stdout?.on("data", (g) => {
      const j = g.toString().split(`
`);
      for (const _ of j)
        if (_.trim())
          try {
            const x = JSON.parse(_);
            e.reply("write-xmp-progress", x);
          } catch {
          }
    }), w.on("close", (g) => {
      e.reply("write-xmp-done", g);
    });
  });
}
