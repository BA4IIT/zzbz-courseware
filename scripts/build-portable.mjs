import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(root, 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'portable.nsi');

if (!fs.existsSync(templatePath)) {
  console.error('未找到 electron-builder 的 portable.nsi 模板，请先执行 npm install。');
  process.exit(1);
}

const original = fs.readFileSync(templatePath, 'utf8');
const target = 'ExecWait "$INSTDIR\\${APP_EXECUTABLE_FILENAME} $R0" $0';
const replacement = 'ExecWait "$INSTDIR\\${APP_EXECUTABLE_FILENAME} $R0 --no-sandbox" $0';

if (original.includes(target)) {
  fs.writeFileSync(templatePath, original.replace(target, replacement), 'utf8');
  console.log('已为绿色版启动器启用 Windows 兼容模式（--no-sandbox）。');
} else if (original.includes(replacement)) {
  console.log('绿色版启动器已处于兼容模式。');
} else {
  console.error('portable.nsi 模板结构与预期不符，请检查 electron-builder 版本。');
  process.exit(1);
}

const env = { ...process.env };
if (!env.ELECTRON_MIRROR) env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
if (!env.ELECTRON_BUILDER_BINARIES_MIRROR) env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/';
env.CSC_IDENTITY_AUTO_DISCOVERY = env.CSC_IDENTITY_AUTO_DISCOVERY || 'false';

const cli = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [cli, '--win', 'portable'], {
  cwd: root,
  stdio: 'inherit',
  env
});

if (result.error) {
  console.error('启动 electron-builder 失败：', result.error.message);
  process.exit(1);
}
process.exit(result.status == null ? 1 : result.status);
