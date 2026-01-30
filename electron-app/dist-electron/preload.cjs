"use strict";
const electron = require("electron");
console.log("Preload script loaded");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => electron.ipcRenderer.invoke("select-directory"),
  readResults: (dir) => electron.ipcRenderer.invoke("read-results", dir),
  readGroups: (dir) => electron.ipcRenderer.invoke("read-groups", dir),
  startCompute: (args) => electron.ipcRenderer.send("start-compute", args),
  cancelCompute: () => electron.ipcRenderer.send("cancel-compute"),
  startGroup: (args) => electron.ipcRenderer.send("start-group", args),
  cancelGroup: () => electron.ipcRenderer.send("cancel-group"),
  writeXmp: (args) => electron.ipcRenderer.send("write-xmp", args),
  openExternal: (url) => electron.ipcRenderer.invoke("open-external", url),
  setWindowTheme: (theme) => electron.ipcRenderer.send("set-window-theme", theme),
  // Window controls
  minimize: () => electron.ipcRenderer.send("window-minimize"),
  maximize: () => electron.ipcRenderer.send("window-maximize"),
  close: () => electron.ipcRenderer.send("window-close"),
  openPreferencesWindow: () => electron.ipcRenderer.send("open-preferences-window"),
  onComputeProgress: (callback) => {
    const handler = (_, data) => callback(data);
    electron.ipcRenderer.on("compute-progress", handler);
    return () => electron.ipcRenderer.off("compute-progress", handler);
  },
  onComputeDone: (callback) => {
    const handler = (_, code) => callback(code);
    electron.ipcRenderer.on("compute-done", handler);
    return () => electron.ipcRenderer.off("compute-done", handler);
  },
  onGroupProgress: (callback) => {
    const handler = (_, data) => callback(data);
    electron.ipcRenderer.on("group-progress", handler);
    return () => electron.ipcRenderer.off("group-progress", handler);
  },
  onGroupDone: (callback) => {
    const handler = (_, code) => callback(code);
    electron.ipcRenderer.on("group-done", handler);
    return () => electron.ipcRenderer.off("group-done", handler);
  },
  onWriteXmpProgress: (callback) => {
    const handler = (_, data) => callback(data);
    electron.ipcRenderer.on("write-xmp-progress", handler);
    return () => electron.ipcRenderer.off("write-xmp-progress", handler);
  },
  onWriteXmpDone: (callback) => {
    const handler = (_, code) => callback(code);
    electron.ipcRenderer.on("write-xmp-done", handler);
    return () => electron.ipcRenderer.off("write-xmp-done", handler);
  },
  onError: (callback) => {
    const handler = (_, error) => callback(error);
    electron.ipcRenderer.on("app-error", handler);
    return () => electron.ipcRenderer.off("app-error", handler);
  },
  // Logging
  logInfo: (message) => electron.ipcRenderer.send("log-info", message),
  logError: (message) => electron.ipcRenderer.send("log-error", message)
});
