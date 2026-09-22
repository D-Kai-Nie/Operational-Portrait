/* ============================================================
   视图 6 · 指标字典（口径唯一事实源 · 权重校验 · 版本留痕）
   ============================================================ */
(function () {
  'use strict';
  var V = window.Views = window.Views || {};
  var U = window.UI;

  var NATURE_TONE = { '正向优': 'green', '负向优': 'orange', '折算': 'blue', '展示': 'gray', '定性': 'purple', '定量': 'cyan' };

  function dictTable() {
    var dict = window.PD.indicatorDict;
    var dims = window.PD.dims;
    var weightSum = dict.reduce(function (a, d) { return a + (+d.weight || 0); }, 0);
    /* P2 #4：按 8 大维度分组 + 维度小计，降低 18 行平铺的定位成本 */
    var order = dims.map(function (d) { return d.name; }).concat(['基础支撑']);
    var html = '';
    order.forEach(function (dimName) {
      var rows = dict.filter(function (d) { return d.dim === dimName; });
      if (!rows.length) { return; }
      var sub = rows.reduce(function (a, d) { return a + (+d.weight || 0); }, 0);
      html += '<tr class="dictgroup"><td colspan="9"><div class="dictgroup__title">' +
        U.esc(dimName) + '<span class="dictgroup__sum">' + (sub > 0 ?
          ('维度权重合计 ' + sub + ' 分 · ' + rows.length + ' 项') : ('不计分 · ' + rows.length + ' 项（定性/展示）')) +
        '</span></div></td></tr>';
      html += rows.map(function (d) {
        var isScore = d.weight > 0;
        return '<tr>' + '<td>' + U.esc(d.dim) + '</td>' +
          '<td><span class="cell__main">' + U.esc(d.name) + '</span>' +
          (isScore ? '' : '<span class="cell__sub">不计分</span>') + '</td>' +
          '<td class="ctr">' + (isScore ?
            '<span class="weightbar"><span class="weightbar__track"><span class="weightbar__fill" style="width:' + (d.weight * 6) + '%"></span></span>' +
            '<b>' + d.weight + '</b></span>' : '<span class="cell--mute">0</span>') + '</td>' +
          '<td class="ctr">' + U.tag(d.nature, NATURE_TONE[d.nature] || 'gray') + '</td>' +
          '<td class="ctr">' + U.esc(d.dir) + (d.step != null ? '<span class="cell__sub">步长 ' + d.step + '</span>' : '') + '</td>' +
          '<td>' + (d.formula ? '<span class="formula">' + U.esc(d.formula) + '</span>' : '<span class="cell--mute">—</span>') + '</td>' +
          '<td class="reasoncell">' + U.esc(d.caliber) + '</td>' +
          '<td class="ctr">' + U.esc(d.range) + '</td>' +
          '<td><span class="note">' + U.esc(d.source) + '</span><span class="cell__sub">' + U.esc(d.collect) + '</span></td>' +
          '</tr>';
      }).join('');
    });
    return '<div class="card"><div class="card__head">' +
      '<span class="card__title">指标字典 · 15 项计分指标 + 1 项展示指标 + 2 项定性支撑' +
      '<span class="card__note">按维度分组 · 公式与扣减系数固化于算分引擎底层，配置变更须走系统审批并留痕</span></span>' +
      '<div class="inline">' +
      '<span class="tag ' + (weightSum === 100 ? 'tag--green' : 'tag--red') + '">Σ 权重 = ' + weightSum + ' 分' + (weightSum === 100 ? '（校验通过）' : '（校验失败）') + '</span>' +
      '<span class="chip">8 大维度</span></div></div>' +
      '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>维度</th><th>指标名称</th><th class="ctr">权重</th><th class="ctr">指标性质</th><th class="ctr">方向</th>' +
      '<th>得分公式</th><th>业务统计口径</th><th>理论分值区间</th><th>数据来源 / 采集方式</th></tr></thead><tbody>' +
      html + '</tbody></table></div></div>';
  }

  function algorithmCard() {
    return '<div class="card"><div class="card__head"><span class="card__title">算分算法与排名规则' +
      '<span class="card__note">PRD §8.2 / §8.3 / §8.4</span></span></div><div class="card__body">' +
      '<div class="grid2">' +
      '<div><div class="stack stack--sm">' +
      '<div><b>阶梯排名扣分法（正向优）</b><div class="formula mt2">得分 = MIN(满分, 满分 − (名次−1) × 步长)</div>' +
      '<div class="note mt2">数值越大名次越前；各维度扣减步长见字典「步长」列。</div></div>' +
      '<div><b>阶梯排名扣分法（负向优）</b><div class="formula mt2">得分 = MIN(满分, 满分 − (名次−1) × 步长)</div>' +
      '<div class="note mt2">招采时长、亿元产值投诉占比、投诉数量按数值升序排名。</div></div>' +
      '<div><b>基础倒扣法（一标一检）</b><div class="formula mt2">得分 = MAX(0, 10 − 不合规项数 × 0.1)</div></div>' +
      '</div></div>' +
      '<div><div class="stack stack--sm">' +
      '<div><b>系数等比折算法（数字供应链）</b><div class="formula mt2">得分 = ROUND(平台月度考核均分 × 0.10, 2)</div></div>' +
      '<div><b>并列排名（RANK.EQ 语义）</b><div class="note mt2">同值并列同名次、得分相同，下一名次顺延。' +
      '示例：四公司与新型建造总分同为 92.65，均判定为并列第 8 名并定级「较好」；华中公司 92.47 顺延为第 10 名。</div></div>' +
      '<div><b>五级定级强制映射</b><div class="note mt2">好 1-4 · 较好 5-8 · 一般 9-15 · 较弱 16-19 · 弱 20-21；' +
      '总分与各维度均按名次定级。</div></div>' +
      '<div><b>四段式智能评语</b><div class="formula mt2">整体评价：整体情况[A]，[B]优秀，[C]一般，[D]需重点提升。</div>' +
      '<div class="note mt2">[B] 维度排名 1-4；[C] 5-15；[D] 16-21；空子句按语法平滑规则处理。</div></div>' +
      '</div></div>' +
      '</div></div></div>';
  }

  function versionCard() {
    return '<div class="card"><div class="card__head"><span class="card__title">口径配置版本留痕' +
      '<span class="card__note">配置变更全部记录修改人 / 时间 / 原值 / 新值 / 缘由</span></span></div>' +
      '<div class="card__body">' + window.PD.configVersions.map(function (v) {
        return '<div class="versline"><div class="versline__ver">' + U.esc(v.ver) + '</div>' +
          '<div class="versline__body"><div>' + U.esc(v.change) + '</div>' +
          '<div class="note mt2">缘由：' + U.esc(v.reason) + '</div></div>' +
          '<div class="versline__meta">' + U.esc(v.by) + '<br>' + U.esc(v.at) + '<br>' +
          U.tag(v.status, v.status === '生效' ? 'green' : 'gray') + '</div></div>';
      }).join('') + '</div></div>';
  }

  V.dict = {
    title: '指标字典',
    render: function () {
      return '<div class="pagehead">' +
        '<div><div class="pagehead__title">指标字典与口径配置</div>' +
        '<div class="pagehead__desc">口径即配置：15 项计分指标的权重、方向、得分公式、扣减步长、单位、数据源与采集方式集中维护，' +
        '作为算分引擎与看板展示的唯一事实源；Σ 权重必须等于 100，否则阻断保存。</div></div>' +
        '</div>' +
        dictTable() +
        '<div class="grid2">' + algorithmCard() + versionCard() + '</div>';
    },
    mount: function () {}
  };
})();
