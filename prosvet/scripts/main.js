'use strict';

/*
 * Просвет — конструктор окна: живая отрисовка SVG + смета.
 * Правила отрисовки — workspace/design/prosvet-requirements.md, «ПРАВИЛА ОТРИСОВКИ» (R1–R9).
 * Прайс и формула сметы — data/pricing.js, единственный источник (DoD задачи T-4).
 * Визуальный код (толщины линий, цвета) — workspace/design/prosvet.md, «ЧЕРТЁЖ: СПЕЦИФИКАЦИЯ ОТРИСОВКИ».
 *
 * DOM-узлы чертежа размечены классами так, чтобы критерии приёмки A1–A15
 * (workspace/design/prosvet-requirements.md) проверялись прямым запросом по DOM:
 *   #frame          — ровно один узел рамы (R1, R2)
 *   .sash           — по одному на каждую створку, data-index = 1..N (R3, R4)
 *   .shtapik        — по одному на каждую створку, включая глухую (R5)
 *   .handle         — есть только у не-глухой створки (R6, R7)
 *   .arrow-open     — есть только у не-глухой створки, data-type различает три типа (R6, R7, R8)
 *   .impost         — N−1 штук (R3)
 */
(function () {
  var PRICING = window.PROSVET_PRICING;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SASH_ORDER = ['deaf', 'turn', 'tilt', 'po'];
  var REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- состояние ----------
  var state = {
    width: PRICING.RANGES.width.def,
    height: PRICING.RANGES.height.def,
    sashCount: PRICING.RANGES.sashCount.def,
    sashTypes: PRICING.SASH_DEFAULT.slice(), // персистентный массив длиной 3 — S14: настройки скрытых створок не теряются
    profile: 5,
    glass: 'double'
  };
  var hasDrawnOnce = false;

  // ---------- DOM ----------
  var sheetEl = document.getElementById('sheet');
  var svgEl = document.getElementById('draw');
  var inW = document.getElementById('inW');
  var inH = document.getElementById('inH');
  var dimW = document.getElementById('dimW');
  var dimH = document.getElementById('dimH');
  var scaleEl = document.getElementById('scale');
  var hintEl = document.getElementById('hint');
  var hintDefault = hintEl.textContent;

  var optsNEl = document.getElementById('optsN');
  var openGroupEl = document.getElementById('openGroup');
  var optsProfileEl = document.getElementById('optsProfile');
  var optsGlassEl = document.getElementById('optsGlass');

  var specBody = document.getElementById('specBody');
  var totalSumEl = document.getElementById('totalSum');
  var stickySumEl = document.getElementById('stickySum');

  var tbObjectEl = document.getElementById('tbObject');
  var tbScaleEl = document.getElementById('tbScale');
  var tbDateEl = document.getElementById('tbDate');

  var collectBtn = document.getElementById('collect');
  var fName = document.getElementById('fName');
  var fLink = document.getElementById('fLink');
  var cellName = document.getElementById('cellName');
  var cellLink = document.getElementById('cellLink');
  var receiptEl = document.getElementById('receipt');
  var receiptTextEl = document.getElementById('receiptText');

  var printBtn = document.getElementById('printBtn');
  var copyCalcBtn = document.getElementById('copyCalcBtn');
  var copyReceiptBtn = document.getElementById('copyReceiptBtn');

  // ---------- утилиты форматирования ----------
  function formatMoney(n) {
    var s = Math.round(n).toString();
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function formatQty(n) {
    return n.toFixed(1).replace('.', ',');
  }
  function pluralize(n, one, few, many) {
    var mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function todayRu() {
    var d = new Date();
    function pad(v) { return String(v).padStart(2, '0'); }
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  }

  // ---------- ввод ширины/высоты ----------
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function wireDimInput(input, dimWrap, axis) {
    input.addEventListener('focus', function () {
      dimWrap.classList.add('is-focus');
      sheetEl.setAttribute('data-focus', axis);
    });
    input.addEventListener('blur', function () {
      dimWrap.classList.remove('is-focus');
      sheetEl.removeAttribute('data-focus');
      var range = axis === 'w' ? PRICING.RANGES.width : PRICING.RANGES.height;
      var raw = parseInt(input.value, 10);
      if (isNaN(raw)) raw = state[axis === 'w' ? 'width' : 'height']; // пустое поле — последнее валидное (крайний случай 6)
      var clamped = clamp(raw, range.min, range.max);
      if (clamped !== raw) {
        var label = axis === 'w' ? 'Ширина' : 'Высота';
        hintEl.textContent = label + ' проёма — от ' + range.min + ' до ' + range.max + ' мм. Поставили ' + clamped + '.';
      } else {
        hintEl.textContent = hintDefault;
      }
      state[axis === 'w' ? 'width' : 'height'] = clamped;
      input.value = clamped;
      redrawAndRecalc();
    });
    input.addEventListener('input', function () {
      // нечисловые символы не принимаются (S12); отрисовка обновляется по валидным цифрам сразу
      var digits = input.value.replace(/[^\d]/g, '');
      if (digits !== input.value) input.value = digits;
      if (digits === '') return; // пустое поле не переводит модель в NaN — ждём blur
      var n = parseInt(digits, 10);
      state[axis === 'w' ? 'width' : 'height'] = n;
      redrawAndRecalc();
    });
  }
  wireDimInput(inW, dimW, 'w');
  wireDimInput(inH, dimH, 'h');

  // ---------- N створок ----------
  Array.prototype.forEach.call(optsNEl.children, function (btn) {
    btn.addEventListener('click', function () {
      state.sashCount = parseInt(btn.dataset.value, 10);
      renderPanel();
      redrawAndRecalc();
    });
  });

  // ---------- профиль / стеклопакет ----------
  function wireStaticOpts(container, onSelect) {
    Array.prototype.forEach.call(container.children, function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(container.children, function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        onSelect(btn.dataset.value);
      });
    });
  }
  wireStaticOpts(optsProfileEl, function (v) { state.profile = parseInt(v, 10); redrawAndRecalc(); });
  wireStaticOpts(optsGlassEl, function (v) { state.glass = v; redrawAndRecalc(); });

  // ---------- панель «Открывание» (перестраивается под N и типы) ----------
  function highlightSash(index, on) {
    var node = svgEl.querySelector('.sash[data-index="' + index + '"]');
    if (node) node.classList.toggle('is-active', on);
  }

  function renderPanel() {
    Array.prototype.forEach.call(optsNEl.children, function (btn) {
      btn.setAttribute('aria-pressed', String(parseInt(btn.dataset.value, 10) === state.sashCount));
    });

    while (openGroupEl.children.length > 1) openGroupEl.removeChild(openGroupEl.lastChild); // оставить <h3>

    for (var i = 0; i < state.sashCount; i++) {
      (function (index) {
        var block = document.createElement('div');
        block.className = 'sash-block';

        var label = document.createElement('p');
        label.className = 'sash-label';
        label.textContent = 'Створка ' + (index + 1);
        block.appendChild(label);

        var opts = document.createElement('div');
        opts.className = 'opts';
        opts.setAttribute('role', 'group');
        opts.setAttribute('aria-label', 'Тип открывания, створка ' + (index + 1));
        SASH_ORDER.forEach(function (code) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'opt';
          b.dataset.value = code;
          b.setAttribute('aria-pressed', String(state.sashTypes[index] === code));
          b.textContent = PRICING.SASH_LABEL[code];
          b.addEventListener('click', function () {
            state.sashTypes[index] = code;
            renderPanel();
            redrawAndRecalc();
          });
          opts.appendChild(b);
        });
        block.appendChild(opts);

        block.addEventListener('mouseenter', function () { highlightSash(index + 1, true); });
        block.addEventListener('mouseleave', function () { highlightSash(index + 1, false); });
        block.addEventListener('focusin', function () { highlightSash(index + 1, true); });
        block.addEventListener('focusout', function () { highlightSash(index + 1, false); });

        openGroupEl.appendChild(block);
      })(i);
    }
  }

  // ---------- отрисовка SVG ----------
  function svgEl_(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function px(v) { return Math.round(v) + 0.5; } // линии по полупикселю — чёткие штрихи

  function animateDraw(line) {
    // «прочерчивание» размерной линии один раз при загрузке страницы — signature
    if (hasDrawnOnce || REDUCED_MOTION) return;
    line.setAttribute('pathLength', '1');
    line.classList.add('dim-anim-line');
    line.style.strokeDasharray = '1';
    line.style.strokeDashoffset = '1';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { line.style.strokeDashoffset = '0'; });
    });
  }
  function animateArrow(path) {
    if (hasDrawnOnce || REDUCED_MOTION) return;
    path.classList.add('dim-anim-arrow');
    path.style.opacity = '0';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { path.style.opacity = '1'; });
    });
  }

  function draw() {
    var w = sheetEl.clientWidth, h = sheetEl.clientHeight;
    svgEl.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svgEl.setAttribute('aria-label', 'Чертёж окна ' + state.width + ' на ' + state.height + ' мм, створок: ' + state.sashCount);
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

    var small = w < 560;
    var padL = small ? 62 : 76, padR = small ? 16 : 56, padT = small ? 20 : 48, padB = small ? 50 : 72;
    var availW = w - padL - padR, availH = h - padT - padB;
    var k = Math.min(availW / state.width, availH / state.height); // R1/R2: единый коэффициент на обе стороны — пропорции сохраняются
    var fw = state.width * k, fh = state.height * k;
    var fx = padL + (availW - fw) / 2, fy = padT + (availH - fh) / 2;

    // сетка: клетка = 100 мм в текущем масштабе, привязана к левому нижнему углу рамы
    var grid = svgEl_('g', { class: 'grid', 'shape-rendering': 'crispEdges' });
    var cell = 100 * k;
    for (var x = fx; x < w; x += cell) grid.appendChild(svgEl_('line', { x1: px(x), y1: 0, x2: px(x), y2: h, stroke: '#E4E4E4', 'stroke-width': 1 }));
    for (var x2 = fx - cell; x2 > 0; x2 -= cell) grid.appendChild(svgEl_('line', { x1: px(x2), y1: 0, x2: px(x2), y2: h, stroke: '#E4E4E4', 'stroke-width': 1 }));
    var base = fy + fh;
    for (var y = base; y > 0; y -= cell) grid.appendChild(svgEl_('line', { x1: 0, y1: px(y), x2: w, y2: px(y), stroke: '#E4E4E4', 'stroke-width': 1 }));
    for (var y2 = base + cell; y2 < h; y2 += cell) grid.appendChild(svgEl_('line', { x1: 0, y1: px(y2), x2: w, y2: px(y2), stroke: '#E4E4E4', 'stroke-width': 1 }));
    svgEl.appendChild(grid);

    // рама — ровно один узел (R1)
    var tf = Math.max(6, 58 * k), ti = Math.max(5, 70 * k), frameW = small ? 2 : 3;
    var frame = svgEl_('g', { id: 'frame', class: 'frame' });
    frame.appendChild(svgEl_('rect', { x: fx, y: fy, width: fw, height: fh, fill: '#FFFFFF', stroke: '#000000', 'stroke-width': frameW }));
    var ox = fx + tf, oy = fy + tf, ow = fw - 2 * tf, oh = fh - 2 * tf;
    frame.appendChild(svgEl_('rect', { x: ox, y: oy, width: ow, height: oh, fill: 'none', stroke: '#000000', 'stroke-width': 2 }));
    svgEl.appendChild(frame);

    // импосты + створки (R3, R4, R5, R6, R7, R8, R9)
    // Визуально импост — это зазор шириной ti между рамками двух соседних створок
    // (так рендерил и утверждённый на гейте прототип, r14-01-hero-1440.png); отдельная
    // видимая линия поверх зазора его бы задвоила. Узел .impost добавлен без заливки и
    // обводки — он не меняет ни одного пикселя, но даёт tester счётный DOM-элемент на
    // каждый межстворочный зазор (R3: «между соседними створками — ровно N−1 импостов»).
    var n = state.sashCount;
    var cw = (ow - (n - 1) * ti) / n;
    for (var i = 1; i < n; i++) {
      var gapX = ox + (i - 1) * cw + (i - 1) * ti + cw;
      svgEl.appendChild(svgEl_('rect', { class: 'impost', x: gapX, y: oy, width: ti, height: oh, fill: 'none', stroke: 'none' }));
    }

    for (var i2 = 0; i2 < n; i2++) {
      var sx = ox + i2 * (cw + ti);
      var type = state.sashTypes[i2] || 'deaf';
      var sash = svgEl_('g', { class: 'sash', 'data-index': i2 + 1, 'data-type': type });

      sash.appendChild(svgEl_('rect', { class: 'sash-frame', x: sx, y: oy, width: cw, height: oh, fill: 'none', stroke: '#000000', 'stroke-width': 2 }));

      var ts = Math.max(4, 45 * k);
      var gx = sx + ts, gy = oy + ts, gw = cw - 2 * ts, gh = oh - 2 * ts;
      var shtapik = Math.min(10, 0.06 * Math.min(gw, gh));
      sash.appendChild(svgEl_('rect', { class: 'glass', x: gx, y: gy, width: gw, height: gh, fill: '#EDF1F4', stroke: 'none' }));
      sash.appendChild(svgEl_('rect', { class: 'shtapik', x: gx + shtapik, y: gy + shtapik, width: gw - 2 * shtapik, height: gh - 2 * shtapik, fill: 'none', stroke: '#000000', 'stroke-width': 1 })); // R5: у каждой створки, включая глухую

      if (type !== 'deaf') {
        var hingeLeft = (i2 === 0); // R9: одно правило на все створки страницы — петли слева только у первой,
                                     // у остальных справа, ручка у каждой ближе к центру окна
        var ax = gx + shtapik, ay = gy + shtapik, aw = gw - 2 * shtapik, ah = gh - 2 * shtapik;
        var arrowGroup = svgEl_('g', { class: 'arrow-open', 'data-type': type });
        var strokeAttrs = { stroke: '#14307F', 'stroke-width': 1.5, 'stroke-dasharray': '6 4', fill: 'none' };
        if (type === 'turn' || type === 'po') {
          var vx = hingeLeft ? ax : ax + aw, ex = hingeLeft ? ax + aw : ax;
          var l1 = svgEl_('line', Object.assign({ x1: ex, y1: ay, x2: vx, y2: ay + ah / 2 }, strokeAttrs));
          var l2 = svgEl_('line', Object.assign({ x1: ex, y1: ay + ah, x2: vx, y2: ay + ah / 2 }, strokeAttrs));
          arrowGroup.appendChild(l1); arrowGroup.appendChild(l2);
        }
        if (type === 'tilt' || type === 'po') {
          var l3 = svgEl_('line', Object.assign({ x1: ax, y1: ay, x2: ax + aw / 2, y2: ay + ah }, strokeAttrs));
          var l4 = svgEl_('line', Object.assign({ x1: ax + aw, y1: ay, x2: ax + aw / 2, y2: ay + ah }, strokeAttrs));
          arrowGroup.appendChild(l3); arrowGroup.appendChild(l4);
        }
        sash.appendChild(arrowGroup);

        // ручка — на стороне, противоположной петлям, ближе к центру окна (R9, правило одно на всю страницу)
        var hx = hingeLeft ? sx + cw - ts / 2 : sx + ts / 2;
        var hl = 0.18 * oh;
        var handle = svgEl_('g', { class: 'handle' });
        handle.appendChild(svgEl_('line', { x1: px(hx), y1: oy + oh / 2 - hl / 2, x2: px(hx), y2: oy + oh / 2 + hl / 2, stroke: '#000000', 'stroke-width': 2 }));
        sash.appendChild(handle);
      }

      svgEl.appendChild(sash);
    }

    // размерные цепочки
    var gw2 = small ? 48 : 46, gh2 = small ? 48 : 18;
    var offH = small ? 30 : 44, offV = small ? 30 : 46;
    var yD = fy + fh + offH, xD = fx - offV;
    var pen = { stroke: '#5A5A5A', 'stroke-width': 1 };

    var gW = svgEl_('g', { class: 'g-dim-w' });
    var wLines = [
      svgEl_('line', Object.assign({ x1: px(fx), y1: fy + fh + 6, x2: px(fx), y2: yD + 4 }, pen)),
      svgEl_('line', Object.assign({ x1: px(fx + fw), y1: fy + fh + 6, x2: px(fx + fw), y2: yD + 4 }, pen)),
      svgEl_('line', Object.assign({ x1: fx, y1: px(yD), x2: fx + fw / 2 - gw2, y2: px(yD) }, pen)),
      svgEl_('line', Object.assign({ x1: fx + fw / 2 + gw2, y1: px(yD), x2: fx + fw, y2: px(yD) }, pen))
    ];
    wLines.forEach(function (l) { gW.appendChild(l); animateDraw(l); });
    var wArrows = [
      svgEl_('path', { d: 'M' + fx + ',' + yD + ' l9,-3.2 l0,6.4 z', fill: '#5A5A5A' }),
      svgEl_('path', { d: 'M' + (fx + fw) + ',' + yD + ' l-9,-3.2 l0,6.4 z', fill: '#5A5A5A' })
    ];
    wArrows.forEach(function (a) { gW.appendChild(a); animateArrow(a); });
    svgEl.appendChild(gW);

    var gH = svgEl_('g', { class: 'g-dim-h' });
    var hLines = [
      svgEl_('line', Object.assign({ x1: fx - 6, y1: px(fy), x2: xD - 4, y2: px(fy) }, pen)),
      svgEl_('line', Object.assign({ x1: fx - 6, y1: px(fy + fh), x2: xD - 4, y2: px(fy + fh) }, pen)),
      svgEl_('line', Object.assign({ x1: px(xD), y1: fy, x2: px(xD), y2: fy + fh / 2 - gh2 }, pen)),
      svgEl_('line', Object.assign({ x1: px(xD), y1: fy + fh / 2 + gh2, x2: px(xD), y2: fy + fh }, pen))
    ];
    hLines.forEach(function (l) { gH.appendChild(l); animateDraw(l); });
    var hArrows = [
      svgEl_('path', { d: 'M' + xD + ',' + fy + ' l-3.2,9 l6.4,0 z', fill: '#5A5A5A' }),
      svgEl_('path', { d: 'M' + xD + ',' + (fy + fh) + ' l-3.2,-9 l6.4,0 z', fill: '#5A5A5A' })
    ];
    hArrows.forEach(function (a) { gH.appendChild(a); animateArrow(a); });
    svgEl.appendChild(gH);

    // поля размеров — в разрыве размерных линий (signature)
    dimW.style.left = (fx + fw / 2) + 'px'; dimW.style.top = yD + 'px';
    dimW.style.transform = 'translate(-50%,-50%)';
    dimH.style.left = xD + 'px'; dimH.style.top = (fy + fh / 2) + 'px';
    dimH.style.transform = small ? 'translate(-50%,-50%) rotate(-90deg)' : 'translate(-50%,-50%)';

    var scaleN = Math.max(1, Math.round(1 / k));
    var scaleText = 'М 1:' + scaleN;
    scaleEl.textContent = scaleText;
    tbScaleEl.textContent = scaleText;
    tbObjectEl.textContent = 'Окно ' + state.width + '×' + state.height;

    hasDrawnOnce = true;
  }

  // ---------- смета ----------
  function currentEstimate() {
    return PRICING.computeEstimate({
      width: state.width,
      height: state.height,
      sashCount: state.sashCount,
      sashTypes: state.sashTypes,
      profile: state.profile,
      glass: state.glass
    });
  }

  function openingSummary(types) {
    var opening = types.slice(0, state.sashCount).filter(function (t) { return t !== 'deaf'; });
    if (opening.length === 0) return '0 ' + pluralize(0, 'створка открывается', 'створки открываются', 'створок открывается');
    var count = opening.length;
    var noun = pluralize(count, 'створка', 'створки', 'створок');
    var labels = opening.map(function (t) { return lower(PRICING.SASH_LABEL[t]); }).join(', ');
    return count + ' ' + noun + ', ' + labels;
  }

  function renderSpec(est) {
    var rows = [
      { name: 'Профиль ' + lower(PRICING.PROFILE_LABEL[state.profile]), calc: formatQty(est.profile.qty) + ' пог. м × ' + formatMoney(est.profile.rate), sum: est.profile.sum },
      { name: 'Стеклопакет ' + lower(PRICING.GLASS_LABEL[state.glass]), calc: formatQty(est.glass.qty) + ' м² × ' + formatMoney(est.glass.rate), sum: est.glass.sum },
      { name: 'Фурнитура', calc: openingSummary(state.sashTypes), sum: est.fittings.sum },
      { name: 'Монтаж', calc: formatQty(est.montage.qty) + ' м² × ' + formatMoney(est.montage.rate), sum: est.montage.sum },
      { name: 'Доставка', calc: 'за заказ', sum: est.delivery.sum }
    ];
    specBody.innerHTML = '';
    rows.forEach(function (r, idx) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="c-pos num">' + (idx + 1) + '</td>' +
        '<td class="c-name">' + r.name + '</td>' +
        '<td class="c-calc">' + r.calc + '</td>' +
        '<td class="c-sum num">' + formatMoney(r.sum) + '</td>';
      specBody.appendChild(tr);
    });
    var totalText = formatMoney(est.total) + ' ₽';
    totalSumEl.textContent = totalText;
    stickySumEl.textContent = totalText;
  }

  function redrawAndRecalc() {
    draw();
    renderSpec(currentEstimate());
    // параметры изменились — прежний собранный лист устарел, просим собрать заново
    if (receiptEl.classList.contains('on')) receiptEl.classList.remove('on');
  }

  // ---------- штамп: валидация настоящая, отправки нет ----------
  function validateStamp() {
    var okName = fName.value.trim().length >= 2;
    var v = fLink.value.trim();
    var okLink = /@[^@\s]+\.[^@\s]+$/.test(v) || v.replace(/\D/g, '').length >= 10;
    cellName.classList.toggle('err', !okName);
    cellLink.classList.toggle('err', !okLink);
    return okName && okLink;
  }

  function buildReceiptText(est) {
    var date = tbDateEl.textContent;
    var sashDesc = state.sashTypes.slice(0, state.sashCount).map(function (t, i) {
      return (i + 1) + ' — ' + lower(PRICING.SASH_LABEL[t]);
    }).join(', ');
    var lines = [
      'Просвет — расчёт окна, лист 1 от ' + date,
      'Заказчик: ' + fName.value.trim() + ' · связь: ' + fLink.value.trim(),
      'Проём ' + state.width + '×' + state.height + ' мм · ' + state.sashCount + ' ' + pluralize(state.sashCount, 'створка', 'створки', 'створок') + ': ' + sashDesc,
      'Профиль ' + lower(PRICING.PROFILE_LABEL[state.profile]) + ' · стеклопакет ' + lower(PRICING.GLASS_LABEL[state.glass]) + ' · ' + scaleEl.textContent,
      ''
    ];
    var rows = [
      ['1', 'Профиль ' + lower(PRICING.PROFILE_LABEL[state.profile]), formatQty(est.profile.qty) + ' пог. м × ' + formatMoney(est.profile.rate), est.profile.sum],
      ['2', 'Стеклопакет ' + lower(PRICING.GLASS_LABEL[state.glass]), formatQty(est.glass.qty) + ' м² × ' + formatMoney(est.glass.rate), est.glass.sum],
      ['3', 'Фурнитура', openingSummary(state.sashTypes), est.fittings.sum],
      ['4', 'Монтаж', formatQty(est.montage.qty) + ' м² × ' + formatMoney(est.montage.rate), est.montage.sum],
      ['5', 'Доставка', 'за заказ', est.delivery.sum]
    ];
    rows.forEach(function (r) {
      var name = (r[0] + '  ' + r[1]).padEnd(30, ' ');
      var calc = String(r[2]).padEnd(28, ' ');
      var sum = (formatMoney(r[3]) + ' ₽').padStart(10, ' ');
      lines.push(name + calc + sum);
    });
    lines.push('Итого'.padEnd(58, ' ') + (formatMoney(est.total) + ' ₽').padStart(10, ' '));
    lines.push('Пример расчёта, не оферта: цены демонстрационные.');
    return lines.join('\n');
  }

  collectBtn.addEventListener('click', function () {
    if (!validateStamp()) {
      receiptEl.classList.remove('on');
      (cellName.classList.contains('err') ? fName : fLink).focus();
      return;
    }
    receiptTextEl.textContent = buildReceiptText(currentEstimate());
    receiptEl.classList.add('on');
  });

  // ---------- печать и копирование ----------
  function copyText(text, btn) {
    var original = btn.textContent;
    function done(ok) {
      btn.textContent = ok ? 'Скопировано' : original;
      setTimeout(function () { btn.textContent = original; }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    done(ok);
  }

  printBtn.addEventListener('click', function () { window.print(); });
  copyCalcBtn.addEventListener('click', function () {
    var est = currentEstimate();
    var lines = [
      'Просвет — расчёт окна',
      'Проём ' + state.width + '×' + state.height + ' мм · ' + state.sashCount + ' ' + pluralize(state.sashCount, 'створка', 'створки', 'створок'),
      'Профиль ' + lower(PRICING.PROFILE_LABEL[state.profile]) + ' · стеклопакет ' + lower(PRICING.GLASS_LABEL[state.glass]) + ' · ' + scaleEl.textContent,
      'Итого: ' + formatMoney(est.total) + ' ₽',
      'Пример расчёта, не оферта: цены демонстрационные.'
    ];
    copyText(lines.join('\n'), copyCalcBtn);
  });
  copyReceiptBtn.addEventListener('click', function () { copyText(receiptTextEl.textContent, copyReceiptBtn); });

  [fName, fLink].forEach(function (input) {
    input.addEventListener('input', function () {
      var cell = input === fName ? cellName : cellLink;
      if (cell.classList.contains('err')) validateStamp();
    });
  });

  // ---------- запуск ----------
  tbDateEl.textContent = todayRu();
  renderPanel();
  redrawAndRecalc();
  window.addEventListener('resize', draw);
  document.fonts && document.fonts.ready.then(draw);
})();
