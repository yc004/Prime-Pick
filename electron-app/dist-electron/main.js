import Ze, { app as A, protocol as he, BrowserWindow as $, ipcMain as E, shell as Xe, dialog as de, nativeTheme as Be, nativeImage as ye } from "electron";
import h from "path";
import { fileURLToPath as Ke } from "url";
import et, { spawn as tt } from "child_process";
import y from "fs";
import M from "os";
import rt from "util";
import Je from "events";
import nt from "http";
import st from "https";
import ot from "crypto";
function it(i) {
  return i && i.__esModule && Object.prototype.hasOwnProperty.call(i, "default") ? i.default : i;
}
var W, be;
function at() {
  if (be) return W;
  be = 1;
  const i = y, l = h;
  W = {
    findAndReadPackageJson: s,
    tryReadJsonAt: a
  };
  function s() {
    return a(t()) || a(n()) || a(process.resourcesPath, "app.asar") || a(process.resourcesPath, "app") || a(process.cwd()) || { name: void 0, version: void 0 };
  }
  function a(...r) {
    if (r[0])
      try {
        const o = l.join(...r), c = e("package.json", o);
        if (!c)
          return;
        const u = JSON.parse(i.readFileSync(c, "utf8")), p = u?.productName || u?.name;
        return !p || p.toLowerCase() === "electron" ? void 0 : p ? { name: p, version: u?.version } : void 0;
      } catch {
        return;
      }
  }
  function e(r, o) {
    let c = o;
    for (; ; ) {
      const u = l.parse(c), p = u.root, f = u.dir;
      if (i.existsSync(l.join(c, r)))
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
  function t() {
    try {
      return require.main?.filename;
    } catch {
      return;
    }
  }
  return W;
}
var U, ve;
function ct() {
  if (ve) return U;
  ve = 1;
  const i = et, l = M, s = h, a = at();
  class e {
    appName = void 0;
    appPackageJson = void 0;
    platform = process.platform;
    getAppLogPath(t = this.getAppName()) {
      return this.platform === "darwin" ? s.join(this.getSystemPathHome(), "Library/Logs", t) : s.join(this.getAppUserDataPath(t), "logs");
    }
    getAppName() {
      const t = this.appName || this.getAppPackageJson()?.name;
      if (!t)
        throw new Error(
          "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
        );
      return t;
    }
    /**
     * @private
     * @returns {undefined}
     */
    getAppPackageJson() {
      return typeof this.appPackageJson != "object" && (this.appPackageJson = a.findAndReadPackageJson()), this.appPackageJson;
    }
    getAppUserDataPath(t = this.getAppName()) {
      return t ? s.join(this.getSystemPathAppData(), t) : void 0;
    }
    getAppVersion() {
      return this.getAppPackageJson()?.version;
    }
    getElectronLogPath() {
      return this.getAppLogPath();
    }
    getMacOsVersion() {
      const t = Number(l.release().split(".")[0]);
      return t <= 19 ? `10.${t - 4}` : t - 9;
    }
    /**
     * @protected
     * @returns {string}
     */
    getOsVersion() {
      let t = l.type().replace("_", " "), r = l.release();
      return t === "Darwin" && (t = "macOS", r = this.getMacOsVersion()), `${t} ${r}`;
    }
    /**
     * @return {PathVariables}
     */
    getPathVariables() {
      const t = this.getAppName(), r = this.getAppVersion(), o = this;
      return {
        appData: this.getSystemPathAppData(),
        appName: t,
        appVersion: r,
        get electronDefaultDir() {
          return o.getElectronLogPath();
        },
        home: this.getSystemPathHome(),
        libraryDefaultDir: this.getAppLogPath(t),
        libraryTemplate: this.getAppLogPath("{appName}"),
        temp: this.getSystemPathTemp(),
        userData: this.getAppUserDataPath(t)
      };
    }
    getSystemPathAppData() {
      const t = this.getSystemPathHome();
      switch (this.platform) {
        case "darwin":
          return s.join(t, "Library/Application Support");
        case "win32":
          return process.env.APPDATA || s.join(t, "AppData/Roaming");
        default:
          return process.env.XDG_CONFIG_HOME || s.join(t, ".config");
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
    onAppEvent(t, r) {
    }
    onAppReady(t) {
      t();
    }
    onEveryWebContentsEvent(t, r) {
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(t, r) {
    }
    onIpcInvoke(t, r) {
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(t, r = console.error) {
      const c = { darwin: "open", win32: "start", linux: "xdg-open" }[process.platform] || "xdg-open";
      i.exec(`${c} ${t}`, {}, (u) => {
        u && r(u);
      });
    }
    setAppName(t) {
      this.appName = t;
    }
    setPlatform(t) {
      this.platform = t;
    }
    setPreloadFileForSessions({
      filePath: t,
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
    sendIpc(t, r) {
    }
    showErrorBox(t, r) {
    }
  }
  return U = e, U;
}
var B, we;
function lt() {
  if (we) return B;
  we = 1;
  const i = h, l = ct();
  class s extends l {
    /**
     * @type {typeof Electron}
     */
    electron = void 0;
    /**
     * @param {object} options
     * @param {typeof Electron} [options.electron]
     */
    constructor({ electron: e } = {}) {
      super(), this.electron = e;
    }
    getAppName() {
      let e;
      try {
        e = this.appName || this.electron.app?.name || this.electron.app?.getName();
      } catch {
      }
      return e || super.getAppName();
    }
    getAppUserDataPath(e) {
      return this.getPath("userData") || super.getAppUserDataPath(e);
    }
    getAppVersion() {
      let e;
      try {
        e = this.electron.app?.getVersion();
      } catch {
      }
      return e || super.getAppVersion();
    }
    getElectronLogPath() {
      return this.getPath("logs") || super.getElectronLogPath();
    }
    /**
     * @private
     * @param {any} name
     * @returns {string|undefined}
     */
    getPath(e) {
      try {
        return this.electron.app?.getPath(e);
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
      return this.electron.app?.isPackaged !== void 0 ? !this.electron.app.isPackaged : typeof process.execPath == "string" ? i.basename(process.execPath).toLowerCase().startsWith("electron") : super.isDev();
    }
    onAppEvent(e, n) {
      return this.electron.app?.on(e, n), () => {
        this.electron.app?.off(e, n);
      };
    }
    onAppReady(e) {
      this.electron.app?.isReady() ? e() : this.electron.app?.once ? this.electron.app?.once("ready", e) : e();
    }
    onEveryWebContentsEvent(e, n) {
      return this.electron.webContents?.getAllWebContents()?.forEach((r) => {
        r.on(e, n);
      }), this.electron.app?.on("web-contents-created", t), () => {
        this.electron.webContents?.getAllWebContents().forEach((r) => {
          r.off(e, n);
        }), this.electron.app?.off("web-contents-created", t);
      };
      function t(r, o) {
        o.on(e, n);
      }
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(e, n) {
      this.electron.ipcMain?.on(e, n);
    }
    onIpcInvoke(e, n) {
      this.electron.ipcMain?.handle?.(e, n);
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(e, n = console.error) {
      this.electron.shell?.openExternal(e).catch(n);
    }
    setPreloadFileForSessions({
      filePath: e,
      includeFutureSession: n = !0,
      getSessions: t = () => [this.electron.session?.defaultSession]
    }) {
      for (const o of t().filter(Boolean))
        r(o);
      n && this.onAppEvent("session-created", (o) => {
        r(o);
      });
      function r(o) {
        typeof o.registerPreloadScript == "function" ? o.registerPreloadScript({
          filePath: e,
          id: "electron-log-preload",
          type: "frame"
        }) : o.setPreloads([...o.getPreloads(), e]);
      }
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(e, n) {
      this.electron.BrowserWindow?.getAllWindows()?.forEach((t) => {
        t.webContents?.isDestroyed() === !1 && t.webContents?.isCrashed() === !1 && t.webContents.send(e, n);
      });
    }
    showErrorBox(e, n) {
      this.electron.dialog?.showErrorBox(e, n);
    }
  }
  return B = s, B;
}
var J = { exports: {} }, Se;
function ut() {
  return Se || (Se = 1, (function(i) {
    let l = {};
    try {
      l = require("electron");
    } catch {
    }
    l.ipcRenderer && s(l), i.exports = s;
    function s({ contextBridge: a, ipcRenderer: e }) {
      if (!e)
        return;
      e.on("__ELECTRON_LOG_IPC__", (t, r) => {
        window.postMessage({ cmd: "message", ...r });
      }), e.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((t) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${t.message}`
      )));
      const n = {
        sendToMain(t) {
          try {
            e.send("__ELECTRON_LOG__", t);
          } catch (r) {
            console.error("electronLog.sendToMain ", r, "data:", t), e.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: r?.message, stack: r?.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...t) {
          n.sendToMain({ data: t, level: "info" });
        }
      };
      for (const t of ["error", "warn", "info", "verbose", "debug", "silly"])
        n[t] = (...r) => n.sendToMain({
          data: r,
          level: t
        });
      if (a && process.contextIsolated)
        try {
          a.exposeInMainWorld("__electronLog", n);
        } catch {
        }
      typeof window == "object" ? window.__electronLog = n : __electronLog = n;
    }
  })(J)), J.exports;
}
var H, Ee;
function pt() {
  if (Ee) return H;
  Ee = 1;
  const i = y, l = M, s = h, a = ut();
  let e = !1, n = !1;
  H = {
    initialize({
      externalApi: o,
      getSessions: c,
      includeFutureSession: u,
      logger: p,
      preload: f = !0,
      spyRendererConsole: d = !1
    }) {
      o.onAppReady(() => {
        try {
          f && t({
            externalApi: o,
            getSessions: c,
            includeFutureSession: u,
            logger: p,
            preloadOption: f
          }), d && r({ externalApi: o, logger: p });
        } catch (v) {
          p.warn(v);
        }
      });
    }
  };
  function t({
    externalApi: o,
    getSessions: c,
    includeFutureSession: u,
    logger: p,
    preloadOption: f
  }) {
    let d = typeof f == "string" ? f : void 0;
    if (e) {
      p.warn(new Error("log.initialize({ preload }) already called").stack);
      return;
    }
    e = !0;
    try {
      d = s.resolve(
        __dirname,
        "../renderer/electron-log-preload.js"
      );
    } catch {
    }
    if (!d || !i.existsSync(d)) {
      d = s.join(
        o.getAppUserDataPath() || l.tmpdir(),
        "electron-log-preload.js"
      );
      const v = `
      try {
        (${a.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
      i.writeFileSync(d, v, "utf8");
    }
    o.setPreloadFileForSessions({
      filePath: d,
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
      (p, f, d) => {
        c.processMessage({
          data: [d],
          level: u[f],
          variables: { processType: "renderer" }
        });
      }
    );
  }
  return H;
}
var V, Ae;
function ft() {
  if (Ae) return V;
  Ae = 1, V = i;
  function i(l) {
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
    function s(a) {
      s.maxLabelLength = Math.max(s.maxLabelLength, a.length);
      const e = {};
      for (const n of l.levels)
        e[n] = (...t) => l.logData(t, { level: n, scope: a });
      return e.log = e.info, e;
    }
  }
  return V;
}
var G, Pe;
function ht() {
  if (Pe) return G;
  Pe = 1;
  class i {
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
  return G = i, G;
}
var Y, xe;
function dt() {
  if (xe) return Y;
  xe = 1;
  const i = ft(), l = ht();
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
      allowUnknownLevel: e = !1,
      dependencies: n = {},
      errorHandler: t,
      eventLogger: r,
      initializeFn: o,
      isDev: c = !1,
      levels: u = ["error", "warn", "info", "verbose", "debug", "silly"],
      logId: p,
      transportFactories: f = {},
      variables: d
    } = {}) {
      this.addLevel = this.addLevel.bind(this), this.create = this.create.bind(this), this.initialize = this.initialize.bind(this), this.logData = this.logData.bind(this), this.processMessage = this.processMessage.bind(this), this.allowUnknownLevel = e, this.buffering = new l(this), this.dependencies = n, this.initializeFn = o, this.isDev = c, this.levels = u, this.logId = p, this.scope = i(this), this.transportFactories = f, this.variables = d || {};
      for (const v of this.levels)
        this.addLevel(v, !1);
      this.log = this.info, this.functions.log = this.log, this.errorHandler = t, t?.setOptions({ ...n, logFn: this.error }), this.eventLogger = r, r?.setOptions({ ...n, logger: this });
      for (const [v, m] of Object.entries(f))
        this.transports[v] = m(this, n);
      s.instances[p] = this;
    }
    static getInstance({ logId: e }) {
      return this.instances[e] || this.instances.default;
    }
    addLevel(e, n = this.levels.length) {
      n !== !1 && this.levels.splice(n, 0, e), this[e] = (...t) => this.logData(t, { level: e }), this.functions[e] = this[e];
    }
    catchErrors(e) {
      return this.processMessage(
        {
          data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
          level: "warn"
        },
        { transports: ["console"] }
      ), this.errorHandler.startCatching(e);
    }
    create(e) {
      return typeof e == "string" && (e = { logId: e }), new s({
        dependencies: this.dependencies,
        errorHandler: this.errorHandler,
        initializeFn: this.initializeFn,
        isDev: this.isDev,
        transportFactories: this.transportFactories,
        variables: { ...this.variables },
        ...e
      });
    }
    compareLevels(e, n, t = this.levels) {
      const r = t.indexOf(e), o = t.indexOf(n);
      return o === -1 || r === -1 ? !0 : o <= r;
    }
    initialize(e = {}) {
      this.initializeFn({ logger: this, ...this.dependencies, ...e });
    }
    logData(e, n = {}) {
      this.buffering.enabled ? this.buffering.addMessage({ data: e, date: /* @__PURE__ */ new Date(), ...n }) : this.processMessage({ data: e, ...n });
    }
    processMessage(e, { transports: n = this.transports } = {}) {
      if (e.cmd === "errorHandler") {
        this.errorHandler.handle(e.error, {
          errorName: e.errorName,
          processType: "renderer",
          showDialog: !!e.showDialog
        });
        return;
      }
      let t = e.level;
      this.allowUnknownLevel || (t = this.levels.includes(e.level) ? e.level : "info");
      const r = {
        date: /* @__PURE__ */ new Date(),
        logId: this.logId,
        ...e,
        level: t,
        variables: {
          ...this.variables,
          ...e.variables
        }
      };
      for (const [o, c] of this.transportEntries(n))
        if (!(typeof c != "function" || c.level === !1) && this.compareLevels(c.level, e.level))
          try {
            const u = this.hooks.reduce((p, f) => p && f(p, c, o), r);
            u && c({ ...u, data: [...u.data] });
          } catch (u) {
            this.processInternalErrorFn(u);
          }
    }
    processInternalErrorFn(e) {
    }
    transportEntries(e = this.transports) {
      return (Array.isArray(e) ? e : Object.entries(e)).map((t) => {
        switch (typeof t) {
          case "string":
            return this.transports[t] ? [t, this.transports[t]] : null;
          case "function":
            return [t.name, t];
          default:
            return Array.isArray(t) ? t : null;
        }
      }).filter(Boolean);
    }
  }
  return Y = s, Y;
}
var Q, _e;
function gt() {
  if (_e) return Q;
  _e = 1;
  class i {
    externalApi = void 0;
    isActive = !1;
    logFn = void 0;
    onError = void 0;
    showDialog = !0;
    constructor({
      externalApi: a,
      logFn: e = void 0,
      onError: n = void 0,
      showDialog: t = void 0
    } = {}) {
      this.createIssue = this.createIssue.bind(this), this.handleError = this.handleError.bind(this), this.handleRejection = this.handleRejection.bind(this), this.setOptions({ externalApi: a, logFn: e, onError: n, showDialog: t }), this.startCatching = this.startCatching.bind(this), this.stopCatching = this.stopCatching.bind(this);
    }
    handle(a, {
      logFn: e = this.logFn,
      onError: n = this.onError,
      processType: t = "browser",
      showDialog: r = this.showDialog,
      errorName: o = ""
    } = {}) {
      a = l(a);
      try {
        if (typeof n == "function") {
          const c = this.externalApi?.getVersions() || {}, u = this.createIssue;
          if (n({
            createIssue: u,
            error: a,
            errorName: o,
            processType: t,
            versions: c
          }) === !1)
            return;
        }
        o ? e(o, a) : e(a), r && !o.includes("rejection") && this.externalApi && this.externalApi.showErrorBox(
          `A JavaScript error occurred in the ${t} process`,
          a.stack
        );
      } catch {
        console.error(a);
      }
    }
    setOptions({ externalApi: a, logFn: e, onError: n, showDialog: t }) {
      typeof a == "object" && (this.externalApi = a), typeof e == "function" && (this.logFn = e), typeof n == "function" && (this.onError = n), typeof t == "boolean" && (this.showDialog = t);
    }
    startCatching({ onError: a, showDialog: e } = {}) {
      this.isActive || (this.isActive = !0, this.setOptions({ onError: a, showDialog: e }), process.on("uncaughtException", this.handleError), process.on("unhandledRejection", this.handleRejection));
    }
    stopCatching() {
      this.isActive = !1, process.removeListener("uncaughtException", this.handleError), process.removeListener("unhandledRejection", this.handleRejection);
    }
    createIssue(a, e) {
      this.externalApi?.openUrl(
        `${a}?${new URLSearchParams(e).toString()}`
      );
    }
    handleError(a) {
      this.handle(a, { errorName: "Unhandled" });
    }
    handleRejection(a) {
      const e = a instanceof Error ? a : new Error(JSON.stringify(a));
      this.handle(e, { errorName: "Unhandled rejection" });
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
      } catch (a) {
        return new Error(`Couldn't normalize error ${String(s)}: ${a}`);
      }
    }
    return new Error(`Can't normalize error ${String(s)}`);
  }
  return Q = i, Q;
}
var Z, Fe;
function mt() {
  if (Fe) return Z;
  Fe = 1;
  class i {
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
        "render-process-gone": ({ args: [s, a] }) => a && typeof a == "object" ? { ...a, ...this.getWebContentsDetails(s) } : []
      },
      webContents: {
        "console-message": ({ args: [s, a, e, n] }) => {
          if (!(s < 3))
            return { message: a, source: `${n}:${e}` };
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
      externalApi: a,
      level: e,
      logger: n,
      format: t,
      formatters: r,
      scope: o
    }) {
      typeof s == "object" && (this.events = s), typeof a == "object" && (this.externalApi = a), typeof e == "string" && (this.level = e), typeof n == "object" && (this.logger = n), (typeof t == "string" || typeof t == "function") && (this.format = t), typeof r == "object" && (this.formatters = r), typeof o == "string" && (this.scope = o);
    }
    startLogging(s = {}) {
      this.setOptions(s), this.disposeListeners();
      for (const a of this.getEventNames(this.events.app))
        this.disposers.push(
          this.externalApi.onAppEvent(a, (...e) => {
            this.handleEvent({ eventSource: "app", eventName: a, handlerArgs: e });
          })
        );
      for (const a of this.getEventNames(this.events.webContents))
        this.disposers.push(
          this.externalApi.onEveryWebContentsEvent(
            a,
            (...e) => {
              this.handleEvent(
                { eventSource: "webContents", eventName: a, handlerArgs: e }
              );
            }
          )
        );
    }
    stopLogging() {
      this.disposeListeners();
    }
    arrayToObject(s, a) {
      const e = {};
      return a.forEach((n, t) => {
        e[n] = s[t];
      }), s.length > a.length && (e.unknownArgs = s.slice(a.length)), e;
    }
    disposeListeners() {
      this.disposers.forEach((s) => s()), this.disposers = [];
    }
    formatEventLog({ eventName: s, eventSource: a, handlerArgs: e }) {
      const [n, ...t] = e;
      if (typeof this.format == "function")
        return this.format({ args: t, event: n, eventName: s, eventSource: a });
      const r = this.formatters[a]?.[s];
      let o = t;
      if (typeof r == "function" && (o = r({ args: t, event: n, eventName: s, eventSource: a })), !o)
        return;
      const c = {};
      return Array.isArray(o) ? c.args = o : typeof o == "object" && Object.assign(c, o), a === "webContents" && Object.assign(c, this.getWebContentsDetails(n?.sender)), [this.format.replace("{eventSource}", a === "app" ? "App" : "WebContents").replace("{eventName}", s), c];
    }
    getEventNames(s) {
      return !s || typeof s != "object" ? [] : Object.entries(s).filter(([a, e]) => e).map(([a]) => a);
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
    handleEvent({ eventName: s, eventSource: a, handlerArgs: e }) {
      const n = this.formatEventLog({ eventName: s, eventSource: a, handlerArgs: e });
      n && (this.scope ? this.logger.scope(this.scope) : this.logger)?.[this.level]?.(...n);
    }
  }
  return Z = i, Z;
}
var X, Le;
function k() {
  if (Le) return X;
  Le = 1, X = { transform: i };
  function i({
    logger: l,
    message: s,
    transport: a,
    initialData: e = s?.data || [],
    transforms: n = a?.transforms
  }) {
    return n.reduce((t, r) => typeof r == "function" ? r({ data: t, logger: l, message: s, transport: a }) : t, e);
  }
  return X;
}
var K, Oe;
function He() {
  if (Oe) return K;
  Oe = 1;
  const { transform: i } = k();
  K = {
    concatFirstStringElements: l,
    formatScope: a,
    formatText: n,
    formatVariables: e,
    timeZoneFromOffset: s,
    format({ message: t, logger: r, transport: o, data: c = t?.data }) {
      switch (typeof o.format) {
        case "string":
          return i({
            message: t,
            logger: r,
            transforms: [e, a, n],
            transport: o,
            initialData: [o.format, ...c]
          });
        case "function":
          return o.format({
            data: c,
            level: t?.level || "info",
            logger: r,
            message: t,
            transport: o
          });
        default:
          return c;
      }
    }
  };
  function l({ data: t }) {
    return typeof t[0] != "string" || typeof t[1] != "string" || t[0].match(/%[1cdfiOos]/) ? t : [`${t[0]} ${t[1]}`, ...t.slice(2)];
  }
  function s(t) {
    const r = Math.abs(t), o = t > 0 ? "-" : "+", c = Math.floor(r / 60).toString().padStart(2, "0"), u = (r % 60).toString().padStart(2, "0");
    return `${o}${c}:${u}`;
  }
  function a({ data: t, logger: r, message: o }) {
    const { defaultLabel: c, labelLength: u } = r?.scope || {}, p = t[0];
    let f = o.scope;
    f || (f = c);
    let d;
    return f === "" ? d = u > 0 ? "".padEnd(u + 3) : "" : typeof f == "string" ? d = ` (${f})`.padEnd(u + 3) : d = "", t[0] = p.replace("{scope}", d), t;
  }
  function e({ data: t, message: r }) {
    let o = t[0];
    if (typeof o != "string")
      return t;
    o = o.replace("{level}]", `${r.level}]`.padEnd(6, " "));
    const c = r.date || /* @__PURE__ */ new Date();
    return t[0] = o.replace(/\{(\w+)}/g, (u, p) => {
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
    }).trim(), t;
  }
  function n({ data: t }) {
    const r = t[0];
    if (typeof r != "string")
      return t;
    if (r.lastIndexOf("{text}") === r.length - 6)
      return t[0] = r.replace(/\s?{text}/, ""), t[0] === "" && t.shift(), t;
    const c = r.split("{text}");
    let u = [];
    return c[0] !== "" && u.push(c[0]), u = u.concat(t.slice(1)), c[1] !== "" && u.push(c[1]), u;
  }
  return K;
}
var ee = { exports: {} }, je;
function q() {
  return je || (je = 1, (function(i) {
    const l = rt;
    i.exports = {
      serialize: a,
      maxDepth({ data: e, transport: n, depth: t = n?.depth ?? 6 }) {
        if (!e)
          return e;
        if (t < 1)
          return Array.isArray(e) ? "[array]" : typeof e == "object" && e ? "[object]" : e;
        if (Array.isArray(e))
          return e.map((o) => i.exports.maxDepth({
            data: o,
            depth: t - 1
          }));
        if (typeof e != "object" || e && typeof e.toISOString == "function")
          return e;
        if (e === null)
          return null;
        if (e instanceof Error)
          return e;
        const r = {};
        for (const o in e)
          Object.prototype.hasOwnProperty.call(e, o) && (r[o] = i.exports.maxDepth({
            data: e[o],
            depth: t - 1
          }));
        return r;
      },
      toJSON({ data: e }) {
        return JSON.parse(JSON.stringify(e, s()));
      },
      toString({ data: e, transport: n }) {
        const t = n?.inspectOptions || {}, r = e.map((o) => {
          if (o !== void 0)
            try {
              const c = JSON.stringify(o, s(), "  ");
              return c === void 0 ? void 0 : JSON.parse(c);
            } catch {
              return o;
            }
        });
        return l.formatWithOptions(t, ...r);
      }
    };
    function s(e = {}) {
      const n = /* @__PURE__ */ new WeakSet();
      return function(t, r) {
        if (typeof r == "object" && r !== null) {
          if (n.has(r))
            return;
          n.add(r);
        }
        return a(t, r, e);
      };
    }
    function a(e, n, t = {}) {
      const r = t?.serializeMapAndSet !== !1;
      return n instanceof Error ? n.stack : n && (typeof n == "function" ? `[function] ${n.toString()}` : n instanceof Date ? n.toISOString() : r && n instanceof Map && Object.fromEntries ? Object.fromEntries(n) : r && n instanceof Set && Array.from ? Array.from(n) : n);
    }
  })(ee)), ee.exports;
}
var te, De;
function me() {
  if (De) return te;
  De = 1, te = {
    transformStyles: a,
    applyAnsiStyles({ data: e }) {
      return a(e, l, s);
    },
    removeStyles({ data: e }) {
      return a(e, () => "");
    }
  };
  const i = {
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
  function l(e) {
    const n = e.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
    return i[n] || "";
  }
  function s(e) {
    return e + i.unset;
  }
  function a(e, n, t) {
    const r = {};
    return e.reduce((o, c, u, p) => {
      if (r[u])
        return o;
      if (typeof c == "string") {
        let f = u, d = !1;
        c = c.replace(/%[1cdfiOos]/g, (v) => {
          if (f += 1, v !== "%c")
            return v;
          const m = p[f];
          return typeof m == "string" ? (r[f] = !0, d = !0, n(m, c)) : v;
        }), d && t && (c = t(c));
      }
      return o.push(c), o;
    }, []);
  }
  return te;
}
var re, $e;
function yt() {
  if ($e) return re;
  $e = 1;
  const {
    concatFirstStringElements: i,
    format: l
  } = He(), { maxDepth: s, toJSON: a } = q(), {
    applyAnsiStyles: e,
    removeStyles: n
  } = me(), { transform: t } = k(), r = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  re = u;
  const c = `%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform === "win32" ? ">" : "›"} {text}`;
  Object.assign(u, {
    DEFAULT_FORMAT: c
  });
  function u(m) {
    return Object.assign(g, {
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
        d,
        i,
        s,
        a
      ],
      useStyles: process.env.FORCE_STYLES,
      writeFn({ message: P }) {
        (r[P.level] || r.info)(...P.data);
      }
    });
    function g(P) {
      const F = t({ logger: m, message: P, transport: g });
      g.writeFn({
        message: { ...P, data: F }
      });
    }
  }
  function p({ data: m, message: g, transport: P }) {
    return typeof P.format != "string" || !P.format.includes("%c") ? m : [
      `color:${v(g.level, P)}`,
      "color:unset",
      ...m
    ];
  }
  function f(m, g) {
    if (typeof m == "boolean")
      return m;
    const F = g === "error" || g === "warn" ? process.stderr : process.stdout;
    return F && F.isTTY;
  }
  function d(m) {
    const { message: g, transport: P } = m;
    return (f(P.useStyles, g.level) ? e : n)(m);
  }
  function v(m, g) {
    return g.colorMap[m] || g.colorMap.default;
  }
  return re;
}
var ne, Ce;
function Ve() {
  if (Ce) return ne;
  Ce = 1;
  const i = Je, l = y, s = M;
  class a extends i {
    asyncWriteQueue = [];
    bytesWritten = 0;
    hasActiveAsyncWriting = !1;
    path = null;
    initialSize = void 0;
    writeOptions = null;
    writeAsync = !1;
    constructor({
      path: t,
      writeOptions: r = { encoding: "utf8", flag: "a", mode: 438 },
      writeAsync: o = !1
    }) {
      super(), this.path = t, this.writeOptions = r, this.writeAsync = o;
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
      } catch (t) {
        return t.code === "ENOENT" ? !0 : (this.emit("error", t, this), !1);
      }
    }
    crop(t) {
      try {
        const r = e(this.path, t || 4096);
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
          const t = l.statSync(this.path);
          this.initialSize = t.size;
        } catch {
          this.initialSize = 0;
        }
      return this.initialSize + this.bytesWritten;
    }
    increaseBytesWrittenCounter(t) {
      this.bytesWritten += Buffer.byteLength(t, this.writeOptions.encoding);
    }
    isNull() {
      return !1;
    }
    nextAsyncWrite() {
      const t = this;
      if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0)
        return;
      const r = this.asyncWriteQueue.join("");
      this.asyncWriteQueue = [], this.hasActiveAsyncWriting = !0, l.writeFile(this.path, r, this.writeOptions, (o) => {
        t.hasActiveAsyncWriting = !1, o ? t.emit(
          "error",
          new Error(`Couldn't write to ${t.path}. ${o.message}`),
          this
        ) : t.increaseBytesWrittenCounter(r), t.nextAsyncWrite();
      });
    }
    reset() {
      this.initialSize = void 0, this.bytesWritten = 0;
    }
    toString() {
      return this.path;
    }
    writeLine(t) {
      if (t += s.EOL, this.writeAsync) {
        this.asyncWriteQueue.push(t), this.nextAsyncWrite();
        return;
      }
      try {
        l.writeFileSync(this.path, t, this.writeOptions), this.increaseBytesWrittenCounter(t);
      } catch (r) {
        this.emit(
          "error",
          new Error(`Couldn't write to ${this.path}. ${r.message}`),
          this
        );
      }
    }
  }
  ne = a;
  function e(n, t) {
    const r = Buffer.alloc(t), o = l.statSync(n), c = Math.min(o.size, t), u = Math.max(0, o.size - t), p = l.openSync(n, "r"), f = l.readSync(p, r, 0, c, u);
    return l.closeSync(p), r.toString("utf8", 0, f);
  }
  return ne;
}
var se, Ne;
function bt() {
  if (Ne) return se;
  Ne = 1;
  const i = Ve();
  class l extends i {
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
  return se = l, se;
}
var oe, Re;
function vt() {
  if (Re) return oe;
  Re = 1;
  const i = Je, l = y, s = h, a = Ve(), e = bt();
  class n extends i {
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
        u = new e({ path: r }), this.emitError(p, u);
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
      return this.testFileWriting({ filePath: r, writeOptions: o }), new a({ path: r, writeOptions: o, writeAsync: c });
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
  return oe = n, oe;
}
var ie, Ie;
function wt() {
  if (Ie) return ie;
  Ie = 1;
  const i = y, l = M, s = h, a = vt(), { transform: e } = k(), { removeStyles: n } = me(), {
    format: t,
    concatFirstStringElements: r
  } = He(), { toString: o } = q();
  ie = u;
  const c = new a();
  function u(f, { registry: d = c, externalApi: v } = {}) {
    let m;
    return d.listenerCount("error") < 1 && d.on("error", (S, b) => {
      F(`Can't write to ${b}`, S);
    }), Object.assign(g, {
      fileName: p(f.variables.processType),
      format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
      getFile: z,
      inspectOptions: { depth: 5 },
      level: "silly",
      maxSize: 1024 ** 2,
      readAllLogs: Ye,
      sync: !0,
      transforms: [n, t, r, o],
      writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
      archiveLogFn(S) {
        const b = S.toString(), L = s.parse(b);
        try {
          i.renameSync(b, s.join(L.dir, `${L.name}.old${L.ext}`));
        } catch (C) {
          F("Could not rotate log", C);
          const Qe = Math.round(g.maxSize / 4);
          S.crop(Math.min(Qe, 256 * 1024));
        }
      },
      resolvePathFn(S) {
        return s.join(S.libraryDefaultDir, S.fileName);
      },
      setAppName(S) {
        f.dependencies.externalApi.setAppName(S);
      }
    });
    function g(S) {
      const b = z(S);
      g.maxSize > 0 && b.size > g.maxSize && (g.archiveLogFn(b), b.reset());
      const C = e({ logger: f, message: S, transport: g });
      b.writeLine(C);
    }
    function P() {
      m || (m = Object.create(
        Object.prototype,
        {
          ...Object.getOwnPropertyDescriptors(
            v.getPathVariables()
          ),
          fileName: {
            get() {
              return g.fileName;
            },
            enumerable: !0
          }
        }
      ), typeof g.archiveLog == "function" && (g.archiveLogFn = g.archiveLog, F("archiveLog is deprecated. Use archiveLogFn instead")), typeof g.resolvePath == "function" && (g.resolvePathFn = g.resolvePath, F("resolvePath is deprecated. Use resolvePathFn instead")));
    }
    function F(S, b = null, L = "error") {
      const C = [`electron-log.transports.file: ${S}`];
      b && C.push(b), f.transports.console({ data: C, date: /* @__PURE__ */ new Date(), level: L });
    }
    function z(S) {
      P();
      const b = g.resolvePathFn(m, S);
      return d.provide({
        filePath: b,
        writeAsync: !g.sync,
        writeOptions: g.writeOptions
      });
    }
    function Ye({ fileFilter: S = (b) => b.endsWith(".log") } = {}) {
      P();
      const b = s.dirname(g.resolvePathFn(m));
      return i.existsSync(b) ? i.readdirSync(b).map((L) => s.join(b, L)).filter(S).map((L) => {
        try {
          return {
            path: L,
            lines: i.readFileSync(L, "utf8").split(l.EOL)
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
  return ie;
}
var ae, ke;
function St() {
  if (ke) return ae;
  ke = 1;
  const { maxDepth: i, toJSON: l } = q(), { transform: s } = k();
  ae = a;
  function a(e, { externalApi: n }) {
    return Object.assign(t, {
      depth: 3,
      eventId: "__ELECTRON_LOG_IPC__",
      level: e.isDev ? "silly" : !1,
      transforms: [l, i]
    }), n?.isElectron() ? t : void 0;
    function t(r) {
      r?.variables?.processType !== "renderer" && n?.sendIpc(t.eventId, {
        ...r,
        data: s({ logger: e, message: r, transport: t })
      });
    }
  }
  return ae;
}
var ce, Te;
function Et() {
  if (Te) return ce;
  Te = 1;
  const i = nt, l = st, { transform: s } = k(), { removeStyles: a } = me(), { toJSON: e, maxDepth: n } = q();
  ce = t;
  function t(r) {
    return Object.assign(o, {
      client: { name: "electron-application" },
      depth: 6,
      level: !1,
      requestOptions: {},
      transforms: [a, e, n],
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
        const d = (c.startsWith("https:") ? l : i).request(c, {
          method: "POST",
          ...u,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": p.length,
            ...u.headers
          }
        });
        return d.write(p), d.end(), d;
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
  return ce;
}
var le, Me;
function At() {
  if (Me) return le;
  Me = 1;
  const i = dt(), l = gt(), s = mt(), a = yt(), e = wt(), n = St(), t = Et();
  le = r;
  function r({ dependencies: o, initializeFn: c }) {
    const u = new i({
      dependencies: o,
      errorHandler: new l(),
      eventLogger: new s(),
      initializeFn: c,
      isDev: o.externalApi?.isDev(),
      logId: "default",
      transportFactories: {
        console: a,
        file: e,
        ipc: n,
        remote: t
      },
      variables: {
        processType: "main"
      }
    });
    return u.default = u, u.Logger = i, u.processInternalErrorFn = (p) => {
      u.transports.console.writeFn({
        message: {
          data: ["Unhandled electron-log error", p],
          level: "error"
        }
      });
    }, u;
  }
  return le;
}
var ue, qe;
function Pt() {
  if (qe) return ue;
  qe = 1;
  const i = Ze, l = lt(), { initialize: s } = pt(), a = At(), e = new l({ electron: i }), n = a({
    dependencies: { externalApi: e },
    initializeFn: s
  });
  ue = n, e.onIpc("__ELECTRON_LOG__", (r, o) => {
    o.scope && n.Logger.getInstance(o).scope(o.scope);
    const c = new Date(o.date);
    t({
      ...o,
      date: c.getTime() ? c : /* @__PURE__ */ new Date()
    });
  }), e.onIpcInvoke("__ELECTRON_LOG__", (r, { cmd: o = "", logId: c }) => o === "getOptions" ? {
    levels: n.Logger.getInstance({ logId: c }).levels,
    logId: c
  } : (t({ data: [`Unknown cmd '${o}'`], level: "error" }), {}));
  function t(r) {
    n.Logger.getInstance(r)?.processMessage(r);
  }
  return ue;
}
var pe, ze;
function xt() {
  return ze || (ze = 1, pe = Pt()), pe;
}
var _t = xt();
const w = /* @__PURE__ */ it(_t);
w.initialize();
w.errorHandler.startCatching();
w.info("Application starting...");
A.setName("Prime Pick");
const O = h.dirname(Ke(import.meta.url));
process.env.DIST = h.join(O, "../dist");
process.env.VITE_PUBLIC = A.isPackaged ? process.env.DIST : h.join(O, "../public");
let x, j = null, _ = null, N = null;
const T = process.env.VITE_DEV_SERVER_URL, ge = (i) => i === "dark" ? "#020617" : "#ECFEFF";
he.registerSchemesAsPrivileged([
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
function We(i) {
  return Array.isArray(i) ? i.map((l) => String(l)).filter((l) => l.trim().length > 0) : typeof i == "string" ? i.split(";").map((l) => l.trim()).filter((l) => l.length > 0) : [];
}
function D(i, l = 0) {
  const s = typeof i == "number" ? i : Number(i);
  return Number.isFinite(s) ? s : l;
}
function fe(i, l = !1) {
  if (typeof i == "boolean") return i;
  if (typeof i == "string") {
    const s = i.trim().toLowerCase();
    if (s === "true") return !0;
    if (s === "false") return !1;
  }
  return typeof i == "number" ? i !== 0 : l;
}
function Ue(i) {
  const l = D(i?.sharpness?.score ?? i?.sharpness_score, 0), s = fe(i?.sharpness?.is_blurry ?? i?.is_blurry, !1), a = D(i?.exposure?.score ?? i?.exposure_score, 0), e = Array.isArray(i?.exposure?.flags) ? i.exposure.flags.map((c) => String(c)) : We(i?.exposure_flags), n = Array.isArray(i?.reasons) ? i.reasons.map((c) => String(c)) : We(i?.reasons), t = typeof i?.emotion == "string" ? i.emotion : "", r = i?.emotion_score ?? i?.emotionScore, o = r === "" || r == null ? void 0 : D(r, 0);
  return {
    filename: String(i?.filename ?? ""),
    sharpness: { score: l, is_blurry: s },
    exposure: { score: a, flags: e },
    technical_score: D(i?.technical_score, 0),
    is_unusable: fe(i?.is_unusable, !1),
    reasons: n,
    capture_ts: D(i?.capture_ts, 0),
    group_id: D(i?.group_id, -1),
    group_size: D(i?.group_size, 1),
    rank_in_group: D(i?.rank_in_group, 1),
    is_group_best: fe(i?.is_group_best, !1),
    emotion: t || void 0,
    emotion_score: o
  };
}
function Ft(i) {
  const l = i.split(/\r?\n/).filter((n) => n.trim().length > 0);
  if (l.length === 0) return [];
  const s = (n) => {
    const t = [];
    let r = "", o = !1;
    for (let c = 0; c < n.length; c++) {
      const u = n[c];
      if (u === '"') {
        const p = n[c + 1];
        o && p === '"' ? (r += '"', c += 1) : o = !o;
        continue;
      }
      if (u === "," && !o) {
        t.push(r), r = "";
        continue;
      }
      r += u;
    }
    return t.push(r), t;
  }, a = s(l[0]).map((n) => n.trim()), e = [];
  for (let n = 1; n < l.length; n++) {
    const t = s(l[n]), r = {};
    for (let o = 0; o < a.length; o++) r[a[o]] = t[o] ?? "";
    e.push(r);
  }
  return e;
}
function Ge() {
  const i = A.isPackaged ? h.join(A.getAppPath(), "dist") : h.join(O, "../dist"), l = A.isPackaged ? i : h.join(O, "../public"), s = Be.shouldUseDarkColors ? "dark" : "light";
  x = new $({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    icon: h.join(l, "icon.png"),
    webPreferences: {
      preload: h.join(O, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "hidden",
    autoHideMenuBar: !0,
    backgroundColor: ge(s)
  }), x.webContents.on("did-fail-load", (a, e, n, t) => {
    w.error("did-fail-load", { errorCode: e, errorDescription: n, validatedURL: t }), de.showErrorBox("页面加载失败", `${n} (${e})
${t}`);
  }), x.webContents.on("render-process-gone", (a, e) => {
    w.error("render-process-gone", e), de.showErrorBox("渲染进程崩溃", `${e.reason} (exitCode=${e.exitCode})`);
  }), x.webContents.on("console-message", (a, e, n, t, r) => {
    e >= 2 && w.error("renderer-console", { level: e, message: n, line: t, sourceId: r });
  }), T ? x.loadURL(T) : x.loadFile(h.join(i, "index.html"));
}
A.on("window-all-closed", () => {
  process.platform !== "darwin" && (A.quit(), _ && _.kill(), N && N.kill());
});
A.on("activate", () => {
  $.getAllWindows().length === 0 && Ge();
});
A.whenReady().then(() => {
  const i = (e, n) => {
    let r = new URL(e).toString();
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
  he.registerFileProtocol("media", (e, n) => {
    try {
      let t = e.url;
      w.info("Media request raw:", t), t.startsWith("media://local/") ? t = t.replace(/^media:\/\/local\//, "") : t = t.replace(/^media:\/\//, "");
      let o = decodeURIComponent(t);
      process.platform === "win32" && o.startsWith("/") && !o.startsWith("//") && /^\/[a-zA-Z]:/.test(o) && (o = o.slice(1)), n({ path: o });
    } catch (t) {
      w.error("Media protocol error:", t), n({ error: -324 });
    }
  });
  const l = h.join(A.getPath("userData"), "thumb_cache");
  try {
    y.mkdirSync(l, { recursive: !0 });
  } catch {
  }
  const s = /* @__PURE__ */ new Map(), a = async (e, n, t) => {
    const r = y.statSync(e), o = `${e}|${r.size}|${r.mtimeMs}|w=${n}|q=${t}`, c = ot.createHash("sha1").update(o).digest("hex"), u = h.join(l, `${c}.jpg`);
    if (y.existsSync(u)) return u;
    const p = s.get(u);
    if (p) return p;
    const f = (async () => {
      let d = await ye.createThumbnailFromPath(e, { width: n, height: n });
      if (d.isEmpty() && (d = ye.createFromPath(e).resize({ width: n, height: n })), d.isEmpty())
        throw new Error("Empty thumbnail");
      const v = d.toJPEG(t);
      if (!v || v.length < 16)
        throw new Error("Invalid JPEG buffer");
      return y.writeFileSync(u, v), u;
    })().catch(() => e).finally(() => s.delete(u));
    return s.set(u, f), f;
  };
  he.registerFileProtocol("thumb", (e, n) => {
    try {
      const t = new URL(e.url), r = Number(t.searchParams.get("w") ?? 160), o = Number(t.searchParams.get("q") ?? 55), c = Number.isFinite(r) ? Math.min(Math.max(Math.floor(r), 64), 512) : 160, u = Number.isFinite(o) ? Math.min(Math.max(Math.floor(o), 30), 85) : 55, p = i(e.url, "thumb");
      a(p, c, u).then((f) => n({ path: f })).catch(() => n({ path: p }));
    } catch (t) {
      w.error("Thumb protocol error:", t), n({ error: -324 });
    }
  }), Ge(), Lt(), setTimeout(() => {
    const e = R("check-models", []);
    I(null, "check-models", e);
  }, 1500);
});
function R(i, l) {
  if (A.isPackaged) {
    const s = process.platform === "win32" ? "photo_selector_engine.exe" : "photo_selector_engine", a = h.join(process.resourcesPath, "engine", s);
    return {
      cmd: a,
      args: [i, ...l],
      cwd: h.dirname(a),
      env: { ...process.env }
      // inherit env but no special python setup
    };
  } else {
    const s = () => {
      const n = process.env.PRIMEPICK_PYTHON;
      if (n && y.existsSync(n)) return n;
      const t = process.env.CONDA_PREFIX;
      if (t) {
        const r = process.platform === "win32" ? h.join(t, "python.exe") : h.join(t, "bin", "python");
        if (y.existsSync(r)) return r;
      }
      if (process.platform === "win32") {
        const r = process.env.USERPROFILE, o = [
          r ? h.join(r, ".conda", "envs", "photo_selector", "python.exe") : null,
          r ? h.join(r, "miniconda3", "envs", "photo_selector", "python.exe") : null,
          r ? h.join(r, "anaconda3", "envs", "photo_selector", "python.exe") : null
        ].filter(Boolean);
        for (const c of o)
          if (y.existsSync(c)) return c;
      }
      return "python";
    }, a = h.resolve(O, "../../"), e = h.join(a, "photo_selector/cli.py");
    return {
      cmd: s(),
      args: [e, i, ...l],
      cwd: a,
      env: { ...process.env, PYTHONPATH: a, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }
    };
  }
}
function I(i, l, s) {
  const a = l === "check-models";
  a ? N && N.kill() : _ && _.kill();
  const e = (r, ...o) => {
    if (i) {
      i.reply(r, ...o);
      return;
    }
    x && !x.isDestroyed() && x.webContents.send(r, ...o);
  };
  w.info(`Spawning: ${s.cmd} ${s.args.join(" ")}`);
  const n = (r) => {
    a ? N = r : _ = r;
  }, t = () => a ? N : _;
  try {
    n(tt(s.cmd, s.args, {
      cwd: s.cwd,
      env: s.env
    }));
  } catch (r) {
    w.error(`${l} spawn failed`, r), e(`${l}-done`, 1), n(null);
    return;
  }
  t()?.stdout?.on("data", (r) => {
    const o = r.toString().split(`
`);
    for (const c of o)
      if (c.trim())
        try {
          const u = JSON.parse(c);
          e(`${l}-progress`, u);
        } catch {
          a ? e(`${l}-progress`, { type: "log", line: c }) : w.info(`${l} stdout:`, c);
        }
  }), t()?.stderr?.on("data", (r) => {
    const o = r.toString();
    w.error(`${l} stderr: ${o}`);
  }), t()?.on("close", (r) => {
    w.info(`${l} finished with code:`, r), e(`${l}-done`, r), n(null);
  });
}
function Lt() {
  E.on("window-minimize", (i) => $.fromWebContents(i.sender)?.minimize()), E.on("window-maximize", (i) => {
    const l = $.fromWebContents(i.sender);
    l && (l.isMaximized() ? l.unmaximize() : l.maximize());
  }), E.on("window-close", (i) => $.fromWebContents(i.sender)?.close()), E.on("set-window-theme", (i, l) => {
    const s = l === "light" ? "light" : "dark", a = $.fromWebContents(i.sender);
    a && !a.isDestroyed() && a.setBackgroundColor(ge(s));
  }), E.handle("open-external", async (i, l) => {
    const s = typeof l == "string" ? l.trim() : "";
    return !s || !/^https?:\/\//i.test(s) ? !1 : (await Xe.openExternal(s), !0);
  }), E.on("open-preferences-window", () => {
    if (!x || x.isDestroyed()) return;
    if (j && !j.isDestroyed()) {
      j.focus();
      return;
    }
    const i = A.isPackaged ? h.join(A.getAppPath(), "dist") : h.join(O, "../dist"), l = A.isPackaged ? i : h.join(O, "../public"), s = Be.shouldUseDarkColors ? "dark" : "light";
    j = new $({
      width: 980,
      height: 900,
      minWidth: 840,
      minHeight: 700,
      parent: x,
      modal: !1,
      show: !0,
      icon: h.join(l, "icon.png"),
      webPreferences: {
        preload: h.join(O, "preload.cjs"),
        sandbox: !1,
        contextIsolation: !0,
        nodeIntegration: !1
      },
      titleBarStyle: "hidden",
      autoHideMenuBar: !0,
      backgroundColor: ge(s)
    }), j.on("closed", () => {
      j = null;
    }), T ? j.loadURL(`${T}#/preferences`) : j.loadFile(h.join(i, "index.html"), { hash: "/preferences" });
  }), E.handle("select-directory", async () => {
    const i = await de.showOpenDialog(x, {
      properties: ["openDirectory"]
    });
    return i.canceled ? null : i.filePaths[0];
  }), E.handle("read-results", async (i, l) => {
    const s = h.join(l, "results.json");
    if (y.existsSync(s))
      try {
        const e = y.readFileSync(s, "utf-8"), n = JSON.parse(e);
        return Array.isArray(n) ? n.map(Ue) : n;
      } catch (e) {
        return w.error("Failed to read results.json", e), null;
      }
    const a = h.join(l, "results.csv");
    if (y.existsSync(a))
      try {
        const e = y.readFileSync(a, "utf-8");
        return Ft(e).map(Ue);
      } catch (e) {
        return w.error("Failed to read results.csv", e), null;
      }
    return null;
  }), E.handle("read-groups", async (i, l) => {
    const s = h.join(l, "groups.json");
    if (!y.existsSync(s)) return null;
    try {
      const a = y.readFileSync(s, "utf-8");
      return JSON.parse(a);
    } catch (a) {
      return w.error("Failed to read groups.json", a), null;
    }
  }), E.on("start-compute", (i, l) => {
    const { inputDir: s, profile: a, config: e, rebuildCache: n, workers: t } = l, r = h.join(A.getPath("userData"), "temp_config.json");
    y.writeFileSync(r, JSON.stringify(e));
    const o = [
      "--input-dir",
      s,
      "--profile",
      a,
      "--config-json",
      r
    ];
    n && o.push("--rebuild-cache"), typeof t == "number" && o.push("--workers", String(t));
    const c = R("compute", o);
    I(i, "compute", c);
  }), E.on("start-group", (i, l) => {
    const { inputDir: s, params: a } = l, e = a ?? {}, n = [
      "--input-dir",
      s,
      "--output-dir",
      s,
      "--embed-model",
      String(e.embedModel ?? "mobilenet_v3_small"),
      "--thumb-long-edge",
      String(e.thumbLongEdge ?? 256),
      "--eps",
      String(e.eps ?? 0.12),
      "--min-samples",
      String(e.minSamples ?? 2),
      "--neighbor-window",
      String(e.neighborWindow ?? 80),
      "--time-window-secs",
      String(e.timeWindowSecs ?? 6),
      "--time-source",
      String(e.timeSource ?? "auto"),
      "--topk",
      String(e.topk ?? 2),
      "--workers",
      String(e.workers ?? 4),
      "--batch-size",
      String(e.batchSize ?? 32)
    ], t = R("group", n);
    I(i, "group", t);
  }), E.on("check-models", (i, l) => {
    const a = !!l?.force ? ["--force"] : [], e = R("check-models", a);
    I(i, "check-models", e);
  }), E.on("cancel-compute", () => {
    _ && (_.kill(), _ = null);
  }), E.on("cancel-group", () => {
    _ && (_.kill(), _ = null);
  }), E.on("write-xmp", (i, l) => {
    const { inputDir: s, selection: a, config: e, onlySelected: n } = l, t = h.join(A.getPath("userData"), "temp_selection.json");
    y.writeFileSync(t, JSON.stringify(a));
    const r = h.join(A.getPath("userData"), "temp_config.json");
    y.writeFileSync(r, JSON.stringify(e));
    const o = [
      "--input-dir",
      s,
      "--selection-file",
      t,
      "--config-json",
      r
    ];
    n && o.push("--only-selected");
    const c = R("write-xmp", o);
    I(i, "write-xmp", c);
  }), E.on("log-info", (i, l) => w.info(l)), E.on("log-error", (i, l) => w.error(l));
}
