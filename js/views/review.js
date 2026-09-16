/* ============================================================
   视图 4 · 填报审核（U3 二级单位供应链负责人）
   · 待办数据包审阅 · 与上期对比（变动 >20% 标黄）
   · 通过并上报 / 一键驳回（驳回意见必填 ≥10 字）
   ============================================================ */
(function () {
  'use strict';
  var V = window.Views = window.Views || {};
  var U = window.UI;

  function cmpTable(items) {
    return '<div class="cmplist">' + items.map(function (it) {
      var warn = Math.abs(it.delta) > 20;
      var chip = it.delta === 0 ? '<span class="deltachip deltachip--flat">持平</span>' :
        '<span class="deltachip ' + (warn ? 'deltachip--warn' : 'deltachip--up') + '">' +
        (it.delta > 0 ? '+' : '') + it.delta.toFixed(1) + '%</span>';
      return '<div class="cmprow' + (warn ? ' is-warn' : '') + '">' +
        '<span class="cmprow__label">' + U.esc(it.label) + '</span>' +
        '<span class="cmprow__vals"><span class="cmprow__cur">' + U.esc(it.cur) + '</span>' +
        '<span class="cmprow__prev">（上期 ' + U.esc(it.prev) + '）</span></span>' + chip + '</div>';
    }).join('') + '</div>';
  }

  V.review = {
    title: '填报审核',
    render: function (App) {
      var pd = window.PD, st = App.state.pkg.status;
      var pending = pd.review.pending[0];
      var isPending = st === 'SUBMITTED';

      var head = '<div class="pagehead">' +
        '<div><div class="pagehead__title">填报审核 · 二级单位供应链负责人</div>' +
        '<div class="pagehead__desc">审核本单位填报专员提交的数据包：系统高亮展示与上期的增减变动（变动 &gt; 20% 标黄），' +
        '通过后加具部门意见上报局总部；驳回须填写不少于 10 字的修改意见，退回专员重新填报。</div></div>' +
        '<div class="pagehead__actions">' + U.statusTag(st) + '</div></div>';

      /* 待办区 */
      var body;
      if (isPending) {
        body = '<div class="grid-2-1">' +
          '<div class="card"><div class="card__head"><span class="card__title">待审数据包 · ' + U.esc(pending.unit) +
          '<span class="card__note">' + U.esc(pending.periodName) + '</span></span>' +
          '<span class="tag tag--blue">待负责人审核</span></div>' +
          '<div class="card__body">' +
          U.kv([
            ['数据包编号', pending.id],
            ['提交人', U.esc(pending.by) + '（二级单位填报专员）'],
            ['提交时间', U.esc(pending.at)],
            ['数据完整率', pending.completeness + ' %'],
            ['包含字段', '机构设置 1 项 · 人员资质 7 项 · 业务台账 4 项'],
            ['合规扣分项', '<span class="tag tag--red">不在本数据包内（局总部直填，二级单位不可见/不可写）</span>']
          ]) +
          '<div class="divider"></div>' +
          '<div class="inline--between"><b style="font-size:13px">与上期对比</b>' +
          '<span class="note">变动幅度 &gt; 20% 标黄提示，需重点复核</span></div>' +
          '<div class="mt2">' + cmpTable(pending.items) + '</div>' +
          '</div></div>' +

          '<div class="stack">' +
            '<div class="card"><div class="card__head"><span class="card__title">审核操作</span></div>' +
            '<div class="card__body">' +
            '<div class="field"><label class="field__label">部门审核意见（通过时选填，驳回时必填 ≥10 字）</label>' +
            '<textarea class="textarea" id="rvComment" placeholder="请填写审核意见，例如：台账经部门复核，数据与 DHR 基准一致，同意上报局总部。"></textarea>' +
            '<div class="field__err" id="rvErr">驳回时必须填写不少于 10 字的修改意见</div></div>' +
            '<div class="btnbar mt3">' +
            '<button class="btn btn--primary" id="rvPass">通过并上报局总部</button>' +
            '<button class="btn btn--danger" id="rvReject">一键驳回</button></div></div></div>' +

            '<div class="card"><div class="card__head"><span class="card__title">权限边界提示' +
            '<span class="card__note">AC-07 合规扣分物理隔离</span></span></div><div class="card__body">' +
            '<div class="note">本页及填报端均不呈现「一标一检不合规业务项数」「合规考试不合格数」字段；' +
            '该两项仅局总部权威直填通道可见可写，二级单位账号在接口层物理隔离，' +
            '伪造提交将被后端拦截并记录非法请求警报。</div></div></div>' +
          '</div></div>';
      } else {
        body = '<div class="card"><div class="card__body">' +
          U.empty(st === 'DRAFT' ? '本单位数据包尚未提交，暂无可审核事项（请切换至「二级单位填报专员」角色完成填报并提交）' :
            (st === 'DEPT_APPROVED' ? '本单位数据包已通过部门审核并上报局总部（状态：部门已审待局审）' :
              (st === 'DEPT_REJECTED' ? '本单位数据包已驳回，等待填报专员修改后重新提交' :
                '本单位数据包已进入局总部终审/发布阶段'))) +
          '</div></div>';
      }

      /* 审核历史 */
      var history = '<div class="card"><div class="card__head"><span class="card__title">本单位审核历史' +
        '<span class="card__note">驳回与通过全程留痕</span></span></div>' +
        '<div class="tablewrap"><table class="table"><thead><tr><th>编号</th><th>单位</th><th>期别</th>' +
        '<th>审核结果</th><th>审核人</th><th>时间</th><th>意见</th></tr></thead><tbody>' +
        pd.review.history.concat(App.state.pkg.history || []).map(function (h) {
          return '<tr><td class="mono">' + U.esc(h.id) + '</td><td>' + U.esc(h.unit) + '</td><td>' + U.esc(h.periodName) + '</td>' +
            '<td>' + (h.result === '通过并上报' ? U.tag('通过并上报', 'green') : U.tag('驳回修改', 'red')) + '</td>' +
            '<td>' + U.esc(h.by) + '</td><td>' + U.esc(h.at) + '</td>' +
            '<td class="reasoncell">' + U.esc(h.comment) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      return head + body + history;
    },
    mount: function (App, root) {
      var pass = root.querySelector('#rvPass');
      var rej = root.querySelector('#rvReject');
      var cmt = root.querySelector('#rvComment');
      if (pass) {
        pass.addEventListener('click', function () {
          var text = cmt.value.trim() || '台账经部门复核，数据与 DHR 基准一致，同意上报局总部。';
          U.confirm('确认通过并上报局总部？上报后数据包将进入局总部终审泳道，二级单位端不可再修改。', function () {
            App.state.pkg.status = 'DEPT_APPROVED';
            App.state.pkg.approvedAt = App.now();
            App.state.pkg.comment = text;
            App.state.pkg.history = (App.state.pkg.history || []).concat([{
              id: 'SH-2026H1-NF', unit: '南方公司', periodName: '2026年1-6月', result: '通过并上报',
              by: '李强（供应链负责人）', at: App.now(), comment: text
            }]);
            U.toast('已通过并上报局总部，状态更新为「部门已审待局审」', 'success');
            App.rerender();
          }, { okText: '通过并上报' });
        });
      }
      if (rej) {
        rej.addEventListener('click', function () {
          var text = cmt.value.trim();
          if (text.length < 10) {
            cmt.classList.add('is-invalid');
            var f = cmt.closest('.field');
            if (f) { f.classList.add('is-invalid'); }
            U.toast('请填写驳回修改意见（不少于 10 字）', 'warn');
            return;
          }
          U.confirm('确认驳回该数据包？专员将收到驳回意见并需修改后重新提交。', function () {
            App.state.pkg.status = 'DEPT_REJECTED';
            App.state.pkg.reject = text;
            App.state.pkg.history = (App.state.pkg.history || []).concat([{
              id: 'SH-2026H1-NF', unit: '南方公司', periodName: '2026年1-6月', result: '驳回修改',
              by: '李强（供应链负责人）', at: App.now(), comment: text
            }]);
            U.toast('已驳回，专员端状态更新为「部门已驳回」', 'warn');
            App.rerender();
          }, { okText: '确认驳回' });
        });
      }
    }
  };
})();
