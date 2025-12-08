const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('configAPI', {
  update: (config) => ipcRenderer.invoke('config:update', config),
  get: () => ipcRenderer.invoke('config:get'),
  onNextRestTime: (callback) =>
    ipcRenderer.on('next-rest-time', (event, time) => callback(time)),
});

contextBridge.exposeInMainWorld('breakAPI', {
  close: () => ipcRenderer.invoke('break:close'),
  prepare: () => ipcRenderer.invoke('break:prepare'),
});
