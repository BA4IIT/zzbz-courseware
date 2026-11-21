import fs from 'node:fs';

const CDP_URL = 'http://127.0.0.1:9222/json/list';
const results = [];
const errors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`);
}

const targets = await (await fetch(CDP_URL)).json();
const target = targets.find((item) => item.type === 'page' && item.url.includes('index.html'));
if (!target) throw new Error('No app page target found');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let seq = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails;
    errors.push(details.exception?.description || details.text || 'Runtime exception');
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    errors.push(message.params.args.map((arg) => arg.value || arg.description || '').join(' '));
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    errors.push(message.params.entry.text);
  }
});

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }
    }, 15000);
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result?.value;
}

async function click(selector) {
  const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error(`Selector not found: ${selector}`);
  await sleep(250);
}

async function waitFor(expression, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(200);
  }
  return false;
}

await send('Runtime.enable');
await send('Log.enable');
await sleep(600);

record('应用已渲染', await waitFor("document.querySelectorAll('.file-card').length > 0", 5000), await evaluate("document.querySelectorAll('.file-card').length"));

const baseline = await evaluate(`(() => ({
  navCount: document.querySelector('#navCount')?.textContent,
  total: document.querySelector('#statTotal')?.textContent,
  subjectCount: document.querySelector('#statSubjects')?.textContent,
  title: document.querySelector('#listTitle')?.textContent,
  demoVisible: !document.querySelector('#demoNotice')?.hidden,
  cards: document.querySelectorAll('.file-card').length
}))()`);
record('初始演示数据 21 份', baseline.total === '21' && baseline.cards === 12, JSON.stringify(baseline));

// 搜索
await evaluate(`(() => { const input = document.querySelector('#globalSearch'); input.value = '函数'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await sleep(500);
const searchState = await evaluate(`(() => ({ title: document.querySelector('#listTitle')?.textContent, count: document.querySelectorAll('.file-card').length, chips: [...document.querySelectorAll('.filter-chip')].map(el => el.textContent.trim()) }))()`);
record('搜索筛选正常', searchState.title.includes('函数') && searchState.count >= 1, JSON.stringify(searchState));
await evaluate(`(() => { const input = document.querySelector('#globalSearch'); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await sleep(400);

// 年级筛选
await click('[data-grade="高三"]');
const gradeState = await evaluate(`(() => ({ title: document.querySelector('#listTitle')?.textContent, chips: [...document.querySelectorAll('.filter-chip')].map(el => el.textContent.trim()), cards: document.querySelectorAll('.file-card').length }))()`);
record('年级筛选生成筛选条件', gradeState.chips.some((chip) => chip.includes('高三')), JSON.stringify(gradeState));
await click('[data-clear-all]');
await sleep(250);

// 学科导航
await click('[data-subject="math"]');
const mathState = await evaluate(`(() => ({ title: document.querySelector('#listTitle')?.textContent, active: document.querySelector('[data-subject="math"]')?.classList.contains('is-active'), cards: document.querySelectorAll('.file-card').length }))()`);
record('学科导航筛选正常', mathState.title.includes('数学') && mathState.active, JSON.stringify(mathState));
await click('[data-clear="subject"]');

// 教材目录
await click('[data-page="catalog"]');
await sleep(250);
const catalogState = await evaluate(`(() => ({
  visible: !document.querySelector('#page-catalog')?.hidden,
  subjectItems: document.querySelectorAll('[data-catalog-subject]').length,
  bookItems: document.querySelectorAll('[data-catalog-book]').length,
  chapterItems: document.querySelectorAll('[data-catalog-chapter]').length,
  booksMetric: document.querySelector('#catalogBookCount')?.textContent,
  chaptersMetric: document.querySelector('#catalogChapterCount')?.textContent
}))()`);
record('教材目录完整渲染', catalogState.visible && catalogState.subjectItems === 9 && catalogState.bookItems > 0 && catalogState.chapterItems > 0, JSON.stringify(catalogState));
await click('[data-catalog-subject="english"]');
const englishCatalog = await evaluate(`(() => ({ title: document.querySelector('#catalogBooksTitle')?.textContent, books: document.querySelectorAll('[data-catalog-book]').length, chapters: document.querySelectorAll('[data-catalog-chapter]').length }))()`);
record('切换学科教材目录', englishCatalog.title.includes('英语') && englishCatalog.books > 0, JSON.stringify(englishCatalog));
await click('[data-catalog-chapter]');
await sleep(300);
const chapterLibrary = await evaluate(`(() => ({ page: !document.querySelector('#page-library')?.hidden, title: document.querySelector('#listTitle')?.textContent, chips: [...document.querySelectorAll('.filter-chip')].map(el => el.textContent.trim()) }))()`);
record('章节直达课件库', chapterLibrary.page && chapterLibrary.chips.length >= 2, JSON.stringify(chapterLibrary));
await click('[data-clear-all]');

// 课程分类
await click('[data-page="types"]');
const typeState = await evaluate(`(() => ({ visible: !document.querySelector('#page-types')?.hidden, cards: document.querySelectorAll('.type-card').length, matrixRows: document.querySelectorAll('#coverageMatrix tbody tr').length, summary: document.querySelector('#typeSummary')?.innerText }))()`);
record('课程分类页完整渲染', typeState.visible && typeState.cards === 8 && typeState.matrixRows === 9, JSON.stringify(typeState));
await click('.type-card');
const typeFilterState = await evaluate(`(() => ({ page: !document.querySelector('#page-library')?.hidden, title: document.querySelector('#listTitle')?.textContent, chips: [...document.querySelectorAll('.filter-chip')].map(el => el.textContent.trim()), cards: document.querySelectorAll('.file-card').length }))()`);
record('课程分类筛选跳转', typeFilterState.page && typeFilterState.title.includes('新授课'), JSON.stringify(typeFilterState));
await click('[data-clear-all]');

// 数据管理
await click('[data-page="data"]');
const dataState = await evaluate(`(() => ({ visible: !document.querySelector('#page-data')?.hidden, files: document.querySelector('#dataTotalFiles')?.textContent, path: document.querySelector('#dataPath')?.textContent, percent: document.querySelector('#storagePercent')?.textContent, classified: document.querySelector('#dataClassifiedCount')?.textContent }))()`);
record('数据管理统计正常', dataState.visible && dataState.files?.includes('21'), JSON.stringify(dataState));

// 详情抽屉
await click('[data-page="library"]');
await click('.file-card');
const drawerState = await evaluate(`(() => ({ open: !document.querySelector('#drawerOverlay')?.hidden, title: document.querySelector('#detailTitle')?.textContent, fields: ['#detailSubject','#detailBook','#detailChapter','#detailType'].every(sel => document.querySelector(sel)), preview: Boolean(document.querySelector('.preview-box')) }))()`);
record('课件详情抽屉与分类表单', drawerState.open && drawerState.fields && drawerState.preview, JSON.stringify(drawerState));
const favoriteBefore = await evaluate(`document.querySelector('#detailFavoriteToggle')?.classList.contains('is-active')`);
await click('#detailFavoriteToggle');
const favoriteAfter = await evaluate(`document.querySelector('#detailFavoriteToggle')?.classList.contains('is-active')`);
record('详情收藏切换交互', favoriteAfter !== favoriteBefore, `before=${favoriteBefore} after=${favoriteAfter}`);
await click('#detailFavoriteToggle');
await click('[data-detail-cancel]');

// 导入弹层（不触发系统文件对话框）
await click('#topImportButton');
const importState = await evaluate(`(() => ({ open: !document.querySelector('#modalLayer')?.hidden, dropzone: Boolean(document.querySelector('#importDropzone')), pickFiles: Boolean(document.querySelector('#importPickFiles')), pickFolder: Boolean(document.querySelector('#importPickFolder')) }))()`);
record('导入弹层正常打开', importState.open && importState.dropzone && importState.pickFiles && importState.pickFolder, JSON.stringify(importState));
await click('[data-close-modal]');
record('导入弹层可关闭', await evaluate("document.querySelector('#modalLayer')?.hidden === true"));

// 通过 CDP 模拟拖入文件夹，验证真实扫描与导入
const testFiles = [
  'D:\\桌面\\新建文件夹\\zzbz-courseware\\test-courseware',
];
const dragData = { items: [], files: testFiles, dragOperationsMask: 1 };
try {
  await send('Input.dispatchDragEvent', { type: 'dragEnter', x: 700, y: 480, data: dragData });
  await send('Input.dispatchDragEvent', { type: 'dragOver', x: 700, y: 480, data: dragData });
  await send('Input.dispatchDragEvent', { type: 'drop', x: 700, y: 480, data: dragData });
  await sleep(1800);
  const importQueue = await evaluate(`(() => ({ open: !document.querySelector('#modalLayer')?.hidden, items: document.querySelectorAll('.import-item').length, toast: document.querySelector('.toast-copy')?.innerText || '' }))()`);
  record('拖入文件夹被识别（可选）', importQueue.items > 0, JSON.stringify(importQueue));
  if (importQueue.items > 0) {
    const classifications = await evaluate(`[...document.querySelectorAll('.import-item')].map(item => ({
      name: item.querySelector('.import-file-copy strong')?.textContent,
      selects: [...item.querySelectorAll('.import-selects select')].map(s => s.options[s.selectedIndex]?.text || '')
    }))`);
    record('自动分类结果可编辑', classifications.length === 4, JSON.stringify(classifications));
    const allValid = await evaluate(`document.querySelector('#importConfirmButton')?.disabled === false`);
    record('导入按钮可用', allValid === true, String(allValid));
    if (allValid) {
      await click('#importConfirmButton');
      await sleep(1200);
      const afterImport = await evaluate(`(() => ({ total: document.querySelector('#navCount')?.textContent, toast: document.querySelector('.toast-copy')?.innerText || '', modalHidden: document.querySelector('#modalLayer')?.hidden }))()`);
      record('实际导入保存成功', afterImport.total === '25' && afterImport.modalHidden, JSON.stringify(afterImport));
    }
  }
} catch (error) {
  record('拖入文件夹被识别（可选）', false, error.message);
}

const finalErrors = errors.filter((text) => !/Autofill|devtools|Electron Security Warning/i.test(text));
record('渲染进程无脚本错误', finalErrors.length === 0, finalErrors.slice(0, 5).join(' | '));

const summary = {
  passed: results.filter((item) => item.ok).length,
  failed: results.filter((item) => !item.ok).length,
  results,
  errors: finalErrors
};
fs.writeFileSync('D:\\桌面\\新建文件夹\\zzbz-courseware\\test-results.json', JSON.stringify(summary, null, 2));
console.log('\n' + JSON.stringify({ passed: summary.passed, failed: summary.failed }, null, 2));
ws.close();
