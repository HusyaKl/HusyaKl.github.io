// design your live — общий скрипт (главная, проекты, услуги, о дизайнере).
// Один файл на все страницы: каждый блок ищет свои элементы и тихо выходит,
// если их на странице нет.
(function(){
  'use strict';

  var REDUCE_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══════════════ СЛАЙДЕР СРАВНЕНИЯ ДО/ПОСЛЕ ═══════════════
     Значение range хранит долю «после» (0–100): Home = 0 = только «до»,
     End = 100 = только «после», ←/→ и ↑/↓ ± step (1), PageUp/PageDown —
     нативный шаг браузера. Переменная CSS --seam — это доля «до» (обратная
     величина), от неё зависят clip-path и позиции шва и ручки. Указателем
     (мышь и палец) управляет JS через Pointer Events прямо по фотографии —
     значение input не участвует в драге, только синхронизируется с ним. */
  function initCompare(root){
    var frame = root.querySelector('.frame');
    var range = root.querySelector('.range');
    if (!frame || !range) return null;

    function applyAfter(afterPercent){
      afterPercent = Math.max(0, Math.min(100, Math.round(afterPercent)));
      range.value = afterPercent;
      root.style.setProperty('--seam', (100 - afterPercent) + '%');
      range.setAttribute('aria-valuetext', 'после видно на ' + afterPercent + '%');
    }

    function afterFromClientX(clientX){
      var r = frame.getBoundingClientRect();
      var seamPercent = (clientX - r.left) / r.width * 100;
      seamPercent = Math.max(0, Math.min(100, seamPercent));
      return 100 - seamPercent;
    }

    function onDown(e){
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      frame.setPointerCapture(e.pointerId);
      applyAfter(afterFromClientX(e.clientX));
      range.focus({ preventScroll: true });
    }
    function onMove(e){
      if (!frame.hasPointerCapture(e.pointerId)) return;
      applyAfter(afterFromClientX(e.clientX));
    }
    function onUp(e){
      if (frame.hasPointerCapture(e.pointerId)) frame.releasePointerCapture(e.pointerId);
    }

    frame.addEventListener('pointerdown', onDown);
    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerup', onUp);
    frame.addEventListener('pointercancel', onUp);
    range.addEventListener('input', function(){ applyAfter(parseFloat(range.value)); });

    applyAfter(parseFloat(range.value || '54'));
    return { root: root, frame: frame, range: range, applyAfter: applyAfter };
  }

  // Единственная непрошенная анимация на сайте: при первой загрузке главный
  // шов один раз едет с 68% (после видно на 32%) к покою 46% (после на 54%).
  function heroLoadAnimation(api){
    if (!api) return;
    if (REDUCE_MOTION){ api.applyAfter(54); return; }
    var imgs = api.frame.querySelectorAll('img');
    Promise.all(Array.prototype.map.call(imgs, function(img){
      return img.decode ? img.decode()['catch'](function(){}) : Promise.resolve();
    })).then(function(){
      api.applyAfter(32);
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          api.root.classList.add('seam-anim');
          api.applyAfter(54);
          setTimeout(function(){ api.root.classList.remove('seam-anim'); }, 950);
        });
      });
    });
  }

  var compares = Array.prototype.map.call(document.querySelectorAll('[data-compare]'), initCompare);
  compares.forEach(function(api){
    if (api && api.root.dataset.compare === 'hero') heroLoadAnimation(api);
  });

  /* ═══════════════ ЛИНЕЙКА МЕТРАЖА (диапазон, две ручки) ═══════════════ */
  function initRuler(root, onChange){
    var rMin = root.querySelector('.r-min');
    var rMax = root.querySelector('.r-max');
    var gMin = root.querySelector('.grip-min');
    var gMax = root.querySelector('.grip-max');
    var sel = root.querySelector('.sel');
    if (!rMin || !rMax || !gMin || !gMax) return null;

    var min = parseFloat(rMin.min), max = parseFloat(rMin.max), step = parseFloat(rMin.step || '1');
    var minorStep = parseFloat(root.dataset.tickMinor || '2');
    var majorStep = parseFloat(root.dataset.tickMajor || '6');
    var ticksEl = root.querySelector('.ticks');

    function pct(v){ return (v - min) / (max - min) * 100; }

    // деления рулетки: волос каждые minorStep, штрих с цифрой каждые majorStep
    if (ticksEl){
      var html = '';
      for (var v = min; v <= max; v += minorStep){
        var isBig = Math.round((v - min) % majorStep) === 0;
        html += '<i class="' + (isBig ? 'big' : '') + '" style="left:' + pct(v) + '%"></i>';
        if (isBig) html += '<b style="left:' + pct(v) + '%">' + v + '</b>';
      }
      ticksEl.innerHTML = html;
    }

    function render(){
      var a = pct(parseFloat(rMin.value)), b = pct(parseFloat(rMax.value));
      gMin.style.left = a + '%';
      gMax.style.left = b + '%';
      sel.style.left = a + '%';
      sel.style.width = (b - a) + '%';
      rMin.setAttribute('aria-valuetext', rMin.value + ' м²');
      rMax.setAttribute('aria-valuetext', rMax.value + ' м²');
    }

    function valueFromClientX(clientX){
      var r = root.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      var v = min + p * (max - min);
      return Math.round(v / step) * step;
    }

    function drag(which, startEvent){
      var input = which === 'min' ? rMin : rMax;
      var grip = which === 'min' ? gMin : gMax;
      function move(e){
        var v = valueFromClientX(e.clientX);
        v = Math.max(min, Math.min(max, v));
        if (which === 'min') v = Math.min(v, parseFloat(rMax.value));
        else v = Math.max(v, parseFloat(rMin.value));
        input.value = v;
        render();
        onChange();
      }
      function up(e){
        if (grip.hasPointerCapture && grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
      }
      if (grip.setPointerCapture) grip.setPointerCapture(startEvent.pointerId);
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
      move(startEvent);
      input.focus({ preventScroll: true });
    }

    gMin.addEventListener('pointerdown', function(e){ e.preventDefault(); drag('min', e); });
    gMax.addEventListener('pointerdown', function(e){ e.preventDefault(); drag('max', e); });
    // клик по треку двигает ближнюю ручку — число карточек меняется и от клика
    root.addEventListener('pointerdown', function(e){
      if (e.target === gMin || e.target === gMax) return;
      var v = valueFromClientX(e.clientX);
      var which = Math.abs(v - parseFloat(rMin.value)) <= Math.abs(v - parseFloat(rMax.value)) ? 'min' : 'max';
      drag(which, e);
    });
    rMin.addEventListener('input', function(){
      if (parseFloat(rMin.value) > parseFloat(rMax.value)) rMin.value = rMax.value;
      render(); onChange();
    });
    rMax.addEventListener('input', function(){
      if (parseFloat(rMax.value) < parseFloat(rMin.value)) rMax.value = rMin.value;
      render(); onChange();
    });

    render();
    return { getMin: function(){ return parseFloat(rMin.value); }, getMax: function(){ return parseFloat(rMax.value); }, reset: function(lo, hi){ rMin.value = lo; rMax.value = hi; render(); } };
  }

  /* ═══════════════ ФИЛЬТРЫ СТРАНИЦЫ «ПРОЕКТЫ» ═══════════════ */
  (function(){
    var list = document.querySelector('[data-grid]');
    if (!list) return;
    var toggles = Array.prototype.slice.call(document.querySelectorAll('.tg[data-kind]'));
    var cards = Array.prototype.slice.call(list.querySelectorAll('.card'));
    var countEl = document.querySelector('[data-count]');
    var emptyEl = document.querySelector('[data-empty]');
    var resetBtn = document.querySelector('[data-reset]');
    var rulerEl = document.querySelector('[data-ruler]');
    var valMin = document.querySelector('[data-val-min]');
    var valMax = document.querySelector('[data-val-max]');
    var RULER_DEFAULT = { min: parseFloat(rulerEl.querySelector('.r-min').min), max: parseFloat(rulerEl.querySelector('.r-min').max) };

    var ruler = initRuler(rulerEl, apply);

    function activeKinds(){
      return toggles.filter(function(b){ return b.getAttribute('aria-pressed') === 'true'; })
                    .map(function(b){ return b.dataset.kind; });
    }

    function apply(){
      var kinds = activeKinds();
      var lo = ruler.getMin(), hi = ruler.getMax();
      if (valMin) valMin.textContent = lo;
      if (valMax) valMax.textContent = hi + ' м²';
      var shown = 0;
      cards.forEach(function(card){
        var kind = card.dataset.kind;
        var size = parseFloat(card.dataset.size);
        var kindOk = kinds.length === 0 || kinds.indexOf(kind) > -1;
        var sizeOk = size >= lo && size <= hi;
        var visible = kindOk && sizeOk;
        card.hidden = !visible;
        if (visible) shown++;
      });
      countEl.textContent = 'Показано ' + shown + ' из ' + cards.length;
      emptyEl.hidden = shown !== 0;
      var isDefault = kinds.length === 0 && lo === RULER_DEFAULT.min && hi === RULER_DEFAULT.max;
      resetBtn.hidden = isDefault;
    }

    toggles.forEach(function(btn){
      btn.addEventListener('click', function(){
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        apply();
      });
    });

    resetBtn.addEventListener('click', function(){
      toggles.forEach(function(b){ b.setAttribute('aria-pressed', 'false'); });
      ruler.reset(RULER_DEFAULT.min, RULER_DEFAULT.max);
      apply();
    });

    apply();
  })();

  /* ═══════════════ ПОДБОРНАЯ: 3D-макет и перекраска стен ═══════════════
     Источник: рабочие прототипы человека living-room-portfolio.html и
     wall-repaint.html (workspace/design/refs/design-your-live/3d/), сведены
     designer в design-your-live-preview/blocks.html (ревизия 1.4-а). Логика
     перенесена без переосмысления; о переименованных классах — комментарий в
     начале раздела «ПОДБОРНАЯ» в styles/main.css. */
  (function(){
    var room = document.getElementById('room');
    var drop = document.getElementById('drop');
    if (!room && !drop) return;

    /* ---------- БЛОК 2: перекраска фото — скрипт прототипа человека ---------- */
    if (drop) (function(){
      var PALETTE = [
        { name: 'Тёплый серый',   hex: '#928980' },
        { name: 'Шалфей',         hex: '#8fa08d' },
        { name: 'Пыльная роза',   hex: '#c39a94' },
        { name: 'Глубокий синий', hex: '#3f5468' },
        { name: 'Горчица',        hex: '#b8892e' },
        { name: 'Тёплый беж',     hex: '#d6c5ad' },
        { name: 'Оливка',         hex: '#6f7a5a' },
        { name: 'Графит',         hex: '#4a4a48' }
      ];
      var MAX_SIDE = 1400;

      var editor = document.getElementById('editor');
      var fileInput = document.getElementById('file');
      var view = document.getElementById('view');
      var ctx = view.getContext('2d');
      var hint = document.getElementById('hint');

      var work = document.createElement('canvas');
      var wctx = work.getContext('2d');
      var W = 0, H = 0;
      var orig = null, out = null, lum = null;
      var mask = null, soft = null;
      var tool = 'fill';
      var color = PALETTE[0];
      var showOriginal = false;
      var dirty = false;
      /* какой источник грузится прямо сейчас ('пример'/'ваше') — лист подбора
         узнаёт об этом только из события 'photo:ready', которое setup()
         рассылает ПОСЛЕ успешного decode; при ошибке событие не уходит, и
         лист/бриф не могут соврать про фото, которого на самом деле нет */
      var photoSource = null;

      /* ---------- загрузка ---------- */
      var loadErr = document.getElementById('loadErr');
      function loadImage(src){
        var img = new Image();
        img.onerror = function(){
          loadErr.textContent = 'Не удалось открыть это изображение. Попробуйте JPG или PNG — например, сделайте скриншот фото.';
        };
        img.onload = function(){
          loadErr.textContent = '';
          var k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
          W = Math.round(img.width * k); H = Math.round(img.height * k);
          work.width = W; work.height = H;
          wctx.drawImage(img, 0, 0, W, H);
          setup();
        };
        img.src = src;
      }
      function loadFile(file){
        if (!file) return;
        if (file.type && file.type.indexOf('image/') !== 0){
          loadErr.textContent = 'Это не изображение. Выберите фото в формате JPG или PNG.';
          return;
        }
        loadErr.textContent = 'Открываем фото…';
        var r = new FileReader();
        r.onerror = function(){ loadErr.textContent = 'Не удалось прочитать файл. Попробуйте другое фото.'; };
        r.onload = function(){ loadImage(r.result); };
        r.readAsDataURL(file);
      }
      fileInput.addEventListener('change', function(){ photoSource = 'ваше'; loadFile(fileInput.files[0]); fileInput.value = ''; });
      document.getElementById('pick').addEventListener('click', function(ev){ ev.stopPropagation(); fileInput.click(); });
      drop.addEventListener('click', function(ev){
        if (ev.target.closest('button') || ev.target === fileInput) return;
        fileInput.click();
      });
      ['dragenter', 'dragover'].forEach(function(e){ drop.addEventListener(e, function(ev){ ev.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function(e){ drop.addEventListener(e, function(ev){ ev.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function(ev){ photoSource = 'ваше'; loadFile(ev.dataTransfer.files[0]); });

      /* пример: кадр «до» из портфолио — тот же файл, что на странице «Проекты» */
      var SAMPLE = 'assets/img/g2-do.jpg';
      document.getElementById('sample').addEventListener('click', function(){ photoSource = 'пример'; loadImage(SAMPLE); });

      /* ---------- подготовка ---------- */
      function setup(){
        var d = wctx.getImageData(0, 0, W, H);
        orig = d.data;
        out = new Uint8ClampedArray(orig);
        lum = new Float32Array(W * H);
        for (var i = 0, p = 0; i < lum.length; i++, p += 4){
          lum[i] = (orig[p] * 0.299 + orig[p + 1] * 0.587 + orig[p + 2] * 0.114) / 255;
        }
        mask = new Uint8Array(W * H);
        soft = new Uint8Array(W * H);
        drop.style.display = 'none';
        editor.style.display = 'block';
        resize();
        render();
        hint.textContent = 'Тапните по стене — она перекрасится в выбранный цвет. Тапайте ещё, чтобы добавить другие стены.';
        /* фото decode прошёл успешно — теперь и только теперь лист подбора
           вправе записать источник в бриф (R4, вердикт validator 12:35:15) */
        drop.dispatchEvent(new CustomEvent('photo:ready', { detail: { source: photoSource } }));
      }

      function resize(){
        var cw = view.parentElement.clientWidth || 600;
        view.width = W; view.height = H;
        view.style.height = Math.round(cw * H / W) + 'px';
        render();
      }
      window.addEventListener('resize', function(){ if (W) resize(); });

      /* ---------- заливка ---------- */
      function fillFrom(sx, sy){
        var tol = +document.getElementById('tol').value;
        var seed = sy * W + sx, p0 = seed * 4;
        var r0 = orig[p0], g0 = orig[p0 + 1], b0 = orig[p0 + 2];
        var s0 = r0 + g0 + b0 + 1, rn0 = r0 / s0, gn0 = g0 / s0, L0 = lum[seed] * 255;
        var visited = new Uint8Array(W * H);
        var stack = [seed];
        visited[seed] = 1;
        var added = 0;
        while (stack.length){
          var i = stack.pop();
          var p = i * 4;
          var r = orig[p], g = orig[p + 1], b = orig[p + 2];
          var s = r + g + b + 1;
          var dc = Math.sqrt((r / s - rn0) * (r / s - rn0) + (g / s - gn0) * (g / s - gn0)) * 900;
          var dl = Math.abs(lum[i] * 255 - L0) * 0.4;
          if (dc + dl > tol) continue;
          mask[i] = 255; added++;
          var x = i % W, y = (i - x) / W;
          if (x > 0 && !visited[i - 1]){ visited[i - 1] = 1; stack.push(i - 1); }
          if (x < W - 1 && !visited[i + 1]){ visited[i + 1] = 1; stack.push(i + 1); }
          if (y > 0 && !visited[i - W]){ visited[i - W] = 1; stack.push(i - W); }
          if (y < H - 1 && !visited[i + W]){ visited[i + W] = 1; stack.push(i + W); }
        }
        return added;
      }

      function brushAt(x, y, value){
        var rad = +document.getElementById('brush').value * (W / view.clientWidth);
        var r2 = rad * rad;
        var x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(W - 1, Math.ceil(x + rad));
        var y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(H - 1, Math.ceil(y + rad));
        for (var yy = y0; yy <= y1; yy++){
          for (var xx = x0; xx <= x1; xx++){
            var dx = xx - x, dy = yy - y;
            if (dx * dx + dy * dy <= r2) mask[yy * W + xx] = value;
          }
        }
      }

      /* мягкие края маски */
      function soften(){
        var tmp = new Uint16Array(W * H);
        var R = 2, n = 2 * R + 1, x, y, i, k, acc;
        for (y = 0; y < H; y++){
          acc = 0; i = y * W;
          for (k = -R; k <= R; k++) acc += mask[i + Math.min(W - 1, Math.max(0, k))];
          for (x = 0; x < W; x++){
            tmp[i + x] = acc;
            acc += mask[i + Math.min(W - 1, x + R + 1)] - mask[i + Math.max(0, x - R)];
          }
        }
        for (x = 0; x < W; x++){
          acc = 0;
          for (k = -R; k <= R; k++) acc += tmp[Math.min(H - 1, Math.max(0, k)) * W + x];
          for (y = 0; y < H; y++){
            soft[y * W + x] = acc / (n * n);
            acc += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x];
          }
        }
      }

      /* ---------- перекраска с сохранением света и теней ---------- */
      function hexToHsl(hex){
        var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
        if (max !== min){
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h /= 6;
        }
        return [h, s, l];
      }
      function hue2rgb(p, q, t){
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }

      function recolor(){
        out.set(orig);
        var hsl = hexToHsl(color.hex), h = hsl[0], s = hsl[1], lt = hsl[2];
        var sum = 0, cnt = 0, i;
        for (i = 0; i < mask.length; i++) if (mask[i]){ sum += lum[i]; cnt++; }
        if (!cnt) return;
        var avg = sum / cnt;
        var lastL = -1, cr = 0, cg = 0, cb = 0;
        for (i = 0; i < soft.length; i++){
          var a = soft[i];
          if (!a) continue;
          var L = lt + (lum[i] - avg) * 0.95;
          L = L < 0.03 ? 0.03 : (L > 0.97 ? 0.97 : L);
          var Lq = Math.round(L * 200) / 200;
          if (Lq !== lastL){
            lastL = Lq;
            var q = Lq < 0.5 ? Lq * (1 + s) : Lq + s - Lq * s;
            var p = 2 * Lq - q;
            cr = hue2rgb(p, q, h + 1 / 3) * 255; cg = hue2rgb(p, q, h) * 255; cb = hue2rgb(p, q, h - 1 / 3) * 255;
          }
          var k = a / 255, ik = 1 - k, o = i * 4;
          out[o] = orig[o] * ik + cr * k;
          out[o + 1] = orig[o + 1] * ik + cg * k;
          out[o + 2] = orig[o + 2] * ik + cb * k;
        }
      }

      function render(){
        if (!orig) return;
        var d = ctx.createImageData(W, H);
        d.data.set(showOriginal ? orig : out);
        ctx.putImageData(d, 0, 0);
      }
      function update(){
        soften();
        recolor();
        render();
        dirty = false;
      }
      function scheduleUpdate(){
        if (dirty) return;
        dirty = true;
        requestAnimationFrame(update);
      }

      /* ---------- указатель ---------- */
      function toImg(ev){
        var r = view.getBoundingClientRect();
        return { x: Math.round((ev.clientX - r.left) * W / r.width), y: Math.round((ev.clientY - r.top) * H / r.height) };
      }
      var down = false;
      view.addEventListener('pointerdown', function(ev){
        ev.preventDefault();
        var p = toImg(ev);
        if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return;
        if (tool === 'fill'){
          var n = fillFrom(p.x, p.y);
          if (n < 200) hint.textContent = 'Выделилась совсем маленькая область. Попробуйте поднять чувствительность или тапнуть по ровному участку стены.';
          else if (n > W * H * 0.6) hint.textContent = 'Захватилось слишком много. Снизьте чувствительность и нажмите «Сбросить выделение», или уберите лишнее ластиком.';
          else hint.textContent = 'Готово. Меняйте цвета ниже, дорисуйте кистью или уберите лишнее ластиком.';
          scheduleUpdate();
        } else {
          down = true;
          view.setPointerCapture(ev.pointerId);
          brushAt(p.x, p.y, tool === 'add' ? 255 : 0);
          scheduleUpdate();
        }
      });
      view.addEventListener('pointermove', function(ev){
        if (!down) return;
        var p = toImg(ev);
        brushAt(p.x, p.y, tool === 'add' ? 255 : 0);
        scheduleUpdate();
      });
      function up(){ down = false; }
      view.addEventListener('pointerup', up);
      view.addEventListener('pointercancel', up);

      /* ---------- инструменты ---------- */
      var toolBtns = Array.prototype.slice.call(document.querySelectorAll('[data-tool]'));
      toolBtns.forEach(function(b){
        b.addEventListener('click', function(){
          tool = b.getAttribute('data-tool');
          toolBtns.forEach(function(o){ o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
          view.style.cursor = tool === 'fill' ? 'crosshair' : 'cell';
        });
      });
      document.getElementById('clear').addEventListener('click', function(){
        mask.fill(0); scheduleUpdate();
        hint.textContent = 'Выделение сброшено. Тапните по стене заново.';
      });

      /* ---------- палитра стен (выкрасы) ---------- */
      var swatchesEl = document.getElementById('swatches');
      var swatches = [];
      function selectColor(c, swatchEl){
        color = c;
        swatches.forEach(function(sw){ sw.setAttribute('aria-pressed', sw === swatchEl ? 'true' : 'false'); });
        scheduleUpdate();
      }
      PALETTE.forEach(function(c, i){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'swatch';
        b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        b.innerHTML = '<i style="background:' + c.hex + '"></i>';
        b.setAttribute('aria-label', c.name + ' ' + c.hex.toUpperCase());
        b.setAttribute('title', c.name);
        b.addEventListener('click', function(){ selectColor(c, b); });
        swatchesEl.appendChild(b); swatches.push(b);
      });
      var custom = document.getElementById('custom');
      custom.addEventListener('input', function(){ selectColor({ name: 'Свой цвет', hex: custom.value }, null); });

      /* ---------- оригинал / скачать / другое фото ---------- */
      var hold = document.getElementById('hold');
      function showOrig(on){ showOriginal = on; render(); }
      hold.addEventListener('pointerdown', function(ev){ ev.preventDefault(); showOrig(true); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(e){ hold.addEventListener(e, function(){ showOrig(false); }); });
      hold.addEventListener('keydown', function(ev){ if (ev.key === ' ' || ev.key === 'Enter'){ ev.preventDefault(); showOrig(true); } });
      hold.addEventListener('keyup', function(){ showOrig(false); });

      document.getElementById('download').addEventListener('click', function(){
        var c = document.createElement('canvas'); c.width = W; c.height = H;
        var d = c.getContext('2d').createImageData(W, H); d.data.set(out);
        c.getContext('2d').putImageData(d, 0, 0);
        var a = document.createElement('a');
        a.download = 'steny-' + color.hex.replace('#', '') + '.jpg';
        a.href = c.toDataURL('image/jpeg', 0.92);
        a.click();
      });

      document.getElementById('another').addEventListener('click', function(){
        editor.style.display = 'none'; drop.style.display = 'flex';
        orig = null;
      });

      /* блок «заявка» из прототипа человека сюда не перенесён: на этом сайте
         заявки нет, разговор идёт в Telegram, а внешний запрос запрещён DoD */
    })();

    /* ---------- БЛОК 1: 3D-сцена — скрипт прототипа человека, ленивый запуск ---------- */
    function initRoom(){
      var container = room;
      var canvas = document.getElementById('scene');

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0.4, 1.55, 5.3);

      var controls = new THREE.OrbitControls(camera, canvas);
      controls.target.set(0, 1.05, -0.6);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 3.6;
      controls.maxDistance = 7.5;
      controls.minPolarAngle = 1.15;
      controls.maxPolarAngle = 1.56;
      controls.minAzimuthAngle = -0.55;
      controls.maxAzimuthAngle = 0.55;
      controls.update();
      controls.saveState();

      /* ---------- сенсорный ввод сцены (DD-1, пункт приёмки 27) ----------
         OrbitControls.js — нетронутая копия библиотеки (её не трогаем), а она
         одним пальцем всегда вращает камеру и в onTouchStart, и в onTouchMove
         безусловно вызывает preventDefault — страница не может прокрутиться
         даже вертикальным движением. Концепция (design-your-live.md:690–697)
         требует обратного: горизонтально — камера, вертикально — прокрутка,
         щипок камеру не масштабирует. Чиним снаружи библиотеки. */

      /* щипок: OrbitControls трогает камеру в двупальцевом касании только
         если enableZoom или enablePan включены (enablePan уже false, строкой
         выше) — на тач выключаем и zoom, тогда у двупальцевого касания в
         библиотеке не остаётся действия вовсе. На мышь (pointer: fine)
         enableZoom остаётся true — колесо и раньше, и сейчас масштабирует. */
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches){
        controls.enableZoom = false;
      }

      /* вертикальный свайп: слушаем touchmove на РОДИТЕЛЕ canvas (container)
         в фазе перехвата — она срабатывает раньше слушателя, который сам
         OrbitControls повесил на canvas, — и как только направление жеста
         читается как вертикальное, останавливаем событие через
         stopPropagation(). До OrbitControls оно не доходит, preventDefault в
         библиотеке не вызывается для touchmove, и браузер прокручивает
         страницу — этому не мешает touch-action:pan-y на canvas (main.css:196).
         Горизонтальный жест не трогаем — он идёт в OrbitControls как раньше.

         Отдельная ловушка: OrbitControls.onTouchStart вызывает preventDefault
         БЕЗУСЛОВНО на самом touchstart, ещё до того, как известно направление
         следующего движения — а в Chrome preventDefault на touchstart сам по
         себе отменяет прокрутку для всего жеста, даже если ни один touchmove
         потом не был предотвращён (проверено на изолированной странице:
         /tmp/dev-t14/isotest.js, режим 'preventstart' даёт тот же Δ0, что и
         'preventmove'). Чинить это через stopPropagation на touchstart нельзя
         — тогда OrbitControls не узнает о начале жеста и не сможет вращать
         камеру при горизонтальном движении. Поэтому вместо остановки события
         обезвреживается его preventDefault — OrbitControls по-прежнему
         заводит свой внутренний STATE.TOUCH_ROTATE как раньше, но эта заявка
         на блокировку скролла больше ничего не решает; решение принимается
         позже, на touchmove, где prevent действительно работает. */
      (function(){
        var DECIDE_PX = 6;
        var startX = 0, startY = 0, direction = null, oneFinger = false;
        container.addEventListener('touchstart', function(ev){
          oneFinger = ev.touches.length === 1;
          direction = null;
          if (oneFinger){ startX = ev.touches[0].clientX; startY = ev.touches[0].clientY; }
          ev.preventDefault = function(){};
        }, { capture: true, passive: true });
        container.addEventListener('touchmove', function(ev){
          if (!oneFinger || ev.touches.length !== 1) return;
          if (direction === null){
            var dx = ev.touches[0].clientX - startX, dy = ev.touches[0].clientY - startY;
            if (Math.abs(dx) < DECIDE_PX && Math.abs(dy) < DECIDE_PX) return;
            direction = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
          }
          if (direction === 'vertical') ev.stopPropagation();
        }, { capture: true, passive: true });
      })();

      /* ---------- размеры комнаты (те же, что на чертеже и в марке проекта) ---------- */
      var W = 4.6, D = 5.2, H = 2.7;
      var xL = -W / 2, xR = W / 2, zB = -D / 2, zF = D / 2;

      /* ---------- материалы, зависящие от схемы ---------- */
      var wallMat  = new THREE.MeshStandardMaterial({ roughness: 0.95 });
      var sofaMat  = new THREE.MeshStandardMaterial({ roughness: 0.85 });
      var slatMat  = new THREE.MeshStandardMaterial({ roughness: 0.6 });
      var rugMat   = new THREE.MeshStandardMaterial({ roughness: 1 });
      var artMat   = new THREE.MeshStandardMaterial({ roughness: 1 });
      var cushMats = [0, 1, 2].map(function(){ return new THREE.MeshStandardMaterial({ roughness: 0.95 }); });
      var plankMats = [];

      /* ---------- постоянные материалы ---------- */
      var ceilMat  = new THREE.MeshStandardMaterial({ color: 0xe6e0d6, roughness: 1 });
      var trimMat  = new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: 0.8 });
      var blackMat = new THREE.MeshStandardMaterial({ color: 0x1f1e1c, roughness: 0.5 });
      var brassMat = new THREE.MeshStandardMaterial({ color: 0xb48d54, roughness: 0.35, metalness: 0.85 });
      var marbleMat = new THREE.MeshStandardMaterial({ color: 0xede8de, roughness: 0.25 });
      var potMat   = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.7 });
      var trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5238, roughness: 0.9 });
      var leafA    = new THREE.MeshStandardMaterial({ color: 0x2f5f3b, roughness: 0.8, side: THREE.DoubleSide });
      var leafB    = new THREE.MeshStandardMaterial({ color: 0x3f7a4a, roughness: 0.8, side: THREE.DoubleSide });
      var glassMat = new THREE.MeshStandardMaterial({ color: 0xe3ecee, emissive: 0xdde8ec, emissiveIntensity: 0.9, roughness: 0.2 });
      var curtainMat = new THREE.MeshStandardMaterial({ color: 0xefeae2, roughness: 1, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      var pelmetMat = new THREE.MeshStandardMaterial({ color: 0xc6b399, roughness: 0.9 });
      var glowMat  = new THREE.MeshBasicMaterial({ color: 0xffd9a6 });
      var slatGlow = new THREE.MeshBasicMaterial({ color: 0xf3c98d });
      var shadeMat = new THREE.MeshStandardMaterial({ color: 0xe9dfcc, emissive: 0xf1d9b0, emissiveIntensity: 0.3, side: THREE.DoubleSide, roughness: 1 });
      var paperMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 1 });
      var taupeMat = new THREE.MeshStandardMaterial({ color: 0x8c7f70, roughness: 1 });
      var paleMat  = new THREE.MeshStandardMaterial({ color: 0xe2d6c2, roughness: 1 });
      var bookDark = new THREE.MeshStandardMaterial({ color: 0x3a3936, roughness: 0.8 });
      var bookLight = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.8 });
      var candleMat = new THREE.MeshStandardMaterial({ color: 0xd9a45a, emissive: 0xffb15e, emissiveIntensity: 0.25, roughness: 0.6 });
      var doorMat  = new THREE.MeshStandardMaterial({ color: 0x74706a, roughness: 1 });

      /* ---------- слои: мебель и декор ---------- */
      var furnGroup = new THREE.Group();
      var decorGroup = new THREE.Group();
      scene.add(furnGroup);
      scene.add(decorGroup);

      function box(w, h, d, mat, x, y, z, parent){
        var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true;
        (parent || scene).add(m);
        return m;
      }
      function cyl(rTop, rBot, h, mat, x, y, z, parent, open){
        var m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 40, 1, !!open), mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true;
        (parent || scene).add(m);
        return m;
      }
      function plane(w, h, mat, x, y, z, rx, ry){
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(x, y, z);
        m.rotation.set(rx || 0, ry || 0, 0);
        m.receiveShadow = true;
        scene.add(m);
        return m;
      }

      /* ---------- пол из досок ---------- */
      var seed = 7;
      function rnd(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      var pw = 0.19, pl = 1.3;
      for (var px = xL + pw / 2; px < xR; px += pw){
        var offset = rnd() * pl;
        for (var pz = zB - pl + offset; pz < zF; pz += pl){
          var z0 = Math.max(pz, zB), z1 = Math.min(pz + pl - 0.006, zF);
          if (z1 - z0 < 0.05) continue;
          var pm = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.03 });
          pm.userData.k = 0.84 + rnd() * 0.32;
          plankMats.push(pm);
          var p = box(pw - 0.006, 0.02, z1 - z0, pm, px, -0.01, (z0 + z1) / 2);
          p.castShadow = false;
        }
      }

      /* ---------- стены, потолок ---------- */
      plane(W, H, wallMat, 0, H / 2, zB, 0, 0);
      plane(D, H, wallMat, xL, H / 2, 0, 0, Math.PI / 2);
      plane(D, H, wallMat, xR, H / 2, 0, 0, -Math.PI / 2);
      plane(W, D, ceilMat, 0, H, 0, Math.PI / 2, 0);

      box(W, 0.1, 0.02, trimMat, 0, 0.05, zB + 0.01);
      box(0.02, 0.1, D, trimMat, xL + 0.01, 0.05, 0);
      box(0.02, 0.1, D, trimMat, xR - 0.01, 0.05, 0);

      /* подсветка по периметру потолка */
      box(W, 0.03, 0.06, glowMat, 0, H - 0.06, zB + 0.06).castShadow = false;
      box(0.06, 0.03, D, glowMat, xL + 0.06, H - 0.06, 0).castShadow = false;
      box(0.06, 0.03, D, glowMat, xR - 0.06, H - 0.06, 0).castShadow = false;

      /* ---------- окно и штора ---------- */
      plane(1.3, 1.35, glassMat, 0.5, 1.5, zB + 0.01, 0, 0);
      box(1.42, 0.06, 0.05, trimMat, 0.5, 2.2, zB + 0.03);
      box(1.42, 0.06, 0.05, trimMat, 0.5, 0.8, zB + 0.03);
      box(0.06, 1.46, 0.05, trimMat, -0.18, 1.5, zB + 0.03);
      box(0.06, 1.46, 0.05, trimMat, 1.18, 1.5, zB + 0.03);
      box(0.04, 1.35, 0.04, trimMat, 0.5, 1.5, zB + 0.03);

      var curtainGeo = new THREE.PlaneGeometry(W - 0.1, H - 0.08, 96, 1);
      var pos = curtainGeo.attributes.position;
      for (var i = 0; i < pos.count; i++){
        var cx = pos.getX(i);
        pos.setZ(i, Math.sin(cx * 14) * 0.045);
      }
      curtainGeo.computeVertexNormals();
      var curtain = new THREE.Mesh(curtainGeo, curtainMat);
      curtain.position.set(0, (H - 0.08) / 2 + 0.02, zB + 0.22);
      curtain.castShadow = false;
      scene.add(curtain);
      box(2.0, 0.28, 0.08, pelmetMat, 0.5, H - 0.24, zB + 0.16);

      /* ---------- рейки с подсветкой (левая стена, у дальнего угла) ---------- */
      var slatZ0 = zB, slatZ1 = zB + 1.4;
      plane(slatZ1 - slatZ0, H, slatGlow, xL + 0.01, H / 2, (slatZ0 + slatZ1) / 2, 0, Math.PI / 2).receiveShadow = false;
      for (var sz = slatZ0 + 0.04; sz < slatZ1; sz += 0.078){
        box(0.05, H, 0.044, slatMat, xL + 0.045, H / 2, sz).castShadow = false;
      }

      /* ---------- картина ---------- */
      var artZ = -0.05, artY = 1.78;
      box(0.04, 1.4, 1.0, blackMat, xL + 0.02, artY, artZ, decorGroup);
      box(0.02, 1.28, 0.88, paperMat, xL + 0.05, artY, artZ, decorGroup);
      box(0.012, 0.36, 0.5, artMat, xL + 0.065, artY + 0.28, artZ - 0.12, decorGroup);
      box(0.012, 0.56, 0.34, taupeMat, xL + 0.07, artY - 0.16, artZ + 0.2, decorGroup);
      box(0.012, 0.42, 0.13, blackMat, xL + 0.075, artY - 0.02, artZ - 0.22, decorGroup);
      box(0.012, 0.3, 0.4, paleMat, xL + 0.068, artY - 0.42, artZ - 0.1, decorGroup);

      /* ---------- бра ---------- */
      var sconceLights = [];
      [-1.05, 1.0].forEach(function(z){
        cyl(0.035, 0.035, 0.28, blackMat, xL + 0.06, 1.75, z);
        cyl(0.028, 0.028, 0.02, glowMat, xL + 0.06, 1.9, z).castShadow = false;
        var l = new THREE.PointLight(0xffc98a, 0.35, 3.5, 2);
        l.position.set(xL + 0.25, 1.9, z);
        scene.add(l);
        sconceLights.push(l);
      });

      /* ---------- диван у левой стены ---------- */
      var sofa = new THREE.Group();
      sofa.position.set(xL + 0.5, 0, -0.1);
      furnGroup.add(sofa);
      box(0.95, 0.42, 2.3, sofaMat, 0.02, 0.45, 0, sofa);
      box(0.25, 0.62, 2.3, sofaMat, -0.34, 0.92, 0, sofa);
      box(0.95, 0.66, 0.24, sofaMat, 0.02, 0.57, -1.27, sofa);
      box(0.95, 0.66, 0.24, sofaMat, 0.02, 0.57, 1.27, sofa);
      [-0.35, 0.35].forEach(function(x){
        [-1.15, 1.15].forEach(function(z){ cyl(0.025, 0.02, 0.24, trunkMat, x, 0.12, z, sofa); });
      });
      [-0.72, 0, 0.72].forEach(function(z, i){
        var c = box(0.16, 0.5, 0.55, cushMats[i], sofa.position.x - 0.12, 0.9, sofa.position.z + z, decorGroup);
        c.rotation.z = 0.2;
      });

      /* ---------- приставной столик с растением ---------- */
      var side = new THREE.Group();
      side.position.set(xL + 0.55, 0, -1.72);
      furnGroup.add(side);
      cyl(0.24, 0.24, 0.03, blackMat, 0, 0.55, 0, side);
      cyl(0.02, 0.02, 0.52, blackMat, 0, 0.28, 0, side);
      cyl(0.15, 0.15, 0.02, blackMat, 0, 0.01, 0, side);
      cyl(0.07, 0.06, 0.1, potMat, side.position.x - 0.05, 0.62, side.position.z + 0.02, decorGroup);
      var sp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), leafB);
      sp.position.set(side.position.x - 0.05, 0.74, side.position.z + 0.02); sp.castShadow = true; decorGroup.add(sp);

      /* ---------- подвесной светильник ---------- */
      var pend = new THREE.Group();
      pend.position.set(xL + 0.9, 0, -1.55);
      scene.add(pend);
      cyl(0.005, 0.005, 0.72, blackMat, 0, H - 0.36, 0, pend);
      cyl(0.11, 0.3, 0.2, shadeMat, 0, H - 0.82, 0, pend, true);
      cyl(0.02, 0.02, 0.05, glowMat, 0, H - 0.9, 0, pend).castShadow = false;
      var pl2 = new THREE.PointLight(0xffd0a0, 0.6, 5, 2);
      pl2.position.set(0, H - 1.0, 0);
      pend.add(pl2);

      /* ---------- ковёр ---------- */
      box(3.2, 0.02, 2.6, rugMat, 0.2, 0.01, 0.15, furnGroup).castShadow = false;

      /* ---------- журнальный столик: мрамор + латунь ---------- */
      var table = new THREE.Group();
      table.position.set(-0.35, 0, -0.15);
      furnGroup.add(table);
      var base = cyl(0.4, 0.44, 0.34, brassMat, 0, 0.17, 0, table);
      base.scale.z = 0.5;
      var top = cyl(0.64, 0.64, 0.035, marbleMat, 0, 0.36, 0, table);
      top.scale.z = 0.62;
      var tx = table.position.x, tz = table.position.z;
      box(0.34, 0.035, 0.24, bookDark, tx - 0.12, 0.395, tz + 0.02, decorGroup);
      box(0.28, 0.03, 0.2, bookLight, tx - 0.1, 0.43, tz, decorGroup);
      cyl(0.05, 0.05, 0.08, candleMat, tx + 0.32, 0.42, tz + 0.06, decorGroup);

      /* ---------- растения в правом дальнем углу ---------- */
      var fig = new THREE.Group();
      fig.position.set(xR - 0.75, 0, zB + 0.6);
      decorGroup.add(fig);
      cyl(0.24, 0.2, 0.5, potMat, 0, 0.25, 0, fig);
      cyl(0.02, 0.025, 1.4, trunkMat, 0, 1.15, 0, fig);
      for (var k = 0; k < 14; k++){
        var a = k * 2.4, ry = 1.0 + (k / 14) * 1.15;
        var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), k % 2 ? leafA : leafB);
        leaf.scale.set(1, 1.3, 0.28);
        leaf.position.set(Math.cos(a) * 0.32, ry, Math.sin(a) * 0.32);
        leaf.rotation.y = -a + Math.PI / 2;
        leaf.rotation.x = 0.35;
        leaf.castShadow = true;
        fig.add(leaf);
      }
      var mon = new THREE.Group();
      mon.position.set(xR - 0.35, 0, zB + 1.35);
      decorGroup.add(mon);
      cyl(0.2, 0.17, 0.42, potMat, 0, 0.21, 0, mon);
      for (var q = 0; q < 7; q++){
        var b = q * 1.7, hy = 0.55 + q * 0.09;
        var ml = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), q % 2 ? leafA : leafB);
        ml.scale.set(1.2, 0.22, 1);
        ml.position.set(Math.cos(b) * 0.28, hy, Math.sin(b) * 0.28);
        ml.rotation.y = -b;
        ml.rotation.z = 0.25;
        ml.castShadow = true;
        mon.add(ml);
      }

      /* ---------- дверной проём на правой стене ---------- */
      box(0.03, 2.1, 0.9, doorMat, xR - 0.015, 1.05, 1.55).castShadow = false;
      box(0.05, 2.14, 0.06, trimMat, xR - 0.025, 1.07, 1.07);
      box(0.05, 2.14, 0.06, trimMat, xR - 0.025, 1.07, 2.03);
      box(0.05, 0.06, 1.02, trimMat, xR - 0.025, 2.13, 1.55);

      /* ---------- свет ---------- */
      var hemi = new THREE.HemisphereLight(0xfff8f0, 0x8f8375, 0.3);
      scene.add(hemi);
      var sun = new THREE.DirectionalLight(0xfff4e6, 1.3);
      sun.position.set(0.6, 2.4, zB + 0.2);
      sun.target.position.set(-0.4, 0.4, 1.6);
      scene.add(sun.target);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -4; sun.shadow.camera.right = 4;
      sun.shadow.camera.top = 4;   sun.shadow.camera.bottom = -4;
      sun.shadow.camera.near = 0.3; sun.shadow.camera.far = 14;
      sun.shadow.bias = -0.0006;
      scene.add(sun);
      var fill = new THREE.DirectionalLight(0xfff2e2, 0.16);
      fill.position.set(2.5, 2.2, 5);
      scene.add(fill);
      var cove1 = new THREE.PointLight(0xffd2a2, 0.25, 8, 2); cove1.position.set(0, H - 0.2, -1.2); scene.add(cove1);
      var cove2 = new THREE.PointLight(0xffd2a2, 0.2, 8, 2);  cove2.position.set(0, H - 0.2, 1.2);  scene.add(cove2);

      /* ---------- цветовые схемы ---------- */
      var schemes = [
        { name: 'Оригинал',      sofa: '#145534', wall: '#928980', slat: '#c49255', floor: '#b0855a', rug: '#948a7d', cushions: ['#a89173', '#66605a', '#d8d0c4'], art: '#c2ab88' },
        { name: 'Синий бархат',  sofa: '#233d5c', wall: '#bab3aa', slat: '#84603f', floor: '#a9835b', rug: '#b3aa9e', cushions: ['#d3c7b4', '#9a7047', '#e0d9cd'], art: '#a68a5b' },
        { name: 'Горчица',       sofa: '#b8892e', wall: '#c8c1b6', slat: '#c49255', floor: '#c19f72', rug: '#948b80', cushions: ['#3f443f', '#e2d8c8', '#7d776f'], art: '#8c7d6a' },
        { name: 'Пыльная роза',  sofa: '#a86f6e', wall: '#d4c8bf', slat: '#c79c6c', floor: '#c6a67c', rug: '#c1b5a9', cushions: ['#4f4143', '#eae0d6', '#9c8a7f'], art: '#b3928a' }
      ];

      var schemesEl = document.getElementById('schemes');
      var buttons = [];

      function applyScheme(i){
        var s = schemes[i];
        wallMat.color.set(s.wall);
        sofaMat.color.set(s.sofa);
        slatMat.color.set(s.slat);
        rugMat.color.set(s.rug);
        artMat.color.set(s.art);
        cushMats.forEach(function(m, j){ m.color.set(s.cushions[j]); });
        plankMats.forEach(function(m){ m.color.set(s.floor).multiplyScalar(m.userData.k); });
        buttons.forEach(function(b, j){ b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      }

      /* кнопки уже есть в разметке — скрипт только оживляет их */
      buttons = Array.prototype.slice.call(schemesEl.querySelectorAll('.scheme'));
      buttons.forEach(function(b, i){
        b.addEventListener('click', function(){ applyScheme(i); });
      });
      applyScheme(0);

      document.getElementById('reset').addEventListener('click', function(){ controls.reset(); });

      /* ---------- слои: мебель / декор ---------- */
      var furnChk = document.getElementById('furn');
      var decorChk = document.getElementById('decor');
      var decorWanted = true;
      function applyLayers(){
        furnGroup.visible = furnChk.checked;
        if (furnChk.checked){
          decorChk.disabled = false;
          decorChk.checked = decorWanted;
        } else {
          decorChk.checked = false;
          decorChk.disabled = true;
        }
        decorGroup.visible = furnChk.checked && decorChk.checked;
      }
      furnChk.addEventListener('change', applyLayers);
      decorChk.addEventListener('change', function(){ decorWanted = decorChk.checked; applyLayers(); });
      applyLayers();

      /* ---------- день / вечер ---------- */
      var DAY = {
        sun: 1.3, hemi: 0.3, fill: 0.16, cove: 0.25, sconce: 0.35, pendant: 0.6,
        exposure: 0.92,
        glass: new THREE.Color(0xdde8ec), glassI: 0.9,
        curtain: new THREE.Color(0xefeae2),
        shade: 0.3, candle: 0.25,
        glow: new THREE.Color(0xffd9a6), slatGlow: new THREE.Color(0xf3c98d),
        hemiSky: new THREE.Color(0xfff8f0)
      };
      var EVE = {
        sun: 0.06, hemi: 0.14, fill: 0.04, cove: 1.1, sconce: 1.3, pendant: 1.7,
        exposure: 0.95,
        glass: new THREE.Color(0x1b2736), glassI: 0.7,
        curtain: new THREE.Color(0xb7ad9f),
        shade: 1.2, candle: 1.4,
        glow: new THREE.Color(0xffc987), slatGlow: new THREE.Color(0xffbf72),
        hemiSky: new THREE.Color(0xffe0c0)
      };
      var lightT = 0, lightTarget = 0;
      var tmpColor = new THREE.Color();
      function lerp(a, b, t){ return a + (b - a) * t; }
      function applyLight(t){
        sun.intensity = lerp(DAY.sun, EVE.sun, t);
        hemi.intensity = lerp(DAY.hemi, EVE.hemi, t);
        hemi.color.copy(tmpColor.copy(DAY.hemiSky).lerp(EVE.hemiSky, t));
        fill.intensity = lerp(DAY.fill, EVE.fill, t);
        cove1.intensity = lerp(DAY.cove, EVE.cove, t);
        cove2.intensity = lerp(DAY.cove, EVE.cove, t) * 0.9;
        sconceLights.forEach(function(l){ l.intensity = lerp(DAY.sconce, EVE.sconce, t); });
        pl2.intensity = lerp(DAY.pendant, EVE.pendant, t);
        renderer.toneMappingExposure = lerp(DAY.exposure, EVE.exposure, t);
        glassMat.emissive.copy(tmpColor.copy(DAY.glass).lerp(EVE.glass, t));
        glassMat.color.copy(glassMat.emissive);
        glassMat.emissiveIntensity = lerp(DAY.glassI, EVE.glassI, t);
        curtainMat.color.copy(tmpColor.copy(DAY.curtain).lerp(EVE.curtain, t));
        shadeMat.emissiveIntensity = lerp(DAY.shade, EVE.shade, t);
        candleMat.emissiveIntensity = lerp(DAY.candle, EVE.candle, t);
        glowMat.color.copy(tmpColor.copy(DAY.glow).lerp(EVE.glow, t));
        slatGlow.color.copy(tmpColor.copy(DAY.slatGlow).lerp(EVE.slatGlow, t));
      }
      var modeButtons = Array.prototype.slice.call(document.querySelectorAll('.tbtn'));
      modeButtons.forEach(function(b){
        b.addEventListener('click', function(){
          lightTarget = b.getAttribute('data-mode') === 'evening' ? 1 : 0;
          modeButtons.forEach(function(o){ o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        });
      });
      applyLight(0);

      /* ---------- размер и рендер ---------- */
      function resizeScene(){
        var w = container.clientWidth;
        /* правка прототипа: бокс сцены 8:5 на компьютере и планшете, выше — на телефоне,
           чтобы комната не превращалась в щель, а чертёж-заглушка совпадал с ним по боксу */
        var h = w <= 600 ? Math.round(w * 1.0625) : Math.round(Math.min(620, Math.max(300, w * 0.625)));
        renderer.setSize(w, h, false);
        canvas.style.height = h + 'px';
        camera.aspect = w / h;
        /* правка прототипа: на узком боксе держим постоянным ГОРИЗОНТАЛЬНЫЙ угол обзора,
           иначе на 360 комната кадрируется по вертикали и диван с растением уезжают за край.
           tan(hFov/2) взят из настольного кадра (fov 42° при 8:5) и сохраняется. */
        var tanH = 1.6 * Math.tan(42 * Math.PI / 360);
        var fov = 2 * Math.atan(tanH / camera.aspect) * 180 / Math.PI;
        camera.fov = Math.max(42, Math.min(62, fov));
        camera.updateProjectionMatrix();
      }
      window.addEventListener('resize', resizeScene);
      resizeScene();

      function tick(){
        requestAnimationFrame(tick);
        if (Math.abs(lightTarget - lightT) > 0.002){
          lightT += (lightTarget - lightT) * 0.08;
          applyLight(lightT);
        } else if (lightT !== lightTarget){
          lightT = lightTarget;
          applyLight(lightT);
        }
        controls.update();
        renderer.render(scene, camera);
      }
      tick();
    }

    /* ---------- склейка: ленивая загрузка three.js, чертёж, лист подбора ---------- */
    if (room) (function(){
      var draft = document.getElementById('draft');

      /* 1. ленивая загрузка: скрипты сцены появляются, только когда блок виден */
      function load(src){
        return new Promise(function(ok, bad){
          var s = document.createElement('script');
          s.src = src; s.onload = ok; s.onerror = bad;
          document.head.appendChild(s);
        });
      }
      function start(){
        load('assets/js/three.min.js')
          .then(function(){ return load('assets/js/OrbitControls.js'); })
          .then(function(){
            initRoom();
            requestAnimationFrame(function(){ requestAnimationFrame(function(){
              draft.classList.add('gone');
              document.body.setAttribute('data-scene', 'ready');
            }); });
          })
          .catch(function(){
            document.getElementById('draftnote').textContent =
              'Объёмный макет не открылся в вашем браузере. Вот план той же комнаты: 4,6 × 5,2 м, потолок 2,7 м.';
            document.body.setAttribute('data-scene', 'fallback');
            sceneUnavailable();
          });
      }
      var io = new IntersectionObserver(function(es){
        if (es[0].isIntersecting){ io.disconnect(); start(); }
      }, { rootMargin: '200px' });
      io.observe(room);

      /* 2. лист подбора — зеркало состояния */
      var st = { scheme: 'Оригинал', light: 'День', color: null, hex: null, photo: null };
      var vS = document.getElementById('v-scheme'), vL = document.getElementById('v-light'),
          vC = document.getElementById('v-color'), vP = document.getElementById('v-photo'),
          want = document.getElementById('want');

      function paintSheet(){
        /* «—» вместо значения, если выбрать его негде: строка листа не выдумывает выбор */
        if (st.scheme){ vS.className = ''; vS.textContent = st.scheme; }
        else { vS.className = 'empty'; vS.textContent = '—'; }
        if (st.light){ vL.className = ''; vL.textContent = st.light; }
        else { vL.className = 'empty'; vL.textContent = '—'; }
        if (st.color){
          vC.className = '';
          vC.innerHTML = '<i style="background:' + st.hex + '"></i><span>' + st.color + '</span> <b>' + st.hex.toUpperCase() + '</b>';
        }
        if (st.photo){ vP.className = ''; vP.textContent = st.photo; }
        var t = ['Здравствуйте! Вот мой выбор с сайта.'];
        /* если сцены нет, строка про палитру и свет в сообщение не попадает */
        if (st.scheme && st.light){
          t.push('Палитра макета — «' + st.scheme + '», свет — ' + st.light.toLowerCase() + '.');
        }
        if (st.color) t.push('Цвет стены — ' + st.color + ' ' + st.hex.toUpperCase() + ', подобран ' +
          (st.photo === 'ваше' ? 'на своём фото.' : 'на примере с сайта.'));
        if (st.photo === 'ваше') t.push('Фотография у меня, пришлю её сюда следующим сообщением.');
        want.href = 'https://t.me/anastaishaKL?text=' + encodeURIComponent(t.join('\n'));
      }

      /* сцены нет: подсказка «потяните» становится ложью, а лист не должен
         подставлять в бриф выбор, которого человек не делал */
      function sceneUnavailable(){
        /* про «не открылся» уже сказано подписью под чертежом — второй раз не повторяем,
           просто убираем подсказку, которая теперь неправда */
        var hintline = document.getElementById('hintline');
        if (hintline) hintline.hidden = true;
        st.scheme = null; st.light = null; paintSheet();
      }

      // палитра и время суток относятся к блоку 1 (3D) — слушатели живут,
      // пока есть #room, независимо от блока 2 (перекраска)
      // пока сцена не готова (грузится или fallback), кнопки выключены только
      // визуально (CSS pointer-events:none) — клавиатура (Enter/Space) их всё
      // равно активирует, поэтому лист/бриф не должны верить click-у, пока
      // data-scene !== 'ready' (макет, которого нет, не может иметь палитру)
      document.getElementById('schemes').addEventListener('click', function(e){
        if (document.body.getAttribute('data-scene') !== 'ready') return;
        var b = e.target.closest('.scheme'); if (!b) return;
        st.scheme = b.textContent.trim(); paintSheet();
      });
      Array.prototype.forEach.call(document.querySelectorAll('.tbtn'), function(b){
        b.addEventListener('click', function(){
          if (document.body.getAttribute('data-scene') !== 'ready') return;
          st.light = b.textContent.trim(); paintSheet();
        });
      });

      if (drop){
        var picked = document.getElementById('picked');
        function rgb2hex(s){
          var m = /rgb\((\d+), ?(\d+), ?(\d+)\)/.exec(s);
          if (!m) return s;
          return '#' + [1, 2, 3].map(function(i){ return ('0' + (+m[i]).toString(16)).slice(-2); }).join('');
        }
        var swatchesEl = document.getElementById('swatches');
        swatchesEl.addEventListener('click', function(e){
          var b = e.target.closest('button'); if (!b) return;
          st.color = b.getAttribute('title') || b.textContent.trim();
          st.hex = rgb2hex(b.querySelector('i').style.backgroundColor);
          picked.innerHTML = '<i style="background:' + st.hex + '"></i><span>' + st.color + '</span> <b>' + st.hex.toUpperCase() + '</b>';
          paintSheet();
        });
        document.getElementById('custom').addEventListener('input', function(e){
          st.color = 'Свой цвет'; st.hex = e.target.value;
          picked.innerHTML = '<i style="background:' + st.hex + '"></i><span>Свой цвет</span> <b>' + st.hex.toUpperCase() + '</b>';
          paintSheet();
        });
        function currentSwatch(){
          var b = swatchesEl.querySelector('button[aria-pressed="true"]') || swatchesEl.querySelector('button');
          if (!b) return;
          st.color = b.getAttribute('title') || b.textContent.trim();
          st.hex = rgb2hex(b.querySelector('i').style.backgroundColor);
          picked.innerHTML = '<i style="background:' + st.hex + '"></i><span>' + st.color + '</span> <b>' + st.hex.toUpperCase() + '</b>';
        }
        // R4 (вердикт validator 12:35:15): лист/бриф не смеют поверить в фото
        // раньше блока 2 — тот сам решает, «ваше» оно или «пример», ТОЛЬКО
        // когда decode прошёл (setup() внутри loadImage.onload), и тогда же,
        // не раньше, шлёт 'photo:ready' на #drop. Слушать change/click/drop
        // напрямую здесь означало верить попытке загрузки, а не её исходу:
        // неудачный файл (не картинка, битый JPG/HEIC) не долетает до
        // setup() — событие не уйдёт, и лист останется таким, каким был.
        drop.addEventListener('photo:ready', function(ev){
          var source = ev.detail && ev.detail.source;
          if (source !== 'пример' && source !== 'ваше') return;
          st.photo = source;
          document.getElementById('samplenote').style.display = source === 'пример' ? '' : 'none';
          currentSwatch(); paintSheet();
        });
      }

      paintSheet();
    })();
  })();

  /* ═══════════════ ЧАТ С ДИЗАЙНЕРОМ ═══════════════
     Правда о канале: разговор продолжается в Telegram @anastaishaKL, текст
     посетителя показан черновиком и открывает t.me с подставленным текстом —
     ничего не «отправляется» с сайта, ни слова о доставке. */
  (function(){
    var chat = document.querySelector('[data-chat]');
    var hail = document.querySelector('[data-hail]');
    if (!chat) return;

    var openers = Array.prototype.slice.call(document.querySelectorAll('[data-chat-open]'));
    var closeBtn = chat.querySelector('[data-chat-close]');
    var thread = chat.querySelector('[data-thread]');
    var field = chat.querySelector('[data-field]');
    var sendBtn = chat.querySelector('[data-send]');
    var chips = Array.prototype.slice.call(chat.querySelectorAll('[data-chip]'));
    var TG_USER = 'anastaishaKL';
    var lastFocus = null;

    function openChat(prefill){
      lastFocus = document.activeElement;
      chat.classList.add('open');
      chat.removeAttribute('hidden');
      if (prefill) field.value = prefill;
      field.focus();
    }
    function closeChat(){
      chat.classList.remove('open');
      chat.setAttribute('hidden', '');
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      else if (hail) hail.focus();
    }

    openers.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        openChat(btn.dataset.chatOpen || '');
      });
    });
    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    chat.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){ e.preventDefault(); closeChat(); }
    });

    chips.forEach(function(chip){
      chip.addEventListener('click', function(){
        field.value = chip.textContent.trim();
        field.focus();
      });
    });

    function openTelegram(){
      var text = field.value.trim();
      var draft = document.createElement('p');
      draft.className = 'msg draft';
      draft.textContent = text;
      thread.appendChild(draft);
      thread.scrollTop = thread.scrollHeight;
      var payload = text ? 'Здравствуйте! Задача: ' + text : 'Здравствуйте!';
      var url = 'https://t.me/' + TG_USER + '?text=' + encodeURIComponent(payload);
      window.open(url, '_blank', 'noopener');
    }
    if (sendBtn) sendBtn.addEventListener('click', openTelegram);
    if (field){
      field.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); openTelegram(); }
      });
      // поле растёт до трёх строк, дальше — своя прокрутка (max-height в CSS)
      field.addEventListener('input', function(){
        field.style.height = 'auto';
        field.style.height = field.scrollHeight + 'px';
      });
    }

    // Плашка «Написать дизайнеру» появляется только когда кнопка первого экрана
    // ушла из зоны видимости — постоянная плашка иначе закрывает подпись объекта.
    // Пока на экране секция «Подборная», плашка прячется и там: на 360 она легла бы
    // на кнопку «Хочу такой», на 1440 — на нижний угол липкого листа подбора
    // (design-your-live.md, «Поведение на 360»).
    if (hail){
      var cta = document.querySelector('[data-hero-cta]');
      var podbor = document.getElementById('podbor');
      if ((cta || podbor) && 'IntersectionObserver' in window){
        var ctaPast = !cta;      // если кнопки нет на странице, условие не блокирует показ
        var podborHere = false;
        function refreshHail(){ hail.classList.toggle('show', ctaPast && !podborHere); }
        if (cta){
          new IntersectionObserver(function(entries){
            entries.forEach(function(entry){ ctaPast = !entry.isIntersecting; refreshHail(); });
          }, { rootMargin: '0px' }).observe(cta);
        }
        if (podbor){
          new IntersectionObserver(function(entries){
            entries.forEach(function(entry){ podborHere = entry.isIntersecting; refreshHail(); });
          }, { rootMargin: '0px' }).observe(podbor);
        }
      } else {
        hail.classList.add('show');
      }
    }
  })();
})();
