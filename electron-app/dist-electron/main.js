import He, { app as L, protocol as le, BrowserWindow as Te, ipcMain as P, dialog as ue, nativeImage as fe } from "electron";
import g from "path";
import { fileURLToPath as Ge } from "url";
import Qe, { spawn as Ye } from "child_process";
import w from "fs";
import N from "os";
import Ze from "util";
import ke from "events";
import Xe from "http";
import Ke from "https";
import et from "crypto";
function tt(a) {
  return a && a.__esModule && Object.prototype.hasOwnProperty.call(a, "default") ? a.default : a;
}
var I, he;
function rt() {
  if (he) return I;
  he = 1;
  const a = w, l = g;
  I = {
    findAndReadPackageJson: s,
    tryReadJsonAt: i
  };
  function s() {
    return i(e()) || i(n()) || i(process.resourcesPath, "app.asar") || i(process.resourcesPath, "app") || i(process.cwd()) || { name: void 0, version: void 0 };
  }
  function i(...r) {
    if (r[0])
      try {
        const o = l.join(...r), c = t("package.json", o);
        if (!c)
          return;
        const u = JSON.parse(a.readFileSync(c, "utf8")), p = u?.productName || u?.name;
        return !p || p.toLowerCase() === "electron" ? void 0 : p ? { name: p, version: u?.version } : void 0;
      } catch {
        return;
      }
  }
  function t(r, o) {
    let c = o;
    for (; ; ) {
      const u = l.parse(c), p = u.root, f = u.dir;
      if (a.existsSync(l.join(c, r)))
        return l.resolve(l.join(c, r));
      if (c === p)
        return null;
      c = f;
    }
  }
  function n() {
    const r = process.argv.filter((c) => c.indexOf("--user-data-dir=") === 0);
    return r.length === 0 || typeof r[0] != "string" ? null : r[0].replace("--user-data-dir=", "");
  }
  function e() {
    try {
      return require.main?.filename;
    } catch {
      return;
    }
  }
  return I;
}
var q, de;
function nt() {
  if (de) return q;
  de = 1;
  const a = Qe, l = N, s = g, i = rt();
  class t {
    appName = void 0;
    appPackageJson = void 0;
    platform = process.platform;
    getAppLogPath(e = this.getAppName()) {
      return this.platform === "darwin" ? s.join(this.getSystemPathHome(), "Library/Logs", e) : s.join(this.getAppUserDataPath(e), "logs");
    }
    getAppName() {
      const e = this.appName || this.getAppPackageJson()?.name;
      if (!e)
        throw new Error(
          "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
        );
      return e;
    }
    /**
     * @private
     * @returns {undefined}
     */
    getAppPackageJson() {
      return typeof this.appPackageJson != "object" && (this.appPackageJson = i.findAndReadPackageJson()), this.appPackageJson;
    }
    getAppUserDataPath(e = this.getAppName()) {
      return e ? s.join(this.getSystemPathAppData(), e) : void 0;
    }
    getAppVersion() {
      return this.getAppPackageJson()?.version;
    }
    getElectronLogPath() {
      return this.getAppLogPath();
    }
    getMacOsVersion() {
      const e = Number(l.release().split(".")[0]);
      return e <= 19 ? `10.${e - 4}` : e - 9;
    }
    /**
     * @protected
     * @returns {string}
     */
    getOsVersion() {
      let e = l.type().replace("_", " "), r = l.release();
      return e === "Darwin" && (e = "macOS", r = this.getMacOsVersion()), `${e} ${r}`;
    }
    /**
     * @return {PathVariables}
     */
    getPathVariables() {
      const e = this.getAppName(), r = this.getAppVersion(), o = this;
      return {
        appData: this.getSystemPathAppData(),
        appName: e,
        appVersion: r,
        get electronDefaultDir() {
          return o.getElectronLogPath();
        },
        home: this.getSystemPathHome(),
        libraryDefaultDir: this.getAppLogPath(e),
        libraryTemplate: this.getAppLogPath("{appName}"),
        temp: this.getSystemPathTemp(),
        userData: this.getAppUserDataPath(e)
      };
    }
    getSystemPathAppData() {
      const e = this.getSystemPathHome();
      switch (this.platform) {
        case "darwin":
          return s.join(e, "Library/Application Support");
        case "win32":
          return process.env.APPDATA || s.join(e, "AppData/Roaming");
        default:
          return process.env.XDG_CONFIG_HOME || s.join(e, ".config");
      }
    }
    getSystemPathHome() {
      return l.homedir?.() || process.env.HOME;
    }
    getSystemPathTemp() {
      return l.tmpdir();
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: void 0,
        os: this.getOsVersion()
      };
    }
    isDev() {
      return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
    }
    isElectron() {
      return !!process.versions.electron;
    }
    onAppEvent(e, r) {
    }
    onAppReady(e) {
      e();
    }
    onEveryWebContentsEvent(e, r) {
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(e, r) {
    }
    onIpcInvoke(e, r) {
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(e, r = console.error) {
      const c = { darwin: "open", win32: "start", linux: "xdg-open" }[process.platform] || "xdg-open";
      a.exec(`${c} ${e}`, {}, (u) => {
        u && r(u);
      });
    }
    setAppName(e) {
      this.appName = e;
    }
    setPlatform(e) {
      this.platform = e;
    }
    setPreloadFileForSessions({
      filePath: e,
      // eslint-disable-line no-unused-vars
      includeFutureSession: r = !0,
      // eslint-disable-line no-unused-vars
      getSessions: o = () => []
      // eslint-disable-line no-unused-vars
    }) {
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(e, r) {
    }
    showErrorBox(e, r) {
    }
  }
  return q = t, q;
}
var M, ge;
function st() {
  if (ge) return M;
  ge = 1;
  const a = g, l = nt();
  class s extends l {
    /**
     * @type {typeof Electron}
     */
    electron = void 0;
    /**
     * @param {object} options
     * @param {typeof Electron} [options.electron]
     */
    constructor({ electron: t } = {}) {
      super(), this.electron = t;
    }
    getAppName() {
      let t;
      try {
        t = this.appName || this.electron.app?.name || this.electron.app?.getName();
      } catch {
      }
      return t || super.getAppName();
    }
    getAppUserDataPath(t) {
      return this.getPath("userData") || super.getAppUserDataPath(t);
    }
    getAppVersion() {
      let t;
      try {
        t = this.electron.app?.getVersion();
      } catch {
      }
      return t || super.getAppVersion();
    }
    getElectronLogPath() {
      return this.getPath("logs") || super.getElectronLogPath();
    }
    /**
     * @private
     * @param {any} name
     * @returns {string|undefined}
     */
    getPath(t) {
      try {
        return this.electron.app?.getPath(t);
      } catch {
        return;
      }
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: `Electron ${process.versions.electron}`,
        os: this.getOsVersion()
      };
    }
    getSystemPathAppData() {
      return this.getPath("appData") || super.getSystemPathAppData();
    }
    isDev() {
      return this.electron.app?.isPackaged !== void 0 ? !this.electron.app.isPackaged : typeof process.execPath == "string" ? a.basename(process.execPath).toLowerCase().startsWith("electron") : super.isDev();
    }
    onAppEvent(t, n) {
      return this.electron.app?.on(t, n), () => {
        this.electron.app?.off(t, n);
      };
    }
    onAppReady(t) {
      this.electron.app?.isReady() ? t() : this.electron.app?.once ? this.electron.app?.once("ready", t) : t();
    }
    onEveryWebContentsEvent(t, n) {
      return this.electron.webContents?.getAllWebContents()?.forEach((r) => {
        r.on(t, n);
      }), this.electron.app?.on("web-contents-created", e), () => {
        this.electron.webContents?.getAllWebContents().forEach((r) => {
          r.off(t, n);
        }), this.electron.app?.off("web-contents-created", e);
      };
      function e(r, o) {
        o.on(t, n);
      }
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(t, n) {
      this.electron.ipcMain?.on(t, n);
    }
    onIpcInvoke(t, n) {
      this.electron.ipcMain?.handle?.(t, n);
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(t, n = console.error) {
      this.electron.shell?.openExternal(t).catch(n);
    }
    setPreloadFileForSessions({
      filePath: t,
      includeFutureSession: n = !0,
      getSessions: e = () => [this.electron.session?.defaultSession]
    }) {
      for (const o of e().filter(Boolean))
        r(o);
      n && this.onAppEvent("session-created", (o) => {
        r(o);
      });
      function r(o) {
        typeof o.registerPreloadScript == "function" ? o.registerPreloadScript({
          filePath: t,
          id: "electron-log-preload",
          type: "frame"
        }) : o.setPreloads([...o.getPreloads(), t]);
      }
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(t, n) {
      this.electron.BrowserWindow?.getAllWindows()?.forEach((e) => {
        e.webContents?.isDestroyed() === !1 && e.webContents?.isCrashed() === !1 && e.webContents.send(t, n);
      });
    }
    showErrorBox(t, n) {
      this.electron.dialog?.showErrorBox(t, n);
    }
  }
  return M = s, M;
}
var z = { exports: {} }, me;
function ot() {
  return me || (me = 1, (function(a) {
    let l = {};
    try {
      l = require("electron");
    } catch {
    }
    l.ipcRenderer && s(l), a.exports = s;
    function s({ contextBridge: i, ipcRenderer: t }) {
      if (!t)
        return;
      t.on("__ELECTRON_LOG_IPC__", (e, r) => {
        window.postMessage({ cmd: "message", ...r });
      }), t.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
      )));
      const n = {
        sendToMain(e) {
          try {
            t.send("__ELECTRON_LOG__", e);
          } catch (r) {
            console.error("electronLog.sendToMain ", r, "data:", e), t.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: r?.message, stack: r?.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...e) {
          n.sendToMain({ data: e, level: "info" });
        }
      };
      for (const e of ["error", "warn", "info", "verbose", "debug", "silly"])
        n[e] = (...r) => n.sendToMain({
          data: r,
          level: e
        });
      if (i && process.contextIsolated)
        try {
          i.exposeInMainWorld("__electronLog", n);
        } catch {
        }
      typeof window == "object" ? window.__electronLog = n : __electronLog = n;
    }
  })(z)), z.exports;
}
var T, ye;
function it() {
  if (ye) return T;
  ye = 1;
  const a = w, l = N, s = g, i = ot();
  let t = !1, n = !1;
  T = {
    initialize({
      externalApi: o,
      getSessions: c,
      includeFutureSession: u,
      logger: p,
      preload: f = !0,
      spyRendererConsole: h = !1
    }) {
      o.onAppReady(() => {
        try {
          f && e({
            externalApi: o,
            getSessions: c,
            includeFutureSession: u,
            logger: p,
            preloadOption: f
          }), h && r({ externalApi: o, logger: p });
        } catch (b) {
          p.warn(b);
        }
      });
    }
  };
  function e({
    externalApi: o,
    getSessions: c,
    includeFutureSession: u,
    logger: p,
    preloadOption: f
  }) {
    let h = typeof f == "string" ? f : void 0;
    if (t) {
      p.warn(new Error("log.initialize({ preload }) already called").stack);
      return;
    }
    t = !0;
    try {
      h = s.resolve(
        __dirname,
        "../renderer/electron-log-preload.js"
      );
    } catch {
    }
    if (!h || !a.existsSync(h)) {
      h = s.join(
        o.getAppUserDataPath() || l.tmpdir(),
        "electron-log-preload.js"
      );
      const b = `
      try {
        (${i.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
      a.writeFileSync(h, b, "utf8");
    }
    o.setPreloadFileForSessions({
      filePath: h,
      includeFutureSession: u,
      getSessions: c
    });
  }
  function r({ externalApi: o, logger: c }) {
    if (n) {
      c.warn(
        new Error("log.initialize({ spyRendererConsole }) already called").stack
      );
      return;
    }
    n = !0;
    const u = ["debug", "info", "warn", "error"];
    o.onEveryWebContentsEvent(
      "console-message",
      (p, f, h) => {
        c.processMessage({
          data: [h],
          level: u[f],
          variables: { processType: "renderer" }
        });
      }
    );
  }
  return T;
}
var k, be;
function at() {
  if (be) return k;
  be = 1, k = a;
  function a(l) {
    return Object.defineProperties(s, {
      defaultLabel: { value: "", writable: !0 },
      labelPadding: { value: !0, writable: !0 },
      maxLabelLength: { value: 0, writable: !0 },
      labelLength: {
        get() {
          switch (typeof s.labelPadding) {
            case "boolean":
              return s.labelPadding ? s.maxLabelLength : 0;
            case "number":
              return s.labelPadding;
            default:
              return 0;
          }
        }
      }
    });
    function s(i) {
      s.maxLabelLength = Math.max(s.maxLabelLength, i.length);
      const t = {};
      for (const n of l.levels)
        t[n] = (...e) => l.logData(e, { level: n, scope: i });
      return t.log = t.info, t;
    }
  }
  return k;
}
var W, ve;
function ct() {
  if (ve) return W;
  ve = 1;
  class a {
    constructor({ processMessage: s }) {
      this.processMessage = s, this.buffer = [], this.enabled = !1, this.begin = this.begin.bind(this), this.commit = this.commit.bind(this), this.reject = this.reject.bind(this);
    }
    addMessage(s) {
      this.buffer.push(s);
    }
    begin() {
      this.enabled = [];
    }
    commit() {
      this.enabled = !1, this.buffer.forEach((s) => this.processMessage(s)), this.buffer = [];
    }
    reject() {
      this.enabled = !1, this.buffer = [];
    }
  }
  return W = a, W;
}
var U, we;
function lt() {
  if (we) return U;
  we = 1;
  const a = at(), l = ct();
  class s {
    static instances = {};
    dependencies = {};
    errorHandler = null;
    eventLogger = null;
    functions = {};
    hooks = [];
    isDev = !1;
    levels = null;
    logId = null;
    scope = null;
    transports = {};
    variables = {};
    constructor({
      allowUnknownLevel: t = !1,
      dependencies: n = {},
      errorHandler: e,
      eventLogger: r,
      initializeFn: o,
      isDev: c = !1,
      levels: u = ["error", "warn", "info", "verbose", "debug", "silly"],
      logId: p,
      transportFactories: f = {},
      variables: h
    } = {}) {
      this.addLevel = this.addLevel.bind(this), this.create = this.create.bind(this), this.initialize = this.initialize.bind(this), this.logData = this.logData.bind(this), this.processMessage = this.processMessage.bind(this), this.allowUnknownLevel = t, this.buffering = new l(this), this.dependencies = n, this.initializeFn = o, this.isDev = c, this.levels = u, this.logId = p, this.scope = a(this), this.transportFactories = f, this.variables = h || {};
      for (const b of this.levels)
        this.addLevel(b, !1);
      this.log = this.info, this.functions.log = this.log, this.errorHandler = e, e?.setOptions({ ...n, logFn: this.error }), this.eventLogger = r, r?.setOptions({ ...n, logger: this });
      for (const [b, m] of Object.entries(f))
        this.transports[b] = m(this, n);
      s.instances[p] = this;
    }
    static getInstance({ logId: t }) {
      return this.instances[t] || this.instances.default;
    }
    addLevel(t, n = this.levels.length) {
      n !== !1 && this.levels.splice(n, 0, t), this[t] = (...e) => this.logData(e, { level: t }), this.functions[t] = this[t];
    }
    catchErrors(t) {
      return this.processMessage(
        {
          data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
          level: "warn"
        },
        { transports: ["console"] }
      ), this.errorHandler.startCatching(t);
    }
    create(t) {
      return typeof t == "string" && (t = { logId: t }), new s({
        dependencies: this.dependencies,
        errorHandler: this.errorHandler,
        initializeFn: this.initializeFn,
        isDev: this.isDev,
        transportFactories: this.transportFactories,
        variables: { ...this.variables },
        ...t
      });
    }
    compareLevels(t, n, e = this.levels) {
      const r = e.indexOf(t), o = e.indexOf(n);
      return o === -1 || r === -1 ? !0 : o <= r;
    }
    initialize(t = {}) {
      this.initializeFn({ logger: this, ...this.dependencies, ...t });
    }
    logData(t, n = {}) {
      this.buffering.enabled ? this.buffering.addMessage({ data: t, date: /* @__PURE__ */ new Date(), ...n }) : this.processMessage({ data: t, ...n });
    }
    processMessage(t, { transports: n = this.transports } = {}) {
      if (t.cmd === "errorHandler") {
        this.errorHandler.handle(t.error, {
          errorName: t.errorName,
          processType: "renderer",
          showDialog: !!t.showDialog
        });
        return;
      }
      let e = t.level;
      this.allowUnknownLevel || (e = this.levels.includes(t.level) ? t.level : "info");
      const r = {
        date: /* @__PURE__ */ new Date(),
        logId: this.logId,
        ...t,
        level: e,
        variables: {
          ...this.variables,
          ...t.variables
        }
      };
      for (const [o, c] of this.transportEntries(n))
        if (!(typeof c != "function" || c.level === !1) && this.compareLevels(c.level, t.level))
          try {
            const u = this.hooks.reduce((p, f) => p && f(p, c, o), r);
            u && c({ ...u, data: [...u.data] });
          } catch (u) {
            this.processInternalErrorFn(u);
          }
    }
    processInternalErrorFn(t) {
    }
    transportEntries(t = this.transports) {
      return (Array.isArray(t) ? t : Object.entries(t)).map((e) => {
        switch (typeof e) {
          case "string":
            return this.transports[e] ? [e, this.transports[e]] : null;
          case "function":
            return [e.name, e];
          default:
            return Array.isArray(e) ? e : null;
        }
      }).filter(Boolean);
    }
  }
  return U = s, U;
}
var J, Se;
function ut() {
  if (Se) return J;
  Se = 1;
  class a {
    externalApi = void 0;
    isActive = !1;
    logFn = void 0;
    onError = void 0;
    showDialog = !0;
    constructor({
      externalApi: i,
      logFn: t = void 0,
      onError: n = void 0,
      showDialog: e = void 0
    } = {}) {
      this.createIssue = this.createIssue.bind(this), this.handleError = this.handleError.bind(this), this.handleRejection = this.handleRejection.bind(this), this.setOptions({ externalApi: i, logFn: t, onError: n, showDialog: e }), this.startCatching = this.startCatching.bind(this), this.stopCatching = this.stopCatching.bind(this);
    }
    handle(i, {
      logFn: t = this.logFn,
      onError: n = this.onError,
      processType: e = "browser",
      showDialog: r = this.showDialog,
      errorName: o = ""
    } = {}) {
      i = l(i);
      try {
        if (typeof n == "function") {
          const c = this.externalApi?.getVersions() || {}, u = this.createIssue;
          if (n({
            createIssue: u,
            error: i,
            errorName: o,
            processType: e,
            versions: c
          }) === !1)
            return;
        }
        o ? t(o, i) : t(i), r && !o.includes("rejection") && this.externalApi && this.externalApi.showErrorBox(
          `A JavaScript error occurred in the ${e} process`,
          i.stack
        );
      } catch {
        console.error(i);
      }
    }
    setOptions({ externalApi: i, logFn: t, onError: n, showDialog: e }) {
      typeof i == "object" && (this.externalApi = i), typeof t == "function" && (this.logFn = t), typeof n == "function" && (this.onError = n), typeof e == "boolean" && (this.showDialog = e);
    }
    startCatching({ onError: i, showDialog: t } = {}) {
      this.isActive || (this.isActive = !0, this.setOptions({ onError: i, showDialog: t }), process.on("uncaughtException", this.handleError), process.on("unhandledRejection", this.handleRejection));
    }
    stopCatching() {
      this.isActive = !1, process.removeListener("uncaughtException", this.handleError), process.removeListener("unhandledRejection", this.handleRejection);
    }
    createIssue(i, t) {
      this.externalApi?.openUrl(
        `${i}?${new URLSearchParams(t).toString()}`
      );
    }
    handleError(i) {
      this.handle(i, { errorName: "Unhandled" });
    }
    handleRejection(i) {
      const t = i instanceof Error ? i : new Error(JSON.stringify(i));
      this.handle(t, { errorName: "Unhandled rejection" });
    }
  }
  function l(s) {
    if (s instanceof Error)
      return s;
    if (s && typeof s == "object") {
      if (s.message)
        return Object.assign(new Error(s.message), s);
      try {
        return new Error(JSON.stringify(s));
      } catch (i) {
        return new Error(`Couldn't normalize error ${String(s)}: ${i}`);
      }
    }
    return new Error(`Can't normalize error ${String(s)}`);
  }
  return J = a, J;
}
var B, Ee;
function pt() {
  if (Ee) return B;
  Ee = 1;
  class a {
    disposers = [];
    format = "{eventSource}#{eventName}:";
    formatters = {
      app: {
        "certificate-error": ({ args: s }) => this.arrayToObject(s.slice(1, 4), [
          "url",
          "error",
          "certificate"
        ]),
        "child-process-gone": ({ args: s }) => s.length === 1 ? s[0] : s,
        "render-process-gone": ({ args: [s, i] }) => i && typeof i == "object" ? { ...i, ...this.getWebContentsDetails(s) } : []
      },
      webContents: {
        "console-message": ({ args: [s, i, t, n] }) => {
          if (!(s < 3))
            return { message: i, source: `${n}:${t}` };
        },
        "did-fail-load": ({ args: s }) => this.arrayToObject(s, [
          "errorCode",
          "errorDescription",
          "validatedURL",
          "isMainFrame",
          "frameProcessId",
          "frameRoutingId"
        ]),
        "did-fail-provisional-load": ({ args: s }) => this.arrayToObject(s, [
          "errorCode",
          "errorDescription",
          "validatedURL",
          "isMainFrame",
          "frameProcessId",
          "frameRoutingId"
        ]),
        "plugin-crashed": ({ args: s }) => this.arrayToObject(s, ["name", "version"]),
        "preload-error": ({ args: s }) => this.arrayToObject(s, ["preloadPath", "error"])
      }
    };
    events = {
      app: {
        "certificate-error": !0,
        "child-process-gone": !0,
        "render-process-gone": !0
      },
      webContents: {
        // 'console-message': true,
        "did-fail-load": !0,
        "did-fail-provisional-load": !0,
        "plugin-crashed": !0,
        "preload-error": !0,
        unresponsive: !0
      }
    };
    externalApi = void 0;
    level = "error";
    scope = "";
    constructor(s = {}) {
      this.setOptions(s);
    }
    setOptions({
      events: s,
      externalApi: i,
      level: t,
      logger: n,
      format: e,
      formatters: r,
      scope: o
    }) {
      typeof s == "object" && (this.events = s), typeof i == "object" && (this.externalApi = i), typeof t == "string" && (this.level = t), typeof n == "object" && (this.logger = n), (typeof e == "string" || typeof e == "function") && (this.format = e), typeof r == "object" && (this.formatters = r), typeof o == "string" && (this.scope = o);
    }
    startLogging(s = {}) {
      this.setOptions(s), this.disposeListeners();
      for (const i of this.getEventNames(this.events.app))
        this.disposers.push(
          this.externalApi.onAppEvent(i, (...t) => {
            this.handleEvent({ eventSource: "app", eventName: i, handlerArgs: t });
          })
        );
      for (const i of this.getEventNames(this.events.webContents))
        this.disposers.push(
          this.externalApi.onEveryWebContentsEvent(
            i,
            (...t) => {
              this.handleEvent(
                { eventSource: "webContents", eventName: i, handlerArgs: t }
              );
            }
          )
        );
    }
    stopLogging() {
      this.disposeListeners();
    }
    arrayToObject(s, i) {
      const t = {};
      return i.forEach((n, e) => {
        t[n] = s[e];
      }), s.length > i.length && (t.unknownArgs = s.slice(i.length)), t;
    }
    disposeListeners() {
      this.disposers.forEach((s) => s()), this.disposers = [];
    }
    formatEventLog({ eventName: s, eventSource: i, handlerArgs: t }) {
      const [n, ...e] = t;
      if (typeof this.format == "function")
        return this.format({ args: e, event: n, eventName: s, eventSource: i });
      const r = this.formatters[i]?.[s];
      let o = e;
      if (typeof r == "function" && (o = r({ args: e, event: n, eventName: s, eventSource: i })), !o)
        return;
      const c = {};
      return Array.isArray(o) ? c.args = o : typeof o == "object" && Object.assign(c, o), i === "webContents" && Object.assign(c, this.getWebContentsDetails(n?.sender)), [this.format.replace("{eventSource}", i === "app" ? "App" : "WebContents").replace("{eventName}", s), c];
    }
    getEventNames(s) {
      return !s || typeof s != "object" ? [] : Object.entries(s).filter(([i, t]) => t).map(([i]) => i);
    }
    getWebContentsDetails(s) {
      if (!s?.loadURL)
        return {};
      try {
        return {
          webContents: {
            id: s.id,
            url: s.getURL()
          }
        };
      } catch {
        return {};
      }
    }
    handleEvent({ eventName: s, eventSource: i, handlerArgs: t }) {
      const n = this.formatEventLog({ eventName: s, eventSource: i, handlerArgs: t });
      n && (this.scope ? this.logger.scope(this.scope) : this.logger)?.[this.level]?.(...n);
    }
  }
  return B = a, B;
}
var V, Ae;
function D() {
  if (Ae) return V;
  Ae = 1, V = { transform: a };
  function a({
    logger: l,
    message: s,
    transport: i,
    initialData: t = s?.data || [],
    transforms: n = i?.transforms
  }) {
    return n.reduce((e, r) => typeof r == "function" ? r({ data: e, logger: l, message: s, transport: i }) : e, t);
  }
  return V;
}
var H, Le;
function We() {
  if (Le) return H;
  Le = 1;
  const { transform: a } = D();
  H = {
    concatFirstStringElements: l,
    formatScope: i,
    formatText: n,
    formatVariables: t,
    timeZoneFromOffset: s,
    format({ message: e, logger: r, transport: o, data: c = e?.data }) {
      switch (typeof o.format) {
        case "string":
          return a({
            message: e,
            logger: r,
            transforms: [t, i, n],
            transport: o,
            initialData: [o.format, ...c]
          });
        case "function":
          return o.format({
            data: c,
            level: e?.level || "info",
            logger: r,
            message: e,
            transport: o
          });
        default:
          return c;
      }
    }
  };
  function l({ data: e }) {
    return typeof e[0] != "string" || typeof e[1] != "string" || e[0].match(/%[1cdfiOos]/) ? e : [`${e[0]} ${e[1]}`, ...e.slice(2)];
  }
  function s(e) {
    const r = Math.abs(e), o = e > 0 ? "-" : "+", c = Math.floor(r / 60).toString().padStart(2, "0"), u = (r % 60).toString().padStart(2, "0");
    return `${o}${c}:${u}`;
  }
  function i({ data: e, logger: r, message: o }) {
    const { defaultLabel: c, labelLength: u } = r?.scope || {}, p = e[0];
    let f = o.scope;
    f || (f = c);
    let h;
    return f === "" ? h = u > 0 ? "".padEnd(u + 3) : "" : typeof f == "string" ? h = ` (${f})`.padEnd(u + 3) : h = "", e[0] = p.replace("{scope}", h), e;
  }
  function t({ data: e, message: r }) {
    let o = e[0];
    if (typeof o != "string")
      return e;
    o = o.replace("{level}]", `${r.level}]`.padEnd(6, " "));
    const c = r.date || /* @__PURE__ */ new Date();
    return e[0] = o.replace(/\{(\w+)}/g, (u, p) => {
      switch (p) {
        case "level":
          return r.level || "info";
        case "logId":
          return r.logId;
        case "y":
          return c.getFullYear().toString(10);
        case "m":
          return (c.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return c.getDate().toString(10).padStart(2, "0");
        case "h":
          return c.getHours().toString(10).padStart(2, "0");
        case "i":
          return c.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return c.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return c.getMilliseconds().toString(10).padStart(3, "0");
        case "z":
          return s(c.getTimezoneOffset());
        case "iso":
          return c.toISOString();
        default:
          return r.variables?.[p] || u;
      }
    }).trim(), e;
  }
  function n({ data: e }) {
    const r = e[0];
    if (typeof r != "string")
      return e;
    if (r.lastIndexOf("{text}") === r.length - 6)
      return e[0] = r.replace(/\s?{text}/, ""), e[0] === "" && e.shift(), e;
    const c = r.split("{text}");
    let u = [];
    return c[0] !== "" && u.push(c[0]), u = u.concat(e.slice(1)), c[1] !== "" && u.push(c[1]), u;
  }
  return H;
}
var G = { exports: {} }, Pe;
function R() {
  return Pe || (Pe = 1, (function(a) {
    const l = Ze;
    a.exports = {
      serialize: i,
      maxDepth({ data: t, transport: n, depth: e = n?.depth ?? 6 }) {
        if (!t)
          return t;
        if (e < 1)
          return Array.isArray(t) ? "[array]" : typeof t == "object" && t ? "[object]" : t;
        if (Array.isArray(t))
          return t.map((o) => a.exports.maxDepth({
            data: o,
            depth: e - 1
          }));
        if (typeof t != "object" || t && typeof t.toISOString == "function")
          return t;
        if (t === null)
          return null;
        if (t instanceof Error)
          return t;
        const r = {};
        for (const o in t)
          Object.prototype.hasOwnProperty.call(t, o) && (r[o] = a.exports.maxDepth({
            data: t[o],
            depth: e - 1
          }));
        return r;
      },
      toJSON({ data: t }) {
        return JSON.parse(JSON.stringify(t, s()));
      },
      toString({ data: t, transport: n }) {
        const e = n?.inspectOptions || {}, r = t.map((o) => {
          if (o !== void 0)
            try {
              const c = JSON.stringify(o, s(), "  ");
              return c === void 0 ? void 0 : JSON.parse(c);
            } catch {
              return o;
            }
        });
        return l.formatWithOptions(e, ...r);
      }
    };
    function s(t = {}) {
      const n = /* @__PURE__ */ new WeakSet();
      return function(e, r) {
        if (typeof r == "object" && r !== null) {
          if (n.has(r))
            return;
          n.add(r);
        }
        return i(e, r, t);
      };
    }
    function i(t, n, e = {}) {
      const r = e?.serializeMapAndSet !== !1;
      return n instanceof Error ? n.stack : n && (typeof n == "function" ? `[function] ${n.toString()}` : n instanceof Date ? n.toISOString() : r && n instanceof Map && Object.fromEntries ? Object.fromEntries(n) : r && n instanceof Set && Array.from ? Array.from(n) : n);
    }
  })(G)), G.exports;
}
var Q, Fe;
function pe() {
  if (Fe) return Q;
  Fe = 1, Q = {
    transformStyles: i,
    applyAnsiStyles({ data: t }) {
      return i(t, l, s);
    },
    removeStyles({ data: t }) {
      return i(t, () => "");
    }
  };
  const a = {
    unset: "\x1B[0m",
    black: "\x1B[30m",
    red: "\x1B[31m",
    green: "\x1B[32m",
    yellow: "\x1B[33m",
    blue: "\x1B[34m",
    magenta: "\x1B[35m",
    cyan: "\x1B[36m",
    white: "\x1B[37m",
    gray: "\x1B[90m"
  };
  function l(t) {
    const n = t.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
    return a[n] || "";
  }
  function s(t) {
    return t + a.unset;
  }
  function i(t, n, e) {
    const r = {};
    return t.reduce((o, c, u, p) => {
      if (r[u])
        return o;
      if (typeof c == "string") {
        let f = u, h = !1;
        c = c.replace(/%[1cdfiOos]/g, (b) => {
          if (f += 1, b !== "%c")
            return b;
          const m = p[f];
          return typeof m == "string" ? (r[f] = !0, h = !0, n(m, c)) : b;
        }), h && e && (c = e(c));
      }
      return o.push(c), o;
    }, []);
  }
  return Q;
}
var Y, xe;
function ft() {
  if (xe) return Y;
  xe = 1;
  const {
    concatFirstStringElements: a,
    format: l
  } = We(), { maxDepth: s, toJSON: i } = R(), {
    applyAnsiStyles: t,
    removeStyles: n
  } = pe(), { transform: e } = D(), r = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  Y = u;
  const c = `%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform === "win32" ? ">" : "›"} {text}`;
  Object.assign(u, {
    DEFAULT_FORMAT: c
  });
  function u(m) {
    return Object.assign(d, {
      colorMap: {
        error: "red",
        warn: "yellow",
        info: "cyan",
        verbose: "unset",
        debug: "gray",
        silly: "gray",
        default: "unset"
      },
      format: c,
      level: "silly",
      transforms: [
        p,
        l,
        h,
        a,
        s,
        i
      ],
      useStyles: process.env.FORCE_STYLES,
      writeFn({ message: E }) {
        (r[E.level] || r.info)(...E.data);
      }
    });
    function d(E) {
      const x = e({ logger: m, message: E, transport: d });
      d.writeFn({
        message: { ...E, data: x }
      });
    }
  }
  function p({ data: m, message: d, transport: E }) {
    return typeof E.format != "string" || !E.format.includes("%c") ? m : [
      `color:${b(d.level, E)}`,
      "color:unset",
      ...m
    ];
  }
  function f(m, d) {
    if (typeof m == "boolean")
      return m;
    const x = d === "error" || d === "warn" ? process.stderr : process.stdout;
    return x && x.isTTY;
  }
  function h(m) {
    const { message: d, transport: E } = m;
    return (f(E.useStyles, d.level) ? t : n)(m);
  }
  function b(m, d) {
    return d.colorMap[m] || d.colorMap.default;
  }
  return Y;
}
var Z, _e;
function Ue() {
  if (_e) return Z;
  _e = 1;
  const a = ke, l = w, s = N;
  class i extends a {
    asyncWriteQueue = [];
    bytesWritten = 0;
    hasActiveAsyncWriting = !1;
    path = null;
    initialSize = void 0;
    writeOptions = null;
    writeAsync = !1;
    constructor({
      path: e,
      writeOptions: r = { encoding: "utf8", flag: "a", mode: 438 },
      writeAsync: o = !1
    }) {
      super(), this.path = e, this.writeOptions = r, this.writeAsync = o;
    }
    get size() {
      return this.getSize();
    }
    clear() {
      try {
        return l.writeFileSync(this.path, "", {
          mode: this.writeOptions.mode,
          flag: "w"
        }), this.reset(), !0;
      } catch (e) {
        return e.code === "ENOENT" ? !0 : (this.emit("error", e, this), !1);
      }
    }
    crop(e) {
      try {
        const r = t(this.path, e || 4096);
        this.clear(), this.writeLine(`[log cropped]${s.EOL}${r}`);
      } catch (r) {
        this.emit(
          "error",
          new Error(`Couldn't crop file ${this.path}. ${r.message}`),
          this
        );
      }
    }
    getSize() {
      if (this.initialSize === void 0)
        try {
          const e = l.statSync(this.path);
          this.initialSize = e.size;
        } catch {
          this.initialSize = 0;
        }
      return this.initialSize + this.bytesWritten;
    }
    increaseBytesWrittenCounter(e) {
      this.bytesWritten += Buffer.byteLength(e, this.writeOptions.encoding);
    }
    isNull() {
      return !1;
    }
    nextAsyncWrite() {
      const e = this;
      if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0)
        return;
      const r = this.asyncWriteQueue.join("");
      this.asyncWriteQueue = [], this.hasActiveAsyncWriting = !0, l.writeFile(this.path, r, this.writeOptions, (o) => {
        e.hasActiveAsyncWriting = !1, o ? e.emit(
          "error",
          new Error(`Couldn't write to ${e.path}. ${o.message}`),
          this
        ) : e.increaseBytesWrittenCounter(r), e.nextAsyncWrite();
      });
    }
    reset() {
      this.initialSize = void 0, this.bytesWritten = 0;
    }
    toString() {
      return this.path;
    }
    writeLine(e) {
      if (e += s.EOL, this.writeAsync) {
        this.asyncWriteQueue.push(e), this.nextAsyncWrite();
        return;
      }
      try {
        l.writeFileSync(this.path, e, this.writeOptions), this.increaseBytesWrittenCounter(e);
      } catch (r) {
        this.emit(
          "error",
          new Error(`Couldn't write to ${this.path}. ${r.message}`),
          this
        );
      }
    }
  }
  Z = i;
  function t(n, e) {
    const r = Buffer.alloc(e), o = l.statSync(n), c = Math.min(o.size, e), u = Math.max(0, o.size - e), p = l.openSync(n, "r"), f = l.readSync(p, r, 0, c, u);
    return l.closeSync(p), r.toString("utf8", 0, f);
  }
  return Z;
}
var X, Oe;
function ht() {
  if (Oe) return X;
  Oe = 1;
  const a = Ue();
  class l extends a {
    clear() {
    }
    crop() {
    }
    getSize() {
      return 0;
    }
    isNull() {
      return !0;
    }
    writeLine() {
    }
  }
  return X = l, X;
}
var K, je;
function dt() {
  if (je) return K;
  je = 1;
  const a = ke, l = w, s = g, i = Ue(), t = ht();
  class n extends a {
    store = {};
    constructor() {
      super(), this.emitError = this.emitError.bind(this);
    }
    /**
     * Provide a File object corresponding to the filePath
     * @param {string} filePath
     * @param {WriteOptions} [writeOptions]
     * @param {boolean} [writeAsync]
     * @return {File}
     */
    provide({ filePath: r, writeOptions: o = {}, writeAsync: c = !1 }) {
      let u;
      try {
        if (r = s.resolve(r), this.store[r])
          return this.store[r];
        u = this.createFile({ filePath: r, writeOptions: o, writeAsync: c });
      } catch (p) {
        u = new t({ path: r }), this.emitError(p, u);
      }
      return u.on("error", this.emitError), this.store[r] = u, u;
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @param {boolean} async
     * @return {File}
     * @private
     */
    createFile({ filePath: r, writeOptions: o, writeAsync: c }) {
      return this.testFileWriting({ filePath: r, writeOptions: o }), new i({ path: r, writeOptions: o, writeAsync: c });
    }
    /**
     * @param {Error} error
     * @param {File} file
     * @private
     */
    emitError(r, o) {
      this.emit("error", r, o);
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @private
     */
    testFileWriting({ filePath: r, writeOptions: o }) {
      l.mkdirSync(s.dirname(r), { recursive: !0 }), l.writeFileSync(r, "", { flag: "a", mode: o.mode });
    }
  }
  return K = n, K;
}
var ee, $e;
function gt() {
  if ($e) return ee;
  $e = 1;
  const a = w, l = N, s = g, i = dt(), { transform: t } = D(), { removeStyles: n } = pe(), {
    format: e,
    concatFirstStringElements: r
  } = We(), { toString: o } = R();
  ee = u;
  const c = new i();
  function u(f, { registry: h = c, externalApi: b } = {}) {
    let m;
    return h.listenerCount("error") < 1 && h.on("error", (v, y) => {
      x(`Can't write to ${y}`, v);
    }), Object.assign(d, {
      fileName: p(f.variables.processType),
      format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
      getFile: C,
      inspectOptions: { depth: 5 },
      level: "silly",
      maxSize: 1024 ** 2,
      readAllLogs: Be,
      sync: !0,
      transforms: [n, e, r, o],
      writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
      archiveLogFn(v) {
        const y = v.toString(), _ = s.parse(y);
        try {
          a.renameSync(y, s.join(_.dir, `${_.name}.old${_.ext}`));
        } catch (O) {
          x("Could not rotate log", O);
          const Ve = Math.round(d.maxSize / 4);
          v.crop(Math.min(Ve, 256 * 1024));
        }
      },
      resolvePathFn(v) {
        return s.join(v.libraryDefaultDir, v.fileName);
      },
      setAppName(v) {
        f.dependencies.externalApi.setAppName(v);
      }
    });
    function d(v) {
      const y = C(v);
      d.maxSize > 0 && y.size > d.maxSize && (d.archiveLogFn(y), y.reset());
      const O = t({ logger: f, message: v, transport: d });
      y.writeLine(O);
    }
    function E() {
      m || (m = Object.create(
        Object.prototype,
        {
          ...Object.getOwnPropertyDescriptors(
            b.getPathVariables()
          ),
          fileName: {
            get() {
              return d.fileName;
            },
            enumerable: !0
          }
        }
      ), typeof d.archiveLog == "function" && (d.archiveLogFn = d.archiveLog, x("archiveLog is deprecated. Use archiveLogFn instead")), typeof d.resolvePath == "function" && (d.resolvePathFn = d.resolvePath, x("resolvePath is deprecated. Use resolvePathFn instead")));
    }
    function x(v, y = null, _ = "error") {
      const O = [`electron-log.transports.file: ${v}`];
      y && O.push(y), f.transports.console({ data: O, date: /* @__PURE__ */ new Date(), level: _ });
    }
    function C(v) {
      E();
      const y = d.resolvePathFn(m, v);
      return h.provide({
        filePath: y,
        writeAsync: !d.sync,
        writeOptions: d.writeOptions
      });
    }
    function Be({ fileFilter: v = (y) => y.endsWith(".log") } = {}) {
      E();
      const y = s.dirname(d.resolvePathFn(m));
      return a.existsSync(y) ? a.readdirSync(y).map((_) => s.join(y, _)).filter(v).map((_) => {
        try {
          return {
            path: _,
            lines: a.readFileSync(_, "utf8").split(l.EOL)
          };
        } catch {
          return null;
        }
      }).filter(Boolean) : [];
    }
  }
  function p(f = process.type) {
    switch (f) {
      case "renderer":
        return "renderer.log";
      case "worker":
        return "worker.log";
      default:
        return "main.log";
    }
  }
  return ee;
}
var te, De;
function mt() {
  if (De) return te;
  De = 1;
  const { maxDepth: a, toJSON: l } = R(), { transform: s } = D();
  te = i;
  function i(t, { externalApi: n }) {
    return Object.assign(e, {
      depth: 3,
      eventId: "__ELECTRON_LOG_IPC__",
      level: t.isDev ? "silly" : !1,
      transforms: [l, a]
    }), n?.isElectron() ? e : void 0;
    function e(r) {
      r?.variables?.processType !== "renderer" && n?.sendIpc(e.eventId, {
        ...r,
        data: s({ logger: t, message: r, transport: e })
      });
    }
  }
  return te;
}
var re, Ne;
function yt() {
  if (Ne) return re;
  Ne = 1;
  const a = Xe, l = Ke, { transform: s } = D(), { removeStyles: i } = pe(), { toJSON: t, maxDepth: n } = R();
  re = e;
  function e(r) {
    return Object.assign(o, {
      client: { name: "electron-application" },
      depth: 6,
      level: !1,
      requestOptions: {},
      transforms: [i, t, n],
      makeBodyFn({ message: c }) {
        return JSON.stringify({
          client: o.client,
          data: c.data,
          date: c.date.getTime(),
          level: c.level,
          scope: c.scope,
          variables: c.variables
        });
      },
      processErrorFn({ error: c }) {
        r.processMessage(
          {
            data: [`electron-log: can't POST ${o.url}`, c],
            level: "warn"
          },
          { transports: ["console", "file"] }
        );
      },
      sendRequestFn({ serverUrl: c, requestOptions: u, body: p }) {
        const h = (c.startsWith("https:") ? l : a).request(c, {
          method: "POST",
          ...u,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": p.length,
            ...u.headers
          }
        });
        return h.write(p), h.end(), h;
      }
    });
    function o(c) {
      if (!o.url)
        return;
      const u = o.makeBodyFn({
        logger: r,
        message: { ...c, data: s({ logger: r, message: c, transport: o }) },
        transport: o
      }), p = o.sendRequestFn({
        serverUrl: o.url,
        requestOptions: o.requestOptions,
        body: Buffer.from(u, "utf8")
      });
      p.on("error", (f) => o.processErrorFn({
        error: f,
        logger: r,
        message: c,
        request: p,
        transport: o
      }));
    }
  }
  return re;
}
var ne, Re;
function bt() {
  if (Re) return ne;
  Re = 1;
  const a = lt(), l = ut(), s = pt(), i = ft(), t = gt(), n = mt(), e = yt();
  ne = r;
  function r({ dependencies: o, initializeFn: c }) {
    const u = new a({
      dependencies: o,
      errorHandler: new l(),
      eventLogger: new s(),
      initializeFn: c,
      isDev: o.externalApi?.isDev(),
      logId: "default",
      transportFactories: {
        console: i,
        file: t,
        ipc: n,
        remote: e
      },
      variables: {
        processType: "main"
      }
    });
    return u.default = u, u.Logger = a, u.processInternalErrorFn = (p) => {
      u.transports.console.writeFn({
        message: {
          data: ["Unhandled electron-log error", p],
          level: "error"
        }
      });
    }, u;
  }
  return ne;
}
var se, Ce;
function vt() {
  if (Ce) return se;
  Ce = 1;
  const a = He, l = st(), { initialize: s } = it(), i = bt(), t = new l({ electron: a }), n = i({
    dependencies: { externalApi: t },
    initializeFn: s
  });
  se = n, t.onIpc("__ELECTRON_LOG__", (r, o) => {
    o.scope && n.Logger.getInstance(o).scope(o.scope);
    const c = new Date(o.date);
    e({
      ...o,
      date: c.getTime() ? c : /* @__PURE__ */ new Date()
    });
  }), t.onIpcInvoke("__ELECTRON_LOG__", (r, { cmd: o = "", logId: c }) => o === "getOptions" ? {
    levels: n.Logger.getInstance({ logId: c }).levels,
    logId: c
  } : (e({ data: [`Unknown cmd '${o}'`], level: "error" }), {}));
  function e(r) {
    n.Logger.getInstance(r)?.processMessage(r);
  }
  return se;
}
var oe, Ie;
function wt() {
  return Ie || (Ie = 1, oe = vt()), oe;
}
var St = wt();
const S = /* @__PURE__ */ tt(St);
S.initialize();
S.errorHandler.startCatching();
S.info("Application starting...");
L.setName("Prime Pick");
const $ = g.dirname(Ge(import.meta.url));
process.env.DIST = g.join($, "../dist");
process.env.VITE_PUBLIC = L.isPackaged ? process.env.DIST : g.join($, "../public");
let F, A = null;
const qe = process.env.VITE_DEV_SERVER_URL;
le.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      standard: !0,
      secure: !0,
      supportFetchAPI: !0,
      corsEnabled: !0,
      stream: !0
    }
  },
  {
    scheme: "thumb",
    privileges: {
      standard: !0,
      secure: !0,
      supportFetchAPI: !0,
      corsEnabled: !0,
      stream: !0
    }
  }
]);
function Me(a) {
  return Array.isArray(a) ? a.map((l) => String(l)).filter((l) => l.trim().length > 0) : typeof a == "string" ? a.split(";").map((l) => l.trim()).filter((l) => l.length > 0) : [];
}
function j(a, l = 0) {
  const s = typeof a == "number" ? a : Number(a);
  return Number.isFinite(s) ? s : l;
}
function ie(a, l = !1) {
  if (typeof a == "boolean") return a;
  if (typeof a == "string") {
    const s = a.trim().toLowerCase();
    if (s === "true") return !0;
    if (s === "false") return !1;
  }
  return typeof a == "number" ? a !== 0 : l;
}
function ze(a) {
  const l = j(a?.sharpness?.score ?? a?.sharpness_score, 0), s = ie(a?.sharpness?.is_blurry ?? a?.is_blurry, !1), i = j(a?.exposure?.score ?? a?.exposure_score, 0), t = Array.isArray(a?.exposure?.flags) ? a.exposure.flags.map((e) => String(e)) : Me(a?.exposure_flags), n = Array.isArray(a?.reasons) ? a.reasons.map((e) => String(e)) : Me(a?.reasons);
  return {
    filename: String(a?.filename ?? ""),
    sharpness: { score: l, is_blurry: s },
    exposure: { score: i, flags: t },
    technical_score: j(a?.technical_score, 0),
    is_unusable: ie(a?.is_unusable, !1),
    reasons: n,
    group_id: j(a?.group_id, -1),
    group_size: j(a?.group_size, 1),
    rank_in_group: j(a?.rank_in_group, 1),
    is_group_best: ie(a?.is_group_best, !1)
  };
}
function Et(a) {
  const l = a.split(/\r?\n/).filter((n) => n.trim().length > 0);
  if (l.length === 0) return [];
  const s = (n) => {
    const e = [];
    let r = "", o = !1;
    for (let c = 0; c < n.length; c++) {
      const u = n[c];
      if (u === '"') {
        const p = n[c + 1];
        o && p === '"' ? (r += '"', c += 1) : o = !o;
        continue;
      }
      if (u === "," && !o) {
        e.push(r), r = "";
        continue;
      }
      r += u;
    }
    return e.push(r), e;
  }, i = s(l[0]).map((n) => n.trim()), t = [];
  for (let n = 1; n < l.length; n++) {
    const e = s(l[n]), r = {};
    for (let o = 0; o < i.length; o++) r[i[o]] = e[o] ?? "";
    t.push(r);
  }
  return t;
}
function Je() {
  const a = L.isPackaged ? g.join(L.getAppPath(), "dist") : g.join($, "../dist"), l = L.isPackaged ? a : g.join($, "../public");
  F = new Te({
    width: 1400,
    height: 900,
    icon: g.join(l, "icon.png"),
    webPreferences: {
      preload: g.join($, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "hidden",
    autoHideMenuBar: !0,
    backgroundColor: "#020617"
  }), F.webContents.on("did-fail-load", (s, i, t, n) => {
    S.error("did-fail-load", { errorCode: i, errorDescription: t, validatedURL: n }), ue.showErrorBox("页面加载失败", `${t} (${i})
${n}`);
  }), F.webContents.on("render-process-gone", (s, i) => {
    S.error("render-process-gone", i), ue.showErrorBox("渲染进程崩溃", `${i.reason} (exitCode=${i.exitCode})`);
  }), F.webContents.on("console-message", (s, i, t, n, e) => {
    i >= 2 && S.error("renderer-console", { level: i, message: t, line: n, sourceId: e });
  }), P.on("window-minimize", () => F?.minimize()), P.on("window-maximize", () => {
    F?.isMaximized() ? F.unmaximize() : F?.maximize();
  }), P.on("window-close", () => F?.close()), qe ? F.loadURL(qe) : F.loadFile(g.join(a, "index.html"));
}
L.on("window-all-closed", () => {
  process.platform !== "darwin" && (L.quit(), A && A.kill());
});
L.on("activate", () => {
  Te.getAllWindows().length === 0 && Je();
});
L.whenReady().then(() => {
  const a = (t, n) => {
    let r = new URL(t).toString();
    const o = `${n}://local/`;
    if (r.startsWith(o))
      r = r.slice(o.length);
    else {
      const f = `${n}://`;
      r.startsWith(f) && (r = r.slice(f.length));
    }
    const c = r.indexOf("?");
    c >= 0 && (r = r.slice(0, c));
    let p = decodeURIComponent(r);
    return process.platform === "win32" && p.startsWith("/") && !p.startsWith("//") && /^\/[a-zA-Z]:/.test(p) && (p = p.slice(1)), p;
  };
  le.registerFileProtocol("media", (t, n) => {
    try {
      let e = t.url;
      S.info("Media request raw:", e), e.startsWith("media://local/") ? e = e.replace(/^media:\/\/local\//, "") : e = e.replace(/^media:\/\//, "");
      let o = decodeURIComponent(e);
      process.platform === "win32" && o.startsWith("/") && !o.startsWith("//") && /^\/[a-zA-Z]:/.test(o) && (o = o.slice(1)), n({ path: o });
    } catch (e) {
      S.error("Media protocol error:", e), n({ error: -324 });
    }
  });
  const l = g.join(L.getPath("userData"), "thumb_cache");
  try {
    w.mkdirSync(l, { recursive: !0 });
  } catch {
  }
  const s = /* @__PURE__ */ new Map(), i = async (t, n, e) => {
    const r = w.statSync(t), o = `${t}|${r.size}|${r.mtimeMs}|w=${n}|q=${e}`, c = et.createHash("sha1").update(o).digest("hex"), u = g.join(l, `${c}.jpg`);
    if (w.existsSync(u)) return u;
    const p = s.get(u);
    if (p) return p;
    const f = (async () => {
      let h = await fe.createThumbnailFromPath(t, { width: n, height: n });
      if (h.isEmpty() && (h = fe.createFromPath(t).resize({ width: n, height: n })), h.isEmpty())
        throw new Error("Empty thumbnail");
      const b = h.toJPEG(e);
      if (!b || b.length < 16)
        throw new Error("Invalid JPEG buffer");
      return w.writeFileSync(u, b), u;
    })().catch(() => t).finally(() => s.delete(u));
    return s.set(u, f), f;
  };
  le.registerFileProtocol("thumb", (t, n) => {
    try {
      const e = new URL(t.url), r = Number(e.searchParams.get("w") ?? 160), o = Number(e.searchParams.get("q") ?? 55), c = Number.isFinite(r) ? Math.min(Math.max(Math.floor(r), 64), 512) : 160, u = Number.isFinite(o) ? Math.min(Math.max(Math.floor(o), 30), 85) : 55, p = a(t.url, "thumb");
      i(p, c, u).then((f) => n({ path: f })).catch(() => n({ path: p }));
    } catch (e) {
      S.error("Thumb protocol error:", e), n({ error: -324 });
    }
  }), Je(), At();
});
function ae(a, l) {
  if (L.isPackaged) {
    const s = process.platform === "win32" ? "photo_selector_engine.exe" : "photo_selector_engine", i = g.join(process.resourcesPath, "engine", s);
    return {
      cmd: i,
      args: [a, ...l],
      cwd: g.dirname(i),
      env: { ...process.env }
      // inherit env but no special python setup
    };
  } else {
    const s = g.resolve($, "../../");
    return {
      cmd: "python",
      args: [g.join(s, "photo_selector/cli.py"), a, ...l],
      cwd: s,
      env: { ...process.env, PYTHONPATH: s }
    };
  }
}
function ce(a, l, s) {
  A && A.kill(), S.info(`Spawning: ${s.cmd} ${s.args.join(" ")}`), A = Ye(s.cmd, s.args, {
    cwd: s.cwd,
    env: s.env
  }), A.stdout?.on("data", (i) => {
    const t = i.toString().split(`
`);
    for (const n of t)
      if (n.trim())
        try {
          const e = JSON.parse(n);
          a.reply(`${l}-progress`, e);
        } catch {
          S.info(`${l} stdout:`, n);
        }
  }), A.stderr?.on("data", (i) => {
    const t = i.toString();
    S.error(`${l} stderr: ${t}`);
  }), A.on("close", (i) => {
    S.info(`${l} finished with code:`, i), a.reply(`${l}-done`, i), A = null;
  });
}
function At() {
  P.handle("select-directory", async () => {
    const a = await ue.showOpenDialog(F, {
      properties: ["openDirectory"]
    });
    return a.canceled ? null : a.filePaths[0];
  }), P.handle("read-results", async (a, l) => {
    const s = g.join(l, "results.json");
    if (w.existsSync(s))
      try {
        const t = w.readFileSync(s, "utf-8"), n = JSON.parse(t);
        return Array.isArray(n) ? n.map(ze) : n;
      } catch (t) {
        return S.error("Failed to read results.json", t), null;
      }
    const i = g.join(l, "results.csv");
    if (w.existsSync(i))
      try {
        const t = w.readFileSync(i, "utf-8");
        return Et(t).map(ze);
      } catch (t) {
        return S.error("Failed to read results.csv", t), null;
      }
    return null;
  }), P.handle("read-groups", async (a, l) => {
    const s = g.join(l, "groups.json");
    if (!w.existsSync(s)) return null;
    try {
      const i = w.readFileSync(s, "utf-8");
      return JSON.parse(i);
    } catch (i) {
      return S.error("Failed to read groups.json", i), null;
    }
  }), P.on("start-compute", (a, l) => {
    const { inputDir: s, profile: i, config: t, rebuildCache: n } = l, e = g.join(L.getPath("userData"), "temp_config.json");
    w.writeFileSync(e, JSON.stringify(t));
    const r = [
      "--input-dir",
      s,
      "--profile",
      i,
      "--config-json",
      e
    ];
    n && r.push("--rebuild-cache");
    const o = ae("compute", r);
    ce(a, "compute", o);
  }), P.on("start-group", (a, l) => {
    const { inputDir: s, params: i } = l, t = i ?? {}, n = [
      "--input-dir",
      s,
      "--output-dir",
      s,
      "--embed-model",
      String(t.embedModel ?? "mobilenet_v3_small"),
      "--thumb-long-edge",
      String(t.thumbLongEdge ?? 256),
      "--eps",
      String(t.eps ?? 0.12),
      "--min-samples",
      String(t.minSamples ?? 2),
      "--neighbor-window",
      String(t.neighborWindow ?? 80),
      "--topk",
      String(t.topk ?? 2),
      "--workers",
      String(t.workers ?? 4),
      "--batch-size",
      String(t.batchSize ?? 32)
    ], e = ae("group", n);
    ce(a, "group", e);
  }), P.on("cancel-compute", () => {
    A && (A.kill(), A = null);
  }), P.on("cancel-group", () => {
    A && (A.kill(), A = null);
  }), P.on("write-xmp", (a, l) => {
    const { inputDir: s, selection: i, config: t, onlySelected: n } = l, e = g.join(L.getPath("userData"), "temp_selection.json");
    w.writeFileSync(e, JSON.stringify(i));
    const r = g.join(L.getPath("userData"), "temp_config.json");
    w.writeFileSync(r, JSON.stringify(t));
    const o = [
      "--input-dir",
      s,
      "--selection-file",
      e,
      "--config-json",
      r
    ];
    n && o.push("--only-selected");
    const c = ae("write-xmp", o);
    ce(a, "write-xmp", c);
  }), P.on("log-info", (a, l) => S.info(l)), P.on("log-error", (a, l) => S.error(l));
}
