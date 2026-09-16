/* ============================================================
   视图 1 · 画像总览（21 家全景排名 · 等级分布 · 维度对标）
   ============================================================ */
(function () {
  'use strict';
  var V = window.Views = window.Views || {};
  var E = window.Engine, U = window.UI;

  function gradeTone(g) {
    return { '好': '#52C41A', '较好': '#1890FF', '一般': '#BFBFBF', '较弱': '#FA8C16', '弱': '#F5222D' }[g] || '#BFBFBF';
  }

  function statRow(units, dims) {
    var sorted = units.slice().sort(function (a, b) { return b.total - a.total; });
    var top = sorted[0], bottom = sorted[sorted.length - 1];
    var avg = E.totalAvg(units);
    return '<div class="statgrid">' +
      U.statCard({ label: '参评主业单位', value: units.length, unit: '家', sub: '期别 ' + window.PD.periods[0].name + ' · ' + window.PD.periods[0].type + '画像', mod: '' }) +
      U.statCard({ label: '画像总分最高', value: U.num(top.total), sub: top.name + ' · 定级「' + top.grade + '」', mod: 'stat--hao' }) +
      U.statCard({ label: '画像总分最低', value: U.num(bottom.total), sub: bottom.name + ' · 定级「' + bottom.grade + '」', mod: 'stat--ruo' }) +
      U.statCard({ label: '全局平均总分', value: U.num(avg), sub: '8 维度权重合计 100 分', mod: 'stat--warn' }) +
      '</div>';
  }

  function gradeDist(units) {
    var bands = [
      { g: '好', range: '1-4 名' }, { g: '较好', range: '5-8 名' }, { g: '一般', range: '9-15 名' },
      { g: '较弱', range: '16-19 名' }, { g: '弱', range: '20-21 名' }
    ];
    var total = units.length;
    var counts = bands.map(function (b) {
      return { g: b.g, range: b.range, n: units.filter(function (u) { return u.grade === b.g; }).length };
    });
    var stack = '<div class="gradestack">' + counts.filter(function (c) { return c.n; }).map(function (c) {
      return '<span class="gradestack__seg" style="width:' + (c.n / total * 100).toFixed(1) + '%;background:' + gradeTone(c.g) + '" ' +
        'title="' + c.g + '（' + c.range + '）：' + c.n + ' 家">' + c.g + ' ' + c.n + ' 家</span>';
    }).join('') + '</div>';
    var list = '<div class="gradelist">' + counts.map(function (c) {
      return '<div class="gradelist__item"><span class="gradelist__dot" style="background:' + gradeTone(c.g) + '"></span>' +
        '<span class="gradelist__name">' + c.g + '</span>' +
        '<span class="gradelist__range">' + c.range + '</span><b>' + c.n + '</b> 家</div>';
    }).join('') + '</div>';
    return '<div class="card"><div class="card__head"><span class="card__title">五级定级分布' +
      '<span class="card__note">按画像总分全局排名强制映射（好 1-4 · 较好 5-8 · 一般 9-15 · 较弱 16-19 · 弱 20-21）；' +
      '并列名次按并入区间定级，本期共 ' + total + ' 家单位</span></span></div>' +
      '<div class="card__body">' + stack + list + '</div></div>';
  }

  function table(units, dims, sort) {
    var list = units.slice();
    list.sort(function (a, b) {
      var av, bv;
      if (sort.key === 'rank') { av = a.rank; bv = b.rank; }
      else if (sort.key === 'name') { return sort.dir === 'asc' ? (a.name > b.name ? 1 : -1) : (a.name < b.name ? 1 : -1); }
      else if (sort.key === 'total') { av = a.total; bv = b.total; }
      else { av = a.dimScores[+sort.key]; bv = b.dimScores[+sort.key]; }
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    var rankCount = {};
    units.forEach(function (u) { rankCount[u.rank] = (rankCount[u.rank] || 0) + 1; });

    function th(key, label, extra) {
      var on = sort.key === key;
      return '<th class="ctr sortable' + (on ? ' is-sorted' : '') + '" data-sort="' + key + '"' + (extra || '') + '>' +
        label + '<span class="sortmark">' + (on ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span></th>';
    }
    var head = '<tr>' + th('rank', '排名') + '<th>单位名称</th>' + th('total', '画像总分') + '<th class="ctr">定级</th>' +
      dims.map(function (d, i) {
        return th(String(i), d.name, ' title="' + d.name + '（满分 ' + d.full + '）"');
      }).join('') + '<th class="ctr">操作</th></tr>';

    var body = list.map(function (u) {
      var tie = rankCount[u.rank] > 1;
      var top3 = u.rank <= 3, bot3 = u.rank >= 19;
      var rc = top3 ? ' cell--top3' : (bot3 ? ' cell--bot3' : '');
      var rowCls = top3 ? ' class="row--top3"' : (bot3 ? ' class="row--bot3"' : '');
      return '<tr data-unit="' + u.id + '"' + rowCls + '>' +
        '<td class="ctr' + rc + '">' + (top3 ? U.medal(u.rank) : u.rank) + (tie ? '<span class="cell__sub">并列</span>' : '') + '</td>' +
        '<td><a class="btn--link" data-unit="' + u.id + '">' + U.esc(u.name) + '</a></td>' +
        '<td class="ctr cell__main' + rc + '">' + U.num(u.total) + '</td>' +
        '<td class="ctr">' + U.gradeTag(u.grade) + '</td>' +
        dims.map(function (d, i) {
          var r = u.dimRanks[i];
          var c = r <= 3 ? ' cell--top3' : (r >= 19 ? ' cell--bot3' : '');
          return '<td class="ctr' + c + '">' + U.num(u.dimScores[i]) + '<span class="cell__sub">第' + r + '名</span></td>';
        }).join('') +
        '<td class="ctr"><button class="btn--link" data-unit="' + u.id + '">查看画像</button></td></tr>';
    }).join('');

    return '<div class="card"><div class="card__head">' +
      '<span class="card__title">主业单位画像排名总览' +
      '<span class="card__note">表头可点击排序 · 前三名奖牌标记 · 后三名浅灰预警</span></span>' +
      '<div class="inline"><span class="chip chip--brand">Σ 权重 100 分</span>' +
      '<span class="chip">RANK.EQ 并列语义</span></div></div>' +
      '<div class="tablewrap"><table class="table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></div>';
  }

  function statusBanner(App) {
    var st = App.state.bureau.stage, pd = App.period();
    if (st === 'PUBLISHED') {
      return '<div class="dialog__tip" style="margin-bottom:16px;background:#F6FFED;border-color:#B7EB8F">' +
        U.tag('正式版', 'green') + ' 「' + U.esc(pd.name) + '」画像已于 ' + U.esc(App.state.bureau.publishedAt) +
        ' 正式定版发布，快照指纹 <b class="mono">' + U.esc(App.state.bureau.digest) + '</b>，对公共角色可见。</div>';
    }
    if (st === 'PRE') {
      return '<div class="dialog__tip" style="margin-bottom:16px;background:#FFF7E6;border-color:#FFD591">' +
        U.tag('预发布版', 'orange') + ' 引擎已生成全局预发布版画像，局总部复核中；' +
        '依据发布规则，公共角色需待【正式定版发布】后方可见（当前查看者角色：' + U.esc(App.role().label) + '）。</div>';
    }
    return '<div class="dialog__tip" style="margin-bottom:16px">' +
      U.tag('待终审', 'gray') + ' 本期尚在数据填报与审核阶段，' +
      (App.can('govern') ? '请前往【画像治理 · 终审与算分】生成预发布版。' : '待局总部终审并通过后生成预发布版画像。') + '</div>';
  }

  V.overview = {
    title: '画像总览',
    render: function (App) {
      var units = App.units(), dims = window.PD.dims;
      return '<div class="pagehead">' +
        '<div><div class="pagehead__title">供应链画像 · 全景总览</div>' +
        '<div class="pagehead__desc">中建八局 21 家局属主业二级单位，按 8 大维度 15 项计分指标百分制评价，' +
        '全局 RANK.EQ 排名并强制五级定级（好 / 较好 / 一般 / 较弱 / 弱）。</div></div>' +
        '<div class="pagehead__actions">' +
        '<span class="chip chip--period" id="periodChip" title="点击切换画像期别">' +
        '<span class="chip__label">画像期别</span>' + U.esc(App.period().name) + '</span>' +
        '<button class="btn btn--default btn--sm" id="ovExport">' + U.icon('download', 13) + '导出全景报告</button>' +
        '</div></div>' +
        statusBanner(App) +
        statRow(units, dims) +
        /* 主体：主业单位画像排名总览（含排名 / 总分 / 定级 / 8 维度，可排序） */
        table(units, dims, App.state.ovSort) +
        /* 页面底部：五级定级分布（整行满宽） */
        gradeDist(units);
    },
    mount: function (App, root) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-unit]'), function (el) {
        el.addEventListener('click', function () { App.go('portrait', +el.getAttribute('data-unit')); });
      });
      Array.prototype.forEach.call(root.querySelectorAll('.table th.sortable'), function (th) {
        th.addEventListener('click', function () {
          var key = th.getAttribute('data-sort');
          var s = App.state.ovSort;
          if (s.key === key) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
          else { s.key = key; s.dir = (key === 'rank' ? 'asc' : 'desc'); }
          App.rerender();
        });
      });
      var ex = root.querySelector('#ovExport');
      if (ex) { ex.addEventListener('click', function () { App.exportReport(); }); }
      var pc = root.querySelector('#periodChip');
      if (pc) { pc.addEventListener('click', function () { App.openPeriodDialog(); }); }
    }
  };
})();
