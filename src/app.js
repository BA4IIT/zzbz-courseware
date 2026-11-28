(function () {
  'use strict';

  const DATA = window.ZZBZ_DATA;
  const DETECT = window.ZZBZ_DETECT;
  const ICONS = window.ZZBZ_ICONS;
  const WORDS = Array.isArray(window.ZZBZ_WORDS) ? window.ZZBZ_WORDS : [];
  const api = window.zzbz;
  const icon = (name) => ICONS.icon(name);
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  if (!DATA || !DETECT || !ICONS) {
    document.body.innerHTML = '<div style="padding:60px;font-family:Microsoft YaHei;color:#315a7a">系统资源加载失败，请重新安装应用。</div>';
    return;
  }

  if (!api) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg,#eef8ff,#f8fcff);font-family:'Microsoft YaHei UI','Microsoft YaHei',sans-serif;color:#315a7a">
        <div style="width:520px;padding:38px 40px;background:#fff;border:1px solid #dceaf7;border-radius:22px;box-shadow:0 24px 60px rgba(35,83,126,.13);text-align:center">
          <div style="width:58px;height:58px;display:grid;place-items:center;margin:0 auto 18px;border-radius:16px;background:linear-gradient(145deg,#2f7fd8,#68b7ef);color:#fff;font-size:17px;font-weight:700">八中</div>
          <h1 style="margin:0 0 10px;font-size:22px;color:#1c3f5d">请通过桌面程序启动</h1>
          <p style="margin:0 0 20px;font-size:12px;line-height:1.9;color:#7e95a9">这是枣庄八中集成桌面教学系统的界面文件。<br>请双击软件目录中的「枣庄八中集成桌面教学系统.exe」。</p>
          <div style="padding:12px;border-radius:10px;background:#f6fbff;border:1px solid #e8f1f9;font-size:11px;color:#8aa0b3">本地软件版 · 课件原件保留在本机，不会上传云端</div>
        </div>
      </div>`;
    return;
  }

  /* ---------------- 数学表达式 ---------------- */

  const MATH_FUNCTIONS = {
    sin: (x, deg) => Math.sin(deg ? x * Math.PI / 180 : x),
    cos: (x, deg) => Math.cos(deg ? x * Math.PI / 180 : x),
    tan: (x, deg) => Math.tan(deg ? x * Math.PI / 180 : x),
    asin: (x, deg) => deg ? Math.asin(x) * 180 / Math.PI : Math.asin(x),
    acos: (x, deg) => deg ? Math.acos(x) * 180 / Math.PI : Math.acos(x),
    atan: (x, deg) => deg ? Math.atan(x) * 180 / Math.PI : Math.atan(x),
    sqrt: (x) => Math.sqrt(x),
    abs: (x) => Math.abs(x),
    ln: (x) => Math.log(x),
    log: (x) => Math.log10(x),
    exp: (x) => Math.exp(x),
    floor: (x) => Math.floor(x),
    ceil: (x) => Math.ceil(x),
    round: (x) => Math.round(x)
  };

  function evaluateMath(expression, options) {
    const config = options || {};
    const angleMode = config.angleMode === 'deg';
    let source = String(expression || '')
      .replace(/[πΠ]/g, 'pi')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=/i, '')
      .trim();
    if (!source) throw new Error('请输入表达式');
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      const ch = source[index];
      if (/\s/.test(ch)) { index += 1; continue; }
      if (/[0-9.]/.test(ch)) {
        let start = index;
        let dots = 0;
        while (index < source.length && /[0-9.]/.test(source[index])) {
          if (source[index] === '.') dots += 1;
          index += 1;
        }
        if (dots > 1) throw new Error('数字格式错误');
        const raw = source.slice(start, index);
        if (raw === '.') throw new Error('数字格式错误');
        tokens.push({ type: 'number', value: Number(raw) });
        continue;
      }
      if (/[a-zA-Z_]/.test(ch)) {
        let start = index;
        while (index < source.length && /[a-zA-Z_]/.test(source[index])) index += 1;
        tokens.push({ type: 'ident', value: source.slice(start, index).toLowerCase() });
        continue;
      }
      if ('+-*/^%'.includes(ch)) {
        tokens.push({ type: 'op', value: ch });
        index += 1;
        continue;
      }
      if (ch === '(') { tokens.push({ type: 'lparen' }); index += 1; continue; }
      if (ch === ')') { tokens.push({ type: 'rparen' }); index += 1; continue; }
      throw new Error(`不支持的字符：${ch}`);
    }
    let cursor = 0;
    const peek = () => tokens[cursor];
    const consume = () => tokens[cursor++];
    const startsValue = (token) => token && (token.type === 'number' || token.type === 'ident' || token.type === 'lparen');
    function parseExpression() {
      let value = parseTerm();
      while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseTerm();
        value = op === '+' ? value + right : value - right;
      }
      return value;
    }
    function parseTerm() {
      let value = parseUnary();
      while (true) {
        if (peek() && peek().type === 'op' && ['*', '/', '%'].includes(peek().value)) {
          const op = consume().value;
          const right = parseUnary();
          if (op === '*') value *= right;
          else if (op === '/') value /= right;
          else value %= right;
        } else if (startsValue(peek())) {
          value *= parseUnary();
        } else break;
      }
      return value;
    }
    function parseUnary() {
      if (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        return op === '-' ? -parseUnary() : parseUnary();
      }
      return parsePower();
    }
    function parsePower() {
      const base = parsePrimary();
      if (peek() && peek().type === 'op' && peek().value === '^') {
        consume();
        return Math.pow(base, parseUnary());
      }
      return base;
    }
    function parsePrimary() {
      const token = consume();
      if (!token) throw new Error('表达式不完整');
      if (token.type === 'number') return token.value;
      if (token.type === 'lparen') {
        const value = parseExpression();
        if (!peek() || peek().type !== 'rparen') throw new Error('缺少右括号');
        consume();
        return value;
      }
      if (token.type === 'ident') {
        if (token.value === 'pi') return Math.PI;
        if (token.value === 'e') return Math.E;
        if (token.value === 'x') {
          if (!Object.prototype.hasOwnProperty.call(config, 'x')) throw new Error('当前表达式不能使用变量 x');
          return Number(config.x);
        }
        const fn = MATH_FUNCTIONS[token.value];
        if (!fn) throw new Error(`未知函数或变量：${token.value}`);
        if (!peek() || peek().type !== 'lparen') throw new Error(`函数 ${token.value} 需要括号`);
        consume();
        const arg = parseExpression();
        if (!peek() || peek().type !== 'rparen') throw new Error('缺少右括号');
        consume();
        return fn(arg, angleMode);
      }
      throw new Error('表达式格式错误');
    }
    const result = parseExpression();
    if (cursor < tokens.length) throw new Error('表达式有多余内容');
    if (!Number.isFinite(result)) throw new Error('结果不是有限数值');
    return result;
  }

  /* ---------------- 基础工具 ---------------- */

  const GRADE_NAMES = ['高一', '高二', '高三'];
  const PAGE_TITLES = {
    library: '教学资源中心',
    catalog: '教材目录',
    types: '课程分类',
    vocab: '英语 3500 词汇',
    questions: '学科提问',
    ai: 'AI 解答',
    wordgame: '单词天天练',
    graph: '函数图像',
    calculator: '科学计算器',
    politics: '时事政治',
    volume: '环境音量',
    englishexam: '英语往年题',
    englishweb: '英语网',
    annotation: '批注',
    settings: '通用设置',
    vote: '科目投票',
    students: '随机点名',
    phone: '手机投屏',
    timer: '课堂计时器',
    browser: '内置浏览器',
    camera: '展台',
    whiteboard: '白板',
    timetable: '课程表',
    usb: 'U 盘检测',
    data: '数据管理'
  };
  const TOOL_PAGES = new Set(['vocab', 'questions', 'ai', 'wordgame', 'graph', 'calculator', 'politics', 'volume', 'englishexam', 'englishweb', 'browser', 'camera', 'whiteboard', 'annotation', 'timetable', 'usb', 'vote', 'students', 'phone', 'timer', 'settings']);
  const ADMIN_PASSWORD = '6767';
  const VOTE_EXTRA_SUBJECTS = [
    { id: 'music', name: '音乐', short: '音', color: '#c56f9e' },
    { id: 'pe', name: '体育', short: '体', color: '#2f9b78' },
    { id: 'computer', name: '微机', short: '信', color: '#3b83c9' },
    { id: 'art', name: '美术', short: '美', color: '#d58a3f' }
  ];
  const VOTE_SUBJECTS = [...DATA.catalog, ...VOTE_EXTRA_SUBJECTS];
  const VOTE_BY_ID = Object.fromEntries(VOTE_SUBJECTS.map((subject) => [subject.id, subject]));
  const TIMETABLE_DAY_FIELDS = [
    { key: 'mon', label: '周一' },
    { key: 'tue', label: '周二' },
    { key: 'wed', label: '周三' },
    { key: 'thu', label: '周四' },
    { key: 'fri', label: '周五' }
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attr(value) {
    return esc(value);
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `cw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function formatSize(bytes) {
    const value = Number(bytes) || 0;
    if (value <= 0) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 ** 2) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
    if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(value < 100 * 1024 ** 2 ? 1 : 0)} MB`;
    return `${(value / 1024 ** 3).toFixed(value < 10 * 1024 ** 3 ? 2 : 1)} GB`;
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, fallback) {
    const date = parseDate(value);
    if (!date) return fallback || '—';
    const now = new Date();
    const sameYear = date.getFullYear() === now.getFullYear();
    if (sameYear) return `${date.getMonth() + 1}月${date.getDate()}日`;
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  }

  function formatDateTime(value) {
    const date = parseDate(value);
    if (!date) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function relativeTime(value) {
    const date = parseDate(value);
    if (!date) return '—';
    const diff = Date.now() - date.getTime();
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)} 天前`;
    return formatDate(value);
  }

  function schoolYear() {
    const now = new Date();
    const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}—${start + 1}`;
  }

  function todayStamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  }

  function stripExtension(name, ext) {
    const value = String(name || '');
    const suffix = ext ? `.${ext}` : '';
    if (suffix && value.toLowerCase().endsWith(suffix.toLowerCase())) return value.slice(0, -suffix.length);
    return value.replace(/\.[^.]+$/, '');
  }

  function joinPath(...parts) {
    return parts.filter(Boolean).join(' · ');
  }

  function uniqueId(prefix) {
    return `${prefix}-${uuid()}`;
  }

  function escapeCsv(value) {
    const text = String(value == null ? '' : value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return ok;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  function firstNameChar(name) {
    return String(name || '课').slice(0, 1);
  }

  /* ---------------- 文件类型 ---------------- */

  const EXT_GROUPS = {
    presentation: { icon: 'presentation', color: '#cf7c55', label: '演示文稿', exts: ['ppt', 'pptx', 'pps', 'ppsx'] },
    document: { icon: 'doc', color: '#4e86c3', label: '文档', exts: ['doc', 'docx'] },
    pdf: { icon: 'pdf', color: '#ce6666', label: 'PDF', exts: ['pdf'] },
    sheet: { icon: 'sheet', color: '#4c9b73', label: '表格', exts: ['xls', 'xlsx'] },
    video: { icon: 'video', color: '#8574d2', label: '视频', exts: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v'] },
    image: { icon: 'image', color: '#43a08b', label: '图片', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] },
    audio: { icon: 'music', color: '#bd8c44', label: '音频', exts: ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg'] },
    archive: { icon: 'archive', color: '#8194a7', label: '压缩包', exts: ['zip', 'rar', '7z'] },
    text: { icon: 'text', color: '#6f8ca1', label: '文本', exts: ['txt', 'md', 'html', 'htm'] }
  };

  const EXT_META = {};
  Object.entries(EXT_GROUPS).forEach(([key, group]) => {
    group.exts.forEach((ext) => {
      EXT_META[ext] = { ...group, key };
    });
  });

  function fileMeta(ext) {
    return EXT_META[String(ext || '').toLowerCase()] || {
      icon: 'file',
      color: '#7b93a8',
      label: '文件',
      key: 'other',
      exts: []
    };
  }

  function isPreviewable(kind) {
    return ['image', 'video', 'audio', 'pdf'].includes(kind);
  }

  /* ---------------- 状态 ---------------- */

  const state = {
    page: 'library',
    ready: false,
    items: [],
    settings: {},
    loading: true,
    dataPath: '',
    appInfo: null,
    missing: new Set(),
    subjectId: '',
    grade: '',
    bookId: '',
    chapterId: '',
    typeId: '',
    quick: '',
    search: '',
    sort: 'newest',
    view: 'grid',
    visible: 12,
    catalogSubjectId: 'chinese',
    catalogBookId: 'yw-bx1',
    catalogGrade: '',
    currentFileId: '',
    detailDraftFavorite: false,
    demoNoticeHidden: false,
    importQueue: [],
    importBatch: { subjectId: '', bookId: '', chapterId: '', typeId: 'new' },
    importBusy: false,
    importScanning: false,
    importMode: 'import',
    batchPathText: '',
    batchSaveItems: [],
    batchSaveSelected: new Set(),
    batchSaveBusy: false,
    batchSaveMode: 'folder',
    batchDeleteItems: [],
    batchDeleteSelected: new Set(),
    batchDeleteBusy: false,
    questions: [],
    questionSubjectId: '',
    questionStatus: 'open',
    questionSort: 'votes',
    questionSearch: '',
    questionFormSubject: 'english',
    questionVoteEditId: '',
    vocabQuery: '',
    vocabLetter: '',
    vocabLimit: 60,
    timetable: null,
    timetableWeek: 'A',
    usbDrives: [],
    usbScanResult: null,
    usbScanning: false,
    usbLoading: false,
    cameraStream: null,
    cameraDeviceId: '',
    cameraStarting: false,
    cameraAutoStarted: false,
    cameraResolution: 3840,
    cameraClarity: 100,
    cameraRotation: 0,
    cameraMirrorX: false,
    cameraLocked: false,
    cameraFocusMode: 'continuous',
    cameraFocusDistance: 0.5,
    browserInitialized: false,
    browserZoom: 1,
    browserCredentials: null,
    subjectVotes: {},
    students: [],
    studentSpinning: false,
    studentSpinTimer: 0,
    lastPickedStudent: '',
    adminPasswordCallback: null,
    aiKeySaved: false,
    aiAsking: false,
    aiAnswer: '',
    aiFile: null,
    aiOcr: null,
    aiOcrCleanText: '',
    aiTab: 'ask',
    wordGame: null,
    wordGameScores: [],
    phoneCastActive: false,
    phoneFrameCleanup: null,
    graph: {
      functions: [],
      scale: 40,
      originX: 0,
      originY: 0,
      initialized: false,
      dragging: false,
      lastX: 0,
      lastY: 0,
      hover: null
    },
    whiteboardPages: [''],
    whiteboardPageIndex: 0,
    calc: { expression: '', result: '', angleMode: 'rad', history: [] },
    politics: { bookId: '', chapter: '', days: 7, loading: false, items: [], warning: '', aiUsed: false, rangeFrom: '', rangeTo: '' },
    volume: { stream: null, context: null, analyser: null, timer: 0, running: false, db: 0, peak: 0, scene: 'study' },
    englishExam: { bookId: '', chapter: '', type: '阅读理解', count: 5, loading: false, result: '' },
    timer: { total: 300, remaining: 300, running: false, endAt: 0, interval: 0, lastBeep: 0 },
    updateChecking: false,
    updateDownloading: false,
    updateInfo: null,
    modal: null,
    confirmCallback: null,
    dragDepth: 0
  };

  const ui = {
    appWindow: $('#appWindow'),
    schoolYear: $('#schoolYear'),
    subjectNav: $('#subjectNav'),
    navCount: $('#navCount'),
    navCatalogCount: $('#navCatalogCount'),
    navTypesCount: $('#navTypesCount'),
    navVocabCount: $('#navVocabCount'),
    navQuestionCount: $('#navQuestionCount'),
    searchBox: $('.search-box'),
    favCount: $('#favCount'),
    incompleteCount: $('#incompleteCount'),
    storageMini: $('#storageMini'),
    storageMiniText: $('#storageMiniText'),
    contextTitle: $('#contextTitle'),
    search: $('#globalSearch'),
    saveState: $('#saveState'),
    saveStateText: $('#saveStateText'),
    heroSubjectDots: $('#heroSubjectDots'),
    statTotal: $('#statTotal'),
    statTotalSub: $('#statTotalSub'),
    statSubjects: $('#statSubjects'),
    statSubjectsSub: $('#statSubjectsSub'),
    statSize: $('#statSize'),
    statSizeSub: $('#statSizeSub'),
    statBooks: $('#statBooks'),
    statBooksSub: $('#statBooksSub'),
    demoNotice: $('#demoNotice'),
    listKicker: $('#listKicker'),
    listTitle: $('#listTitle'),
    listSubtitle: $('#listSubtitle'),
    gradeTabs: $('#gradeTabs'),
    bookFilter: $('#bookFilter'),
    chapterFilter: $('#chapterFilter'),
    typeFilter: $('#typeFilter'),
    sortSelect: $('#sortSelect'),
    activeFilters: $('#activeFilters'),
    resultsMeta: $('#resultsMeta'),
    filesArea: $('#filesArea'),
    fileGrid: $('#fileGrid'),
    fileList: $('#fileList'),
    emptyState: $('#emptyState'),
    loadMoreWrap: $('#loadMoreWrap'),
    loadMoreButton: $('#loadMoreButton'),
    mainScroll: $('#mainScroll'),
    pagePanels: $$('.page-panel'),
    navItems: $$('[data-page]'),
    quickItems: $$('[data-quick]'),
    catalogGradeTabs: $('#catalogGradeTabs'),
    catalogSubjects: $('#catalogSubjects'),
    catalogBooks: $('#catalogBooks'),
    catalogChapters: $('#catalogChapters'),
    catalogBooksTitle: $('#catalogBooksTitle'),
    catalogBookFilteredCount: $('#catalogBookFilteredCount'),
    catalogChaptersTitle: $('#catalogChaptersTitle'),
    catalogViewAllButton: $('#catalogViewAllButton'),
    catalogSubjectCount: $('#catalogSubjectCount'),
    catalogBookCount: $('#catalogBookCount'),
    catalogChapterCount: $('#catalogChapterCount'),
    catalogFilteredCount: $('#catalogFilteredCount'),
    typeSummary: $('#typeSummary'),
    typeGrid: $('#typeGrid'),
    coverageMatrix: $('#coverageMatrix'),
    drawerOverlay: $('#drawerOverlay'),
    drawerContent: $('#drawerContent'),
    drawerFooter: $('#drawerFooter'),
    detailTitle: $('#detailTitle'),
    modalLayer: $('#modalLayer'),
    toastStack: $('#toastStack'),
    dropOverlay: $('#dropOverlay')
  };

  /* ---------------- 演示数据 ---------------- */

  const DEMO_SPECS = [
    { name: '沁园春·长沙：意象与情感.pptx', subject: 'chinese', book: 'yw-bx1', chapter: 1, type: 'new', size: 8.6, favorites: true, tags: ['情境诵读', '意象分析'], note: '以秋景意象为线索，设置情境任务，引导学生体会青年革命者的胸襟。', days: 0, open: 0 },
    { name: '《乡土中国》整本书阅读导读.pdf', subject: 'chinese', book: 'yw-bx1', chapter: 5, type: 'review', size: 5.2, tags: ['整本书阅读', '导读'], note: '包含阅读任务单与章节思维导图。', days: 2, open: 3 },
    { name: '赤壁赋·文言知识梳理.docx', subject: 'chinese', book: 'yw-bx1', chapter: 7, type: 'review', size: 1.9, tags: ['文言知识'], note: '', days: 6 },
    { name: '函数的单调性·情境探究.pptx', subject: 'math', book: 'sx-bx1', chapter: 3, type: 'new', size: 12.4, favorites: true, tags: ['情境教学', 'GeoGebra'], note: '气温曲线导入，配合动态软件演示函数单调性。', days: 1, open: 1 },
    { name: '三角函数图象变换微课.mp4', subject: 'math', book: 'sx-bx1', chapter: 5, type: 'micro', size: 86, tags: ['微课', '图象变换'], note: '8 分钟微课，聚焦 φ、ω、A 对图象的影响。', days: 8 },
    { name: '概率的基本性质·公开课.pptx', subject: 'math', book: 'sx-bx2', chapter: 5, type: 'open', size: 14.1, tags: ['校级公开课'], note: '2026 年校级公开课教学设计。', days: 9, open: 5 },
    { name: 'Unit 3 Sports and Fitness Reading.pptx', subject: 'english', book: 'yy-bx1', chapter: 4, type: 'new', size: 9.7, tags: ['阅读课'], note: '', days: 2 },
    { name: '读后续写：情节构思与升格训练.docx', subject: 'english', book: 'yy-gk', chapter: 7, type: 'examprep', size: 3.1, favorites: true, tags: ['读后续写', '升格'], note: '提供三篇学生习作与升格对照。', days: 3, open: 2 },
    { name: '期中试卷讲评与错题补偿.docx', subject: 'english', book: 'yy-bx1', chapter: 4, type: 'exam', size: 2.2, tags: ['期中', '错题'], note: '', days: 7 },
    { name: '牛顿第二定律实验探究.pptx', subject: 'physics', book: 'wl-bx1', chapter: 4, type: 'experiment', size: 18.7, tags: ['实验探究'], note: '含实验数据记录表与误差分析。', days: 4, open: 4 },
    { name: '电磁感应中的双杆模型.pdf', subject: 'physics', book: 'wl-xb2', chapter: 2, type: 'review', size: 4.8, tags: ['双杆模型'], note: '', days: 11 },
    { name: '钠及其化合物一轮复习.pptx', subject: 'chemistry', book: 'hx-bx1', chapter: 2, type: 'review', size: 15.2, tags: ['一轮复习'], note: '', days: 5 },
    { name: '原电池工作原理微课.mp4', subject: 'chemistry', book: 'hx-xb1', chapter: 4, type: 'micro', size: 62, tags: ['微课'], note: '', days: 10 },
    { name: '基因的自由组合定律习题讲评.docx', subject: 'biology', book: 'sw-bx2', chapter: 1, type: 'exercise', size: 2.6, tags: ['习题讲评'], note: '', days: 3 },
    { name: '生态系统的能量流动.pdf', subject: 'biology', book: 'sw-xb2', chapter: 3, type: 'new', size: 6.4, tags: ['能量流动'], note: '', days: 12 },
    { name: '我国的社会主义市场经济体制·议题式教学.pptx', subject: 'politics', book: 'zz-bx2', chapter: 2, type: 'open', size: 9.7, tags: ['议题式教学', '市级教研'], note: '以“直播助农”为总议题。', days: 1, open: 6 },
    { name: '哲学与文化高考主观题突破.pdf', subject: 'politics', book: 'zz-gk', chapter: 3, type: 'examprep', size: 3.8, tags: ['主观题'], note: '', days: 9 },
    { name: '辛亥革命：史料研读与历史解释.pdf', subject: 'history', book: 'ls-bx1', chapter: 6, type: 'new', size: 7.3, tags: ['史料研读'], note: '', days: 6 },
    { name: '中国古代史阶段特征梳理.pptx', subject: 'history', book: 'ls-gk', chapter: 1, type: 'review', size: 11.8, tags: ['阶段特征'], note: '', days: 5, open: 7 },
    { name: '大气受热过程微课.mp4', subject: 'geography', book: 'dl-bx1', chapter: 2, type: 'micro', size: 54, tags: ['微课'], note: '', days: 4, open: 8 },
    { name: '综合题答题规范：区域特征分析.pdf', subject: 'geography', book: 'dl-gk', chapter: 7, type: 'examprep', size: 3.8, tags: ['答题规范'], note: '', days: 7 }
  ];

  function daysAgoIso(days, hour) {
    const date = new Date();
    date.setDate(date.getDate() - (days || 0));
    date.setHours(hour == null ? 9 : hour, 20, 0, 0);
    return date.toISOString();
  }

  function buildDemoItems() {
    return DEMO_SPECS.map((spec, index) => {
      const subject = DATA.subjectById[spec.subject];
      const book = DATA.bookById[spec.book];
      const chapter = DATA.chapterById[`${spec.book}-c${spec.chapter}`];
      if (!subject || !book || !chapter) return null;
      const ext = spec.name.split('.').pop().toLowerCase();
      const created = daysAgoIso(spec.days, 8 + (index % 8));
      return {
        id: `demo-${String(index + 1).padStart(2, '0')}`,
        name: spec.name,
        filePath: '',
        ext,
        size: Math.round(spec.size * 1024 * 1024),
        mtimeMs: parseDate(created) ? parseDate(created).getTime() : 0,
        subjectId: subject.id,
        bookId: book.id,
        chapterId: chapter.id,
        typeId: spec.type,
        tags: spec.tags || [],
        note: spec.note || '',
        favorite: Boolean(spec.favorites),
        demo: true,
        createdAt: created,
        updatedAt: created,
        lastOpenedAt: spec.open == null ? '' : daysAgoIso(spec.open, 10)
      };
    }).filter(Boolean);
  }

  /* ---------------- 数据读取 ---------------- */

  function itemSubject(item) {
    return DATA.subjectById[item.subjectId] || null;
  }

  function itemBook(item) {
    return DATA.bookById[item.bookId] || null;
  }

  function itemChapter(item) {
    return DATA.chapterById[item.chapterId] || null;
  }

  function itemType(item) {
    return DATA.typeById[item.typeId] || DATA.typeById.new;
  }

  function bookName(book) {
    if (!book) return '未分类教材';
    return book.subtitle ? `${book.name} · ${book.subtitle}` : book.name;
  }

  function itemGrade(item) {
    const book = itemBook(item);
    return book ? book.grades[0] : '';
  }

  function itemGradeText(item) {
    const book = itemBook(item);
    if (!book) return '';
    return book.grades.join(' / ');
  }

  function isComplete(item) {
    return Boolean(item.subjectId && item.bookId && item.chapterId && item.typeId);
  }

  function isMissing(item) {
    return !item.demo && Boolean(item.filePath) && state.missing.has(item.filePath);
  }

  /* ---------------- 筛选与浏览 ---------------- */

  const QUICK_LABELS = {
    recent: '最近使用',
    favorites: '我的收藏',
    incomplete: '待完善分类'
  };

  function normalizeFilters() {
    if (state.subjectId && !DATA.subjectById[state.subjectId]) state.subjectId = '';
    if (state.typeId && !DATA.typeById[state.typeId]) state.typeId = '';
    if (state.grade && !GRADE_NAMES.includes(state.grade)) state.grade = '';
    if (state.bookId) {
      const book = DATA.bookById[state.bookId];
      if (!book || (state.subjectId && book.subjectId !== state.subjectId) || (state.grade && !book.grades.includes(state.grade))) {
        state.bookId = '';
        state.chapterId = '';
      }
    }
    if (state.chapterId) {
      const chapter = DATA.chapterById[state.chapterId];
      if (!chapter || chapter.bookId !== state.bookId) state.chapterId = '';
    }
  }

  function matchesSearch(item, query) {
    if (!query) return true;
    const subject = itemSubject(item);
    const book = itemBook(item);
    const chapter = itemChapter(item);
    const type = itemType(item);
    const haystack = [
      item.name,
      item.note,
      (item.tags || []).join(' '),
      subject ? subject.name : '',
      book ? bookName(book) : '',
      chapter ? chapter.name : '',
      type ? type.name : ''
    ].join(' ').toLowerCase();
    return query.toLowerCase().split(/\s+/).filter(Boolean).every((part) => haystack.includes(part));
  }

  function getFilteredItems() {
    normalizeFilters();
    let items = state.items.slice();
    if (state.quick === 'favorites') items = items.filter((item) => item.favorite);
    if (state.quick === 'recent') items = items.filter((item) => item.lastOpenedAt);
    if (state.quick === 'incomplete') items = items.filter((item) => !isComplete(item));
    if (state.subjectId) items = items.filter((item) => item.subjectId === state.subjectId);
    if (state.grade) {
      items = items.filter((item) => {
        const book = itemBook(item);
        return Boolean(book && book.grades.includes(state.grade));
      });
    }
    if (state.bookId) items = items.filter((item) => item.bookId === state.bookId);
    if (state.chapterId) items = items.filter((item) => item.chapterId === state.chapterId);
    if (state.typeId) items = items.filter((item) => item.typeId === state.typeId);
    if (state.search) items = items.filter((item) => matchesSearch(item, state.search));
    return sortItems(items);
  }

  function sortItems(items) {
    const result = items.slice();
    if (state.quick === 'recent') {
      return result.sort((a, b) => (parseDate(b.lastOpenedAt)?.getTime() || 0) - (parseDate(a.lastOpenedAt)?.getTime() || 0));
    }
    switch (state.sort) {
      case 'oldest':
        return result.sort((a, b) => (parseDate(a.createdAt)?.getTime() || 0) - (parseDate(b.createdAt)?.getTime() || 0));
      case 'name':
        return result.sort((a, b) => stripExtension(a.name, a.ext).localeCompare(stripExtension(b.name, b.ext), 'zh-CN', { numeric: true }));
      case 'size':
        return result.sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
      case 'newest':
      default:
        return result.sort((a, b) => (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0));
    }
  }

  function countBySubject(subjectId) {
    return state.items.filter((item) => item.subjectId === subjectId).length;
  }

  function renderChrome() {
    normalizeFilters();
    ui.schoolYear.textContent = schoolYear();
    ui.contextTitle.textContent = PAGE_TITLES[state.page] || PAGE_TITLES.library;
    ui.navCount.textContent = String(state.items.length);
    ui.navCatalogCount.textContent = String(DATA.stats.books);
    ui.navTypesCount.textContent = String(DATA.stats.types);
    if (ui.navVocabCount) ui.navVocabCount.textContent = String(WORDS.length);
    if (ui.navQuestionCount) ui.navQuestionCount.textContent = String(state.questions.filter((q) => q.status !== 'done').length);
    ui.favCount.textContent = String(state.items.filter((item) => item.favorite).length);
    ui.incompleteCount.textContent = String(state.items.filter((item) => !isComplete(item)).length);
    if (ui.searchBox) ui.searchBox.hidden = TOOL_PAGES.has(state.page);

    ui.navItems.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.page === state.page);
    });
    ui.quickItems.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.quick === state.quick);
    });

    ui.subjectNav.innerHTML = DATA.catalog.map((subject) => {
      const count = countBySubject(subject.id);
      return `<button type="button" class="subject-item${state.subjectId === subject.id ? ' is-active' : ''}${count ? ' has-files' : ''}" style="--subject-color:${subject.color}" data-subject="${subject.id}" title="${attr(subject.name)} · ${count} 份课件">
        <span class="subject-symbol">${esc(subject.short)}</span>
        <span class="subject-name">${esc(subject.name)}</span>
        <span class="subject-count">${count}</span>
      </button>`;
    }).join('');

    if (ui.heroSubjectDots) {
      ui.heroSubjectDots.innerHTML = DATA.catalog.map((subject) => (
        `<span class="board-subject-dot" style="--dot-color:${subject.color}"><i></i>${esc(subject.name)}</span>`
      )).join('');
    }

    const total = state.items.length;
    const coveredSubjects = new Set(state.items.map((item) => item.subjectId).filter(Boolean)).size;
    const totalSize = state.items.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
    const weekAgo = Date.now() - 7 * 86400000;
    const weekCount = state.items.filter((item) => {
      const date = parseDate(item.createdAt);
      return date && date.getTime() >= weekAgo;
    }).length;
    const demoCount = state.items.filter((item) => item.demo).length;

    ui.statTotal.textContent = String(total);
    ui.statTotalSub.textContent = total === 0 ? '等待导入' : `本周 +${weekCount}`;
    ui.statSubjects.innerHTML = `${coveredSubjects}<small>/9</small>`;
    ui.statSubjectsSub.textContent = coveredSubjects === 9 ? '九科齐全' : `还差 ${9 - coveredSubjects} 个学科`;
    ui.statSize.textContent = formatSize(totalSize);
    ui.statSizeSub.textContent = total > 0 ? '仅索引本机文件' : '本地引用';
    ui.statBooks.innerHTML = `${DATA.stats.books}<small>本</small>`;
    ui.statBooksSub.textContent = `${DATA.stats.chapters} 章节/专题`;
    ui.storageMiniText.textContent = total ? `${total} 份 · ${formatSize(totalSize)}` : '仅索引，不复制原件';

    ui.demoNotice.hidden = !(demoCount > 0 && !state.demoNoticeHidden);
    const hint = $('#clearDemoHint');
    if (hint) hint.textContent = `移除所有带「示例」标记的记录（${demoCount} 份）`;
  }

  function option(value, label, selected, extra) {
    return `<option value="${attr(value)}"${selected ? ' selected' : ''}${extra || ''}>${esc(label)}</option>`;
  }

  function booksFor(subjectId, grade) {
    const list = subjectId
      ? (DATA.subjectById[subjectId] ? DATA.subjectById[subjectId].books : [])
      : DATA.books;
    return list.filter((book) => !grade || book.grades.includes(grade));
  }

  function bookOptionLabel(book, withSubject) {
    const subject = withSubject ? `${DATA.subjectById[book.subjectId].name} · ` : '';
    return `${subject}${book.name}${book.review ? '（复习专题）' : ''}`;
  }

  function renderFilters() {
    normalizeFilters();
    const countAll = state.items.length;
    const gradeCounts = {
      '': countAll,
      '高一': state.items.filter((item) => itemBook(item)?.grades.includes('高一')).length,
      '高二': state.items.filter((item) => itemBook(item)?.grades.includes('高二')).length,
      '高三': state.items.filter((item) => itemBook(item)?.grades.includes('高三')).length
    };
    ui.gradeTabs.innerHTML = ['', ...GRADE_NAMES].map((grade) => (
      `<button type="button" class="grade-tab${state.grade === grade ? ' is-active' : ''}" data-grade="${grade}" title="${grade || '全部年级'} · ${gradeCounts[grade]} 份">${grade || '全部'}</button>`
    )).join('');

    const bookList = booksFor(state.subjectId, state.grade);
    if (state.bookId && !bookList.some((book) => book.id === state.bookId)) state.bookId = '';
    let bookHtml = option('', '全部教材', !state.bookId);
    if (state.subjectId) {
      bookHtml += bookList.map((book) => option(book.id, bookOptionLabel(book, false), state.bookId === book.id)).join('');
    } else {
      DATA.catalog.forEach((subject) => {
        const list = subject.books.filter((book) => !state.grade || book.grades.includes(state.grade));
        if (!list.length) return;
        bookHtml += `<optgroup label="${attr(subject.name)}">${list.map((book) => option(book.id, bookOptionLabel(book, false), state.bookId === book.id)).join('')}</optgroup>`;
      });
    }
    ui.bookFilter.innerHTML = bookHtml;

    const selectedBook = state.bookId ? DATA.bookById[state.bookId] : null;
    if (!selectedBook) {
      state.chapterId = '';
      ui.chapterFilter.disabled = true;
      ui.chapterFilter.innerHTML = option('', '先选择教材', true);
    } else {
      ui.chapterFilter.disabled = false;
      ui.chapterFilter.innerHTML = option('', '全部章节', !state.chapterId)
        + selectedBook.chapters.map((chapter) => option(chapter.id, chapter.name, state.chapterId === chapter.id)).join('');
    }

    ui.typeFilter.innerHTML = option('', '全部类型', !state.typeId)
      + DATA.courseTypes.map((type) => option(type.id, type.name, state.typeId === type.id)).join('');
    ui.sortSelect.value = state.sort;

    $$('.view-btn').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.view === state.view);
    });
  }

  function chip(key, label) {
    return `<span class="filter-chip">${esc(label)}<button type="button" data-clear="${key}" aria-label="移除筛选：${attr(label)}">${icon('close')}</button></span>`;
  }

  function renderActiveFilters() {
    const chips = [];
    if (state.quick) chips.push(chip('quick', QUICK_LABELS[state.quick]));
    if (state.subjectId && DATA.subjectById[state.subjectId]) chips.push(chip('subject', DATA.subjectById[state.subjectId].name));
    if (state.grade) chips.push(chip('grade', state.grade));
    if (state.bookId && DATA.bookById[state.bookId]) chips.push(chip('book', DATA.bookById[state.bookId].name));
    if (state.chapterId && DATA.chapterById[state.chapterId]) chips.push(chip('chapter', DATA.chapterById[state.chapterId].name));
    if (state.typeId && DATA.typeById[state.typeId]) chips.push(chip('type', DATA.typeById[state.typeId].name));
    if (state.search) chips.push(chip('search', `“${state.search}”`));

    ui.activeFilters.hidden = chips.length === 0;
    if (!chips.length) {
      ui.activeFilters.innerHTML = '';
      return;
    }
    ui.activeFilters.innerHTML = `<span class="active-filter-label">当前筛选</span>${chips.join('')}<button type="button" class="text-button clear-filters" data-clear-all>清除全部</button>`;
  }

  function listHeading(filteredCount) {
    let kicker = 'RESOURCE LIBRARY';
    let title = '全部课件';
    let subtitle = '按学科、教材和章节快速定位你的教学资源';

    if (state.search) {
      kicker = 'SEARCH RESULT';
      title = `搜索“${state.search}”`;
      subtitle = `在全部课件中查找：${state.search}`;
    } else if (state.chapterId && DATA.chapterById[state.chapterId]) {
      kicker = 'CHAPTER RESOURCE';
      title = DATA.chapterById[state.chapterId].name;
      subtitle = `${state.subjectId && DATA.subjectById[state.subjectId] ? DATA.subjectById[state.subjectId].name : '全部学科'} · ${state.bookId && DATA.bookById[state.bookId] ? bookName(DATA.bookById[state.bookId]) : ''}`;
    } else if (state.bookId && DATA.bookById[state.bookId]) {
      const book = DATA.bookById[state.bookId];
      const subject = state.subjectId && DATA.subjectById[state.subjectId];
      kicker = 'TEXTBOOK RESOURCE';
      title = `${subject ? `${subject.name} · ` : ''}${bookName(book)}`;
      subtitle = `${book.grades.join(' / ')} · ${book.chapters.length} 个章节`;
    } else if (state.subjectId && DATA.subjectById[state.subjectId]) {
      const subject = DATA.subjectById[state.subjectId];
      const type = state.typeId && DATA.typeById[state.typeId];
      kicker = 'SUBJECT RESOURCE';
      title = `${subject.name}${type ? ` · ${type.name}` : ''}课件`;
      subtitle = type ? type.desc : `${subject.edition} · 共 ${subject.books.length} 本教材/专题`;
    } else if (state.quick) {
      kicker = 'CURATED VIEW';
      title = QUICK_LABELS[state.quick];
      subtitle = {
        recent: '按最近打开时间排列的课件',
        favorites: '你标记为重点资源的课件',
        incomplete: '尚未补全章节或分类信息的课件'
      }[state.quick];
    } else if (state.typeId && DATA.typeById[state.typeId]) {
      const type = DATA.typeById[state.typeId];
      kicker = 'COURSE TYPE';
      title = `${type.name}课件`;
      subtitle = type.desc;
    } else if (state.grade) {
      kicker = 'GRADE RESOURCE';
      title = `${state.grade}课件`;
      subtitle = '按年级筛选全部学科与教材';
    }

    if (filteredCount === 0) subtitle = '当前条件下暂无课件资源';
    else subtitle += ` · 共 ${filteredCount} 份`;

    return { kicker, title, subtitle };
  }

  function fileCardHtml(item, index) {
    const subject = itemSubject(item);
    const book = itemBook(item);
    const chapter = itemChapter(item);
    const type = itemType(item);
    const meta = fileMeta(item.ext);
    const color = subject ? subject.color : '#8198ac';
    const title = stripExtension(item.name, item.ext);
    const missing = isMissing(item);
    const chapterText = joinPath(book ? book.name : '未分教材', chapter ? chapter.name : '未分章节');
    const grade = itemGrade(item);
    return `<article class="file-card${missing ? ' is-missing' : ''}" data-file-id="${attr(item.id)}" tabindex="0" style="--file-color:${color};animation-delay:${Math.min(index * 24, 200)}ms" aria-label="${attr(title)}">
      <div class="file-cover" style="--type-color:${type.color}">
        <div class="cover-top">
          <span class="type-pill">${esc(type.name)}</span>
          <button type="button" class="fav-button${item.favorite ? ' is-active' : ''}" data-favorite="${attr(item.id)}" title="${item.favorite ? '取消收藏' : '加入收藏'}" aria-label="${item.favorite ? '取消收藏' : '加入收藏'}">${icon('star')}</button>
        </div>
        <div class="cover-sheet">
          <span class="cover-sheet-icon">${icon(meta.icon)}</span>
          <span class="cover-sheet-ext">${esc(item.ext || 'FILE')}</span>
        </div>
        <span class="cover-subject" aria-hidden="true">${esc(subject ? subject.short : '课')}</span>
        <div class="cover-meta"><span>${esc(grade || '未分年级')}</span><i></i><span>${esc(meta.label)}</span></div>
        ${missing ? '<span class="missing-flag">文件缺失</span>' : ''}
        ${item.demo ? '<span class="demo-flag">示例</span>' : ''}
      </div>
      <div class="file-body">
        <h3 class="file-title" title="${attr(item.name)}">${esc(title)}</h3>
        <p class="file-chapter" title="${attr(chapterText)}">${icon('folder')}<span>${esc(chapterText)}</span></p>
        <div class="file-card-footer">
          <span>${formatSize(item.size)}</span>
          <span>·</span>
          <span>${formatDate(item.createdAt)}</span>
          <span class="footer-spacer"></span>
          <button type="button" class="more-button" data-more="${attr(item.id)}" title="查看详情" aria-label="查看详情">${icon('more')}</button>
        </div>
      </div>
    </article>`;
  }

  function fileRowHtml(item) {
    const subject = itemSubject(item);
    const book = itemBook(item);
    const chapter = itemChapter(item);
    const type = itemType(item);
    const meta = fileMeta(item.ext);
    const color = subject ? subject.color : '#8198ac';
    const missing = isMissing(item);
    const title = stripExtension(item.name, item.ext);
    return `<div class="file-row${missing ? ' is-missing' : ''}" data-file-id="${attr(item.id)}" tabindex="0" style="--file-color:${color}" aria-label="${attr(title)}">
      <span class="row-icon">${icon(meta.icon)}</span>
      <div class="row-main">
        <h3>${esc(title)}</h3>
        <p>${esc(joinPath(book ? bookName(book) : '未分教材', chapter ? chapter.name : '未分章节'))}</p>
      </div>
      <div class="row-tags">
        <span class="mini-tag">${esc(subject ? subject.name : '未分学科')}</span>
        <span class="mini-tag accent" style="--tag-color:${type.color}">${esc(type.name)}</span>
        ${item.demo ? '<span class="mini-tag">示例</span>' : ''}
        ${missing ? '<span class="mini-tag" style="--tag-color:#c56a6a">文件缺失</span>' : ''}
      </div>
      <div class="row-meta"><span>${formatSize(item.size)}</span><span>${formatDate(item.createdAt)}</span></div>
      <button type="button" class="more-button" data-more="${attr(item.id)}" title="查看详情" aria-label="查看详情">${icon('more')}</button>
    </div>`;
  }

  function renderEmptyState(hasFilters) {
    if (!state.items.length) {
      ui.emptyState.innerHTML = `<div class="empty-visual">${icon('folder')}</div>
        <h3>课件库还是空的</h3>
        <p>把散落在电脑里的课件交给枣庄八中课件库吧。支持单个文件、批量文件和整个文件夹导入，原文件不会被移动或复制。</p>
        <div class="empty-actions">
          <button type="button" class="btn btn-primary" data-action="import" data-import-mode="files">${icon('upload')}导入课件文件</button>
          <button type="button" class="btn btn-ghost" data-action="import" data-import-mode="folder">${icon('folder')}扫描文件夹</button>
        </div>`;
    } else {
      ui.emptyState.innerHTML = `<div class="empty-visual">${icon('search')}</div>
        <h3>没有找到匹配的课件</h3>
        <p>试试更换搜索关键词，或清除部分筛选条件。当前筛选会同时作用于学科、教材、章节与课程分类。</p>
        <div class="empty-actions">
          <button type="button" class="btn btn-primary" data-clear-all>${icon('refresh')}清除全部筛选</button>
          <button type="button" class="btn btn-ghost" data-action="import">${icon('upload')}继续导入</button>
        </div>`;
    }
    ui.emptyState.hidden = false;
  }

  function renderLibrary() {
    normalizeFilters();
    renderFilters();
    renderActiveFilters();

    const filtered = getFilteredItems();
    const heading = listHeading(filtered.length);
    ui.listKicker.textContent = heading.kicker;
    ui.listTitle.textContent = heading.title;
    ui.listSubtitle.textContent = heading.subtitle;

    const visibleItems = filtered.slice(0, state.visible);
    const showGrid = state.view === 'grid';
    ui.fileGrid.hidden = !showGrid || !visibleItems.length;
    ui.fileList.hidden = showGrid || !visibleItems.length;
    if (visibleItems.length) {
      if (showGrid) {
        ui.fileGrid.innerHTML = visibleItems.map((item, index) => fileCardHtml(item, index)).join('');
        ui.fileList.innerHTML = '';
      } else {
        ui.fileList.innerHTML = visibleItems.map((item) => fileRowHtml(item)).join('');
        ui.fileGrid.innerHTML = '';
      }
      ui.emptyState.hidden = true;
    } else {
      ui.fileGrid.innerHTML = '';
      ui.fileList.innerHTML = '';
      renderEmptyState(Boolean(state.subjectId || state.bookId || state.chapterId || state.typeId || state.grade || state.search || state.quick));
    }

    ui.resultsMeta.hidden = filtered.length === 0;
    if (filtered.length) {
      const shown = visibleItems.length;
      ui.resultsMeta.innerHTML = `<span>共 <strong>${filtered.length}</strong> 份课件${shown < filtered.length ? `，当前显示 ${shown} 份` : ''}</span><span>${{ newest: '按最近添加', oldest: '按最早添加', name: '按名称', size: '按文件大小' }[state.sort] || ''}</span>`;
    }

    const hasMore = visibleItems.length < filtered.length;
    ui.loadMoreWrap.hidden = !hasMore;
    if (hasMore) ui.loadMoreButton.textContent = `显示更多课件（还有 ${filtered.length - visibleItems.length} 份）`;
    ui.filesArea.hidden = filtered.length === 0;
  }

  /* ---------------- 教材目录 ---------------- */

  function renderCatalogGradeTabs() {
    const counts = {
      '': DATA.stats.books,
      '高一': 0,
      '高二': 0,
      '高三': 0
    };
    DATA.books.forEach((book) => {
      book.grades.forEach((grade) => {
        if (counts[grade] != null) counts[grade] += 1;
      });
    });
    ui.catalogGradeTabs.innerHTML = ['', ...GRADE_NAMES].map((grade) => (
      `<button type="button" class="grade-tab${state.catalogGrade === grade ? ' is-active' : ''}" data-catalog-grade="${grade}" title="${grade || '全部年级'}">${grade || '全部'}<span class="tab-count">${counts[grade]}</span></button>`
    )).join('');
  }

  function subjectBooksForGrade(subject, grade) {
    return subject.books.filter((book) => !grade || book.grades.includes(grade));
  }

  function renderCatalog() {
    renderCatalogGradeTabs();
    const grade = state.catalogGrade;
    let subjects = DATA.catalog.map((subject) => ({
      subject,
      books: subjectBooksForGrade(subject, grade)
    }));
    const withBooks = subjects.filter((entry) => entry.books.length);
    if (!withBooks.some((entry) => entry.subject.id === state.catalogSubjectId)) {
      state.catalogSubjectId = withBooks.length ? withBooks[0].subject.id : DATA.catalog[0].id;
    }
    const activeEntry = subjects.find((entry) => entry.subject.id === state.catalogSubjectId) || subjects[0];
    const activeSubject = activeEntry.subject;
    const books = activeEntry.books;
    if (!books.some((book) => book.id === state.catalogBookId)) {
      state.catalogBookId = books.length ? books[0].id : '';
    }
    const activeBook = state.catalogBookId ? DATA.bookById[state.catalogBookId] : null;

    const filteredBookTotal = subjects.reduce((sum, entry) => sum + entry.books.length, 0);
    const filteredChapterTotal = subjects.reduce((sum, entry) => (
      sum + entry.books.reduce((chapterSum, book) => chapterSum + book.chapters.length, 0)
    ), 0);
    ui.catalogSubjectCount.textContent = String(withBooks.length);
    ui.catalogBookCount.textContent = String(filteredBookTotal);
    ui.catalogChapterCount.textContent = String(filteredChapterTotal);
    ui.catalogFilteredCount.textContent = String(withBooks.length);
    ui.catalogBookFilteredCount.textContent = `${books.length} 本`;
    ui.catalogBooksTitle.textContent = `${activeSubject.name}教材${grade ? ` · ${grade}` : ''}`;

    ui.catalogSubjects.innerHTML = subjects.map(({ subject, books: subjectBooks }) => {
      const selected = subject.id === state.catalogSubjectId;
      return `<button type="button" class="catalog-subject-item${selected ? ' is-active' : ''}" style="--subject-color:${subject.color}" data-catalog-subject="${subject.id}">
        <span class="subject-badge">${esc(subject.short)}</span>
        <span class="subject-item-copy"><strong>${esc(subject.name)}</strong><small>${esc(subject.edition)}</small></span>
        <span class="subject-item-count">${subjectBooks.length} 本</span>
      </button>`;
    }).join('');

    if (!books.length) {
      ui.catalogBooks.innerHTML = `<div class="catalog-empty">${icon('book')}<p>${grade ? `该学科暂无${grade}教材` : '暂无教材目录'}</p></div>`;
    } else {
      const groups = grade ? [grade] : GRADE_NAMES;
      ui.catalogBooks.innerHTML = groups.map((groupName) => {
        const groupBooks = grade ? books : books.filter((book) => book.grades[0] === groupName);
        if (!groupBooks.length) return '';
        const gradeMeta = DATA.grades.find((item) => item.name === groupName) || { color: '#6f9dc2' };
        return `<div class="catalog-book-group">
          <div class="book-group-label" style="--grade-color:${gradeMeta.color}">${groupName}<span>${groupBooks.length} 本</span></div>
          ${groupBooks.map((book) => {
            const count = state.items.filter((item) => item.bookId === book.id).length;
            const isActive = book.id === state.catalogBookId;
            return `<button type="button" class="catalog-book-item${isActive ? ' is-active' : ''}" data-catalog-book="${book.id}">
              <span class="book-item-mark" style="--grade-color:${gradeMeta.color}"></span>
              <span class="book-item-copy">
                <strong>${esc(book.name)}${book.review ? '<span class="review-mark">复习</span>' : ''}</strong>
                <small>${esc(book.subtitle || `${book.chapters.length} 个章节`)}</small>
              </span>
              <span class="book-item-side">
                <span class="book-grade-tag" style="--grade-color:${gradeMeta.color}">${esc(book.grades.join('/'))}</span>
                <span class="book-file-count${count ? ' has-files' : ''}">${count ? `${count} 份` : '未归档'}</span>
              </span>
            </button>`;
          }).join('')}
        </div>`;
      }).join('');
    }

    ui.catalogViewAllButton.disabled = !activeBook;
    if (!activeBook) {
      ui.catalogChaptersTitle.textContent = '选择一个教材';
      ui.catalogChapters.innerHTML = `<div class="catalog-empty">${icon('bookOpen')}<p>从左侧选择教材，查看章节与课件资源</p></div>`;
      return;
    }

    ui.catalogChaptersTitle.textContent = activeBook.name;
    ui.catalogChapters.innerHTML = activeBook.chapters.map((chapter) => {
      const count = state.items.filter((item) => item.chapterId === chapter.id).length;
      return `<button type="button" class="catalog-chapter-item" data-catalog-chapter="${chapter.id}" data-catalog-book-id="${activeBook.id}" data-catalog-subject-id="${activeBook.subjectId}">
        <span class="chapter-number">${chapter.index}</span>
        <span class="chapter-item-copy"><strong>${esc(chapter.name)}</strong><small>${esc(bookName(activeBook))}</small></span>
        <span class="chapter-file-count${count ? ' has-files' : ''}">${count || '—'}</span>
      </button>`;
    }).join('');
  }

  /* ---------------- 课程分类 ---------------- */

  function countByType(typeId) {
    return state.items.filter((item) => item.typeId === typeId).length;
  }

  function typeSubjectCoverage(typeId) {
    return new Set(state.items.filter((item) => item.typeId === typeId).map((item) => item.subjectId).filter(Boolean)).size;
  }

  function renderTypes() {
    const total = state.items.length;
    const rows = DATA.courseTypes.map((type) => ({
      type,
      count: countByType(type.id),
      coverage: typeSubjectCoverage(type.id)
    }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    const most = rows.slice().sort((a, b) => b.count - a.count)[0];
    const usedTypes = rows.filter((row) => row.count > 0).length;
    const coveredSubjects = new Set(state.items.map((item) => item.subjectId).filter(Boolean)).size;

    ui.typeSummary.innerHTML = `<span class="type-summary-title">${icon('layers')}分类概览</span>
      <span class="type-summary-item">已归档 <strong>${total}</strong> 份</span>
      <span class="type-summary-item">使用 <strong>${usedTypes}</strong> / 8 类</span>
      <span class="type-summary-item">覆盖 <strong>${coveredSubjects}</strong> / 9 学科</span>
      <span class="type-summary-item">最常用 <strong>${total && most && most.count ? esc(most.type.name) : '暂无'}</strong></span>`;

    ui.typeGrid.innerHTML = rows.map(({ type, count, coverage }) => {
      const share = total ? Math.round((count / total) * 100) : 0;
      return `<button type="button" class="type-card" data-type-id="${type.id}" style="--type-color:${type.color}">
        <div class="type-card-head">
          <span class="type-icon">${esc(type.short)}</span>
          <span class="type-title"><strong>${esc(type.name)}</strong><span>${coverage ? `${coverage} 个学科` : '等待归档'}</span></span>
          <span class="type-count">${count}<small>份</small></span>
        </div>
        <p class="type-desc">覆盖 ${coverage} 个学科，占全部课件的 ${share}%</p>
        <div class="type-bar"><i style="width:${count ? Math.max(7, Math.round((count / max) * 100)) : 0}%"></i></div>
        <div class="type-foot"><span>${coverage ? `${coverage} / 9 学科` : '暂无课件'}</span><span>查看课件 →</span></div>
      </button>`;
    }).join('');

    const header = `<thead><tr><th>学科</th>${DATA.courseTypes.map((type) => `<th>${esc(type.name)}</th>`).join('')}</tr></thead>`;
    const body = DATA.catalog.map((subject) => {
      const cells = DATA.courseTypes.map((type) => {
        const count = state.items.filter((item) => item.subjectId === subject.id && item.typeId === type.id).length;
        return count
          ? `<td><button type="button" class="matrix-cell has-value" data-matrix-subject="${subject.id}" data-matrix-type="${type.id}" title="${attr(`${subject.name} · ${type.name} · ${count} 份`)}">${count}</button></td>`
          : '<td><span class="matrix-cell" title="暂无课件">—</span></td>';
      }).join('');
      return `<tr><td><span class="matrix-subject" style="--dot-color:${subject.color}"><span class="matrix-subject-dot"></span>${esc(subject.name)}</span></td>${cells}</tr>`;
    }).join('');

    ui.coverageMatrix.innerHTML = `${header}<tbody>${body}</tbody>`;
  }

  /* ---------------- 数据管理 ---------------- */

  function renderData() {
    const total = state.items.length;
    const totalSize = state.items.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
    const classified = state.items.filter((item) => isComplete(item)).length;
    const demoCount = state.items.filter((item) => item.demo).length;
    const missingCount = state.items.filter((item) => isMissing(item)).length;
    const coveredSubjects = new Set(state.items.map((item) => item.subjectId).filter(Boolean)).size;
    const percent = total ? Math.round((classified / total) * 100) : 0;

    $('#dataTotalSize').textContent = formatSize(totalSize);
    $('#dataTotalFiles').textContent = `${total} 份课件 · ${coveredSubjects} 个学科`;
    $('#dataDemoCount').textContent = String(demoCount);
    $('#dataMissingCount').textContent = String(missingCount);
    $('#dataClassifiedCount').textContent = `${classified} / ${total}`;
    $('#dataPath').textContent = state.dataPath || state.appInfo?.libraryPath || '读取中…';
    $('#storagePercent').innerHTML = `${percent}<small>%</small>`;
    $('#storageRing').style.background = `conic-gradient(#4b96d7 ${percent}%, #e8f2fb ${percent}%)`;

    const version = $('#appVersion');
    if (version) version.textContent = `v${state.appInfo?.version || '2.2.0'}`;
    const hint = $('#clearDemoHint');
    if (hint) hint.textContent = `移除所有带「示例」标记的记录（${demoCount} 份）`;
    const clearDemoButton = $('#clearDemoButtonData');
    if (clearDemoButton) clearDemoButton.disabled = demoCount === 0;
  }

  /* ---------------- 英语 3500 词汇 ---------------- */

  function vocabLetterOf(word) {
    const first = String(word || '').trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : '#';
  }

  function filteredVocab() {
    const query = state.vocabQuery.trim().toLowerCase();
    const letter = state.vocabLetter;
    let list = WORDS;
    if (letter) list = list.filter((entry) => vocabLetterOf(entry.w) === letter);
    if (query) {
      list = list.filter((entry) => (
        String(entry.w || '').toLowerCase().includes(query)
        || String(entry.m || '').toLowerCase().includes(query)
        || String(entry.p || '').toLowerCase().includes(query)
      ));
    }
    return list.slice().sort((a, b) => {
      const aw = String(a.w || '').toLowerCase();
      const bw = String(b.w || '').toLowerCase();
      if (query) {
        const ap = aw.startsWith(query) ? 0 : 1;
        const bp = bw.startsWith(query) ? 0 : 1;
        if (ap !== bp) return ap - bp;
      }
      return aw.localeCompare(bw, 'en');
    });
  }

  function renderVocabResults() {
    const list = filteredVocab();
    const visible = list.slice(0, state.vocabLimit);
    const countNode = $('#vocabResultCount');
    if (countNode) countNode.textContent = String(list.length);
    const results = $('#vocabResults');
    if (!results) return;
    if (!visible.length) {
      results.innerHTML = `<div class="vocab-empty">${icon('search')}<strong>没有找到相关词汇</strong><p>换一个英文单词或中文释义试试，也可以点击上方字母浏览。</p></div>`;
    } else {
      results.innerHTML = visible.map((entry) => `<article class="vocab-card">
        <span class="vocab-initial">${esc(vocabLetterOf(entry.w))}</span>
        <div class="vocab-card-head">
          <strong class="vocab-word">${esc(entry.w)}</strong>
          ${entry.p ? `<span class="vocab-phonetic">${esc(entry.p)}</span>` : ''}
        </div>
        <p class="vocab-meaning">${esc(entry.m || '暂无释义')}</p>
      </article>`).join('');
    }
    const more = $('#vocabMoreWrap');
    if (more) more.hidden = list.length <= state.vocabLimit;
  }

  function renderVocab() {
    const totalBadge = $('#vocabTotalBadge');
    if (totalBadge) totalBadge.textContent = String(WORDS.length);
    const alphabet = $('#vocabAlphabet');
    if (alphabet) {
      const letters = ['', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'];
      alphabet.innerHTML = letters.map((letter) => (
        `<button type="button" class="vocab-letter${state.vocabLetter === letter ? ' is-active' : ''}" data-vocab-letter="${letter}" title="${letter ? `首字母 ${letter}` : '显示全部'}">${letter || '全部'}</button>`
      )).join('');
    }
    const input = $('#vocabSearch');
    if (input) input.value = state.vocabQuery;
    renderVocabResults();
  }

  function setVocabQuery(value) {
    state.vocabQuery = String(value || '');
    state.vocabLimit = 60;
    const input = $('#vocabSearch');
    if (input && input.value !== state.vocabQuery) input.value = state.vocabQuery;
    renderVocabResults();
  }

  /* ---------------- 学科提问 ---------------- */

  function questionSubjectMeta(question) {
    return DATA.subjectById[question.subjectId] || null;
  }

  function filteredQuestions() {
    const query = state.questionSearch.trim().toLowerCase();
    let list = state.questions.slice();
    if (state.questionStatus !== 'all') list = list.filter((question) => question.status === state.questionStatus);
    if (state.questionSubjectId) list = list.filter((question) => question.subjectId === state.questionSubjectId);
    if (query) {
      list = list.filter((question) => (
        String(question.title || '').toLowerCase().includes(query)
        || String(question.detail || '').toLowerCase().includes(query)
      ));
    }
    return list.sort((a, b) => {
      if (state.questionSort === 'newest') return String(b.createdAt).localeCompare(String(a.createdAt));
      if (state.questionSort === 'oldest') return String(a.createdAt).localeCompare(String(b.createdAt));
      if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  function renderQuestionStats() {
    const open = state.questions.filter((question) => question.status !== 'done').length;
    const done = state.questions.filter((question) => question.status === 'done').length;
    const votes = state.questions.reduce((sum, question) => sum + (Number(question.votes) || 0), 0);
    const openNode = $('#questionOpenCount');
    const doneNode = $('#questionDoneCount');
    const votesNode = $('#questionVoteTotal');
    if (openNode) openNode.textContent = String(open);
    if (doneNode) doneNode.textContent = String(done);
    if (votesNode) votesNode.textContent = String(votes);
  }

  function renderQuestionsList() {
    renderQuestionStats();
    const feedTitle = $('#questionFeedTitle');
    if (feedTitle) {
      feedTitle.textContent = state.questionStatus === 'done' ? '已讲解问题' : state.questionStatus === 'all' ? '全部问题' : '待讲解问题';
    }
    $$('#questionStatusTabs [data-question-status]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.questionStatus === state.questionStatus);
    });
    const list = filteredQuestions();
    const container = $('#questionList');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = `<div class="question-empty">${icon('chat')}<strong>${state.questionStatus === 'done' ? '还没有已讲解的问题' : '还没有待讲解的问题'}</strong><p>课代表可以在左侧发布题目，同学可以点「投票 +1」或由课代表填写票数。</p></div>`;
      return;
    }
    container.innerHTML = list.map((question) => {
      const subject = questionSubjectMeta(question);
      const isDone = question.status === 'done';
      const editingVotes = state.questionVoteEditId === question.id;
      const voteBox = editingVotes ? `<div class="question-vote-editor">
          <input type="number" min="0" max="9999" value="${Number(question.votes) || 0}" data-question-vote-input="${attr(question.id)}" aria-label="修改票数">
          <button type="button" data-question-save-votes="${attr(question.id)}">保存</button>
          <button type="button" data-question-cancel-votes="${attr(question.id)}">取消</button>
        </div>` : `<strong class="question-vote-number">${Number(question.votes) || 0}</strong><span>票</span>
        <button type="button" class="question-vote-btn" data-question-vote="${attr(question.id)}">投票 +1</button>
        <button type="button" class="question-vote-edit" data-question-edit-votes="${attr(question.id)}">改票数</button>`;
      return `<article class="question-item${isDone ? ' is-done' : ''}" data-question-id="${attr(question.id)}">
        <div class="question-vote-box">${voteBox}</div>
        <div class="question-main">
          <div class="question-meta">
            ${subject ? `<span class="question-subject" style="--subject-color:${subject.color}">${esc(subject.name)}</span>` : ''}
            <span class="question-status${isDone ? ' is-done' : ''}">${isDone ? '已讲解' : '待讲解'}</span>
            <span class="question-time">${esc(relativeTime(question.createdAt))}</span>
          </div>
          <h3 class="question-title">${esc(question.title)}</h3>
          ${question.detail ? `<p class="question-detail">${esc(question.detail)}</p>` : ''}
          <div class="question-footer">
            <span class="question-time">更新于 ${esc(formatDateTime(question.updatedAt) || '—')}</span>
            <div class="question-actions">
              <button type="button" class="question-action" data-question-done="${attr(question.id)}">${isDone ? '重新打开' : '标记已讲解'}</button>
              <button type="button" class="question-action is-danger" data-question-delete="${attr(question.id)}">删除</button>
            </div>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function renderQuestions() {
    if (!DATA.subjectById[state.questionFormSubject]) state.questionFormSubject = 'english';
    const subjectSelect = $('#questionSubject');
    if (subjectSelect) {
      subjectSelect.innerHTML = DATA.catalog.map((subject) => option(subject.id, subject.name, state.questionFormSubject === subject.id)).join('');
    }
    const filterSelect = $('#questionSubjectFilter');
    if (filterSelect) {
      filterSelect.innerHTML = option('', '全部学科', !state.questionSubjectId)
        + DATA.catalog.map((subject) => option(subject.id, subject.name, state.questionSubjectId === subject.id)).join('');
    }
    const sortSelect = $('#questionSort');
    if (sortSelect) sortSelect.value = state.questionSort;
    const searchInput = $('#questionSearch');
    if (searchInput) searchInput.value = state.questionSearch;
    renderQuestionsList();
  }

  async function createQuestionFromForm() {
    const titleInput = $('#questionTitle');
    const detailInput = $('#questionDetail');
    const votesInput = $('#questionVotes');
    const subjectSelect = $('#questionSubject');
    const title = String(titleInput?.value || '').trim();
    if (!title) {
      titleInput?.focus();
      showToast('请填写题目或题号。', { type: 'warn' });
      return;
    }
    const subjectId = subjectSelect?.value || state.questionFormSubject || 'english';
    if (!DATA.subjectById[subjectId]) {
      showToast('请选择学科。', { type: 'warn' });
      return;
    }
    const question = {
      id: uniqueId('question'),
      subjectId,
      title: title.slice(0, 200),
      detail: String(detailInput?.value || '').trim().slice(0, 800),
      votes: Math.max(0, Math.min(9999, Math.floor(Number(votesInput?.value) || 0))),
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const snapshot = state.questions.slice();
    state.questions.unshift(question);
    state.questionStatus = 'open';
    state.questionSubjectId = '';
    const ok = await persistLibrary();
    if (!ok) {
      state.questions = snapshot;
      renderQuestionsList();
      return;
    }
    if (titleInput) titleInput.value = '';
    if (detailInput) detailInput.value = '';
    if (votesInput) votesInput.value = '0';
    if (subjectSelect) subjectSelect.value = state.questionFormSubject;
    renderChrome();
    renderQuestionStats();
    renderQuestionsList();
    showToast(`问题已发布，当前 ${question.votes} 票。`, { type: 'success', title: '已加入待讲解' });
  }

  async function updateQuestionVotes(question, votes) {
    const value = Math.max(0, Math.min(9999, Math.floor(Number(votes) || 0)));
    question.votes = value;
    question.updatedAt = new Date().toISOString();
    state.questionVoteEditId = '';
    renderQuestionsList();
    await persistLibrary();
  }

  function askDeleteQuestion(question) {
    const subject = questionSubjectMeta(question);
    openConfirm({
      title: '删除这个问题？',
      message: `将删除「${esc(question.title)}」这条${subject ? ` ${esc(subject.name)}` : ''}提问记录，不会影响课件文件。`,
      confirmText: '删除',
      danger: true,
      onConfirm: async () => {
        state.questions = state.questions.filter((entry) => entry.id !== question.id);
        if (state.questionVoteEditId === question.id) state.questionVoteEditId = '';
        await persistLibrary();
        renderChrome();
        renderQuestionsList();
      }
    });
  }

  function bindQuestionEvents() {
    const form = $('#questionForm');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        createQuestionFromForm();
      });
    }
    const subject = $('#questionSubject');
    if (subject) {
      subject.addEventListener('change', () => {
        state.questionFormSubject = subject.value;
      });
    }
    const subjectFilter = $('#questionSubjectFilter');
    if (subjectFilter) {
      subjectFilter.addEventListener('change', () => {
        state.questionSubjectId = subjectFilter.value;
        renderQuestionsList();
      });
    }
    const sort = $('#questionSort');
    if (sort) {
      sort.addEventListener('change', () => {
        state.questionSort = sort.value;
        renderQuestionsList();
      });
    }
    const search = $('#questionSearch');
    if (search) {
      search.addEventListener('input', () => {
        state.questionSearch = search.value;
        renderQuestionsList();
      });
    }
    const vocabSearch = $('#vocabSearch');
    if (vocabSearch) {
      vocabSearch.addEventListener('input', () => {
        setVocabQuery(vocabSearch.value);
      });
    }
    const vocabMore = $('#vocabMoreButton');
    if (vocabMore) {
      vocabMore.addEventListener('click', () => {
        state.vocabLimit += 60;
        renderVocabResults();
      });
    }
  }

  /* ---------------- 课程表 ---------------- */

  function defaultClientTimetable() {
    return {
      periods: Array.from({ length: 8 }, (_, index) => ({
        id: `p${index + 1}`,
        label: `第${index + 1}节`,
        time: '',
        mon: '', tue: '', wed: '', thu: '', fri: '',
        satA: '', satB: '', sunA: '', sunB: ''
      })),
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeClientTimetable(raw) {
    if (!raw || !Array.isArray(raw.periods) || !raw.periods.length) return defaultClientTimetable();
    return {
      periods: raw.periods.slice(0, 12).map((period, index) => ({
        id: String(period.id || `p${index + 1}`),
        label: String(period.label || `第${index + 1}节`),
        time: String(period.time || ''),
        mon: String(period.mon || ''),
        tue: String(period.tue || ''),
        wed: String(period.wed || ''),
        thu: String(period.thu || ''),
        fri: String(period.fri || ''),
        satA: String(period.satA || ''),
        satB: String(period.satB || ''),
        sunA: String(period.sunA || ''),
        sunB: String(period.sunB || '')
      })),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  function todayVoteKey() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function normalizeClientSubjectVotes(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const result = {};
    Object.keys(raw).slice(0, 400).forEach((date) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !raw[date] || typeof raw[date] !== 'object') return;
      const day = {};
      Object.keys(raw[date]).slice(0, 30).forEach((subjectId) => {
        const count = Math.max(0, Math.min(99999, Math.floor(Number(raw[date][subjectId]) || 0)));
        if (count) day[subjectId] = count;
      });
      if (Object.keys(day).length) result[date] = day;
    });
    return result;
  }

  function normalizeClientStudents(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 500).map((student, index) => {
      if (!student || !student.name) return null;
      return {
        id: String(student.id || `student-${index + 1}`),
        name: String(student.name).slice(0, 40),
        weight: Math.max(1, Math.min(20, Math.floor(Number(student.weight) || 1))),
        pickedCount: Math.max(0, Math.floor(Number(student.pickedCount) || 0)),
        lastPickedAt: String(student.lastPickedAt || '')
      };
    }).filter(Boolean);
  }

  function normalizeClientWordGameScores(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 500).map((entry) => {
      if (!entry || !entry.nickname) return null;
      const total = Math.max(1, Math.min(1000, Math.floor(Number(entry.total) || 0)));
      const correct = Math.max(0, Math.min(total, Math.floor(Number(entry.correct) || 0)));
      return {
        nickname: String(entry.nickname).slice(0, 24),
        total,
        correct,
        duration: Math.max(0, Math.floor(Number(entry.duration) || 0)),
        date: String(entry.date || '')
      };
    }).filter(Boolean);
  }

  function normalizeAiSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      model: ['deepseek-chat', 'deepseek-reasoner'].includes(source.model) ? source.model : 'deepseek-chat',
      reasoning: ['fast', 'standard', 'deep'].includes(source.reasoning) ? source.reasoning : 'standard'
    };
  }

  function normalizeDanmakuSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: source.enabled !== false,
      speed: Math.max(20, Math.min(100, Math.floor(Number(source.speed) || 45))),
      fontSize: Math.max(12, Math.min(30, Math.floor(Number(source.fontSize) || 18)))
    };
  }

  const FEATURE_PAGES = [
    { key: 'vocab', label: '英语 3500' },
    { key: 'questions', label: '学科提问' },
    { key: 'ai', label: 'AI 解答' },
    { key: 'wordgame', label: '单词天天练' },
    { key: 'graph', label: '函数图像' },
    { key: 'calculator', label: '科学计算器' },
    { key: 'politics', label: '时事政治' },
    { key: 'camera', label: '展台' },
    { key: 'whiteboard', label: '白板' },
    { key: 'annotation', label: '批注' },
    { key: 'browser', label: '内置浏览器' },
    { key: 'timetable', label: '课程表' },
    { key: 'usb', label: 'U 盘检测' },
    { key: 'vote', label: '科目投票' },
    { key: 'students', label: '随机点名' },
    { key: 'phone', label: '手机投屏' },
    { key: 'timer', label: '计时器' },
    { key: 'volume', label: '环境音量' },
    { key: 'englishexam', label: '英语往年题' },
    { key: 'englishweb', label: '英语网' }
  ];

  const DEFAULT_WIDGET_ITEMS = [
    { page: 'whiteboard', label: '白板' },
    { page: 'camera', label: '展台' },
    { page: 'annotation', label: '批注' }
  ];

  function normalizeFeatureSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const result = {};
    FEATURE_PAGES.forEach((item) => { result[item.key] = source[item.key] !== false; });
    return result;
  }

  function normalizeWidgetSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const sourceItems = Array.isArray(source.items) ? source.items : DEFAULT_WIDGET_ITEMS;
    const items = sourceItems
      .slice(0, 8)
      .map((item) => ({
        page: String(item && item.page || ''),
        label: String(item && item.label || '').slice(0, 12)
      }))
      .filter((item) => item.page);
    return {
      enabled: source.enabled !== false,
      items,
      size: Math.max(240, Math.min(380, Math.round(Number(source.size) || 260)))
    };
  }

  function featureSettings() {
    state.settings.features = normalizeFeatureSettings(state.settings.features);
    return state.settings.features;
  }

  function widgetSettings() {
    state.settings.widget = normalizeWidgetSettings(state.settings.widget);
    return state.settings.widget;
  }

  function pageLabel(page) {
    return FEATURE_PAGES.find((item) => item.key === page)?.label
      || PAGE_TITLES[page]
      || page;
  }

  function applyFeatureVisibility() {
    const features = featureSettings();
    $$('[data-page]').forEach((button) => {
      button.hidden = features[button.dataset.page] === false;
    });
    if (features[state.page] === false) setPage('library');
  }

  async function applyWidgetSettings() {
    if (!api.widget) return;
    const widget = widgetSettings();
    const items = widget.items
      .filter((item) => featuresAllows(item.page))
      .map((item) => ({ page: item.page, label: item.label || pageLabel(item.page) }));
    await api.widget.configure({ enabled: widget.enabled && items.length > 0, items, size: widget.size }).catch(() => {});
  }

  function featuresAllows(page) {
    return featureSettings()[page] !== false;
  }

  function aiSettings() {
    state.settings.ai = normalizeAiSettings(state.settings.ai);
    return state.settings.ai;
  }

  function danmakuSettings() {
    state.settings.danmaku = normalizeDanmakuSettings(state.settings.danmaku);
    return state.settings.danmaku;
  }

  function collectTimetableFromDom() {
    const table = $('#timetableTable');
    if (!table) return state.timetable || defaultClientTimetable();
    const previous = state.timetable || defaultClientTimetable();
    const satKey = state.timetableWeek === 'B' ? 'satB' : 'satA';
    const sunKey = state.timetableWeek === 'B' ? 'sunB' : 'sunA';
    const rows = $$('#timetableTable tbody tr');
    const periods = rows.map((row, index) => {
      const old = previous.periods[index] || {};
      const read = (field) => row.querySelector(`[data-timetable-field="${field}"]`)?.value || '';
      const period = {
        id: old.id || `p${index + 1}`,
        label: read('label') || `第${index + 1}节`,
        time: read('time'),
        mon: read('mon'),
        tue: read('tue'),
        wed: read('wed'),
        thu: read('thu'),
        fri: read('fri'),
        satA: old.satA || '',
        satB: old.satB || '',
        sunA: old.sunA || '',
        sunB: old.sunB || ''
      };
      period[satKey] = read(satKey);
      period[sunKey] = read(sunKey);
      return period;
    });
    state.timetable = {
      periods: periods.length ? periods : defaultClientTimetable().periods,
      updatedAt: new Date().toISOString()
    };
    return state.timetable;
  }

  function renderTimetable() {
    if (!state.timetable) state.timetable = defaultClientTimetable();
    const timetable = state.timetable;
    const week = state.timetableWeek;
    $$('#timetableWeekSwitch [data-timetable-week]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.timetableWeek === week);
    });
    const hint = $('#timetableWeekHint');
    if (hint) hint.textContent = `当前编辑周六、周日 ${week} 表`;
    const table = $('#timetableTable');
    if (!table) return;
    const weeks = week === 'B' ? { sat: 'satB', sun: 'sunB' } : { sat: 'satA', sun: 'sunA' };
    table.innerHTML = `<thead><tr>
      <th>节次</th><th>时间</th><th>周一</th><th>周二</th><th>周三</th><th>周四</th><th>周五</th>
      <th>周六（${week}表）</th><th>周日（${week}表）</th><th></th>
    </tr></thead><tbody>
      ${timetable.periods.map((period, index) => `<tr data-timetable-row="${index}">
        <td><input class="timetable-input period-label" data-timetable-field="label" value="${attr(period.label)}" aria-label="节次"></td>
        <td><input class="timetable-input period-time" data-timetable-field="time" value="${attr(period.time)}" placeholder="08:00" aria-label="时间"></td>
        ${TIMETABLE_DAY_FIELDS.map((day) => `<td><input class="timetable-input" data-timetable-field="${day.key}" value="${attr(period[day.key])}" aria-label="${day.label}"></td>`).join('')}
        <td><input class="timetable-input" data-timetable-field="${weeks.sat}" value="${attr(period[weeks.sat])}" aria-label="周六"></td>
        <td><input class="timetable-input" data-timetable-field="${weeks.sun}" value="${attr(period[weeks.sun])}" aria-label="周日"></td>
        <td><button type="button" class="timetable-remove" data-timetable-remove="${index}" title="删除这一节">${icon('trash')}</button></td>
      </tr>`).join('')}
    </tbody>`;
    const status = $('#timetableSaveStatus');
    if (status) status.textContent = `共 ${timetable.periods.length} 节 · 修改后请点击「保存课程表」`;
  }

  function markTimetableDirty() {
    const status = $('#timetableSaveStatus');
    if (status) status.textContent = '有未保存的修改';
  }

  async function saveTimetable() {
    collectTimetableFromDom();
    const ok = await persistLibrary();
    if (!ok) return;
    const status = $('#timetableSaveStatus');
    if (status) status.textContent = `已保存 · ${formatDateTime(state.timetable.updatedAt)}`;
    showToast('课程表已保存到本机。', { type: 'success', title: '课程表已更新' });
  }

  /* ---------------- 绘图工具与课堂页面 ---------------- */

  const drawingState = {
    camera: {
      name: 'camera', canvasId: 'cameraCanvas', contentId: 'cameraContent', stageId: 'cameraStage',
      color: '#e35d5d', width: 4, eraser: false, tool: 'pen', drawing: false, last: null,
      zoom: 1, panX: 0, panY: 0, panning: false, panStart: null, panOrigin: null,
      pointers: new Map(), pinching: false, pinchStartDistance: 0, pinchStartZoom: 1, initialized: false
    },
    whiteboard: {
      name: 'whiteboard', canvasId: 'whiteboardCanvas', contentId: 'whiteboardContent', stageId: 'whiteboardStage',
      color: '#263b50', width: 5, eraser: false, tool: 'pen', drawing: false, last: null,
      zoom: 1, panX: 0, panY: 0, panning: false, panStart: null, panOrigin: null,
      pointers: new Map(), pinching: false, pinchStartDistance: 0, pinchStartZoom: 1, initialized: false
    },
    annotation: {
      name: 'annotation', canvasId: 'annotationCanvas', contentId: 'annotationContent', stageId: 'annotationStage',
      color: '#e35d5d', width: 5, eraser: false, tool: 'pen', drawing: false, last: null,
      zoom: 1, panX: 0, panY: 0, panning: false, panStart: null, panOrigin: null,
      pointers: new Map(), pinching: false, pinchStartDistance: 0, pinchStartZoom: 1, initialized: false
    }
  };

  function applyBoardTransform(board) {
    const content = document.getElementById(board.contentId);
    if (content) {
      // 白板缩小后临时把内容层放大到 100/zoom，缩放后仍铺满整个画板，
      // 否则四周会露出舞台背景，鼠标/手指落下去无法继续书写。
      if (board.name === 'whiteboard' && board.zoom < 1) {
        content.style.width = `${100 / board.zoom}%`;
        content.style.height = `${100 / board.zoom}%`;
        content.style.transformOrigin = '0 0';
      } else {
        content.style.width = '';
        content.style.height = '';
        content.style.transformOrigin = '';
      }
      content.style.transform = `translate(${board.panX}px, ${board.panY}px) scale(${board.zoom})`;
    }
    $$(`[data-zoom-label="${board.name}"]`).forEach((label) => {
      label.textContent = `${Math.round(board.zoom * 100)}%`;
    });
  }

  function maxBoardZoom(board) {
    return board.name === 'camera' ? 5 : 3;
  }

  function changeBoardZoom(board, action) {
    if (action === 'reset') {
      board.zoom = 1;
      board.panX = 0;
      board.panY = 0;
    } else {
      const next = board.zoom + (action === 'in' ? 0.2 : -0.2);
      board.zoom = Math.max(0.5, Math.min(maxBoardZoom(board), Number(next.toFixed(2))));
    }
    applyBoardTransform(board);
  }

  function setMoveTool(active) {
    const board = activeDrawingState();
    board.tool = active ? 'move' : 'pen';
    board.eraser = false;
    board.panning = false;
    const scope = drawingScope();
    $$('[data-draw-tool="move"]', $(scope)).forEach((button) => button.classList.toggle('is-active', active));
    $$('[data-draw-tool="eraser"]', $(scope)).forEach((button) => button.classList.remove('is-active'));
    $$('.drawing-color', $(scope)).forEach((button) => button.classList.toggle('is-active', !active && button.dataset.drawColor === board.color));
    const stage = document.getElementById(board.stageId);
    if (stage) stage.classList.toggle('is-move-tool', active);
    if (active) applyBoardTransform(board);
  }

  function activeDrawingState() {
    if (state.page === 'whiteboard') return drawingState.whiteboard;
    if (state.page === 'annotation') return drawingState.annotation;
    return drawingState.camera;
  }

  function drawingScope() {
    if (state.page === 'whiteboard') return '#page-whiteboard';
    if (state.page === 'annotation') return '#page-annotation';
    return '#page-camera';
  }

  const DRAW_SUPERSAMPLE = 3;
  function drawingScale() {
    return (window.devicePixelRatio || 1) * DRAW_SUPERSAMPLE;
  }

  function resizeDrawingCanvas(board) {
    const canvas = document.getElementById(board.canvasId);
    if (!canvas) return;
    const dpr = drawingScale();
    const width = Math.max(1, Math.round((canvas.clientWidth || 1) * dpr));
    const height = Math.max(1, Math.round((canvas.clientHeight || 1) * dpr));
    if (canvas.width === width && canvas.height === height) return;
    const snapshot = canvas.width > 1 && canvas.height > 1 ? canvas.toDataURL('image/png') : '';
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (snapshot) {
      const image = new Image();
      image.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      image.src = snapshot;
    }
  }

  function clearDrawing(board) {
    const canvas = document.getElementById(board.canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (board.name === 'whiteboard') {
      state.whiteboardPages[state.whiteboardPageIndex] = '';
      updateWhiteboardPageLabels();
    }
  }

  function initDrawingBoard(board) {
    if (board.initialized) return;
    const canvas = document.getElementById(board.canvasId);
    if (!canvas) return;
    board.initialized = true;
    const resize = () => {
      resizeDrawingCanvas(board);
      applyBoardTransform(board);
    };
    requestAnimationFrame(resize);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    const pointerDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      // 画笔状态下第二根手指只用于触控操作，不参与绘制，避免两指之间连出直线。
      if (event.pointerType === 'touch' && event.isPrimary === false && board.tool !== 'move') {
        event.preventDefault();
        return;
      }
      if (board.tool === 'move') {
        board.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (board.pointers.size === 2) {
          const pointers = [...board.pointers.values()];
          board.pinching = true;
          board.panning = false;
          board.pinchStartDistance = Math.max(1, pointerDistance(pointers[0], pointers[1]));
          board.pinchStartZoom = board.zoom;
          document.getElementById(board.stageId)?.classList.remove('is-panning');
        } else if (board.pointers.size === 1) {
          board.panning = true;
          board.panStart = { x: event.clientX, y: event.clientY };
          board.panOrigin = { x: board.panX, y: board.panY };
          document.getElementById(board.stageId)?.classList.add('is-panning');
        }
        try {
          canvas.setPointerCapture?.(event.pointerId);
        } catch (error) {
          /* 忽略不支持捕获的指针 */
        }
        event.preventDefault();
        return;
      }
      board.drawing = true;
      board.last = pointerPoint(canvas, event);
      drawDot(board, board.last);
      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch (error) {
        /* 合成事件或触摸事件可能没有可捕获的指针 */
      }
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' && event.isPrimary === false && board.tool !== 'move') {
        event.preventDefault();
        return;
      }
      if (board.pointers.has(event.pointerId)) {
        board.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (board.pinching && board.pointers.size >= 2) {
        const pointers = [...board.pointers.values()].slice(0, 2);
        const distance = Math.max(1, pointerDistance(pointers[0], pointers[1]));
        board.zoom = Math.max(0.5, Math.min(maxBoardZoom(board), board.pinchStartZoom * (distance / board.pinchStartDistance)));
        applyBoardTransform(board);
        event.preventDefault();
        return;
      }
      if (board.panning) {
        board.panX = board.panOrigin.x + (event.clientX - board.panStart.x);
        board.panY = board.panOrigin.y + (event.clientY - board.panStart.y);
        applyBoardTransform(board);
        event.preventDefault();
        return;
      }
      if (!board.drawing) return;
      const point = pointerPoint(canvas, event);
      drawStroke(board, board.last, point);
      board.last = point;
      event.preventDefault();
    });
    const end = (event) => {
      if (event.pointerType === 'touch' && event.isPrimary === false && board.tool !== 'move') {
        event.preventDefault();
        return;
      }
      board.pointers.delete(event.pointerId);
      if (board.pointers.size < 2 && board.pinching) {
        board.pinching = false;
        board.pinchStartDistance = 0;
        board.pinchStartZoom = board.zoom;
        event.preventDefault();
        return;
      }
      if (board.panning) {
        board.panning = false;
        board.panStart = null;
        board.panOrigin = null;
        document.getElementById(board.stageId)?.classList.remove('is-panning');
        event.preventDefault();
        return;
      }
      if (!board.drawing) return;
      board.drawing = false;
      board.last = null;
      try {
        canvas.releasePointerCapture?.(event.pointerId);
      } catch (error) {
        /* 释放失败不影响结束绘制 */
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', (event) => {
      if (board.drawing && event.pointerType === 'mouse') end(event);
    });
  }

  function pointerPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
      y: (event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height))
    };
  }

  function drawingContext(board, point) {
    const canvas = document.getElementById(board.canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const scale = drawingScale();
    const zoom = Math.max(0.5, Number(board.zoom) || 1);
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 画布分辨率固定按 3 倍超采样保存；按当前缩放反算线宽，放大后仍然清晰。
    ctx.lineWidth = board.width / zoom;
    ctx.globalCompositeOperation = board.eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = board.color;
    ctx.fillStyle = board.color;
    return ctx;
  }

  function drawDot(board, point) {
    const ctx = drawingContext(board);
    if (!ctx) return;
    const scale = drawingScale();
    const zoom = Math.max(0.5, Number(board.zoom) || 1);
    ctx.beginPath();
    ctx.arc(point.x / scale, point.y / scale, board.width / 2 / zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStroke(board, from, to) {
    const ctx = drawingContext(board);
    if (!ctx) return;
    const scale = drawingScale();
    ctx.beginPath();
    ctx.moveTo(from.x / scale, from.y / scale);
    ctx.lineTo(to.x / scale, to.y / scale);
    ctx.stroke();
    ctx.restore();
  }

  function setDrawingColor(color) {
    const board = activeDrawingState();
    board.eraser = false;
    board.tool = 'pen';
    board.color = color;
    const scope = drawingScope();
    $$('.drawing-color', $(scope)).forEach((button) => {
      button.classList.toggle('is-active', button.dataset.drawColor === color);
    });
    $$('[data-draw-tool="eraser"], [data-draw-tool="move"]', $(scope)).forEach((button) => button.classList.remove('is-active'));
    document.getElementById(board.stageId)?.classList.remove('is-move-tool');
  }

  function setEraser(active) {
    const board = activeDrawingState();
    board.eraser = active;
    board.tool = active ? 'eraser' : 'pen';
    const scope = drawingScope();
    $$('[data-draw-tool="eraser"]', $(scope)).forEach((button) => button.classList.toggle('is-active', active));
    $$('[data-draw-tool="move"]', $(scope)).forEach((button) => button.classList.remove('is-active'));
    document.getElementById(board.stageId)?.classList.remove('is-move-tool');
    if (active) $$('.drawing-color', $(scope)).forEach((button) => button.classList.remove('is-active'));
  }

  /* ---------------- 展台 ---------------- */

  function cameraStatus(text, live) {
    const status = $('#cameraHeadStatus');
    if (!status) return;
    status.classList.toggle('is-live', Boolean(live));
    const label = status.querySelector('span');
    if (label) label.textContent = text;
  }

  async function refreshCameraDevices(selectedId) {
    const select = $('#cameraDeviceSelect');
    if (!select || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      select.innerHTML = cameras.length
        ? cameras.map((camera, index) => `<option value="${attr(camera.deviceId)}"${selectedId === camera.deviceId ? ' selected' : ''}>${esc(camera.label || `摄像头 ${index + 1}`)}</option>`).join('')
        : '<option value="">未检测到摄像头</option>';
    } catch (error) {
      /* 枚举失败时保留默认摄像头 */
    }
  }

  function applyCameraEnhancements() {
    const video = $('#cameraVideo');
    if (!video) return;
    const factor = Math.max(0.5, Math.min(1.6, (Number(state.cameraClarity) || 100) / 100));
    video.style.filter = Math.abs(factor - 1) < 0.01
      ? 'none'
      : `contrast(${(0.78 + factor * 0.32).toFixed(3)}) saturate(${(0.84 + factor * 0.24).toFixed(3)}) brightness(${(0.92 + factor * 0.1).toFixed(3)})`;
    const stage = $('#cameraStage');
    const rect = stage ? stage.getBoundingClientRect() : { width: 16, height: 9 };
    const rotate = ((Number(state.cameraRotation) || 0) % 360 + 360) % 360;
    const fitScale = rotate === 90 || rotate === 270
      ? Math.min(rect.width / Math.max(1, rect.height), rect.height / Math.max(1, rect.width))
      : 1;
    const mirror = state.cameraMirrorX ? -1 : 1;
    const transform = rotate === 0 && !state.cameraMirrorX && fitScale === 1
      ? 'none'
      : `rotate(${rotate}deg) scale(${fitScale.toFixed(4)}) scaleX(${mirror})`;
    video.style.transform = transform;
    const freeze = $('#cameraFreeze');
    if (freeze) {
      freeze.style.filter = video.style.filter;
      freeze.style.transform = transform;
      freeze.style.transformOrigin = 'center center';
    }
    $$('[data-camera-mirror="x"]').forEach((button) => button.classList.toggle('is-active', Boolean(state.cameraMirrorX)));
    const clarityValue = $('#cameraClarityValue');
    if (clarityValue) clarityValue.textContent = `${state.cameraClarity || 100}%`;
  }

  function updateCameraResolutionInfo() {
    const info = $('#cameraResolutionInfo');
    const video = $('#cameraVideo');
    const track = state.cameraStream?.getVideoTracks?.()[0];
    const settings = track?.getSettings?.() || {};
    if (info) {
      if (video && video.videoWidth) {
        info.textContent = `画面 ${video.videoWidth} × ${video.videoHeight}${settings.frameRate ? ` · ${Math.round(settings.frameRate)} fps` : ''} · ${state.cameraClarity}% 清晰度`;
      } else {
        info.textContent = '等待摄像头画面…';
      }
    }
  }

  function renderCameraLockState() {
    const label = state.cameraLocked ? '解锁画面' : '锁定画面';
    const button = $('#cameraLock');
    if (button) {
      button.classList.toggle('is-active', state.cameraLocked);
      button.innerHTML = `${icon(state.cameraLocked ? 'refresh' : 'lock')}${label}`;
    }
    $$('[data-camera-lock]').forEach((entry) => {
      entry.classList.toggle('is-active', state.cameraLocked);
      entry.innerHTML = `${icon(state.cameraLocked ? 'refresh' : 'lock')}${state.cameraLocked ? '解锁' : '锁定'}`;
    });
    $$('[data-camera-focus]').forEach((entry) => {
      entry.classList.toggle('is-active', entry.dataset.cameraFocus === 'auto' && state.cameraFocusMode === 'continuous');
    });
  }

  function toggleCameraLock() {
    const video = $('#cameraVideo');
    const freeze = $('#cameraFreeze');
    if (!video || !state.cameraStream) {
      showToast('请先启动摄像头。', { type: 'warn' });
      return;
    }
    if (!state.cameraLocked) {
      if (!video.videoWidth) {
        showToast('画面尚未准备好，请稍后再试。', { type: 'warn' });
        return;
      }
      const snapshot = document.createElement('canvas');
      snapshot.width = video.videoWidth;
      snapshot.height = video.videoHeight;
      snapshot.getContext('2d').drawImage(video, 0, 0, snapshot.width, snapshot.height);
      if (freeze) {
        freeze.src = snapshot.toDataURL('image/png');
        freeze.hidden = false;
      }
      video.pause();
      state.cameraLocked = true;
      applyCameraEnhancements();
      showToast('展台画面已锁定，可继续批画或拍照。', { type: 'success' });
    } else {
      if (freeze) {
        freeze.hidden = true;
        freeze.removeAttribute('src');
      }
      video.play().catch(() => {});
      state.cameraLocked = false;
      showToast('展台画面已解锁。', { type: 'success' });
    }
    renderCameraLockState();
  }

  async function captureCameraPhoto() {
    const video = $('#cameraVideo');
    const canvas = $('#cameraCanvas');
    if (!video || !state.cameraStream || !video.videoWidth) {
      showToast('请先启动摄像头再拍照。', { type: 'warn' });
      return;
    }
    const output = document.createElement('canvas');
    output.width = video.videoWidth;
    output.height = video.videoHeight;
    const context = output.getContext('2d');
    context.fillStyle = '#111';
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(video, 0, 0, output.width, output.height);
    if (canvas && canvas.width && canvas.height) {
      context.drawImage(canvas, 0, 0, output.width, output.height);
    }
    const result = await api.savePng({
      dataUrl: output.toDataURL('image/png'),
      defaultName: `展台拍照_${todayStamp()}.png`
    });
    if (result && result.ok && !result.canceled) {
      showToast(`照片已保存：${result.filePath}`, { type: 'success', title: '展台拍照', duration: 6000 });
    } else if (result && !result.canceled) {
      showToast(result.error || '保存照片失败', { type: 'error' });
    }
  }

  async function applyCameraFocus(mode) {
    const track = state.cameraStream?.getVideoTracks?.()[0];
    if (!track || !track.applyConstraints) {
      showToast('当前摄像头不支持对焦控制。', { type: 'warn' });
      return;
    }
    try {
      if (mode === 'auto') {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        state.cameraFocusMode = 'continuous';
        showToast('已恢复自动连续对焦。', { type: 'success' });
      } else {
        const caps = track.getCapabilities?.() || {};
        if (!caps.focusDistance) {
          showToast('此摄像头不支持手动对焦，请使用自动对焦或调整镜头。', { type: 'warn' });
          return;
        }
        const step = Number(caps.focusDistance.step) || 0.05;
        const min = Number(caps.focusDistance.min) || 0;
        const max = Number(caps.focusDistance.max) || 1;
        const direction = mode === 'near' ? -1 : 1;
        const current = track.getSettings?.().focusDistance;
        const base = current == null ? state.cameraFocusDistance : Number(current);
        const next = Math.max(min, Math.min(max, base + direction * Math.max(step, (max - min) * 0.08)));
        await track.applyConstraints({ advanced: [{ focusMode: 'manual' }, { focusDistance: next }] });
        state.cameraFocusDistance = next;
        state.cameraFocusMode = 'manual';
        showToast(mode === 'near' ? '已向前对焦。' : '已向后对焦。', { type: 'success' });
      }
    } catch (error) {
      showToast(`对焦调整失败：${error.message}`, { type: 'warn' });
    }
    renderCameraLockState();
  }

  async function startCamera(deviceId) {
    if (state.cameraStarting) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraStatus('浏览器不支持摄像头', false);
      return;
    }
    state.cameraStarting = true;
    cameraStatus('正在连接摄像头…', false);
    try {
      if (state.cameraStream) {
        state.cameraStream.getTracks().forEach((track) => track.stop());
        state.cameraStream = null;
      }
      const targetWidth = Math.max(640, Number(state.cameraResolution) || 1920);
      const minWidth = targetWidth >= 3840 ? 1920 : targetWidth >= 2560 ? 1920 : targetWidth >= 1920 ? 1280 : 640;
      const targetHeight = Math.round(targetWidth * 9 / 16);
      const minHeight = Math.round(minWidth * 9 / 16);
      const selectedCamera = deviceId ? { deviceId: { exact: deviceId } } : {};
      const highQuality = {
        audio: false,
        video: {
          ...selectedCamera,
          width: { min: minWidth, ideal: targetWidth },
          height: { min: minHeight, ideal: targetHeight },
          frameRate: { ideal: 30, max: 30 },
          // 展台/文档摄像头通常需要连续自动对焦；不支持该约束的设备会自动忽略。
          advanced: [{ focusMode: 'continuous' }, { whiteBalanceMode: 'continuous' }]
        }
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(highQuality);
      } catch (highError) {
        // 某些采集卡不支持 min 约束或连续对焦，退回只锁定设备的高清请求。
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...selectedCamera,
            width: { ideal: targetWidth },
            height: { ideal: targetHeight },
            frameRate: { ideal: 30 }
          }
        });
      }
      state.cameraStream = stream;
      const video = $('#cameraVideo');
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      state.cameraLocked = false;
      const freeze = $('#cameraFreeze');
      if (freeze) {
        freeze.hidden = true;
        freeze.removeAttribute('src');
      }
      const empty = $('#cameraEmpty');
      if (empty) empty.hidden = true;
      const liveBadge = $('#cameraLiveBadge');
      if (liveBadge) liveBadge.hidden = false;
      const track = stream.getVideoTracks()[0];
      state.cameraDeviceId = track?.getSettings?.().deviceId || deviceId || '';
      if (track && track.applyConstraints) {
        try {
          const caps = track.getCapabilities?.() || {};
          const maxWidth = Math.max(targetWidth, Number(caps.width?.max) || targetWidth);
          const applyWidth = Math.min(maxWidth, targetWidth);
          await track.applyConstraints({
            width: { ideal: applyWidth },
            height: { ideal: Math.round(applyWidth * 9 / 16) },
            advanced: [{ focusMode: 'continuous' }, { whiteBalanceMode: 'continuous' }]
          }).catch(() => {});
        } catch (error) {
          /* 采集卡不支持动态约束时保持默认高清流 */
        }
      }
      applyCameraEnhancements();
      updateCameraResolutionInfo();
      cameraStatus('展台已连接', true);
      await refreshCameraDevices(state.cameraDeviceId);
      const select = $('#cameraDeviceSelect');
      if (select && state.cameraDeviceId) select.value = state.cameraDeviceId;
    } catch (error) {
      cameraStatus('无法打开摄像头', false);
      const liveBadge = $('#cameraLiveBadge');
      if (liveBadge) liveBadge.hidden = true;
      const empty = $('#cameraEmpty');
      if (empty) {
        empty.hidden = false;
        empty.innerHTML = `<span>${icon('camera')}</span><strong>无法打开摄像头</strong><p>${esc(error.message || '请检查摄像头是否被其他软件占用，并允许摄像头权限。')}</p>`;
      }
    } finally {
      state.cameraStarting = false;
    }
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((track) => track.stop());
      state.cameraStream = null;
    }
    const video = $('#cameraVideo');
    if (video) video.srcObject = null;
    const freeze = $('#cameraFreeze');
    if (freeze) {
      freeze.hidden = true;
      freeze.removeAttribute('src');
    }
    state.cameraLocked = false;
    const empty = $('#cameraEmpty');
    if (empty) empty.hidden = false;
    const liveBadge = $('#cameraLiveBadge');
    if (liveBadge) liveBadge.hidden = true;
    state.cameraAutoStarted = false;
    renderCameraLockState();
    cameraStatus('摄像头已停止', false);
  }

  function renderCamera() {
    initDrawingBoard(drawingState.camera);
    requestAnimationFrame(() => {
      resizeDrawingCanvas(drawingState.camera);
      applyCameraEnhancements();
    });
    const resolutionSelect = $('#cameraResolution');
    if (resolutionSelect) resolutionSelect.value = String(state.cameraResolution);
    const clarityInput = $('#cameraClarity');
    if (clarityInput) clarityInput.value = String(state.cameraClarity);
    applyCameraEnhancements();
    renderCameraLockState();
    updateCameraResolutionInfo();
    if (!state.cameraAutoStarted) {
      state.cameraAutoStarted = true;
      refreshCameraDevices().then(() => startCamera(state.cameraDeviceId));
    }
  }

  /* ---------------- 白板 ---------------- */

  function updateWhiteboardPageLabels() {
    const label = `第 ${state.whiteboardPageIndex + 1} / ${state.whiteboardPages.length} 页`;
    const short = `${state.whiteboardPageIndex + 1}/${state.whiteboardPages.length}`;
    const side = $('#whiteboardPageLabel');
    const full = $('#whiteboardFullscreenPageLabel');
    if (side) side.textContent = label;
    if (full) full.textContent = short;
  }

  function saveWhiteboardPage() {
    const canvas = $('#whiteboardCanvas');
    if (!canvas || !canvas.width) return;
    state.whiteboardPages[state.whiteboardPageIndex] = canvas.toDataURL('image/png');
  }

  function loadWhiteboardPage(index) {
    const canvas = $('#whiteboardCanvas');
    if (!canvas) return;
    state.whiteboardPageIndex = Math.max(0, Math.min(state.whiteboardPages.length - 1, index));
    updateWhiteboardPageLabels();
    const data = state.whiteboardPages[state.whiteboardPageIndex];
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (!data) return;
    const image = new Image();
    image.onload = () => {
      const current = $('#whiteboardCanvas');
      if (!current) return;
      const context = current.getContext('2d');
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, current.width, current.height);
      context.drawImage(image, 0, 0, current.width, current.height);
      context.restore();
    };
    image.src = data;
  }

  function switchWhiteboardPage(action) {
    saveWhiteboardPage();
    if (action === 'add') {
      state.whiteboardPages.push('');
      state.whiteboardPageIndex = state.whiteboardPages.length - 1;
      loadWhiteboardPage(state.whiteboardPageIndex);
      return;
    }
    if (action === 'delete') {
      if (state.whiteboardPages.length === 1) {
        state.whiteboardPages[0] = '';
        loadWhiteboardPage(0);
        showToast('已清空当前白板页。', { type: 'info' });
        return;
      }
      state.whiteboardPages.splice(state.whiteboardPageIndex, 1);
      loadWhiteboardPage(Math.min(state.whiteboardPageIndex, state.whiteboardPages.length - 1));
      showToast('当前白板页已删除。', { type: 'success' });
      return;
    }
    if (action === 'prev' && state.whiteboardPageIndex > 0) {
      loadWhiteboardPage(state.whiteboardPageIndex - 1);
    } else if (action === 'next' && state.whiteboardPageIndex < state.whiteboardPages.length - 1) {
      loadWhiteboardPage(state.whiteboardPageIndex + 1);
    }
  }

  function renderWhiteboard() {
    initDrawingBoard(drawingState.whiteboard);
    requestAnimationFrame(() => {
      resizeDrawingCanvas(drawingState.whiteboard);
      updateWhiteboardPageLabels();
    });
    updateWhiteboardPageLabels();
  }

  async function captureAnnotationScreen() {
    const empty = $('#annotationEmpty');
    const image = $('#annotationBackground');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `<span>${icon('image')}</span><strong>正在截取屏幕…</strong>`;
    }
    const result = await api.captureScreen({ hideWindow: true });
    if (!result || !result.ok) {
      if (empty) {
        empty.hidden = false;
        empty.innerHTML = `<span>${icon('alert')}</span><strong>截屏失败</strong><p>${esc((result && result.error) || '请重试')}</p>`;
      }
      showToast((result && result.error) || '屏幕截取失败', { type: 'error' });
      return;
    }
    if (image) {
      image.src = result.dataUrl;
      image.hidden = false;
    }
    const board = drawingState.annotation;
    initDrawingBoard(board);
    requestAnimationFrame(() => {
      resizeDrawingCanvas(board);
      clearDrawing(board);
      if (empty) empty.hidden = true;
    });
  }

  function renderAnnotation() {
    initDrawingBoard(drawingState.annotation);
    requestAnimationFrame(() => resizeDrawingCanvas(drawingState.annotation));
    captureAnnotationScreen();
  }

  async function saveAnnotationImage() {
    const canvas = $('#annotationCanvas');
    const background = $('#annotationBackground');
    if (!canvas) return;
    const output = document.createElement('canvas');
    const width = background?.naturalWidth || canvas.width;
    const height = background?.naturalHeight || canvas.height;
    output.width = Math.max(1, width);
    output.height = Math.max(1, height);
    const context = output.getContext('2d');
    if (background && background.src) {
      try { context.drawImage(background, 0, 0, output.width, output.height); } catch (error) { /* ignore */ }
    } else {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, output.width, output.height);
    }
    context.drawImage(canvas, 0, 0, output.width, output.height);
    const result = await api.savePng({
      dataUrl: output.toDataURL('image/png'),
      defaultName: `屏幕批注_${todayStamp()}.png`
    });
    if (result && result.ok && !result.canceled) {
      showToast(`批注已保存：${result.filePath}`, { type: 'success', title: '保存成功' });
    } else if (result && !result.canceled) {
      showToast(result.error || '保存批注失败', { type: 'error' });
    }
  }

  async function saveWhiteboardImage() {
    const canvas = $('#whiteboardCanvas');
    if (!canvas) return;
    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const ctx = output.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(canvas, 0, 0);
    const result = await api.savePng({
      dataUrl: output.toDataURL('image/png'),
      defaultName: `白板_${todayStamp()}.png`
    });
    if (result && result.ok && !result.canceled) {
      showToast(`白板已保存：${result.filePath}`, { type: 'success', title: '保存成功' });
    } else if (result && result.error) {
      showToast(result.error, { type: 'error', title: '保存失败' });
    }
  }

  /* ---------------- 课程表事件 ---------------- */

  async function addTimetablePeriod() {
    collectTimetableFromDom();
    if (state.timetable.periods.length >= 12) {
      showToast('课程表最多 12 节。', { type: 'warn' });
      return;
    }
    state.timetable.periods.push({
      id: `p${Date.now().toString(36)}`,
      label: `第${state.timetable.periods.length + 1}节`,
      time: '', mon: '', tue: '', wed: '', thu: '', fri: '',
      satA: '', satB: '', sunA: '', sunB: ''
    });
    renderTimetable();
    markTimetableDirty();
  }

  function removeTimetablePeriod(index) {
    collectTimetableFromDom();
    state.timetable.periods.splice(index, 1);
    renderTimetable();
    markTimetableDirty();
  }

  function switchTimetableWeek(week) {
    collectTimetableFromDom();
    state.timetableWeek = week === 'B' ? 'B' : 'A';
    renderTimetable();
    markTimetableDirty();
  }

  /* ---------------- 内置浏览器 ---------------- */

  function browserWebview() {
    return $('#siteWebview');
  }

  function updateBrowserCredentialUi() {
    const credentials = state.browserCredentials;
    const usernameInput = $('#browserUsername');
    const status = $('#browserCredentialStatus');
    if (usernameInput && document.activeElement !== usernameInput) usernameInput.value = credentials?.username || '';
    if (status) {
      if (credentials?.username) {
        status.textContent = `已保存账号：${credentials.username}${credentials.savedAt ? ` · ${formatDateTime(credentials.savedAt)}` : ''}`;
      } else {
        status.textContent = '尚未保存登录账号';
      }
    }
  }

  async function loadBrowserCredentialState() {
    try {
      const result = await api.browserCredentials.get();
      state.browserCredentials = result?.ok ? result : null;
      updateBrowserCredentialUi();
    } catch (error) {
      state.browserCredentials = null;
      updateBrowserCredentialUi();
    }
  }

  async function fillBrowserCredentials(manual) {
    const credentials = state.browserCredentials;
    if (!credentials?.username || !credentials?.password) {
      if (manual) showToast('还没有保存账号密码，请先在右侧保存。', { type: 'warn' });
      return false;
    }
    const webview = browserWebview();
    if (!webview) return false;
    const script = `(() => {
      const username = ${JSON.stringify(credentials.username)};
      const password = ${JSON.stringify(credentials.password)};
      const visible = (el) => !!el && !el.disabled && el.type !== 'hidden' && (el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const passwordInput = Array.from(document.querySelectorAll('input[type="password"]')).find(visible);
      if (!passwordInput) return { ok: false, reason: 'no-password-field' };
      const form = passwordInput.form || passwordInput.closest('form') || document;
      const candidates = Array.from(form.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"],input:not([type])')).filter(visible);
      const usernameInput = candidates.find((input) => /user|account|email|phone|mobile|login|name|id/i.test([input.name, input.id, input.placeholder, input.autocomplete].join(' ')))
        || candidates.filter((input) => (input.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING)).pop()
        || candidates[0];
      const setValue = (input, value) => {
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, value); else input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setValue(usernameInput, username);
      setValue(passwordInput, password);
      return { ok: true, filledUser: Boolean(usernameInput), filledPassword: true };
    })()`;
    try {
      const result = await webview.executeJavaScript(script, true);
      if (manual) {
        if (result?.ok) showToast('已自动填充账号密码。', { type: 'success', title: '自动填充完成' });
        else showToast('当前页面没有找到登录密码框，请先打开登录页。', { type: 'warn' });
      }
      return Boolean(result?.ok);
    } catch (error) {
      if (manual) showToast('自动填充失败，请确认网页已经加载完成。', { type: 'warn' });
      return false;
    }
  }

  async function saveBrowserCredentialsFromForm() {
    const username = String($('#browserUsername')?.value || '').trim();
    const passwordInput = $('#browserPassword');
    const password = String(passwordInput?.value || '');
    if (!username) {
      showToast('请填写登录账号。', { type: 'warn' });
      return;
    }
    const existingPassword = state.browserCredentials?.password || '';
    if (!password && !existingPassword) {
      showToast('请填写登录密码。', { type: 'warn' });
      return;
    }
    const result = await api.browserCredentials.save({
      username,
      password: password || existingPassword
    });
    if (!result?.ok) {
      showToast(result?.error || '保存账号失败', { type: 'error' });
      return;
    }
    state.browserCredentials = {
      ok: true,
      username,
      password: password || existingPassword,
      savedAt: result.savedAt
    };
    if (passwordInput) passwordInput.value = '';
    updateBrowserCredentialUi();
    showToast('账号密码已加密保存在本机。', { type: 'success', title: '保存成功' });
    fillBrowserCredentials(false);
  }

  function setupBrowserOnce() {
    if (state.browserInitialized) return;
    const webview = browserWebview();
    if (!webview) return;
    state.browserInitialized = true;
    if (!webview.getAttribute('src')) webview.setAttribute('src', 'https://zz8zszy.cn/');
    const loading = $('#browserLoading');
    const showLoading = () => {
      if (loading) {
        loading.classList.remove('is-hidden');
        loading.innerHTML = '<span class="spinner"></span>正在打开 zz8zszy.cn…';
      }
    };
    const hideLoading = () => loading?.classList.add('is-hidden');
    const syncAddress = () => {
      const address = $('#browserAddress');
      try {
        const url = webview.getURL?.();
        if (address && url) address.value = url;
      } catch (error) {
        /* 页面切换中的 URL 读取失败可忽略 */
      }
    };
    webview.addEventListener('did-start-loading', showLoading);
    webview.addEventListener('dom-ready', () => {
      hideLoading();
      syncAddress();
      setBrowserZoom(state.browserZoom);
      installBrowserSwipe(webview);
      fillBrowserCredentials(false);
      window.setTimeout(() => fillBrowserCredentials(false), 1400);
    });
    webview.addEventListener('did-finish-load', () => {
      hideLoading();
      syncAddress();
      installBrowserSwipe(webview);
    });
    webview.addEventListener('did-stop-loading', () => {
      hideLoading();
      syncAddress();
    });
    webview.addEventListener('did-navigate', syncAddress);
    webview.addEventListener('did-navigate-in-page', syncAddress);
    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3 || event.isMainFrame === false) return;
      if (loading) {
        loading.classList.remove('is-hidden');
        loading.innerHTML = `<span>${icon('alert')}</span><span>网页加载失败，请检查网络后点击刷新。</span>`;
      }
    });
    loadBrowserCredentialState();
  }

  function renderBrowser() {
    setupBrowserOnce();
    updateBrowserCredentialUi();
  }

  function browserNavigate(action) {
    const webview = browserWebview();
    if (!webview) return;
    try {
      if (action === 'back' && webview.canGoBack()) webview.goBack();
      else if (action === 'forward' && webview.canGoForward()) webview.goForward();
      else if (action === 'reload') webview.reload();
      else if (action === 'home') webview.loadURL('https://zz8zszy.cn/');
    } catch (error) {
      showToast('浏览器操作失败', { type: 'error' });
    }
  }

  function installBrowserSwipe(webview) {
    if (!webview) return;
    const script = `(() => {
      if (window.__zzbzSwipeBound) return true;
      window.__zzbzSwipeBound = true;
      let start = null;
      let lastNav = 0;
      const editable = (target) => target && (target.closest('input, textarea, select, [contenteditable="true"]'));
      document.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1 || editable(event.target)) { start = null; return; }
        start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }, { capture: true, passive: true });
      document.addEventListener('touchend', (event) => {
        if (!start || !event.changedTouches.length || Date.now() - lastNav < 700) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        start = null;
        if (Math.abs(dx) < 70 || Math.abs(dy) > 55) return;
        lastNav = Date.now();
        if (dx > 0 && history.length > 1) history.back();
        else if (dx < 0) history.forward();
      }, { capture: true, passive: true });
      document.addEventListener('wheel', (event) => {
        if (Date.now() - lastNav < 700 || editable(event.target)) return;
        if (Math.abs(event.deltaX) < 40 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.4) return;
        lastNav = Date.now();
        if (event.deltaX > 0) { if (history.length > 1) history.back(); }
        else history.forward();
      }, { capture: true, passive: true });
      return true;
    })()`;
    webview.executeJavaScript(script, true).catch(() => {});
  }

  function setBrowserZoom(value) {
    state.browserZoom = Math.max(0.5, Math.min(2, Number(value) || 1));
    const webview = browserWebview();
    try { webview?.setZoomFactor?.(state.browserZoom); } catch (error) { /* 页面尚未初始化 */ }
    const label = $('#browserZoomLabel');
    if (label) label.textContent = `${Math.round(state.browserZoom * 100)}%`;
  }

  function browserGoToAddress(value) {
    const webview = browserWebview();
    if (!webview) return;
    let url = String(value || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('协议不支持');
      webview.loadURL(url).catch(() => showToast('页面加载失败', { type: 'warn' }));
    } catch (error) {
      showToast('请输入正确的网址。', { type: 'warn' });
    }
  }

  /* ---------------- U 盘检测 ---------------- */

  function formatDriveSize(bytes) {
    return formatSize(Number(bytes) || 0);
  }

  function renderUsbDrives() {
    const select = $('#usbDriveSelect');
    const meta = $('#usbDriveMeta');
    if (!select) return;
    if (!state.usbDrives.length) {
      select.innerHTML = '<option value="">未检测到可移动磁盘</option>';
      if (meta) meta.textContent = '请插入 U 盘后点击右上角「刷新磁盘」。';
      return;
    }
    const current = select.value;
    select.innerHTML = state.usbDrives.map((drive) => (
      `<option value="${attr(drive.root)}"${current === drive.root ? ' selected' : ''}>${esc(drive.letter)} ${esc(drive.name)} · ${formatDriveSize(drive.size)}</option>`
    )).join('');
    if (!select.value) select.value = state.usbDrives[0].root;
    const selected = state.usbDrives.find((drive) => drive.root === select.value) || state.usbDrives[0];
    if (meta) meta.textContent = `${selected.letter} ${selected.name} · 已用 ${formatDriveSize(selected.size - selected.free)} / 共 ${formatDriveSize(selected.size)} · 可用 ${formatDriveSize(selected.free)}`;
  }

  function renderUsbFindings() {
    const container = $('#usbFindings');
    const count = $('#usbFindingCount');
    if (!container) return;
    const result = state.usbScanResult;
    if (!result) {
      if (count) count.textContent = '0 项';
      container.innerHTML = `<div class="question-empty">${icon('shield')}<strong>等待检测</strong><p>选择一个 U 盘并点击「开始安全检测」，结果会显示在这里。</p></div>`;
      return;
    }
    if (count) count.textContent = `${result.findings.length} 项`;
    const summary = `<div class="usb-summary">${icon('shield')}<span>已检查 ${result.scanned} 个文件${result.truncated ? '（文件过多，已提前结束）' : ''}，发现 ${result.findings.length} 个需要关注的项目。</span></div>`;
    if (!result.findings.length) {
      container.innerHTML = summary + `<div class="question-empty">${icon('checkCircle')}<strong>未发现明显可疑文件</strong><p>基础特征检测通过。如需更严格检查，可点击「Windows Defender」进行完整扫描。</p></div>`;
      return;
    }
    const severityText = { high: '高风险', medium: '需确认', low: '低风险' };
    container.innerHTML = summary + result.findings.map((finding) => `<div class="usb-finding ${finding.severity === 'high' ? 'is-high' : finding.severity === 'low' ? 'is-low' : ''}">
      <span class="usb-finding-severity"></span>
      <div class="usb-finding-main">
        <div class="usb-finding-head"><span class="usb-severity-tag">${severityText[finding.severity] || '提示'}</span><span class="usb-finding-name" title="${attr(finding.name)}">${esc(finding.name)}</span></div>
        <p class="usb-finding-path" title="${attr(finding.path)}">${esc(finding.path)}</p>
        <p class="usb-finding-reason">${esc(finding.reason)}</p>
      </div>
      <div class="usb-finding-actions"><button type="button" data-usb-reveal="${attr(finding.path)}">打开位置</button></div>
    </div>`).join('');
  }

  async function refreshUsbDrives() {
    if (state.usbLoading) return;
    state.usbLoading = true;
    const button = $('#refreshUsbDrives');
    if (button) button.disabled = true;
    try {
      const result = await api.usb.list();
      state.usbDrives = Array.isArray(result?.drives) ? result.drives : [];
      renderUsbDrives();
      renderUsbFindings();
      if (result && !result.ok) showToast(result.error || '读取可移动磁盘失败', { type: 'warn' });
    } catch (error) {
      showToast('读取可移动磁盘失败', { type: 'error' });
    } finally {
      state.usbLoading = false;
      if (button) button.disabled = false;
    }
  }

  async function startUsbScan() {
    if (state.usbScanning) return;
    const root = $('#usbDriveSelect')?.value;
    if (!root) {
      showToast('请先插入并选择一个 U 盘。', { type: 'warn' });
      return;
    }
    state.usbScanning = true;
    state.usbScanResult = null;
    const status = $('#usbScanStatus');
    const button = $('#scanUsbButton');
    if (status) status.textContent = '正在扫描文件，请稍候…';
    if (button) { button.disabled = true; button.innerHTML = '<span class="spinner"></span>扫描中…'; }
    try {
      const result = await api.usb.scan(root);
      if (!result?.ok) {
        if (status) status.textContent = result?.error || '扫描失败';
        showToast(result?.error || '扫描失败', { type: 'error' });
        return;
      }
      state.usbScanResult = result;
      renderUsbFindings();
      if (status) status.textContent = `扫描完成：检查 ${result.scanned} 个文件，发现 ${result.findings.length} 个需要关注的项目。`;
      showToast(result.findings.length ? `发现 ${result.findings.length} 个需要确认的项目。` : '未发现明显可疑文件。', {
        type: result.findings.length ? 'warn' : 'success',
        title: 'U 盘检测完成'
      });
    } catch (error) {
      if (status) status.textContent = '扫描失败';
      showToast(error?.message || '扫描失败', { type: 'error' });
    } finally {
      state.usbScanning = false;
      if (button) { button.disabled = false; button.innerHTML = '<span data-icon="search"></span>开始安全检测'; ICONS.hydrateIcons(button); }
    }
  }

  function askDefenderScan() {
    const root = $('#usbDriveSelect')?.value;
    if (!root) {
      showToast('请先插入并选择一个 U 盘。', { type: 'warn' });
      return;
    }
    openConfirm({
      title: '调用 Windows Defender 扫描？',
      message: '将调用本机 Windows Defender 对所选 U 盘进行完整扫描，可能需要较长时间，扫描期间请勿拔出 U 盘。',
      confirmText: '开始扫描',
      onConfirm: async () => {
        const status = $('#usbScanStatus');
        if (status) status.textContent = 'Windows Defender 正在扫描，请稍候…';
        const result = await api.usb.defenderScan(root);
        if (result?.ok) {
          if (status) status.textContent = 'Windows Defender 扫描完成。';
          showToast('Windows Defender 扫描完成，请查看系统安全中心结果。', { type: 'success', title: '扫描完成' });
        } else {
          if (status) status.textContent = 'Windows Defender 扫描失败。';
          showToast(result?.error || 'Windows Defender 扫描失败', { type: 'error' });
        }
      }
    });
  }

  function renderUsb() {
    if (!state.usbDrives.length) {
      const select = $('#usbDriveSelect');
      const meta = $('#usbDriveMeta');
      if (select) select.innerHTML = '<option value="">正在检测可移动磁盘…</option>';
      if (meta) meta.textContent = '正在检测已连接的 U 盘…';
      if (!state.usbLoading) refreshUsbDrives();
    } else {
      renderUsbDrives();
    }
    renderUsbFindings();
  }

  /* ---------------- 检查更新 ---------------- */

  function openUpdateModal(info) {
    state.modal = 'update';
    state.updateInfo = info;
    const notes = info.notes ? `<div class="update-notes">${esc(info.notes).replace(/\n/g, '<br>')}</div>` : '';
    ui.modalLayer.innerHTML = `<div class="modal modal-small" role="dialog" aria-modal="true" aria-labelledby="updateTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon('refresh')}</span>
        <div class="modal-heading"><h2 id="updateTitle">发现新版本</h2><p>当前 v${esc(info.currentVersion)} → 最新 v${esc(info.latestVersion)}</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="update-version-row"><span>当前版本</span><strong>v${esc(info.currentVersion)}</strong><span>最新版本</span><strong class="is-new">v${esc(info.latestVersion)}</strong></div>
        ${notes}
        ${info.assetUrl ? '<div class="batch-save-info">' + icon('info') + '点击「下载并打开安装包」会下载最新的 Windows 安装包并启动安装程序。安装前请保存当前工作。</div>' : '<div class="batch-save-info">' + icon('info') + '该版本没有可用的安装包附件，请打开发布页查看。</div>'}
      </div>
      <footer class="modal-footer">
        <span class="modal-footer-note">${icon('shield')}更新来自 GitHub Release</span>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-light" data-update-release>打开发布页</button>
          ${info.assetUrl ? '<button type="button" class="btn btn-primary" id="updateDownloadButton">下载并打开安装包</button>' : ''}
        </div>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
  }

  async function checkForUpdates() {
    if (state.updateChecking) return;
    state.updateChecking = true;
    const buttons = [$('#checkUpdateButton'), $('#checkUpdateDataButton')];
    buttons.forEach((button) => { if (button) button.disabled = true; });
    showToast('正在检查 GitHub 上的最新版本…', { type: 'info', duration: 2000 });
    try {
      const result = await api.checkUpdate();
      if (!result?.ok) {
        showToast(result?.error || '无法连接 GitHub 检查更新', { type: 'error', title: '检查更新失败', duration: 7000 });
        return;
      }
      if (result.isLatest) {
        showToast(`当前版本 v${result.currentVersion} 已是最新版本。`, { type: 'success', title: '已是最新版本' });
      } else if (result.updateAvailable) {
        openUpdateModal(result);
      } else {
        showToast(`当前版本 v${result.currentVersion} 高于 GitHub 最新版本 v${result.latestVersion}，可能尚未发布。`, {
          type: 'warn',
          title: '版本尚未发布',
          duration: 7000
        });
      }
    } catch (error) {
      showToast(error?.message || '检查更新失败', { type: 'error' });
    } finally {
      state.updateChecking = false;
      buttons.forEach((button) => { if (button) button.disabled = false; });
    }
  }

  async function downloadAndInstallUpdate() {
    const button = $('#updateDownloadButton');
    if (!button || state.updateDownloading) return;
    const info = state.updateInfo;
    if (!info?.assetUrl) return;
    state.updateDownloading = true;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span>正在下载…';
    try {
      const result = await api.downloadUpdate({
        url: info.assetUrl,
        name: info.assetName,
        expectedSize: info.assetSize,
        digest: info.assetDigest
      });
      if (!result?.ok) {
        showToast(result?.error || '下载更新失败', { type: 'error', title: '下载失败' });
        button.disabled = false;
        button.textContent = '下载并打开安装包';
        return;
      }
      showToast(`安装包已保存：${result.filePath}`, { type: 'success', title: '下载完成', duration: 7000 });
      button.innerHTML = '正在打开安装包…';
      const launched = await api.launchInstaller(result.filePath);
      if (launched?.ok) {
        closeModal();
      } else {
        button.disabled = false;
        button.textContent = '重新打开安装包';
        showToast(launched?.error || '无法打开安装包', { type: 'warn' });
      }
    } catch (error) {
      showToast(error?.message || '下载失败', { type: 'error' });
      button.disabled = false;
      button.textContent = '下载并打开安装包';
    } finally {
      state.updateDownloading = false;
    }
  }

  function bindClassroomToolEvents() {
    const checkUpdateButton = $('#checkUpdateButton');
    if (checkUpdateButton) checkUpdateButton.addEventListener('click', checkForUpdates);
    const checkUpdateDataButton = $('#checkUpdateDataButton');
    if (checkUpdateDataButton) checkUpdateDataButton.addEventListener('click', checkForUpdates);
    if (api.onUpdateProgress) {
      api.onUpdateProgress((progress) => {
        const button = $('#updateDownloadButton');
        if (!button || !state.updateDownloading) return;
        const percent = progress && progress.percent ? progress.percent : 0;
        button.innerHTML = percent ? `<span class="spinner"></span>下载中 ${percent}%` : '<span class="spinner"></span>正在下载…';
      });
    }

    $$('[data-browser-back]').forEach((button) => button.addEventListener('click', () => browserNavigate('back')));
    $$('[data-browser-forward]').forEach((button) => button.addEventListener('click', () => browserNavigate('forward')));
    $$('[data-browser-reload]').forEach((button) => button.addEventListener('click', () => browserNavigate('reload')));
    $$('[data-browser-home]').forEach((button) => button.addEventListener('click', () => browserNavigate('home')));
    $$('[data-browser-zoom-in]').forEach((button) => button.addEventListener('click', () => setBrowserZoom(state.browserZoom + 0.1)));
    $$('[data-browser-zoom-out]').forEach((button) => button.addEventListener('click', () => setBrowserZoom(state.browserZoom - 0.1)));
    $$('[data-browser-zoom-reset]').forEach((button) => button.addEventListener('click', () => setBrowserZoom(1)));
    const browserAddress = $('#browserAddress');
    if (browserAddress) {
      browserAddress.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          browserGoToAddress(browserAddress.value);
          browserAddress.blur();
        }
      });
    }
    $$('[data-browser-external]').forEach((button) => button.addEventListener('click', async () => {
      const webview = browserWebview();
      const url = webview?.getURL?.() || 'https://zz8zszy.cn';
      if (/^https?:/i.test(url)) await api.openExternal(url);
    }));
    const saveBrowserButton = $('#saveBrowserCredentials');
    if (saveBrowserButton) saveBrowserButton.addEventListener('click', saveBrowserCredentialsFromForm);
    const fillBrowserButton = $('#fillBrowserCredentials');
    if (fillBrowserButton) fillBrowserButton.addEventListener('click', () => fillBrowserCredentials(true));
    const clearBrowserButton = $('#clearBrowserCredentials');
    if (clearBrowserButton) {
      clearBrowserButton.addEventListener('click', async () => {
        const result = await api.browserCredentials.clear();
        if (result?.ok) {
          state.browserCredentials = null;
          const username = $('#browserUsername');
          const password = $('#browserPassword');
          if (username) username.value = '';
          if (password) password.value = '';
          updateBrowserCredentialUi();
          showToast('已清除保存的登录账号。', { type: 'success' });
        } else {
          showToast(result?.error || '清除失败', { type: 'error' });
        }
      });
    }

    const cameraStartButton = $('#cameraStart');
    if (cameraStartButton) cameraStartButton.addEventListener('click', () => startCamera($('#cameraDeviceSelect')?.value || ''));
    const cameraStopButton = $('#cameraStop');
    if (cameraStopButton) cameraStopButton.addEventListener('click', stopCamera);
    const cameraLockButton = $('#cameraLock');
    if (cameraLockButton) cameraLockButton.addEventListener('click', toggleCameraLock);
    const cameraPhotoButton = $('#cameraPhoto');
    if (cameraPhotoButton) cameraPhotoButton.addEventListener('click', captureCameraPhoto);
    $$('[data-camera-lock]').forEach((button) => button.addEventListener('click', toggleCameraLock));
    $$('[data-camera-photo]').forEach((button) => button.addEventListener('click', captureCameraPhoto));
    $$('[data-camera-reconnect]').forEach((button) => button.addEventListener('click', () => {
      if (state.cameraLocked) toggleCameraLock();
      showToast('正在重新连接展台…', { type: 'info', duration: 1800 });
      startCamera(state.cameraDeviceId);
    }));
    $$('[data-camera-focus]').forEach((button) => button.addEventListener('click', () => applyCameraFocus(button.dataset.cameraFocus)));
    const cameraDeviceSelect = $('#cameraDeviceSelect');
    if (cameraDeviceSelect) cameraDeviceSelect.addEventListener('change', () => startCamera(cameraDeviceSelect.value));
    const cameraResolution = $('#cameraResolution');
    if (cameraResolution) {
      cameraResolution.value = String(state.cameraResolution);
      cameraResolution.addEventListener('change', () => {
        state.cameraResolution = Number(cameraResolution.value) || 1920;
        state.cameraAutoStarted = true;
        stopCamera();
        startCamera(state.cameraDeviceId);
      });
    }
    const cameraClarity = $('#cameraClarity');
    if (cameraClarity) {
      cameraClarity.value = String(state.cameraClarity);
      cameraClarity.addEventListener('input', () => {
        state.cameraClarity = Number(cameraClarity.value) || 110;
        applyCameraEnhancements();
        updateCameraResolutionInfo();
      });
    }
    $$('[data-camera-rotate-step]').forEach((button) => button.addEventListener('click', () => {
      state.cameraRotation = ((Number(state.cameraRotation) || 0) + 90) % 360;
      applyCameraEnhancements();
    }));
    $$('[data-camera-mirror="x"]').forEach((button) => button.addEventListener('click', () => {
      state.cameraMirrorX = !state.cameraMirrorX;
      applyCameraEnhancements();
    }));
    $$('[data-camera-orientation-reset]').forEach((button) => button.addEventListener('click', () => {
      state.cameraRotation = 0;
      state.cameraMirrorX = false;
      applyCameraEnhancements();
    }));
    const cameraVideo = $('#cameraVideo');
    if (cameraVideo) cameraVideo.addEventListener('loadedmetadata', updateCameraResolutionInfo);
    document.addEventListener('fullscreenchange', () => requestAnimationFrame(applyCameraEnhancements));
    window.addEventListener('resize', applyCameraEnhancements);
    const cameraFullscreen = $('#cameraFullscreen');
    if (cameraFullscreen) {
      cameraFullscreen.addEventListener('click', () => {
        const stage = $('#cameraStage');
        if (stage?.requestFullscreen) stage.requestFullscreen().catch(() => showToast('无法进入全屏', { type: 'warn' }));
      });
    }
    const syncBrushWidth = (board) => {
      $$(`[data-brush-width="${board.name}"]`).forEach((input) => { input.value = String(board.width); });
      const normal = $(board.name === 'camera' ? '#cameraPenWidth' : '#whiteboardPenWidth');
      if (normal) normal.value = String(board.width);
    };
    const cameraPenWidth = $('#cameraPenWidth');
    if (cameraPenWidth) {
      cameraPenWidth.addEventListener('input', () => {
        drawingState.camera.width = Number(cameraPenWidth.value) || 4;
        syncBrushWidth(drawingState.camera);
      });
    }
    const whiteboardPenWidth = $('#whiteboardPenWidth');
    if (whiteboardPenWidth) {
      whiteboardPenWidth.addEventListener('input', () => {
        drawingState.whiteboard.width = Number(whiteboardPenWidth.value) || 5;
        syncBrushWidth(drawingState.whiteboard);
      });
    }
    $$('[data-brush-width]').forEach((input) => {
      input.addEventListener('input', () => {
        const board = drawingState[input.dataset.brushWidth];
        if (!board) return;
        board.width = Math.max(1, Math.min(24, Number(input.value) || board.width));
        syncBrushWidth(board);
      });
    });
    syncBrushWidth(drawingState.camera);
    syncBrushWidth(drawingState.whiteboard);
    const whiteboardFullscreen = $('#whiteboardFullscreen');
    if (whiteboardFullscreen) {
      whiteboardFullscreen.addEventListener('click', () => {
        const stage = $('#whiteboardStage');
        if (stage?.requestFullscreen) stage.requestFullscreen().catch(() => showToast('无法进入全屏', { type: 'warn' }));
      });
    }
    const whiteboardSave = $('#whiteboardSave');
    if (whiteboardSave) whiteboardSave.addEventListener('click', saveWhiteboardImage);
    $$('[data-whiteboard-page]').forEach((button) => button.addEventListener('click', () => switchWhiteboardPage(button.dataset.whiteboardPage)));
    $$('#annotationCapture').forEach((button) => button.addEventListener('click', captureAnnotationScreen));
    $$('#annotationSave').forEach((button) => button.addEventListener('click', saveAnnotationImage));
    const annotationFullscreen = $('#annotationFullscreen');
    if (annotationFullscreen) annotationFullscreen.addEventListener('click', () => {
      const stage = $('#annotationStage');
      if (stage && !document.fullscreenElement) stage.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    });
    const annotationPenWidth = $('#annotationPenWidth');
    if (annotationPenWidth) annotationPenWidth.addEventListener('input', () => {
      drawingState.annotation.width = Number(annotationPenWidth.value) || 5;
    });

    $$('[data-zoom-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const board = drawingState[button.dataset.board];
        if (board) changeBoardZoom(board, button.dataset.zoomAction);
      });
    });
    $$('[data-exit-fullscreen]').forEach((button) => {
      button.addEventListener('click', () => {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      });
    });
    [['cameraStage', drawingState.camera], ['whiteboardStage', drawingState.whiteboard]].forEach(([stageId, board]) => {
      const stage = document.getElementById(stageId);
      if (!stage) return;
      stage.addEventListener('wheel', (event) => {
        if (event.target.closest('.camera-controls, .whiteboard-controls')) return;
        event.preventDefault();
        changeBoardZoom(board, event.deltaY < 0 ? 'in' : 'out');
      }, { passive: false });
    });

    const addPeriod = $('#addTimetablePeriod');
    if (addPeriod) addPeriod.addEventListener('click', addTimetablePeriod);
    const saveTimetableButton = $('#saveTimetableButton');
    if (saveTimetableButton) saveTimetableButton.addEventListener('click', saveTimetable);
    const weekSwitch = $('#timetableWeekSwitch');
    if (weekSwitch) {
      weekSwitch.addEventListener('click', (event) => {
        const button = event.target.closest('[data-timetable-week]');
        if (button) switchTimetableWeek(button.dataset.timetableWeek);
      });
    }
    const timetableTable = $('#timetableTable');
    if (timetableTable) {
      timetableTable.addEventListener('input', markTimetableDirty);
      timetableTable.addEventListener('click', (event) => {
        const button = event.target.closest('[data-timetable-remove]');
        if (button) removeTimetablePeriod(Number(button.dataset.timetableRemove));
      });
    }

    const aiSaveKey = $('#aiSaveKey');
    if (aiSaveKey) aiSaveKey.addEventListener('click', () => saveAiKeyFromForm(true));
    const aiClearKey = $('#aiClearKey');
    if (aiClearKey) aiClearKey.addEventListener('click', clearAiKey);
    const aiAskButton = $('#aiAskButton');
    if (aiAskButton) aiAskButton.addEventListener('click', askAi);
    const aiCopyAnswer = $('#aiCopyAnswer');
    if (aiCopyAnswer) aiCopyAnswer.addEventListener('click', copyAiAnswer);
    const aiAttachFile = $('#aiAttachFile');
    if (aiAttachFile) aiAttachFile.addEventListener('click', attachAiFile);
    const aiRemoveFile = $('#aiRemoveFile');
    if (aiRemoveFile) aiRemoveFile.addEventListener('click', removeAiFile);
    $$('[data-ai-tab]').forEach((button) => button.addEventListener('click', () => setAiTab(button.dataset.aiTab)));
    const aiTranslateButton = $('#aiTranslateButton');
    if (aiTranslateButton) aiTranslateButton.addEventListener('click', translateAi);
    const aiOcrPick = $('#aiOcrPick');
    if (aiOcrPick) aiOcrPick.addEventListener('click', pickOcrImage);
    const aiOcrRun = $('#aiOcrRun');
    if (aiOcrRun) aiOcrRun.addEventListener('click', pickOcrImage);
    const aiOcrCleanup = $('#aiOcrCleanup');
    if (aiOcrCleanup) aiOcrCleanup.addEventListener('click', cleanupOcrText);
    const aiOcrCopy = $('#aiOcrCopy');
    if (aiOcrCopy) aiOcrCopy.addEventListener('click', copyOcrText);
    ['#aiModel', '#aiReasoning'].forEach((selector) => {
      const select = $(selector);
      if (select) select.addEventListener('change', async () => {
        state.settings.ai = normalizeAiSettings({ model: $('#aiModel')?.value, reasoning: $('#aiReasoning')?.value });
        await persistLibrary();
      });
    });
    const politicsBookSelect = $('#politicsBookSelect');
    if (politicsBookSelect) politicsBookSelect.addEventListener('change', () => {
      state.politics.bookId = politicsBookSelect.value;
      state.politics.chapter = '';
      renderPoliticsFilters();
    });
    const politicsChapterSelect = $('#politicsChapterSelect');
    if (politicsChapterSelect) politicsChapterSelect.addEventListener('change', () => {
      state.politics.chapter = politicsChapterSelect.value;
    });
    const politicsDays = $('#politicsDays');
    if (politicsDays) politicsDays.addEventListener('change', () => {
      state.politics.days = Number(politicsDays.value) || 7;
    });
    const politicsSearchButton = $('#politicsSearchButton');
    if (politicsSearchButton) politicsSearchButton.addEventListener('click', searchPolitics);

    const volumeStart = $('#volumeStart');
    if (volumeStart) volumeStart.addEventListener('click', startVolume);
    const volumeStop = $('#volumeStop');
    if (volumeStop) volumeStop.addEventListener('click', stopVolume);
    $$('[data-volume-scene]').forEach((button) => button.addEventListener('click', () => {
      state.volume.scene = button.dataset.volumeScene === 'morning' ? 'morning' : 'study';
      state.volume.peak = state.volume.running ? state.volume.db : 0;
      renderVolume();
    }));

    const englishExamBook = $('#englishExamBook');
    if (englishExamBook) englishExamBook.addEventListener('change', () => {
      state.englishExam.bookId = englishExamBook.value;
      state.englishExam.chapter = '';
      renderEnglishExam();
    });
    const englishExamChapter = $('#englishExamChapter');
    if (englishExamChapter) englishExamChapter.addEventListener('change', () => {
      state.englishExam.chapter = englishExamChapter.value;
    });
    ['#englishExamType', '#englishExamCount'].forEach((selector) => {
      const select = $(selector);
      if (select) select.addEventListener('change', () => {
        state.englishExam.type = $('#englishExamType')?.value || '阅读理解';
        state.englishExam.count = Number($('#englishExamCount')?.value) || 5;
      });
    });
    const englishExamSearch = $('#englishExamSearch');
    if (englishExamSearch) englishExamSearch.addEventListener('click', searchEnglishExam);
    bindEnglishWebControls();
    const widgetSizeInput = $('#settingsWidgetSize');
    if (widgetSizeInput) widgetSizeInput.addEventListener('input', () => {
      const label = $('#settingsWidgetSizeValue');
      if (label) label.textContent = widgetSizeInput.value;
    });

    const settingsSaveKey = $('#settingsSaveKey');
    if (settingsSaveKey) settingsSaveKey.addEventListener('click', saveSettingsKey);
    const settingsClearKey = $('#settingsClearKey');
    if (settingsClearKey) settingsClearKey.addEventListener('click', clearSettingsKey);
    const settingsSave = $('#settingsSave');
    if (settingsSave) settingsSave.addEventListener('click', saveSettings);
    ['#settingsDanmakuSpeed', '#settingsDanmakuFont'].forEach((selector) => {
      const input = $(selector);
      if (input) input.addEventListener('input', () => {
        const speedValue = $('#settingsDanmakuSpeedValue');
        const fontValue = $('#settingsDanmakuFontValue');
        if (speedValue) speedValue.textContent = $('#settingsDanmakuSpeed')?.value || '45';
        if (fontValue) fontValue.textContent = $('#settingsDanmakuFont')?.value || '18';
      });
    });
    const aiQuestion = $('#aiQuestion');
    if (aiQuestion) aiQuestion.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        askAi();
      }
    });
    const graphAdd = $('#graphAdd');
    if (graphAdd) graphAdd.addEventListener('click', addGraphFunction);
    const graphExpression = $('#graphExpression');
    if (graphExpression) graphExpression.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); addGraphFunction(); }
    });
    $$('[data-graph-insert]').forEach((button) => button.addEventListener('click', () => {
      insertGraphText(button.dataset.graphInsert || '');
    }));
    $$('[data-graph-action]').forEach((button) => button.addEventListener('click', () => {
      handleGraphKeypad(button.dataset.graphAction);
    }));
    const graphCanvas = $('#graphCanvas');
    if (graphCanvas && !graphCanvas.dataset.bound) {
      graphCanvas.dataset.bound = '1';
      const zoomAt = (factor, clientX, clientY) => {
        const rect = graphCanvas.getBoundingClientRect();
        const mx = (clientX || rect.left + rect.width / 2) - rect.left;
        const my = (clientY || rect.top + rect.height / 2) - rect.top;
        const old = state.graph.scale;
        const next = Math.max(5, Math.min(400, old * factor));
        state.graph.originX = mx - (mx - state.graph.originX) * (next / old);
        state.graph.originY = my - (my - state.graph.originY) * (next / old);
        state.graph.scale = next;
        drawGraph();
      };
      graphCanvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        zoomAt(event.deltaY < 0 ? 1.18 : 0.85, event.clientX, event.clientY);
      }, { passive: false });
      graphCanvas.addEventListener('pointerdown', (event) => {
        state.graph.dragging = true;
        state.graph.lastX = event.clientX;
        state.graph.lastY = event.clientY;
        graphCanvas.setPointerCapture?.(event.pointerId);
      });
      graphCanvas.addEventListener('pointermove', (event) => {
        if (state.graph.dragging) {
          state.graph.originX += event.clientX - state.graph.lastX;
          state.graph.originY += event.clientY - state.graph.lastY;
          state.graph.lastX = event.clientX;
          state.graph.lastY = event.clientY;
          drawGraph();
          return;
        }
        const rect = graphCanvas.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        const worldX = (mx - state.graph.originX) / state.graph.scale;
        let nearest = null;
        state.graph.functions.forEach((fn) => {
          if (!fn.visible) return;
          let y;
          try { y = evaluateMath(fn.expression, { x: worldX }); } catch (error) { y = NaN; }
          if (!Number.isFinite(y)) return;
          const py = state.graph.originY - y * state.graph.scale;
          const distance = Math.abs(py - my);
          if (distance <= 28 && (!nearest || distance < nearest.distance)) {
            nearest = { fn, y, px: mx, py, distance, color: fn.color };
          }
        });
        const tooltip = $('#graphCoordTooltip');
        if (!nearest) {
          state.graph.hover = null;
          if (tooltip) {
            const worldY = (state.graph.originY - my) / state.graph.scale;
            tooltip.textContent = `(${Number(worldX.toFixed(4))}, ${Number(worldY.toFixed(4))})`;
            tooltip.style.left = `${Math.max(8, Math.min(mx + 14, rect.width - 230))}px`;
            tooltip.style.top = `${Math.max(8, my - 38)}px`;
            tooltip.hidden = false;
          }
          drawGraph();
          return;
        }
        state.graph.hover = { px: nearest.px, py: nearest.py, color: nearest.color };
        if (tooltip) {
          const xText = Number(worldX.toFixed(4)).toString();
          const yText = Number(nearest.y.toFixed(6)).toString();
          tooltip.textContent = `(${xText}, ${yText})  y = ${nearest.fn.expression}`;
          tooltip.style.left = `${Math.max(8, Math.min(nearest.px + 14, rect.width - 230))}px`;
          tooltip.style.top = `${Math.max(8, nearest.py - 38)}px`;
          tooltip.hidden = false;
        }
        drawGraph();
      });
      const endGraphDrag = (event) => {
        state.graph.dragging = false;
        try { graphCanvas.releasePointerCapture?.(event.pointerId); } catch (error) { /* ignore */ }
      };
      graphCanvas.addEventListener('pointerup', endGraphDrag);
      graphCanvas.addEventListener('pointercancel', endGraphDrag);
      graphCanvas.addEventListener('pointerleave', () => {
        if (state.graph.dragging) return;
        state.graph.hover = null;
        const tooltip = $('#graphCoordTooltip');
        if (tooltip) tooltip.hidden = true;
        drawGraph();
      });
      window.addEventListener('resize', () => { if (state.page === 'graph') drawGraph(); });
      $('#graphZoomIn')?.addEventListener('click', () => zoomAt(1.25));
      $('#graphZoomOut')?.addEventListener('click', () => zoomAt(0.8));
      $('#graphReset')?.addEventListener('click', () => {
        const rect = graphCanvas.getBoundingClientRect();
        state.graph.scale = 40;
        state.graph.originX = rect.width / 2;
        state.graph.originY = rect.height / 2;
        drawGraph();
      });
    }
    $$('[data-calc-value]').forEach((button) => button.addEventListener('click', () => {
      state.calc.expression += button.dataset.calcValue || '';
      state.calc.result = '';
      calcShow(state.calc.expression, '');
    }));
    $$('[data-calc-action]').forEach((button) => button.addEventListener('click', () => {
      const action = button.dataset.calcAction;
      if (action === 'clear') {
        state.calc.expression = '';
        state.calc.result = '';
        calcShow('', '');
      } else if (action === 'backspace') {
        state.calc.expression = state.calc.expression.slice(0, -1);
        state.calc.result = '';
        calcShow(state.calc.expression, '');
      } else if (action === 'equals') {
        calculateExpression();
      }
    }));
    $$('[data-calc-angle]').forEach((button) => button.addEventListener('click', () => {
      state.calc.angleMode = button.dataset.calcAngle === 'deg' ? 'deg' : 'rad';
      renderCalculator();
    }));
    const calcClearHistory = $('#calcClearHistory');
    if (calcClearHistory) calcClearHistory.addEventListener('click', () => {
      state.calc.history = [];
      renderCalcHistory();
    });
    document.addEventListener('change', (event) => {
      const visible = event.target.closest('[data-graph-visible]');
      if (visible) {
        const fn = state.graph.functions.find((entry) => entry.id === visible.dataset.graphVisible);
        if (fn) { fn.visible = Boolean(visible.checked); drawGraph(); }
      }
    });

    const phoneStartButton = $('#phoneStart');
    if (phoneStartButton) phoneStartButton.addEventListener('click', startPhoneCast);
    const phoneStopButton = $('#phoneStop');
    if (phoneStopButton) phoneStopButton.addEventListener('click', stopPhoneCast);
    const phoneFullscreenButton = $('#phoneFullscreen');
    if (phoneFullscreenButton) phoneFullscreenButton.addEventListener('click', phoneFullscreen);
    const bluetoothSettingsButton = $('#bluetoothSettingsButton');
    if (bluetoothSettingsButton) bluetoothSettingsButton.addEventListener('click', async () => {
      const result = await api.openBluetoothSettings?.();
      if (result && !result.ok) showToast(result.error || '无法打开蓝牙设置', { type: 'warn' });
    });
    if (api.onPhoneFrame && !state.phoneFrameCleanup) {
      state.phoneFrameCleanup = api.onPhoneFrame(handlePhoneFrame);
    }

    const timerStart = $('#timerStart');
    if (timerStart) timerStart.addEventListener('click', timerStartPause);
    const timerResetButton = $('#timerReset');
    if (timerResetButton) timerResetButton.addEventListener('click', timerReset);
    const timerFullscreen = $('#timerFullscreen');
    if (timerFullscreen) timerFullscreen.addEventListener('click', () => {
      const card = $('#timerCard');
      if (card && !document.fullscreenElement) card.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    });
    $$('[data-timer-preset]').forEach((button) => button.addEventListener('click', () => {
      timerSetTotal(Number(button.dataset.timerPreset) || 0);
      timerStartPause();
    }));
    ['#timerMinutes', '#timerSeconds'].forEach((selector) => {
      const input = $(selector);
      if (input) input.addEventListener('change', timerReadInputs);
    });

    const wordGameStartButton = $('#wordGameStartButton');
    if (wordGameStartButton) wordGameStartButton.addEventListener('click', startWordGame);
    const wordGameNext = $('#wordGameNext');
    if (wordGameNext) wordGameNext.addEventListener('click', nextWordQuestion);
    const wordGameAgain = $('#wordGameAgain');
    if (wordGameAgain) wordGameAgain.addEventListener('click', () => { resetWordGame(); startWordGame(); });
    const wordGameBack = $('#wordGameBack');
    if (wordGameBack) wordGameBack.addEventListener('click', resetWordGame);
    const wordGameNickname = $('#wordGameNickname');
    if (wordGameNickname) wordGameNickname.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); startWordGame(); }
    });

    const voteResultsButton = $('#voteResultsButton');
    if (voteResultsButton) voteResultsButton.addEventListener('click', showVoteResults);
    const importStudentsButton = $('#importStudentsButton');
    if (importStudentsButton) importStudentsButton.addEventListener('click', importStudentList);
    const pickStudentButton = $('#pickStudentButton');
    if (pickStudentButton) pickStudentButton.addEventListener('click', pickRandomStudent);
    const studentAdminButton = $('#studentAdminButton');
    if (studentAdminButton) studentAdminButton.addEventListener('click', showStudentAdmin);

    const refreshUsb = $('#refreshUsbDrives');
    if (refreshUsb) refreshUsb.addEventListener('click', refreshUsbDrives);
    const scanUsb = $('#scanUsbButton');
    if (scanUsb) scanUsb.addEventListener('click', startUsbScan);
    const defenderUsb = $('#defenderUsbButton');
    if (defenderUsb) defenderUsb.addEventListener('click', askDefenderScan);
    const usbSelect = $('#usbDriveSelect');
    if (usbSelect) usbSelect.addEventListener('change', renderUsbDrives);
    const usbFindings = $('#usbFindings');
    if (usbFindings) {
      usbFindings.addEventListener('click', (event) => {
        const button = event.target.closest('[data-usb-reveal]');
        if (button) api.revealFile(button.dataset.usbReveal);
      });
    }

    document.addEventListener('fullscreenchange', () => {
      requestAnimationFrame(() => {
        resizeDrawingCanvas(drawingState.camera);
        resizeDrawingCanvas(drawingState.whiteboard);
      });
    });
  }

  /* ---------------- 函数图像 ---------------- */

  const GRAPH_COLORS = ['#2f7fd8', '#e35d5d', '#2d9d78', '#d99a3e', '#7b61c9', '#2f9fd0', '#c56f9e', '#5b7d3a'];

  function graphCoordinates() {
    const canvas = $('#graphCanvas');
    if (!canvas) return null;
    const width = canvas.clientWidth || 760;
    const height = canvas.clientHeight || 420;
    if (!state.graph.originX && !state.graph.originY) {
      state.graph.originX = width / 2;
      state.graph.originY = height / 2;
    }
    return { canvas, width, height, context: canvas.getContext('2d') };
  }

  function graphStep(scale) {
    const raw = 72 / Math.max(1, scale);
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / power;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * power;
  }

  function drawGraph() {
    const coords = graphCoordinates();
    if (!coords) return;
    const { canvas, width, height, context } = coords;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    const graph = state.graph;
    const step = graphStep(graph.scale);
    const left = -graph.originX / graph.scale;
    const right = (width - graph.originX) / graph.scale;
    const bottom = (graph.originY - height) / graph.scale;
    const top = graph.originY / graph.scale;
    const decimals = step >= 1 ? 0 : Math.max(0, Math.min(4, -Math.floor(Math.log10(step))));
    context.lineWidth = 1;
    context.font = '9px "Segoe UI", Arial, sans-serif';
    context.fillStyle = '#8ea5b7';
    context.strokeStyle = '#eaf2f8';
    for (let x = Math.ceil(left / step) * step; x <= right; x += step) {
      const sx = graph.originX + x * graph.scale;
      context.beginPath();
      context.moveTo(sx, 0);
      context.lineTo(sx, height);
      context.stroke();
      if (Math.abs(x) > step / 2) {
        context.textAlign = 'center';
        context.fillText(Number(x.toFixed(decimals)).toString(), sx, Math.min(height - 5, graph.originY + 13));
      }
    }
    for (let y = Math.ceil(bottom / step) * step; y <= top; y += step) {
      const sy = graph.originY - y * graph.scale;
      context.beginPath();
      context.moveTo(0, sy);
      context.lineTo(width, sy);
      context.stroke();
      if (Math.abs(y) > step / 2) {
        context.textAlign = 'right';
        context.fillText(Number(y.toFixed(decimals)).toString(), Math.max(26, graph.originX - 7), sy + 3);
      }
    }
    context.strokeStyle = '#7894a8';
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(0, graph.originY);
    context.lineTo(width, graph.originY);
    context.moveTo(graph.originX, 0);
    context.lineTo(graph.originX, height);
    context.stroke();
    context.fillStyle = '#68859a';
    context.textAlign = 'right';
    context.fillText('x', width - 5, graph.originY - 7);
    context.textAlign = 'left';
    context.fillText('y', graph.originX + 7, 12);
    context.font = '10px Georgia, "Times New Roman", serif';
    context.fillStyle = '#7894a8';
    context.fillText('0', graph.originX - 7, graph.originY + 13);
    state.graph.functions.forEach((fn) => {
      if (!fn.visible) return;
      context.strokeStyle = fn.color;
      context.lineWidth = 1.8;
      context.beginPath();
      let started = false;
      let previousY = null;
      for (let px = 0; px <= width; px += 1) {
        const worldX = (px - graph.originX) / graph.scale;
        let y;
        try { y = evaluateMath(fn.expression, { x: worldX }); } catch (error) { y = NaN; }
        if (!Number.isFinite(y)) {
          started = false;
          previousY = null;
          continue;
        }
        const sy = graph.originY - y * graph.scale;
        if (!Number.isFinite(sy) || Math.abs(sy) > height * 5) {
          started = false;
          previousY = null;
          continue;
        }
        if (!started || (previousY !== null && Math.abs(sy - previousY) > height * 1.5)) {
          context.moveTo(px, sy);
          started = true;
        } else {
          context.lineTo(px, sy);
        }
        previousY = sy;
      }
      context.stroke();
    });
    if (state.graph.hover && Number.isFinite(state.graph.hover.px) && Number.isFinite(state.graph.hover.py)) {
      const hover = state.graph.hover;
      context.beginPath();
      context.arc(hover.px, hover.py, 4.2, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = hover.color || '#2f7fd8';
      context.stroke();
    }
    const empty = $('#graphEmpty');
    if (empty) empty.hidden = state.graph.functions.length > 0;
    const scaleLabel = $('#graphScaleLabel');
    if (scaleLabel) scaleLabel.textContent = `${Math.round(state.graph.scale)} px / 单位`;
  }

  function renderGraphList() {
    const list = $('#graphFunctionList');
    const count = $('#graphFunctionCount');
    if (count) count.textContent = `${state.graph.functions.length} 条`;
    if (!list) return;
    list.innerHTML = state.graph.functions.length
      ? state.graph.functions.map((fn) => `<div class="graph-function-row">
        <button type="button" class="graph-color-dot" style="--graph-color:${fn.color}" data-graph-color="${attr(fn.id)}" title="切换颜色"></button>
        <code title="${attr(fn.expression)}">y = ${esc(fn.expression)}</code>
        <label class="graph-visible"><input type="checkbox" data-graph-visible="${attr(fn.id)}"${fn.visible ? ' checked' : ''}>显示</label>
        <button type="button" class="graph-remove" data-graph-remove="${attr(fn.id)}" title="移除">${icon('close')}</button>
      </div>`).join('')
      : '<div class="graph-list-empty">还没有函数<br><small>输入表达式后点击「绘制」</small></div>';
  }

  function insertGraphText(text) {
    const input = $('#graphExpression');
    if (!input) return;
    const value = input.value;
    const start = input.selectionStart == null ? value.length : input.selectionStart;
    const end = input.selectionEnd == null ? value.length : input.selectionEnd;
    input.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
    const position = start + text.length;
    input.focus();
    try { input.setSelectionRange(position, position); } catch (error) { /* ignore */ }
  }

  function handleGraphKeypad(action) {
    const input = $('#graphExpression');
    if (!input) return;
    if (action === 'clear') {
      input.value = '';
      input.focus();
    } else if (action === 'backspace') {
      const start = input.selectionStart == null ? input.value.length : input.selectionStart;
      const end = input.selectionEnd == null ? start : input.selectionEnd;
      if (start !== end) input.value = input.value.slice(0, start) + input.value.slice(end);
      else if (start > 0) input.value = input.value.slice(0, start - 1) + input.value.slice(start);
      input.focus();
      try { input.setSelectionRange(Math.max(0, start - (start === end ? 1 : 0)), Math.max(0, start - (start === end ? 1 : 0))); } catch (error) { /* ignore */ }
    } else if (action === 'draw') {
      addGraphFunction();
    }
  }

  function addGraphFunction() {
    const input = $('#graphExpression');
    const errorNode = $('#graphError');
    const expression = input ? input.value.trim() : '';
    if (!expression) {
      showToast('请输入函数表达式。', { type: 'warn' });
      return;
    }
    const normalized = expression.replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=/i, '').trim();
    try {
      const samples = [0, 1, -1, 2, 3, Math.PI];
      if (!samples.some((x) => {
        try { return Number.isFinite(evaluateMath(normalized, { x })); } catch (err) { return false; }
      })) throw new Error('表达式没有可用数值，请检查定义域');
      state.graph.functions.push({
        id: uniqueId('graph'),
        expression: normalized,
        color: GRAPH_COLORS[state.graph.functions.length % GRAPH_COLORS.length],
        visible: true
      });
      if (input) input.value = '';
      if (errorNode) errorNode.hidden = true;
      renderGraphList();
      drawGraph();
    } catch (error) {
      if (errorNode) {
        errorNode.hidden = false;
        errorNode.textContent = `表达式错误：${error.message}`;
      }
    }
  }

  function renderGraph() {
    const canvas = $('#graphCanvas');
    if (!canvas) return;
    if (!state.graph.initialized) {
      state.graph.initialized = true;
      requestAnimationFrame(() => {
        const coords = graphCoordinates();
        if (coords && !state.graph.originX) {
          state.graph.originX = coords.width / 2;
          state.graph.originY = coords.height / 2;
        }
        drawGraph();
      });
    } else {
      requestAnimationFrame(drawGraph);
    }
    renderGraphList();
  }

  /* ---------------- 科学计算器 ---------------- */

  function calcShow(expression, result) {
    const exprNode = $('#calcExpression');
    const resultNode = $('#calcResult');
    if (exprNode) exprNode.textContent = expression || '0';
    if (resultNode) resultNode.textContent = result || '0';
  }

  function renderCalcHistory() {
    const list = $('#calcHistory');
    if (!list) return;
    list.innerHTML = state.calc.history.length
      ? state.calc.history.map((item) => `<button type="button" class="calc-history-row" data-calc-history="${attr(item.expression)}"><span>${esc(item.expression)}</span><strong>${esc(item.result)}</strong></button>`).join('')
      : '<div class="calc-history-empty">还没有计算记录</div>';
  }

  function calculateExpression() {
    const expression = state.calc.expression.trim();
    if (!expression) return;
    try {
      let value = evaluateMath(expression, { angleMode: state.calc.angleMode });
      if (Math.abs(value) < 1e-12) value = 0;
      const rounded = Number(value.toPrecision(12)).toString();
      state.calc.result = rounded;
      calcShow(expression, rounded);
      state.calc.history.unshift({ expression, result: rounded });
      state.calc.history = state.calc.history.slice(0, 20);
      renderCalcHistory();
    } catch (error) {
      state.calc.result = '错误';
      calcShow(expression, `错误：${error.message}`);
    }
  }

  function renderCalculator() {
    const mode = $('#calcHint');
    if (mode) mode.textContent = state.calc.angleMode === 'deg' ? '角度制 DEG' : '弧度制 RAD';
    const angleButtons = $$('[data-calc-angle]');
    angleButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.calcAngle === state.calc.angleMode));
    calcShow(state.calc.expression, state.calc.result);
    renderCalcHistory();
  }

  /* ---------------- 环境音量 ---------------- */

  function volumeScene() {
    return {
      study: { label: '自习课', min: 35, max: 50, tooQuiet: 30, tooLoud: 60, tip: '自习安静' },
      morning: { label: '晨读课', min: 55, max: 80, tooQuiet: 45, tooLoud: 88, tip: '晨读洪亮' }
    }[state.volume.scene] || { label: '自习课', min: 35, max: 50, tooQuiet: 30, tooLoud: 60, tip: '自习安静' };
  }

  function volumeLevelText(db) {
    const scene = volumeScene();
    if (!state.volume.running) return '等待启动';
    if (db < scene.tooQuiet) return '偏安静';
    if (db > scene.tooLoud) return '偏吵';
    if (db >= scene.min && db <= scene.max) return '状态合适';
    return db < scene.min ? '略微安静' : '略微偏响';
  }

  function renderVolume() {
    const scene = volumeScene();
    const dbNode = $('#volumeDb');
    const peakNode = $('#volumePeak');
    const levelNode = $('#volumeLevel');
    const meter = $('#volumeMeterBar');
    const tip = $('#volumeSceneTip');
    const status = $('#volumeStatus');
    if (dbNode) dbNode.textContent = state.volume.running ? String(Math.round(state.volume.db)) : '--';
    if (peakNode) peakNode.textContent = state.volume.running ? String(Math.round(state.volume.peak)) : '--';
    if (levelNode) {
      levelNode.textContent = volumeLevelText(state.volume.db);
      levelNode.className = `volume-level${state.volume.running ? (state.volume.db > scene.tooLoud ? ' is-loud' : state.volume.db < scene.tooQuiet ? ' is-quiet' : ' is-ok') : ''}`;
    }
    if (meter) meter.style.width = state.volume.running ? `${Math.max(0, Math.min(100, ((state.volume.db - 30) / 60) * 100))}%` : '0%';
    if (tip) tip.textContent = scene.tip;
    if (status) status.textContent = state.volume.running ? `麦克风检测中 · ${scene.label}` : '麦克风未启动';
    const start = $('#volumeStart');
    const stop = $('#volumeStop');
    if (start) start.innerHTML = `${icon('wifi')}${state.volume.running ? '重新检测' : '开始检测'}`;
    if (stop) stop.disabled = !state.volume.running;
    $$('[data-volume-scene]').forEach((button) => button.classList.toggle('is-active', button.dataset.volumeScene === state.volume.scene));
  }

  async function stopVolume() {
    if (state.volume.timer) window.clearInterval(state.volume.timer);
    state.volume.timer = 0;
    state.volume.running = false;
    if (state.volume.stream) state.volume.stream.getTracks().forEach((track) => track.stop());
    state.volume.stream = null;
    if (state.volume.context) await state.volume.context.close().catch(() => {});
    state.volume.context = null;
    state.volume.analyser = null;
    renderVolume();
  }

  async function startVolume() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('当前浏览器不支持麦克风检测。', { type: 'error' });
      return;
    }
    await stopVolume();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const context = new AudioCtx();
      await context.resume().catch(() => {});
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.72;
      context.createMediaStreamSource(stream).connect(analyser);
      state.volume.stream = stream;
      state.volume.context = context;
      state.volume.analyser = analyser;
      state.volume.running = true;
      state.volume.peak = 0;
      const samples = new Float32Array(analyser.fftSize);
      const update = () => {
        if (!state.volume.running || !state.volume.analyser) return;
        state.volume.analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const rms = Math.sqrt(sum / samples.length);
        const rawDb = 20 * Math.log10(Math.max(rms, 0.0000001)) + 100;
        const db = Math.max(30, Math.min(110, rawDb));
        state.volume.db = state.volume.db ? state.volume.db * 0.55 + db * 0.45 : db;
        state.volume.peak = Math.max(state.volume.peak, db);
        renderVolume();
      };
      state.volume.timer = window.setInterval(update, 160);
      update();
      showToast('麦克风已启动，开始检测环境音量。', { type: 'success' });
    } catch (error) {
      await stopVolume();
      showToast(`无法启动麦克风：${error.message}`, { type: 'error' });
    }
  }

  /* ---------------- 英语往年题 ---------------- */

  function englishBooks() {
    return DATA.catalog.find((subject) => subject.id === 'english')?.books || [];
  }

  function renderEnglishExam() {
    const books = englishBooks();
    const bookSelect = $('#englishExamBook');
    const chapterSelect = $('#englishExamChapter');
    if (!bookSelect || !chapterSelect) return;
    if (!state.englishExam.bookId && books[0]) state.englishExam.bookId = books[0].id;
    bookSelect.innerHTML = books.map((book) => `<option value="${attr(book.id)}"${state.englishExam.bookId === book.id ? ' selected' : ''}>${esc(book.name)}</option>`).join('');
    const book = books.find((entry) => entry.id === state.englishExam.bookId) || books[0];
    if (book) {
      if (!state.englishExam.chapter) state.englishExam.chapter = book.chapters[0]?.name || '';
      chapterSelect.innerHTML = book.chapters.map((chapter) => {
        const name = typeof chapter === 'string' ? chapter : chapter.name;
        return `<option value="${attr(name)}"${state.englishExam.chapter === name ? ' selected' : ''}>${esc(name)}</option>`;
      }).join('');
    }
    const type = $('#englishExamType');
    if (type) type.value = state.englishExam.type;
    const count = $('#englishExamCount');
    if (count) count.value = String(state.englishExam.count);
    const result = $('#englishExamResult');
    if (result) {
      if (state.englishExam.result) {
        result.textContent = state.englishExam.result;
        result.classList.add('has-content');
      } else if (!state.englishExam.loading) {
        result.innerHTML = `<div class="politics-empty"><span>${icon('bookOpen')}</span><strong>等待查找</strong><p>选择分类后点击「AI 查找题目」。</p></div>`;
        result.classList.remove('has-content');
      }
    }
    const status = $('#englishExamStatus');
    if (status && !state.englishExam.loading) status.innerHTML = `<span></span>已选择 ${esc(book?.name || '')} · ${esc(state.englishExam.chapter || '')} · ${esc(state.englishExam.type)}`;
  }

  async function searchEnglishExam() {
    if (state.englishExam.loading) return;
    const books = englishBooks();
    const book = books.find((entry) => entry.id === $('#englishExamBook')?.value) || books[0];
    const chapter = $('#englishExamChapter')?.value || book?.chapters[0]?.name || '';
    const type = $('#englishExamType')?.value || '阅读理解';
    const count = Math.max(1, Math.min(10, Number($('#englishExamCount')?.value) || 5));
    state.englishExam = { ...state.englishExam, bookId: book?.id || '', chapter, type, count, loading: true, result: '' };
    const status = $('#englishExamStatus');
    const result = $('#englishExamResult');
    const button = $('#englishExamSearch');
    if (button) button.disabled = true;
    if (status) status.innerHTML = '<span class="spinner"></span>AI 正在按课本、章节和题型整理题目…';
    if (result) result.innerHTML = '<div class="ai-thinking"><span></span><span></span><span></span>正在查找题目…</div>';
    try {
      const ai = aiSettings();
      const prompt = `你是高中英语命题与备考助手。请按以下分类提供 ${count} 道英语题目：\n教材：外研版 ${book?.name || ''}\n章节：${chapter}\n题目类型：${type}\n\n要求：\n1. 优先引用你确知的往年高考真题或公开模拟题；无法确认具体年份/来源时，必须明确写“模拟题（AI整理）”，不得编造年份、试卷名或出处。\n2. 每题必须标注【题目类型：${type}】，并给出题干、选项（如适用）、答案和简要解析。\n3. 题目难度贴近高中英语高考，围绕该章节主题和词汇。\n4. 用清晰的中文编号输出，不要输出与题目无关的说明。`;
      const response = await api.ai.ask({ question: prompt, model: ai.model, reasoning: ai.reasoning });
      if (!response || !response.ok) {
        if (result) result.innerHTML = `<div class="politics-empty"><span>${icon('alert')}</span><strong>查找失败</strong><p>${esc((response && response.error) || 'AI 请求失败')}</p></div>`;
        return;
      }
      state.englishExam.result = response.answer;
      if (result) {
        result.textContent = response.answer;
        result.classList.add('has-content');
      }
      if (status) status.innerHTML = `<span></span>已整理 ${count} 道题 · ${esc(type)} · 请以原卷为准`;
    } finally {
      state.englishExam.loading = false;
      if (button) button.disabled = false;
    }
  }

  /* ---------------- 英语网 ---------------- */

  function renderEnglishWeb() {
    const webview = $('#englishWebview');
    if (!webview) return;
    if (webview.dataset.bound === '1') {
      const existing = $('#englishWebLoading');
      if (existing && webview.getURL?.()) existing.hidden = true;
      return;
    }
    webview.dataset.bound = '1';
    const loading = $('#englishWebLoading');
    const status = $('#englishWebStatus');
    const updateStatus = () => {
      const url = webview.getURL?.() || '';
      if (status) status.textContent = url ? (url.includes('cybertamin.xin') ? '英语网' : url.replace(/^https?:\/\//, '').slice(0, 42)) : '准备打开';
    };
    webview.addEventListener('did-start-loading', () => {
      if (loading) loading.hidden = false;
      if (status) status.textContent = '正在打开…';
    });
    webview.addEventListener('did-stop-loading', () => {
      if (loading) loading.hidden = true;
      updateStatus();
    });
    webview.addEventListener('did-navigate', () => {
      if (loading) loading.hidden = true;
      updateStatus();
    });
    webview.addEventListener('did-navigate-in-page', updateStatus);
    webview.addEventListener('dom-ready', () => {
      if (loading) loading.hidden = true;
      updateStatus();
    });
    webview.addEventListener('did-frame-finish-load', () => {
      if (loading) loading.hidden = true;
      updateStatus();
    });
    window.setTimeout(() => { if (loading) loading.hidden = true; }, 2600);
    webview.addEventListener('did-fail-load', (event) => {
      if (loading) loading.hidden = true;
      if (status) status.textContent = event.errorDescription || '网页打开失败';
    });
    const currentUrl = webview.getURL?.() || '';
    if (currentUrl) {
      if (loading) loading.hidden = true;
      if (status) status.textContent = currentUrl.includes('cybertamin.xin') ? '英语网' : currentUrl.slice(0, 48);
    }
  }

  function bindEnglishWebControls() {
    const webview = $('#englishWebview');
    const home = $('#englishWebHome');
    if (home) home.addEventListener('click', () => webview?.loadURL('https://cybertamin.xin/lang/en/').catch(() => {}));
    const back = $('#englishWebBack');
    if (back) back.addEventListener('click', () => webview?.canGoBack?.() && webview.goBack());
    const forward = $('#englishWebForward');
    if (forward) forward.addEventListener('click', () => webview?.canGoForward?.() && webview.goForward());
    const reload = $('#englishWebReload');
    if (reload) reload.addEventListener('click', () => webview?.reload?.());
    const external = $('#englishWebExternal');
    if (external) external.addEventListener('click', () => api.openExternal(webview?.getURL?.() || 'https://cybertamin.xin/lang/en/'));
  }

  /* ---------------- 时事政治 ---------------- */

  function politicsSubject() {
    return DATA.catalog.find((subject) => subject.id === 'politics');
  }

  function politicsChapterName(chapter) {
    return typeof chapter === 'string' ? chapter : String(chapter && chapter.name || '');
  }

  function politicsAllChapters() {
    const subject = politicsSubject();
    return subject ? subject.books.flatMap((book) => book.chapters.map((chapter) => ({ book, chapter: politicsChapterName(chapter) }))) : [];
  }

  function politicsChapterOptions(bookId) {
    const subject = politicsSubject();
    const book = subject && subject.books.find((entry) => entry.id === bookId);
    const chapters = book ? book.chapters.map(politicsChapterName).filter(Boolean) : [];
    return [`<option value="">全部章节</option>`, ...chapters.map((chapter) => `<option value="${attr(chapter)}"${state.politics.chapter === chapter ? ' selected' : ''}>${esc(chapter)}</option>`)].join('');
  }

  function renderPoliticsFilters() {
    const subject = politicsSubject();
    const bookSelect = $('#politicsBookSelect');
    const chapterSelect = $('#politicsChapterSelect');
    if (!subject || !bookSelect || !chapterSelect) return;
    bookSelect.innerHTML = `<option value="">全部高中政治课本</option>${subject.books.map((book) => `<option value="${attr(book.id)}"${state.politics.bookId === book.id ? ' selected' : ''}>${esc(book.name)}${book.subtitle ? ` · ${esc(book.subtitle)}` : ''}</option>`).join('')}`;
    chapterSelect.innerHTML = state.politics.bookId
      ? politicsChapterOptions(state.politics.bookId)
      : '<option value="">全部章节</option>';
    chapterSelect.disabled = !state.politics.bookId;
    const days = $('#politicsDays');
    if (days) days.value = String(state.politics.days);
  }

  function formatNewsDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function renderPoliticsResults() {
    const container = $('#politicsResults');
    const count = $('#politicsResultCount');
    const warning = $('#politicsWarning');
    if (count) count.textContent = `${state.politics.items.length} 条`;
    if (warning) warning.textContent = state.politics.warning || '';
    if (!container) return;
    if (!state.politics.items.length) {
      container.innerHTML = `<div class="politics-empty"><span>${icon('news')}</span><strong>${state.politics.loading ? '正在抓取权威新闻…' : '等待查询'}</strong><p>${state.politics.loading ? 'DeepSeek 正在按章节筛选，请稍候。' : '点击「AI 搜索并匹配章节」获取最近时事新闻。'}</p></div>`;
      return;
    }
    container.innerHTML = state.politics.items.map((item) => `<article class="politics-news-card">
      <div class="politics-news-meta"><span class="politics-source">${esc(item.source || '权威媒体')}</span><span>${esc(formatNewsDate(item.publishedAt))}</span><span class="politics-chapter-tag">${esc(item.chapter || '综合')}</span></div>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.summary || item.description || '')}</p>
      ${item.examPoint ? `<div class="politics-exam-point"><span>命题角度</span>${esc(item.examPoint)}</div>` : ''}
      <button type="button" class="politics-link" data-politics-link="${attr(item.link)}">前往新闻 ${icon('external')}</button>
    </article>`).join('');
  }

  function renderPoliticsDanmaku() {
    const bar = $('#politicsDanmaku');
    const track = $('#politicsDanmakuTrack');
    if (!bar || !track) return;
    const settings = danmakuSettings();
    if (!settings.enabled || !state.politics.items.length) {
      bar.hidden = true;
      track.innerHTML = '';
      return;
    }
    bar.hidden = false;
    bar.style.setProperty('--danmaku-font-size', `${settings.fontSize}px`);
    const duration = Math.max(22, 86 - settings.speed * 0.6);
    track.style.animationDuration = `${duration}s`;
    const titles = state.politics.items.slice(0, 12).map((item) => `<span>${esc(item.chapter || '综合')} · ${esc(item.title)}</span>`).join('');
    track.innerHTML = `${titles}${titles}`;
  }

  function renderPolitics() {
    renderPoliticsFilters();
    const status = $('#politicsStatus');
    if (status && !state.politics.loading) {
      const range = state.politics.rangeFrom && state.politics.rangeTo
        ? `查询范围：${formatNewsDate(state.politics.rangeFrom)} 至 ${formatNewsDate(state.politics.rangeTo)}`
        : '选择课本和章节后开始查询；新闻来自权威媒体 RSS。';
      status.innerHTML = `<span></span>${state.politics.items.length ? `已获取 ${state.politics.items.length} 条新闻${state.politics.aiUsed ? ' · DeepSeek 已匹配章节' : ' · 关键词匹配'} · ${range}` : range}`;
    }
    renderPoliticsResults();
    renderPoliticsDanmaku();
  }

  async function searchPolitics() {
    if (state.politics.loading) return;
    const bookId = $('#politicsBookSelect')?.value || '';
    const chapter = $('#politicsChapterSelect')?.value || '';
    const days = Math.max(1, Math.min(180, Number($('#politicsDays')?.value) || 7));
    const subject = politicsSubject();
    const book = subject?.books.find((entry) => entry.id === bookId);
    let chapters = [];
    if (book && chapter) chapters = [chapter];
    else if (book) chapters = book.chapters.map(politicsChapterName).filter(Boolean);
    else chapters = subject ? subject.books.flatMap((entry) => entry.chapters.map(politicsChapterName)).filter(Boolean) : [];
    state.politics.bookId = bookId;
    state.politics.chapter = chapter;
    state.politics.days = days;
    state.politics.loading = true;
    state.politics.items = [];
    state.politics.warning = '';
    state.politics.rangeFrom = '';
    state.politics.rangeTo = '';
    renderPolitics();
    const button = $('#politicsSearchButton');
    if (button) button.disabled = true;
    const status = $('#politicsStatus');
    if (status) status.innerHTML = '<span class="spinner"></span>正在抓取权威媒体新闻并调用 DeepSeek 匹配章节…';
    try {
      const ai = aiSettings();
      const result = await api.searchPolitics({
        days,
        chapters,
        model: ai.model,
        reasoning: ai.reasoning
      });
      if (!result || !result.ok) {
        state.politics.warning = (result && result.error) || '查询失败';
        showToast(state.politics.warning, { type: 'error', duration: 6000 });
        return;
      }
      const rangeFrom = Date.parse(result.rangeFrom || '') || (Date.now() - days * 86400000);
      const rangeTo = Date.parse(result.rangeTo || '') || Date.now();
      state.politics.items = (Array.isArray(result.items) ? result.items : []).filter((item) => {
        const time = new Date(item && item.publishedAt).getTime();
        return Number.isFinite(time) && time >= rangeFrom && time <= rangeTo + 5 * 60 * 1000;
      });
      state.politics.aiUsed = Boolean(result.aiUsed);
      state.politics.warning = result.warning || '';
      state.politics.rangeFrom = new Date(rangeFrom).toISOString();
      state.politics.rangeTo = new Date(rangeTo).toISOString();
      renderPolitics();
      if (state.politics.items.length) showToast(`已获取 ${state.politics.items.length} 条时事新闻。`, { type: 'success' });
    } finally {
      state.politics.loading = false;
      if (button) button.disabled = false;
      renderPolitics();
    }
  }

  /* ---------------- 通用设置 ---------------- */


  function setAiStatus(text, tone) {
    const node = $('#aiKeyStatus');
    if (!node) return;
    node.className = `ai-key-status${tone ? ` is-${tone}` : ''}`;
    node.innerHTML = `<span></span>${esc(text)}`;
  }

  async function renderAi() {
    if (!api.ai) {
      setAiStatus('当前版本不支持 AI 解答。', 'error');
      return;
    }
    try {
      const result = await api.ai.status();
      state.aiKeySaved = Boolean(result && result.hasKey);
      setAiStatus(state.aiKeySaved ? 'API Key 已保存（加密存储）' : '尚未填写 DeepSeek API Key', state.aiKeySaved ? 'ok' : 'warn');
    } catch (error) {
      setAiStatus('读取 API Key 状态失败', 'error');
    }
    const ai = aiSettings();
    const model = $('#aiModel');
    const reasoning = $('#aiReasoning');
    if (model) model.value = ai.model;
    if (reasoning) reasoning.value = ai.reasoning;
    const fileName = $('#aiFileName');
    const removeFile = $('#aiRemoveFile');
    if (fileName) fileName.textContent = state.aiFile ? `${state.aiFile.name} · 已附加` : '未选择附件（支持 PDF / Word / Excel / TXT）';
    if (removeFile) removeFile.hidden = !state.aiFile;
    const answer = $('#aiAnswer');
    if (answer && state.aiAnswer) {
      answer.textContent = state.aiAnswer;
      const copy = $('#aiCopyAnswer');
      if (copy) copy.hidden = false;
    }
    setAiTab(state.aiTab);
  }

  function currentAiRequest(question) {
    const ai = aiSettings();
    return {
      question,
      model: $('#aiModel')?.value || ai.model,
      reasoning: $('#aiReasoning')?.value || ai.reasoning
    };
  }

  async function aiRequest(question) {
    const request = currentAiRequest(question);
    state.settings.ai = normalizeAiSettings({ model: request.model, reasoning: request.reasoning });
    persistLibrary();
    return api.ai.ask(request);
  }

  async function attachAiFile() {
    if (!api.ai?.readFile) return;
    const result = await api.ai.readFile();
    if (!result || result.canceled) return;
    if (!result.ok) {
      showToast(result.error || '读取文件失败', { type: 'error' });
      return;
    }
    state.aiFile = { name: result.name, text: result.text, truncated: result.truncated };
    renderAi();
    showToast(`已附加 ${result.name}。`, { type: 'success' });
  }

  function removeAiFile() {
    state.aiFile = null;
    renderAi();
  }

  function setAiTab(tab) {
    state.aiTab = tab || 'ask';
    $$('[data-ai-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.aiTab === state.aiTab));
    $$('[data-ai-panel]').forEach((panel) => { panel.hidden = panel.dataset.aiPanel !== state.aiTab; });
  }

  async function translateAi() {
    const input = $('#aiTranslateInput');
    const text = input ? input.value.trim() : '';
    if (!text) {
      showToast('请输入要翻译的内容。', { type: 'warn' });
      return;
    }
    const target = $('#aiTranslateTarget')?.value || '英文';
    const button = $('#aiTranslateButton');
    const result = $('#aiTranslateResult');
    if (button) button.disabled = true;
    if (result) result.innerHTML = '<div class="ai-thinking"><span></span><span></span><span></span>正在翻译…</div>';
    try {
      const response = await aiRequest(`请把下面的内容翻译成${target}。只输出译文，不要解释：\n\n${text}`);
      if (!response || !response.ok) {
        if (result) result.innerHTML = `<div class="ai-error">${icon('alert')}<strong>翻译失败</strong><p>${esc((response && response.error) || '未知错误')}</p></div>`;
        return;
      }
      if (result) result.textContent = response.answer;
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function pickOcrImage() {
    if (!api.ai?.ocrImage) return;
    const result = await api.ai.ocrImage();
    if (!result || result.canceled) return;
    if (!result.ok) {
      showToast(result.error || '图片识别失败', { type: 'error' });
      return;
    }
    state.aiOcr = { name: result.name, text: result.text, imagePath: result.imagePath };
    state.aiOcrCleanText = '';
    const name = $('#aiOcrFileName');
    if (name) name.textContent = `${result.name} · 已识别`;
    const run = $('#aiOcrRun');
    if (run) run.disabled = false;
    const box = $('#aiOcrResult');
    if (box) box.textContent = result.text;
    const cleanup = $('#aiOcrCleanup');
    if (cleanup) cleanup.hidden = false;
    const copy = $('#aiOcrCopy');
    if (copy) copy.hidden = false;
    if (state.aiKeySaved) cleanupOcrText();
  }

  async function cleanupOcrText() {
    if (!state.aiOcr) return;
    if (!state.aiOcrCleanText) {
      const button = $('#aiOcrCleanup');
      if (button) button.disabled = true;
      try {
        const response = await aiRequest(`请整理下面这张图片识别出的文字。修正明显的 OCR 错字、补齐段落和标点，不要添加原文没有的内容。只输出整理后的文字：\n\n${state.aiOcr.text}`);
        if (!response || !response.ok) {
          showToast((response && response.error) || 'AI 整理失败', { type: 'error' });
          return;
        }
        state.aiOcrCleanText = response.answer;
        const box = $('#aiOcrResult');
        if (box) box.textContent = response.answer;
      } finally {
        if (button) button.disabled = false;
      }
    }
  }

  async function copyOcrText() {
    const text = state.aiOcrCleanText || (state.aiOcr && state.aiOcr.text) || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('识别文字已复制。', { type: 'success' });
    } catch (error) {
      showToast('复制失败，请手动选择文本。', { type: 'warn' });
    }
  }

  async function saveSettingsKey() {
    const input = $('#settingsAiKey');
    if (!input || !api.ai) return;
    const key = input.value.trim();
    if (!key) {
      showToast('请输入 DeepSeek API Key。', { type: 'warn' });
      return;
    }
    const result = await api.ai.saveKey(key);
    if (!result || !result.ok) {
      showToast((result && result.error) || '保存失败', { type: 'error' });
      return;
    }
    input.value = '';
    state.aiKeySaved = true;
    renderSettings();
    showToast('API Key 已加密保存，所有 AI 功能会使用它。', { type: 'success' });
  }

  async function clearSettingsKey() {
    if (!api.ai) return;
    await api.ai.clearKey();
    state.aiKeySaved = false;
    renderSettings();
    showToast('已清除 API Key。', { type: 'success' });
  }

  function renderSettings() {
    const ai = aiSettings();
    const danmaku = danmakuSettings();
    const model = $('#settingsAiModel');
    const reasoning = $('#settingsAiReasoning');
    if (model) model.value = ai.model;
    if (reasoning) reasoning.value = ai.reasoning;
    const enabled = $('#settingsDanmakuEnabled');
    if (enabled) enabled.checked = danmaku.enabled;
    const speed = $('#settingsDanmakuSpeed');
    const speedValue = $('#settingsDanmakuSpeedValue');
    if (speed) speed.value = String(danmaku.speed);
    if (speedValue) speedValue.textContent = String(danmaku.speed);
    const font = $('#settingsDanmakuFont');
    const fontValue = $('#settingsDanmakuFontValue');
    if (font) font.value = String(danmaku.fontSize);
    if (fontValue) fontValue.textContent = String(danmaku.fontSize);
    const status = $('#settingsKeyStatus');
    if (status) {
      if (!api.ai) status.textContent = '当前版本不支持 AI';
      else api.ai.status().then((result) => {
        state.aiKeySaved = Boolean(result && result.hasKey);
        status.textContent = state.aiKeySaved ? '已保存（加密）' : '未设置';
      }).catch(() => { status.textContent = '读取失败'; });
    }
    const featureGrid = $('#settingsFeatureGrid');
    if (featureGrid) {
      const features = featureSettings();
      featureGrid.innerHTML = FEATURE_PAGES.map((item) => `<label class="settings-feature-item"><input type="checkbox" data-feature-setting="${item.key}"${features[item.key] !== false ? ' checked' : ''}><span>${esc(item.label)}</span></label>`).join('');
    }
    const widget = widgetSettings();
    const widgetEnabled = $('#settingsWidgetEnabled');
    if (widgetEnabled) widgetEnabled.checked = widget.enabled;
    const widgetSize = $('#settingsWidgetSize');
    if (widgetSize) widgetSize.value = String(widget.size);
    const widgetSizeValue = $('#settingsWidgetSizeValue');
    if (widgetSizeValue) widgetSizeValue.textContent = String(widget.size);
    $$('[data-widget-slot]').forEach((select, index) => {
      select.innerHTML = `<option value="">不显示</option>` + FEATURE_PAGES.map((item) => `<option value="${item.key}"${widget.items[index]?.page === item.key ? ' selected' : ''}>${esc(item.label)}</option>`).join('');
      select.value = widget.items[index]?.page || '';
    });
  }

  async function saveSettings() {
    const model = $('#settingsAiModel');
    const reasoning = $('#settingsAiReasoning');
    state.settings.ai = normalizeAiSettings({ model: model?.value, reasoning: reasoning?.value });
    state.settings.danmaku = normalizeDanmakuSettings({
      enabled: $('#settingsDanmakuEnabled')?.checked,
      speed: Number($('#settingsDanmakuSpeed')?.value),
      fontSize: Number($('#settingsDanmakuFont')?.value)
    });
    const features = {};
    $$('[data-feature-setting]').forEach((input) => { features[input.dataset.featureSetting] = input.checked; });
    state.settings.features = normalizeFeatureSettings(features);
    const widgetItems = $$('[data-widget-slot]')
      .filter((select) => select.value)
      .map((select) => ({
        page: select.value,
        label: pageLabel(select.value)
      }));
    state.settings.widget = normalizeWidgetSettings({
      enabled: $('#settingsWidgetEnabled')?.checked !== false,
      items: widgetItems,
      size: Number($('#settingsWidgetSize')?.value) || 260
    });
    await persistLibrary();
    applyFeatureVisibility();
    applyWidgetSettings();
    showToast('通用设置已保存。', { type: 'success' });
  }

  async function saveAiKeyFromForm(showMessage = true) {
    const input = $('#aiKeyInput');
    if (!api.ai || !input) return false;
    const key = input.value.trim();
    if (!key) {
      if (showMessage) showToast('请先填写 DeepSeek API Key。', { type: 'warn' });
      return false;
    }
    const result = await api.ai.saveKey(key);
    if (!result || !result.ok) {
      showToast((result && result.error) || '保存 API Key 失败', { type: 'error' });
      return false;
    }
    input.value = '';
    state.aiKeySaved = true;
    setAiStatus('API Key 已保存（加密存储）', 'ok');
    if (showMessage) showToast('DeepSeek API Key 已加密保存。', { type: 'success' });
    return true;
  }

  async function askAi() {
    if (state.aiAsking) return;
    const input = $('#aiQuestion');
    const question = input ? input.value.trim() : '';
    if (!question) {
      showToast('请先输入问题。', { type: 'warn' });
      return;
    }
    if (!state.aiKeySaved) {
      const saved = await saveAiKeyFromForm(false);
      if (!saved) {
        showToast('请先填写并保存 DeepSeek API Key。', { type: 'warn' });
        $('#aiKeyInput')?.focus();
        return;
      }
    }
    state.aiAsking = true;
    const button = $('#aiAskButton');
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="spinner"></span>AI 正在思考…`;
    }
    const answer = $('#aiAnswer');
    if (answer) answer.innerHTML = '<div class="ai-thinking"><span></span><span></span><span></span>正在请求 DeepSeek…</div>';
    const copy = $('#aiCopyAnswer');
    if (copy) copy.hidden = true;
    try {
      const attachment = state.aiFile
        ? `\n\n【附件：${state.aiFile.name}】\n${state.aiFile.text}${state.aiFile.truncated ? '\n（附件内容过长，已截断）' : ''}`
        : '';
      const result = await aiRequest(`${question}${attachment}`);
      if (!result || !result.ok) {
        state.aiAnswer = '';
        if (answer) answer.innerHTML = `<div class="ai-error">${icon('alert')}<strong>回答失败</strong><p>${esc((result && result.error) || '未知错误')}</p></div>`;
        return;
      }
      state.aiAnswer = result.answer;
      if (answer) answer.textContent = result.answer;
      if (copy) copy.hidden = false;
    } catch (error) {
      if (answer) answer.innerHTML = `<div class="ai-error">${icon('alert')}<strong>回答失败</strong><p>${esc(error.message)}</p></div>`;
    } finally {
      state.aiAsking = false;
      if (button) {
        button.disabled = false;
        button.innerHTML = `${icon('sparkles')}发送给 AI`;
      }
    }
  }

  async function clearAiKey() {
    if (!api.ai) return;
    await api.ai.clearKey();
    state.aiKeySaved = false;
    setAiStatus('尚未填写 DeepSeek API Key', 'warn');
    showToast('已清除本机保存的 API Key。', { type: 'success' });
  }

  async function copyAiAnswer() {
    if (!state.aiAnswer) return;
    try {
      await navigator.clipboard.writeText(state.aiAnswer);
      showToast('回答已复制。', { type: 'success' });
    } catch (error) {
      showToast('复制失败，请手动选择文本。', { type: 'warn' });
    }
  }

  /* ---------------- 单词天天练 ---------------- */

  function shuffleList(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeWordQuestions(count) {
    const pool = WORDS.filter((word) => word && word.w && word.m);
    const picked = shuffleList(pool).slice(0, Math.min(count, pool.length));
    return picked.map((word) => {
      const direction = Math.random() < 0.5 ? 'en-zh' : 'zh-en';
      const correct = direction === 'en-zh' ? word.m : word.w;
      const options = [correct];
      const candidates = shuffleList(pool);
      for (const candidate of candidates) {
        const option = direction === 'en-zh' ? candidate.m : candidate.w;
        if (!option || options.includes(option)) continue;
        options.push(option);
        if (options.length >= 4) break;
      }
      return {
        direction,
        prompt: direction === 'en-zh' ? word.w : word.m,
        correct,
        options: shuffleList(options)
      };
    });
  }

  function wordGameDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function renderWordRanking() {
    const container = $('#wordGameRanking');
    const countNode = $('#wordGameRankCount');
    if (!container) return;
    const rows = [...state.wordGameScores].sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (a.duration !== b.duration) return a.duration - b.duration;
      return String(b.date).localeCompare(String(a.date));
    });
    if (countNode) countNode.textContent = `${rows.length} 人`;
    container.innerHTML = rows.length
      ? `<div class="wordgame-rank-head"><span>名次</span><span>昵称</span><span>正确</span><span>用时</span><span>日期</span></div>${rows.slice(0, 20).map((row, index) => `<div class="wordgame-rank-row${index < 3 ? ` top-${index + 1}` : ''}"><span>${index + 1}</span><strong>${esc(row.nickname)}</strong><span>${row.correct}/${row.total}</span><span>${wordGameDuration(row.duration)}</span><small>${esc(row.date)}</small></div>`).join('')}`
      : `<div class="wordgame-rank-empty">${icon('trophy')}<p>还没有通关记录<br>完成一轮挑战后就会出现在这里</p></div>`;
  }

  function renderWordGame() {
    const start = $('#wordGameStart');
    const play = $('#wordGamePlay');
    const result = $('#wordGameResult');
    if (!start || !play || !result) return;
    const nicknameInput = $('#wordGameNickname');
    if (nicknameInput && !nicknameInput.value) {
      nicknameInput.value = localStorage.getItem('zzbz-wordgame-nickname') || '';
    }
    const game = state.wordGame;
    start.hidden = Boolean(game);
    play.hidden = !game || game.finished;
    result.hidden = !game || !game.finished;
    renderWordRanking();
    if (!game) return;
    if (game.finished) {
      const data = game.result || { correct: 0, total: game.total, duration: 0 };
      const score = $('#wordGameResultScore');
      const accuracy = $('#wordGameResultAccuracy');
      const time = $('#wordGameResultTime');
      const title = $('#wordGameResultTitle');
      if (score) score.textContent = String(data.correct);
      if (accuracy) accuracy.textContent = `${Math.round((data.correct / Math.max(1, data.total)) * 100)}%`;
      if (time) time.textContent = wordGameDuration(data.duration);
      if (title) title.textContent = data.isBest ? '刷新了你的最好成绩！' : '本轮完成';
      return;
    }
    const question = game.questions[game.index];
    if (!question) return;
    const progress = $('#wordGameProgress');
    const score = $('#wordGameScore');
    const bar = $('#wordGameProgressBar');
    const direction = $('#wordGameDirection');
    const prompt = $('#wordGamePrompt');
    const feedback = $('#wordGameFeedback');
    const next = $('#wordGameNext');
    if (progress) progress.textContent = `第 ${game.index + 1} / ${game.total} 题`;
    if (score) score.textContent = `正确 ${game.correct}`;
    if (bar) bar.style.width = `${((game.index + (game.answered ? 1 : 0)) / game.total) * 100}%`;
    if (direction) direction.textContent = question.direction === 'en-zh' ? '英译汉' : '汉译英';
    if (prompt) prompt.textContent = question.prompt;
    const options = $('#wordGameOptions');
    if (options) {
      options.innerHTML = question.options.map((option, index) => {
        let className = 'wordgame-option';
        if (game.answered) {
          if (option === question.correct) className += ' is-correct';
          else if (option === game.selected) className += ' is-wrong';
        }
        return `<button type="button" class="${className}" data-word-option="${attr(option)}"><span>${String.fromCharCode(65 + index)}</span>${esc(option)}</button>`;
      }).join('');
    }
    if (feedback) {
      feedback.hidden = !game.answered;
      if (game.answered) {
        const right = game.selected === question.correct;
        feedback.className = `wordgame-feedback ${right ? 'is-right' : 'is-wrong'}`;
        feedback.innerHTML = right
          ? `${icon('check')}回答正确`
          : `${icon('close')}回答错误，正确答案是「${esc(question.correct)}」`;
      }
    }
    if (next) {
      next.hidden = !game.answered;
      next.textContent = game.index >= game.total - 1 ? '查看本轮成绩' : '下一题';
    }
  }

  function startWordGame() {
    const nicknameInput = $('#wordGameNickname');
    const countSelect = $('#wordGameCount');
    const nickname = nicknameInput ? nicknameInput.value.trim().slice(0, 24) : '';
    if (!nickname) {
      showToast('请先输入昵称。', { type: 'warn' });
      nicknameInput?.focus();
      return;
    }
    if (WORDS.length < 4) {
      showToast('词库数据加载失败。', { type: 'error' });
      return;
    }
    const total = Math.max(5, Math.min(100, Number(countSelect?.value) || 10));
    localStorage.setItem('zzbz-wordgame-nickname', nickname);
    state.wordGame = {
      nickname,
      total,
      questions: makeWordQuestions(total),
      index: 0,
      correct: 0,
      selected: '',
      answered: false,
      startedAt: Date.now(),
      finished: false,
      result: null
    };
    renderWordGame();
    $('#wordGameOptions button')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function answerWordQuestion(option) {
    const game = state.wordGame;
    if (!game || game.finished || game.answered) return;
    const question = game.questions[game.index];
    if (!question) return;
    game.selected = option;
    game.answered = true;
    if (option === question.correct) game.correct += 1;
    renderWordGame();
  }

  function nextWordQuestion() {
    const game = state.wordGame;
    if (!game || game.finished || !game.answered) return;
    if (game.index >= game.total - 1) {
      finishWordGame();
      return;
    }
    game.index += 1;
    game.selected = '';
    game.answered = false;
    renderWordGame();
  }

  async function finishWordGame() {
    const game = state.wordGame;
    if (!game || game.finished) return;
    const duration = Math.max(1, Math.round((Date.now() - game.startedAt) / 1000));
    game.finished = true;
    const existing = state.wordGameScores.find((entry) => entry.nickname === game.nickname);
    const better = !existing
      || game.correct > existing.correct
      || (game.correct === existing.correct && duration < existing.duration);
    if (better) {
      const newScore = {
        nickname: game.nickname,
        total: game.total,
        correct: game.correct,
        duration,
        date: todayVoteKey()
      };
      state.wordGameScores = existing
        ? state.wordGameScores.map((entry) => entry.nickname === game.nickname ? newScore : entry)
        : [...state.wordGameScores, newScore];
    }
    game.result = { correct: game.correct, total: game.total, duration, isBest: better };
    await persistLibrary();
    renderWordGame();
  }

  function resetWordGame() {
    state.wordGame = null;
    renderWordGame();
  }

  /* ---------------- 课堂计时器 ---------------- */

  function timerText(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function renderTimer() {
    const display = $('#timerDisplay');
    if (display) display.textContent = timerText(state.timer.remaining);
    const minutes = $('#timerMinutes');
    const seconds = $('#timerSeconds');
    if (minutes && document.activeElement !== minutes) minutes.value = String(Math.floor(state.timer.total / 60));
    if (seconds && document.activeElement !== seconds) seconds.value = String(state.timer.total % 60);
    const label = $('#timerModeLabel');
    if (label) label.textContent = state.timer.remaining <= 0 ? '时间到' : (state.timer.running ? '计时中' : '倒计时');
    const card = $('#timerCard');
    if (card) card.classList.toggle('is-finished', state.timer.remaining <= 0);
    const button = $('#timerStart');
    if (button) button.innerHTML = `${icon('clock')}${state.timer.running ? '暂停' : (state.timer.remaining <= 0 ? '重新开始' : '开始计时')}`;
  }

  function stopTimerTicker() {
    if (state.timer.interval) window.clearInterval(state.timer.interval);
    state.timer.interval = 0;
    state.timer.running = false;
  }

  function timerBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [0, 0.35, 0.7].forEach((offset) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.25);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(ctx.currentTime + offset);
        oscillator.stop(ctx.currentTime + offset + 0.3);
      });
      setTimeout(() => ctx.close().catch(() => {}), 1300);
    } catch (error) {
      /* 浏览器阻止声音时忽略 */
    }
  }

  function timerTick() {
    const remaining = Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
    state.timer.remaining = remaining;
    if (remaining <= 0) {
      stopTimerTicker();
      timerBeep();
      renderTimer();
      showToast('计时结束。', { type: 'info', duration: 3000 });
      return;
    }
    renderTimer();
  }

  function timerStartPause() {
    if (state.timer.running) {
      state.timer.remaining = Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
      stopTimerTicker();
      renderTimer();
      return;
    }
    if (state.timer.remaining <= 0) state.timer.remaining = state.timer.total;
    if (state.timer.remaining <= 0) {
      showToast('请先设置计时时间。', { type: 'warn' });
      return;
    }
    state.timer.endAt = Date.now() + state.timer.remaining * 1000;
    state.timer.running = true;
    state.timer.interval = window.setInterval(timerTick, 250);
    renderTimer();
  }

  function timerSetTotal(total) {
    stopTimerTicker();
    state.timer.total = Math.max(0, Math.min(10800, Math.floor(Number(total) || 0)));
    state.timer.remaining = state.timer.total;
    renderTimer();
  }

  function timerReset() {
    stopTimerTicker();
    state.timer.remaining = state.timer.total;
    renderTimer();
  }

  function timerReadInputs() {
    const minutes = Math.max(0, Math.min(180, Math.floor(Number($('#timerMinutes')?.value) || 0)));
    const seconds = Math.max(0, Math.min(59, Math.floor(Number($('#timerSeconds')?.value) || 0)));
    timerSetTotal(minutes * 60 + seconds);
  }

  /* ---------------- 手机扫码投屏 ---------------- */

  function resetPhoneStage() {
    state.phoneCastActive = false;
    const img = $('#phoneFrame');
    if (img) { img.hidden = true; img.removeAttribute('src'); }
    const empty = $('#phoneEmpty');
    if (empty) empty.hidden = false;
    const live = $('#phoneLiveBadge');
    if (live) live.hidden = true;
    const dot = $('#phoneLiveDot');
    if (dot) dot.classList.remove('is-live');
    const qrBox = $('#phoneQrBox');
    if (qrBox) qrBox.innerHTML = `<div class="phone-qr-placeholder">${icon('phone')}<p>点击「生成投屏码」后显示二维码</p></div>`;
    const url = $('#phoneUrl');
    if (url) url.textContent = '等待生成地址…';
    const start = $('#phoneStart');
    if (start) start.disabled = false;
    const stop = $('#phoneStop');
    if (stop) stop.disabled = true;
    const status = $('#phoneStatus');
    if (status) status.textContent = '未启动';
  }

  async function renderPhone() {
    if (!api.startPhoneCast) {
      const status = $('#phoneStatus');
      if (status) status.textContent = '当前版本不支持手机投屏';
      return;
    }
    try {
      const result = await api.phoneCastStatus();
      if (result && result.active && result.qr) {
        state.phoneCastActive = true;
        const qrBox = $('#phoneQrBox');
        if (qrBox) qrBox.innerHTML = `<img src="${attr(result.qr)}" alt="手机投屏二维码">`;
        const url = $('#phoneUrl');
        if (url) url.textContent = result.url;
        $('#phoneStart') && ($('#phoneStart').disabled = true);
        $('#phoneStop') && ($('#phoneStop').disabled = false);
        const status = $('#phoneStatus');
        if (status) status.textContent = '投屏服务已开启，等待手机扫码';
      } else {
        resetPhoneStage();
      }
    } catch (error) {
      resetPhoneStage();
    }
  }

  async function startPhoneCast() {
    if (!api.startPhoneCast) return;
    const start = $('#phoneStart');
    if (start) start.disabled = true;
    const status = $('#phoneStatus');
    if (status) status.textContent = '正在生成投屏二维码…';
    const result = await api.startPhoneCast();
    if (!result || !result.ok) {
      resetPhoneStage();
      showToast((result && result.error) || '启动手机投屏失败', { type: 'error' });
      return;
    }
    state.phoneCastActive = true;
    const qrBox = $('#phoneQrBox');
    if (qrBox) qrBox.innerHTML = `<img src="${attr(result.qr)}" alt="手机投屏二维码">`;
    const url = $('#phoneUrl');
    if (url) url.textContent = result.url || '';
    const stop = $('#phoneStop');
    if (stop) stop.disabled = false;
    if (status) status.textContent = `投屏地址已生成（端口 ${result.port}），等待手机扫码`;
    const empty = $('#phoneEmpty');
    if (empty) empty.hidden = false;
    const live = $('#phoneLiveBadge');
    if (live) live.hidden = true;
    showToast('手机投屏码已生成，请用手机扫描右侧二维码。', { type: 'success', duration: 4000 });
  }

  async function stopPhoneCast() {
    if (api.stopPhoneCast) await api.stopPhoneCast();
    resetPhoneStage();
    showToast('手机投屏已停止。', { type: 'success' });
  }

  function handlePhoneFrame(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return;
    const img = $('#phoneFrame');
    if (!img) return;
    img.src = dataUrl;
    img.hidden = false;
    const empty = $('#phoneEmpty');
    if (empty) empty.hidden = true;
    const live = $('#phoneLiveBadge');
    if (live) live.hidden = false;
    const dot = $('#phoneLiveDot');
    if (dot) dot.classList.add('is-live');
    const status = $('#phoneStatus');
    if (status) status.textContent = '手机画面已接入';
    state.phoneCastActive = true;
  }

  function phoneFullscreen() {
    const stage = $('#phoneStage');
    if (stage && !document.fullscreenElement) stage.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  /* ---------------- 管理员密码 ---------------- */

  function openAdminPassword(options) {
    state.modal = 'admin-password';
    state.adminPasswordCallback = options.onSuccess || null;
    ui.modalLayer.innerHTML = `<div class="modal modal-small" role="dialog" aria-modal="true" aria-labelledby="adminPasswordTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon('lock')}</span>
        <div class="modal-heading"><h2 id="adminPasswordTitle">${esc(options.title || '管理员验证')}</h2><p>${esc(options.message || '请输入管理员密码后继续。')}</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="admin-password-form">
          <input id="adminPasswordInput" type="password" inputmode="numeric" maxlength="20" placeholder="请输入管理员密码" autocomplete="off">
        </div>
      </div>
      <footer class="modal-footer">
        <span class="modal-footer-note">${icon('shield')}仅用于本机后台设置</span>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-light" data-close-modal>取消</button>
          <button type="button" class="btn btn-primary" id="adminPasswordConfirm">确认</button>
        </div>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
    const input = $('#adminPasswordInput');
    input?.focus();
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmAdminPassword();
      }
    });
  }

  function confirmAdminPassword() {
    const input = $('#adminPasswordInput');
    if (!input) return;
    if (input.value !== ADMIN_PASSWORD) {
      input.value = '';
      input.focus();
      showToast('管理员密码不正确。', { type: 'error' });
      return;
    }
    const callback = state.adminPasswordCallback;
    state.adminPasswordCallback = null;
    closeModal();
    if (typeof callback === 'function') callback();
  }

  /* ---------------- 科目投票 ---------------- */

  function todayVoteData() {
    const key = todayVoteKey();
    if (!state.subjectVotes[key] || typeof state.subjectVotes[key] !== 'object') state.subjectVotes[key] = {};
    return state.subjectVotes[key];
  }

  function renderVote() {
    const key = todayVoteKey();
    const data = state.subjectVotes[key] || {};
    const total = Object.values(data).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const dateNode = $('#voteDateText');
    if (dateNode) {
      const date = new Date(`${key}T00:00:00`);
      dateNode.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
    const totalNode = $('#voteTotalBadge');
    if (totalNode) totalNode.textContent = `${total} 票`;
    const grid = $('#subjectVoteGrid');
    if (!grid) return;
    grid.innerHTML = VOTE_SUBJECTS.map((subject) => `<button type="button" class="subject-vote-card" data-vote-subject="${subject.id}" style="--subject-color:${subject.color}">
      <span class="subject-vote-mark">${esc(subject.short)}</span>
      <strong>${esc(subject.name)}</strong>
      <span>投一票</span>
    </button>`).join('');
  }

  async function voteForSubject(subjectId) {
    const subject = VOTE_BY_ID[subjectId];
    if (!subject) return;
    const data = todayVoteData();
    data[subjectId] = Math.min(99999, (Number(data[subjectId]) || 0) + 1);
    renderVote();
    await persistLibrary();
    showToast(`已为「${subject.name}」投出一票。`, { type: 'success', duration: 1800 });
  }

  function showVoteResults() {
    openAdminPassword({
      title: '查看投票结果',
      message: '请输入管理员密码查看今日各学科票数。',
      onSuccess: openVoteResultsModal
    });
  }

  function openVoteResultsModal() {
    const key = todayVoteKey();
    const data = state.subjectVotes[key] || {};
    const rows = VOTE_SUBJECTS.map((subject) => ({
      subject,
      votes: Number(data[subject.id]) || 0
    })).sort((a, b) => b.votes - a.votes);
    const total = rows.reduce((sum, row) => sum + row.votes, 0);
    const max = Math.max(1, ...rows.map((row) => row.votes));
    state.modal = 'vote-results';
    ui.modalLayer.innerHTML = `<div class="modal" style="width:560px" role="dialog" aria-modal="true" aria-labelledby="voteResultsTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon('vote')}</span>
        <div class="modal-heading"><h2 id="voteResultsTitle">今日投票结果</h2><p>${esc(key)} · 按学科票数排序</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="vote-result-summary"><span>今日共投出 ${total} 票</span><span>仅管理员可见</span></div>
        <div class="vote-result-list">${rows.map((row) => `<div class="vote-result-row">
          <span class="vote-result-name">${esc(row.subject.name)}</span>
          <div class="vote-result-track"><div class="vote-result-bar" style="width:${row.votes ? Math.max(3, (row.votes / max) * 100) : 0}%;--subject-color:${row.subject.color}"></div></div>
          <strong>${row.votes}</strong>
        </div>`).join('')}</div>
      </div>
      <footer class="modal-footer">
        <span class="modal-footer-note">${icon('shield')}投票结果仅保存在本机</span>
        <button type="button" class="btn btn-light" data-close-modal>关闭</button>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
  }

  /* ---------------- 随机点名 ---------------- */

  function renderStudentRoster() {
    const roster = $('#studentRoster');
    const total = state.students.length;
    const picked = state.students.reduce((sum, student) => sum + (Number(student.pickedCount) || 0), 0);
    const totalNode = $('#studentTotalCount');
    const pickedNode = $('#studentPickedTotal');
    const countBadge = $('#studentCountBadge');
    if (totalNode) totalNode.textContent = String(total);
    if (pickedNode) pickedNode.textContent = String(picked);
    if (countBadge) countBadge.textContent = `${total} 人`;
    if (!roster) return;
    roster.innerHTML = total
      ? state.students.map((student) => `<span class="student-chip" title="已抽取 ${student.pickedCount} 次">${esc(student.name)}${student.pickedCount ? `<small>${student.pickedCount}</small>` : ''}</span>`).join('')
      : '<div class="question-empty" style="grid-column:1/-1;min-height:110px;padding:16px"><strong>还没有导入名单</strong><p>支持 Excel/CSV，第一列为姓名。</p></div>';
  }

  function renderStudents() {
    const name = $('#studentPickName');
    if (name) {
      name.textContent = state.lastPickedStudent || '准备抽取';
      name.classList.toggle('is-spinning', state.studentSpinning);
    }
    const hint = $('#studentPickHint');
    if (hint) hint.textContent = state.students.length ? `名单中共 ${state.students.length} 人，点击下方按钮开始` : '导入名单后点击下方按钮开始';
    renderStudentRoster();
  }

  async function importStudentList() {
    if (!api.importStudents) {
      showToast('当前版本不支持导入名单。', { type: 'warn' });
      return;
    }
    const result = await api.importStudents();
    if (!result || result.canceled) return;
    if (!result.ok) {
      showToast(result.error || '导入名单失败', { type: 'error' });
      return;
    }
    const existing = new Map(state.students.map((student) => [student.name, student]));
    const imported = result.students || [];
    imported.forEach((student) => {
      const old = existing.get(student.name);
      if (old) {
        old.weight = old.weight || student.weight || 1;
      } else {
        existing.set(student.name, {
          id: uniqueId('student'),
          name: student.name,
          weight: Math.max(1, Math.min(20, Number(student.weight) || 1)),
          pickedCount: 0,
          lastPickedAt: ''
        });
      }
    });
    state.students = Array.from(existing.values());
    await persistLibrary();
    renderStudents();
    showToast(`已导入 ${imported.length} 名学生，当前名单共 ${state.students.length} 人。`, { type: 'success', title: '名单已更新', duration: 5000 });
  }

  function weightedStudentPick(pool) {
    const source = pool || state.students;
    if (!source.length) return null;
    const totalWeight = source.reduce((sum, student) => sum + Math.max(1, Number(student.weight) || 1), 0);
    let ticket = Math.random() * totalWeight;
    for (const student of source) {
      ticket -= Math.max(1, Number(student.weight) || 1);
      if (ticket <= 0) return student;
    }
    return source[source.length - 1];
  }

  function pickRandomStudent() {
    if (state.studentSpinning) return;
    if (!state.students.length) {
      showToast('请先导入学生名单。', { type: 'warn' });
      importStudentList();
      return;
    }
    const count = Math.max(1, Math.min(state.students.length, Number($('#studentPickCount')?.value) || 1));
    state.studentSpinning = true;
    const nameNode = $('#studentPickName');
    const button = $('#pickStudentButton');
    if (button) button.disabled = true;
    if (nameNode) nameNode.classList.add('is-spinning');
    let ticks = 0;
    state.studentSpinTimer = window.setInterval(() => {
      const random = state.students[Math.floor(Math.random() * state.students.length)];
      if (nameNode) nameNode.textContent = random.name;
      ticks += 1;
      if (ticks >= 18) {
        window.clearInterval(state.studentSpinTimer);
        state.studentSpinTimer = 0;
        const pool = [...state.students];
        const picked = [];
        for (let index = 0; index < count && pool.length; index += 1) {
          const student = weightedStudentPick(pool);
          if (!student) break;
          picked.push(student);
          pool.splice(pool.indexOf(student), 1);
        }
        if (!picked.length) {
          state.studentSpinning = false;
          if (button) button.disabled = false;
          return;
        }
        picked.forEach((student) => {
          student.pickedCount = (Number(student.pickedCount) || 0) + 1;
          student.lastPickedAt = new Date().toISOString();
        });
        const names = picked.map((student) => student.name);
        state.lastPickedStudent = names.join('、');
        state.studentSpinning = false;
        if (nameNode) {
          nameNode.textContent = state.lastPickedStudent;
          nameNode.classList.remove('is-spinning');
        }
        if (button) button.disabled = false;
        const hint = $('#studentPickHint');
        if (hint) hint.textContent = `请 ${names.join('、')} 回答问题`;
        renderStudentRoster();
        persistLibrary();
      }
    }, 70);
  }

  function showStudentAdmin() {
    if (!state.students.length) {
      showToast('请先导入学生名单。', { type: 'warn' });
      return;
    }
    openAdminPassword({
      title: '随机点名后台设置',
      message: '请输入管理员密码调整学生选中权重。',
      onSuccess: openStudentWeightsModal
    });
  }

  function openStudentWeightsModal() {
    state.modal = 'student-weights';
    ui.modalLayer.innerHTML = `<div class="modal" style="width:620px" role="dialog" aria-modal="true" aria-labelledby="studentWeightsTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon('users')}</span>
        <div class="modal-heading"><h2 id="studentWeightsTitle">学生名单后台</h2><p>可修改姓名、调整权重，或勾选后批量/指定删除学生。</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="student-admin-toolbar"><label><input type="checkbox" id="studentSelectAll">全选</label><span>勾选学生后可批量删除；不改名也可单独删除。</span></div>
        <div class="student-weight-table">${state.students.map((student) => `<div class="student-weight-row">
          <input type="checkbox" data-student-select="${attr(student.id)}" aria-label="选择 ${attr(student.name)}">
          <input class="student-name-input" type="text" maxlength="24" value="${attr(student.name)}" data-student-name="${attr(student.id)}" aria-label="学生姓名">
          <input class="student-weight-input" type="number" min="1" max="20" value="${Math.max(1, Number(student.weight) || 1)}" data-student-weight="${attr(student.id)}" aria-label="${attr(student.name)} 的选中权重">
          <small>${student.pickedCount || 0} 次</small>
        </div>`).join('')}</div>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn btn-danger" id="deleteSelectedStudents">${icon('trash')}删除选中</button>
        <span class="modal-footer-note">${icon('shield')}权重 1—20</span>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-light" data-close-modal>取消</button>
          <button type="button" class="btn btn-primary" id="saveStudentWeights">保存修改</button>
        </div>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
  }

  async function saveStudentWeights() {
    const rows = $$('[data-student-name]');
    const names = new Set();
    for (const input of rows) {
      const name = String(input.value || '').trim().slice(0, 24);
      if (!name) {
        showToast('学生姓名不能为空。', { type: 'warn' });
        input.focus();
        return;
      }
      if (names.has(name)) {
        showToast(`学生姓名「${name}」重复，请先修改。`, { type: 'warn' });
        input.focus();
        return;
      }
      names.add(name);
    }
    rows.forEach((input) => {
      const student = state.students.find((entry) => entry.id === input.dataset.studentName);
      if (student) student.name = String(input.value || '').trim().slice(0, 24);
    });
    $$('[data-student-weight]').forEach((input) => {
      const student = state.students.find((entry) => entry.id === input.dataset.studentWeight);
      if (student) student.weight = Math.max(1, Math.min(20, Math.floor(Number(input.value) || 1)));
    });
    const ok = await persistLibrary();
    if (!ok) return;
    closeModal();
    renderStudents();
    showToast('学生姓名和权重已保存。', { type: 'success', title: '后台设置已更新' });
  }

  function deleteSelectedStudents() {
    const selected = $$('[data-student-select]:checked').map((input) => input.dataset.studentSelect);
    if (!selected.length) {
      showToast('请先勾选要删除的学生。', { type: 'warn' });
      return;
    }
    const names = state.students.filter((student) => selected.includes(student.id)).map((student) => student.name);
    openConfirm({
      title: '删除选中的学生',
      message: `将从名单中删除 ${selected.length} 名学生：${esc(names.join('、'))}。此操作不会删除课件或成绩。`,
      danger: true,
      confirmText: '确认删除',
      onConfirm: async () => {
        state.students = state.students.filter((student) => !selected.includes(student.id));
        await persistLibrary();
        closeModal();
        renderStudents();
        showToast(`已删除 ${selected.length} 名学生。`, { type: 'success' });
      }
    });
  }

  function renderAll() {
    renderChrome();
    renderLibrary();
    if (state.page === 'catalog') renderCatalog();
    if (state.page === 'types') renderTypes();
    if (state.page === 'vocab') renderVocab();
    if (state.page === 'questions') renderQuestions();
    if (state.page === 'browser') renderBrowser();
    if (state.page === 'camera') renderCamera();
    if (state.page === 'whiteboard') renderWhiteboard();
    if (state.page === 'timetable') renderTimetable();
    if (state.page === 'usb') renderUsb();
    if (state.page === 'vote') renderVote();
    if (state.page === 'students') renderStudents();
    if (state.page === 'data') renderData();
  }

  /* ---------------- 课件详情抽屉 ---------------- */

  function currentItem() {
    return state.items.find((item) => item.id === state.currentFileId) || null;
  }

  function detailBookOptions(subjectId, selectedBookId) {
    if (!subjectId) return option('', '请先选择学科', true, ' disabled');
    const subject = DATA.subjectById[subjectId];
    if (!subject) return option('', '请先选择学科', true, ' disabled');
    return option('', '请选择教材', !selectedBookId)
      + subject.books.map((book) => option(book.id, bookOptionLabel(book, false), selectedBookId === book.id)).join('');
  }

  function detailChapterOptions(bookId, selectedChapterId) {
    if (!bookId) return option('', '请先选择教材', true, ' disabled');
    const book = DATA.bookById[bookId];
    if (!book) return option('', '请先选择教材', true, ' disabled');
    return option('', '未分章节', !selectedChapterId)
      + book.chapters.map((chapter) => option(chapter.id, chapter.name, selectedChapterId === chapter.id)).join('');
  }

  function previewHtml(item) {
    const meta = fileMeta(item.ext);
    if (item.demo) {
      return `<div class="preview-placeholder" style="--file-color:${meta.color}">
        <div class="preview-doc">${esc(item.ext || 'FILE')}</div>
        <strong>示例课件</strong>
        <span>导入真实课件后，可在此预览图片、PDF、视频与音频</span>
      </div>`;
    }
    if (isMissing(item)) {
      return `<div class="preview-placeholder" style="--file-color:#b06a6a">
        ${icon('alert')}
        <strong style="margin-top:4px">原文件已移动或删除</strong>
        <span>请在电脑中检查文件位置，或移除此条记录后重新导入</span>
      </div>`;
    }
    if (!item.filePath) {
      return `<div class="preview-placeholder" style="--file-color:${meta.color}">
        <div class="preview-doc">${esc(item.ext || 'FILE')}</div>
        <strong>暂无预览</strong>
        <span>打开原文件后即可查看完整内容</span>
      </div>`;
    }
    const url = api.getPreviewUrl(item.filePath);
    const kind = meta.key;
    if (kind === 'image') {
      return `<img src="${attr(url)}" alt="${attr(stripExtension(item.name, item.ext))}" loading="lazy">`;
    }
    if (kind === 'pdf') {
      return `<iframe src="${attr(url)}#toolbar=0&navpanes=0&view=FitH" title="PDF 预览"></iframe>
        <button type="button" class="preview-overlay-button" data-detail-open>${icon('external')}用默认应用打开</button>`;
    }
    if (kind === 'video') {
      return `<video src="${attr(url)}" controls preload="metadata"></video>`;
    }
    if (kind === 'audio') {
      return `<audio src="${attr(url)}" controls preload="metadata"></audio>`;
    }
    return `<div class="preview-placeholder" style="--file-color:${meta.color}">
      <div class="preview-doc">${esc(item.ext || 'FILE')}</div>
      <strong>${esc(meta.label)}暂不支持内嵌预览</strong>
      <span>点击「打开文件」使用本机应用查看</span>
    </div>`;
  }

  function renderDrawer() {
    const item = currentItem();
    if (!item) {
      closeDrawer();
      return;
    }
    const subject = itemSubject(item);
    const book = itemBook(item);
    const chapter = itemChapter(item);
    const type = itemType(item);
    const meta = fileMeta(item.ext);
    const title = stripExtension(item.name, item.ext);
    ui.detailTitle.textContent = title;
    state.detailDraftFavorite = Boolean(item.favorite);

    const subjectOptions = option('', '请选择学科', !item.subjectId)
      + DATA.catalog.map((subjectItem) => option(subjectItem.id, subjectItem.name, item.subjectId === subjectItem.id)).join('');
    const typeOptions = DATA.courseTypes.map((typeItem) => option(typeItem.id, typeItem.name, (item.typeId || 'new') === typeItem.id)).join('');
    const tagsValue = (item.tags || []).join('，');
    const pathBlock = !item.demo && item.filePath
      ? `<div class="link-copy"><code title="${attr(item.filePath)}">${esc(item.filePath)}</code><button type="button" class="icon-button tiny" data-copy-path="${attr(item.filePath)}" title="复制路径">${icon('copy')}</button></div>`
      : '';

    ui.drawerContent.innerHTML = `
      <div class="preview-box" style="--file-color:${meta.color}">${previewHtml(item)}</div>
      <div class="detail-action-row">
        <button type="button" class="btn btn-primary" data-detail-open>${icon('external')}打开原文件</button>
        <button type="button" class="btn btn-ghost" data-detail-reveal>${icon('folder')}在文件夹中显示</button>
        <button type="button" class="btn btn-ghost" data-detail-saveas>${icon('download')}另存为</button>
      </div>
      <div class="detail-facts">
        <div class="detail-fact"><span>文件大小</span><strong>${formatSize(item.size)}</strong></div>
        <div class="detail-fact"><span>文件格式</span><strong>${esc((item.ext || '未知').toUpperCase())} · ${esc(meta.label)}</strong></div>
        <div class="detail-fact"><span>添加时间</span><strong>${formatDate(item.createdAt)}</strong></div>
        <div class="detail-fact"><span>最近打开</span><strong>${item.lastOpenedAt ? relativeTime(item.lastOpenedAt) : '尚未打开'}</strong></div>
      </div>
      ${item.demo ? `<div class="demo-detail-note">${icon('info')}这是一条示例记录，用于展示系统界面。清除示例后导入自己的课件即可正常打开、预览与定位文件。</div>` : ''}
      <div class="detail-section">
        <div class="detail-section-title"><h3>归档分类</h3><span>学科 / 教材 / 章节 / 类型</span></div>
        <div class="form-grid">
          <label class="form-field"><span>所属学科</span><select id="detailSubject">${subjectOptions}</select></label>
          <label class="form-field"><span>课程分类</span><select id="detailType">${typeOptions}</select></label>
          <label class="form-field"><span>所属教材</span><select id="detailBook">${detailBookOptions(item.subjectId, item.bookId)}</select></label>
          <label class="form-field"><span>所属章节</span><select id="detailChapter">${detailChapterOptions(item.bookId, item.chapterId)}</select></label>
          <label class="form-field full"><span>标签（使用逗号分隔）</span><input id="detailTags" type="text" maxlength="200" value="${attr(tagsValue)}" placeholder="例如：情境教学，一轮复习"></label>
          <label class="form-field full"><span>教学备注</span><textarea id="detailNote" maxlength="2000" placeholder="记录这节课的使用说明、教学反思或修改要点…">${esc(item.note || '')}</textarea></label>
        </div>
        <button type="button" class="favorite-toggle${item.favorite ? ' is-active' : ''}" id="detailFavoriteToggle">${icon('star')}<span>${item.favorite ? '已收藏此课件' : '收藏此课件'}</span><em>点击切换</em></button>
        ${pathBlock}
      </div>`;

    ui.drawerFooter.innerHTML = `<button type="button" class="btn btn-ghost drawer-delete" data-detail-delete>${icon('trash')}移除记录</button>
      <div class="modal-footer-actions">
        <button type="button" class="btn btn-light" data-detail-cancel>取消</button>
        <button type="button" class="btn btn-primary" data-detail-save>${icon('check')}保存修改</button>
      </div>`;
    ui.drawerOverlay.hidden = false;
    window.requestAnimationFrame(() => {
      const saveButton = $('[data-detail-save]');
      if (saveButton) saveButton.focus({ preventScroll: true });
    });
  }

  function openDrawer(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    state.currentFileId = id;
    state.detailDraftFavorite = Boolean(item.favorite);
    renderDrawer();
  }

  function closeDrawer() {
    ui.drawerOverlay.hidden = true;
    state.currentFileId = '';
  }

  async function openOriginal(item) {
    if (!item) return;
    if (item.demo) {
      showToast('这是示例记录，没有关联本地文件。导入真实课件后即可打开。', { type: 'warn', title: '示例课件' });
      return;
    }
    if (!item.filePath) {
      showToast('这条记录没有文件路径。', { type: 'error' });
      return;
    }
    if (isMissing(item)) {
      showToast('原文件已被移动或删除，请检查文件位置。', { type: 'error', title: '文件缺失' });
      return;
    }
    const result = await api.openFile(item.filePath);
    if (!result || !result.ok) {
      try {
        const check = await api.checkFiles([item.filePath]);
        if (check && check.ok && (!check.files[item.filePath] || !check.files[item.filePath].exists)) {
          state.missing.add(item.filePath);
          renderLibrary();
        }
      } catch (error) {
        /* 文件状态复核失败时只提示打开失败 */
      }
      showToast(result?.error || '无法打开该文件，请检查文件是否被移动。', { type: 'error', title: '打开失败' });
      return;
    }
    item.lastOpenedAt = new Date().toISOString();
    await persistLibrary({ quiet: true });
    renderLibrary();
    if (state.currentFileId === item.id) renderDrawer();
  }

  async function revealOriginal(item) {
    if (!item || item.demo) {
      showToast('这是示例记录，没有关联本地文件。', { type: 'warn' });
      return;
    }
    if (!item.filePath) {
      showToast('这条记录没有文件路径。', { type: 'error' });
      return;
    }
    const result = await api.revealFile(item.filePath);
    if (result && result.error) showToast(result.error, { type: result.ok ? 'success' : 'warn' });
  }

  async function saveAsSingle(item) {
    if (!item || item.demo) {
      showToast('这是示例记录，没有可另存的本地文件。', { type: 'warn' });
      return;
    }
    if (!item.filePath) {
      showToast('这条记录没有文件路径，无法另存。', { type: 'error' });
      return;
    }
    if (isMissing(item)) {
      showToast('原文件已被移动或删除，无法另存。', { type: 'error', title: '文件缺失' });
      return;
    }
    try {
      const result = await api.saveFileAs({ filePath: item.filePath, defaultName: item.name });
      if (!result || result.canceled) return;
      if (result.ok) {
        showToast(`已另存到：${result.filePath}`, { type: 'success', title: '另存完成', duration: 6000 });
      } else {
        showToast(result.error || '另存失败', { type: 'error', title: '另存失败' });
      }
    } catch (error) {
      showToast(error?.message || '另存失败', { type: 'error' });
    }
  }

  function batchSaveEligibleItems() {
    return getFilteredItems().filter((item) => !item.demo && item.filePath && !isMissing(item));
  }

  function batchSaveSelectionSummary() {
    const items = state.batchSaveItems;
    const selected = items.filter((item) => state.batchSaveSelected.has(item.id));
    const totalSize = selected.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
    const countNode = $('#batchSaveSelectionSummary');
    if (countNode) countNode.textContent = `已选 ${selected.length} / ${items.length} 份 · ${formatSize(totalSize)}`;
    const button = $('#batchSaveConfirmButton');
    if (button) {
      button.disabled = state.batchSaveBusy || selected.length === 0;
      const isZip = state.batchSaveMode === 'zip';
      button.innerHTML = state.batchSaveBusy
        ? `<span class="spinner"></span>${isZip ? '正在打包…' : '正在另存…'}`
        : (isZip
          ? `打包下载${selected.length ? ` ${selected.length} 份` : ''}`
          : `选择文件夹并另存${selected.length ? ` ${selected.length} 份` : ''}`);
    }
    const all = $('#batchSaveSelectAll');
    if (all) {
      all.checked = selected.length === items.length && items.length > 0;
      all.indeterminate = selected.length > 0 && selected.length < items.length;
    }
  }

  function renderBatchSaveModal() {
    const items = state.batchSaveItems;
    const isZip = state.batchSaveMode === 'zip';
    const totalSize = items.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
    const list = items.map((item) => {
      const subject = itemSubject(item);
      const book = itemBook(item);
      const chapter = itemChapter(item);
      const type = itemType(item);
      const meta = fileMeta(item.ext);
      const checked = state.batchSaveSelected.has(item.id);
      return `<label class="batch-save-item">
        <input type="checkbox" data-batch-save-id="${attr(item.id)}" ${checked ? 'checked' : ''}>
        <span class="batch-save-icon" style="--file-color:${meta.color}">${icon(meta.icon)}</span>
        <span class="batch-save-file">
          <span class="batch-save-copy">
            <strong title="${attr(stripExtension(item.name, item.ext))}">${esc(stripExtension(item.name, item.ext))}</strong>
            <small>${esc(subject ? subject.name : '未分学科')} · ${esc(book ? book.name : '未分教材')}${chapter ? ` · ${esc(chapter.name)}` : ''}</small>
          </span>
        </span>
        <span class="batch-save-side"><span>${formatSize(item.size)}</span><strong>${esc(type.name)}</strong></span>
      </label>`;
    }).join('');
    state.batchSaveBusy = false;
    const title = isZip ? '批量下载课件' : '批量另存课件';
    const subtitle = isZip
      ? '把选中的课件打包成一个 ZIP 文件，保存到本机任意位置。'
      : '把选中的课件复制到本机其他文件夹，并自动按「学科 / 教材 / 章节」整理。';
    const infoText = isZip
      ? '将生成一个 ZIP 压缩包，内部按「学科 / 教材 / 章节」建立目录，并附带《课件清单.csv》。仅显示当前筛选结果中的可下载文件。'
      : '将新建「枣庄八中课件_日期时间」目录，并在其中生成分类文件夹与《课件清单.csv》。仅显示当前筛选结果中的可另存文件。';
    const emptyText = isZip ? '当前筛选结果中没有可下载的本地文件。' : '当前筛选结果中没有可另存的本地文件。';
    const footerNote = isZip ? '打包为 ZIP 文件保存到本机，不改动原文件' : '文件复制到本机目标文件夹，不改动原文件';
    const primaryText = isZip ? `打包下载 ${items.length} 份` : `选择文件夹并另存 ${items.length} 份`;
    ui.modalLayer.innerHTML = `<div class="modal" style="width:780px" role="dialog" aria-modal="true" aria-labelledby="batchSaveTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon(isZip ? 'download' : 'folder')}</span>
        <div class="modal-heading"><h2 id="batchSaveTitle">${title}</h2><p>${subtitle}</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="batch-save-info">${icon('info')}${infoText}</div>
        <div class="batch-save-toolbar">
          <label class="batch-save-checkall"><input type="checkbox" id="batchSaveSelectAll" checked>全选可${isZip ? '下载' : '另存'}文件</label>
          <span id="batchSaveSelectionSummary">已选 ${items.length} / ${items.length} 份 · ${formatSize(totalSize)}</span>
        </div>
        <div class="batch-save-list" id="batchSaveList">${list || '<div class="batch-empty">' + icon('folder') + '<p>' + emptyText + '</p></div>'}</div>
      </div>
      <footer class="modal-footer">
        <span class="modal-footer-note">${icon('shield')}${footerNote}</span>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-light" data-close-modal>取消</button>
          <button type="button" class="btn btn-primary" id="batchSaveConfirmButton" ${items.length ? '' : 'disabled'}>${primaryText}</button>
        </div>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
    batchSaveSelectionSummary();
  }

  function openBatchSaveModal(mode) {
    const targetMode = mode === 'zip' ? 'zip' : 'folder';
    if (state.modal === 'import' && (state.importBusy || state.importScanning)) {
      showToast('请先完成当前的导入/录入操作。', { type: 'warn' });
      return;
    }
    const items = batchSaveEligibleItems();
    if (!items.length) {
      showToast(`当前筛选结果中没有可${targetMode === 'zip' ? '下载' : '另存'}的本地文件（示例记录或文件缺失的记录无法处理）。`, {
        type: 'warn',
        title: targetMode === 'zip' ? '没有可下载的文件' : '没有可另存的文件'
      });
      return;
    }
    state.batchSaveMode = targetMode;
    state.batchSaveItems = items;
    state.batchSaveSelected = new Set(items.map((item) => item.id));
    state.batchSaveBusy = false;
    state.modal = 'batch-save';
    renderBatchSaveModal();
  }

  async function startBatchSave() {
    if (state.batchSaveBusy) return;
    const selected = state.batchSaveItems.filter((item) => state.batchSaveSelected.has(item.id));
    if (!selected.length) {
      showToast('请至少选择一份课件。', { type: 'warn' });
      return;
    }
    state.batchSaveBusy = true;
    const isZip = state.batchSaveMode === 'zip';
    batchSaveSelectionSummary();
    try {
      const items = selected.map((item) => {
        const subject = itemSubject(item);
        const book = itemBook(item);
        const chapter = itemChapter(item);
        const type = itemType(item);
        return {
          filePath: item.filePath,
          name: item.name,
          subject: subject ? subject.name : '',
          book: book ? bookName(book) : '',
          chapter: chapter ? chapter.name : '',
          type: type.name,
          tags: item.tags,
          note: item.note
        };
      });
      const result = isZip ? await api.downloadFilesZip(items) : await api.saveFilesAsBatch(items);
      if (!result || result.canceled) {
        state.batchSaveBusy = false;
        batchSaveSelectionSummary();
        return;
      }
      if (!result.ok) {
        state.batchSaveBusy = false;
        batchSaveSelectionSummary();
        showToast(result.error || `${isZip ? '批量下载' : '批量另存'}失败`, {
          type: 'error',
          title: isZip ? '批量下载失败' : '批量另存失败'
        });
        return;
      }
      closeModal();
      const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : 0;
      if (isZip) {
        showToast(`已打包下载 ${result.copied} 份课件：${result.filePath}${skippedCount ? `；${skippedCount} 个文件跳过` : ''}`, {
          type: 'success',
          title: '批量下载完成',
          duration: 9000
        });
      } else {
        showToast(`已复制 ${result.copied} 份课件到：${result.folderPath}${skippedCount ? `；${skippedCount} 个文件跳过` : ''}`, {
          type: result.copied ? 'success' : 'warn',
          title: '批量另存完成',
          duration: 8000
        });
      }
    } catch (error) {
      state.batchSaveBusy = false;
      batchSaveSelectionSummary();
      showToast(error?.message || `${isZip ? '批量下载' : '批量另存'}失败`, { type: 'error' });
    }
  }

  function batchDeleteSelectionSummary() {
    const items = state.batchDeleteItems;
    const selected = items.filter((item) => state.batchDeleteSelected.has(item.id));
    const selectedNode = $('#batchDeleteStepSummary');
    if (selectedNode) selectedNode.textContent = `已选 ${selected.length} / ${items.length} 份`;
    const button = $('#batchDeleteConfirmButton');
    if (button) {
      button.disabled = state.batchDeleteBusy || selected.length === 0;
      button.innerHTML = state.batchDeleteBusy
        ? '<span class="spinner"></span>正在移除…'
        : `删除选中${selected.length ? ` ${selected.length} 份` : ''}`;
    }
    const all = $('#batchDeleteSelectAll');
    if (all) {
      all.checked = selected.length === items.length && items.length > 0;
      all.indeterminate = selected.length > 0 && selected.length < items.length;
    }
  }

  function renderBatchDeleteModal() {
    const items = state.batchDeleteItems;
    const list = items.map((item) => {
      const subject = itemSubject(item);
      const book = itemBook(item);
      const type = itemType(item);
      const meta = fileMeta(item.ext);
      const checked = state.batchDeleteSelected.has(item.id);
      const missing = isMissing(item);
      return `<label class="batch-save-item">
        <input type="checkbox" data-batch-delete-id="${attr(item.id)}" ${checked ? 'checked' : ''}>
        <span class="batch-save-icon" style="--file-color:${meta.color}">${icon(meta.icon)}</span>
        <span class="batch-save-file">
          <span class="batch-save-copy">
            <strong title="${attr(item.name)}">${esc(item.name)}</strong>
            <small>${esc(subject ? subject.name : '未分学科')} · ${esc(book ? bookName(book) : '未分教材')}${missing ? ' · 文件缺失' : ''}</small>
          </span>
        </span>
        <span class="batch-save-side"><span>${formatSize(item.size)}</span><strong>${esc(type.name)}</strong></span>
      </label>`;
    }).join('');
    state.batchDeleteBusy = false;
    ui.modalLayer.innerHTML = `<div class="modal" style="width:760px" role="dialog" aria-modal="true" aria-labelledby="batchDeleteTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon('trash')}</span>
        <div class="modal-heading"><h2 id="batchDeleteTitle">批量删除课件</h2><p>从课件库移除选中的课件记录，可按当前筛选结果集中清理。</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="batch-delete-warning">${icon('alert')}只移除课件库中的索引记录，<strong>不会删除电脑中的课件原文件</strong>。删除后可通过重新导入恢复。</div>
        <div class="batch-save-toolbar">
          <label class="batch-save-checkall"><input type="checkbox" id="batchDeleteSelectAll">全选当前筛选结果</label>
          <span id="batchDeleteStepSummary">已选 0 / ${items.length} 份</span>
        </div>
        <div class="batch-save-list" id="batchDeleteList">${list || '<div class="batch-empty">' + icon('trash') + '<p>当前筛选结果中没有可删除的课件。</p></div>'}</div>
      </div>
      <footer class="modal-footer">
        <span class="modal-footer-note">${icon('shield')}课件原件仍保留在原位置</span>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-light" data-close-modal>取消</button>
          <button type="button" class="btn btn-danger" id="batchDeleteConfirmButton" disabled>删除选中</button>
        </div>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
    batchDeleteSelectionSummary();
  }

  function openBatchDeleteModal() {
    if (state.modal === 'import' && (state.importBusy || state.importScanning)) {
      showToast('请先完成当前的导入/录入操作。', { type: 'warn' });
      return;
    }
    const items = getFilteredItems();
    if (!items.length) {
      showToast('当前筛选结果中没有可删除的课件。', { type: 'warn', title: '没有可删除的记录' });
      return;
    }
    state.batchDeleteItems = items;
    state.batchDeleteSelected = new Set();
    state.batchDeleteBusy = false;
    state.modal = 'batch-delete';
    renderBatchDeleteModal();
  }

  async function startBatchDelete() {
    if (state.batchDeleteBusy) return;
    const selected = state.batchDeleteItems.filter((item) => state.batchDeleteSelected.has(item.id));
    if (!selected.length) {
      showToast('请至少选择一份课件。', { type: 'warn' });
      return;
    }
    state.batchDeleteBusy = true;
    batchDeleteSelectionSummary();
    const snapshot = state.items.slice();
    const selectedIds = new Set(selected.map((item) => item.id));
    state.items = state.items.filter((item) => !selectedIds.has(item.id));
    selected.forEach((item) => {
      if (item.filePath) state.missing.delete(item.filePath);
    });
    const ok = await persistLibrary();
    if (!ok) {
      state.items = snapshot;
      state.batchDeleteBusy = false;
      batchDeleteSelectionSummary();
      return;
    }
    state.batchDeleteBusy = false;
    closeModal();
    renderChrome();
    renderLibrary();
    showToast(`已从课件库移除 ${selected.length} 条记录，原文件未删除。`, { type: 'success', title: '批量删除完成' });
  }

  function refreshDetailBookSelect(subjectId, keepBookId) {
    const bookSelect = $('#detailBook');
    const chapterSelect = $('#detailChapter');
    if (!bookSelect) return;
    bookSelect.innerHTML = detailBookOptions(subjectId, keepBookId || '');
    if (!keepBookId) {
      chapterSelect.innerHTML = option('', '请先选择教材', true, ' disabled');
      chapterSelect.disabled = true;
    } else {
      chapterSelect.disabled = false;
      chapterSelect.innerHTML = detailChapterOptions(keepBookId, '');
    }
  }

  function refreshDetailChapterSelect(bookId) {
    const chapterSelect = $('#detailChapter');
    if (!chapterSelect) return;
    chapterSelect.disabled = !bookId;
    chapterSelect.innerHTML = detailChapterOptions(bookId, '');
  }

  async function saveDetail() {
    const item = currentItem();
    if (!item) return;
    const subjectId = $('#detailSubject')?.value || '';
    const bookId = $('#detailBook')?.value || '';
    const chapterId = $('#detailChapter')?.value || '';
    const typeId = $('#detailType')?.value || 'new';
    if (!subjectId) {
      showToast('请选择所属学科后再保存。', { type: 'warn', title: '分类未完成' });
      return;
    }
    if (!bookId) {
      showToast('请选择所属教材后再保存。', { type: 'warn', title: '分类未完成' });
      return;
    }
    if (chapterId) {
      const chapter = DATA.chapterById[chapterId];
      if (!chapter || chapter.bookId !== bookId) {
        showToast('章节与教材不匹配，请重新选择。', { type: 'warn' });
        return;
      }
    }
    const tags = ($('#detailTags')?.value || '')
      .split(/[,，、;；\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
    item.subjectId = subjectId;
    item.bookId = bookId;
    item.chapterId = chapterId;
    item.typeId = typeId;
    item.tags = [...new Set(tags)];
    item.note = ($('#detailNote')?.value || '').slice(0, 2000);
    item.favorite = state.detailDraftFavorite;
    item.updatedAt = new Date().toISOString();
    const ok = await persistLibrary();
    if (!ok) return;
    renderAll();
    renderDrawer();
    showToast('课件的分类与备注已保存。', { type: 'success', title: '已保存' });
  }

  function askDeleteItem(item) {
    if (!item) return;
    openConfirm({
      title: '移除这条课件记录？',
      message: `将从课件库中移除「<strong>${esc(stripExtension(item.name, item.ext))}</strong>」。<br>不会删除电脑中的原文件，之后仍可重新导入。`,
      confirmText: '移除记录',
      danger: true,
      onConfirm: async () => {
        state.items = state.items.filter((entry) => entry.id !== item.id);
        const ok = await persistLibrary();
        if (!ok) return;
        closeDrawer();
        renderAll();
        showToast('记录已从课件库移除，原文件未受影响。', { type: 'success' });
      }
    });
  }

  /* ---------------- 导入流程 ---------------- */

  function importBookOptions(subjectId, selectedBookId) {
    if (!subjectId) return option('', '先选学科', true, ' disabled');
    const subject = DATA.subjectById[subjectId];
    if (!subject) return option('', '先选学科', true, ' disabled');
    return option('', '请选择教材', !selectedBookId)
      + subject.books.map((book) => option(book.id, bookOptionLabel(book, false), selectedBookId === book.id)).join('');
  }

  function importChapterOptions(bookId, selectedChapterId) {
    if (!bookId) return option('', '先选教材', true, ' disabled');
    const book = DATA.bookById[bookId];
    if (!book) return option('', '先选教材', true, ' disabled');
    return option('', '未分章节', !selectedChapterId)
      + book.chapters.map((chapter) => option(chapter.id, chapter.name, selectedChapterId === chapter.id)).join('');
  }

  function importTypeOptions(selectedTypeId) {
    return DATA.courseTypes.map((type) => option(type.id, type.name, (selectedTypeId || 'new') === type.id)).join('');
  }

  function renderImportModal() {
    const isBatch = state.importMode === 'batch';
    const queue = state.importQueue;
    const totalSize = queue.reduce((sum, entry) => sum + (Number(entry.file.size) || 0), 0);
    const autoCount = queue.filter((entry) => entry.auto.subject || entry.auto.book).length;
    const invalidCount = queue.filter((entry) => !entry.subjectId || !entry.bookId).length;
    const batch = state.importBatch;
    const previousGrid = $('#importGrid') || $('#batchTableWrap');
    const scrollTop = previousGrid ? previousGrid.scrollTop : 0;
    const batchBooks = batch.subjectId ? (DATA.subjectById[batch.subjectId]?.books || []) : [];
    const batchBookAvailable = batchBooks.some((book) => book.id === batch.bookId);
    if (!batchBookAvailable) {
      batch.bookId = '';
      batch.chapterId = '';
    }
    const batchBook = batch.bookId ? DATA.bookById[batch.bookId] : null;

    const dropzone = `<div class="import-dropzone" id="importDropzone">
      <span class="import-dropzone-icon">${icon('upload')}</span>
      <strong>把课件拖到这里，或从电脑中选择</strong>
      <p>支持 PPT、Word、PDF、视频、图片、音频、压缩包等教学资源</p>
      <div class="import-dropzone-actions">
        <button type="button" class="btn btn-primary" id="importPickFiles" data-import-source="files">${icon('file')}选择文件</button>
        <button type="button" class="btn btn-ghost" id="importPickFolder" data-import-source="folder">${icon('folder')}扫描文件夹</button>
      </div>
      <small>文件以「引用路径」方式加入，原件不会被移动或复制</small>
    </div>`;

    const batchBar = queue.length ? `
      <div class="batch-bar">
        <label class="batch-field subject-batch"><span>统一学科</span><select data-batch-field="subjectId">${option('', '请选择', !batch.subjectId)}${DATA.catalog.map((subject) => option(subject.id, subject.name, batch.subjectId === subject.id)).join('')}</select></label>
        <label class="batch-field book-batch"><span>统一教材</span><select data-batch-field="bookId"${!batch.subjectId ? ' disabled' : ''}>${importBookOptions(batch.subjectId, batch.bookId)}</select></label>
        <label class="batch-field chapter-batch"><span>统一章节</span><select data-batch-field="chapterId"${!batchBook ? ' disabled' : ''}>${importChapterOptions(batch.bookId, batch.chapterId)}</select></label>
        <label class="batch-field type-batch"><span>统一分类</span><select data-batch-field="typeId">${importTypeOptions(batch.typeId)}</select></label>
        <button type="button" class="batch-apply" data-import-apply>应用到全部</button>
        <span class="batch-hint">也可逐条调整分类</span>
      </div>` : '';

    const normalQueue = queue.length ? `
      <div class="queue-head">
        <div class="queue-title"><strong>待导入 ${queue.length} 个文件</strong><span>共 ${formatSize(totalSize)} · ${autoCount} 个已自动识别</span></div>
        <div class="queue-head-actions">
          <button type="button" class="text-button small" data-import-source="files">添加文件</button>
          <button type="button" class="text-button small" data-import-source="folder">添加文件夹</button>
          <button type="button" class="text-button small" data-import-clear>全部移除</button>
        </div>
      </div>
      ${batchBar}
      <div class="import-grid" id="importGrid">
        ${queue.map((entry) => {
          const meta = fileMeta(entry.file.ext);
          const detected = entry.auto.subject || entry.auto.book;
          const invalid = !entry.subjectId || !entry.bookId;
          return `<div class="import-item${invalid ? ' is-invalid' : ''}" data-import-key="${attr(entry.key)}">
            <div class="import-item-head">
              <span class="import-file-icon" style="--file-color:${meta.color}">${icon(meta.icon)}</span>
              <span class="import-file-copy">
                <strong title="${attr(entry.file.name)}">${esc(entry.file.name)}</strong>
                <small title="${attr(entry.file.relativePath || entry.file.path)}">${esc(entry.file.relativePath || entry.file.name)} · ${formatSize(entry.file.size)} ${detected ? '<span class="import-detected">自动识别</span>' : ''}</small>
              </span>
              <button type="button" class="import-remove" data-import-remove="${attr(entry.key)}" title="移除" aria-label="移除">${icon('close')}</button>
            </div>
            <div class="import-selects">
              <select data-q-key="${attr(entry.key)}" data-q-field="subjectId" class="${!entry.subjectId ? 'is-missing' : ''}" title="所属学科">${option('', '选择学科', !entry.subjectId)}${DATA.catalog.map((subject) => option(subject.id, subject.name, entry.subjectId === subject.id)).join('')}</select>
              <select data-q-key="${attr(entry.key)}" data-q-field="bookId" class="${!entry.bookId ? 'is-missing' : ''}" title="所属教材"${!entry.subjectId ? ' disabled' : ''}>${importBookOptions(entry.subjectId, entry.bookId)}</select>
              <select data-q-key="${attr(entry.key)}" data-q-field="chapterId" title="所属章节"${!entry.bookId ? ' disabled' : ''}>${importChapterOptions(entry.bookId, entry.chapterId)}</select>
              <select data-q-key="${attr(entry.key)}" data-q-field="typeId" title="课程分类">${importTypeOptions(entry.typeId)}</select>
            </div>
          </div>`;
        }).join('')}
      </div>` : dropzone;

    const batchSource = `<div class="batch-entry-source">
      <div class="batch-source-main">
        <strong>${icon('sheet')} 批量录入课件文件</strong>
        <p>支持一次选择多个文件、扫描整个文件夹，或从表格中复制本机文件路径。录入前可逐条核对分类。</p>
        <div class="batch-source-actions">
          <button type="button" class="btn btn-soft" data-import-source="files" ${state.importScanning || state.importBusy ? 'disabled' : ''}>${icon('file')}选择多个文件</button>
          <button type="button" class="btn btn-ghost" data-import-source="folder" ${state.importScanning || state.importBusy ? 'disabled' : ''}>${icon('folder')}扫描文件夹</button>
        </div>
      </div>
      <div class="batch-path-box">
        <span>粘贴本机文件路径<em>每行一个，支持「复制为路径」结果</em></span>
        <textarea id="batchPathInput" placeholder="例如：&#10;D:\\课件\\语文\\必修上册\\第一单元.pptx&#10;D:\\课件\\物理\\电磁感应.pdf" ${state.importScanning || state.importBusy ? 'disabled' : ''}>${esc(state.batchPathText)}</textarea>
        <div class="batch-path-row">
          <small>支持文件或文件夹路径；无效路径会自动跳过</small>
          <button type="button" class="btn btn-soft" id="batchPathParse" data-import-paths ${state.importScanning || state.importBusy ? 'disabled' : ''}>${icon('arrowRight')}解析路径</button>
        </div>
      </div>
    </div>`;

    const batchTable = queue.length ? `
      <div class="queue-head">
        <div class="queue-title"><strong>待录入 ${queue.length} 个文件</strong><span>共 ${formatSize(totalSize)} · ${autoCount} 个已自动识别</span></div>
        <div class="queue-head-actions">
          <button type="button" class="text-button small" data-import-clear>全部移除</button>
        </div>
      </div>
      ${batchBar}
      <div class="batch-table-wrap" id="batchTableWrap">
        <table class="batch-table">
          <thead><tr><th>课件文件</th><th>学科</th><th>教材</th><th>章节</th><th>分类</th><th></th></tr></thead>
          <tbody>
            ${queue.map((entry) => {
              const meta = fileMeta(entry.file.ext);
              const detected = entry.auto.subject || entry.auto.book;
              const invalid = !entry.subjectId || !entry.bookId;
              return `<tr data-import-key="${attr(entry.key)}" class="${invalid ? 'is-invalid' : ''}">
                <td><div class="batch-file-cell">
                  <span class="batch-file-icon" style="--file-color:${meta.color}">${icon(meta.icon)}</span>
                  <span class="batch-file-copy"><strong title="${attr(entry.file.name)}">${esc(entry.file.name)}</strong><small title="${attr(entry.file.relativePath || entry.file.path)}">${esc(entry.file.relativePath || entry.file.name)} · ${formatSize(entry.file.size)} ${detected ? '<span class="import-detected">自动识别</span>' : ''}</small></span>
                </div></td>
                <td><select data-q-key="${attr(entry.key)}" data-q-field="subjectId" class="${!entry.subjectId ? 'is-missing' : ''}" title="所属学科">${option('', '选择学科', !entry.subjectId)}${DATA.catalog.map((subject) => option(subject.id, subject.name, entry.subjectId === subject.id)).join('')}</select></td>
                <td><select data-q-key="${attr(entry.key)}" data-q-field="bookId" class="${!entry.bookId ? 'is-missing' : ''}" title="所属教材"${!entry.subjectId ? ' disabled' : ''}>${importBookOptions(entry.subjectId, entry.bookId)}</select></td>
                <td><select data-q-key="${attr(entry.key)}" data-q-field="chapterId" title="所属章节"${!entry.bookId ? ' disabled' : ''}>${importChapterOptions(entry.bookId, entry.chapterId)}</select></td>
                <td><select data-q-key="${attr(entry.key)}" data-q-field="typeId" title="课程分类">${importTypeOptions(entry.typeId)}</select></td>
                <td><button type="button" class="import-remove" data-import-remove="${attr(entry.key)}" title="移除" aria-label="移除">${icon('close')}</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<div class="batch-empty">${icon('sheet')}<p>还没有添加课件文件，可从上方选择文件、扫描文件夹或粘贴路径。</p></div>`;

    const body = isBatch ? `${batchSource}${batchTable}` : normalQueue;
    const title = isBatch ? '批量录入课件' : '导入本地课件';
    const subtitle = isBatch
      ? '一次录入多份课件文件：可批量选择、扫描文件夹，或直接粘贴本机文件路径。'
      : '文件仍保留在原来的文件夹中，系统只记录路径与分类信息，不占用双份空间。';
    const footerAction = isBatch ? `批量录入${queue.length ? ` ${queue.length} 份` : ''}` : `确认导入${queue.length ? ` ${queue.length} 份` : ''}`;
    const footerNote = isBatch ? '仅登记本机路径 · 不复制课件原件' : '仅在本机建立索引 · 不会上传云端';

    ui.modalLayer.innerHTML = `<div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="importTitle">
      <header class="modal-header">
        <span class="modal-icon">${isBatch ? icon('sheet') : icon('upload')}</span>
        <div class="modal-heading"><h2 id="importTitle">${title}</h2><p>${subtitle}</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">${body}</div>
      <footer class="modal-footer">
        <span class="modal-footer-note">${icon('shield')}${footerNote}</span>
        <div class="modal-footer-actions">
          ${queue.length ? `<span class="queue-summary" style="margin-right:6px;font-size:8px;color:${invalidCount ? '#b06a6a' : '#8ba0b2'}">${invalidCount ? `${invalidCount} 个文件待补充学科/教材` : '分类已就绪'}</span>` : ''}
          <button type="button" class="btn btn-light" data-close-modal>取消</button>
          <button type="button" class="btn btn-primary" id="importConfirmButton" ${!queue.length || state.importBusy || state.importScanning ? 'disabled' : ''}>
            ${state.importScanning || state.importBusy ? '<span class="spinner"></span>正在处理…' : footerAction}
          </button>
        </div>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
    const scroller = $('#importGrid') || $('#batchTableWrap');
    if (scroller) scroller.scrollTop = scrollTop;
  }

  function openImportModal(mode) {
    if (state.modal === 'import') return;
    state.importMode = 'import';
    state.importQueue = [];
    state.batchPathText = '';
    state.importBatch = {
      subjectId: state.subjectId || '',
      bookId: state.bookId || '',
      chapterId: state.chapterId || '',
      typeId: state.typeId || 'new'
    };
    state.importBusy = false;
    state.importScanning = false;
    state.modal = 'import';
    renderImportModal();
    if (mode === 'files' || mode === 'folder') {
      window.setTimeout(() => startImportScan(mode), 80);
    }
  }

  function openBatchEntryModal() {
    state.importMode = 'batch';
    state.importQueue = [];
    state.batchPathText = '';
    state.importBatch = {
      subjectId: state.subjectId || '',
      bookId: state.bookId || '',
      chapterId: state.chapterId || '',
      typeId: state.typeId || 'new'
    };
    state.importBusy = false;
    state.importScanning = false;
    state.modal = 'import';
    renderImportModal();
  }

  async function startImportScan(mode) {
    if (state.importScanning || state.importBusy) return;
    if (api.isMock) {
      showToast('浏览器预览模式无法读取本机文件，请通过桌面程序使用导入功能。', { type: 'warn' });
      return;
    }
    state.importScanning = true;
    renderImportModal();
    try {
      const result = mode === 'folder' ? await api.pickFolder() : await api.pickFiles();
      state.importScanning = false;
      if (!result) {
        renderImportModal();
        return;
      }
      if (result.error) {
        showToast(result.error, { type: 'error' });
        renderImportModal();
        return;
      }
      if (result.canceled) {
        renderImportModal();
        return;
      }
      addScannedFiles(result);
    } catch (error) {
      state.importScanning = false;
      showToast(error?.message || '读取文件失败', { type: 'error' });
      renderImportModal();
    }
  }

  function addScannedFiles(result) {
    if (!result || !Array.isArray(result.files)) {
      renderImportModal();
      return;
    }
    const existing = new Set(state.items.filter((item) => item.filePath).map((item) => item.filePath.toLowerCase()));
    const queued = new Set(state.importQueue.map((entry) => entry.file.path.toLowerCase()));
    const maxQueue = 500;
    let duplicateCount = 0;
    let added = 0;
    let limitSkipped = 0;
    for (const file of result.files) {
      if (!file || !file.path) continue;
      if (state.importQueue.length >= maxQueue) {
        limitSkipped += 1;
        continue;
      }
      const keyPath = file.path.toLowerCase();
      if (existing.has(keyPath) || queued.has(keyPath)) {
        duplicateCount += 1;
        continue;
      }
      const detected = DETECT.classify(file, state.importBatch);
      state.importQueue.push({
        key: uniqueId('import'),
        file,
        subjectId: detected.subjectId,
        bookId: detected.bookId,
        chapterId: detected.chapterId,
        typeId: detected.typeId,
        auto: detected.auto
      });
      queued.add(keyPath);
      added += 1;
    }
    state.importScanning = false;
    renderImportModal();

    const notes = [];
    if (added) notes.push(`已加入 ${added} 个文件`);
    if (duplicateCount) notes.push(`跳过 ${duplicateCount} 个重复文件`);
    if (limitSkipped) notes.push(`单次最多导入 500 个文件，剩余 ${limitSkipped} 个请分批添加`);
    if (result.skipped) notes.push(`忽略 ${result.skipped} 个不支持的文件`);
    if (result.truncated) notes.push('文件数量超过上限，仅载入前 6000 个');
    if (result.unreadable) notes.push(`${result.unreadable} 个路径无法读取`);
    if (notes.length) {
      const queueName = state.importMode === 'batch' ? '待录入' : '待导入';
      showToast(notes.join('，'), { type: added ? 'success' : 'warn', title: added ? `文件已加入${queueName}列表` : '没有新增文件' });
    }
  }

  async function openImportWithPaths(paths) {
    if (!paths || !paths.length) return;
    if (state.modal !== 'import') {
      state.importMode = 'import';
      state.importQueue = [];
      state.batchPathText = '';
      state.importBatch = {
        subjectId: state.subjectId || '',
        bookId: state.bookId || '',
        chapterId: state.chapterId || '',
        typeId: state.typeId || 'new'
      };
      state.importBusy = false;
      state.importScanning = true;
      state.modal = 'import';
      renderImportModal();
    }
    try {
      const result = await api.inspectPaths(paths);
      state.importScanning = false;
      if (!result || !result.ok) {
        showToast(result?.error || '无法读取拖入的文件', { type: 'error' });
        renderImportModal();
        return;
      }
      addScannedFiles(result);
    } catch (error) {
      state.importScanning = false;
      showToast(error?.message || '读取文件失败', { type: 'error' });
      renderImportModal();
    }
  }

  async function parseBatchPaths() {
    if (state.importScanning || state.importBusy) return;
    if (api.isMock) {
      showToast('浏览器预览模式无法读取本机路径，请通过桌面程序使用批量录入。', { type: 'warn' });
      return;
    }
    const textarea = $('#batchPathInput');
    const raw = textarea ? textarea.value : state.batchPathText;
    state.batchPathText = raw;
    const paths = String(raw || '')
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^["'“”]|["'“”]$/g, '').trim())
      .filter(Boolean);
    if (!paths.length) {
      showToast('请先粘贴至少一个本机文件或文件夹路径。', { type: 'warn' });
      return;
    }
    if (paths.length > 500) {
      showToast('一次最多解析 500 行路径，请分批添加。', { type: 'warn' });
      return;
    }
    state.importScanning = true;
    renderImportModal();
    try {
      const result = await api.inspectPaths(paths);
      state.importScanning = false;
      if (!result || !result.ok) {
        showToast(result?.error || '路径解析失败', { type: 'error' });
        renderImportModal();
        return;
      }
      state.batchPathText = '';
      addScannedFiles(result);
    } catch (error) {
      state.importScanning = false;
      showToast(error?.message || '路径解析失败', { type: 'error' });
      renderImportModal();
    }
  }

  function applyImportBatch() {
    const batch = state.importBatch;
    if (!batch.subjectId) {
      showToast('请先在「统一设置」中选择学科。', { type: 'warn' });
      return;
    }
    state.importQueue.forEach((entry) => {
      entry.subjectId = batch.subjectId;
      entry.bookId = batch.bookId || '';
      entry.chapterId = batch.chapterId || '';
      entry.typeId = batch.typeId || 'new';
    });
    renderImportModal();
    showToast(`已将统一设置应用到 ${state.importQueue.length} 个文件。`, { type: 'success' });
  }

  async function confirmImport() {
    if (state.importBusy || !state.importQueue.length) return;
    const isBatchMode = state.importMode === 'batch';
    const invalid = state.importQueue.filter((entry) => !entry.subjectId || !entry.bookId);
    if (invalid.length) {
      renderImportModal();
      showToast(`还有 ${invalid.length} 个文件未选择学科或教材，请先补充分类。`, { type: 'warn', title: '还差一步' });
      return;
    }
    const now = new Date().toISOString();
    const previousItems = state.items;
    const added = [];
    for (const entry of state.importQueue) {
      if (!entry.subjectId || !entry.bookId) continue;
      const chapter = entry.chapterId ? DATA.chapterById[entry.chapterId] : null;
      if (chapter && chapter.bookId !== entry.bookId) continue;
      added.push({
        id: uniqueId('cw'),
        name: entry.file.name,
        filePath: entry.file.path,
        ext: entry.file.ext,
        size: entry.file.size,
        mtimeMs: entry.file.mtimeMs || 0,
        subjectId: entry.subjectId,
        bookId: entry.bookId,
        chapterId: entry.chapterId || '',
        typeId: entry.typeId || 'new',
        tags: [],
        note: '',
        favorite: false,
        demo: false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: ''
      });
    }
    if (!added.length) {
      showToast('没有可导入的有效文件。', { type: 'error' });
      return;
    }
    state.importBusy = true;
    renderImportModal();
    state.items = [...added, ...state.items];
    const ok = await persistLibrary({ quiet: true });
    state.importBusy = false;
    if (!ok) {
      state.items = previousItems;
      renderImportModal();
      showToast('保存课件库失败，未导入任何文件。', { type: 'error' });
      return;
    }
    state.importQueue = [];
    state.batchPathText = '';
    closeModal();
    state.visible = Math.max(12, state.visible);
    renderAll();
    showToast(`已成功${isBatchMode ? '批量录入' : '导入'} ${added.length} 份课件，原文件仍保留在原位置。`, {
      type: 'success',
      title: isBatchMode ? '批量录入完成' : '导入完成'
    });
  }

  /* ---------------- 弹窗、确认与提示 ---------------- */

  function closeModal() {
    state.modal = null;
    state.confirmCallback = null;
    state.confirmOptions = null;
    state.batchSaveItems = [];
    state.batchSaveSelected = new Set();
    state.batchSaveBusy = false;
    state.batchSaveMode = 'folder';
    state.batchDeleteItems = [];
    state.batchDeleteSelected = new Set();
    state.batchDeleteBusy = false;
    state.updateInfo = null;
    state.updateDownloading = false;
    state.adminPasswordCallback = null;
    ui.modalLayer.hidden = true;
    ui.modalLayer.innerHTML = '';
  }

  function openConfirm(options) {
    state.modal = 'confirm';
    state.confirmOptions = options;
    state.confirmCallback = options.onConfirm || null;
    ui.modalLayer.innerHTML = `<div class="modal modal-small" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
      <div class="modal-body" style="padding-top:22px">
        <div class="confirm-illustration">${icon(options.danger ? 'alert' : 'info')}</div>
        <div class="confirm-copy"><h2 id="confirmTitle">${options.title || '确认操作'}</h2><p>${options.message || ''}</p></div>
      </div>
      <footer class="modal-footer" style="justify-content:flex-end">
        <button type="button" class="btn btn-light" data-close-modal>取消</button>
        <button type="button" class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" id="confirmActionButton">${esc(options.confirmText || '确认')}</button>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
    window.setTimeout(() => $('#confirmActionButton')?.focus(), 30);
  }

  async function runConfirmAction() {
    if (typeof state.confirmCallback !== 'function') return;
    const button = $('#confirmActionButton');
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span>处理中…';
    }
    try {
      await state.confirmCallback();
      closeModal();
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = '重试';
      }
      showToast(error?.message || '操作失败', { type: 'error' });
    }
  }

  function openHelp() {
    state.modal = 'help';
    ui.modalLayer.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon('help')}</span>
        <div class="modal-heading"><h2 id="helpTitle">使用指南</h2><p>三步建立属于枣庄八中的本地课件资源库</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="help-content">
          <div class="help-steps">
            <div class="help-step"><span>01 / IMPORT</span><strong>导入课件</strong><p>点击「导入课件」，选择文件或扫描整个文件夹，系统会自动识别学科与教材。</p></div>
            <div class="help-step"><span>02 / CLASSIFY</span><strong>核对分类</strong><p>确认学科、教材、章节和课程分类。可批量设置，也可逐条调整。</p></div>
            <div class="help-step"><span>03 / FIND</span><strong>快速查找</strong><p>从左侧学科、教材目录或课程分类进入，点击卡片即可预览或打开原文件。</p></div>
          </div>
          <h3>课件会保存在哪里？</h3>
          <ul class="help-list">
            <li>课件原件保留在你电脑中的原路径，系统不会移动、修改或删除文件。</li>
            <li>系统仅在本机保存文件路径、分类、标签和备注，不上传任何内容。</li>
            <li>移动文件后卡片会标记「文件缺失」，重新导入即可恢复。</li>
          </ul>
          <h3>快捷操作</h3>
          <ul class="help-list">
            <li><strong>Ctrl + K</strong>：快速搜索课件、章节或标签。</li>
            <li><strong>拖拽文件或文件夹</strong>到窗口任意位置即可开始导入。</li>
            <li><strong>Esc</strong>：关闭详情面板或弹窗。</li>
          </ul>
          <h3>批量录入与批量另存</h3>
          <ul class="help-list">
            <li><strong>批量录入</strong>：在课件库标题右侧点击「批量录入」，可一次选择多个文件、扫描文件夹，或直接粘贴本机文件路径，核对分类后统一保存。</li>
            <li><strong>批量另存</strong>：点击「批量另存」，勾选当前结果中的课件，选择目标文件夹，即可按「学科 / 教材 / 章节」自动分类复制并生成课件清单。</li>
            <li><strong>批量下载</strong>：点击「批量下载」，勾选课件后可打包成一个 ZIP 文件保存，压缩包内同样按分类整理并附带课件清单。</li>
            <li><strong>批量删除</strong>：点击「批量删除」，勾选当前筛选结果中的记录后删除；只移除索引，不会删除电脑中的课件原文件。</li>
            <li><strong>单个另存</strong>：打开课件详情，点击「另存为」即可把该课件复制到本机任意位置，不影响原文件。</li>
          </ul>
          <h3>学习工具</h3>
          <ul class="help-list">
            <li><strong>英语 3500</strong>：在左侧「学习工具 → 英语 3500」中按英文、中文或音标查询，支持 A—Z 首字母浏览。</li>
            <li><strong>学科提问</strong>：在左侧「学习工具 → 学科提问」中发布待讲题目、填写票数或投票 +1；可按票数排序，讲完后标记已讲解。</li>
          </ul>
          <h3>课堂工具</h3>
          <ul class="help-list">
            <li><strong>AI 解答</strong>：填写并加密保存 DeepSeek API Key，可选择模型/推理等级、上传附件、AI 翻译和图片转文字。</li>
            <li><strong>通用设置</strong>：统一设置 AI API Key、模型/推理等级、时事政治弹幕、功能显隐和桌面悬浮快捷球。</li>
            <li><strong>桌面悬浮快捷键 / 批注</strong>：右下角校徽圆环快捷球可配置 1—8 个功能、调整大小（默认白板、展台、批注）；关闭软件时快捷球同步退出。</li>
            <li><strong>单词天天练</strong>：高中英语 3500 词库随机出题，英译汉/汉译英四选一，支持昵称通关排名。</li>
            <li><strong>函数图像 / 科学计算器</strong>：绘制多条函数曲线并缩放、拖动，鼠标靠近显示坐标；计算器支持三角函数、对数、幂等。</li>
            <li><strong>环境音量 / 英语往年题 / 英语网</strong>：麦克风检测自习/晨读声级；按外研版课本章节和题型用 AI 整理题目；英语网内置打开 cybertamin.xin/lang/en/。</li>
            <li><strong>时事政治</strong>：聚合人民网、新华网、中国新闻网、中国政府网等权威来源，按高考命题相关性筛选并最多展示 50 条，标注教材章节和命题角度。</li>
            <li><strong>内置浏览器</strong>：默认打开 zz8zszy.cn，地址栏可访问其他网址并支持网页缩放；可在右侧加密保存账号密码，登录页自动填充。</li>
            <li><strong>展台 / 白板</strong>：展台支持 4K/1080P 采集、旋转/镜像、全屏重连和最高 500% 缩放；全屏展台/白板可调笔粗。白板缩小后四周仍可书写，画笔状态下双指不会连出直线。</li>
            <li><strong>科目投票</strong>：每天按日期为 13 个学科投票，查看结果需要管理员密码。</li>
            <li><strong>随机点名</strong>：导入 Excel/CSV 名单，可一次抽取多人、按可调权重抽取；后台可改名、调整权重、批量/指定删除。</li>
            <li><strong>手机投屏</strong>：手机扫描二维码后通过同一 Wi-Fi 投摄像头或屏幕；蓝牙用于设备配对。</li>
            <li><strong>课堂计时器</strong>：预设/自定义倒计时，支持暂停、重置、全屏与结束提示音。</li>
            <li><strong>课程表</strong>：直接修改节次、时间和课程，周六/周日可切换 A 表/B 表。</li>
            <li><strong>U 盘检测</strong>：检查可疑可执行文件、伪装文档和 autorun 项，也可调用 Windows Defender。</li>
            <li><strong>检查更新</strong>：右上角刷新图标，或「数据管理 → 关于系统 → 检查更新」。</li>
          </ul>
          <div class="help-tip">建议定期在「数据管理」中导出数据备份。备份包含课件索引、学科提问、课程表、投票、名单和单词成绩，不包含课件原文件。</div>
          <div class="help-team">
            <img src="../assets/school-badge.png" alt="枣庄八中校徽">
            <div class="help-team-copy">
              <strong>制作团队</strong>
              <span>开发者：陈凯阳　技术支持：孙浩翔、龚豪章</span>
              <span>赞助人：李青洋　关键词提供：桑晨皓、任泽昱　使用 AI：Deepseek-V4.1pro</span>
              <span>该软件已在 GitHub 开源</span>
              <a href="mailto:ba4iitqrz@163.com" data-email="ba4iitqrz@163.com">开发者邮箱：ba4iitqrz@163.com</a>
            </div>
          </div>
        </div>
      </div>
      <footer class="modal-footer" style="justify-content:flex-end"><button type="button" class="btn btn-primary" data-close-modal>知道了</button></footer>
    </div>`;
    ui.modalLayer.hidden = false;
  }

  function showToast(message, options) {
    const opts = options || {};
    const type = opts.type || 'success';
    const iconName = { success: 'checkCircle', error: 'xCircle', warn: 'alert', info: 'info' }[type] || 'info';
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' is-error' : ''}${type === 'warn' ? ' is-warn' : ''}`;
    toast.innerHTML = `<span class="toast-icon">${icon(iconName)}</span>
      <span class="toast-copy">${opts.title ? `<strong>${esc(opts.title)}</strong>` : ''}${esc(message)}</span>
      <button type="button" class="toast-close" aria-label="关闭提示">${icon('close')}</button>`;
    const close = () => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 220);
    };
    toast.querySelector('.toast-close').addEventListener('click', close);
    ui.toastStack.appendChild(toast);
    while (ui.toastStack.children.length > 4) ui.toastStack.firstElementChild.remove();
    window.setTimeout(close, opts.duration || 4200);
  }

  /* ---------------- 保存、缺失检测与页面切换 ---------------- */

  let saveSequence = 0;

  function setSaveState(mode) {
    ui.saveState.classList.remove('is-saving', 'is-error');
    if (mode === 'saving') {
      ui.saveState.classList.add('is-saving');
      ui.saveStateText.textContent = '正在保存…';
    } else if (mode === 'error') {
      ui.saveState.classList.add('is-error');
      ui.saveStateText.textContent = '保存失败';
    } else {
      ui.saveStateText.textContent = '已本地保存';
    }
  }

  async function persistLibrary(options) {
    const opts = options || {};
    const sequence = ++saveSequence;
    state.settings.initialized = true;
    setSaveState('saving');
    try {
      const result = await api.saveLibrary({
        items: state.items,
        questions: state.questions,
        timetable: state.timetable,
        subjectVotes: state.subjectVotes,
        students: state.students,
        wordGameScores: state.wordGameScores,
        settings: state.settings
      });
      if (!result || !result.ok) throw new Error(result?.error || '保存失败');
      if (sequence === saveSequence) setSaveState('saved');
      return true;
    } catch (error) {
      if (sequence === saveSequence) setSaveState('error');
      showToast(error?.message || '无法把数据写入本机', { type: 'error', title: '保存失败' });
      return false;
    }
  }

  async function checkMissingFiles(updateUi) {
    const itemsWithPath = state.items.filter((item) => !item.demo && item.filePath);
    if (!itemsWithPath.length) {
      state.missing = new Set();
      if (updateUi) renderAll();
      return;
    }
    try {
      const result = await api.checkFiles(itemsWithPath.map((item) => item.filePath));
      if (!result || !result.ok) return;
      const missing = new Set();
      let changed = false;
      itemsWithPath.forEach((item) => {
        const info = result.files[item.filePath];
        if (!info || !info.exists) {
          missing.add(item.filePath);
          return;
        }
        if (Number.isFinite(info.size) && info.size !== item.size) {
          item.size = info.size;
          item.mtimeMs = info.mtimeMs || item.mtimeMs;
          changed = true;
        }
      });
      state.missing = missing;
      if (changed) await persistLibrary({ quiet: true });
      if (updateUi) {
        renderLibrary();
        if (state.page === 'data') renderData();
        if (state.currentFileId) renderDrawer();
      }
    } catch (error) {
      /* 文件状态检测失败时不打断主流程 */
    }
  }

  function setPage(page, options) {
    clearTimeout(searchTimer);
    searchTimer = 0;
    if (!PAGE_TITLES[page]) page = 'library';
    if (page !== 'library' && !['data'].includes(page) && !featuresAllows(page)) page = 'library';
    if (state.page === 'camera' && page !== 'camera') stopCamera();
    if (state.page === 'phone' && page !== 'phone') {
      api.stopPhoneCast?.().catch(() => {});
      resetPhoneStage();
    }
    if (state.page === 'volume' && page !== 'volume') stopVolume();
    state.page = page;
    ui.pagePanels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== page;
    });
    ui.contextTitle.textContent = PAGE_TITLES[page];
    renderChrome();
    if (page === 'library') renderLibrary();
    if (page === 'catalog') renderCatalog();
    if (page === 'types') renderTypes();
    if (page === 'vocab') renderVocab();
    if (page === 'questions') renderQuestions();
    if (page === 'browser') renderBrowser();
    if (page === 'camera') renderCamera();
    if (page === 'whiteboard') renderWhiteboard();
    if (page === 'timetable') renderTimetable();
    if (page === 'usb') renderUsb();
    if (page === 'vote') renderVote();
    if (page === 'students') renderStudents();
    if (page === 'ai') renderAi();
    if (page === 'wordgame') renderWordGame();
    if (page === 'graph') renderGraph();
    if (page === 'calculator') renderCalculator();
    if (page === 'politics') renderPolitics();
    if (page === 'volume') renderVolume();
    if (page === 'englishexam') renderEnglishExam();
    if (page === 'englishweb') renderEnglishWeb();
    if (page === 'annotation') renderAnnotation();
    if (page === 'settings') renderSettings();
    if (page === 'phone') renderPhone();
    if (page === 'timer') renderTimer();
    if (page === 'data') renderData();
    if (!options || options.scroll !== false) ui.mainScroll.scrollTop = 0;
  }

  function resetLibraryFilters(options) {
    const opts = options || {};
    state.quick = '';
    state.search = '';
    state.subjectId = '';
    state.grade = '';
    state.bookId = '';
    state.chapterId = '';
    state.typeId = '';
    state.visible = 12;
    if (ui.search) ui.search.value = '';
    if (!opts.keepPage) setPage('library');
  }

  function applyLibraryFilter(patch) {
    Object.assign(state, patch);
    state.visible = 12;
    if (state.page !== 'library') setPage('library');
    else {
      renderChrome();
      renderLibrary();
    }
  }

  function openChapterInLibrary(chapterId, bookId, subjectId) {
    state.quick = '';
    state.search = '';
    if (ui.search) ui.search.value = '';
    state.subjectId = subjectId || '';
    state.bookId = bookId || '';
    state.chapterId = chapterId || '';
    state.grade = '';
    state.typeId = '';
    state.visible = 12;
    setPage('library');
  }

  function openTypeInLibrary(subjectId, typeId) {
    state.quick = '';
    state.search = '';
    if (ui.search) ui.search.value = '';
    state.subjectId = subjectId || '';
    state.typeId = typeId || '';
    state.grade = '';
    state.bookId = '';
    state.chapterId = '';
    state.visible = 12;
    setPage('library');
  }

  /* ---------------- 数据管理操作 ---------------- */

  function buildCsv() {
    const headers = ['序号', '课件名称', '学科', '年级', '教材', '章节', '课程分类', '标签', '收藏', '文件大小', '本地路径', '添加时间', '最近打开'];
    const rows = state.items.map((item, index) => {
      const subject = itemSubject(item);
      const book = itemBook(item);
      const chapter = itemChapter(item);
      const type = itemType(item);
      return [
        index + 1,
        item.name,
        subject ? subject.name : '',
        book ? book.grades.join('/') : '',
        book ? bookName(book) : '',
        chapter ? chapter.name : '',
        type ? type.name : '',
        (item.tags || []).join('；'),
        item.favorite ? '是' : '否',
        item.demo ? '示例（无文件）' : formatSize(item.size),
        item.filePath || (item.demo ? '示例记录' : ''),
        formatDateTime(item.createdAt),
        item.lastOpenedAt ? formatDateTime(item.lastOpenedAt) : ''
      ].map(escapeCsv).join(',');
    });
    return `\ufeff${headers.map(escapeCsv).join(',')}\r\n${rows.join('\r\n')}`;
  }

  async function exportCsv() {
    if (!state.items.length) {
      showToast('课件库中还没有可导出的记录。', { type: 'warn' });
      return;
    }
    const result = await api.saveText({
      title: '导出课件清单',
      defaultName: `枣庄八中课件清单_${todayStamp()}.csv`,
      filters: [{ name: 'CSV 表格', extensions: ['csv'] }],
      content: buildCsv()
    });
    if (result && result.ok && !result.canceled) {
      showToast(`课件清单已导出${result.filePath ? `：${result.filePath}` : ''}`, { type: 'success', title: '导出完成' });
    } else if (result && result.error) {
      showToast(result.error, { type: 'error', title: '导出失败' });
    }
  }

  async function exportJson() {
    const backup = {
      app: '枣庄八中集成桌面教学系统',
      formatVersion: 5,
      school: '枣庄市第八中学',
      exportedAt: new Date().toISOString(),
      settings: { ...state.settings, initialized: true },
      items: state.items,
      questions: state.questions,
      timetable: state.timetable,
      subjectVotes: state.subjectVotes,
      students: state.students,
      wordGameScores: state.wordGameScores
    };
    const result = await api.saveText({
      title: '导出课件库数据备份',
      defaultName: `枣庄八中课件库备份_${todayStamp()}.json`,
      filters: [{ name: 'JSON 数据备份', extensions: ['json'] }],
      content: JSON.stringify(backup, null, 2)
    });
    if (result && result.ok && !result.canceled) {
      showToast(`数据备份已导出${result.filePath ? `：${result.filePath}` : ''}。备份不含课件原文件。`, { type: 'success', title: '备份完成' });
    } else if (result && result.error) {
      showToast(result.error, { type: 'error', title: '备份失败' });
    }
  }

  function sanitizeBackupItems(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map((item) => {
      if (!item || typeof item !== 'object' || !item.name) return null;
      let id = typeof item.id === 'string' && item.id ? item.id : uniqueId('cw');
      if (seen.has(id)) id = uniqueId('cw');
      seen.add(id);
      return {
        id,
        name: String(item.name).slice(0, 300),
        filePath: typeof item.filePath === 'string' ? item.filePath : '',
        ext: typeof item.ext === 'string' ? item.ext.toLowerCase().slice(0, 12) : '',
        size: Number(item.size) || 0,
        mtimeMs: Number(item.mtimeMs) || 0,
        subjectId: typeof item.subjectId === 'string' ? item.subjectId : '',
        bookId: typeof item.bookId === 'string' ? item.bookId : '',
        chapterId: typeof item.chapterId === 'string' ? item.chapterId : '',
        typeId: typeof item.typeId === 'string' ? item.typeId : 'new',
        tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 12) : [],
        note: typeof item.note === 'string' ? item.note : '',
        favorite: Boolean(item.favorite),
        demo: Boolean(item.demo),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
        lastOpenedAt: typeof item.lastOpenedAt === 'string' ? item.lastOpenedAt : ''
      };
    }).filter(Boolean);
  }

  function sanitizeBackupQuestions(questions) {
    const seen = new Set();
    return (Array.isArray(questions) ? questions : []).map((question) => {
      if (!question || typeof question !== 'object' || !question.title) return null;
      let id = typeof question.id === 'string' && question.id ? question.id : uniqueId('question');
      if (seen.has(id)) id = uniqueId('question');
      seen.add(id);
      return {
        id,
        subjectId: typeof question.subjectId === 'string' ? question.subjectId : '',
        title: String(question.title).slice(0, 200),
        detail: typeof question.detail === 'string' ? question.detail.slice(0, 800) : '',
        votes: Math.max(0, Math.min(9999, Math.floor(Number(question.votes) || 0))),
        status: question.status === 'done' ? 'done' : 'open',
        createdAt: typeof question.createdAt === 'string' ? question.createdAt : new Date().toISOString(),
        updatedAt: typeof question.updatedAt === 'string' ? question.updatedAt : new Date().toISOString()
      };
    }).filter(Boolean);
  }

  async function importJson() {
    const file = await api.openJson();
    if (!file || file.canceled) return;
    if (!file.ok) {
      showToast(file.error || '读取备份失败', { type: 'error' });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(file.text);
    } catch (error) {
      showToast('备份文件不是有效的 JSON 格式。', { type: 'error' });
      return;
    }
    if (!parsed || !Array.isArray(parsed.items)) {
      showToast('备份文件中没有课件数据。', { type: 'error' });
      return;
    }
    const backupItems = sanitizeBackupItems(parsed.items);
    const hasBackupQuestions = Array.isArray(parsed.questions);
    const backupQuestions = hasBackupQuestions ? sanitizeBackupQuestions(parsed.questions) : state.questions.slice();
    const hasBackupTimetable = Boolean(parsed.timetable && Array.isArray(parsed.timetable.periods));
    const backupTimetable = normalizeClientTimetable(parsed.timetable);
    const hasBackupVotes = Boolean(parsed.subjectVotes && typeof parsed.subjectVotes === 'object');
    const backupVotes = normalizeClientSubjectVotes(parsed.subjectVotes);
    const hasBackupStudents = Array.isArray(parsed.students);
    const backupStudents = normalizeClientStudents(parsed.students);
    const hasBackupWordScores = Array.isArray(parsed.wordGameScores);
    const backupWordScores = normalizeClientWordGameScores(parsed.wordGameScores);
    const questionMessage = hasBackupQuestions
      ? `备份中的 <strong>${backupQuestions.length}</strong> 条学科提问`
      : `当前 <strong>${backupQuestions.length}</strong> 条学科提问（旧备份未包含）`;
    openConfirm({
      title: '从备份恢复课件库？',
      message: `将使用备份中的 <strong>${backupItems.length}</strong> 条课件记录和 ${questionMessage}替换当前数据。<br>不会删除或修改电脑中的任何课件原文件。`,
      confirmText: '恢复数据',
      danger: true,
      onConfirm: async () => {
        state.items = backupItems;
        state.questions = backupQuestions;
        if (hasBackupTimetable) state.timetable = backupTimetable;
        if (hasBackupVotes) state.subjectVotes = backupVotes;
        if (hasBackupStudents) state.students = backupStudents;
        if (hasBackupWordScores) state.wordGameScores = backupWordScores;
        state.questionVoteEditId = '';
        state.settings = {
          ...(parsed.settings || {}),
          initialized: true
        };
        const ok = await persistLibrary();
        if (!ok) return;
        state.missing = new Set();
        resetLibraryFilters({ keepPage: true });
        await checkMissingFiles(false);
        renderAll();
        showToast(`已从备份恢复 ${backupItems.length} 条课件记录、${backupQuestions.length} 条学科提问。`, { type: 'success', title: '恢复完成' });
      }
    });
  }

  function askClearDemoData() {
    const demoCount = state.items.filter((item) => item.demo).length;
    if (!demoCount) {
      showToast('当前没有示例数据。', { type: 'info' });
      return;
    }
    openConfirm({
      title: '清除全部示例数据？',
      message: `将移除 <strong>${demoCount}</strong> 条带「示例」标记的记录。不会影响已导入的真实课件。`,
      confirmText: '清除示例',
      onConfirm: async () => {
        state.items = state.items.filter((item) => !item.demo);
        const ok = await persistLibrary();
        if (!ok) return;
        state.demoNoticeHidden = true;
        renderAll();
        showToast('示例数据已清除。', { type: 'success' });
      }
    });
  }

  function askClearAllData() {
    if (!state.items.length) {
      showToast('课件库已经是空的。', { type: 'info' });
      return;
    }
    openConfirm({
      title: '清空整个课件库？',
      message: `将移除全部 <strong>${state.items.length}</strong> 条索引与分类记录。<br>电脑中的课件原文件不会被删除，但需要重新导入才能恢复索引。`,
      confirmText: '确认清空',
      danger: true,
      onConfirm: async () => {
        state.items = [];
        state.missing = new Set();
        const ok = await persistLibrary();
        if (!ok) return;
        resetLibraryFilters({ keepPage: true });
        renderAll();
        showToast('课件库已清空，原文件未受影响。', { type: 'success' });
      }
    });
  }

  async function openDataFolder() {
    const result = await api.openDataDir();
    if (result && result.ok) {
      showToast('已打开数据所在文件夹。', { type: 'success' });
    } else {
      showToast(result?.error || '无法打开数据文件夹', { type: 'error' });
    }
  }

  async function contactDeveloper(email) {
    const address = email || 'ba4iitqrz@163.com';
    const copied = await copyText(address);
    try {
      const result = await api.openExternal(`mailto:${address}`);
      if (result && result.ok) {
        showToast(copied ? `已复制开发者邮箱 ${address}，正在打开邮件客户端。` : `正在打开邮件客户端：${address}`, {
          type: 'success',
          title: '联系开发者',
          duration: 5000
        });
        return;
      }
    } catch (error) {
      /* 没有邮件客户端时回退为复制邮箱 */
    }
    showToast(copied ? `开发者邮箱已复制：${address}` : `开发者邮箱：${address}`, {
      type: copied ? 'success' : 'info',
      title: '联系开发者',
      duration: 6000
    });
  }

  /* ---------------- 事件绑定 ---------------- */

  let searchTimer = 0;

  function applySearch(value) {
    clearTimeout(searchTimer);
    searchTimer = 0;
    state.search = String(value || '').trim();
    state.visible = 12;
    if (state.page !== 'library') setPage('library');
    else renderLibrary();
  }

  function clearFilterKey(key) {
    if (key === 'quick') state.quick = '';
    if (key === 'subject') {
      state.subjectId = '';
      state.bookId = '';
      state.chapterId = '';
    }
    if (key === 'grade') {
      state.grade = '';
      state.bookId = '';
      state.chapterId = '';
    }
    if (key === 'book') {
      state.bookId = '';
      state.chapterId = '';
    }
    if (key === 'chapter') state.chapterId = '';
    if (key === 'type') state.typeId = '';
    if (key === 'search') {
      state.search = '';
      ui.search.value = '';
    }
    state.visible = 12;
    renderLibrary();
    renderChrome();
  }

  function handleDocumentClick(event) {
    if (event.target.closest('#modalLayer') || event.target.closest('#detailDrawer')) return;

    const graphRemove = event.target.closest('[data-graph-remove]');
    if (graphRemove) {
      state.graph.functions = state.graph.functions.filter((fn) => fn.id !== graphRemove.dataset.graphRemove);
      renderGraphList();
      drawGraph();
      return;
    }
    const graphColor = event.target.closest('[data-graph-color]');
    if (graphColor) {
      const fn = state.graph.functions.find((entry) => entry.id === graphColor.dataset.graphColor);
      if (fn) {
        const index = GRAPH_COLORS.indexOf(fn.color);
        fn.color = GRAPH_COLORS[(index + 1) % GRAPH_COLORS.length];
        renderGraphList();
        drawGraph();
      }
      return;
    }
    const calcHistory = event.target.closest('[data-calc-history]');
    if (calcHistory) {
      state.calc.expression = calcHistory.dataset.calcHistory || '';
      state.calc.result = '';
      calcShow(state.calc.expression, '');
      return;
    }
    const politicsLink = event.target.closest('[data-politics-link]');
    if (politicsLink) {
      api.openExternal(politicsLink.dataset.politicsLink).then((result) => {
        if (result && !result.ok) showToast(result.error || '无法打开新闻链接', { type: 'warn' });
      });
      return;
    }

    const helpLink = event.target.closest('[data-open-help]');
    if (helpLink) {
      event.preventDefault();
      openHelp();
      return;
    }

    const emailLink = event.target.closest('[data-email]');
    if (emailLink) {
      event.preventDefault();
      contactDeveloper(emailLink.dataset.email);
      return;
    }

    const pageButton = event.target.closest('[data-page]');
    if (pageButton) {
      state.quick = '';
      setPage(pageButton.dataset.page);
      return;
    }

    const quickButton = event.target.closest('[data-quick]');
    if (quickButton) {
      const quick = quickButton.dataset.quick;
      if (state.quick === quick) {
        resetLibraryFilters({ keepPage: true });
      } else {
        resetLibraryFilters({ keepPage: true });
        state.quick = quick;
      }
      setPage('library');
      return;
    }

    const subjectButton = event.target.closest('[data-subject]');
    if (subjectButton) {
      const subjectId = subjectButton.dataset.subject;
      state.subjectId = state.subjectId === subjectId ? '' : subjectId;
      state.quick = '';
      state.search = '';
      ui.search.value = '';
      state.bookId = '';
      state.chapterId = '';
      state.visible = 12;
      setPage('library');
      return;
    }

    const batchEntryButton = event.target.closest('[data-action="batch-entry"]');
    if (batchEntryButton) {
      openBatchEntryModal();
      return;
    }

    const batchDownloadButton = event.target.closest('[data-action="batch-download"]');
    if (batchDownloadButton) {
      openBatchSaveModal('zip');
      return;
    }

    const batchSaveButton = event.target.closest('[data-action="batch-save"]');
    if (batchSaveButton) {
      openBatchSaveModal('folder');
      return;
    }

    const batchDeleteButton = event.target.closest('[data-action="batch-delete"]');
    if (batchDeleteButton) {
      openBatchDeleteModal();
      return;
    }

    const importButton = event.target.closest('[data-action="import"]');
    if (importButton) {
      openImportModal(importButton.dataset.importMode || '');
      return;
    }

    const gotoButton = event.target.closest('[data-goto]');
    if (gotoButton) {
      setPage(gotoButton.dataset.goto);
      return;
    }

    const clearAllButton = event.target.closest('[data-clear-all]');
    if (clearAllButton) {
      resetLibraryFilters();
      renderAll();
      return;
    }

    const clearButton = event.target.closest('[data-clear]');
    if (clearButton) {
      clearFilterKey(clearButton.dataset.clear);
      return;
    }

    const gradeButton = event.target.closest('[data-grade]');
    if (gradeButton) {
      const grade = gradeButton.dataset.grade;
      state.grade = grade;
      if (state.bookId) {
        const book = DATA.bookById[state.bookId];
        if (grade && (!book || !book.grades.includes(grade))) {
          state.bookId = '';
          state.chapterId = '';
        }
      }
      state.visible = 12;
      renderChrome();
      renderLibrary();
      return;
    }

    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      state.view = viewButton.dataset.view === 'list' ? 'list' : 'grid';
      renderFilters();
      renderLibrary();
      return;
    }

    const wordOption = event.target.closest('[data-word-option]');
    if (wordOption) {
      answerWordQuestion(wordOption.dataset.wordOption);
      return;
    }

    const voteSubjectButton = event.target.closest('[data-vote-subject]');
    if (voteSubjectButton) {
      voteForSubject(voteSubjectButton.dataset.voteSubject);
      return;
    }

    const drawColorButton = event.target.closest('[data-draw-color]');
    if (drawColorButton && (['camera', 'whiteboard', 'annotation'].includes(state.page))) {
      setDrawingColor(drawColorButton.dataset.drawColor);
      return;
    }

    const moveToolButton = event.target.closest('[data-draw-tool="move"]');
    if (moveToolButton && (['camera', 'whiteboard', 'annotation'].includes(state.page))) {
      setMoveTool(activeDrawingState().tool !== 'move');
      return;
    }

    const eraserButton = event.target.closest('[data-draw-tool="eraser"]');
    if (eraserButton && (['camera', 'whiteboard', 'annotation'].includes(state.page))) {
      setEraser(!activeDrawingState().eraser);
      return;
    }

    if (event.target.closest('[data-draw-clear]') && (['camera', 'whiteboard', 'annotation'].includes(state.page))) {
      clearDrawing(activeDrawingState());
      return;
    }

    const vocabLetterButton = event.target.closest('[data-vocab-letter]');
    if (vocabLetterButton) {
      state.vocabLetter = vocabLetterButton.dataset.vocabLetter || '';
      state.vocabLimit = 60;
      renderVocab();
      return;
    }

    if (event.target.closest('[data-vocab-clear]')) {
      setVocabQuery('');
      $('#vocabSearch')?.focus();
      return;
    }

    const questionStatusButton = event.target.closest('[data-question-status]');
    if (questionStatusButton) {
      state.questionStatus = questionStatusButton.dataset.questionStatus || 'open';
      renderQuestionsList();
      return;
    }

    const questionVoteButton = event.target.closest('[data-question-vote]');
    if (questionVoteButton) {
      const question = state.questions.find((entry) => entry.id === questionVoteButton.dataset.questionVote);
      if (!question) return;
      question.votes = Math.min(9999, (Number(question.votes) || 0) + 1);
      question.updatedAt = new Date().toISOString();
      renderQuestionsList();
      persistLibrary();
      return;
    }

    const questionEditVotesButton = event.target.closest('[data-question-edit-votes]');
    if (questionEditVotesButton) {
      state.questionVoteEditId = questionEditVotesButton.dataset.questionEditVotes;
      renderQuestionsList();
      window.setTimeout(() => {
        const input = $(`[data-question-vote-input="${state.questionVoteEditId}"]`);
        input?.focus();
        input?.select();
      }, 30);
      return;
    }

    const questionSaveVotesButton = event.target.closest('[data-question-save-votes]');
    if (questionSaveVotesButton) {
      const question = state.questions.find((entry) => entry.id === questionSaveVotesButton.dataset.questionSaveVotes);
      if (!question) return;
      const input = $(`[data-question-vote-input="${question.id}"]`);
      updateQuestionVotes(question, input?.value);
      return;
    }

    if (event.target.closest('[data-question-cancel-votes]')) {
      state.questionVoteEditId = '';
      renderQuestionsList();
      return;
    }

    const questionDoneButton = event.target.closest('[data-question-done]');
    if (questionDoneButton) {
      const question = state.questions.find((entry) => entry.id === questionDoneButton.dataset.questionDone);
      if (!question) return;
      question.status = question.status === 'done' ? 'open' : 'done';
      question.updatedAt = new Date().toISOString();
      renderChrome();
      renderQuestionsList();
      persistLibrary();
      showToast(question.status === 'done' ? '已标记为已讲解。' : '已重新放回待讲解。', { type: 'success', duration: 2200 });
      return;
    }

    const questionDeleteButton = event.target.closest('[data-question-delete]');
    if (questionDeleteButton) {
      const question = state.questions.find((entry) => entry.id === questionDeleteButton.dataset.questionDelete);
      if (question) askDeleteQuestion(question);
      return;
    }

    const favoriteButton = event.target.closest('[data-favorite]');
    if (favoriteButton) {
      const item = state.items.find((entry) => entry.id === favoriteButton.dataset.favorite);
      if (!item) return;
      item.favorite = !item.favorite;
      item.updatedAt = new Date().toISOString();
      persistLibrary({ quiet: true });
      renderChrome();
      renderLibrary();
      showToast(item.favorite ? '已加入我的收藏。' : '已取消收藏。', { type: 'info', duration: 1800 });
      return;
    }

    const fileCard = event.target.closest('[data-file-id]');
    if (fileCard) {
      openDrawer(fileCard.dataset.fileId);
      return;
    }

    const catalogGradeButton = event.target.closest('[data-catalog-grade]');
    if (catalogGradeButton) {
      state.catalogGrade = catalogGradeButton.dataset.catalogGrade;
      state.catalogBookId = '';
      renderCatalog();
      return;
    }

    const catalogSubjectButton = event.target.closest('[data-catalog-subject]');
    if (catalogSubjectButton) {
      state.catalogSubjectId = catalogSubjectButton.dataset.catalogSubject;
      state.catalogBookId = '';
      renderCatalog();
      return;
    }

    const catalogBookButton = event.target.closest('[data-catalog-book]');
    if (catalogBookButton) {
      state.catalogBookId = catalogBookButton.dataset.catalogBook;
      renderCatalog();
      return;
    }

    const catalogChapterButton = event.target.closest('[data-catalog-chapter]');
    if (catalogChapterButton) {
      openChapterInLibrary(
        catalogChapterButton.dataset.catalogChapter,
        catalogChapterButton.dataset.catalogBookId,
        catalogChapterButton.dataset.catalogSubjectId
      );
      return;
    }

    const typeButton = event.target.closest('[data-type-id]');
    if (typeButton) {
      openTypeInLibrary('', typeButton.dataset.typeId);
      return;
    }

    const matrixButton = event.target.closest('[data-matrix-subject]');
    if (matrixButton) {
      openTypeInLibrary(matrixButton.dataset.matrixSubject, matrixButton.dataset.matrixType);
    }
  }

  function bindEvents() {
    document.addEventListener('click', handleDocumentClick);
    bindQuestionEvents();
    bindClassroomToolEvents();
    applyFeatureVisibility();
    applyWidgetSettings();
    api.onNavigate?.((page) => setPage(page));

    ui.search.addEventListener('input', () => {
      const value = ui.search.value;
      clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => applySearch(value), 130);
    });

    ui.search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        ui.search.value = '';
        applySearch('');
        ui.search.blur();
      }
    });

    ui.bookFilter.addEventListener('change', () => {
      state.bookId = ui.bookFilter.value;
      state.chapterId = '';
      if (state.bookId) {
        const book = DATA.bookById[state.bookId];
        if (book) state.subjectId = book.subjectId;
      }
      state.visible = 12;
      renderChrome();
      renderLibrary();
    });

    ui.chapterFilter.addEventListener('change', () => {
      state.chapterId = ui.chapterFilter.value;
      state.visible = 12;
      renderLibrary();
    });

    ui.typeFilter.addEventListener('change', () => {
      state.typeId = ui.typeFilter.value;
      state.visible = 12;
      renderLibrary();
    });

    ui.sortSelect.addEventListener('change', () => {
      state.sort = ui.sortSelect.value;
      state.visible = 12;
      renderLibrary();
    });

    ui.loadMoreButton.addEventListener('click', () => {
      state.visible += 12;
      renderLibrary();
    });

    $('#topImportButton').addEventListener('click', () => openImportModal());
    $('#helpButton').addEventListener('click', openHelp);
    $('#storageMini').addEventListener('click', openDataFolder);
    $('#clearDemoButton').addEventListener('click', askClearDemoData);
    $('#dismissDemoButton').addEventListener('click', () => {
      state.demoNoticeHidden = true;
      renderChrome();
    });

    $('#catalogViewAllButton').addEventListener('click', () => {
      const book = state.catalogBookId ? DATA.bookById[state.catalogBookId] : null;
      if (!book) return;
      state.quick = '';
      state.search = '';
      ui.search.value = '';
      state.subjectId = book.subjectId;
      state.bookId = book.id;
      state.chapterId = '';
      state.grade = state.catalogGrade || '';
      state.typeId = '';
      state.visible = 12;
      setPage('library');
    });

    $('#openDataDirTop').addEventListener('click', openDataFolder);
    $('#openDataDirButton').addEventListener('click', openDataFolder);
    $('#exportCsvButton').addEventListener('click', exportCsv);
    $('#exportJsonButton').addEventListener('click', exportJson);
    $('#importJsonButton').addEventListener('click', importJson);
    $('#clearDemoButtonData').addEventListener('click', askClearDemoData);
    $('#clearAllButton').addEventListener('click', askClearAllData);
    $('#copyDataPath').addEventListener('click', async () => {
      const text = state.dataPath || state.appInfo?.libraryPath || '';
      if (!text) return;
      const ok = await copyText(text);
      showToast(ok ? '数据路径已复制到剪贴板。' : '复制失败，请手动选择路径。', { type: ok ? 'success' : 'warn' });
    });

    $('#winMinimize').addEventListener('click', () => api.window.minimize());
    $('#winMaximize').addEventListener('click', () => api.window.toggleMaximize());
    $('#winClose').addEventListener('click', () => api.window.close());
    if (api.window && typeof api.window.onMaximizedChange === 'function') {
      api.window.onMaximizedChange((maximized) => {
        ui.appWindow.classList.toggle('is-maximized', Boolean(maximized));
      });
      api.window.isMaximized().then((maximized) => {
        ui.appWindow.classList.toggle('is-maximized', Boolean(maximized));
      }).catch(() => {});
    }

    ui.drawerOverlay.addEventListener('click', (event) => {
      if (event.target === ui.drawerOverlay) {
        closeDrawer();
        return;
      }
      if (event.target.closest('#closeDrawerButton') || event.target.closest('[data-detail-cancel]')) {
        closeDrawer();
        return;
      }
      const item = currentItem();
      if (event.target.closest('[data-detail-open]')) {
        openOriginal(item);
        return;
      }
      if (event.target.closest('[data-detail-reveal]')) {
        revealOriginal(item);
        return;
      }
      if (event.target.closest('[data-detail-saveas]')) {
        saveAsSingle(item);
        return;
      }
      if (event.target.closest('[data-detail-save]')) {
        saveDetail();
        return;
      }
      if (event.target.closest('[data-detail-delete]')) {
        askDeleteItem(item);
        return;
      }
      if (event.target.closest('[data-copy-path]')) {
        const pathValue = event.target.closest('[data-copy-path]').dataset.copyPath;
        copyText(pathValue).then((ok) => showToast(ok ? '文件路径已复制。' : '复制失败', { type: ok ? 'success' : 'warn' }));
        return;
      }
      const favoriteToggle = event.target.closest('#detailFavoriteToggle');
      if (favoriteToggle) {
        state.detailDraftFavorite = !state.detailDraftFavorite;
        favoriteToggle.classList.toggle('is-active', state.detailDraftFavorite);
        const label = favoriteToggle.querySelector('span');
        if (label) label.textContent = state.detailDraftFavorite ? '已收藏此课件' : '收藏此课件';
      }
    });

    ui.drawerOverlay.addEventListener('change', (event) => {
      if (event.target.id === 'detailSubject') {
        refreshDetailBookSelect(event.target.value, '');
        return;
      }
      if (event.target.id === 'detailBook') {
        refreshDetailChapterSelect(event.target.value);
      }
    });

    ui.modalLayer.addEventListener('click', (event) => {
      if (event.target === ui.modalLayer) {
        if (state.importBusy || state.importScanning || state.batchSaveBusy || state.batchDeleteBusy || state.updateDownloading) return;
        if ($('#confirmActionButton')?.disabled) return;
        closeModal();
        return;
      }
      const emailLink = event.target.closest('[data-email]');
      if (emailLink) {
        event.preventDefault();
        contactDeveloper(emailLink.dataset.email);
        return;
      }
      if (event.target.closest('[data-open-help]')) {
        event.preventDefault();
        openHelp();
        return;
      }
      if (event.target.closest('[data-close-modal]')) {
        if (state.importBusy || state.importScanning || state.batchSaveBusy || state.batchDeleteBusy || state.updateDownloading) return;
        if ($('#confirmActionButton')?.disabled) return;
        closeModal();
        return;
      }
      if (event.target.closest('[data-update-release]')) {
        const url = state.updateInfo?.releaseUrl;
        if (url) api.openExternal(url);
        return;
      }
      if (event.target.closest('#updateDownloadButton')) {
        downloadAndInstallUpdate();
        return;
      }
      if (event.target.closest('#batchSaveConfirmButton')) {
        startBatchSave();
        return;
      }
      if (event.target.closest('#batchDeleteConfirmButton')) {
        startBatchDelete();
        return;
      }
      if (event.target.closest('#adminPasswordConfirm')) {
        confirmAdminPassword();
        return;
      }
      if (event.target.closest('#saveStudentWeights')) {
        saveStudentWeights();
        return;
      }
      if (event.target.closest('#deleteSelectedStudents')) {
        deleteSelectedStudents();
        return;
      }
      const sourceButton = event.target.closest('[data-import-source]');
      if (sourceButton) {
        startImportScan(sourceButton.dataset.importSource);
        return;
      }
      if (event.target.closest('[data-import-paths]')) {
        parseBatchPaths();
        return;
      }
      const removeButton = event.target.closest('[data-import-remove]');
      if (removeButton) {
        state.importQueue = state.importQueue.filter((entry) => entry.key !== removeButton.dataset.importRemove);
        renderImportModal();
        return;
      }
      if (event.target.closest('[data-import-clear]')) {
        state.importQueue = [];
        renderImportModal();
        return;
      }
      if (event.target.closest('[data-import-apply]')) {
        applyImportBatch();
        return;
      }
      if (event.target.closest('#importConfirmButton')) {
        confirmImport();
        return;
      }
      if (event.target.closest('#confirmActionButton')) {
        runConfirmAction();
      }
    });

    ui.modalLayer.addEventListener('input', (event) => {
      if (event.target.id === 'batchPathInput') {
        state.batchPathText = event.target.value;
      }
    });

    ui.modalLayer.addEventListener('change', (event) => {
      if (event.target.id === 'studentSelectAll') {
        $$('[data-student-select]').forEach((input) => { input.checked = event.target.checked; });
        return;
      }
      if (event.target.id === 'batchDeleteSelectAll') {
        const checked = event.target.checked;
        state.batchDeleteSelected.clear();
        if (checked) state.batchDeleteItems.forEach((item) => state.batchDeleteSelected.add(item.id));
        $$('#batchDeleteList [data-batch-delete-id]').forEach((input) => {
          input.checked = checked;
        });
        batchDeleteSelectionSummary();
        return;
      }
      if (event.target.matches('[data-batch-delete-id]')) {
        const id = event.target.dataset.batchDeleteId;
        if (event.target.checked) state.batchDeleteSelected.add(id);
        else state.batchDeleteSelected.delete(id);
        batchDeleteSelectionSummary();
        return;
      }
      if (event.target.id === 'batchSaveSelectAll') {
        const checked = event.target.checked;
        state.batchSaveSelected.clear();
        if (checked) state.batchSaveItems.forEach((item) => state.batchSaveSelected.add(item.id));
        $$('#batchSaveList [data-batch-save-id]').forEach((input) => {
          input.checked = checked;
        });
        batchSaveSelectionSummary();
        return;
      }
      if (event.target.matches('[data-batch-save-id]')) {
        const id = event.target.dataset.batchSaveId;
        if (event.target.checked) state.batchSaveSelected.add(id);
        else state.batchSaveSelected.delete(id);
        batchSaveSelectionSummary();
        return;
      }
      const batchField = event.target.closest('[data-batch-field]');
      if (batchField) {
        const field = batchField.dataset.batchField;
        state.importBatch[field] = event.target.value;
        if (field === 'subjectId') {
          state.importBatch.bookId = '';
          state.importBatch.chapterId = '';
        }
        if (field === 'bookId') {
          state.importBatch.chapterId = '';
        }
        renderImportModal();
        return;
      }
      const rowSelect = event.target.closest('[data-q-key]');
      if (rowSelect) {
        const entry = state.importQueue.find((item) => item.key === rowSelect.dataset.qKey);
        if (!entry) return;
        const field = rowSelect.dataset.qField;
        entry[field] = event.target.value;
        if (field === 'subjectId') {
          entry.bookId = '';
          entry.chapterId = '';
        }
        if (field === 'bookId') {
          entry.chapterId = '';
        }
        renderImportModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      const isMac = api.platform === 'darwin';
      if ((isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (!ui.modalLayer.hidden || !ui.drawerOverlay.hidden) return;
        event.preventDefault();
        if (state.page === 'vocab') {
          const vocabSearch = $('#vocabSearch');
          vocabSearch?.focus();
          vocabSearch?.select();
          return;
        }
        if (state.page === 'questions') {
          const questionSearch = $('#questionSearch');
          questionSearch?.focus();
          questionSearch?.select();
          return;
        }
        if (TOOL_PAGES.has(state.page)) return;
        if (ui.searchBox) ui.searchBox.hidden = false;
        ui.search.focus();
        ui.search.select();
        return;
      }
      if (event.key === 'Escape') {
        if (!ui.modalLayer.hidden) {
          if (state.importBusy || state.importScanning || state.batchSaveBusy || state.batchDeleteBusy || state.updateDownloading) return;
          if ($('#confirmActionButton')?.disabled) return;
          closeModal();
          return;
        }
        if (!ui.drawerOverlay.hidden) {
          closeDrawer();
          return;
        }
        if (document.activeElement === ui.search && ui.search.value) {
          ui.search.value = '';
          applySearch('');
        }
        return;
      }
      if (event.key === 'Enter' && event.target instanceof Element) {
        const card = event.target.closest('.file-card, .file-row');
        if (card && event.target === card) openDrawer(card.dataset.fileId);
      }
    });

    window.addEventListener('dragenter', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault();
      state.dragDepth += 1;
      ui.dropOverlay.hidden = false;
    });

    window.addEventListener('dragover', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      ui.dropOverlay.hidden = false;
    });

    window.addEventListener('dragleave', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      state.dragDepth = Math.max(0, state.dragDepth - 1);
      if (state.dragDepth === 0) ui.dropOverlay.hidden = true;
    });

    window.addEventListener('drop', async (event) => {
      event.preventDefault();
      state.dragDepth = 0;
      ui.dropOverlay.hidden = true;
      if (!event.dataTransfer) return;
      const files = Array.from(event.dataTransfer.files || []);
      if (!files.length) return;
      const paths = api.getDroppedPaths(files);
      if (!paths.length) {
        showToast('无法读取拖入文件的本地路径，请使用「导入课件」按钮选择文件。', { type: 'warn' });
        return;
      }
      openImportWithPaths(paths);
    });
  }

  /* ---------------- 启动 ---------------- */

  async function initApp() {
    ICONS.hydrateIcons();
    ui.schoolYear.textContent = schoolYear();
    bindEvents();
    renderChrome();
    renderFilters();
    renderLibrary();

    try {
      const result = await api.loadLibrary();
      if (!result || !result.ok) throw new Error(result?.error || '无法读取本机课件库');
      state.items = Array.isArray(result.items) ? result.items.filter((item) => item && item.id && item.name) : [];
      state.questions = Array.isArray(result.questions) ? result.questions.filter((q) => q && q.id && q.title) : [];
      state.timetable = normalizeClientTimetable(result.timetable);
      state.subjectVotes = normalizeClientSubjectVotes(result.subjectVotes);
      state.students = normalizeClientStudents(result.students);
      state.wordGameScores = normalizeClientWordGameScores(result.wordGameScores);
      state.settings = result.settings && typeof result.settings === 'object' ? result.settings : {};
      state.settings.ai = normalizeAiSettings(state.settings.ai);
      state.settings.danmaku = normalizeDanmakuSettings(state.settings.danmaku);
      state.settings.features = normalizeFeatureSettings(state.settings.features);
      state.settings.widget = normalizeWidgetSettings(state.settings.widget);
      state.dataPath = result.libraryPath || result.dataDir || '';
      if (!state.settings.initialized && state.items.length === 0) {
        state.items = buildDemoItems();
        state.settings = { ...state.settings, initialized: true };
        await persistLibrary({ quiet: true });
      } else if (!state.settings.initialized) {
        state.settings = { ...state.settings, initialized: true };
        await persistLibrary({ quiet: true });
      }
      try {
        const info = await api.getAppInfo();
        if (info && info.ok) {
          state.appInfo = info;
          state.dataPath = info.libraryPath || state.dataPath;
        }
      } catch (error) {
        /* 应用信息读取失败不影响课件库 */
      }
      state.loading = false;
      state.ready = true;
      setPage('library');
      if (result.warning) {
        showToast(result.warning, { type: 'warn', title: '数据提示', duration: 7000 });
      }
      checkMissingFiles(false).then(() => {
        if (!state.ready) return;
        renderLibrary();
        if (state.page === 'data') renderData();
        if (state.currentFileId) renderDrawer();
      });
    } catch (error) {
      console.error(error);
      state.loading = false;
      state.ready = true;
      setPage('library');
      showToast(error?.message || '课件库读取失败，请检查数据目录权限。', { type: 'error', title: '加载失败', duration: 8000 });
      ui.listTitle.textContent = '课件库读取失败';
      ui.listSubtitle.textContent = '请检查数据目录，或重启软件后重试';
    }
    applyFeatureVisibility();
    applyWidgetSettings();
  }

  initApp();
})();
