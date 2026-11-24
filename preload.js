'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

function previewUrl(filePath) {
  if (!filePath) return '';
  const encoded = Buffer.from(filePath, 'utf8').toString('base64url');
  return `cwfile://local/${encoded}`;
}

contextBridge.exposeInMainWorld('zzbz', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  saveLibrary: (payload) => ipcRenderer.invoke('library:save', payload),
  pickFiles: () => ipcRenderer.invoke('dialog:pick-files'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  inspectPaths: (paths) => ipcRenderer.invoke('files:inspect-paths', paths),
  checkFiles: (paths) => ipcRenderer.invoke('files:check', paths),
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('file:reveal', filePath),
  saveFileAs: (options) => ipcRenderer.invoke('file:save-as', options),
  saveFilesAsBatch: (items) => ipcRenderer.invoke('files:save-as-batch', { items }),
  downloadFilesZip: (items) => ipcRenderer.invoke('files:download-zip', { items }),
  getPreviewUrl: previewUrl,
  saveText: (options) => ipcRenderer.invoke('export:text', options),
  savePng: (options) => ipcRenderer.invoke('file:save-png', options),
  openJson: () => ipcRenderer.invoke('dialog:open-json'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),
  downloadUpdate: (payload) => ipcRenderer.invoke('app:download-update', payload),
  launchInstaller: (filePath) => ipcRenderer.invoke('app:launch-installer', filePath),
  browserCredentials: {
    get: () => ipcRenderer.invoke('browser:get-credentials'),
    save: (payload) => ipcRenderer.invoke('browser:save-credentials', payload),
    clear: () => ipcRenderer.invoke('browser:clear-credentials')
  },
  usb: {
    list: () => ipcRenderer.invoke('usb:list'),
    scan: (root) => ipcRenderer.invoke('usb:scan', root),
    defenderScan: (root) => ipcRenderer.invoke('usb:defender-scan', root)
  },
  getDroppedPaths: (files) => {
    const paths = [];
    for (const file of files || []) {
      try {
        const filePath = webUtils.getPathForFile(file);
        if (filePath) paths.push(filePath);
      } catch (error) {
        /* 忽略无法获取路径的浏览器文件对象 */
      }
    }
    return paths;
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback) => {
      const listener = (_event, value) => callback(Boolean(value));
      ipcRenderer.on('window:maximized-state', listener);
      return () => ipcRenderer.removeListener('window:maximized-state', listener);
    }
  }
});
