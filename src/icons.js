/* 线性图标集：全部使用内联 SVG，离线可用 */
(function () {
  'use strict';

  const P = {
    grid: '<rect x="3.4" y="3.4" width="7" height="7" rx="1.7"/><rect x="13.6" y="3.4" width="7" height="7" rx="1.7"/><rect x="3.4" y="13.6" width="7" height="7" rx="1.7"/><rect x="13.6" y="13.6" width="7" height="7" rx="1.7"/>',
    book: '<path d="M12 6.6C10.6 4.9 8.3 4.1 5.4 4.1H3.1v14.2h2.6c2.5 0 4.6.8 6.3 2.3 1.7-1.5 3.8-2.3 6.3-2.3h2.6V4.1h-2.3c-2.9 0-5.2.8-6.6 2.5Z"/><path d="M12 6.6v14"/>',
    bookOpen: '<path d="M12 6.6C10.6 4.9 8.3 4.1 5.4 4.1H3.1v14.2h2.6c2.5 0 4.6.8 6.3 2.3 1.7-1.5 3.8-2.3 6.3-2.3h2.6V4.1h-2.3c-2.9 0-5.2.8-6.6 2.5Z"/><path d="M12 6.6v14"/><path d="m17.5 2.2.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7Z"/>',
    layers: '<path d="m12 3.4 8.5 4.5-8.5 4.5L3.5 7.9 12 3.4Z"/><path d="m4.2 12 7.8 4.2 7.8-4.2"/><path d="m4.2 16 7.8 4.2 7.8-4.2"/>',
    database: '<ellipse cx="12" cy="5.4" rx="8.1" ry="3.1"/><path d="M3.9 5.4v6.2c0 1.7 3.6 3.1 8.1 3.1s8.1-1.4 8.1-3.1V5.4"/><path d="M3.9 11.6v6.2c0 1.7 3.6 3.1 8.1 3.1s8.1-1.4 8.1-3.1v-6.2"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.1v5.2l3.4 2"/>',
    star: '<path d="m12 3.3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9L12 3.3Z"/>',
    alert: '<path d="M10.3 4.1 2.8 17.1a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 16.6h.01"/>',
    hardDrive: '<rect x="2.8" y="4.2" width="18.4" height="15.6" rx="2.5"/><path d="M2.8 13.2h18.4"/><path d="M6.3 16.6h.01"/><path d="M9.8 16.6h.01"/>',
    spark: '<path d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7L12 3Z"/><path d="m18.7 14.6.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z"/>',
    search: '<circle cx="10.9" cy="10.9" r="7.1"/><path d="m16.2 16.2 4.4 4.4"/>',
    help: '<circle cx="12" cy="12" r="8.7"/><path d="M9.6 9.1a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.7"/><path d="M12 17h.01"/>',
    upload: '<path d="M12 15.3V4.1"/><path d="m7.7 8.3 4.3-4.2 4.3 4.2"/><path d="M4.4 14.6v3.7a2.1 2.1 0 0 0 2.1 2.1h11a2.1 2.1 0 0 0 2.1-2.1v-3.7"/>',
    download: '<path d="M12 4.1v11.2"/><path d="m7.7 11.2 4.3 4.2 4.3-4.2"/><path d="M4.4 14.6v3.7a2.1 2.1 0 0 0 2.1 2.1h11a2.1 2.1 0 0 0 2.1-2.1v-3.7"/>',
    arrowRight: '<path d="M4.4 12h15.2"/><path d="m14.4 6.8 5.2 5.2-5.2 5.2"/>',
    arrowLeft: '<path d="M19.6 12H4.4"/><path d="M9.6 6.8 4.4 12l5.2 5.2"/>',
    files: '<path d="M8.3 3.1h6.9l4.1 4.1v11.3a2 2 0 0 1-2 2H8.3a2 2 0 0 1-2-2V5.1a2 2 0 0 1 2-2Z"/><path d="M15 3.3v4.2h4.2"/><path d="M4.2 7.1v11.8a2 2 0 0 0 2 2h8.2"/>',
    subject: '<circle cx="12" cy="8.1" r="3.2"/><path d="M5.4 20.2c.3-3.8 3-6.2 6.6-6.2s6.3 2.4 6.6 6.2"/><path d="M3.8 5.2h2.1M18.1 5.2h2.1"/>',
    info: '<circle cx="12" cy="12" r="8.7"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>',
    close: '<path d="m5.5 5.5 13 13"/><path d="m18.5 5.5-13 13"/>',
    plus: '<path d="M12 4.5v15"/><path d="M4.5 12h15"/>',
    chevronDown: '<path d="m5.8 9.1 6.2 6.2 6.2-6.2"/>',
    chevronRight: '<path d="m9.1 5.8 6.2 6.2-6.2 6.2"/>',
    list: '<path d="M8.8 6.3h11"/><path d="M8.8 12h11"/><path d="M8.8 17.7h11"/><path d="M4.2 6.3h.01"/><path d="M4.2 12h.01"/><path d="M4.2 17.7h.01"/>',
    tag: '<path d="M20.1 13.2 13.3 20a2 2 0 0 1-2.8 0L3.7 13.2a2 2 0 0 1-.6-1.4V4.6a1.6 1.6 0 0 1 1.6-1.6h7.2a2 2 0 0 1 1.4.6l6.8 6.8a2 2 0 0 1 0 2.8Z"/><path d="M7.8 7.8h.01"/>',
    sheet: '<rect x="3.4" y="3.9" width="17.2" height="16.2" rx="2"/><path d="M3.4 9.2h17.2"/><path d="M3.4 14.6h17.2"/><path d="M9.2 9.2v10.9"/><path d="M15 9.2v10.9"/>',
    sparkles: '<path d="m12 3.2 1.5 4.2 4.2 1.5-4.2 1.5L12 14.6l-1.5-4.2-4.2-1.5 4.2-1.5L12 3.2Z"/><path d="m18.8 14.3.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/><path d="m5.2 15 .5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z"/>',
    trash: '<path d="M4.2 6.6h15.6"/><path d="M9 3.9h6l.8 2.7H8.2L9 3.9Z"/><path d="m18.1 6.6-.8 13a1.9 1.9 0 0 1-1.9 1.8H8.6a1.9 1.9 0 0 1-1.9-1.8l-.8-13"/><path d="M10 10.6v6.5"/><path d="M14 10.6v6.5"/>',
    copy: '<rect x="8.8" y="8.8" width="11.4" height="11.4" rx="2"/><path d="M5.2 15.2a2 2 0 0 1-1.4-2V5.6a2 2 0 0 1 2-2h8.2a2 2 0 0 1 2 1.4"/>',
    folder: '<path d="M3.3 6.7a2 2 0 0 1 2-2h4.1l2.2 2.5h7.1a2 2 0 0 1 2 2v9.1a2 2 0 0 1-2 2H5.3a2 2 0 0 1-2-2V6.7Z"/>',
    shield: '<path d="M12 3 4.8 6v5.4c0 4.6 3 7.7 7.2 9.6 4.2-1.9 7.2-5 7.2-9.6V6L12 3Z"/><path d="m9.1 12 1.9 1.9 3.9-3.9"/>',
    check: '<path d="m4.8 12.4 4.6 4.6L19.2 7.2"/>',
    more: '<circle cx="5.2" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="18.8" cy="12" r="1.1"/>',
    edit: '<path d="M13.4 5.5 18.5 10.6"/><path d="m4.2 19.8 1-4.8L15.8 4.4a2.1 2.1 0 0 1 3 0l.8.8a2.1 2.1 0 0 1 0 3L9 18.8l-4.8 1Z"/>',
    external: '<path d="M14 4.2h5.8V10"/><path d="m19.8 4.2-8.4 8.4"/><path d="M18.4 13.8v4.2a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2h4.2"/>',
    play: '<circle cx="12" cy="12" r="8.8"/><path d="m10 8.4 5.4 3.6-5.4 3.6V8.4Z"/>',
    file: '<path d="M6.2 3.4h7.4l4.2 4.2v12.9H6.2V3.4Z"/><path d="M13.4 3.6v4.3h4.3"/>',
    presentation: '<rect x="3.6" y="4.2" width="16.8" height="11.4" rx="1.8"/><path d="M12 15.6v3.3"/><path d="m8.6 21 3.4-3.4 3.4 3.4"/><path d="M7.4 8.2h4.2"/><path d="M7.4 11.2h6.6"/>',
    doc: '<path d="M6.2 3.4h7.4l4.2 4.2v12.9H6.2V3.4Z"/><path d="M13.4 3.6v4.3h4.3"/><path d="M8.7 11.4h6.4"/><path d="M8.7 14.3h6.4"/><path d="M8.7 17.2h4.1"/>',
    pdf: '<path d="M6.2 3.4h7.4l4.2 4.2v12.9H6.2V3.4Z"/><path d="M13.4 3.6v4.3h4.3"/><path d="M8.4 17.6v-4.2h1.2a1.2 1.2 0 0 1 0 2.4H8.4"/><path d="M13 13.4h2.2"/><path d="M13 15.2h1.7"/><path d="M13 17.2v-3.8"/>',
    video: '<rect x="3.2" y="5.1" width="13.7" height="13.8" rx="2.4"/><path d="m16.9 10 3.9-2.3v8.6L16.9 14"/><path d="m8.7 9.2 3.2 2.8-3.2 2.8V9.2Z"/>',
    image: '<rect x="3.3" y="4.2" width="17.4" height="15.6" rx="2.1"/><circle cx="8.6" cy="9.3" r="1.7"/><path d="m4.3 17.7 4.8-4.5 3.1 2.8 3.5-3.8 4.7 5.2"/>',
    music: '<path d="M9.2 17.2V6.1l9-2v10.6"/><circle cx="6.4" cy="18.1" r="2.8"/><circle cx="15.4" cy="16.2" r="2.8"/>',
    archive: '<path d="M4.1 7.5h15.8v11a2 2 0 0 1-2 2H6.1a2 2 0 0 1-2-2v-11Z"/><path d="M3.2 3.5h17.6v4H3.2z"/><path d="M10 12.2h4"/>',
    text: '<path d="M5.7 4.2h12.6"/><path d="M12 4.2v15.6"/><path d="M8.4 19.8h7.2"/><path d="M8.2 9.3h7.6"/>',
    gridView: '<rect x="3.6" y="3.6" width="7.1" height="7.1" rx="1.4"/><rect x="13.3" y="3.6" width="7.1" height="7.1" rx="1.4"/><rect x="3.6" y="13.3" width="7.1" height="7.1" rx="1.4"/><rect x="13.3" y="13.3" width="7.1" height="7.1" rx="1.4"/>',
    listView: '<path d="M9.1 5.5h10.7"/><path d="M9.1 12h10.7"/><path d="M9.1 18.5h10.7"/><rect x="3.7" y="4.2" width="2.7" height="2.7" rx=".7"/><rect x="3.7" y="10.7" width="2.7" height="2.7" rx=".7"/><rect x="3.7" y="17.2" width="2.7" height="2.7" rx=".7"/>',
    filter: '<path d="M4 5.2h16L14 12.5v6.1l-4 1.9v-8L4 5.2Z"/>',
    eye: '<path d="M2.7 12S6 5.8 12 5.8 21.3 12 21.3 12 18 18.2 12 18.2 2.7 12 2.7 12Z"/><circle cx="12" cy="12" r="3.1"/>',
    refresh: '<path d="M20.2 8.2A8.5 8.5 0 1 0 21 14"/><path d="M20.4 3.7v4.8h-4.8"/>',
    calendar: '<rect x="3.6" y="5.1" width="16.8" height="15.5" rx="2.1"/><path d="M3.8 9.6h16.4"/><path d="M8 3.4v3.4"/><path d="M16 3.4v3.4"/><path d="M8 13.3h.01"/><path d="M12 13.3h.01"/><path d="M16 13.3h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/>',
    globe: '<circle cx="12" cy="12" r="8.8"/><path d="M3.4 12h17.2"/><path d="M12 3.2c2.3 2.4 3.5 5.4 3.5 8.8S14.3 18.4 12 20.8c-2.3-2.4-3.5-5.4-3.5-8.8S9.7 5.6 12 3.2Z"/>',
    languages: '<path d="M4.2 5.7h8.1"/><path d="M8.2 3.6v2.1c0 4.6-2.4 7.4-5.1 8.8"/><path d="M5.2 9.4c1.5 2.4 3.7 4 6.5 4.7"/><path d="m13.5 20.2 4.2-10.6 4.2 10.6"/><path d="M15.1 16.2h5.2"/>',
    camera: '<path d="M4.2 7.5h3.1l1.3-2.1h6.8l1.3 2.1h3.1a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H4.2a1.8 1.8 0 0 1-1.8-1.8V9.3a1.8 1.8 0 0 1 1.8-1.8Z"/><circle cx="12" cy="13.1" r="3.3"/>',
    vote: '<path d="M5.2 20V10.1"/><path d="M12 20V4.2"/><path d="M18.8 20v-6.8"/><path d="m4.2 7.2 5-3.1 4.4 2.5 5.8-4"/><path d="M19.4 2.6v3.2h-3.2"/>',
    hand: '<path d="M8 11.2V6.8a1.5 1.5 0 0 1 3 0v3.5"/><path d="M11 10V5.8a1.5 1.5 0 0 1 3 0V10"/><path d="M14 10V7a1.5 1.5 0 0 1 3 0v5.6c0 3.8-2.4 6.4-6.1 6.4h-1.1c-2.2 0-3.7-1.2-4.8-2.9l-2.2-3.5a1.5 1.5 0 0 1 2.4-1.7L8 11.2"/>',
    users: '<circle cx="9" cy="8.2" r="3.1"/><path d="M3.1 20c.2-3.8 2.6-6.2 5.9-6.2s5.7 2.4 5.9 6.2"/><path d="M15.1 5.5a3 3 0 0 1 0 5.8"/><path d="M16.2 13.9c2.7.4 4.6 2.5 5 5.6"/>',
    chat: '<path d="M20.8 11.6a7.7 7.7 0 0 1-8.2 7.1 8.8 8.8 0 0 1-3.1-.7L4.1 20l1.5-4.6a7.1 7.1 0 0 1-1.1-3.8 7.7 7.7 0 0 1 8.1-7.1 7.8 7.8 0 0 1 8.2 7.1Z"/><path d="M8.2 11.4h.01"/><path d="M12 11.4h.01"/><path d="M15.8 11.4h.01"/>',
    lock: '<rect x="4.4" y="10.1" width="15.2" height="10.4" rx="2.2"/><path d="M8 10.1V7.4a4 4 0 0 1 8 0v2.7"/><path d="M12 14.2v2.4"/>',
    monitor: '<rect x="3.2" y="4.1" width="17.6" height="12.1" rx="2"/><path d="M8.2 20h7.6"/><path d="M12 16.2V20"/>',
    phone: '<rect x="6.4" y="2.7" width="11.2" height="18.6" rx="2.6"/><path d="M10.4 5.3h3.2"/><path d="M11.1 18.5h1.8"/>',
    rotate: '<path d="M20.1 11.2a8.1 8.1 0 1 0-2 6.2"/><path d="M20.2 5.2v6h-6"/>',
    flip: '<path d="M12 3.2v17.6"/><path d="M8.6 6.1 3.4 12l5.2 5.9V6.1Z"/><path d="m15.4 6.1 5.2 5.9-5.2 5.9V6.1Z"/>',
    game: '<path d="M7.4 7.3h9.2a5.3 5.3 0 0 1 5.1 4 18 18 0 0 1 .4 4.7 2.5 2.5 0 0 1-4.2 1.8l-2-1.6H8.1l-2 1.6a2.5 2.5 0 0 1-4.2-1.8 18 18 0 0 1 .4-4.7 5.3 5.3 0 0 1 5.1-4Z"/><path d="M7.6 10.3v3.2"/><path d="M6 11.9h3.2"/><path d="M15.7 11.2h.01"/><path d="M17.7 13.1h.01"/>',
    trophy: '<path d="M8 4.2h8v4.1a4 4 0 0 1-8 0V4.2Z"/><path d="M8 5.2H4.5v1.6A3.1 3.1 0 0 0 7.6 10"/><path d="M16 5.2h3.5v1.6A3.1 3.1 0 0 1 16.4 10"/><path d="M12 12.3v4.2"/><path d="M8.2 20h7.6"/><path d="M9.5 20v-2.3h5V20"/>',
    wifi: '<path d="M3.2 9.1a13 13 0 0 1 17.6 0"/><path d="M6.4 12.5a8.2 8.2 0 0 1 11.2 0"/><path d="M9.6 15.8a3.5 3.5 0 0 1 4.8 0"/><path d="M12 19.3h.01"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.8"/><path d="m8.2 12.1 2.5 2.5 5.1-5.1"/>',
    xCircle: '<circle cx="12" cy="12" r="8.8"/><path d="m9.2 9.2 5.6 5.6"/><path d="m14.8 9.2-5.6 5.6"/>',
    link: '<path d="M9.7 14.3 14.3 9.7"/><path d="M7.5 16.5 5.8 18.2a3.2 3.2 0 0 1-4.5-4.5l3.4-3.4a3.2 3.2 0 0 1 4.5 0"/><path d="m16.5 7.5 1.7-1.7a3.2 3.2 0 0 1 4.5 4.5l-3.4 3.4a3.2 3.2 0 0 1-4.5 0"/>',
    minus: '<path d="M5 12h14"/>'
  };

  function icon(name, extraClass) {
    const path = P[name] || P.file;
    return `<svg class="icon-svg${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach((el) => {
      if (el.querySelector('svg')) return;
      el.innerHTML = icon(el.getAttribute('data-icon'));
    });
  }

  window.ZZBZ_ICONS = { paths: P, icon, hydrateIcons };
})();
