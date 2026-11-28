'use strict';

const { app, BrowserWindow, Tray, nativeImage, ipcMain, dialog, shell, protocol, net, Menu, screen, session, safeStorage, desktopCapturer } = require('electron');
const archiver = require('archiver');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const QRCode = require('qrcode');
const { WebSocketServer } = require('ws');
const selfsigned = require('selfsigned');
const https = require('node:https');
const os = require('node:os');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const execFileAsync = promisify(execFile);

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

const APP_NAME = '枣庄八中集成桌面教学系统';
const APP_VERSION = '2.3.1';
const UPDATE_REPO = 'BA4IIT/zzbz-courseware';
const UPDATE_API = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;
const BROWSER_HOME = 'https://zz8zszy.cn';
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

/* ---------------- 内置浏览器凭据（Windows DPAPI 加密） ---------------- */

function getCredentialPath() {
  return path.join(getDataDir(), 'browser-credentials.dat');
}

async function readBrowserCredentials() {
  try {
    const encoded = await fsp.readFile(getCredentialPath(), 'utf8');
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: '当前系统不支持安全凭据加密' };
    const decrypted = safeStorage.decryptString(Buffer.from(encoded.trim(), 'base64'));
    const parsed = JSON.parse(decrypted);
    return {
      ok: true,
      username: normalizeString(parsed.username, 200),
      password: normalizeString(parsed.password, 500),
      savedAt: normalizeString(parsed.savedAt, 40)
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') return { ok: true, username: '', password: '', savedAt: '' };
    return { ok: false, error: '读取保存的账号失败' };
  }
}

async function saveBrowserCredentials(username, password) {
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: '当前系统不支持安全凭据加密' };
  const payload = {
    username: normalizeString(username, 200),
    password: normalizeString(password, 500),
    savedAt: new Date().toISOString()
  };
  const encrypted = safeStorage.encryptString(JSON.stringify(payload)).toString('base64');
  await ensureDataDir();
  await atomicWrite(getCredentialPath(), encrypted);
  return { ok: true, savedAt: payload.savedAt };
}

/* ---------------- 版本检查与更新 ---------------- */

function versionParts(value) {
  return String(value || '').replace(/^v/i, '').split(/[.+-]/).map((part) => {
    const match = String(part).match(/^\d+/);
    return match ? Number(match[0]) : 0;
  });
}

function compareVersions(a, b) {
  const left = versionParts(a);
  const right = versionParts(b);
  const count = Math.max(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function fetchLatestRelease() {
  try {
    const response = await net.fetch(UPDATE_API, {
      headers: {
        'User-Agent': 'ZZBZ-Courseware-Updater',
        Accept: 'application/vnd.github+json'
      }
    });
    if (!response.ok) throw new Error(`GitHub 返回 ${response.status}`);
    return response.json();
  } catch (apiError) {
    // API 匿名额度耗尽时，退回 GitHub Release 网页，不依赖 60 次/小时的 REST 额度。
    const page = await net.fetch(`https://github.com/${UPDATE_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'Mozilla/5.0 ZZBZ-Courseware-Updater', Accept: 'text/html' }
    });
    if (!page.ok) throw apiError;
    const tag = decodeURIComponent(String(page.url || '').split('/releases/tag/')[1] || '').split(/[?#]/)[0];
    if (!tag) throw apiError;
    const version = tag.replace(/^v/i, '');
    const assetName = `zzbz-courseware-${version}-setup.exe`;
    return {
      tag_name: tag,
      html_url: page.url,
      body: '',
      assets: [{
        name: assetName,
        browser_download_url: `https://github.com/${UPDATE_REPO}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(assetName)}`
      }]
    };
  }
}

/* ---------------- U 盘检测 ---------------- */

function isDriveRoot(root) {
  return typeof root === 'string' && /^[A-Za-z]:[\\/]?$/.test(root);
}

async function listRemovableDrives() {
  const command = [
    '$ErrorActionPreference = "SilentlyContinue";',
    '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new();',
    'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=2" |',
    'Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress'
  ].join(' ');
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command
  ], { windowsHide: true, timeout: 20000, encoding: 'utf8' });
  const text = String(stdout || '').trim();
  if (!text) return [];
  const parsed = JSON.parse(text);
  const drives = Array.isArray(parsed) ? parsed : [parsed];
  return drives.map((drive) => {
    const id = normalizeString(drive.DeviceID, 4);
    if (!/^[A-Za-z]:$/.test(id)) return null;
    return {
      root: `${id}\\`,
      letter: id,
      name: normalizeString(drive.VolumeName, 80) || '可移动磁盘',
      size: Number(drive.Size) || 0,
      free: Number(drive.FreeSpace) || 0
    };
  }).filter(Boolean);
}

async function scanRemovableDrive(root) {
  if (!isDriveRoot(root)) return { ok: false, error: '磁盘路径无效' };
  if (!fs.existsSync(root)) return { ok: false, error: '该磁盘当前不可访问' };
  const findings = [];
  let scanned = 0;
  let truncated = false;
  const highRiskExts = new Set(['exe', 'scr', 'bat', 'cmd', 'com', 'pif', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'hta', 'ps1', 'reg', 'msi', 'jar']);
  const mediumRiskExts = new Set(['lnk', 'url', 'iso', 'img', 'vhd']);
  const maxFiles = 20000;
  const maxFindings = 300;
  const walk = async (dir, depth) => {
    if (scanned >= maxFiles || findings.length >= maxFindings || depth > 10) {
      if (scanned >= maxFiles || findings.length >= maxFindings) truncated = true;
      return;
    }
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries) {
      if (scanned >= maxFiles || findings.length >= maxFindings) {
        truncated = true;
        return;
      }
      const lower = entry.name.toLowerCase();
      if (lower === 'system volume information' || lower === '$recycle.bin' || lower === 'recycler') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      scanned += 1;
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      const isRootFile = path.dirname(fullPath).toLowerCase() === path.resolve(root).toLowerCase();
      let severity = '';
      let reason = '';
      if (entry.name.toLowerCase() === 'autorun.inf') {
        severity = 'high';
        reason = 'U 盘根目录存在 autorun.inf，可能被用于自动运行程序';
      } else if (/\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|mp3|mp4|avi)\.(exe|scr|bat|cmd|vbs|js|jse|wsf|hta|ps1)$/i.test(entry.name)) {
        severity = 'high';
        reason = '文件使用双扩展名伪装成普通文档';
      } else if (isRootFile && highRiskExts.has(ext)) {
        severity = 'high';
        reason = 'U 盘根目录存在可直接执行的程序或脚本';
      } else if (highRiskExts.has(ext)) {
        severity = 'medium';
        reason = '可执行程序或脚本，请在确认来源后打开';
      } else if (mediumRiskExts.has(ext)) {
        severity = 'low';
        reason = '快捷方式/镜像文件，可能指向外部程序';
      }
      if (severity) {
        try {
          const stat = await fsp.stat(fullPath);
          findings.push({
            path: fullPath,
            name: entry.name,
            size: stat.size,
            severity,
            reason
          });
        } catch (_) {
          /* 文件在扫描过程中被移除时跳过 */
        }
      }
    }
  };
  await walk(path.resolve(root), 0);
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => (order[a.severity] - order[b.severity]) || a.path.localeCompare(b.path));
  return { ok: true, root, scanned, findings, truncated };
}

/* ---------------- 课程表 ---------------- */

function defaultTimetable() {
  const periods = Array.from({ length: 8 }, (_, index) => ({
    id: `p${index + 1}`,
    label: `第${index + 1}节`,
    time: '',
    mon: '', tue: '', wed: '', thu: '', fri: '',
    satA: '', satB: '', sunA: '', sunB: ''
  }));
  return { periods, updatedAt: new Date().toISOString() };
}

function normalizeTimetable(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.periods) || !raw.periods.length) return defaultTimetable();
  const periods = raw.periods.slice(0, 12).map((period, index) => ({
    id: normalizeString(period && period.id, 40) || `p${index + 1}`,
    label: normalizeString(period && period.label, 40) || `第${index + 1}节`,
    time: normalizeString(period && period.time, 60),
    mon: normalizeString(period && period.mon, 80),
    tue: normalizeString(period && period.tue, 80),
    wed: normalizeString(period && period.wed, 80),
    thu: normalizeString(period && period.thu, 80),
    fri: normalizeString(period && period.fri, 80),
    satA: normalizeString(period && period.satA, 80),
    satB: normalizeString(period && period.satB, 80),
    sunA: normalizeString(period && period.sunA, 80),
    sunB: normalizeString(period && period.sunB, 80)
  }));
  return {
    periods,
    updatedAt: normalizeString(raw.updatedAt, 40) || new Date().toISOString()
  };
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

function normalizeSubjectVotes(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result = {};
  Object.keys(raw).slice(0, 400).forEach((date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const day = raw[date];
    if (!day || typeof day !== 'object' || Array.isArray(day)) return;
    const counts = {};
    Object.keys(day).slice(0, 30).forEach((subjectId) => {
      const key = normalizeString(subjectId, 40);
      const value = Math.max(0, Math.min(99999, Math.floor(Number(day[subjectId]) || 0)));
      if (key && value) counts[key] = value;
    });
    if (Object.keys(counts).length) result[date] = counts;
  });
  return result;
}

function normalizeStudents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 500).map((student, index) => {
    if (!student || typeof student !== 'object') return null;
    const name = normalizeString(student.name, 40);
    if (!name) return null;
    return {
      id: normalizeString(student.id, 80) || `student-${index + 1}`,
      name,
      weight: Math.max(1, Math.min(20, Math.floor(Number(student.weight) || 1))),
      pickedCount: Math.max(0, Math.floor(Number(student.pickedCount) || 0)),
      lastPickedAt: normalizeString(student.lastPickedAt, 40)
    };
  }).filter(Boolean);
}

function parseStudentSheet(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (!rows.length) return [];
  let headerIndex = -1;
  let nameIndex = 0;
  let weightIndex = 1;
  for (let index = 0; index < Math.min(rows.length, 8); index += 1) {
    const cells = (rows[index] || []).map((cell) => String(cell || '').trim());
    const nameCell = cells.findIndex((cell) => /姓名|名字|学生|name|student/i.test(cell));
    if (nameCell !== -1) {
      headerIndex = index;
      nameIndex = nameCell;
      const weightCell = cells.findIndex((cell) => /权重|选中率|概率|weight|rate/i.test(cell));
      weightIndex = weightCell === -1 ? nameIndex + 1 : weightCell;
      break;
    }
  }
  const students = [];
  const seen = new Set();
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const cells = (rows[index] || []).map((cell) => String(cell || '').trim());
    let name = cells[nameIndex] || '';
    if (!name) {
      name = cells.find((cell) => cell && !/^\d+(\.\d+)?$/.test(cell) && !/姓名|名字|学生|name/i.test(cell)) || '';
    }
    name = normalizeString(name, 40);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const weightRaw = Number(cells[weightIndex]);
    const weight = Number.isFinite(weightRaw) && weightRaw >= 1 ? Math.min(20, Math.floor(weightRaw)) : 1;
    students.push({ name, weight });
    if (students.length >= 500) break;
  }
  return students;
}

function normalizeWordGameScores(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 500).map((entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const nickname = normalizeString(entry.nickname, 24);
    const total = Math.max(1, Math.min(1000, Math.floor(Number(entry.total) || 0)));
    const correct = Math.max(0, Math.min(total, Math.floor(Number(entry.correct) || 0)));
    if (!nickname || !total) return null;
    return {
      nickname,
      total,
      correct,
      duration: Math.max(0, Math.min(86400, Math.floor(Number(entry.duration) || 0))),
      date: normalizeString(entry.date, 40)
    };
  }).filter(Boolean);
}

const FEATURE_KEYS = [
  'vocab', 'questions', 'ai', 'wordgame', 'graph', 'calculator', 'politics',
  'camera', 'whiteboard', 'annotation', 'browser', 'timetable', 'usb',
  'vote', 'students', 'phone', 'timer', 'clock', 'volume', 'englishexam', 'englishweb'
];

const DEFAULT_WIDGET_ITEMS = [
  { page: 'whiteboard', label: '白板' },
  { page: 'camera', label: '展台' },
  { page: 'annotation', label: '批注' }
];

function normalizeFeatureSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const result = {};
  FEATURE_KEYS.forEach((key) => { result[key] = source[key] !== false; });
  return result;
}

function normalizeWidgetSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const sourceItems = Array.isArray(source.items) ? source.items : DEFAULT_WIDGET_ITEMS;
  const items = sourceItems
    .slice(0, 8)
    .map((item) => ({
      page: normalizeString(item && item.page, 40),
      label: normalizeString(item && item.label, 12)
    }))
    .filter((item) => item.page);
  return {
    enabled: source.enabled !== false,
    items,
    size: Math.max(180, Math.min(360, Math.round(Number(source.size) || 220)))
  };
}

function normalizeLibrary(payload) {
  const rawItems = payload && Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.map(normalizeItem).filter(Boolean).slice(0, 20000);
  const rawQuestions = payload && Array.isArray(payload.questions) ? payload.questions : [];
  const questions = rawQuestions.map(normalizeQuestion).filter(Boolean).slice(0, 5000);
  const rawSettings = payload && payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
  return {
    version: 5,
    school: '枣庄市第八中学',
    updatedAt: new Date().toISOString(),
    settings: {
      initialized: Boolean(rawSettings.initialized),
      demoDismissed: Boolean(rawSettings.demoDismissed),
      lastSubject: normalizeString(rawSettings.lastSubject, 40),
      theme: 'light-blue',
      ai: {
        model: ['deepseek-chat', 'deepseek-reasoner'].includes(rawSettings.ai && rawSettings.ai.model)
          ? rawSettings.ai.model
          : 'deepseek-chat',
        reasoning: ['fast', 'standard', 'deep'].includes(rawSettings.ai && rawSettings.ai.reasoning)
          ? rawSettings.ai.reasoning
          : 'standard'
      },
      danmaku: {
        enabled: rawSettings.danmaku && rawSettings.danmaku.enabled !== false,
        speed: Math.max(20, Math.min(100, Math.floor(Number(rawSettings.danmaku && rawSettings.danmaku.speed) || 45))),
        fontSize: Math.max(12, Math.min(30, Math.floor(Number(rawSettings.danmaku && rawSettings.danmaku.fontSize) || 18)))
      },
      features: normalizeFeatureSettings(rawSettings.features),
      adminPassword: normalizeString(rawSettings.adminPassword, 40) || '6767',
      clockFloatSize: Math.max(160, Math.min(480, Math.round(Number(rawSettings.clockFloatSize) || 260))),
      widget: normalizeWidgetSettings(rawSettings.widget)
    },
    items,
    questions,
    timetable: normalizeTimetable(payload && payload.timetable),
    subjectVotes: normalizeSubjectVotes(payload && payload.subjectVotes),
    students: normalizeStudents(payload && payload.students),
    wordGameScores: normalizeWordGameScores(payload && payload.wordGameScores)
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
      timetable: normalizeTimetable(parsed.timetable),
      subjectVotes: normalizeSubjectVotes(parsed.subjectVotes),
      students: normalizeStudents(parsed.students),
      wordGameScores: normalizeWordGameScores(parsed.wordGameScores),
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
        timetable: defaultTimetable(),
        subjectVotes: {},
        students: [],
        wordGameScores: [],
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
      timetable: defaultTimetable(),
      subjectVotes: {},
      students: [],
      wordGameScores: [],
      settings: {},
      updatedAt: '',
      dataDir: getDataDir(),
      libraryPath: getLibraryPath(),
      warning: '数据文件读取异常，已备份原文件并启用空课件库。',
      backupPath
    };
  }
}

function getAiKeyPath() {
  return path.join(getDataDir(), 'deepseek-key.dat');
}

async function readAiKey() {
  try {
    const encoded = await fsp.readFile(getAiKeyPath(), 'utf8');
    if (!encoded) return { ok: true, key: '' };
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: '当前系统不支持安全密钥存储' };
    return { ok: true, key: safeStorage.decryptString(Buffer.from(encoded, 'base64')) };
  } catch (error) {
    if (error && error.code === 'ENOENT') return { ok: true, key: '' };
    return { ok: false, error: '读取 DeepSeek API Key 失败' };
  }
}

async function saveAiKey(rawKey) {
  const key = normalizeString(rawKey, 300);
  if (!key) return { ok: false, error: 'API Key 不能为空' };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: '当前系统不支持安全密钥存储' };
  await ensureDataDir();
  const encrypted = safeStorage.encryptString(key).toString('base64');
  await atomicWrite(getAiKeyPath(), encrypted);
  return { ok: true };
}

async function askDeepSeek(payload) {
  const request = payload && typeof payload === 'object' ? payload : { question: payload };
  const text = normalizeString(request.question, 12000);
  if (text.length < 1) return { ok: false, error: '请输入问题' };
  const requestedModel = ['deepseek-chat', 'deepseek-reasoner'].includes(request.model) ? request.model : 'deepseek-chat';
  const reasoning = ['fast', 'standard', 'deep'].includes(request.reasoning) ? request.reasoning : 'standard';
  const model = reasoning === 'deep' ? 'deepseek-reasoner' : requestedModel;
  const maxTokens = Math.max(300, Math.min(8000, Number(request.maxTokens) || (reasoning === 'fast' ? 900 : reasoning === 'deep' ? 3600 : 1800)));
  const temperature = reasoning === 'fast' ? 0.5 : reasoning === 'deep' ? 0.2 : 0.35;
  const systemPrompt = reasoning === 'deep'
    ? '你是枣庄八中集成桌面教学系统的 AI 教学助手。请先分析问题的关键条件，再给出严谨、分步骤的解答；涉及公式时写清推导，涉及事实时不要编造，最后给出简明结论。'
    : '你是枣庄八中集成桌面教学系统的 AI 教学助手。请用简洁、准确、适合高中生理解的中文回答；涉及解题时先给思路，再给关键步骤，不要编造教材页码或事实。';
  const stored = await readAiKey();
  if (!stored.ok) return stored;
  if (!stored.key) return { ok: false, error: '请先填写并保存 DeepSeek API Key' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 70000);
  try {
    const response = await net.fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stored.key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]
      }),
      signal: controller.signal
    });
    const raw = await response.text();
    let data = null;
    try { data = JSON.parse(raw); } catch (error) { /* 非 JSON 响应 */ }
    if (!response.ok) {
      const apiMessage = data && data.error && data.error.message ? data.error.message : `HTTP ${response.status}`;
      if (response.status === 401) return { ok: false, error: 'DeepSeek API Key 无效或已失效。' };
      if (response.status === 402) return { ok: false, error: 'DeepSeek 账户余额不足，请充值后重试。' };
      if (response.status === 429) return { ok: false, error: 'DeepSeek 请求过于频繁，请稍后再试。' };
      return { ok: false, error: `DeepSeek 返回：${apiMessage}` };
    }
    const answer = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : '';
    if (!answer) return { ok: false, error: 'DeepSeek 没有返回有效回答。' };
    return { ok: true, answer };
  } catch (error) {
    if (error && error.name === 'AbortError') return { ok: false, error: 'AI 回答超时，请稍后重试。' };
    return { ok: false, error: `AI 请求失败：${error.message}` };
  } finally {
    clearTimeout(timer);
  }
}

let phoneCast = null;
let widgetWindow = null;
let clockWindow = null;
let annotationWindow = null;
let tray = null;
let isQuitting = false;
let widgetConfig = { enabled: false, items: [], size: 220 };

function getLanAddress() {
  const candidates = [];
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== 'IPv4' || entry.internal) return;
      if (/^169\.254\./.test(entry.address)) return;
      candidates.push(entry.address);
    });
  });
  return candidates.find((address) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address))
    || candidates[0]
    || '127.0.0.1';
}

async function stopPhoneCast() {
  if (!phoneCast) return;
  const current = phoneCast;
  phoneCast = null;
  try { current.wss.clients.forEach((client) => client.terminate()); } catch (error) { /* ignore */ }
  try { current.wss.close(); } catch (error) { /* ignore */ }
  try { current.server.close(); } catch (error) { /* ignore */ }
}

async function startPhoneCast() {
  if (phoneCast) {
    return { ok: true, url: phoneCast.url, qr: phoneCast.qr, ip: phoneCast.ip, port: phoneCast.port };
  }
  const ip = getLanAddress();
  const token = crypto.randomBytes(18).toString('hex');
  const pems = selfsigned.generate(
    [{ name: 'commonName', value: ip || 'localhost' }],
    { days: 365, keySize: 2048, algorithm: 'sha256' }
  );
  const page = await fsp.readFile(path.join(__dirname, 'src', 'phone-cast.html'), 'utf8');
  const server = https.createServer({ key: pems.private, cert: pems.cert }, (req, res) => {
    let parsed;
    try { parsed = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`); } catch (error) { parsed = null; }
    if (parsed && parsed.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (!parsed || parsed.pathname !== '/' || parsed.searchParams.get('t') !== token) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('投屏码无效，请重新扫描电脑上的二维码。');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(page);
  });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4 * 1024 * 1024 });
  wss.on('connection', (socket, request) => {
    let parsed;
    try { parsed = new URL(request.url || '/', `https://${request.headers.host || 'localhost'}`); } catch (error) { parsed = null; }
    if (!parsed || parsed.searchParams.get('t') !== token) {
      socket.close();
      return;
    }
    socket.on('message', (data) => {
      const raw = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/i.test(raw) || raw.length > 3 * 1024 * 1024) return;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('phone:frame', raw);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '0.0.0.0', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  const port = server.address().port;
  const url = `https://${ip}:${port}/?t=${token}`;
  const qr = await QRCode.toDataURL(url, {
    width: 280,
    margin: 1,
    color: { dark: '#1f5f91', light: '#ffffff' }
  });
  phoneCast = { server, wss, token, url, qr, ip, port };
  return { ok: true, url, qr, ip, port };
}

async function readAiAttachment(requestedPath) {
  let filePath = typeof requestedPath === 'string' && path.isAbsolute(requestedPath) ? requestedPath : '';
  if (!filePath) {
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: '选择要附加给 AI 的文件',
      properties: ['openFile'],
      filters: [
        { name: '文档', extensions: ['txt', 'md', 'csv', 'json', 'log', 'pdf', 'docx', 'xlsx', 'xls'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (picked.canceled || !picked.filePaths[0]) return { ok: true, canceled: true };
    filePath = picked.filePaths[0];
  }
  const ext = path.extname(filePath).toLowerCase();
  try {
    let text = '';
    if (ext === '.pdf') {
      const parsed = await pdfParse(await fsp.readFile(filePath));
      text = parsed.text || '';
    } else if (ext === '.docx') {
      const parsed = await mammoth.extractRawText({ buffer: await fsp.readFile(filePath) });
      text = parsed.value || '';
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath, { cellDates: false });
      text = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        return `工作表：${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
      }).join('\n\n');
    } else if (['.txt', '.md', '.csv', '.json', '.log'].includes(ext)) {
      text = await fsp.readFile(filePath, 'utf8');
    } else {
      return { ok: false, error: '暂不支持该文件类型，请上传 PDF、Word、Excel、TXT 或 Markdown。' };
    }
    text = text.replace(/\u0000/g, '').trim();
    if (!text) return { ok: false, error: '文件中没有可读取的文字。' };
    const maxChars = 24000;
    return {
      ok: true,
      name: path.basename(filePath),
      text: text.slice(0, maxChars),
      truncated: text.length > maxChars
    };
  } catch (error) {
    return { ok: false, error: `读取文件失败：${error.message}` };
  }
}

const OCR_SCRIPT = String.raw`param([string]$Path)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.DataWriter, Windows.Foundation, ContentType=WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*' })[0]
function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
Add-Type -AssemblyName System.Drawing
$sourceImage = [System.Drawing.Bitmap]::FromFile($Path)
$scale = if ($sourceImage.Width -lt 1600 -or $sourceImage.Height -lt 1000) { 2 } else { 1 }
$targetWidth = [Math]::Min(4200, [Math]::Max(1, [int]($sourceImage.Width * $scale)))
$targetHeight = [Math]::Min(4200, [Math]::Max(1, [int]($sourceImage.Height * $scale)))
$prepared = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight)
$graphics = [System.Drawing.Graphics]::FromImage($prepared)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.DrawImage($sourceImage, 0, 0, $targetWidth, $targetHeight)
$graphics.Dispose()
$sourceImage.Dispose()
$memory = [System.IO.MemoryStream]::new()
$prepared.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
$prepared.Dispose()
$bytes = $memory.ToArray()
$memory.Dispose()
$stream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
$writer = [Windows.Storage.Streams.DataWriter]::new($stream)
$writer.WriteBytes($bytes)
$null = Await ($writer.StoreAsync()) ([uint32])
$writer.DetachStream() | Out-Null
$stream.Seek(0)
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) { Write-Output 'NO_ENGINE'; exit 2 }
$result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
Write-Output $result.Text
`;

async function ocrImageFile(requestedPath) {
  let filePath = typeof requestedPath === 'string' && path.isAbsolute(requestedPath) ? requestedPath : '';
  if (!filePath) {
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: '选择要识别文字的照片',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tif', 'tiff'] }]
    });
    if (picked.canceled || !picked.filePaths[0]) return { ok: true, canceled: true };
    filePath = picked.filePaths[0];
  }
  filePath = filePath.replace(/\//g, '\\');
  const scriptPath = path.join(RUNTIME_DIR, 'ocr.ps1');
  try {
    await fsp.writeFile(scriptPath, OCR_SCRIPT, 'utf8');
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Path', filePath
    ], { timeout: 90000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    const text = String(stdout || '').replace(/NO_ENGINE/g, '').trim();
    if (!text) {
      return { ok: false, error: '没有识别到文字，请换一张更清晰的照片，或确认 Windows 已安装中文 OCR 语言包。' };
    }
    return { ok: true, name: path.basename(filePath), text: text.slice(0, 16000), imagePath: filePath };
  } catch (error) {
    return { ok: false, error: `照片识别失败：${error.message}` };
  }
}

const POLITICS_FEEDS = [
  { source: '人民网·时政', url: 'https://www.people.com.cn/rss/politics.xml' },
  { source: '新华网·时政', url: 'https://www.xinhuanet.com/politics/news_politics.xml' },
  { source: '中国新闻网', url: 'https://www.chinanews.com.cn/rss/scroll-news.xml' },
  { source: '中国新闻网·国内', url: 'https://www.chinanews.com.cn/rss/china.xml' },
  { source: '人民网·国际', url: 'https://www.people.com.cn/rss/world.xml' },
  { source: '新华网·国际', url: 'https://www.xinhuanet.com/world/news_world.xml' },
  { source: '中国政府网', url: 'https://www.gov.cn/pushinfo/v150203/rss.xml' }
];

async function fetchXinhuaPoliticsPage() {
  const response = await net.fetch('https://www.news.cn/politics/', {
    headers: { 'User-Agent': 'Mozilla/5.0 ZZBZ-Courseware-News', Accept: 'text/html' }
  });
  if (!response.ok) throw new Error(`新华网 ${response.status}`);
  const html = await response.text();
  const items = [];
  const seen = new Set();
  const pattern = /<a\b[^>]*href=['"]([^'"]*\/20\d{6}\/[^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) && items.length < 120) {
    const href = match[1];
    const title = stripXmlTags(match[2]);
    if (!title || title.length < 8) continue;
    const dateMatch = href.match(/\/20(\d{2})(\d{2})(\d{2})\//);
    if (!dateMatch) continue;
    const key = title.replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    const published = new Date(`20${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00+08:00`);
    if (Number.isNaN(published.getTime())) continue;
    let link;
    try { link = new URL(href, 'https://www.news.cn/politics/').toString(); } catch (error) { continue; }
    items.push({
      title,
      link,
      description: '',
      source: '新华网',
      publishedAt: published.toISOString()
    });
  }
  return items;
}

const POLITICS_EXAM_KEYWORDS = [
  '经济', '政治', '文化', '社会', '生态', '绿色', '发展', '改革', '开放', '创新', '科技',
  '法治', '依法', '党', '人民', '民主', '治理', '现代化', '高质量', '乡村', '振兴',
  '民生', '教育', '就业', '医疗', '养老', '粮食', '安全', '国际', '外交', '命运共同体',
  '一带一路', '全球', '和平', '合作', '贸易', '市场', '企业', '民营', '消费', '投资',
  '金融', '财政', '税', '环境', '碳', '能源', '文化自信', '传统', '精神', '文明',
  '青年', '基层', '制度', '法律', '宪法', '政府', '人大', '政协', '民族', '宗教',
  '统一', '港澳台', '国防', '共同富裕', '人民至上', '全过程人民民主'
];

const POLITICS_NEGATIVE_KEYWORDS = [
  '娱乐', '明星', '演唱会', '影视', '综艺', '八卦', '绯闻', '网红', '游戏',
  '足球', '篮球', '排球', '网球', '乒乓球', '体育比赛', '联赛', '夺冠',
  '判刑', '抓获', '嫌犯', '命案', '车祸', '醉驾', '赌博', '诈骗'
];

function stripXmlTags(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssItems(xml, source) {
  const items = [];
  const matches = String(xml || '').match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const block of matches.slice(0, 140)) {
    const read = (tag) => {
      const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? stripXmlTags(match[1]) : '';
    };
    const title = read('title');
    const link = read('link') || (block.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '';
    const description = read('description') || read('summary');
    const dateText = read('pubDate') || read('updated') || read('published');
    if (!title || !link || !dateText) continue;
    const publishedAt = new Date(dateText);
    // 没有合法发布时间的条目直接排除，不能用抓取时间冒充新闻发布时间。
    if (Number.isNaN(publishedAt.getTime())) continue;
    items.push({
      title,
      link,
      description: description.slice(0, 500),
      source,
      publishedAt: publishedAt.toISOString()
    });
  }
  return items;
}

async function fetchPoliticalNews(days) {
  const now = Date.now();
  const since = now - Math.max(1, Math.min(180, Number(days) || 7)) * 24 * 60 * 60 * 1000;
  const results = await Promise.allSettled([
    ...POLITICS_FEEDS.map(async (feed) => {
      const response = await net.fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 ZZBZ-Courseware-News', Accept: 'application/rss+xml,text/xml,text/html' }
      });
      if (!response.ok) throw new Error(`${feed.source} RSS ${response.status}`);
      return parseRssItems(await response.text(), feed.source);
    }),
    fetchXinhuaPoliticsPage()
  ]);
  const seen = new Set();
  const items = [];
  results.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    result.value.forEach((item) => {
      const key = item.title.replace(/\s+/g, '');
      if (seen.has(key)) return;
      const time = new Date(item.publishedAt).getTime();
      // 严格限制在电脑当前时间往前推算的范围内，未来时间和超期新闻不展示。
      if (!Number.isFinite(time) || time < since || time > now + 5 * 60 * 1000) return;
      seen.add(key);
      items.push(item);
    });
  });
  return items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 180);
}

function keywordChapterMatch(item, chapters) {
  const text = `${item.title} ${item.description}`;
  let best = null;
  let bestScore = 0;
  chapters.forEach((chapter) => {
    const words = String(chapter)
      .replace(/^(第[一二三四五六七八九十百]+[课单元章节]|必修|选择性必修|选择性|单元|专题)/g, '')
      .split(/[、，,：:；;（）()\s]+/)
      .filter((word) => word.length >= 2);
    const score = words.reduce((sum, word) => sum + (text.includes(word) ? word.length : 0), 0);
    if (score > bestScore) { bestScore = score; best = chapter; }
  });
  return bestScore > 0 ? best : '综合';
}

function politicsExamScore(item, chapters) {
  const text = `${item.title} ${item.description || ''}`;
  const negative = POLITICS_NEGATIVE_KEYWORDS.filter((word) => text.includes(word));
  if (negative.length >= 2) return -1;
  const hits = POLITICS_EXAM_KEYWORDS.filter((word) => text.includes(word));
  const chapterWords = chapters.flatMap((chapter) => String(chapter)
    .replace(/^(第[一二三四五六七八九十百]+[课单元章节]|必修|选择性必修|选择性|单元|专题)/g, '')
    .split(/[、，,：:；;（）()\s]+/)
    .filter((word) => word.length >= 2));
  const chapterHits = [...new Set(chapterWords)].filter((word) => text.includes(word));
  return hits.length * 2 + chapterHits.reduce((sum, word) => sum + word.length, 0);
}

function fallbackExamPoint(item, chapter) {
  const text = `${item.title} ${item.description || ''}`;
  const hits = POLITICS_EXAM_KEYWORDS.filter((word) => text.includes(word)).slice(0, 3);
  if (hits.length) return `可结合「${hits.join('、')}」考查`;
  return chapter && chapter !== '综合' ? `对应「${chapter}」` : '可作为时政背景材料';
}

function rankPoliticalNews(items, chapters) {
  return items
    .map((item) => ({ item, score: politicsExamScore(item, chapters) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.item.publishedAt) - new Date(a.item.publishedAt);
    })
    .map((entry) => entry.item);
}

function extractAiJson(text) {
  const source = String(text || '').replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const start = source.indexOf('[');
  const end = source.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(source.slice(start, end + 1)); } catch (error) { return null; }
}

async function analyzePoliticalNews(items, chapters, model, reasoning) {
  const compact = items.map((item, index) => ({
    index,
    title: item.title,
    summary: String(item.description || '').slice(0, 110)
  }));
  const prompt = `你是高中政治时事政治备课助手，要为学生筛选“像高考政治材料题/时政热点”的新闻。\n\n优先主题：经济高质量发展、民营经济与市场、科技创新、乡村振兴与民生、生态文明与双碳、文化自信与传统文化、全过程人民民主与基层治理、依法治国与宪法、党的建设、民族宗教与统一战线、国家安全、中国特色大国外交、人类命运共同体、一带一路、全球治理。\n排除：娱乐八卦、明星绯闻、体育赛事、演唱会影视综艺、普通刑事案件、交通事故、赌博诈骗等与高考政治主干知识关系不大的内容。\n\n可选章节：\n${chapters.map((chapter, index) => `${index + 1}. ${chapter}`).join('\n')}\n\n新闻列表（JSON）：\n${JSON.stringify(compact)}\n\n请严格输出 JSON 数组，不要输出其他文字，按“高考命题相关性”从高到低排序。每项格式：{"index":新闻序号,"chapter":"最对应的章节原文","summary":"不超过90字的新闻要点","examPoint":"可能考查的知识点或设问角度，不超过45字"}。最多45条；只保留与高中政治教材或高考时政热点相关的新闻；不要编造新闻、链接或事实。`;
  const result = await askDeepSeek({
    question: prompt,
    model: model || 'deepseek-chat',
    reasoning: reasoning || 'standard',
    maxTokens: 5000
  });
  if (!result.ok) return { ok: false, error: result.error };
  const parsed = extractAiJson(result.answer);
  if (!Array.isArray(parsed)) return { ok: false, error: 'AI 返回格式无法解析' };
  return { ok: true, data: parsed };
}

function normalizeWidgetConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const items = (Array.isArray(source.items) ? source.items : [])
    .slice(0, 8)
    .map((item) => ({
      page: normalizeString(item && item.page, 40),
      label: normalizeString(item && item.label, 12)
    }))
    .filter((item) => item.page);
  return {
    enabled: Boolean(source.enabled),
    items,
    size: Math.max(180, Math.min(360, Math.round(Number(source.size) || 220)))
  };
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (widgetConfig.enabled && widgetConfig.items.length) applyWidgetConfig(widgetConfig);
}

function openAnnotationOverlay() {
  if (annotationWindow && !annotationWindow.isDestroyed()) {
    annotationWindow.show();
    annotationWindow.focus();
    return;
  }
  const display = screen.getPrimaryDisplay();
  annotationWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'annotation-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  annotationWindow.setAlwaysOnTop(true, 'screen-saver');
  annotationWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  annotationWindow.loadFile(path.join(__dirname, 'src', 'annotation-overlay.html')).catch(() => {});
  annotationWindow.once('ready-to-show', () => annotationWindow.show());
  annotationWindow.on('closed', () => { annotationWindow = null; });
}

function createTray() {
  if (tray && !tray.isDestroyed()) return;
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
    tray = new Tray(icon.resize({ width: 32, height: 32 }));
    tray.setToolTip(APP_NAME);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '显示主界面', click: showMainWindow },
      { label: '隐藏到托盘', click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
        if (widgetWindow && !widgetWindow.isDestroyed()) { widgetWindow.destroy(); widgetWindow = null; }
      } },
      { type: 'separator' },
      { label: '退出软件', click: () => { isQuitting = true; app.quit(); } }
    ]));
    tray.on('double-click', showMainWindow);
    tray.on('click', showMainWindow);
  } catch (error) {
    console.error('托盘创建失败：', error);
  }
}

function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) return widgetWindow;
  const display = screen.getPrimaryDisplay();
  const size = Math.max(180, Math.min(360, Math.round(Number(widgetConfig.size) || 220)));
  widgetWindow = new BrowserWindow({
    width: size,
    height: size,
    x: display.workArea.x + display.workArea.width - size - 18,
    y: display.workArea.y + display.workArea.height - size - 18,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'widget-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  widgetWindow.loadFile(path.join(__dirname, 'src', 'widget.html')).catch(() => {});
  widgetWindow.on('closed', () => { widgetWindow = null; });
  return widgetWindow;
}

function showMainPage(page, options) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (page) mainWindow.webContents.send('app:navigate', {
    page: normalizeString(page, 40),
    fullscreen: Boolean(options && options.fullscreen)
  });
}

function applyWidgetConfig(raw) {
  widgetConfig = normalizeWidgetConfig(raw);
  if (!widgetConfig.enabled || !widgetConfig.items.length) {
    if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.hide();
    return;
  }
  const win = createWidgetWindow();
  if (win && !win.isDestroyed()) {
    const size = widgetConfig.size;
    const [currentWidth, currentHeight] = win.getSize();
    if (currentWidth !== size || currentHeight !== size) {
      // Windows 下 resizable:false 的窗口可能只能放大不能缩小，临时恢复可调尺寸。
      const wasResizable = win.isResizable();
      if (!wasResizable) win.setResizable(true);
      win.setMinimumSize(200, 200);
      win.setSize(size, size);
      if (!wasResizable) win.setResizable(false);
      const display = screen.getPrimaryDisplay();
      win.setPosition(
        display.workArea.x + display.workArea.width - size - 18,
        display.workArea.y + display.workArea.height - size - 18
      );
    }
  }
  const send = () => {
    if (win && !win.isDestroyed()) win.webContents.send('widget:config', widgetConfig);
  };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send);
  else send();
  win.showInactive();
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

  ipcMain.handle('file:save-png', async (_event, options) => {
    const dataUrl = typeof (options && options.dataUrl) === 'string' ? options.dataUrl : '';
    const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return { ok: false, error: '图片数据无效' };
    const defaultName = normalizeString(options && options.defaultName, 160) || 'whiteboard.png';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存白板图片',
      defaultPath: path.join(app.getPath('pictures'), defaultName),
      filters: [{ name: 'PNG 图片', extensions: ['png'] }]
    });
    if (result.canceled || !result.filePath) return { ok: true, canceled: true };
    try {
      const buffer = Buffer.from(match[1], 'base64');
      if (buffer.length > 80 * 1024 * 1024) return { ok: false, error: '图片文件过大' };
      await fsp.writeFile(result.filePath, buffer);
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

  ipcMain.handle('students:import', async (_event, requestedPath) => {
    let filePath = typeof requestedPath === 'string' && path.isAbsolute(requestedPath) ? requestedPath : '';
    if (!filePath) {
      const picked = await dialog.showOpenDialog(mainWindow, {
        title: '导入学生名单',
        buttonLabel: '导入名单',
        properties: ['openFile'],
        filters: [
          { name: '表格文件', extensions: ['xlsx', 'xls', 'csv'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      if (picked.canceled || !picked.filePaths[0]) return { ok: true, canceled: true };
      filePath = picked.filePaths[0];
    }
    try {
      if (!/\.(xlsx|xls|csv)$/i.test(filePath)) return { ok: false, error: '只支持 .xlsx、.xls 或 .csv 表格文件' };
      const students = parseStudentSheet(filePath);
      if (!students.length) return { ok: false, error: '表格中没有读取到学生姓名，请确认第一列为姓名或包含「姓名」表头。' };
      return { ok: true, students, filePath };
    } catch (error) {
      return { ok: false, error: `读取表格失败：${error.message}` };
    }
  });

  ipcMain.handle('ai:key-status', async () => {
    const result = await readAiKey();
    return { ok: result.ok, hasKey: Boolean(result.ok && result.key) };
  });
  ipcMain.handle('ai:save-key', async (_event, key) => {
    try {
      return await saveAiKey(key);
    } catch (error) {
      return { ok: false, error: `保存 API Key 失败：${error.message}` };
    }
  });
  ipcMain.handle('ai:clear-key', async () => {
    await fsp.unlink(getAiKeyPath()).catch(() => {});
    return { ok: true };
  });
  ipcMain.handle('ai:ask', async (_event, payload) => askDeepSeek(payload));
  ipcMain.handle('ai:read-file', async (_event, filePath) => readAiAttachment(filePath));
  ipcMain.handle('ocr:image', async (_event, filePath) => ocrImageFile(filePath));
  ipcMain.handle('politics:search', async (_event, payload) => {
    const days = Math.max(1, Math.min(180, Number(payload && payload.days) || 7));
    const chapters = (Array.isArray(payload && payload.chapters) ? payload.chapters : [])
      .map((chapter) => normalizeString(chapter, 160))
      .filter(Boolean)
      .slice(0, 120);
    try {
      const news = await fetchPoliticalNews(days);
      if (!news.length) return { ok: false, error: '暂时没有抓取到最近新闻，请检查网络后重试。' };
      const targetChapters = chapters.length ? chapters : ['综合'];
      const ranked = rankPoliticalNews(news, targetChapters);
      const candidates = (ranked.length >= 8 ? ranked : news).slice(0, 60);
      const keyResult = await readAiKey();
      let aiUsed = false;
      let warning = '';
      let data = [];
      if (keyResult.ok && keyResult.key) {
        const analyzed = await analyzePoliticalNews(candidates, targetChapters, payload && payload.model, payload && payload.reasoning);
        if (analyzed.ok) {
          data = analyzed.data;
          aiUsed = true;
        } else {
          warning = `AI 章节分析未完成：${analyzed.error}。已使用关键词匹配。`;
        }
      } else {
        warning = '未在「通用设置」中填写 DeepSeek API Key，当前按高考相关性和关键词匹配章节。';
      }
      const selected = new Map();
      data.forEach((entry) => {
        const index = Number(entry && entry.index);
        const item = candidates[index];
        if (!item) return;
        const chapter = normalizeString(entry.chapter, 160) || keywordChapterMatch(item, targetChapters);
        selected.set(index, {
          ...item,
          chapter,
          summary: normalizeString(entry.summary, 300) || item.description.slice(0, 160),
          examPoint: normalizeString(entry.examPoint, 160) || fallbackExamPoint(item, chapter)
        });
      });
      let items = [...selected.values()];
      // AI 可能只挑出十几条；继续按关键词/章节相关性补足到 50 条，保证材料量。
      const selectedLinks = new Set(items.map((item) => item.link));
      for (const item of ranked) {
        if (items.length >= 50) break;
        if (selectedLinks.has(item.link)) continue;
        selectedLinks.add(item.link);
        const chapter = keywordChapterMatch(item, targetChapters);
        items.push({
          ...item,
          chapter,
          summary: item.description.slice(0, 160),
          examPoint: fallbackExamPoint(item, chapter)
        });
      }
      if (!items.length) {
        items = (ranked.length ? ranked : news).slice(0, 50).map((item) => {
          const chapter = keywordChapterMatch(item, targetChapters);
          return {
            ...item,
            chapter,
            summary: item.description.slice(0, 160),
            examPoint: fallbackExamPoint(item, chapter)
          };
        });
        if (aiUsed) warning = 'AI 没有筛出足够的考题相关新闻，已展示按高考主题和章节相关性排序的权威新闻。';
      }
      return {
        ok: true,
        items: items.slice(0, 50),
        aiUsed,
        warning,
        fetchedAt: new Date().toISOString(),
        rangeFrom: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        rangeTo: new Date().toISOString(),
        days
      };
    } catch (error) {
      return { ok: false, error: `时事政治查询失败：${error.message}` };
    }
  });

  ipcMain.handle('browser:get-credentials', async () => readBrowserCredentials());
  ipcMain.handle('browser:save-credentials', async (_event, payload) => {
    try {
      return await saveBrowserCredentials(payload && payload.username, payload && payload.password);
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
  ipcMain.handle('browser:clear-credentials', async () => {
    try {
      await fsp.unlink(getCredentialPath());
      return { ok: true };
    } catch (error) {
      if (error && error.code === 'ENOENT') return { ok: true };
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('app:check-update', async () => {
    try {
      const release = await fetchLatestRelease();
      const latestVersion = normalizeString(release.tag_name || release.name, 40).replace(/^v/i, '');
      const asset = (Array.isArray(release.assets) ? release.assets : []).find((item) => /\.exe$/i.test(item.name || '') && /setup|install|安装/i.test(item.name || ''))
        || (Array.isArray(release.assets) ? release.assets : []).find((item) => /\.exe$/i.test(item.name || ''));
      const comparison = compareVersions(APP_VERSION, latestVersion);
      return {
        ok: true,
        currentVersion: APP_VERSION,
        latestVersion,
        comparison,
        isLatest: comparison === 0,
        updateAvailable: comparison < 0,
        currentAhead: comparison > 0,
        releaseUrl: normalizeString(release.html_url, 500),
        assetUrl: asset ? normalizeString(asset.browser_download_url, 1000) : '',
        assetName: asset ? normalizeString(asset.name, 300) : '',
        assetSize: asset ? Math.max(0, Number(asset.size) || 0) : 0,
        assetDigest: asset ? normalizeString(asset.digest, 100) : '',
        notes: normalizeString(release.body, 4000),
        publishedAt: normalizeString(release.published_at, 40)
      };
    } catch (error) {
      return { ok: false, error: `检查更新失败：${error.message}` };
    }
  });

  ipcMain.handle('app:download-update', async (_event, payload) => {
    const rawUrl = normalizeString(payload && payload.url, 1200);
    if (!/^https:\/\//i.test(rawUrl)) return { ok: false, error: '更新地址无效' };
    try {
      const target = new URL(rawUrl);
      const allowed = target.hostname === 'github.com'
        || target.hostname === 'api.github.com'
        || target.hostname.endsWith('.githubusercontent.com');
      if (!allowed) return { ok: false, error: '更新地址不是 GitHub 下载地址' };
      const requestedName = sanitizePathSegment(payload && payload.name, 'courseware-update.exe');
      const fileName = /\.exe$/i.test(requestedName) ? requestedName : `${requestedName || 'courseware-update'}.exe`;
      const expectedSize = Math.max(0, Number(payload && payload.expectedSize) || 0);
      const expectedDigest = normalizeString(payload && payload.digest, 100).replace(/^sha256:/i, '').toLowerCase();
      const sources = [
        `https://ghfast.top/${rawUrl}`,
        rawUrl
      ];
      const directories = [app.getPath('downloads'), path.join(getDataDir(), 'updates')];
      let lastError = null;
      for (const dir of directories) {
        try {
          await fsp.mkdir(dir, { recursive: true });
        } catch (error) {
          lastError = error;
          continue;
        }
        for (const source of sources) {
          const destination = await uniqueDestinationPath(dir, fileName);
          const partPath = `${destination}.part`;
          let received = 0;
          let lastProgressAt = 0;
          try {
            const response = await net.fetch(source, {
              headers: { 'User-Agent': 'ZZBZ-Courseware-Updater', Accept: 'application/octet-stream' },
              redirect: 'follow'
            });
            if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
            const total = expectedSize || Number(response.headers.get('content-length')) || 0;
            const hash = crypto.createHash('sha256');
            const progress = new Transform({
              transform(chunk, encoding, callback) {
                received += chunk.length;
                hash.update(chunk);
                const now = Date.now();
                if (mainWindow && !mainWindow.isDestroyed() && now - lastProgressAt > 180) {
                  lastProgressAt = now;
                  mainWindow.webContents.send('update:progress', {
                    received,
                    total,
                    percent: total ? Math.min(100, Math.round((received / total) * 100)) : 0
                  });
                }
                callback(null, chunk);
              }
            });
            await pipeline(Readable.fromWeb(response.body), progress, fs.createWriteStream(partPath));
            if (expectedSize && received !== expectedSize) throw new Error(`下载不完整：${received}/${expectedSize} 字节`);
            if (!received) throw new Error('下载文件为空');
            if (expectedDigest) {
              const actualDigest = hash.digest('hex');
              if (actualDigest !== expectedDigest) throw new Error('安装包校验失败，可能下载损坏');
            }
            await fsp.rename(partPath, destination);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update:progress', { received, total: received, percent: 100 });
            }
            return { ok: true, filePath: destination, bytes: received };
          } catch (error) {
            lastError = error;
            await fsp.unlink(partPath).catch(() => {});
            await fsp.unlink(destination).catch(() => {});
          }
        }
      }
      return { ok: false, error: `下载更新失败：${lastError ? lastError.message : '无法写入下载目录'}` };
    } catch (error) {
      return { ok: false, error: `下载更新失败：${error.message}` };
    }
  });

  ipcMain.handle('app:launch-installer', async (_event, filePath) => {
    const target = normalizeString(filePath, 2000);
    if (!target || !path.isAbsolute(target) || path.extname(target).toLowerCase() !== '.exe') {
      return { ok: false, error: '安装包路径无效' };
    }
    try {
      const stat = await fsp.stat(target);
      if (!stat.isFile()) return { ok: false, error: '安装包不存在' };
      const errorMessage = await shell.openPath(target);
      return errorMessage ? { ok: false, error: errorMessage } : { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('usb:list', async () => {
    try {
      return { ok: true, drives: await listRemovableDrives() };
    } catch (error) {
      return { ok: false, error: `读取可移动磁盘失败：${error.message}`, drives: [] };
    }
  });

  ipcMain.handle('usb:scan', async (_event, root) => {
    try {
      const normalizedRoot = normalizeString(root, 10);
      const drives = await listRemovableDrives();
      if (!drives.some((drive) => drive.root.toLowerCase() === normalizedRoot.toLowerCase())) {
        return { ok: false, error: '该路径不是当前连接的可移动磁盘' };
      }
      return await scanRemovableDrive(normalizedRoot);
    } catch (error) {
      return { ok: false, error: `扫描失败：${error.message}` };
    }
  });

  ipcMain.handle('usb:defender-scan', async (_event, root) => {
    try {
      const normalizedRoot = normalizeString(root, 10);
      const drives = await listRemovableDrives();
      if (!drives.some((drive) => drive.root.toLowerCase() === normalizedRoot.toLowerCase())) {
        return { ok: false, error: '该路径不是当前连接的可移动磁盘' };
      }
      const escaped = normalizedRoot.replace(/'/g, "''");
      const command = `$ErrorActionPreference = 'Stop'; Start-MpScan -ScanPath '${escaped}' -ScanType CustomScan`;
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command
      ], { windowsHide: true, timeout: 15 * 60 * 1000, encoding: 'utf8' });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: `Windows Defender 扫描失败：${error.message}` };
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

  ipcMain.handle('phone:start', async () => {
    try {
      return await startPhoneCast();
    } catch (error) {
      return { ok: false, error: `启动手机投屏失败：${error.message}` };
    }
  });
  ipcMain.handle('phone:stop', async () => {
    await stopPhoneCast();
    return { ok: true };
  });
  ipcMain.handle('phone:status', () => ({
    ok: true,
    active: Boolean(phoneCast),
    url: phoneCast ? phoneCast.url : '',
    qr: phoneCast ? phoneCast.qr : '',
    ip: phoneCast ? phoneCast.ip : '',
    port: phoneCast ? phoneCast.port : 0
  }));
  ipcMain.handle('app:open-bluetooth-settings', async () => {
    try {
      await shell.openExternal('ms-settings:bluetooth');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('window:set-fullscreen', async (_event, fullscreen) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
    mainWindow.setFullScreen(Boolean(fullscreen));
    return { ok: true };
  });
  ipcMain.handle('widget:configure', async (_event, config) => {
    applyWidgetConfig(config);
    return { ok: true };
  });
  ipcMain.on('widget:action', (_event, page) => {
    const valid = normalizeString(page, 40);
    if (valid === 'annotation') {
      openAnnotationOverlay();
      return;
    }
    if (valid === 'camera') {
      showMainPage(valid, { fullscreen: true });
      return;
    }
    if (valid) showMainPage(valid);
  });
  ipcMain.on('widget:hide', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.hide();
  });
  ipcMain.handle('annotation:open', async () => {
    openAnnotationOverlay();
    return { ok: true };
  });
  ipcMain.on('annotation:close', () => {
    if (annotationWindow && !annotationWindow.isDestroyed()) annotationWindow.close();
  });
  ipcMain.handle('annotation:save', async (_event, dataUrl) => {
    const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/) : null;
    if (!match) return { ok: false, error: '批注图片数据无效' };
    const result = await dialog.showSaveDialog(annotationWindow || mainWindow, {
      title: '保存批注',
      defaultPath: path.join(app.getPath('pictures'), `批注_${Date.now()}.png`),
      filters: [{ name: 'PNG 图片', extensions: ['png'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    try {
      await fsp.writeFile(result.filePath, Buffer.from(match[1], 'base64'));
      return { ok: true, filePath: result.filePath };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('clock:float', async (_event, options) => {
    try {
      const style = options && options.style === 'digital' ? 'digital' : 'clock';
      const size = Math.max(160, Math.min(480, Math.round(Number(options && options.size) || 260)));
      if (clockWindow && !clockWindow.isDestroyed()) clockWindow.destroy();
      const display = screen.getPrimaryDisplay();
      const width = size;
      const height = style === 'digital' ? Math.round(size * 0.52) : size;
      clockWindow = new BrowserWindow({
        width, height,
        x: display.workArea.x + display.workArea.width - width - 24,
        y: display.workArea.y + 60,
        frame: false,
        transparent: false,
        resizable: false,
        movable: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: true,
        backgroundColor: '#eef8ff',
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false }
      });
      clockWindow.setAlwaysOnTop(true, 'screen-saver');
      clockWindow.loadFile(path.join(__dirname, 'src', 'floating-time.html'), {
        query: { style, size: String(size) }
      }).catch(() => {});
      clockWindow.on('closed', () => { clockWindow = null; });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('screen:capture', async (_event, options) => {
    const hideWindow = Boolean(options && options.hideWindow);
    let hidden = false;
    let widgetHidden = false;
    try {
      if (hideWindow && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        hidden = true;
        if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
          widgetWindow.hide();
          widgetHidden = true;
        }
        await new Promise((resolve) => setTimeout(resolve, 320));
      }
      const display = screen.getPrimaryDisplay();
      const width = Math.min(3840, Math.max(1280, display.size.width));
      const height = Math.round(width * display.size.height / Math.max(1, display.size.width));
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      });
      if (!sources.length) return { ok: false, error: '没有找到可截取的屏幕。' };
      return { ok: true, dataUrl: sources[0].thumbnail.toDataURL() };
    } catch (error) {
      return { ok: false, error: `屏幕截取失败：${error.message}` };
    } finally {
      if (hidden && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
      if (widgetHidden && widgetWindow && !widgetWindow.isDestroyed() && widgetConfig.enabled) {
        widgetWindow.showInactive();
      }
    }
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
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = Math.max(1040, Math.min(1320, workArea.width - 120));
  const windowHeight = Math.max(680, Math.min(820, workArea.height - 120));
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: Math.min(1040, workArea.width - 40),
    minHeight: Math.min(680, workArea.height - 40),
    center: true,
    show: false,
    frame: false,
    fullscreen: false,
    fullscreenable: true,
    roundedCorners: true,
    backgroundColor: '#f3f8ff',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
      spellcheck: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html')).catch((error) => {
    console.error('页面加载失败：', error);
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    mainWindow.center();
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
  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
    // 主窗口隐藏/关闭时立即销毁悬浮球，避免软件还在托盘时悬浮球残留。
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.destroy();
      widgetWindow = null;
    }
    if (annotationWindow && !annotationWindow.isDestroyed()) annotationWindow.close();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (isQuitting) {
      if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.destroy();
        widgetWindow = null;
      }
      if (clockWindow && !clockWindow.isDestroyed()) {
        clockWindow.destroy();
        clockWindow = null;
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    if (!/^https?:\/\//i.test(params.src || '')) {
      event.preventDefault();
      return;
    }
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });

  mainWindow.webContents.on('did-attach-webview', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) {
        contents.loadURL(url).catch(() => {});
      }
      return { action: 'deny' };
    });
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

function configurePermissions() {
  const sessions = [session.defaultSession];
  try {
    sessions.push(session.fromPartition('persist:zz8site'));
  } catch (error) {
    /* 分区会话不可用时仅使用默认会话 */
  }
  for (const ses of sessions) {
    try {
      ses.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(permission === 'media' || permission === 'fullscreen');
      });
      ses.setPermissionCheckHandler((_webContents, permission) => permission === 'media' || permission === 'fullscreen');
    } catch (error) {
      /* 权限处理器失败不影响应用启动 */
    }
  }
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
    showMainWindow();
  });

  app.whenReady().then(() => {
    configurePermissions();
    registerProtocol();
    registerIpc();
    createWindow();
    createTray();
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

  app.on('before-quit', () => {
    isQuitting = true;
    stopPhoneCast();
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.destroy();
      widgetWindow = null;
    }
    if (clockWindow && !clockWindow.isDestroyed()) {
      clockWindow.destroy();
      clockWindow = null;
    }
    if (annotationWindow && !annotationWindow.isDestroyed()) {
      annotationWindow.destroy();
      annotationWindow = null;
    }
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
  });

  app.on('window-all-closed', () => {
    if (isQuitting) app.quit();
  });
}
