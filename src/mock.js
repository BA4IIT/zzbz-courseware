/* 浏览器预览适配器：仅用于界面预览与验收，正式使用请通过桌面程序启动。
 * 访问 index.html?mock=1 时启用。 */
(function () {
  'use strict';
  if (window.zzbz) return;
  const mockRequested = new URLSearchParams(location.search).get('mock') === '1';
  if (!mockRequested) return;

  const STORAGE_KEY = 'zzbz-courseware-preview-library-v1';

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '') || null;
    } catch (error) {
      return null;
    }
  }

  function writeStore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function downloadText(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  window.zzbz = {
    isDesktop: false,
    isMock: true,
    platform: 'browser',
    versions: { electron: '-', chrome: '-', node: '-' },
    async loadLibrary() {
      const stored = readStore();
      if (stored) {
        return {
          ok: true,
          items: stored.items || [],
          settings: stored.settings || {},
          questions: stored.questions || [],
          timetable: stored.timetable || null,
          subjectVotes: stored.subjectVotes || {},
          students: stored.students || [],
          wordGameScores: stored.wordGameScores || [],
          updatedAt: stored.updatedAt || '',
          dataDir: '浏览器预览模式 · 数据保存在 localStorage',
          libraryPath: '浏览器预览模式',
          firstRun: false
        };
      }
      return {
        ok: true,
        items: [],
        settings: {},
        updatedAt: '',
        dataDir: '浏览器预览模式 · 数据保存在 localStorage',
        libraryPath: '浏览器预览模式',
        firstRun: true
      };
    },
    async saveLibrary(payload) {
      const ok = writeStore({ ...payload, updatedAt: new Date().toISOString() });
      return ok ? { ok: true } : { ok: false, error: '预览模式存储空间不足' };
    },
    async pickFiles() {
      return { ok: false, error: '浏览器预览模式不能选择本机文件，请使用桌面程序。' };
    },
    async pickFolder() {
      return { ok: false, error: '浏览器预览模式不能扫描文件夹，请使用桌面程序。' };
    },
    async inspectPaths() {
      return { ok: false, files: [], error: '浏览器预览模式不能读取本机路径' };
    },
    async checkFiles() {
      return { ok: true, files: {} };
    },
    async openFile() {
      return { ok: false, error: '演示记录没有关联本地文件。' };
    },
    async revealFile() {
      return { ok: false, error: '演示记录没有关联本地文件。' };
    },
    async saveFileAs() {
      return { ok: false, error: '浏览器预览模式不能另存本机文件。' };
    },
    async saveFilesAsBatch() {
      return { ok: false, error: '浏览器预览模式不能批量另存本机文件。' };
    },
    async downloadFilesZip() {
      return { ok: false, error: '浏览器预览模式不能打包下载本机文件。' };
    },
    async savePng() {
      return { ok: false, error: '浏览器预览模式不能保存本机图片。' };
    },
    async checkUpdate() {
      return {
        ok: true,
        currentVersion: '2.1.0',
        latestVersion: '2.1.0',
        isLatest: true,
        updateAvailable: false,
        releaseUrl: 'https://github.com/BA4IIT/zzbz-courseware/releases',
        assetUrl: '',
        assetName: '',
        notes: ''
      };
    },
    async downloadUpdate() {
      return { ok: false, error: '浏览器预览模式不能下载更新。' };
    },
    async launchInstaller() {
      return { ok: false, error: '浏览器预览模式不能打开安装包。' };
    },
    async importStudents() {
      return { ok: false, error: '浏览器预览模式不能读取本机表格。' };
    },
    ai: {
      async status() { return { ok: true, hasKey: false }; },
      async saveKey() { return { ok: false, error: '浏览器预览模式不能保存 API Key。' }; },
      async clearKey() { return { ok: true }; },
      async ask() { return { ok: false, error: '浏览器预览模式不能调用 DeepSeek，请使用桌面程序。' }; },
      async readFile() { return { ok: false, error: '浏览器预览模式不能读取本机文件。' }; },
      async ocrImage() { return { ok: false, error: '浏览器预览模式不能识别本机图片。' }; }
    },
    async startPhoneCast() { return { ok: false, error: '浏览器预览模式不能启动手机投屏服务。' }; },
    async stopPhoneCast() { return { ok: true }; },
    async phoneCastStatus() { return { ok: true, active: false }; },
    async openBluetoothSettings() { return { ok: false, error: '浏览器预览模式不能打开系统设置。' }; },
    onPhoneFrame() { return () => {}; },
    onUpdateProgress() { return () => {}; },
    async searchPolitics() { return { ok: false, error: '浏览器预览模式不能抓取网络新闻，请使用桌面程序。' }; },
    async captureScreen() { return { ok: false, error: '浏览器预览模式不能截取桌面。' }; },
    widget: { async configure() { return { ok: true }; }, hide() {} },
    onNavigate() { return () => {}; },
    browserCredentials: {
      async get() { return { ok: true, username: '', password: '', savedAt: '' }; },
      async save() { return { ok: false, error: '浏览器预览模式不能保存账号。' }; },
      async clear() { return { ok: true }; }
    },
    usb: {
      async list() { return { ok: true, drives: [] }; },
      async scan() { return { ok: false, error: '浏览器预览模式不能扫描 U 盘。' }; },
      async defenderScan() { return { ok: false, error: '浏览器预览模式不能调用 Windows Defender。' }; }
    },
    getPreviewUrl() {
      return '';
    },
    async saveText(options) {
      const name = (options && options.defaultName) || 'export.txt';
      downloadText(name, (options && options.content) || '');
      return { ok: true, filePath: name };
    },
    async openJson() {
      return { ok: false, error: '浏览器预览模式不支持读取备份文件。' };
    },
    async getAppInfo() {
      return {
        ok: true,
        name: '枣庄八中集成桌面教学系统',
        version: '2.1.0',
        dataDir: '浏览器预览模式',
        libraryPath: 'localStorage',
        electron: '-',
        chrome: '-',
        node: '-',
        platform: 'browser'
      };
    },
    async openDataDir() {
      return { ok: true };
    },
    async openExternal() {
      return { ok: false, error: '浏览器预览模式不启动外部程序' };
    },
    getDroppedPaths() {
      return [];
    },
    window: {
      minimize() {},
      toggleMaximize() {},
      close() {},
      async isMaximized() { return false; },
      onMaximizedChange() { return () => {}; }
    }
  };
})();
