/* ============================================================
   视图 3 · 数据填报（U2 二级单位填报专员集约录入）
   · 机构设置（体系建设） · 人员资质台账 · 自采与策划台账
   · 即时校验（防空 / 极值 / 期间一致性 / DHR 核验）
   · 失焦即时测算：预计得分与全局参考位次
   ============================================================ */
(function () {
  'use strict';
  var V = window.Views = window.Views || {};
  var E = window.Engine, U = window.UI;

  function valList(validators) {
    return '<div class="validlist">' + validators.map(function (v) {
      var cls = v.result === 'pass' ? 'pass' : (v.result === 'warn' ? 'warn' : 'fail');
      var mark = v.result === 'pass' ? '✓' : '!';
      return '<div class="validlist__row"><span class="validlist__icon validlist__icon--' + cls + '">' + mark + '</span>' +
        '<span><b>' + U.esc(v.label) + '</b> <span class="validlist__detail">' + U.esc(v.detail) + '</span></span></div>';
    }).join('') + '</div>';
  }

  function dlt(cur, prev) {
    if (!prev) { return '<span class="deltachip deltachip--flat">新增</span>'; }
    var d = (cur - prev) / prev * 100;
    if (Math.abs(d) < 0.05) { return '<span class="deltachip deltachip--flat">持平</span>'; }
    var cls = Math.abs(d) > 20 ? 'deltachip--warn' : 'deltachip--up';
    return '<span class="deltachip ' + cls + '">' + (d > 0 ? '+' : '') + d.toFixed(1) + '%</span>';
  }

  function numberField(id, label, value, opts) {
    opts = opts || {};
    return '<div class="field" id="f-' + id + '">' +
      '<label class="field__label" for="' + id + '">' + U.esc(label) + (opts.req ? '<span class="req">*</span>' : '') + '</label>' +
      '<div class="inputgroup"><input class="input" id="' + id + '" type="number" step="' + (opts.step || '0.01') + '" value="' + U.esc(value) + '"' +
      (opts.readonly ? ' readonly' : '') + '>' + (opts.unit ? '<span class="inputgroup__unit">' + U.esc(opts.unit) + '</span>' : '') + '</div>' +
      '<div class="field__hint">' + (opts.hint || '') + '</div><div class="field__err">请填写合法数值</div></div>';
  }

  V.fill = {
    title: '数据填报',
    render: function (App) {
      var pd = window.PD, F = App.state.fillForm, T = pd.fill.task;
      var editable = App.state.pkg.status === 'DRAFT' || App.state.pkg.status === 'DEPT_REJECTED';
      var selfRate = F.biz.selfTotal ? (F.biz.selfAmount / F.biz.selfTotal * 100) : 0;
      var planRate = F.biz.planIncome ? (F.biz.planBenefit / F.biz.planIncome * 100) : 0;
      var prev = pd.fill.prev;
      var branchesSum = F.system.modes.reduce(function (a, m) { return a + (+m.count || 0); }, 0);

      var rejectBanner = App.state.pkg.status === 'DEPT_REJECTED' ?
        '<div class="dialog__tip" style="background:#FFF1F0;border-color:#FFA39E;margin-bottom:16px">' +
        U.tag('部门已驳回', 'red') + ' <b>驳回意见：</b>' + U.esc(App.state.pkg.reject || '—') +
        '<br><span class="note">请修改后重新提交部门审核。</span></div>' :
        (App.state.pkg.status === 'SUBMITTED' ?
          '<div class="dialog__tip" style="background:#E6F7FF;border-color:#91D5FF;margin-bottom:16px">' +
          U.tag('已上报', 'blue') + ' 数据包已提交至二级单位供应链负责人审核，当前表单已锁定为只读。</div>' : '');

      return '<div class="pagehead">' +
        '<div><div class="pagehead__title">数据填报 · 二级单位集约录入</div>' +
        '<div class="pagehead__desc">v2.0 已彻底取消项目端填报：全部数据由二级单位填报专员依据单位台账集约录入，' +
        '系统内置防空、极值、期间一致性与 DHR 基准校验，提交后进入负责人审核泳道。</div></div>' +
        '<div class="pagehead__actions">' + U.tag('项目部填报账号数 0', 'purple') + '</div></div>' +

      '<div class="taskcard"><div>' +
        '<div class="taskcard__title">' + U.esc(T.periodName) + ' 画像数据填报任务 · ' + U.esc(T.unit) + '</div>' +
        '<div class="taskcard__sub">填报人：' + U.esc(T.owner) + '（' + U.esc(T.role) + '） · 截止时间：' + U.esc(T.deadline) +
        ' · 数据范围：期别内累计值（绝对值累加、比率按累计分子分母重算）</div></div>' +
        '<div class="taskcard__right"><div class="countdown"><div class="countdown__num">' + T.remainDays + '</div>' +
        '<div class="countdown__label">天后截止</div></div>' + U.statusTag(App.state.pkg.status) + '</div></div>' +

      rejectBanner +
      U.flowbar(App.state.pkg.status) +
      '<div class="divider"></div>' +

      '<div class="grid-2-1">' +
        '<div class="card"><div class="card__head"><span class="card__title">填报表单' +
        '<span class="card__note">失焦后自动触发即时测算，提示预计得分与全局参考位次</span></span>' +
        (editable ? '<span class="chip chip--brand">可编辑</span>' : '<span class="chip">' + U.icon('lock', 12) + '只读锁定</span>') +
        '</div><div class="card__body">' +

        /* 1. 机构设置 */
        '<div class="formsection"><div class="formsection__title"><span class="idx">1</span>机构设置（体系建设 · 定性不计分）</div>' +
        '<div class="form">' + numberField('branches', '分公司数量', F.system.branches, { unit: '个', step: '1', req: true, readonly: !editable }) +
        '<div class="field"><label class="field__label">部门设置模式<span class="req">*</span></label>' +
        '<div class="radiogroup">' + F.system.modes.map(function (m, i) {
          return '<label class="radio' + (m.count > 0 ? ' is-checked' : '') + '">' + U.esc(m.label) +
            '<input type="number" min="0" step="1" style="width:46px;border:0;background:transparent;text-align:center" ' +
            'data-mode="' + i + '" value="' + m.count + '"' + (editable ? '' : ' readonly') + '>个</label>';
        }).join('') + '</div>' +
        '<div class="field__hint" id="modeSum">模式数量合计 ' + branchesSum + ' 个，应等于分公司数量 ' + F.system.branches + ' 个</div>' +
        '<div class="field__err">各模式数量合计须等于分公司数量</div></div></div>' +
        '<div class="form form--1" style="margin-top:12px"><div class="field"><label class="field__label">体系建设描述</label>' +
        '<textarea class="textarea" id="sysNote"' + (editable ? '' : ' readonly') + '>' + U.esc(F.system.note) + '</textarea></div></div>' +
        '</div>' +

        /* 2. 人员资质 */
        '<div class="formsection"><div class="formsection__title"><span class="idx">2</span>人员资质台账（人才培养 · 结构化不计分）</div>' +
        '<div class="form">' +
        numberField('buyer', '专职采购人员数', F.talent.buyer, { unit: '人', step: '1', req: true, readonly: !editable, hint: '上期 ' + prev.buyer + ' 人 ' + dlt(F.talent.buyer, prev.buyer) }) +
        numberField('material', '专职物资人员数', F.talent.material, { unit: '人', step: '1', req: true, readonly: !editable, hint: '上期 ' + prev.material + ' 人 ' + dlt(F.talent.material, prev.material) }) +
        numberField('midTitle', '中级及以上职称人数', F.talent.midTitle, { unit: '人', step: '1', readonly: !editable, hint: '上期 ' + prev.midTitle + ' 人 ' + dlt(F.talent.midTitle, prev.midTitle) }) +
        numberField('costEngineer', '一级注册造价师持证人数', F.talent.costEngineer, { unit: '人', step: '1', readonly: !editable, hint: '上期 ' + prev.costEngineer + ' 人 ' + dlt(F.talent.costEngineer, prev.costEngineer) }) +
        numberField('builder', '一级建造师持证人数', F.talent.builder, { unit: '人', step: '1', readonly: !editable, hint: '上期 ' + prev.builder + ' 人 ' + dlt(F.talent.builder, prev.builder) }) +
        numberField('houseRate', '房建项目物资人员配置', F.talent.houseRate, { unit: '人/项目', readonly: !editable, hint: '上期 ' + prev.houseRate + ' 人/项目' }) +
        numberField('infraRate', '基础设施项目物资人员配置', F.talent.infraRate, { unit: '人/项目', readonly: !editable, hint: '上期 ' + prev.infraRate + ' 人/项目' }) +
        '</div></div>' +

        /* 3. 业务台账 */
        '<div class="formsection"><div class="formsection__title"><span class="idx">3</span>业务台账补录（参与计分的底层分子分母）</div>' +
        '<div class="form">' +
        numberField('selfTotal', '专业工程采购总额', F.biz.selfTotal, { unit: '万元', req: true, readonly: !editable, hint: '分母 · 口径详见指标字典' }) +
        numberField('selfAmount', '专业工程自主采购额', F.biz.selfAmount, { unit: '万元', req: true, readonly: !editable, hint: '分子' }) +
        numberField('selfRate', '专业领域自主采购率（自动换算）', selfRate.toFixed(2), { unit: '%', readonly: true, hint: '比率型指标：分子 ÷ 分母，禁止月度百分比算术平均' }) +
        '<div class="field"><label class="field__label">即时测算</label>' +
        '<div class="preview" id="pvSelf">输入后自动计算</div></div>' +
        numberField('planIncome', '策划项实际收入', F.biz.planIncome, { unit: '万元', req: true, readonly: !editable, hint: '分母' }) +
        numberField('planBenefit', '实际采购策划效益额', F.biz.planBenefit, { unit: '万元', req: true, readonly: !editable, hint: '分子' }) +
        numberField('planRate', '采购策划效益率（自动换算）', planRate.toFixed(2), { unit: '%', readonly: true, hint: '上期 ' + prev.planRate + '% ' + dlt(planRate, prev.planRate) }) +
        /* P1 #7：极值佐证字段就近放置在触发它的字段之后（占满整行） */
        '<div class="field" id="f-proof" style="grid-column:1 / -1">' +
        '<label class="field__label">极值佐证说明<span class="req">*</span></label>' +
        '<textarea class="textarea" id="proof" placeholder="策划效益率较上期变动超过 20%，请提供书面佐证（如台账口径调整、项目结算集中确认等）"' +
        (editable ? '' : ' readonly') + '>' + U.esc(App.state.fillProof || '') + '</textarea>' +
        '<div class="field__err">变动幅度超过 20% 时必须填写佐证说明</div></div>' +
        '<div class="field"><label class="field__label">即时测算</label>' +
        '<div class="preview" id="pvPlan">输入后自动计算</div></div>' +
        '</div>' +
        '</div>' +
        '</div></div>' +

        '<div class="stack">' +
          '<div class="card"><div class="card__head"><span class="card__title">校验结果</span>' +
          '<span class="card__note">实时校验 · 异常不阻断但强制复核</span></div>' +
          '<div class="card__body">' + valList(window.PD.fill.validators) + '</div></div>' +

          '<div class="card"><div class="card__head"><span class="card__title">操作</span></div>' +
          '<div class="card__body"><div class="btnbar">' +
          (editable ?
            '<button class="btn btn--default" id="fillSave">保存草稿</button>' +
            '<button class="btn btn--primary" id="fillSubmit">提交审核</button>' :
            '<button class="btn btn--default is-disabled" disabled>表单已锁定</button>') +
          '</div><div class="note mt2">提交后数据锁定为只读；部门负责人可【通过并上报】或【驳回修改】（驳回须填写不少于 10 字意见）。</div>' +
          '</div></div>' +

          '<div class="card"><div class="card__head"><span class="card__title">数据来源分层' +
          '<span class="card__note">权威数据物理隔离</span></span></div><div class="card__body">' +
          U.kv([
            ['接口取数', '11 项（DSC 内生 5 项 + 大数据湖 6 项）'],
            ['专员填报', '<b>本页 4 项</b>：机构设置、人员资质、自采台账、策划台账'],
            ['局总部直填', '2 项：一标一检不合规项数、合规考试不合格数 <span class="tag tag--red">本页不可见</span>'],
            ['校验规则', '防空 / 极值 / 期间一致性 / DHR 人员核验']
          ]) + '</div></div>' +
        '</div>' +
      '</div>';
    },
    mount: function (App, root) {
      var pd = window.PD, F = App.state.fillForm;
      var editable = App.state.pkg.status === 'DRAFT' || App.state.pkg.status === 'DEPT_REJECTED';

      /* 实时换算 + 即时测算 */
      function peerValues(name) {
        /* 比较池排除本单位自身取值（本单位以当前输入值参与排名），共 20 家对标 */
        var self = pd.fill.task.unit;
        return pd.units.filter(function (u) { return u.name !== self; }).map(function (u) {
          var it = u.indicators.filter(function (x) { return x.name === name; })[0];
          return it ? it.num : null;
        }).filter(function (x) { return x != null; });
      }
      function preview(el, rate, indName, weight, step) {
        var peers = peerValues(indName);
        var rank = E.previewRank(peers, rate, 'desc');
        var score = E.scoreByRank(weight, step, rank);
        var maxPeer = Math.max.apply(null, peers);
        el.innerHTML = '预计得分 <b>' + U.num(score) + '</b> 分（满分 ' + weight + '） · 全局参考位次 <b>第 ' + rank +
          '</b> / ' + (peers.length + 1) + ' 位 · ' + (rate > maxPeer ? '高于其余全部已报单位' : '按当前 20 家对标单位测算');
      }
      function refresh() {
        var st = +root.querySelector('#selfTotal').value || 0;
        var sa = +root.querySelector('#selfAmount').value || 0;
        var pi = +root.querySelector('#planIncome').value || 0;
        var pb = +root.querySelector('#planBenefit').value || 0;
        var sr = st ? sa / st * 100 : 0, pr = pi ? pb / pi * 100 : 0;
        root.querySelector('#selfRate').value = sr.toFixed(2);
        root.querySelector('#planRate').value = pr.toFixed(2);
        preview(root.querySelector('#pvSelf'), sr, '专业领域自主采购率', 5, 0.06);
        preview(root.querySelector('#pvPlan'), pr, '采购策划效益率', 5, 0.06);
        var warn = Math.abs(pr - pd.fill.prev.planRate) / pd.fill.prev.planRate * 100 > 20;
        root.querySelector('#f-planRate').classList.toggle('is-warn', warn);
      }
      if (editable) {
        ['selfTotal', 'selfAmount', 'planIncome', 'planBenefit'].forEach(function (id) {
          var el = root.querySelector('#' + id);
          if (el) { el.addEventListener('blur', refresh); el.addEventListener('input', refresh); }
        });
        refresh();
        Array.prototype.forEach.call(root.querySelectorAll('[data-mode]'), function (inp) {
          inp.addEventListener('input', function () { App.readForm(root); });
        });
        /* P0 #8：任何输入即标记为「有未保存修改」，离开页面前拦截 */
        Array.prototype.forEach.call(root.querySelectorAll('input:not([readonly]), textarea:not([readonly])'), function (el) {
          el.addEventListener('input', function () { App.markDirty(); });
          el.addEventListener('change', function () { App.markDirty(); });
        });
      } else {
        refresh();
      }

      var save = root.querySelector('#fillSave');
      if (save) {
        save.addEventListener('click', function () {
          App.readForm(root);
          App.state.fillProof = root.querySelector('#proof').value;
          App.clearDirty();
          U.toast('草稿已保存（本地演示）', 'success');
        });
      }
      var submit = root.querySelector('#fillSubmit');
      if (submit) {
        submit.addEventListener('click', function () {
          var ok = App.validateForm(root);
          if (!ok) { return; }
          App.readForm(root);
          App.state.fillProof = root.querySelector('#proof').value;
          U.confirm('确认提交数据包至二级单位供应链负责人审核？提交后表单将锁定为只读状态。', function () {
            App.state.pkg.status = 'SUBMITTED';
            App.state.pkg.submittedAt = App.now();
            App.clearDirty();
            U.toast('已提交，状态更新为「已上报待负责人审」', 'success');
            App.rerender();
          }, { okText: '确认提交' });
        });
      }
    }
  };
})();
