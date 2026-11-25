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
          <p style="margin:0 0 20px;font-size:12px;line-height:1.9;color:#7e95a9">这是枣庄八中高中课件管理系统的界面文件。<br>请双击软件目录中的「枣庄八中高中课件管理系统.exe」。</p>
          <div style="padding:12px;border-radius:10px;background:#f6fbff;border:1px solid #e8f1f9;font-size:11px;color:#8aa0b3">本地软件版 · 课件原件保留在本机，不会上传云端</div>
        </div>
      </div>`;
    return;
  }

  /* ---------------- 基础工具 ---------------- */

  const GRADE_NAMES = ['高一', '高二', '高三'];
  const PAGE_TITLES = {
    library: '教学资源中心',
    catalog: '教材目录',
    types: '课程分类',
    vocab: '英语 3500 词汇',
    questions: '学科提问',
    vote: '科目投票',
    students: '随机点名',
    browser: '内置浏览器',
    camera: '展台',
    whiteboard: '白板',
    timetable: '课程表',
    usb: 'U 盘检测',
    data: '数据管理'
  };
  const TOOL_PAGES = new Set(['vocab', 'questions', 'browser', 'camera', 'whiteboard', 'timetable', 'usb', 'vote', 'students']);
  const ADMIN_PASSWORD = '6767';
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
    browserInitialized: false,
    browserCredentials: null,
    subjectVotes: {},
    students: [],
    studentSpinning: false,
    studentSpinTimer: 0,
    lastPickedStudent: '',
    adminPasswordCallback: null,
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
    if (version) version.textContent = `v${state.appInfo?.version || '1.5.0'}`;
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
      zoom: 1, panX: 0, panY: 0, panning: false, panStart: null, panOrigin: null, initialized: false
    },
    whiteboard: {
      name: 'whiteboard', canvasId: 'whiteboardCanvas', contentId: 'whiteboardContent', stageId: 'whiteboardStage',
      color: '#263b50', width: 5, eraser: false, tool: 'pen', drawing: false, last: null,
      zoom: 1, panX: 0, panY: 0, panning: false, panStart: null, panOrigin: null, initialized: false
    }
  };

  function applyBoardTransform(board) {
    const content = document.getElementById(board.contentId);
    if (content) content.style.transform = `translate(${board.panX}px, ${board.panY}px) scale(${board.zoom})`;
    const label = document.querySelector(`[data-zoom-label="${board.name}"]`);
    if (label) label.textContent = `${Math.round(board.zoom * 100)}%`;
  }

  function changeBoardZoom(board, action) {
    if (action === 'reset') {
      board.zoom = 1;
      board.panX = 0;
      board.panY = 0;
    } else {
      const next = board.zoom + (action === 'in' ? 0.2 : -0.2);
      board.zoom = Math.max(0.5, Math.min(3, Number(next.toFixed(2))));
    }
    applyBoardTransform(board);
  }

  function setMoveTool(active) {
    const board = activeDrawingState();
    board.tool = active ? 'move' : 'pen';
    board.eraser = false;
    board.panning = false;
    const scope = state.page === 'whiteboard' ? '#page-whiteboard' : '#page-camera';
    $$('[data-draw-tool="move"]', $(scope)).forEach((button) => button.classList.toggle('is-active', active));
    $$('[data-draw-tool="eraser"]', $(scope)).forEach((button) => button.classList.remove('is-active'));
    $$('.drawing-color', $(scope)).forEach((button) => button.classList.toggle('is-active', !active && button.dataset.drawColor === board.color));
    const stage = document.getElementById(board.stageId);
    if (stage) stage.classList.toggle('is-move-tool', active);
    if (active) applyBoardTransform(board);
  }

  function activeDrawingState() {
    return state.page === 'whiteboard' ? drawingState.whiteboard : drawingState.camera;
  }

  function resizeDrawingCanvas(board) {
    const canvas = document.getElementById(board.canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
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
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (board.tool === 'move') {
        board.panning = true;
        board.panStart = { x: event.clientX, y: event.clientY };
        board.panOrigin = { x: board.panX, y: board.panY };
        document.getElementById(board.stageId)?.classList.add('is-panning');
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
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = board.width;
    ctx.globalCompositeOperation = board.eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = board.color;
    ctx.fillStyle = board.color;
    return ctx;
  }

  function drawDot(board, point) {
    const ctx = drawingContext(board);
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x / (window.devicePixelRatio || 1), point.y / (window.devicePixelRatio || 1), board.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStroke(board, from, to) {
    const ctx = drawingContext(board);
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.beginPath();
    ctx.moveTo(from.x / dpr, from.y / dpr);
    ctx.lineTo(to.x / dpr, to.y / dpr);
    ctx.stroke();
    ctx.restore();
  }

  function setDrawingColor(color) {
    const board = activeDrawingState();
    board.eraser = false;
    board.tool = 'pen';
    board.color = color;
    const scope = state.page === 'whiteboard' ? '#page-whiteboard' : '#page-camera';
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
    const scope = state.page === 'whiteboard' ? '#page-whiteboard' : '#page-camera';
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
      const constraints = {
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.cameraStream = stream;
      const video = $('#cameraVideo');
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      const empty = $('#cameraEmpty');
      if (empty) empty.hidden = true;
      const liveBadge = $('#cameraLiveBadge');
      if (liveBadge) liveBadge.hidden = false;
      const track = stream.getVideoTracks()[0];
      state.cameraDeviceId = track?.getSettings?.().deviceId || deviceId || '';
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
    const empty = $('#cameraEmpty');
    if (empty) empty.hidden = false;
    const liveBadge = $('#cameraLiveBadge');
    if (liveBadge) liveBadge.hidden = true;
    state.cameraAutoStarted = false;
    cameraStatus('摄像头已停止', false);
  }

  function renderCamera() {
    initDrawingBoard(drawingState.camera);
    requestAnimationFrame(() => resizeDrawingCanvas(drawingState.camera));
    if (!state.cameraAutoStarted) {
      state.cameraAutoStarted = true;
      refreshCameraDevices().then(() => startCamera(state.cameraDeviceId));
    }
  }

  /* ---------------- 白板 ---------------- */

  function renderWhiteboard() {
    initDrawingBoard(drawingState.whiteboard);
    requestAnimationFrame(() => resizeDrawingCanvas(drawingState.whiteboard));
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
      fillBrowserCredentials(false);
      window.setTimeout(() => fillBrowserCredentials(false), 1400);
    });
    webview.addEventListener('did-finish-load', () => {
      hideLoading();
      syncAddress();
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
      const result = await api.downloadUpdate({ url: info.assetUrl, name: info.assetName });
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

    $$('[data-browser-back]').forEach((button) => button.addEventListener('click', () => browserNavigate('back')));
    $$('[data-browser-forward]').forEach((button) => button.addEventListener('click', () => browserNavigate('forward')));
    $$('[data-browser-reload]').forEach((button) => button.addEventListener('click', () => browserNavigate('reload')));
    $$('[data-browser-home]').forEach((button) => button.addEventListener('click', () => browserNavigate('home')));
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
    const cameraDeviceSelect = $('#cameraDeviceSelect');
    if (cameraDeviceSelect) cameraDeviceSelect.addEventListener('change', () => startCamera(cameraDeviceSelect.value));
    const cameraFullscreen = $('#cameraFullscreen');
    if (cameraFullscreen) {
      cameraFullscreen.addEventListener('click', () => {
        const stage = $('#cameraStage');
        if (stage?.requestFullscreen) stage.requestFullscreen().catch(() => showToast('无法进入全屏', { type: 'warn' }));
      });
    }
    const cameraPenWidth = $('#cameraPenWidth');
    if (cameraPenWidth) {
      cameraPenWidth.addEventListener('input', () => { drawingState.camera.width = Number(cameraPenWidth.value) || 4; });
    }
    const whiteboardPenWidth = $('#whiteboardPenWidth');
    if (whiteboardPenWidth) {
      whiteboardPenWidth.addEventListener('input', () => { drawingState.whiteboard.width = Number(whiteboardPenWidth.value) || 5; });
    }
    const whiteboardFullscreen = $('#whiteboardFullscreen');
    if (whiteboardFullscreen) {
      whiteboardFullscreen.addEventListener('click', () => {
        const stage = $('#whiteboardStage');
        if (stage?.requestFullscreen) stage.requestFullscreen().catch(() => showToast('无法进入全屏', { type: 'warn' }));
      });
    }
    const whiteboardSave = $('#whiteboardSave');
    if (whiteboardSave) whiteboardSave.addEventListener('click', saveWhiteboardImage);

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
    grid.innerHTML = DATA.catalog.map((subject) => `<button type="button" class="subject-vote-card" data-vote-subject="${subject.id}" style="--subject-color:${subject.color}">
      <span class="subject-vote-mark">${esc(subject.short)}</span>
      <strong>${esc(subject.name)}</strong>
      <span>投一票</span>
    </button>`).join('');
  }

  async function voteForSubject(subjectId) {
    const subject = DATA.subjectById[subjectId];
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
    const rows = DATA.catalog.map((subject) => ({
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

  function weightedStudentPick() {
    const pool = state.students;
    if (!pool.length) return null;
    const totalWeight = pool.reduce((sum, student) => sum + Math.max(1, Number(student.weight) || 1), 0);
    let ticket = Math.random() * totalWeight;
    for (const student of pool) {
      ticket -= Math.max(1, Number(student.weight) || 1);
      if (ticket <= 0) return student;
    }
    return pool[pool.length - 1];
  }

  function pickRandomStudent() {
    if (state.studentSpinning) return;
    if (!state.students.length) {
      showToast('请先导入学生名单。', { type: 'warn' });
      importStudentList();
      return;
    }
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
        const picked = weightedStudentPick();
        if (!picked) {
          state.studentSpinning = false;
          if (button) button.disabled = false;
          return;
        }
        picked.pickedCount = (Number(picked.pickedCount) || 0) + 1;
        picked.lastPickedAt = new Date().toISOString();
        state.lastPickedStudent = picked.name;
        state.studentSpinning = false;
        if (nameNode) {
          nameNode.textContent = picked.name;
          nameNode.classList.remove('is-spinning');
        }
        if (button) button.disabled = false;
        const hint = $('#studentPickHint');
        if (hint) hint.textContent = `请 ${picked.name} 回答问题`;
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
    ui.modalLayer.innerHTML = `<div class="modal" style="width:540px" role="dialog" aria-modal="true" aria-labelledby="studentWeightsTitle">
      <header class="modal-header">
        <span class="modal-icon">${icon('users')}</span>
        <div class="modal-heading"><h2 id="studentWeightsTitle">调整学生选中率</h2><p>权重 1—20，数字越大被抽中的概率越高；修改后保存。</p></div>
        <button type="button" class="icon-button" data-close-modal aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-body">
        <div class="student-weight-table">${state.students.map((student) => `<div class="student-weight-row">
          <span title="${attr(student.name)}">${esc(student.name)}</span>
          <input class="student-weight-input" type="number" min="1" max="20" value="${Math.max(1, Number(student.weight) || 1)}" data-student-weight="${attr(student.id)}" aria-label="${attr(student.name)} 的选中权重">
          <small>${student.pickedCount || 0} 次</small>
        </div>`).join('')}</div>
      </div>
      <footer class="modal-footer">
        <span class="modal-footer-note">${icon('shield')}默认权重均为 1</span>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-light" data-close-modal>取消</button>
          <button type="button" class="btn btn-primary" id="saveStudentWeights">保存权重</button>
        </div>
      </footer>
    </div>`;
    ui.modalLayer.hidden = false;
  }

  async function saveStudentWeights() {
    $$('[data-student-weight]').forEach((input) => {
      const student = state.students.find((entry) => entry.id === input.dataset.studentWeight);
      if (student) student.weight = Math.max(1, Math.min(20, Math.floor(Number(input.value) || 1)));
    });
    const ok = await persistLibrary();
    if (!ok) return;
    closeModal();
    renderStudents();
    showToast('学生选中权重已保存。', { type: 'success', title: '后台设置已更新' });
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
            <li><strong>内置浏览器</strong>：默认打开 zz8zszy.cn，地址栏可访问其他网址；可在右侧加密保存账号密码，登录页自动填充。</li>
            <li><strong>展台 / 白板</strong>：自动连接摄像头并可全屏投放，支持缩放、鼠标移动、多色批画、橡皮；全屏时右上角可退出，白板可保存 PNG。</li>
            <li><strong>科目投票</strong>：每天按日期为学科投票，查看结果需要管理员密码。</li>
            <li><strong>随机点名</strong>：导入 Excel/CSV 名单，按可调权重随机抽取学生；后台设置需要管理员密码。</li>
            <li><strong>课程表</strong>：直接修改节次、时间和课程，周六/周日可切换 A 表/B 表。</li>
            <li><strong>U 盘检测</strong>：检查可疑可执行文件、伪装文档和 autorun 项，也可调用 Windows Defender。</li>
            <li><strong>检查更新</strong>：右上角刷新图标，或「数据管理 → 关于系统 → 检查更新」。</li>
          </ul>
          <div class="help-tip">建议定期在「数据管理」中导出数据备份。备份包含课件索引、学科提问、课程表与分类信息，不包含课件原文件。</div>
          <div class="help-team">
            <img src="../assets/school-badge.png" alt="枣庄八中校徽">
            <div class="help-team-copy">
              <strong>制作团队</strong>
              <span>开发者：陈凯阳　技术支持：孙浩翔</span>
              <span>关键词提供：桑晨皓、任泽昱　使用 AI：Deepseek-V4.1-Flash</span>
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
    if (state.page === 'camera' && page !== 'camera') stopCamera();
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
      app: '枣庄八中高中课件管理系统',
      formatVersion: 4,
      school: '枣庄市第八中学',
      exportedAt: new Date().toISOString(),
      settings: { ...state.settings, initialized: true },
      items: state.items,
      questions: state.questions,
      timetable: state.timetable,
      subjectVotes: state.subjectVotes,
      students: state.students
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

    const voteSubjectButton = event.target.closest('[data-vote-subject]');
    if (voteSubjectButton) {
      voteForSubject(voteSubjectButton.dataset.voteSubject);
      return;
    }

    const drawColorButton = event.target.closest('[data-draw-color]');
    if (drawColorButton && (state.page === 'camera' || state.page === 'whiteboard')) {
      setDrawingColor(drawColorButton.dataset.drawColor);
      return;
    }

    const moveToolButton = event.target.closest('[data-draw-tool="move"]');
    if (moveToolButton && (state.page === 'camera' || state.page === 'whiteboard')) {
      setMoveTool(activeDrawingState().tool !== 'move');
      return;
    }

    const eraserButton = event.target.closest('[data-draw-tool="eraser"]');
    if (eraserButton && (state.page === 'camera' || state.page === 'whiteboard')) {
      setEraser(!activeDrawingState().eraser);
      return;
    }

    if (event.target.closest('[data-draw-clear]') && (state.page === 'camera' || state.page === 'whiteboard')) {
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
      state.settings = result.settings && typeof result.settings === 'object' ? result.settings : {};
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
  }

  initApp();
})();
