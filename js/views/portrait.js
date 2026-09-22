/* ============================================================
   视图 2 · 单位画像（PRD §9.1 四区块规格）
   ① 核心看板区：雷达图/条形图 + 总分卡 + 维度明细表
   ② 15 指标下钻穿透区（六项降本双展示）
   ③ 组织支撑与人才资产展区
   ============================================================ */
(function () {
  'use strict';
  var V = window.Views = window.Views || {};
  var E = window.Engine, U = window.UI;

  var DIM_TONE = { '好': '#52C41A', '较好': '#1890FF', '一般': '#BFBFBF', '较弱': '#FA8C16', '弱': '#F5222D' };

  /* 取值单位统一：量纲型指标若取值未带单位，则按字典补单位（如 22.22 → 22.22天） */
  function withUnit(val, unit) {
    if (!unit || unit === '%' || unit === '条/亿元') { return val; }
    var s = String(val);
    return /[项条分天万元亿元%]$/.test(s) ? s : s + unit;
  }

  /* ---------- 雷达图（当前单位 vs 全局均值） ---------- */
  function radar(unit, units, dims) {
    var cx = 186, cy = 172, R = 112, n = dims.length;
    var svg = '<svg viewBox="0 0 372 348" width="372" height="348">';
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var a = (-90 + i * 360 / n) * Math.PI / 180;
        pts.push((cx + R * t * Math.cos(a)).toFixed(1) + ',' + (cy + R * t * Math.sin(a)).toFixed(1));
      }
      svg += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="#EDEDED"/>';
    });
    for (var i = 0; i < n; i++) {
      var a = (-90 + i * 360 / n) * Math.PI / 180;
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.cos(a)).toFixed(1) +
        '" y2="' + (cy + R * Math.sin(a)).toFixed(1) + '" stroke="#EDEDED"/>';
    }
    var avgPts = [], curPts = [];
    for (var j = 0; j < n; j++) {
      var ang = (-90 + j * 360 / n) * Math.PI / 180;
      var ra = E.dimAvg(units, j) / dims[j].full;
      var rc = unit.dimScores[j] / dims[j].full;
      avgPts.push((cx + R * ra * Math.cos(ang)).toFixed(1) + ',' + (cy + R * ra * Math.sin(ang)).toFixed(1));
      curPts.push((cx + R * rc * Math.cos(ang)).toFixed(1) + ',' + (cy + R * rc * Math.sin(ang)).toFixed(1));
    }
    svg += '<polygon points="' + avgPts.join(' ') + '" fill="rgba(140,155,171,.14)" stroke="#8C9BAB" stroke-width="1.4" stroke-dasharray="4 3"><title>全局均值</title></polygon>';
    svg += '<polygon points="' + curPts.join(' ') + '" fill="rgba(0,142,224,.18)" stroke="#008EE0" stroke-width="2"><title>' + U.esc(unit.name) + '</title></polygon>';
    for (var k = 0; k < n; k++) {
      var ang2 = (-90 + k * 360 / n) * Math.PI / 180;
      var px = cx + R * (unit.dimScores[k] / dims[k].full) * Math.cos(ang2);
      var py = cy + R * (unit.dimScores[k] / dims[k].full) * Math.sin(ang2);
      var lx = cx + (R + 34) * Math.cos(ang2), ly = cy + (R + 34) * Math.sin(ang2);
      svg += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3" fill="#008EE0"><title>' +
        dims[k].name + '：' + U.num(unit.dimScores[k]) + ' 分 / 第 ' + unit.dimRanks[k] + ' 名 / 全局均值 ' +
        U.num(E.dimAvg(units, k)) + '</title></circle>';
      svg += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" text-anchor="middle" font-size="11.5" fill="#333">' + dims[k].name + '</text>';
      svg += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 17).toFixed(1) + '" text-anchor="middle" font-size="10.5" fill="#888">' +
        U.num(unit.dimScores[k]) + ' · 第' + unit.dimRanks[k] + '名</text>';
    }
    return svg + '</svg>';
  }

  /* ---------- 维度条形图（含全局均值刻度） ---------- */
  function dimBars(unit, units, dims) {
    return '<div class="dimbars">' + dims.map(function (d, i) {
      var pct = unit.dimScores[i] / d.full * 100;
      var apct = E.dimAvg(units, i) / d.full * 100;
      var g = unit.dimGrades[i];
      return '<div class="dimbar">' +
        '<span class="dimbar__name">' + d.name + '</span>' +
        '<span class="dimbar__track" title="' + d.name + ' 满分 ' + d.full + ' 分">' +
        '<span class="dimbar__fill" style="width:' + pct.toFixed(1) + '%;background:' + (DIM_TONE[g] || '#BFBFBF') + '"></span>' +
        '<span style="display:block;height:0;border-top:2px dashed #8C9BAB;margin-top:-9px;margin-left:' + apct.toFixed(1) + '%"></span>' +
        '</span>' +
        '<span class="dimbar__val">' + U.num(unit.dimScores[i]) + '/' + d.full + ' · 第' + unit.dimRanks[i] + '名 · 均值' + U.num(E.dimAvg(units, i)) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 指标穿透表 ---------- */
  function indicatorTable(unit, dict, sort) {
    var rows = unit.indicators.slice();
    // 排序：得分 / 排名 / 维度
    var dimIdx = {};
    window.PD.dims.forEach(function (d, i) { dimIdx[d.name] = i; });
    if (sort.key === 'score') {
      rows.sort(function (a, b) { return sort.dir === 'asc' ? (+a.score || 0) - (+b.score || 0) : (+b.score || 0) - (+a.score || 0); });
    } else if (sort.key === 'rank') {
      rows.sort(function (a, b) { return sort.dir === 'asc' ? (a.rank || 99) - (b.rank || 99) : (b.rank || 99) - (a.rank || 99); });
    } else if (sort.key === 'dim') {
      rows.sort(function (a, b) { return sort.dir === 'asc' ? dimIdx[a.cat] - dimIdx[b.cat] : dimIdx[b.cat] - dimIdx[a.cat]; });
    }
    function th(key, label) {
      var on = sort.key === key;
      return '<th class="sortable' + (on ? ' is-sorted' : '') + '" data-isort="' + key + '">' + label +
        '<span class="sortmark">' + (on ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span></th>';
    }
    var body = rows.map(function (ind) {
      var meta = dict.filter(function (d) { return d.name === ind.name; })[0] || {};
      var isJiangBen = ind.name === '六项降本占比产值比';
      var jbAmount = unit.indicators.filter(function (x) { return x.name === '六项降本金额'; })[0];
      var valCell;
      if (isJiangBen && jbAmount) {
        // 六项降本：绝对额 + 占比双行复合排版（PRD §9.2）
        valCell = '<div class="dualcell"><span class="dualcell__a">绝对额 ' + U.esc(jbAmount.val) + '</span>' +
          '<span class="dualcell__b">占产值比 ' + U.esc(ind.val) + '</span></div>';
      } else if (ind.name === '六项降本金额') {
        return '';
      } else {
        /* P1 #20：取值单位统一（招采时长等量纲型指标补齐字典单位） */
        valCell = '<span class="cell__main">' + U.esc(withUnit(ind.val, meta.unit)) + '</span>';
      }
      var r = ind.rank;
      var scoreTxt = ind.score === '—' ? '<span class="cell--mute">不计分</span>' : U.num(ind.score);
      var rankCell = r == null ? '<span class="cell--mute">展示型</span>' :
        (r <= 3 ? U.medal(r) + ' <span class="cell--top3">' + r + '/21</span>' :
          (r >= 19 ? '<span class="cell--bot3">' + r + '/21</span>' : r + '/21'));
      return '<tr>' +
        '<td><span class="cell__main">' + U.esc(ind.name) + '</span>' +
        (ind.rtype === '展示' ? '<span class="cell__sub">展示型指标 · 不计分</span>' : '') + '</td>' +
        '<td>' + U.esc(ind.cat) + '</td>' +
        '<td>' + valCell + '</td>' +
        '<td class="num">' + scoreTxt + (meta.weight ? '<span class="cell__sub">满分 ' + meta.weight + '</span>' : '') + '</td>' +
        '<td class="ctr">' + rankCell + '</td>' +
        '<td><span class="note">' + U.esc(meta.source || '—') + ' · ' + U.esc(meta.collect || '') +
        (meta.nature ? ' · ' + meta.nature : '') + '</span>' +
        (meta.formula ? '<span class="cell__sub"><span class="formula">' + U.esc(meta.formula) + '</span></span>' : '') + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="card"><div class="card__head">' +
      '<span class="card__title">指标下钻穿透区' +
      '<span class="card__note">15 项计分指标 + 1 项展示指标 · 前三名奖牌 · 后三名单位浅灰预警 · 表头可排序</span></span>' +
      '<span class="chip">六项降本：金额 + 占比双展示</span></div>' +
      '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>指标名称</th>' + th('dim', '所属维度') + '<th>实测客观值</th>' + th('score', '计算得分') +
      th('rank', '局内排名') + '<th>数据源与算法说明</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
  }

  /* ---------- 组织与人才资产 ---------- */
  function parseTalent(text) {
    function m(re) { var r = text.match(re); return r ? r[1] : null; }
    return [
      { k: '采购人员', v: m(/采购(?:管理)?人员\s*(\d+)\s*人/) },
      { k: '物资人员', v: m(/物资(?:管理)?人员\s*(\d+)\s*人/) },
      { k: '中级及以上职称', v: m(/(?:中级及以上职称|中级以上职称|中高级职称)\s*(\d+)\s*人/) },
      { k: '一级注册造价师', v: m(/(?:一级注册造价师持证人数|一级注册造价师持证|注册造价师持证人数|一级造价师)\s*(\d+)/) },
      { k: '一级建造师', v: m(/(?:一级建造师持证人数|一级建造师持证|一级注册建造师持证|一级建造师)\s*(\d+)/) },
      { k: '房建项目配置', v: m(/房建(?:类)?项目物资(?:人员)?配置(?:平均)?\s*([\d.]+)\s*人/) },
      { k: '基础设施配置', v: m(/基础设施项目(?:物资人员配置)?平均\s*([\d.]+)\s*人/) }
    ].filter(function (x) { return x.v; });
  }
  function assetCards(unit) {
    var kpis = parseTalent(unit.talent);
    var branch = (unit.system.match(/(\d+)\s*个分公司/) || [])[1];
    return '<div class="assetgrid">' +
      '<div class="card"><div class="card__head"><span class="card__title">组织与体系建设现状' +
      '<span class="card__note">定性 · 不计分 · 二级单位填报专员录入</span></span></div>' +
      '<div class="card__body"><div class="assettext">' + U.esc(unit.system) + '</div>' +
      (branch ? '<div class="assetkpis"><div class="assetkpi"><div class="assetkpi__label">分公司数量</div>' +
        '<div class="assetkpi__value">' + branch + '<small> 个</small></div></div></div>' : '') +
      '</div></div>' +
      '<div class="card"><div class="card__head"><span class="card__title">人才培养与配置台账' +
      '<span class="card__note">结构化台账 · 不计分 · 与 DHR 湖核验</span></span></div>' +
      '<div class="card__body"><div class="assettext">' + U.esc(unit.talent) + '</div>' +
      (kpis.length ? '<div class="assetkpis">' + kpis.map(function (x) {
        var isRate = x.k.indexOf('配置') >= 0;
        return '<div class="assetkpi"><div class="assetkpi__label">' + x.k + '</div>' +
          '<div class="assetkpi__value">' + x.v + '<small>' + (isRate ? ' 人/项目' : ' 人') + '</small></div></div>';
      }).join('') + '</div>' : '') +
      '</div></div></div>';
  }

  V.portrait = {
    title: '单位画像',
    render: function (App) {
      var units = App.units(), dims = window.PD.dims, dict = window.PD.indicatorDict;
      var unit = App.unit();
      var mode = App.state.chartMode;
      var heroTone = { '好': 'green', '较好': 'blue', '一般': 'gray', '较弱': 'orange', '弱': 'red' }[unit.grade];
      return '<div class="pagehead">' +
        '<div><div class="pagehead__title">单位画像 · ' + U.esc(unit.name) + '</div>' +
        '<div class="pagehead__desc">画像期别 ' + U.esc(App.period().name) + '（' + U.esc(App.period().range) + '）· ' +
        '数据基线为 2026 年 1-6 月实测档案 · 全部展示值由算分引擎唯一输出。</div></div>' +
        '<div class="pagehead__actions">' +
        '<button class="btn btn--default btn--sm btn-back" id="ptBack">' + U.icon('arrowleft', 13) + '返回总览</button>' +
        '<span class="note">单位切换</span>' +
        '<select class="select" id="ptUnit" style="width:170px">' + units.map(function (u) {
          return '<option value="' + u.id + '"' + (u.id === unit.id ? ' selected' : '') + '>' +
            u.rank + '. ' + U.esc(u.name) + '（' + U.num(u.total) + '）</option>';
        }).join('') + '</select>' +
        '<button class="btn btn--primary btn--sm" id="ptExport">' + U.icon('download', 13) + '导出 PDF 报告</button>' +
        '</div></div>' +

      '<div class="grid-2-1">' +
        '<div class="card chartcard"><div class="card__head"><span class="card__title">8 大维度得分与排名' +
        '<span class="card__note">当前单位 vs 全局均值</span></span>' +
        '<div class="tabs" id="ptChartTabs"><button class="tabs__item' + (mode === 'radar' ? ' is-active' : '') +
        '" data-mode="radar">雷达图</button><button class="tabs__item' + (mode === 'bar' ? ' is-active' : '') +
        '" data-mode="bar">条形图</button></div></div>' +
        '<div class="chartbox" id="ptRadar" style="display:' + (mode === 'radar' ? 'flex' : 'none') + '">' + radar(unit, units, dims) + '</div>' +
        '<div class="chartbox" id="ptBar" style="display:' + (mode === 'bar' ? 'flex' : 'none') + '">' + dimBars(unit, units, dims) + '</div>' +
        '<div class="legend"><span class="legend__item"><span class="legend__dot" style="background:#008EE0"></span>本单位得分</span>' +
        '<span class="legend__item"><span class="legend__dot" style="background:#8C9BAB"></span>全局 21 家均值</span>' +
        '<span class="legend__item">条形图虚线刻度 = 全局均值</span></div>' +
        '<div class="radar-tip">维度得分 = 该维度下计分指标得分之和；维度排名为 21 家单位内 RANK.EQ 排名。</div></div>' +

        '<div class="stack">' +
          '<div class="hero"><div class="hero__top"><div>' +
            '<div class="hero__unit">' + U.esc(unit.name) + '</div>' +
            '<div class="hero__meta">' + U.esc(App.period().name) + ' · ' + U.esc(window.PD.meta.platform.split('·').pop().trim()) + '</div>' +
          '</div><span class="tag tag--' + heroTone + '" style="background:rgba(255,255,255,.9)">定级 ' + U.esc(unit.grade) + '</span></div>' +
          '<div class="hero__score"><b>' + U.num(unit.total) + '</b><span>/ 100 分</span></div>' +
          '<span class="hero__rank">全局排名 ' + unit.rank + ' / ' + units.length + '</span>' +
          '<div class="hero__comment"><span class="lbl">整体评价</span><span class="auto">系统引擎自动生成</span><br>' +
          U.esc(unit.overall.replace(/^整体评价：/, '')) + '</div></div>' +

          '<div class="card"><div class="card__head"><span class="card__title">8 维度得分明细' +
          '<span class="card__note">维度定级基于维度排名</span></span></div>' +
          '<div class="tablewrap"><table class="table"><thead><tr><th>画像维度</th><th class="ctr">画像分</th>' +
          '<th class="ctr">画像排名</th><th class="ctr">画像评价</th></tr></thead><tbody>' +
          dims.map(function (d, i) {
            var r = unit.dimRanks[i];
            var rc = r <= 3 ? ' cell--top3' : (r >= 19 ? ' cell--bot3' : '');
            return '<tr><td>' + (i + 1) + '.' + d.name + '（' + d.full + '）</td>' +
              '<td class="num cell__main">' + U.num(unit.dimScores[i]) + '</td>' +
              '<td class="ctr' + rc + '">' + r + '/' + units.length + '</td>' +
              '<td class="ctr">' + U.gradeTag(unit.dimGrades[i]) + '</td></tr>';
          }).join('') +
          '</tbody><tfoot><tr><td>画像总分（100）</td>' +
          '<td class="num cell--top3" style="font-size:14px">' + U.num(unit.total) + '</td>' +
          '<td class="ctr cell--top3">' + unit.rank + '/' + units.length + '</td>' +
          '<td class="ctr">' + U.gradeTag(unit.grade) + '</td></tr></tfoot></table></div></div>' +
        '</div>' +
      '</div>' +

      indicatorTable(unit, dict, App.state.ptSort) +
      assetCards(unit);
    },
    mount: function (App, root) {
      var sel = root.querySelector('#ptUnit');
      if (sel) { sel.addEventListener('change', function () { App.go('portrait', +this.value); }); }
      var back = root.querySelector('#ptBack');
      if (back) { back.addEventListener('click', function () { App.go('overview'); }); }
      var ex = root.querySelector('#ptExport');
      if (ex) { ex.addEventListener('click', function () { App.exportReport(App.unit()); }); }
      Array.prototype.forEach.call(root.querySelectorAll('#ptChartTabs .tabs__item'), function (b) {
        b.addEventListener('click', function () {
          App.state.chartMode = b.getAttribute('data-mode');
          root.querySelector('#ptRadar').style.display = App.state.chartMode === 'radar' ? 'flex' : 'none';
          root.querySelector('#ptBar').style.display = App.state.chartMode === 'bar' ? 'flex' : 'none';
          Array.prototype.forEach.call(root.querySelectorAll('#ptChartTabs .tabs__item'), function (x) {
            x.classList.toggle('is-active', x === b);
          });
        });
      });
      Array.prototype.forEach.call(root.querySelectorAll('[data-isort]'), function (th) {
        th.addEventListener('click', function () {
          var k = th.getAttribute('data-isort'), s = App.state.ptSort;
          if (s.key === k) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
          else { s.key = k; s.dir = (k === 'rank' ? 'asc' : 'desc'); }
          App.rerender();
        });
      });
    }
  };
})();
