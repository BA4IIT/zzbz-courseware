/* 根据文件名与文件夹路径自动识别学科、教材、章节和课程分类 */
(function () {
  'use strict';

  const DATA = window.ZZBZ_DATA;
  const SEP_RE = /[\s\u3000_\-—–·.，,。;；:：/\\()[\]{}【】<>《》"'“”‘’+]/g;

  const SUBJECT_ALIASES = {
    chinese: ['语文', '语文学科', '高中语文'],
    math: ['数学', '数学学科', '高中数学'],
    english: ['英语', '英文', 'english', '高中英语'],
    physics: ['物理', '物理学科', '高中物理'],
    chemistry: ['化学', '化学学科', '高中化学'],
    biology: ['生物', '生物学', '高中生物'],
    politics: ['政治', '思想政治', '道德与法治', '高中政治'],
    history: ['历史', '历史学科', '高中历史'],
    geography: ['地理', '地理学科', '高中地理']
  };

  const TYPE_PATTERNS = [
    { id: 'exam', re: /(试卷|试题|考卷|答题卡|讲评|错题|答案|质量检测|月考试题)/i },
    { id: 'open', re: /(公开课|示范课|优质课|观摩课|展示课|赛课|同课异构)/i },
    { id: 'experiment', re: /(实验|演示实验|探究活动|动手操作|实验报告)/i },
    { id: 'micro', re: /(微课|微视频|微讲解|知识点讲解|三分钟|五分钟)/i },
    { id: 'examprep', re: /(专题|备考|一轮|二轮|三轮|冲刺|高考复习|考点突破)/i },
    { id: 'exercise', re: /(习题|练习|作业|训练|例题|变式|当堂检测|限时练)/i },
    { id: 'review', re: /(复习|总结|知识梳理|思维导图|归纳|单元整理|章末)/i }
  ];

  const NUM_CHARS = '零一二三四五六七八九十';
  const DIGIT_CHARS = '0123456789';

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(SEP_RE, '')
      .replace(/\u00a0/g, '');
  }

  function normalizeDigits(value) {
    return String(value || '').replace(/[零一二三四五六七八九十]/g, (ch) => {
      if (ch === '十') return '10';
      if (ch === '零') return '0';
      return String(NUM_CHARS.indexOf(ch));
    });
  }

  function addNumericVariants(set, value) {
    if (!value) return;
    set.add(value);
    let withDigits = value;
    for (let i = 1; i <= 10; i += 1) {
      const ch = NUM_CHARS[i];
      if (value.includes(ch)) withDigits = withDigits.split(ch).join(String(i));
    }
    set.add(withDigits);
    let withChinese = value;
    for (let i = 1; i <= 10; i += 1) {
      withChinese = withChinese.split(String(i)).join(NUM_CHARS[i]);
    }
    set.add(withChinese);
    [value, withDigits, withChinese].forEach((v) => {
      set.add(v.replace(/第/g, ''));
      set.add(v.replace(/册$/g, ''));
      set.add(v.replace(/第/g, '').replace(/册$/g, ''));
    });
  }

  const BOOK_ALIAS_CACHE = new Map();

  function bookAliases(book) {
    if (BOOK_ALIAS_CACHE.has(book.id)) return BOOK_ALIAS_CACHE.get(book.id);
    const set = new Set();
    const names = [book.name, book.subtitle || ''];
    if (book.subtitle) names.push(`${book.name}${book.subtitle}`);
    names.forEach((name) => {
      if (!name) return;
      addNumericVariants(set, name.replace(/\s+/g, ''));
      addNumericVariants(set, name.replace(/[（(].*?[）)]/g, '').replace(/\s+/g, ''));
      if (name.includes('选择性必修')) {
        const replaced = name.replace(/选择性必修/g, '选必').replace(/\s+/g, '');
        addNumericVariants(set, replaced);
      }
      if (name.includes('中外历史纲要')) {
        set.add(name.replace(/[（(].*?[）)]/g, '').replace(/\s+/g, ''));
      }
    });
    if (book.name.includes('选择性必修')) {
      set.add(book.name.replace(/选择性必修/g, '选必').replace(/\s+/g, ''));
    }
    const aliases = [...set]
      .map(normalize)
      .filter((alias) => alias.length >= 3 && !/^\d+$/.test(alias))
      .sort((a, b) => b.length - a.length);
    BOOK_ALIAS_CACHE.set(book.id, aliases);
    return aliases;
  }

  function detectSubject(pathText) {
    const normalized = normalize(pathText);
    let best = null;
    Object.entries(SUBJECT_ALIASES).forEach(([id, aliases]) => {
      aliases.forEach((alias) => {
        const key = normalize(alias);
        if (!key) return;
        if (normalized.includes(key)) {
          const score = key.length;
          if (!best || score > best.score) best = { id, score, alias };
        }
      });
    });
    return best;
  }

  function detectBook(pathText, subjectId) {
    const normalized = normalize(pathText);
    const candidates = subjectId ? DATA.subjectById[subjectId].books : DATA.books;
    let best = null;
    candidates.forEach((book) => {
      bookAliases(book).forEach((alias) => {
        if (normalized.includes(alias)) {
          const score = alias.length + (book.subtitle && normalized.includes(normalize(book.subtitle)) ? 8 : 0);
          if (!best || score > best.score) best = { book, score, alias };
        }
      });
    });
    return best;
  }

  function chapterPrefix(chapterName) {
    const text = String(chapterName || '');
    const match = text.match(/^(第[零一二三四五六七八九十百0-9]+[单元章节讲课]|Unit\s*[0-9]+|Welcome\s*Unit)/i);
    if (match) return match[0];
    const firstPart = text.split(/[\s·:：]/)[0];
    return firstPart && firstPart.length >= 3 && firstPart !== text ? firstPart : '';
  }

  function detectChapter(book, pathText) {
    if (!book) return null;
    const normalized = normalize(pathText);
    const normalizedDigits = normalize(normalizeDigits(pathText));
    let best = null;
    book.chapters.forEach((chapter) => {
      const full = normalize(chapter.name);
      const fullDigits = normalize(normalizeDigits(chapter.name));
      let score = 0;
      if (full && normalized.includes(full)) score = 100 + full.length;
      else if (fullDigits && normalizedDigits.includes(fullDigits)) score = 90 + fullDigits.length;
      else {
        const prefix = chapterPrefix(chapter.name);
        if (prefix) {
          const key = normalize(prefix);
          const keyDigits = normalize(normalizeDigits(prefix));
          if (key && normalized.includes(key)) score = 60 + key.length;
          else if (keyDigits && normalizedDigits.includes(keyDigits)) score = 55 + keyDigits.length;
        }
      }
      if (score && (!best || score > best.score)) best = { chapter, score };
    });
    return best ? best.chapter : null;
  }

  function detectType(pathText) {
    const text = String(pathText || '');
    for (const pattern of TYPE_PATTERNS) {
      if (pattern.re.test(text)) return DATA.typeById[pattern.id] || null;
    }
    return null;
  }

  function detectGrade(pathText) {
    const text = String(pathText || '');
    const match = text.match(/高[一二三]|高一|高二|高三|10年级|11年级|12年级/);
    if (!match) return '';
    const value = match[0];
    if (value === '高一' || value === '10年级') return '高一';
    if (value === '高二' || value === '11年级') return '高二';
    if (value === '高三' || value === '12年级') return '高三';
    return '';
  }

  /**
   * @param {{name:string, relativePath?:string, ext?:string}} file
   * @param {{subjectId?:string, bookId?:string, chapterId?:string, typeId?:string}} defaults
   */
  function classify(file, defaults) {
    const safeDefaults = defaults || {};
    // 同时参考相对路径与完整路径：用户粘贴本机路径批量录入时，
    // 学科、教材和章节往往存在于上级文件夹名中。
    const pathText = `${file.relativePath || ''} ${file.path || ''} ${file.name || ''}`.trim();

    const subjectMatch = detectSubject(pathText);
    let subjectId = subjectMatch ? subjectMatch.id : '';
    let book = null;

    const bookMatch = detectBook(pathText, subjectId || '');
    if (bookMatch) {
      book = bookMatch.book;
      if (!subjectId) subjectId = book.subjectId;
    }

    if (!subjectId && safeDefaults.subjectId) subjectId = safeDefaults.subjectId;
    if (!book && subjectId && safeDefaults.bookId) {
      const candidate = DATA.bookById[safeDefaults.bookId];
      if (candidate && candidate.subjectId === subjectId) book = candidate;
    }

    let chapter = book ? detectChapter(book, pathText) : null;
    if (chapter && subjectId && chapter.subjectId !== subjectId) chapter = null;
    if (!chapter && safeDefaults.chapterId) {
      const candidate = DATA.chapterById[safeDefaults.chapterId];
      if (candidate && (!book || candidate.bookId === book.id)) chapter = candidate;
    }

    let type = detectType(pathText);
    if (!type && safeDefaults.typeId && DATA.typeById[safeDefaults.typeId]) {
      type = DATA.typeById[safeDefaults.typeId];
    }
    if (!type) type = DATA.typeById.new;

    const subjectAuto = Boolean(subjectMatch);
    const bookAuto = Boolean(bookMatch);
    const chapterAuto = Boolean(chapter && sectionDetected(book, pathText, chapter));
    const typeAuto = Boolean(detectType(pathText));
    const grade = detectGrade(pathText) || (book && book.grades[0]) || '';

    return {
      subjectId: subjectId || '',
      bookId: book ? book.id : '',
      chapterId: chapter ? chapter.id : '',
      typeId: type.id,
      grade,
      auto: { subject: subjectAuto, book: bookAuto, chapter: chapterAuto, type: typeAuto },
      confidence: Number(subjectAuto) + Number(bookAuto) + Number(chapterAuto) + Number(typeAuto)
    };
  }

  function sectionDetected(book, pathText, chapter) {
    if (!chapter) return false;
    const normalized = normalize(pathText);
    const full = normalize(chapter.name);
    if (full && normalized.includes(full)) return true;
    const prefix = chapterPrefix(chapter.name);
    if (!prefix) return false;
    return normalized.includes(normalize(prefix));
  }

  window.ZZBZ_DETECT = {
    classify,
    detectSubject,
    detectBook,
    detectChapter,
    detectType,
    detectGrade,
    normalize,
    bookAliases
  };
})();
