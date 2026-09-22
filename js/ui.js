/* ============================================================
   UI 工具层：图标 / Toast / 弹窗 / 标签 / 表格片段 / 状态机
   ============================================================ */
window.UI = (function () {
  'use strict';

  var ICONS = {
    grid: '<rect x="1.8" y="1.8" width="5.2" height="5.2" rx="1"/><rect x="9" y="1.8" width="5.2" height="5.2" rx="1"/><rect x="1.8" y="9" width="5.2" height="5.2" rx="1"/><rect x="9" y="9" width="5.2" height="5.2" rx="1"/>',
    radar: '<path d="M8 1.8 14 6.4 11.7 13.6H4.3L2 6.4z"/><path d="M8 4.6 11.6 7.3 10.3 11.6H5.7L4.4 7.3z"/>',
    form: '<rect x="2.2" y="1.8" width="11.6" height="12.4" rx="1.4"/><path d="M5 5.6h6M5 8h6M5 10.4h3.6"/>',
    check: '<circle cx="8" cy="8" r="6.2"/><path d="M5.4 8.2 7.2 10l3.4-3.6"/>',
    shield: '<path d="M8 1.8 13.2 4v4.2c0 3-2.2 5.2-5.2 6.2-3-1-5.2-3.2-5.2-6.2V4z"/><path d="M6 8.1l1.5 1.5L10.2 7"/>',
    book: '<path d="M2.4 2.8h4.2c1 0 1.4.5 1.4 1.2v9.2c0-.7-.5-1.2-1.4-1.2H2.4z"/><path d="M13.6 2.8H9.4c-1 0-1.4.5-1.4 1.2v9.2c0-.7.5-1.2 1.4-1.2h4.2z"/>',
    search: '<circle cx="7" cy="7" r="4.4"/><path d="M10.4 10.4 14 14"/>',
    download: '<path d="M8 2v8"/><path d="M4.8 7.2 8 10.4l3.2-3.2"/><path d="M2.6 13.2h10.8"/>',
    edit: '<path d="M11.2 2.6l2.2 2.2L5.6 12.6l-2.9.7.7-2.9z"/>',
    warn: '<path d="M8 2 14.4 13.4H1.6z"/><path d="M8 6.4v3.1M8 11.4v.2"/>',
    info: '<circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v4M8 5.1v.2"/>',
    clock: '<circle cx="8" cy="8" r="6.2"/><path d="M8 4.4V8l2.6 1.6"/>',
    lock: '<rect x="3.4" y="7" width="9.2" height="6.6" rx="1.2"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7"/>',
    flow: '<circle cx="3.4" cy="4" r="1.8"/><circle cx="12.6" cy="12" r="1.8"/><path d="M5.2 4h4.4a2 2 0 0 1 2 2v4.4"/>',
    layers: '<path d="M8 1.8 1.8 5 8 8.2 14.2 5z"/><path d="M1.8 8.6 8 11.8l6.2-3.2M1.8 11.6 8 14.8l6.2-3.2"/>',
    todo: '<rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.4"/><path d="M5.2 8l1.9 1.9 3.7-3.9"/>',
    arrowleft: '<path d="M13.5 8h-11"/><path d="M6.8 4.3 3.1 8l3.7 3.7"/>',
    /* 平台级示例菜单图标（与兄弟项目侧栏一致的语义） */
    monitor: '<rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/><path d="M1.5 6h13M6 6v8.5"/>',
    globe: '<circle cx="8" cy="8" r="6.5"/><path d="M8 1.5v13M1.5 8h13"/>',
    alert: '<path d="M8 1.5L15 14H1z"/><path d="M8 6v3.2M8 11.6v.2"/>',
    setting: '<circle cx="8" cy="8" r="1.8"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/>',
    report: '<path d="M2.5 1.5h9l3 3v10h-12z"/><path d="M11.5 1.5v3h3M5 8h6M5 10.5h6M5 13h4"/>',
    link: '<path d="M4.5 11.5v-7a1.5 1.5 0 0 1 3 0v6M4.5 7h3a1.5 1.5 0 0 0 0-3M4.5 11.5a1.5 1.5 0 0 0 0 3h7a1.5 1.5 0 0 0 0-3h-3a1.5 1.5 0 0 0 0 3"/>'
  };
  function icon(name, size) {
    size = size || 15;
    return '<svg viewBox="0 0 16 16" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(n, d) {
    if (n == null || isNaN(n)) { return '—'; }
    return Number(n).toFixed(d == null ? 2 : d);
  }
  function tag(text, tone) {
    return '<span class="tag tag--' + (tone || 'gray') + '">' + esc(text) + '</span>';
  }
  function gradeTag(g) {
    return '<span class="tag tag--grade-' + esc(g) + '">' + esc(g) + '</span>';
  }
  function medal(rank) {
    if (rank > 3) { return ''; }
    return '<span class="medal medal--' + rank + '" title="局内第 ' + rank + ' 名">' + rank + '</span>';
  }

  /* ---------- Toast ---------- */
  function toast(msg, tone) {
    var wrap = document.getElementById('toastWrap');
    var el = document.createElement('div');
    el.className = 'toast' + (tone ? ' toast--' + tone : '');
    el.innerHTML = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, 2600);
  }

  /* ---------- 弹窗 ---------- */
  function dialog(opts) {
    var root = document.getElementById('dialogRoot');
    var wide = opts.size === 'wide' ? ' dialog--wide' : (opts.size === 'narrow' ? ' dialog--narrow' : '');
    root.innerHTML =
      '<div class="mask" id="dlgMask"><div class="dialog' + wide + '">' +
        '<div class="dialog__head"><span class="dialog__title">' + esc(opts.title || '') + '</span>' +
          '<button class="dialog__close" data-close>&times;</button></div>' +
        '<div class="dialog__body">' + (opts.body || '') + '</div>' +
        (opts.foot === false ? '' :
          '<div class="dialog__foot">' +
            '<button class="btn btn--default" data-close>' + esc(opts.cancelText || '取消') + '</button>' +
            '<button class="btn btn--primary" data-ok>' + esc(opts.okText || '确定') + '</button></div>') +
      '</div></div>';
    var mask = document.getElementById('dlgMask');
    function close() { mask.remove(); if (opts.onClose) { opts.onClose(); } }
    mask.addEventListener('click', function (e) { if (e.target === mask) { close(); } });
    Array.prototype.forEach.call(mask.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', close);
    });
    var ok = mask.querySelector('[data-ok]');
    if (ok) {
      ok.addEventListener('click', function () {
        if (opts.onOk && opts.onOk(mask) === false) { return; }
        close();
      });
    }
    if (opts.onOpen) { opts.onOpen(mask); }
    return { el: mask, close: close };
  }
  function confirm(msg, onOk, opts) {
    opts = opts || {};
    dialog({
      title: opts.title || '操作确认',
      size: 'narrow',
      body: '<p style="font-size:13px;line-height:1.9;color:#333">' + msg + '</p>',
      okText: opts.okText || '确认',
      onOk: onOk
    });
  }

  /* ---------- 状态机 ---------- */
  function statusTag(statusKey) {
    var node = window.PD.statusFlow.nodes[statusKey];
    if (!node) { return tag(statusKey, 'gray'); }
    return '<span class="tag tag--' + node.tone + '">' + esc(node.label) + '</span>';
  }
  function flowbar(statusKey) {
    var order = window.PD.statusFlow.order, nodes = window.PD.statusFlow.nodes;
    var idx = order.indexOf(statusKey);
    var rejected = statusKey === 'DEPT_REJECTED';
    var html = '<div class="flowbar">';
    order.forEach(function (k, i) {
      var cls = 'flowbar__node';
      if (rejected) { cls += (i === 0 ? ' is-cur' : ''); }
      else if (i < idx) { cls += ' is-done'; }
      else if (i === idx) { cls += ' is-cur'; }
      html += '<span class="' + cls + '"><span class="flowbar__dot">' + (i < idx && !rejected ? '✓' : (i + 1)) + '</span>' +
        esc(nodes[k].label) + '</span>';
      if (i < order.length - 1) { html += '<span class="flowbar__line"></span>'; }
    });
    if (rejected) {
      html += '<span class="flowbar__line"></span><span class="flowbar__node is-cur">' +
        '<span class="flowbar__dot">!</span>' + esc(nodes.DEPT_REJECTED.label) + '</span>';
    }
    return html + '</div>';
  }

  /* ---------- 片段 ---------- */
  function progressBar(pct, tone) {
    return '<div class="progress"><div class="progress__bar' + (tone ? ' is-' + tone : '') +
      '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>';
  }
  function statCard(o) {
    return '<div class="stat ' + (o.mod || '') + '">' +
      '<div class="stat__label">' + esc(o.label) + '</div>' +
      '<div class="stat__value">' + o.value + (o.unit ? '<small>' + esc(o.unit) + '</small>' : '') + '</div>' +
      '<div class="stat__sub">' + (o.sub || '') + '</div></div>';
  }
  function empty(text) {
    return '<div class="empty"><div class="empty__icon">' + icon('info', 26) + '</div>' + esc(text) + '</div>';
  }
  function kv(pairs) {
    return '<dl class="kvlist">' + pairs.map(function (p) {
      return '<dt>' + esc(p[0]) + '</dt><dd>' + p[1] + '</dd>';
    }).join('') + '</dl>';
  }
  function diff(oldV, newV) {
    return '<span class="diff"><span class="diff__old">' + esc(oldV) + '</span>' +
      '<span class="diff__arrow">→</span><span class="diff__new">' + esc(newV) + '</span></span>';
  }

  return {
    icon: icon, esc: esc, num: num, tag: tag, gradeTag: gradeTag, medal: medal,
    toast: toast, dialog: dialog, confirm: confirm,
    statusTag: statusTag, flowbar: flowbar, progressBar: progressBar,
    statCard: statCard, empty: empty, kv: kv, diff: diff
  };
})();
