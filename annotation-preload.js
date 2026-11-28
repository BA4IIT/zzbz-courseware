'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('annotationAPI', {
  close: () => ipcRenderer.send('annotation:close'),
  save: (dataUrl) => ipcRenderer.invoke('annotation:save', dataUrl)
});
