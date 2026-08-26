const { contextBridge, ipcRenderer } = require('electron');

const api = {
  getConfig: () => ipcRenderer.invoke('cfg:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('cfg:save', cfg),
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  setSession: (userId) => ipcRenderer.invoke('session:set', { userId }),
  clearSession: () => ipcRenderer.invoke('session:clear'),
  listLaporan: (args) => ipcRenderer.invoke('laporan:list', args),
  testPortal: () => ipcRenderer.invoke('portal:test'),
  sync: (args) => ipcRenderer.invoke('portal:sync', args),
  resetStatus: (id) => ipcRenderer.invoke('sync:reset', { id }),
  resetAllStatus: () => ipcRenderer.invoke('sync:resetAll'),
  syncMaster: () => ipcRenderer.invoke('master:sync'),
  notify: (args) => ipcRenderer.invoke('notify', args),
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  portalListRk: () => ipcRenderer.invoke('portal:listRk'),
  listRencana: () => ipcRenderer.invoke('rencana:list'),
  mapRencana: (rencanaId, rkid) => ipcRenderer.invoke('rencana:map', { rencanaId, rkid }),
  webOpen: (p) => ipcRenderer.invoke('web:open', { path: p }),
  checkDup: (args) => ipcRenderer.invoke('portal:checkDup', args),
  importTemplate: () => ipcRenderer.invoke('import:template'),
  importPreview: () => ipcRenderer.invoke('import:preview'),
  importCommit: () => ipcRenderer.invoke('import:commit'),
  onAutoLog: (cb) => ipcRenderer.on('auto:log', (_e, { msg, level }) => cb(msg, level)),
  onAutoProgress: (cb) =>
    ipcRenderer.on('auto:progress', (_e, { done, total, label }) => cb(done, total, label)),
};

contextBridge.exposeInMainWorld('api', api);
