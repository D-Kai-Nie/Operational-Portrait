/* ============================================================
   应用核心：角色权限 / 路由 / 状态机动作 / 修正重算 / 导出
   ============================================================ */
window.App = (function () {
  'use strict';
  var U = window.UI, E = window.Engine, PD = window.PD;

  var state = {
    roleKey: 'U1',
    periodId: '2026H1',
    view: 'overview',
    unitId: 1,
    collapsed: false,
    ovSort: { key: 'total', dir: 'desc' },
    ptSort: { key: 'dim', dir: 'asc' },
    chartMode: 'radar',
    govTab: 'direct',
    pkg: { status: PD.fill.task.status, reject: '', submittedAt: '', approvedAt: '', comment: '', history: [] },
    bureau: { stage: 'REVIEW', preDigest: '', preAt: '', digest: '', publishedAt: '' },
    direct: {},
    audit: PD.auditLog.slice(),
    fillProof: '',
    fillForm: JSON.parse(JSON.stringify({ system: PD.fill.system, talent: PD.fill.talent, biz: PD.fill.biz }))
  };
  PD.directFill.forEach(function (r) { state.direct[r.unit] = { check: r.check, exam: r.exam }; });

  function role() { return PD.roles.filter(function (r) { return r.key === state.roleKey; })[0] || PD.roles[0]; }
  function can(perm) { var r = role(); return !r.blocked && r.perms.indexOf(perm) >= 0; }
  function units() { return PD.units; }
  function unit() { return PD.units.filter(function (u) { return u.id === state.unitId; })[0] || PD.units[0]; }
  function period() { return PD.periods.filter(function (p) { return p.id === state.periodId; })[0] || PD.periods[0]; }
  function now() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return '2026-07-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- 导航与面包屑 ---------------- */
  function renderNav() {
    var host = document.getElementById('sidenav');
    if (role().blocked) {
      host.innerHTML = '<div class="sidenav__group">供应链画像</div>' +
        '<div class="navitem" style="opacity:.5;cursor:not-allowed">' + U.icon('lock') +
        '<span class="navitem__text">无可用菜单</span></div>';
      return;
    }
    host.innerHTML = '<div class="sidenav__group">智慧运营 · 供应链画像</div>' +
      PD.menus.map(function (m) {
        var allowed = can(m.perm);
        return '<div class="navitem' + (state.view === m.key ? ' is-active' : '') + '" data-nav="' + m.key + '"' +
          (allowed ? '' : ' style="opacity:.42;cursor:not-allowed"') + '>' +
          U.icon(m.icon) + '<span class="navitem__text">' + U.esc(m.label) + '</span>' +
          (allowed ? '' : '<span class="navitem__lock">' + U.icon('lock', 11) + '</span>') + '</div>';
      }).join('');
  }

  function renderCrumb() {
    var host = document.getElementById('crumb');
    var label = (window.Views[state.view] || {}).title || '供应链画像';
    host.innerHTML = '<a href="javascript:;" data-crumb="home">首页</a><span class="crumb__sep">/</span>' +
      '<a href="javascript:;" data-crumb="yy">智慧运营</a><span class="crumb__sep">/</span>' +
      '<a href="javascript:;" data-crumb="gx">供应链画像</a><span class="crumb__sep">/</span>' +
      '<span class="crumb__cur">' + U.esc(label) + '</span>' +
      (state.view === 'portrait' ? '<span class="crumb__sep">/</span><span class="crumb__cur">' + U.esc(unit().name) + '</span>' : '');
    Array.prototype.forEach.call(host.querySelectorAll('[data-crumb]'), function (a) {
      a.addEventListener('click', function () {
        var k = a.getAttribute('data-crumb');
        if (k === 'gx') { go('overview'); }
        else { U.toast('「' + (k === 'home' ? '首页' : '智慧运营') + '」为平台级入口，本原型聚焦供应链画像模块'); }
      });
    });
  }

  function renderFlowMini() {
    var host = document.getElementById('flowMini');
    if (role().blocked) { host.innerHTML = ''; return; }
    var st = state.pkg.status, stage = state.bureau.stage;
    var nodes = [
      { k: 'DRAFT', t: '专员填报' }, { k: 'SUBMITTED', t: '负责人审核' },
      { k: 'DEPT_APPROVED', t: '局总部终审' }, { k: 'PUBLISHED', t: '正式发布' }
    ];
    host.innerHTML = '<div style="margin-bottom:4px">本期流转</div>' + nodes.map(function (n) {
      var cls = '';
      if (n.k === 'DRAFT') { cls = st === 'DRAFT' ? ' is-on' : ' is-done'; }
      if (n.k === 'SUBMITTED') {
        if (st === 'DEPT_REJECTED') { cls = ' is-warn'; }
        else if (st === 'SUBMITTED') { cls = ' is-on'; } else { cls = ' is-done'; }
      }
      if (n.k === 'DEPT_APPROVED') {
        if (st === 'DEPT_APPROVED' || st === 'BUREAU_CONFIRMED') { cls = stage === 'REVIEW' ? ' is-on' : ' is-done'; }
        else { cls = ''; }
      }
      if (n.k === 'PUBLISHED') { cls = stage === 'PUBLISHED' ? ' is-done' : (stage === 'PRE' ? ' is-on' : ''); }
      return '<div class="flowmini__row"><span class="flowmini__dot' + cls + '"></span>' + n.t + '</div>';
    }).join('');
  }

  /* ---------------- 渲染 ---------------- */
  function rerender() {
    document.getElementById('app').classList.toggle('is-collapsed', state.collapsed);
    document.getElementById('roleSelect').value = state.roleKey;
    document.getElementById('userAvatar').textContent = role().short.charAt(0);
    document.getElementById('userName').textContent = role().label;
    renderNav(); renderCrumb(); renderFlowMini();

    var main = document.getElementById('view'), r = role();
    if (r.blocked) {
      main.innerHTML = '<div class="blocked"><div class="blocked__code">403</div>' +
        '<div class="blocked__title">无权限访问</div>' +
        '<div class="blocked__text">' + U.esc(r.label) + '（' + U.esc(r.org) + '）不具备供应链画像模块访问权限。<br>' +
        'PRD v2.0 已彻底取消项目端填报账号体系：项目部层级账号访问画像路由时，<br>' +
        '前端提示「无权限访问」，接口层直接返回 <b>HTTP 403</b>，不暴露任何数据（AC-06）。</div>' +
        '<div class="btnbar" style="justify-content:center;margin-top:24px">' +
        '<button class="btn btn--primary" id="bkSwitch">切换为局总部管理员查看演示</button></div></div>';
      var bk = main.querySelector('#bkSwitch');
      if (bk) { bk.addEventListener('click', function () { setRole('U1'); }); }
      return;
    }
    var menu = PD.menus.filter(function (m) { return m.key === state.view; })[0];
    if (!menu || !can(menu.perm)) {
      var first = PD.menus.filter(function (m) { return can(m.perm); })[0];
      if (first) { state.view = first.key; renderNav(); }
    }
    var view = window.Views[state.view];
    if (!view) { main.innerHTML = U.empty('视图不存在'); return; }
    main.innerHTML = view.render(App);
    if (view.mount) { view.mount(App, main); }
  }

  function go(view, unitId) {
    state.view = view;
    if (unitId) { state.unitId = unitId; }
    syncHash();
    rerender();
    document.getElementById('main').scrollTop = 0;
  }

  function setRole(key) {
    state.roleKey = key;
    if (!role().blocked) {
      var menu = PD.menus.filter(function (m) { return m.key === state.view; })[0];
      if (!menu || !can(menu.perm)) {
        var first = PD.menus.filter(function (m) { return can(m.perm); })[0];
        state.view = first ? first.key : 'overview';
      }
      U.toast('已切换角色：' + role().label + '（数据范围：' + role().scope + '）', 'success');
    }
    syncHash();
    rerender();
  }

  /* ---------------- 深链路由（#role=U2&view=fill&unit=1） ---------------- */
  var hashLock = false;
  function syncHash() {
    hashLock = true;
    location.hash = 'role=' + state.roleKey + '&view=' + state.view + '&unit=' + state.unitId;
    setTimeout(function () { hashLock = false; }, 0);
  }
  function applyHash() {
    var h = String(location.hash || '').replace(/^#/, '');
    if (!h) { return; }
    var q = {};
    h.split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) { q[p[0]] = decodeURIComponent(p[1] || ''); }
    });
    if (q.role && PD.roles.filter(function (r) { return r.key === q.role; }).length) { state.roleKey = q.role; }
    if (q.unit && +q.unit >= 1 && +q.unit <= PD.units.length) { state.unitId = +q.unit; }
    if (q.view && window.Views[q.view]) { state.view = q.view; }
    var menu = PD.menus.filter(function (m) { return m.key === state.view; })[0];
    if (!role().blocked && (!menu || !can(menu.perm))) {
      var first = PD.menus.filter(function (m) { return can(m.perm); })[0];
      state.view = first ? first.key : 'overview';
    }
  }

  /* ---------------- 表单读写与校验 ---------------- */
  function readForm(root) {
    var F = state.fillForm;
    function v(id) { var el = root.querySelector('#' + id); return el ? el.value : ''; }
    F.system.branches = +v('branches') || 0;
    Array.prototype.forEach.call(root.querySelectorAll('[data-mode]'), function (inp) {
      F.system.modes[+inp.getAttribute('data-mode')].count = +inp.value || 0;
    });
    var note = root.querySelector('#sysNote'); if (note) { F.system.note = note.value; }
    ['buyer', 'material', 'midTitle', 'costEngineer', 'builder', 'houseRate', 'infraRate'].forEach(function (k) {
      F.talent[k] = +v(k) || 0;
    });
    ['selfTotal', 'selfAmount', 'planIncome', 'planBenefit'].forEach(function (k) { F.biz[k] = +v(k) || 0; });
  }

  function validateForm(root) {
    var ok = true, F = state.fillForm;
    var sum = F.system.modes.reduce(function (a, m) { return a + (+m.count || 0); }, 0);
    var modeField = root.querySelector('[data-mode]').closest('.field');
    if (sum !== F.system.branches) { modeField.classList.add('is-invalid'); ok = false; } else { modeField.classList.remove('is-invalid'); }
    ['buyer', 'material', 'selfTotal', 'selfAmount', 'planIncome', 'planBenefit'].forEach(function (id) {
      var el = root.querySelector('#' + id), f = el.closest('.field');
      if (!el.value || +el.value <= 0) { f.classList.add('is-invalid'); ok = false; } else { f.classList.remove('is-invalid'); }
    });
    var pr = F.biz.planIncome ? F.biz.planBenefit / F.biz.planIncome * 100 : 0;
    var warn = Math.abs(pr - PD.fill.prev.planRate) / PD.fill.prev.planRate * 100 > 20;
    var proof = root.querySelector('#proof');
    if (warn && proof && proof.value.trim().length < 8) { proof.closest('.field').classList.add('is-invalid'); ok = false; }
    else if (proof) { proof.closest('.field').classList.remove('is-invalid'); }
    if (!ok) { U.toast('校验未通过：请检查标红字段（数量合计 / 必填项 / 极值佐证）', 'warn'); }
    return ok;
  }

  /* ---------------- 治理动作 ---------------- */
  function bureauProgress() {
    return PD.fill.unitsStatus.map(function (r) {
      if (r.unit === PD.fill.task.unit) {
        return { unit: r.unit, status: state.pkg.status, completeness: r.completeness, at: r.at, by: r.by, reject: state.pkg.reject };
      }
      return r;
    });
  }
  function bureauForceComplete() {
    state.pkg.status = 'DEPT_APPROVED';
    PD.fill.unitsStatus.forEach(function (r) {
      if (r.status !== 'DEPT_APPROVED') { r.status = 'DEPT_APPROVED'; r.reject = ''; }
    });
  }
  function generatePreRelease() {
    state.bureau.stage = 'PRE';
    state.bureau.preAt = now();
    state.bureau.preDigest = 'PRE-' + Math.random().toString(16).slice(2, 6).toUpperCase();
    state.pkg.status = 'BUREAU_CONFIRMED';
    state.govTab = 'review';
    U.toast('预发布版画像已生成（21 家 × 15 指标）· 快照 ' + state.bureau.preDigest, 'success');
    rerender();
  }
  function publishOfficial() {
    state.bureau.stage = 'PUBLISHED';
    state.bureau.publishedAt = now();
    state.bureau.digest = 'FP-' + Math.random().toString(16).slice(2, 8).toUpperCase();
    state.pkg.status = 'OFFICIAL_PUBLISHED';
    PD.snapshots.unshift({
      id: state.bureau.digest, period: period().name, type: '正式版', at: state.bureau.publishedAt,
      by: '张伟（局供应链管理部）', units: PD.units.length,
      digest: state.bureau.digest.slice(3).toLowerCase(), note: '本次演示发布的正式版快照'
    });
    U.toast('已正式定版发布，公共角色可见 · 发布指纹 ' + state.bureau.digest, 'success');
    rerender();
  }

  /* ---------------- 二次修正（引擎联动重算） ---------------- */
  function fmtVal(indName, v, dict) {
    var meta = dict.filter(function (d) { return d.name === indName; })[0] || {};
    var un = meta.unit || '';
    if (un === '%') { return U.num(v) + '%'; }
    if (un === '项' || un === '条') { return Math.round(v) + un; }
    if (un === '分' || un === '万元' || un === '亿元') { return U.num(v) + un; }
    return U.num(v);
  }

  function applyCorrection(unitName, indName, newValue, reason) {
    var us = PD.units, dims = PD.dims, dict = PD.indicatorDict;
    var meta = dict.filter(function (d) { return d.name === indName; })[0];
    var values = us.map(function (u) {
      var it = u.indicators.filter(function (x) { return x.name === indName; })[0];
      return it ? it.num : null;
    });
    var ui = -1;
    us.forEach(function (u, i) { if (u.name === unitName) { ui = i; } });
    var oldVal = values[ui];
    values[ui] = newValue;
    var asc = meta.dir === '升序';
    var ranks = values.map(function (v) {
      var c = 0;
      values.forEach(function (x) {
        if (x == null || v == null) { return; }
        if (asc ? (x < v) : (x > v)) { c++; }
      });
      return c + 1;
    });
    us.forEach(function (u, i) {
      var it = u.indicators.filter(function (x) { return x.name === indName; })[0];
      if (!it || values[i] == null) { return; }
      it.num = values[i];
      it.val = fmtVal(indName, values[i], dict);
      it.rank = ranks[i];
      if (meta.nature === '倒扣') { it.score = U.num(E.scoreDeduct(10, values[i], meta.step)); }
      else if (meta.nature === '折算') { it.score = U.num(E.scoreScale(values[i], 0.1)); }
      else { it.score = U.num(E.scoreByRank(meta.weight, meta.step, ranks[i])); }
    });
    us.forEach(function (u) {
      var sums = dims.map(function () { return 0; });
      u.indicators.forEach(function (it) {
        var di = -1;
        dims.forEach(function (d, k) { if (d.name === it.cat) { di = k; } });
        if (di >= 0 && it.score !== '—') { sums[di] += parseFloat(it.score) || 0; }
      });
      u.dimScores = sums.map(function (s) { return Math.round(s * 100) / 100; });
      u.total = Math.round(sums.reduce(function (a, b) { return a + b; }, 0) * 100) / 100;
    });
    E.recompute(us, dims);
    var after = us.filter(function (u) { return u.name === unitName; })[0];
    if (indName === '一标一检不合规业务项数') {
      PD.directFill.forEach(function (r) { if (r.unit === unitName) { r.check = Math.round(newValue); } });
      state.direct[unitName].check = Math.round(newValue);
    }
    state.audit = state.audit.concat([{
      id: 'XZ-2026H1-' + String(state.audit.length + 10),
      period: period().name, unit: unitName, target: indName, source: '局总部超级修正权',
      oldVal: fmtVal(indName, oldVal, dict), newVal: fmtVal(indName, newValue, dict),
      reason: reason, operator: '张伟', account: 'zhangwei@cscec8b', ip: '10.18.32.77', at: now(),
      effect: unitName + '：总分 ' + U.num(after.total) + '、第 ' + after.rank + ' 名（' + after.grade +
        '）；全局 21 家指标得分、维度得分、总分、排名、定级与评语已联动重算'
    }]);
    U.toast('修正生效：引擎全局重算完成（' + unitName + ' 总分 ' + U.num(after.total) +
      ' · 第 ' + after.rank + ' 名 · ' + after.grade + '）', 'success');
    rerender();
  }

  function openCorrection(unitName) {
    var u = PD.units.filter(function (x) { return x.name === unitName; })[0];
    var dict = PD.indicatorDict.filter(function (d) { return d.weight > 0; });
    var options = dict.map(function (d) {
      var it = u.indicators.filter(function (x) { return x.name === d.name; })[0];
      return '<option value="' + U.esc(d.name) + '" data-val="' + (it && it.num != null ? it.num : '') + '">' +
        U.esc(d.name) + '（' + d.dim + ' · 满分 ' + d.weight + ' · 步长 ' + d.step + '）</option>';
    }).join('');
    U.dialog({
      title: '二次修正 · ' + unitName + '（局总部超级修正权）',
      size: 'wide',
      body: '<div class="dialog__tip">修正生效瞬间系统静默重算全局 21 家的指标得分、维度得分、总分、排名、定级与评语；' +
        '修改原因必填（≥15 字），审计日志永久归档。演示环境刷新页面即恢复数据基线。</div>' +
        '<div class="form">' +
        '<div class="field"><label class="field__label">画像期别</label><input class="input" value="' + U.esc(period().name) + '" readonly></div>' +
        '<div class="field"><label class="field__label">受影响二级单位</label><input class="input" value="' + U.esc(unitName) + '" readonly></div>' +
        '<div class="field"><label class="field__label">指标标识<span class="req">*</span></label>' +
        '<select class="select" id="fxInd">' + options + '</select></div>' +
        '<div class="field"><label class="field__label">原值 → 新值<span class="req">*</span></label>' +
        '<div class="inputgroup"><input class="input" id="fxOld" readonly style="max-width:110px">' +
        '<span class="inputgroup__unit">→</span><input class="input" id="fxNew" type="number" step="0.01" placeholder="修正后数值"></div>' +
        '<div class="field__err">请输入合法数值</div></div>' +
        '<div class="field" style="grid-column:1 / -1"><label class="field__label">修改业务缘由（≥15 字）<span class="req">*</span></label>' +
        '<textarea class="textarea" id="fxReason" placeholder="例如：复核剔除不可抗力停工项目招采时长，依据局工管函〔2026〕52 号"></textarea>' +
        '<div class="field__err">修改原因不得少于 15 字</div></div></div>',
      okText: '保存并触发重算',
      onOpen: function (mask) {
        var sel = mask.querySelector('#fxInd'), oldI = mask.querySelector('#fxOld');
        function sync() { oldI.value = sel.options[sel.selectedIndex].getAttribute('data-val'); }
        sel.addEventListener('change', sync); sync();
      },
      onOk: function (mask) {
        var sel = mask.querySelector('#fxInd'), nv = mask.querySelector('#fxNew'), rs = mask.querySelector('#fxReason');
        var ok = true, num = parseFloat(nv.value);
        if (isNaN(num) || num < 0) { nv.closest('.field').classList.add('is-invalid'); ok = false; }
        else { nv.closest('.field').classList.remove('is-invalid'); }
        if (rs.value.trim().length < 15) { rs.closest('.field').classList.add('is-invalid'); ok = false; }
        else { rs.closest('.field').classList.remove('is-invalid'); }
        if (!ok) { U.toast('请完整填写新值与不少于 15 字的修改缘由', 'warn'); return false; }
        applyCorrection(unitName, sel.value, num, rs.value.trim());
        return true;
      }
    });
  }

  /* ---------------- 导出 ---------------- */
  function exportReport(u) {
    if (!u || !u.name) { u = unit(); }
    U.dialog({
      title: '导出标准画像报告（PDF / Word）',
      size: 'narrow',
      body: '<div class="dialog__tip">导出内容与线下 Word 成品版式一致：总览卡（总分 / 排名 / 定级 / 整体评价）→ 雷达图 → ' +
        '15 项指标清单（含六项降本金额 + 占比双列）→ 组织与人才台账，单页 A4 排版（AC-10）。</div>' +
        U.kv([
          ['导出单位', U.esc(u.name)],
          ['画像期别', U.esc(period().name)],
          ['画像总分', U.num(u.total) + ' 分（第 ' + u.rank + ' 名 · ' + u.grade + '）'],
          ['版本', state.bureau.stage === 'PUBLISHED' ? '正式版（公共角色可见）' : '预发布版（仅局总部可见）'],
          ['导出角色', U.esc(role().label)]
        ]),
      okText: '生成并下载',
      onOk: function () {
        U.toast('已生成《' + u.name + '供应链管理画像（' + period().name + '）》.pdf（演示环境不产生真实文件）', 'success');
      }
    });
  }

  /* ---------------- 期别切换弹窗（供页头期别标签调用） ---------------- */
  function openPeriodDialog() {
    U.dialog({
      title: '切换画像期别',
      size: 'narrow',
      body: '<div class="stack stack--sm">' + PD.periods.map(function (p) {
        return '<div class="cmprow" style="cursor:pointer" data-period="' + p.id + '">' +
          '<span class="cmprow__label">' + U.esc(p.name) + '</span>' +
          '<span class="cmprow__vals"><span class="cmprow__cur">' + U.esc(p.type) + '</span>' +
          '<span class="cmprow__prev">' + U.esc(p.range) + '</span></span>' +
          U.tag(p.status, p.status === '正式' ? 'green' : (p.status === '预发布' ? 'orange' : (p.status === '草稿' ? 'gray' : 'blue'))) + '</div>';
      }).join('') + '</div><div class="note mt2">演示环境仅「2026年1-6月」接入完整实测数据，其余期别为占位。</div>',
      foot: false
    });
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    var sel = document.getElementById('roleSelect');
    sel.innerHTML = PD.roles.map(function (r) {
      return '<option value="' + r.key + '">' + U.esc(r.label) + '</option>';
    }).join('');
    sel.value = state.roleKey;
    sel.addEventListener('change', function () { setRole(this.value); });

    document.getElementById('sidenav').addEventListener('click', function (e) {
      var item = e.target.closest('[data-nav]');
      if (!item) { return; }
      var key = item.getAttribute('data-nav');
      var menu = PD.menus.filter(function (m) { return m.key === key; })[0];
      if (!can(menu.perm)) {
        U.toast('当前角色「' + role().label + '」无「' + menu.label + '」访问权限（接口层拒绝）', 'warn');
        return;
      }
      go(key);
    });
    document.getElementById('collapseBtn').addEventListener('click', function () {
      state.collapsed = !state.collapsed;
      document.getElementById('app').classList.toggle('is-collapsed', state.collapsed);
    });
    document.getElementById('brandHome').addEventListener('click', function () { go('overview'); });
    Array.prototype.forEach.call(document.querySelectorAll('.modnav__item'), function (a) {
      a.addEventListener('click', function () {
        U.toast('「' + a.getAttribute('data-mod') + '」为 DSC 平台级模块入口，本原型聚焦智慧运营 · 供应链画像');
      });
    });
    document.getElementById('notifyBtn').addEventListener('click', function () {
      U.dialog({
        title: '消息通知（' + PD.notifications.length + '）',
        size: 'narrow',
        body: '<div class="stack stack--sm">' + PD.notifications.map(function (n) {
          return '<div class="validlist__row"><span class="validlist__icon validlist__icon--' +
            (n.tone === 'green' ? 'pass' : n.tone === 'warn' ? 'warn' : 'warn') + '">!</span>' +
            '<span>' + U.esc(n.text) + '<span class="cell__sub">' + U.esc(n.at) + '</span></span></div>';
        }).join('') + '</div>',
        okText: '知道了'
      });
    });
    document.getElementById('userBox').addEventListener('click', function () {
      var r = role();
      U.dialog({
        title: '当前登录角色',
        size: 'narrow',
        body: U.kv([
          ['角色', U.esc(r.label) + '（' + r.key + '）'],
          ['归属部门', U.esc(r.org)],
          ['数据范围', U.esc(r.scope)],
          ['职责', U.esc(r.duty)],
          ['角色人数', r.count ? r.count + ' 人' : '0 人（已取消）'],
          ['菜单权限', r.perms.length ? r.perms.map(function (p) {
            var m = PD.menus.filter(function (x) { return x.perm === p; })[0];
            return m ? m.label : p;
          }).join(' · ') : '无']
        ]),
        okText: '关闭'
      });
    });
    applyHash();
    window.addEventListener('hashchange', function () {
      if (hashLock) { return; }
      applyHash();
      rerender();
    });
    rerender();
  }

  return {
    state: state, role: role, can: can, units: units, unit: unit, period: period, now: now,
    go: go, setRole: setRole, rerender: rerender,
    readForm: readForm, validateForm: validateForm,
    bureauProgress: bureauProgress, bureauForceComplete: bureauForceComplete,
    generatePreRelease: generatePreRelease, publishOfficial: publishOfficial,
    openCorrection: openCorrection, applyCorrection: applyCorrection, exportReport: exportReport,
    openPeriodDialog: openPeriodDialog,
    init: init
  };
})();
document.addEventListener('DOMContentLoaded', function () { window.App.init(); });
