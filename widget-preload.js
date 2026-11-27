'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  openPage: (page) => ipcRenderer.send('widget:action', page),
  hide: () => ipcRenderer.send('widget:hide'),
  onConfig: (callback) => {
    const handler = (_event, config) => callback(config);
    ipcRenderer.on('widget:config', handler);
    return () => ipcRenderer.removeListener('widget:config', handler);
  }
});
