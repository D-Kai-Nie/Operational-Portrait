/* ============================================================
   视图 5 · 画像治理（U1 局总部供应链管理部）
   Tab1 合规扣分直填（权威通道 · 倒扣自动折算）
   Tab2 终审与算分（21 家进度 · 生成预发布版）
   Tab3 预发布复核与发布（全局排名 · 二次修正 · 正式定版）
   Tab4 修正审计日志（全链路留痕 · 快照归档）
   ============================================================ */
(function () {
  'use strict';
  var V = window.Views = window.Views || {};
  var E = window.Engine, U = window.UI;

  /* ---------- Tab1 合规扣分直填 ---------- */
  function tabDirect(App) {
    var rows = window.PD.directFill;
    var sumCheck = 0;
    rows.forEach(function (r) { sumCheck += (+App.state.direct[r.unit].check || 0); });
    var affected = rows.filter(function (r) { return (+App.state.direct[r.unit].check || 0) > 0; }).length;
    return '<div class="dialog__tip">' + U.tag('权威直填通道', 'red') +
      ' 「一标一检不合规业务项数」与「合规考试不合格数」由局总部管理员按单位定向录入；' +
      '二级单位填报端与审核端在接口层物理隔离，字段不可见、不可写（AC-07）。合规管理得分按 ' +
      '<span class="formula">MAX(0, 10 − 项数 × 0.1)</span> 自动折算。</div>' +
      '<div class="card"><div class="card__head"><span class="card__title">局总部权威直填 · 21 家主业单位' +
      '<span class="card__note">录入后自动折算合规管理得分，保存即触发引擎重算</span></span>' +
      '<div class="inline">' +
      '<span class="chip chip--brand">全局不合规项数合计 ' + sumCheck + ' 项</span>' +
      '<span class="chip">受影响单位 ' + affected + ' 家</span></div></div>' +
      '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>二级单位</th><th class="ctr">一标一检不合规项数</th><th class="ctr">合规管理得分（自动折算）</th>' +
      '<th class="ctr">合规考试不合格数（台账·不计分）</th><th>录入人</th><th>录入时间</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var st = App.state.direct[r.unit];
        var score = E.scoreDeduct(10, +st.check || 0, 0.1);
        var cls = score >= 10 ? ' is-zero' : (score < 9.8 ? ' is-loss' : '');
        return '<tr><td>' + U.esc(r.unit) + '</td>' +
          '<td class="ctr"><input class="directinput" type="number" min="0" step="1" data-check="' + U.esc(r.unit) + '" value="' + st.check + '"></td>' +
          '<td class="ctr"><span class="deduct' + cls + '">' + U.num(score) + '</span>' +
          '<span class="cell__sub">10 − ' + st.check + ' × 0.1</span></td>' +
          '<td class="ctr"><input class="directinput" type="number" min="0" step="1" data-exam="' + U.esc(r.unit) + '" value="' + st.exam + '"></td>' +
          '<td>' + U.esc(r.filledBy) + '</td><td>' + U.esc(r.filledAt) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="card__foot">' +
      '<button class="btn btn--default" id="dfReset">恢复引擎默认值</button>' +
      '<button class="btn btn--primary" id="dfSave">保存直填并重算</button></div></div>';
  }

  /* ---------- Tab2 终审与算分 ---------- */
  function tabFinal(App) {
    var pd = window.PD;
    var rows = App.bureauProgress();
    var counts = { DRAFT: 0, SUBMITTED: 0, DEPT_REJECTED: 0, DEPT_APPROVED: 0 };
    rows.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    var ready = rows.filter(function (r) { return r.status === 'DEPT_APPROVED'; }).length;
    var avgCmp = Math.round(rows.reduce(function (a, r) { return a + r.completeness; }, 0) / rows.length);
    var blocked = ready < rows.length;
    var pendingList = rows.filter(function (r) { return r.status !== 'DEPT_APPROVED'; });
    var stage = App.state.bureau.stage;

    return '<div class="statgrid">' +
      U.statCard({ label: '已通过部门审核', value: ready, unit: '/ ' + rows.length + ' 家', sub: '数据齐备方可生成预发布版', mod: ready === rows.length ? 'stat--hao' : 'stat--warn' }) +
      U.statCard({ label: '待审核 / 已驳回', value: (counts.SUBMITTED || 0) + ' / ' + (counts.DEPT_REJECTED || 0), sub: '泳道停留在二级单位负责人环节' }) +
      U.statCard({ label: '平均数据完整率', value: avgCmp, unit: '%', sub: '目标 ≥ 98%' }) +
      U.statCard({ label: '当前期别状态', value: stage === 'REVIEW' ? '待终审' : (stage === 'PRE' ? '预发布' : '已发布'), sub: pd.periods[0].name + ' · ' + pd.periods[0].range }) +
      '</div>' +

      '<div class="grid-2-1">' +
        '<div class="card"><div class="card__head"><span class="card__title">21 家二级单位数据上报进度' +
        '<span class="card__note">三泳道状态机：草稿 → 已上报 → 部门已审 → 局终审 → 正式发布</span></span></div>' +
        '<div class="tablewrap"><table class="table"><thead><tr><th>二级单位</th><th class="ctr">数据包状态</th>' +
        '<th class="ctr">数据完整率</th><th>提交时间</th><th>填报专员</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><td>' + U.esc(r.unit) + '</td>' +
            '<td class="ctr">' + U.statusTag(r.status) + '</td>' +
            '<td class="ctr">' + r.completeness + '%' +
            (r.completeness < 98 ? '<span class="cell__sub">低于阈值</span>' : '') + '</td>' +
            '<td>' + U.esc(r.at) + '</td><td>' + U.esc(r.by) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +

        '<div class="stack">' +
          '<div class="card"><div class="card__head"><span class="card__title">数据校验汇总' +
          '<span class="card__note">必填缺失阻断 · 极值告警强制复核</span></span></div><div class="card__body">' +
          '<div class="validlist">' +
          '<div class="validlist__row"><span class="validlist__icon validlist__icon--pass">✓</span><span><b>必填完整性</b> <span class="validlist__detail">21 家 × 18 项必填字段无缺失</span></span></div>' +
          '<div class="validlist__row"><span class="validlist__icon validlist__icon--' + (blocked ? 'fail' : 'pass') + '">' + (blocked ? '!' : '✓') + '</span><span><b>泳道齐备性</b> <span class="validlist__detail">' +
          (blocked ? ('尚有 ' + pendingList.length + ' 家未完成部门审核，预发布被阻断') : '21 家均已通过部门审核，可生成预发布版') + '</span></span></div>' +
          '<div class="validlist__row"><span class="validlist__icon validlist__icon--warn">!</span><span><b>极值离群告警</b> <span class="validlist__detail">1 项（浙江公司策划效益率环比 +32.8%，已附书面佐证）</span></span></div>' +
          '<div class="validlist__row"><span class="validlist__icon validlist__icon--pass">✓</span><span><b>期间一致性</b> <span class="validlist__detail">全部数据落在 ' + window.PD.periods[0].range + '</span></span></div>' +
          '</div></div>' +
          '<div class="card__foot">' +
          (blocked ? '<button class="btn btn--default" id="fvFill">演示：批量补齐未完成单位</button>' +
            '<button class="btn btn--primary is-disabled" disabled>生成预发布版</button>' :
            '<button class="btn btn--primary" id="fvGen"' + (stage !== 'REVIEW' ? ' disabled' : '') + '>' +
            (stage === 'REVIEW' ? '生成预发布版' : '预发布版已生成') + '</button>') +
          '</div></div>' +

          (blocked ? '<div class="card"><div class="card__head"><span class="card__title">阻断清单' +
            '<span class="card__note">缺失数据阻断该期预发布（§8.5）</span></span></div><div class="card__body">' +
            '<div class="validlist">' + pendingList.map(function (r) {
              return '<div class="validlist__row"><span class="validlist__icon validlist__icon--fail">!</span><span><b>' +
                U.esc(r.unit) + '</b> <span class="validlist__detail">' + U.esc(window.PD.statusFlow.nodes[r.status].label) +
                (r.reject ? ' · 驳回意见：' + U.esc(r.reject) : '') + '</span></span></div>';
            }).join('') + '</div></div></div>' : '') +

          (stage !== 'REVIEW' ? '<div class="card"><div class="card__head"><span class="card__title">预发布版快照' +
            '<span class="card__note">不可变快照 · 供复核与回溯</span></span></div><div class="card__body">' +
            '<div class="snapcard"><span class="snapcard__digest">' + U.esc(App.state.bureau.preDigest) + '</span>' +
            U.tag('预发布版', 'orange') + '<span class="note">生成于 ' + U.esc(App.state.bureau.preAt) + '</span></div>' +
            '<div class="note mt2">复核通过后点击「正式定版发布」；发布前可对任意单位执行二次修正，修正将触发全局重算。</div>' +
            '</div></div>' : '') +
        '</div>' +
      '</div>';
  }

  /* ---------- Tab3 预发布复核与发布 ---------- */
  function tabReview(App) {
    var units = App.units(), dims = window.PD.dims;
    var stage = App.state.bureau.stage;
    if (stage === 'REVIEW') {
      return '<div class="card"><div class="card__body">' +
        U.empty('预发布版尚未生成。请先在【终审与算分】完成 21 家数据齐备校验并生成预发布版。') + '</div></div>';
    }
    var sorted = units.slice().sort(function (a, b) { return a.rank - b.rank; });
    return '<div class="dialog__tip">' + U.tag('预发布复核', 'orange') +
      ' 复核全局 21 家总分与排名：<b>前三名红底、后三名绿底</b>标记；如发现客观数据需修正，可在行内点击【修正】，' +
      '系统将强制录入修改原因（≥15 字）并实时重算受影响指标、维度、总分与评语。</div>' +
      '<div class="card"><div class="card__head"><span class="card__title">全局画像总分与定级复核' +
      '<span class="card__note">并列名次按 RANK.EQ 语义：同值同名次、下一名次顺延</span></span>' +
      '<div class="inline"><span class="chip chip--brand">快照 ' + U.esc(App.state.bureau.preDigest) + '</span>' +
      '<span class="chip">修正记录 ' + App.state.audit.length + ' 条</span></div></div>' +
      '<div class="tablewrap"><table class="table"><thead><tr><th class="ctr">排名</th><th>单位名称</th>' +
      '<th class="ctr">画像总分</th><th class="ctr">定级</th>' +
      dims.map(function (d) { return '<th class="ctr">' + d.name + '</th>'; }).join('') +
      '<th class="ctr">操作</th></tr></thead><tbody>' +
      sorted.map(function (u) {
        var cls = u.rank <= 3 ? 'row--top3' : (u.rank >= 19 ? 'row--bot3' : '');
        return '<tr class="' + cls + '"><td class="ctr' + (u.rank <= 3 ? ' cell--top3' : (u.rank >= 19 ? ' cell--bot3' : '')) + '">' +
          (u.rank <= 3 ? U.medal(u.rank) : u.rank) + '</td>' +
          '<td>' + U.esc(u.name) + '</td>' +
          '<td class="ctr cell__main">' + U.num(u.total) + '</td>' +
          '<td class="ctr">' + U.gradeTag(u.grade) + '</td>' +
          dims.map(function (d, i) { return '<td class="num">' + U.num(u.dimScores[i]) + '</td>'; }).join('') +
          '<td class="ctr"><button class="btn--link" data-fix="' + U.esc(u.name) + '">修正</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="card__foot">' +
      '<button class="btn btn--default" id="pbAudit">查看审计日志</button>' +
      (stage === 'PUBLISHED' ?
        '<button class="btn btn--primary is-disabled" disabled>已正式定版发布</button>' :
        '<button class="btn btn--primary" id="pbPublish">正式定版发布</button>') +
      '</div></div>' +
      (stage === 'PUBLISHED' ? '<div class="card"><div class="card__head"><span class="card__title">发布结果' +
        '<span class="card__note">发布指纹快照 · 不可篡改</span></span></div><div class="card__body">' +
        '<div class="snapcard"><span class="snapcard__digest">' + U.esc(App.state.bureau.digest) + '</span>' +
        U.tag('正式版', 'green') + '<span class="note">定版发布人：张伟（局供应链管理部） · 发布时间 ' +
        U.esc(App.state.bureau.publishedAt) + '</span></div>' +
        '<div class="note mt2">公共角色（U4）已可查看本期画像并导出 PDF；如需撤回，撤回后回到预发布态并留痕。</div>' +
        '</div></div>' : '');
  }

  /* ---------- Tab4 审计日志 ---------- */
  function tabAudit(App) {
    var list = App.state.audit.slice().reverse();
    return '<div class="dialog__tip">' + U.tag('审计留痕', 'blue') +
      ' 全量修正记录永久归档（对应 <span class="mono">sys_portrait_audit_log</span>）：操作人账号 / 真实姓名 / 终端 IP / ' +
      '时间戳 / 受影响单位 / 指标标识 / 原值 / 新值 / 必填业务缘由（≥15 字），支持局纪检审计一键调阅。</div>' +
      '<div class="card"><div class="card__head"><span class="card__title">数据修正审计日志' +
      '<span class="card__note">共 ' + list.length + ' 条 · 按时间倒序</span></span></div>' +
      '<div class="tablewrap"><table class="table audittable"><thead><tr>' +
      '<th>修正单号</th><th>期别</th><th>受影响单位</th><th>指标标识</th><th>来源</th>' +
      '<th>原值 → 新值</th><th>业务缘由</th><th>操作人 / 账号 / IP</th><th>时间</th><th>影响</th></tr></thead><tbody>' +
      list.map(function (a) {
        return '<tr><td class="mono">' + U.esc(a.id) + '</td><td>' + U.esc(a.period) + '</td>' +
          '<td>' + U.esc(a.unit) + '</td><td>' + U.esc(a.target) + '</td><td>' + U.esc(a.source) + '</td>' +
          '<td>' + U.diff(a.oldVal, a.newVal) + '</td>' +
          '<td class="reasoncell">' + U.esc(a.reason) + '</td>' +
          '<td>' + U.esc(a.operator) + '<span class="cell__sub">' + U.esc(a.account) + ' · ' + U.esc(a.ip) + '</span></td>' +
          '<td>' + U.esc(a.at) + '</td><td class="reasoncell">' + U.esc(a.effect) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card__head"><span class="card__title">期别快照归档' +
      '<span class="card__note">每次预发布与发布生成不可变快照</span></span></div>' +
      '<div class="tablewrap"><table class="table"><thead><tr><th>快照编号</th><th>期别</th><th>类型</th>' +
      '<th>指纹摘要</th><th>单位数</th><th>生成人</th><th>生成时间</th><th>说明</th></tr></thead><tbody>' +
      window.PD.snapshots.map(function (s) {
        return '<tr><td class="mono">' + U.esc(s.id) + '</td><td>' + U.esc(s.period) + '</td>' +
          '<td>' + U.tag(s.type, s.type === '正式版' ? 'green' : (s.type === '预发布版' ? 'orange' : 'gray')) + '</td>' +
          '<td class="mono">' + U.esc(s.digest) + '</td><td class="ctr">' + s.units + '</td>' +
          '<td>' + U.esc(s.by) + '</td><td>' + U.esc(s.at) + '</td><td class="reasoncell">' + U.esc(s.note) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  V.govern = {
    title: '画像治理',
    render: function (App) {
      var tabs = [
        { key: 'direct', label: '合规扣分直填', step: 1, badge: '' },
        { key: 'final', label: '终审与算分', step: 2, badge: App.state.bureau.stage === 'REVIEW' ? '!' : '' },
        { key: 'review', label: '预发布复核与发布', step: 3, badge: '' },
        { key: 'audit', label: '修正审计日志', step: null, badge: String(App.state.audit.length) }
      ];
      var cur = App.state.govTab;
      return '<div class="pagehead">' +
        '<div><div class="pagehead__title">画像治理工作台 · 局总部供应链管理部' +
        '<span class="statetag">' + U.flowbar(App.state.bureau.stage === 'REVIEW' ? 'DEPT_APPROVED' :
          (App.state.bureau.stage === 'PRE' ? 'BUREAU_CONFIRMED' : 'OFFICIAL_PUBLISHED')) + '</span></div>' +
        '<div class="pagehead__desc">按 1→2→3 顺序推进：权威直填 → 终审算分 → 预发布复核 → 正式定版发布；所有人工干预强制留痕，' +
        '修正生效瞬间由引擎静默重算全局 21 家的得分、排名、定级与评语。</div></div>' +
        '</div>' +
        '<div class="govtabs">' + tabs.map(function (t) {
          return '<button class="govtab' + (t.key === cur ? ' is-active' : '') + '" data-govtab="' + t.key + '">' +
            (t.step ? '<span class="govtab__step">' + t.step + '</span>' : '') +
            U.esc(t.label) + (t.badge ? '<span class="govtab__badge' + (isNaN(+t.badge) ? '' : ' govtab__badge--done') + '">' + t.badge + '</span>' : '') +
            '</button>';
        }).join('') + '</div>' +
        '<div id="govBody">' +
        (cur === 'direct' ? tabDirect(App) : cur === 'final' ? tabFinal(App) : cur === 'review' ? tabReview(App) : tabAudit(App)) +
        '</div>';
    },
    mount: function (App, root) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-govtab]'), function (b) {
        b.addEventListener('click', function () {
          App.state.govTab = b.getAttribute('data-govtab');
          App.rerender();
        });
      });

      /* --- Tab1 直填 --- */
      Array.prototype.forEach.call(root.querySelectorAll('[data-check],[data-exam]'), function (inp) {
        inp.addEventListener('change', function () {
          var unit = inp.getAttribute('data-check') || inp.getAttribute('data-exam');
          var key = inp.hasAttribute('data-check') ? 'check' : 'exam';
          var v = Math.max(0, parseInt(inp.value, 10) || 0);
          App.state.direct[unit][key] = v;
          var cell = inp.closest('tr').querySelector('.deduct');
          var s = E.scoreDeduct(10, +App.state.direct[unit].check || 0, 0.1);
          cell.textContent = U.num(s);
          cell.className = 'deduct' + (s >= 10 ? ' is-zero' : (s < 9.8 ? ' is-loss' : ''));
          cell.nextElementSibling.textContent = '10 − ' + App.state.direct[unit].check + ' × 0.1';
          App.markDirty();   /* P0 #8 */
        });
      });
      var dfSave = root.querySelector('#dfSave');
      if (dfSave) {
        dfSave.addEventListener('click', function () {
          var changed = [], pk = window.PD.directFill;
          Object.keys(App.state.direct).forEach(function (unit) {
            var base = pk.filter(function (x) { return x.unit === unit; })[0];
            var cur = App.state.direct[unit];
            if (base && base.check !== cur.check) {
              changed.push({ unit: unit, oldV: base.check + ' 项', newV: cur.check + ' 项' });
            }
          });
          if (!changed.length) { U.toast('未检测到直填值变更', 'warn'); return; }
          changed.forEach(function (c) {
            var u = window.PD.units.filter(function (x) { return x.name === c.unit; })[0];
            var ind = u.indicators.filter(function (x) { return x.name === '一标一检不合规业务项数'; })[0];
            ind.num = parseInt(c.newV, 10);
            ind.val = c.newV.replace(' 项', '项');
            ind.score = U.num(E.scoreDeduct(10, ind.num, 0.1));
            u.dimScores[4] = E.scoreDeduct(10, ind.num, 0.1);
            u.total = Math.round(u.dimScores.reduce(function (a, b) { return a + b; }, 0) * 100) / 100;
          });
          E.recompute(App.units(), window.PD.dims);
          var recs = changed.map(function (c, i) {
            return {
              id: 'XZ-2026H1-1' + String(App.state.audit.length + i + 10),
              period: window.PD.periods[0].name, unit: c.unit,
              target: '一标一检不合规业务项数', source: '局总部权威直填',
              oldVal: c.oldV, newVal: c.newV,
              reason: '局一标一检复检结论定向录入，作为合规管理维度倒扣依据',
              operator: '张伟', account: 'zhangwei@cscec8b', ip: '10.18.32.77',
              at: App.now(), effect: '合规管理得分重算，维度定级与总分排名联动刷新'
            };
          });
          App.state.audit = App.state.audit.concat(recs);
          /* P1 #16：录入人 / 录入时间随本次保存回写（与审计日志同源） */
          changed.forEach(function (c) {
            window.PD.directFill.forEach(function (r) {
              if (r.unit === c.unit) { r.filledBy = '张伟（局供应链管理部）'; r.filledAt = App.now(); }
            });
          });
          App.clearDirty();
          U.toast('已保存直填并触发引擎重算：' + changed.length + ' 家合规管理得分已刷新', 'success');
          App.rerender();
        });
      }
      var dfReset = root.querySelector('#dfReset');
      if (dfReset) {
        dfReset.addEventListener('click', function () {
          App.state.direct = {};
          window.PD.directFill.forEach(function (r) { App.state.direct[r.unit] = { check: r.check, exam: r.exam }; });
          U.toast('已恢复引擎默认直填值');
          App.rerender();
        });
      }

      /* --- Tab2 终审 --- */
      var fvFill = root.querySelector('#fvFill');
      if (fvFill) {
        fvFill.addEventListener('click', function () {
          App.bureauForceComplete();
          U.toast('演示操作：已将未完成单位置为「部门已审待局审」', 'warn');
          App.rerender();
        });
      }
      var fvGen = root.querySelector('#fvGen');
      if (fvGen && !fvGen.disabled) {
        fvGen.addEventListener('click', function () {
          U.confirm('确认生成 ' + window.PD.periods[0].name + ' 全局预发布版画像？系统将执行 15 项指标算分、' +
            '累计滚算、维度加总、全局排名、五级定级与评语组装。', function () {
            App.generatePreRelease();
          }, { okText: '生成预发布版' });
        });
      }

      /* --- Tab3 复核 --- */
      Array.prototype.forEach.call(root.querySelectorAll('[data-fix]'), function (b) {
        b.addEventListener('click', function () { App.openCorrection(b.getAttribute('data-fix')); });
      });
      var pbAudit = root.querySelector('#pbAudit');
      if (pbAudit) {
        pbAudit.addEventListener('click', function () { App.state.govTab = 'audit'; App.rerender(); });
      }
      var pbPublish = root.querySelector('#pbPublish');
      if (pbPublish) {
        pbPublish.addEventListener('click', function () {
          U.confirm('确认将本期预发布版【正式定版发布】？发布后公共角色（U4）可见，并生成不可变快照指纹。' +
            '依据反指标约束，正式发布后人工二次修正率应 ≤ 2%。', function () {
            App.publishOfficial();
          }, { okText: '正式定版发布' });
        });
      }
    }
  };
})();
