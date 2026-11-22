'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, Menu } = require('electron');
const archiver = require('archiver');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.setName('ZZBZ Courseware');
app.setAppUserModelId('cn.edu.zzbz.courseware');

function resolveStorageDir() {
  if (process.env.ZZBZ_DATA_DIR) return path.resolve(process.env.ZZBZ_DATA_DIR);
  if (!app.isPackaged) return path.join(__dirname, 'data');
  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
  const localDir = path.join(exeDir, 'data');
  try {
    fs.mkdirSync(localDir, { recursive: true });
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch (error) {
    return path.join(app.getPath('appData'), 'ZZBZ-Courseware');
  }
}

const STORAGE_DIR = resolveStorageDir();
const RUNTIME_DIR = path.join(STORAGE_DIR, '.runtime');
try {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  app.setPath('userData', RUNTIME_DIR);
} catch (error) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    app.setPath('userData', STORAGE_DIR);
  } catch (fallbackError) {
    /* userData 目录异常时交给 Electron 使用默认目录 */
  }
}

const APP_NAME = '枣庄八中高中课件管理系统';
const APP_VERSION = '1.3.0';
const isDev = process.argv.includes('--dev');
const captureArg = process.argv.find((arg) => arg.startsWith('--capture='));
const testExportRoot = process.env.ZZBZ_TEST_EXPORT_DIR || '';
const testSaveDir = process.env.ZZBZ_TEST_SAVE_DIR || '';
const testZipPath = process.env.ZZBZ_TEST_ZIP_PATH || '';
if (captureArg) app.disableHardwareAcceleration();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cwfile',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: false }
  }
]);

const SUPPORTED_EXTS = new Set([
  'ppt', 'pptx', 'pps', 'ppsx', 'doc', 'docx', 'pdf', 'xls', 'xlsx',
  'mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
  'mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg',
  'zip', 'rar', '7z', 'txt', 'md', 'html', 'htm'
]);

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8',
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8'
};

let mainWindow = null;
let saveChain = Promise.resolve();

function getDataDir() {
  return STORAGE_DIR;
}

function getLibraryPath() {
  return path.join(getDataDir(), 'courseware-library.json');
}

async function ensureDataDir() {
  await fsp.mkdir(getDataDir(), { recursive: true });
}

async function atomicWrite(filePath, content) {
  await ensureDataDir();
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fsp.writeFile(tempPath, content, 'utf8');
  try {
    await fsp.rename(tempPath, filePath);
  } catch (error) {
    await fsp.copyFile(tempPath, filePath);
    await fsp.unlink(tempPath).catch(() => {});
  }
}

function fileExtension(filePath) {
  return path.extname(filePath).slice(1).toLowerCase();
}

function sanitizePathSegment(value, fallback) {
  const text = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 80);
  return text || fallback || '未分类';
}

function escapeCsvCell(value) {
  const text = String(value == null ? '' : value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function uniqueDestinationPath(directory, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = path.join(directory, fileName);
  let index = 2;
  while (true) {
    try {
      await fsp.access(candidate, fs.constants.F_OK);
      candidate = path.join(directory, `${base} (${index})${ext}`);
      index += 1;
    } catch (error) {
      return candidate;
    }
  }
}

function exportStamp() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function isSupportedFile(filePath) {
  return SUPPORTED_EXTS.has(fileExtension(filePath));
}

function isHiddenName(name) {
  return name.startsWith('.') || name.startsWith('~$') || name.startsWith('$');
}

async function toFileDescriptor(filePath, relativePath) {
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) return null;
  return {
    path: path.resolve(filePath),
    name: path.basename(filePath),
    ext: fileExtension(filePath),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    relativePath: relativePath || path.basename(filePath)
  };
}

const MAX_SCAN_FILES = 6000;
const MAX_SCAN_DEPTH = 12;

async function scanDirectory(rootDir, currentDir, relativeDir, output, state, depth) {
  if (state.truncated || output.length >= MAX_SCAN_FILES || depth > MAX_SCAN_DEPTH) {
    state.truncated = output.length >= MAX_SCAN_FILES;
    return;
  }
  let entries;
  try {
    entries = await fsp.readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    state.unreadable += 1;
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
  for (const entry of entries) {
    if (output.length >= MAX_SCAN_FILES) {
      state.truncated = true;
      return;
    }
    if (isHiddenName(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(currentDir, entry.name);
    const relative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__MACOSX') continue;
      await scanDirectory(rootDir, absolute, relative, output, state, depth + 1);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!isSupportedFile(entry.name)) {
      state.skipped += 1;
      continue;
    }
    try {
      const descriptor = await toFileDescriptor(absolute, relative);
      if (descriptor) output.push(descriptor);
    } catch (error) {
      state.skipped += 1;
    }
  }
}

async function inspectPaths(paths) {
  const files = [];
  const state = { skipped: 0, unreadable: 0, truncated: false };
  const seen = new Set();
  const folders = [];

  for (const raw of paths || []) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const absolute = path.resolve(raw);
    let stat;
    try {
      stat = await fsp.stat(absolute);
    } catch (error) {
      state.unreadable += 1;
      continue;
    }
    if (stat.isDirectory()) {
      folders.push({ path: absolute, name: path.basename(absolute) });
      const local = [];
      await scanDirectory(absolute, absolute, '', local, state, 0);
      for (const item of local) {
        const key = item.path.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          files.push(item);
        }
      }
    } else if (stat.isFile()) {
      if (!isSupportedFile(absolute)) {
        state.skipped += 1;
        continue;
      }
      try {
        const descriptor = await toFileDescriptor(absolute, path.basename(absolute));
        if (descriptor) {
          const key = descriptor.path.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            files.push(descriptor);
          }
        }
      } catch (error) {
        state.unreadable += 1;
      }
    }
  }

  return {
    ok: true,
    files,
    folders,
    skipped: state.skipped,
    unreadable: state.unreadable,
    truncated: state.truncated
  };
}

function normalizeString(value, max = 400) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = normalizeString(raw.id, 80);
  const name = normalizeString(raw.name, 300);
  if (!id || !name) return null;
  const filePath = normalizeString(raw.filePath, 2000);
  const tags = Array.isArray(raw.tags)
    ? [...new Set(raw.tags.map((tag) => normalizeString(tag, 30).trim()).filter(Boolean))].slice(0, 12)
    : [];
  return {
    id,
    name,
    filePath,
    ext: normalizeString(raw.ext, 12).toLowerCase(),
    size: Number.isFinite(raw.size) ? Math.max(0, raw.size) : 0,
    mtimeMs: Number.isFinite(raw.mtimeMs) ? raw.mtimeMs : 0,
    subjectId: normalizeString(raw.subjectId, 40),
    bookId: normalizeString(raw.bookId, 60),
    chapterId: normalizeString(raw.chapterId, 80),
    typeId: normalizeString(raw.typeId, 40),
    tags,
    note: normalizeString(raw.note, 2000),
    favorite: Boolean(raw.favorite),
    demo: Boolean(raw.demo),
    createdAt: normalizeString(raw.createdAt, 40) || new Date().toISOString(),
    updatedAt: normalizeString(raw.updatedAt, 40) || new Date().toISOString(),
    lastOpenedAt: normalizeString(raw.lastOpenedAt, 40)
  };
}

function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = normalizeString(raw.id, 80);
  const title = normalizeString(raw.title, 200);
  if (!id || !title) return null;
  return {
    id,
    subjectId: normalizeString(raw.subjectId, 40),
    title,
    detail: normalizeString(raw.detail, 2000),
    votes: Math.max(0, Math.min(9999, Math.floor(Number(raw.votes) || 0))),
    status: raw.status === 'done' ? 'done' : 'open',
    createdAt: normalizeString(raw.createdAt, 40) || new Date().toISOString(),
    updatedAt: normalizeString(raw.updatedAt, 40) || new Date().toISOString()
  };
}

function normalizeLibrary(payload) {
  const rawItems = payload && Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.map(normalizeItem).filter(Boolean).slice(0, 20000);
  const rawQuestions = payload && Array.isArray(payload.questions) ? payload.questions : [];
  const questions = rawQuestions.map(normalizeQuestion).filter(Boolean).slice(0, 5000);
  const rawSettings = payload && payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
  return {
    version: 2,
    school: '枣庄市第八中学',
    updatedAt: new Date().toISOString(),
    settings: {
      initialized: Boolean(rawSettings.initialized),
      demoDismissed: Boolean(rawSettings.demoDismissed),
      lastSubject: normalizeString(rawSettings.lastSubject, 40),
      theme: 'light-blue'
    },
    items,
    questions
  };
}

async function loadLibrary() {
  try {
    const text = await fsp.readFile(getLibraryPath(), 'utf8');
    const parsed = JSON.parse(text);
    return {
      ok: true,
      items: Array.isArray(parsed.items) ? parsed.items.map(normalizeItem).filter(Boolean) : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.map(normalizeQuestion).filter(Boolean) : [],
      settings: parsed.settings || {},
      updatedAt: parsed.updatedAt || '',
      dataDir: getDataDir(),
      libraryPath: getLibraryPath()
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        ok: true,
        items: [],
        questions: [],
        settings: {},
        updatedAt: '',
        dataDir: getDataDir(),
        libraryPath: getLibraryPath(),
        firstRun: true
      };
    }
    const backupPath = `${getLibraryPath()}.corrupt-${Date.now()}`;
    try {
      await fsp.copyFile(getLibraryPath(), backupPath);
    } catch (_) {
      /* 数据文件无法复制时仍返回可恢复的空库 */
    }
    return {
      ok: true,
      items: [],
      questions: [],
      settings: {},
      updatedAt: '',
      dataDir: getDataDir(),
      libraryPath: getLibraryPath(),
      warning: '数据文件读取异常，已备份原文件并启用空课件库。',
      backupPath
    };
  }
}

function registerIpc() {
  ipcMain.handle('library:load', async () => loadLibrary());

  ipcMain.handle('library:save', async (_event, payload) => {
    const library = normalizeLibrary(payload);
    const text = JSON.stringify(library, null, 2);
    saveChain = saveChain.then(() => atomicWrite(getLibraryPath(), text));
    await saveChain;
    return {
      ok: true,
      updatedAt: library.updatedAt,
      count: library.items.length,
      questionCount: library.questions.length
    };
  });

  ipcMain.handle('dialog:pick-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择要加入课件库的文件',
      buttonLabel: '加入课件库',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '课件与教学资源', extensions: [...SUPPORTED_EXTS] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (result.canceled) return { ok: true, canceled: true, files: [] };
    return inspectPaths(result.filePaths);
  });

  ipcMain.handle('dialog:pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择课件文件夹（将自动扫描子文件夹）',
      buttonLabel: '扫描此文件夹',
      properties: ['openDirectory']
    });
    if (result.canceled) return { ok: true, canceled: true, files: [] };
    return inspectPaths(result.filePaths);
  });

  ipcMain.handle('files:inspect-paths', async (_event, paths) => inspectPaths(paths));

  ipcMain.handle('files:check', async (_event, paths) => {
    const unique = [...new Set((Array.isArray(paths) ? paths : []).filter((p) => typeof p === 'string' && p))];
    const result = {};
    const concurrency = 8;
    let cursor = 0;
    async function worker() {
      while (cursor < unique.length) {
        const index = cursor++;
        const filePath = unique[index];
        try {
          const stat = await fsp.stat(filePath);
          result[filePath] = { exists: stat.isFile(), size: stat.size, mtimeMs: stat.mtimeMs };
        } catch (error) {
          result[filePath] = { exists: false };
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
    return { ok: true, files: result };
  });

  ipcMain.handle('file:open', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      return { ok: false, error: '文件路径无效' };
    }
    try {
      const stat = await fsp.stat(filePath);
      if (!stat.isFile()) return { ok: false, error: '文件不存在或已被移动' };
    } catch (error) {
      return { ok: false, error: '文件不存在或已被移动' };
    }
    const errorMessage = await shell.openPath(filePath);
    return errorMessage ? { ok: false, error: errorMessage } : { ok: true };
  });

  ipcMain.handle('file:save-as', async (_event, options) => {
    const source = normalizeString(options && options.filePath, 2000);
    if (!source || !path.isAbsolute(source)) {
      return { ok: false, error: '文件路径无效' };
    }
    try {
      const stat = await fsp.stat(source);
      if (!stat.isFile()) return { ok: false, error: '原文件不存在或已被移动' };
    } catch (error) {
      return { ok: false, error: '原文件不存在或已被移动' };
    }
    const ext = fileExtension(source);
    if (!SUPPORTED_EXTS.has(ext)) return { ok: false, error: '不支持的文件类型' };
    const rawName = normalizeString(options && options.defaultName, 300) || path.basename(source);
    const defaultName = path.basename(rawName);
    let destinationPath = '';
    if (testSaveDir) {
      destinationPath = path.join(testSaveDir, defaultName);
    } else {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '课件另存为',
        defaultPath: path.join(app.getPath('documents'), defaultName),
        filters: [{ name: ext ? `${ext.toUpperCase()} 文件` : '所有文件', extensions: ext ? [ext] : ['*'] }]
      });
      if (result.canceled || !result.filePath) return { ok: true, canceled: true };
      destinationPath = result.filePath;
    }
    if (path.resolve(destinationPath).toLowerCase() === path.resolve(source).toLowerCase()) {
      return { ok: false, error: '目标文件与原始文件相同，请选择其他位置或文件名' };
    }
    try {
      await fsp.mkdir(path.dirname(destinationPath), { recursive: true });
      await fsp.copyFile(source, destinationPath);
      return { ok: true, filePath: destinationPath };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('files:save-as-batch', async (_event, options) => {
    const rawItems = options && Array.isArray(options.items) ? options.items : [];
    const items = rawItems.slice(0, 1000).map((item) => ({
      filePath: normalizeString(item && item.filePath, 2000),
      name: normalizeString(item && item.name, 300),
      subject: normalizeString(item && item.subject, 80),
      book: normalizeString(item && item.book, 200),
      chapter: normalizeString(item && item.chapter, 200),
      type: normalizeString(item && item.type, 80),
      tags: Array.isArray(item && item.tags) ? item.tags.map((tag) => normalizeString(tag, 40)).join('；') : '',
      note: normalizeString(item && item.note, 1200)
    }));
    if (!items.length) return { ok: false, error: '没有选择需要另存的文件' };
    let targetParent = testExportRoot;
    if (!targetParent) {
      const picked = await dialog.showOpenDialog(mainWindow, {
        title: '选择批量另存位置',
        buttonLabel: '另存到此处',
        properties: ['openDirectory']
      });
      if (picked.canceled || !picked.filePaths[0]) return { ok: true, canceled: true };
      targetParent = picked.filePaths[0];
    }
    const exportRoot = path.join(targetParent, `枣庄八中课件_${exportStamp()}`);
    const copied = [];
    const skipped = [];
    const exportedRelatives = new Map();
    try {
      await fsp.mkdir(exportRoot, { recursive: true });
    } catch (error) {
      return { ok: false, error: `无法创建导出目录：${error.message}` };
    }
    for (const [index, item] of items.entries()) {
      if (!item.filePath || !path.isAbsolute(item.filePath)) {
        skipped.push({ name: item.name || item.filePath, reason: '文件路径无效' });
        continue;
      }
      try {
        const stat = await fsp.stat(item.filePath);
        if (!stat.isFile()) throw new Error('原文件不存在');
        const subject = sanitizePathSegment(item.subject, '未分学科');
        const book = sanitizePathSegment(item.book, '未分教材');
        const chapter = sanitizePathSegment(item.chapter, '未分章节');
        const targetDir = path.join(exportRoot, subject, book, chapter);
        await fsp.mkdir(targetDir, { recursive: true });
        const fileName = sanitizePathSegment(path.basename(item.filePath), '课件文件');
        const targetPath = await uniqueDestinationPath(targetDir, fileName);
        await fsp.copyFile(item.filePath, targetPath);
        copied.push({
          name: item.name || path.basename(item.filePath),
          path: targetPath
        });
        exportedRelatives.set(index, path.relative(exportRoot, targetPath).replace(/\\/g, '/'));
      } catch (error) {
        skipped.push({ name: item.name || item.filePath, reason: error.message });
      }
    }
    const csvHeader = ['课件名称', '学科', '教材', '章节', '课程分类', '标签', '备注', '原文件路径', '导出状态', '导出相对路径'];
    const csvRows = items.map((item, index) => {
      const relative = exportedRelatives.get(index) || '';
      return [
        item.name, item.subject, item.book, item.chapter, item.type, item.tags, item.note, item.filePath,
        relative ? '已复制' : '未复制', relative
      ].map(escapeCsvCell).join(',');
    });
    const manifestPath = path.join(exportRoot, '课件清单.csv');
    try {
      await fsp.writeFile(manifestPath, `\ufeff${csvHeader.map(escapeCsvCell).join(',')}\r\n${csvRows.join('\r\n')}`, 'utf8');
    } catch (error) {
      /* 清单写入失败不影响文件另存结果 */
    }
    return {
      ok: true,
      folderPath: exportRoot,
      copied: copied.length,
      skipped,
      manifestPath
    };
  });

  ipcMain.handle('files:download-zip', async (_event, options) => {
    const rawItems = options && Array.isArray(options.items) ? options.items : [];
    const items = rawItems.slice(0, 1000).map((item) => ({
      filePath: normalizeString(item && item.filePath, 2000),
      name: normalizeString(item && item.name, 300),
      subject: normalizeString(item && item.subject, 80),
      book: normalizeString(item && item.book, 200),
      chapter: normalizeString(item && item.chapter, 200),
      type: normalizeString(item && item.type, 80),
      tags: Array.isArray(item && item.tags) ? item.tags.map((tag) => normalizeString(tag, 40)).join('；') : '',
      note: normalizeString(item && item.note, 1200)
    }));
    if (!items.length) return { ok: false, error: '没有选择需要下载的文件' };
    let targetPath = testZipPath;
    if (!targetPath) {
      const picked = await dialog.showSaveDialog(mainWindow, {
        title: '批量下载课件',
        buttonLabel: '打包下载',
        defaultPath: path.join(app.getPath('documents'), `枣庄八中课件_${exportStamp()}.zip`),
        filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
      });
      if (picked.canceled || !picked.filePath) return { ok: true, canceled: true };
      targetPath = picked.filePath;
    }
    if (!/\.zip$/i.test(targetPath)) targetPath = `${targetPath}.zip`;
    const validFiles = [];
    const skipped = [];
    const archiveRelatives = new Map();
    for (const [index, item] of items.entries()) {
      if (!item.filePath || !path.isAbsolute(item.filePath)) {
        skipped.push({ name: item.name || item.filePath, reason: '文件路径无效' });
        continue;
      }
      try {
        const stat = await fsp.stat(item.filePath);
        if (!stat.isFile()) throw new Error('原文件不存在');
        validFiles.push({
          index,
          item,
          source: item.filePath,
          fileName: sanitizePathSegment(path.basename(item.filePath), '课件文件'),
          subject: sanitizePathSegment(item.subject, '未分学科'),
          book: sanitizePathSegment(item.book, '未分教材'),
          chapter: sanitizePathSegment(item.chapter, '未分章节')
        });
      } catch (error) {
        skipped.push({ name: item.name || item.filePath, reason: error.message });
      }
    }
    if (!validFiles.length) {
      return { ok: false, error: '选中的文件均不可读取，无法打包下载' };
    }
    const usedArchiveNames = new Set();
    for (const entry of validFiles) {
      const ext = path.extname(entry.fileName);
      const base = path.basename(entry.fileName, ext);
      let fileName = entry.fileName;
      let index = 2;
      let relative = `${entry.subject}/${entry.book}/${entry.chapter}/${fileName}`;
      while (usedArchiveNames.has(relative.toLowerCase())) {
        fileName = `${base} (${index})${ext}`;
        relative = `${entry.subject}/${entry.book}/${entry.chapter}/${fileName}`;
        index += 1;
      }
      usedArchiveNames.add(relative.toLowerCase());
      archiveRelatives.set(entry.index, relative);
    }
    const csvHeader = ['课件名称', '学科', '教材', '章节', '课程分类', '标签', '备注', '原文件路径', '导出状态', '压缩包内路径'];
    const csvRows = items.map((item, index) => {
      const relative = archiveRelatives.get(index) || '';
      return [
        item.name, item.subject, item.book, item.chapter, item.type, item.tags, item.note, item.filePath,
        relative ? '已打包' : '未打包', relative
      ].map(escapeCsvCell).join(',');
    });
    try {
      await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    } catch (error) {
      return { ok: false, error: `无法创建下载目录：${error.message}` };
    }
    const output = fs.createWriteStream(targetPath);
    const archive = archiver('zip', { zlib: { level: 0 } });
    let outputClosed = false;
    const completed = new Promise((resolve, reject) => {
      output.on('close', () => {
        outputClosed = true;
        resolve();
      });
      output.on('error', reject);
      archive.on('error', reject);
      archive.on('warning', (error) => {
        if (error && error.code !== 'ENOENT') reject(error);
      });
    });
    try {
      archive.pipe(output);
      for (const entry of validFiles) {
        archive.file(entry.source, { name: archiveRelatives.get(entry.index) });
      }
      archive.append(`\ufeff${csvHeader.map(escapeCsvCell).join(',')}\r\n${csvRows.join('\r\n')}`, { name: '课件清单.csv' });
      await archive.finalize();
      await completed;
      const stat = await fsp.stat(targetPath);
      return {
        ok: true,
        filePath: targetPath,
        copied: validFiles.length,
        skipped,
        size: stat.size
      };
    } catch (error) {
      try {
        archive.abort();
      } catch (_) {
        /* 忽略终止压缩时的二次错误 */
      }
      if (!outputClosed) output.destroy();
      await fsp.unlink(targetPath).catch(() => {});
      return { ok: false, error: `打包下载失败：${error.message}` };
    }
  });

  ipcMain.handle('file:reveal', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      return { ok: false, error: '文件路径无效' };
    }
    try {
      const stat = await fsp.stat(filePath);
      if (!stat.isFile()) throw new Error('missing');
      shell.showItemInFolder(filePath);
      return { ok: true };
    } catch (error) {
      try {
        await shell.openPath(path.dirname(filePath));
        return { ok: false, error: '文件已缺失，已打开所在文件夹' };
      } catch (_) {
        return { ok: false, error: '文件与所在文件夹均不可用' };
      }
    }
  });

  ipcMain.handle('export:text', async (_event, options) => {
    const title = normalizeString(options && options.title, 100) || '导出文件';
    const defaultName = normalizeString(options && options.defaultName, 160) || 'export.txt';
    const content = typeof (options && options.content) === 'string' ? options.content : '';
    const result = await dialog.showSaveDialog(mainWindow, {
      title,
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: Array.isArray(options && options.filters) ? options.filters : [{ name: '文本文件', extensions: ['txt'] }]
    });
    if (result.canceled || !result.filePath) return { ok: true, canceled: true };
    try {
      await fsp.writeFile(result.filePath, content, 'utf8');
      return { ok: true, filePath: result.filePath };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:open-json', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择课件库数据备份',
      buttonLabel: '读取备份',
      properties: ['openFile'],
      filters: [{ name: 'JSON 数据备份', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { ok: true, canceled: true };
    try {
      const text = await fsp.readFile(result.filePaths[0], 'utf8');
      return { ok: true, text, filePath: result.filePaths[0] };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('app:info', () => ({
    ok: true,
    name: APP_NAME,
    version: APP_VERSION,
    dataDir: getDataDir(),
    libraryPath: getLibraryPath(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform
  }));

  ipcMain.handle('app:open-data-dir', async () => {
    await ensureDataDir();
    const errorMessage = await shell.openPath(getDataDir());
    return errorMessage ? { ok: false, error: errorMessage } : { ok: true };
  });

  ipcMain.handle('app:open-external', async (_event, url) => {
    if (typeof url !== 'string' || !/^(mailto:|https?:)/i.test(url)) {
      return { ok: false, error: '不支持的链接类型' };
    }
    try {
      await shell.openExternal(url);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('window:is-maximized', () => Boolean(mainWindow && mainWindow.isMaximized()));
  ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize());
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow && mainWindow.close());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 908,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    frame: false,
    roundedCorners: true,
    backgroundColor: '#f3f8ff',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html')).catch((error) => {
    console.error('页面加载失败：', error);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  const sendMaximizedState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized-state', mainWindow.isMaximized());
    }
  };
  mainWindow.on('maximize', sendMaximizedState);
  mainWindow.on('unmaximize', sendMaximizedState);
  mainWindow.on('enter-full-screen', sendMaximizedState);
  mainWindow.on('leave-full-screen', sendMaximizedState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current) event.preventDefault();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isDev && input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (captureArg) {
    setupCapture(mainWindow, captureArg.slice('--capture='.length));
  }
}

async function setupCapture(window, targetDir) {
  const pages = [
    { id: 'library', label: '课件库' },
    { id: 'catalog', label: '教材目录' },
    { id: 'types', label: '课程分类' },
    { id: 'data', label: '数据管理' }
  ];
  window.webContents.once('did-finish-load', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2400));
    await fsp.mkdir(targetDir, { recursive: true });
    for (const page of pages) {
      try {
        await window.webContents.executeJavaScript(
          `document.querySelector('[data-page="${page.id}"]')?.click(); true;`
        );
        await new Promise((resolve) => setTimeout(resolve, 700));
        const image = await window.webContents.capturePage();
        await fsp.writeFile(path.join(targetDir, `${page.id}.png`), image.toPNG());
      } catch (error) {
        console.error('capture failed', page.id, error);
      }
    }
    app.quit();
  });
}

function registerProtocol() {
  protocol.handle('cwfile', async (request) => {
    try {
      const url = new URL(request.url);
      const encoded = url.pathname.replace(/^\//, '');
      if (!encoded) return new Response('Not found', { status: 404 });
      const filePath = Buffer.from(encoded, 'base64url').toString('utf8');
      if (!path.isAbsolute(filePath)) return new Response('Forbidden', { status: 403 });
      const ext = fileExtension(filePath);
      if (!SUPPORTED_EXTS.has(ext)) return new Response('Forbidden', { status: 403 });
      const stat = await fsp.stat(filePath);
      if (!stat.isFile()) return new Response('Not found', { status: 404 });
      const response = await net.fetch(pathToFileURL(filePath).toString(), {
        headers: request.headers
      });
      const headers = new Headers(response.headers);
      if (MIME_BY_EXT[ext]) headers.set('Content-Type', MIME_BY_EXT[ext]);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      return new Response('Not found', { status: 404 });
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    registerProtocol();
    registerIpc();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }).catch((error) => {
    console.error('应用启动失败：', error);
  });

  app.on('render-process-gone', (event, webContents, details) => {
    console.error('渲染进程退出：', details);
  });
  process.on('uncaughtException', (error) => {
    console.error('未捕获异常：', error);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
