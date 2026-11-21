import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nshPath = path.join(root, 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'include', 'installer.nsh');

if (!fs.existsSync(nshPath)) {
  console.error('未找到 electron-builder 的 NSIS 模板，请先执行 npm install。');
  process.exit(1);
}

let nsh = fs.readFileSync(nshPath, 'utf8');
let patched = 0;
for (const link of ['newStartMenuLink', 'newDesktopLink']) {
  const needle = `CreateShortCut "$${link}" "$appExe" "" "$appExe"`;
  const replacement = `CreateShortCut "$${link}" "$appExe" "--no-sandbox" "$appExe"`;
  const count = nsh.split(needle).length - 1;
  if (count > 0) {
    nsh = nsh.split(needle).join(replacement);
    patched += count;
  }
}
if (patched > 0) {
  fs.writeFileSync(nshPath, nsh, 'utf8');
  console.log(`已为 ${patched} 个安装快捷方式启用 Windows 兼容参数（--no-sandbox）。`);
} else if (nsh.includes('"--no-sandbox" "$appExe"')) {
  console.log('安装快捷方式已处于兼容模式。');
} else {
  console.error('未能在 NSIS 模板中找到快捷方式创建语句，请检查 electron-builder 版本。');
  process.exit(1);
}

const env = { ...process.env };
if (!env.ELECTRON_MIRROR) env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
if (!env.ELECTRON_BUILDER_BINARIES_MIRROR) env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/';
env.CSC_IDENTITY_AUTO_DISCOVERY = env.CSC_IDENTITY_AUTO_DISCOVERY || 'false';

const cli = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [cli, '--win', 'nsis'], {
  cwd: root,
  stdio: 'inherit',
  env
});

if (result.error) {
  console.error('启动 electron-builder 失败：', result.error.message);
  process.exit(1);
}
process.exit(result.status == null ? 1 : result.status);
