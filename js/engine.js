/* ============================================================
   算分与排名引擎（对应 PRD v2.0 §8.2 / §8.3 / §8.4）
   · 阶梯排名扣分法（正向优 / 负向优）
   · 基础倒扣法 · 系数等比折算法
   · RANK.EQ 竞争排名（同值并列、下一名次顺延）
   · 五级定级强制映射 · 四段式评语组装
   · 修正后全量联动重算（§8.6）
   ============================================================ */
window.Engine = (function () {
  'use strict';

  /* RANK.EQ：同值并列同名次，下一名次跳跃顺延 */
  function compRank(values) {
    return values.map(function (v) {
      var c = 0;
      for (var i = 0; i < values.length; i++) { if (values[i] > v) c++; }
      return c + 1;
    });
  }

  /* 五级定级强制映射 */
  function band(rank) {
    if (rank <= 4) return '好';
    if (rank <= 8) return '较好';
    if (rank <= 15) return '一般';
    if (rank <= 19) return '较弱';
    return '弱';
  }
  var TONE = { '好': 'green', '较好': 'blue', '一般': 'gray', '较弱': 'orange', '弱': 'red' };
  function gradeTone(g) { return TONE[g] || 'gray'; }

  /* 阶梯排名扣分法：得分 = MIN(满分, 满分 −(名次−1)×Step)，下限 0 */
  function scoreByRank(weight, step, rank) {
    return Math.max(0, Math.min(weight, weight - (rank - 1) * step));
  }
  /* 基础倒扣法：MAX(0, 满分 − 项数 × 每项扣分) */
  function scoreDeduct(base, count, per) { return Math.max(0, base - count * per); }
  /* 系数等比折算法：ROUND(平台分 × 系数, 2) */
  function scoreScale(score, k) { return Math.round(score * k * 100) / 100; }

  /* 四段式评语（§8.4）：[A]整体情况 / [B]优秀(1-4) / [C]一般(5-15) / [D]需重点提升(16-21) */
  function comment(unit, dims) {
    var B = [], C = [], D = [];
    dims.forEach(function (d, i) {
      var r = unit.dimRanks[i];
      if (r <= 4) { B.push(d.name); }
      else if (r <= 15) { C.push(d.name); }
      else { D.push(d.name); }
    });
    var s = '整体评价：整体情况' + unit.grade;
    s += B.length ? ('，' + B.join('、') + '优秀') : '，无突出优秀维度';
    if (C.length) { s += '，' + C.join('、') + '一般'; }
    if (D.length) { s += '，' + D.join('、') + '需重点提升'; }
    return s + '。';
  }

  /* 全量联动重算：维度排名 → 维度定级 → 总分排名 → 总分定级 → 评语 */
  function recompute(units, dims) {
    for (var di = 0; di < dims.length; di++) {
      var vals = units.map(function (u) { return u.dimScores[di]; });
      var rr = compRank(vals);
      units.forEach(function (u, i) { u.dimRanks[di] = rr[i]; });
    }
    var tr = compRank(units.map(function (u) { return u.total; }));
    units.forEach(function (u, i) {
      u.rank = tr[i];
      u.grade = band(u.rank);
      u.dimGrades = u.dimRanks.map(band);
      u.overall = comment(u, dims);
    });
    return units;
  }

  /* 单指标实时位次测算（填报端即时预览） */
  function previewRank(values, v, dir) {
    var c = 0;
    values.forEach(function (x) {
      if (dir === 'asc') { if (x < v) { c++; } } else { if (x > v) { c++; } }
    });
    return c + 1;
  }

  /* 维度全局均值（雷达图/条形图对标线） */
  function dimAvg(units, di) {
    var s = units.reduce(function (a, u) { return a + u.dimScores[di]; }, 0);
    return Math.round((s / units.length) * 100) / 100;
  }
  function totalAvg(units) {
    var s = units.reduce(function (a, u) { return a + u.total; }, 0);
    return Math.round((s / units.length) * 100) / 100;
  }

  return {
    compRank: compRank, band: band, gradeTone: gradeTone,
    scoreByRank: scoreByRank, scoreDeduct: scoreDeduct, scoreScale: scoreScale,
    comment: comment, recompute: recompute, previewRank: previewRank,
    dimAvg: dimAvg, totalAvg: totalAvg
  };
})();
