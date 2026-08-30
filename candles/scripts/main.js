(function () {
  'use strict';

  // Плейсхолдеры аккаунтов — заменяются перед реальной публикацией
  // (workspace/design/candles.md, открытые вопросы; workspace/requirements/candles.md, допущение 6).
  var TG_ACCOUNT = 'vspomni_shop';
  var IG_ACCOUNT = 'vspomni_shop';

  // Свет источника на каждом присланном кадре: --lx/--ly безразмерные 0..1 (рев. 7),
  // измерены центроидом самых ярких пикселей снимка (workspace/design/candles.md, «Фотографии»
  // и «Чем проверено»). У babushka/pamyat — значения дизайнера; у трёх новых кадров (мокрый асфальт,
  // страница 216, закладка) измерены тем же методом разработчиком по присланным файлам
  // (см. board T-1, комментарий разработчика) — при желании дизайнер может скорректировать числа
  // отдельной правкой, вёрстку это не поменяет.
  // Свет у карточек БЕЗ фотографии (рев. 9.1, workspace/design/candles.md, «Свет у
  // карточек без фотографии»): пяти карточкам без снимка позиция источника назначена
  // вручную дизайнером — как позиция свечи/флакона на будущем кадре, ни одна пара не
  // повторяется. Временные числа: когда для товара придёт настоящее фото, PHOTOS
  // заменит их замеренными координатами, и эта запись для товара станет не нужна.
  var NO_PHOTO_LIGHT = {
    p2:  { lx: .68, ly: .28 }, // «Портфель» — окно класса справа сверху
    p6:  { lx: .30, ly: .24 }, // «Вишня в тазу» — полуденное солнце слева сверху
    p8:  { lx: .50, ly: .78 }, // «Второй пар» — свет снизу, от печного зева
    p9:  { lx: .72, ly: .62 }, // «Войлочная шапка» — лампа в предбаннике справа
    p10: { lx: .22, ly: .55 }  // «Ковш на голову» — боковое окошко слева
  };

  var PHOTOS = {
    'svecha-v-gostyah-u-babushki': { lx: .38, ly: .34,
      alt: 'Свеча «В гостях у бабушки» в янтарной банке среди старых фотографий, сухоцветов и кружевной салфетки, тёплый свет пламени' },
    'duhi-pamyat': { lx: .26, ly: .73,
      alt: 'Флакон духов «Память» на россыпи старых детских фотографий и кружева, мягкий боковой свет' },
    'svecha-mokryj-asfalt': { lx: .49, ly: .31,
      alt: 'Горящая свеча «Мокрый асфальт» в янтарной банке с крафтовой этикеткой на тёплом коричневом фоне' },
    'svecha-stranica-216': { lx: .54, ly: .29,
      alt: 'Горящая свеча «Страница 216» в янтарной банке рядом с сухими полевыми цветами и раскрытой старой книгой' },
    'duhi-zakladka': { lx: .46, ly: .70,
      alt: 'Флакон духов «Закладка» с крафтовым ярлыком на ленте, рядом сухие полевые цветы' }
  };

  var LINES = {
    dvor:     { name: 'Двор до темноты',        epigraph: '«Пора домой, но ещё один круг»',       photo: 'svecha-mokryj-asfalt' },
    kniga:    { name: 'Дочитать под одеялом',    epigraph: '«Фонарик садится, осталось три главы»', photo: 'svecha-stranica-216' },
    babushka: { name: 'Босиком по траве',        epigraph: '«Дом стоит закрытый с прошлого лета»',  photo: 'svecha-v-gostyah-u-babushki' },
    banya:    { name: 'Второй пар',              epigraph: '«Первый — гостям, второй — свой»',      photo: null }
  };
  var LINE_ORDER = ['dvor', 'kniga', 'babushka', 'banya'];

  var PRODUCTS = [
    { id: 'p1', type: 'candle', line: 'dvor', name: 'Мокрый асфальт', price: 1190,
      memory: '«Дождь кончился, а домой ещё рано»',
      notes: ['тёплый асфальт', 'пыль с качелей', 'жвачка из вкладыша'],
      photo: 'svecha-mokryj-asfalt' },
    { id: 'p2', type: 'perfume', line: 'dvor', name: 'Портфель', price: 2400,
      memory: '«Первое сентября, и всё ещё пахнет новым»',
      notes: ['кожзам', 'стружка из точилки', 'гладиолусы'],
      photo: null },
    { id: 'p3', type: 'candle', line: 'kniga', name: 'Страница 216', price: 1190,
      memory: '«Обещал себе спать, но глава короткая»',
      notes: ['библиотечная бумага', 'пыль с верхней полки', 'какао'],
      photo: 'svecha-stranica-216' },
    { id: 'p4', type: 'perfume', line: 'kniga', name: 'Закладка', price: 2400,
      memory: '«Заложил на том месте, где всё изменилось»',
      notes: ['типографская краска', 'старый переплёт', 'сухой чабрец'],
      photo: 'duhi-zakladka' },
    { id: 'p5', type: 'candle', line: 'babushka', name: 'В гостях у бабушки', price: 1190,
      memory: '«Запах детства»',
      notes: ['печёные яблоки', 'варенье из малины', 'старые книги'],
      photo: 'svecha-v-gostyah-u-babushki' },
    { id: 'p6', type: 'candle', line: 'babushka', name: 'Вишня в тазу', price: 1290,
      memory: '«Варят во дворе и дают снять пенку»',
      notes: ['горячая вишня', 'сахарная пенка', 'дым от горелки'],
      photo: null },
    { id: 'p7', type: 'perfume', line: 'babushka', name: 'Память', price: 2400,
      memory: '«Их доставали редко, из коробки из-под обуви»',
      notes: ['старые фотографии', 'сухие полевые цветы', 'книжная пыль'],
      photo: 'duhi-pamyat' },
    { id: 'p8', type: 'candle', line: 'banya', name: 'Второй пар', price: 1290,
      memory: '«Первый — гостям, второй — свой»',
      notes: ['распаренный дуб', 'горячий камень', 'липовый мёд'],
      photo: null },
    { id: 'p9', type: 'candle', line: 'banya', name: 'Войлочная шапка', price: 1290,
      memory: '«Уши горят, а выходить ещё рано»',
      notes: ['сухая шерсть', 'берёзовый лист', 'печной дым'],
      photo: null },
    { id: 'p10', type: 'candle', line: 'banya', name: 'Ковш на голову', price: 1190,
      memory: '«Между заходами, не глядя, весь сразу»',
      notes: ['мокрое дерево', 'мята из тазика', 'распаренный веник'],
      photo: null }
  ];

  var SPEC = { candle: '100% соевый воск · 200 мл', perfume: 'eau de parfum · 30 мл' };

  var TYPE_LABEL = { candle: 'Свеча', perfume: 'Духи' };
  var TYPE_ACC = { candle: 'свечу', perfume: 'духи' }; // винительный падеж для aria-label/сообщений
  var TYPE_NOM = { candle: 'свеча', perfume: 'духи' };

  var state = {
    type: 'all',
    line: 'all',
    cart: {} // { productId: qty }
  };

  // ---------- DOM ----------
  var grid = document.getElementById('product-grid');
  var counterEl = document.getElementById('counter');
  var showcaseSection = document.getElementById('vitrina');
  var showcaseTitle = document.getElementById('showcase-title');
  var showcaseEpigraph = document.getElementById('showcase-epigraph');
  var filtersReset = document.getElementById('filters-reset');
  var lineTilesEl = document.getElementById('line-tiles');

  var cartToggle = document.getElementById('cart-toggle');
  var cartCountEl = document.getElementById('cart-count');
  var cartPanel = document.getElementById('cart');
  var cartClose = document.getElementById('cart-close');
  var cartBackdrop = document.getElementById('cart-backdrop');
  var cartEmpty = document.getElementById('cart-empty');
  var cartList = document.getElementById('cart-list');
  var cartTotal = document.getElementById('cart-total');
  var cartTotalValue = document.getElementById('cart-total-value');
  var cartOrder = document.getElementById('cart-order');
  var orderTgBtn = document.getElementById('order-tg');
  var orderIgBtn = document.getElementById('order-ig');
  var cartNote = document.getElementById('cart-note');

  var DEFAULT_CART_NOTE = cartNote.textContent;

  // ---------- Утилиты ----------

  function formatPrice(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  function productById(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  // Плейсхолдер продукта: тёплое световое пятно на бумаге, а не тёмный прямоугольник —
  // тёмная плашка внутри кремовой карточки читалась дырой (рев. 6).
  function placeholderPhoto() {
    return (
      '<div class="card__ph" role="img" aria-label="Фотография появится позже">' +
        '<span>фото скоро</span>' +
      '</div>'
    );
  }

  function photoHTML(photoKey, alt, cssVarPrefix) {
    var p = PHOTOS[photoKey];
    var style = '--lx:' + p.lx + ';--ly:' + p.ly + ';';
    var cls = cssVarPrefix === 'tile' ? 'tile__shot' : 'card__shot';
    var file = 'assets/photos/' + photoKey + '-' + cssVarPrefix + '.jpg';
    return (
      '<div class="' + cls + '" style="' + style + '">' +
        '<img src="' + file + '" width="' + (cssVarPrefix === 'tile' ? 700 : 900) + '" ' +
             'height="' + (cssVarPrefix === 'tile' ? 467 : 600) + '" loading="lazy" decoding="async" ' +
             'alt="' + (alt || p.alt) + '">' +
      '</div>'
    );
  }

  function telegramLink(text) {
    return 'https://t.me/' + TG_ACCOUNT + '?text=' + encodeURIComponent(text);
  }

  function instagramProfileLink() {
    return 'https://www.instagram.com/' + IG_ACCOUNT + '/';
  }

  function openInNewTab(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
      return true;
    }
    return false;
  }

  function orderLineText(item) {
    // "свеча «В гостях у бабушки» — 1 190 ₽"
    return TYPE_NOM[item.type] + ' «' + item.name + '» — ' + formatPrice(item.price);
  }

  function buildOrderText(items) {
    var lines = items.map(orderLineText).join('; ');
    var total = items.reduce(function (sum, it) { return sum + it.price; }, 0);
    return 'Здравствуйте! Хочу заказать: ' + lines + '. Итого ' + formatPrice(total) + '.';
  }

  // ---------- Линейки (плитки, рев. 7 — вариант B: без бумаги, отпечаток на столе) ----------

  function tileHTML(lineId) {
    var line = LINES[lineId];
    var isActive = state.line === lineId;
    var photo = line.photo ? photoHTML(line.photo, line.name + ' — фотография линейки', 'tile') : placeholderTile();
    return (
      '<a href="#vitrina" class="tile" data-action="select-line" data-line="' + lineId + '"' +
        (isActive ? ' aria-current="true"' : '') + '>' +
        photo +
        '<span class="tile__name">' + line.name + '</span>' +
        '<span class="tile__ep">' + line.epigraph + '</span>' +
      '</a>'
    );
  }

  function placeholderTile() {
    return '<div class="tile__shot tile__shot--ph" role="img" aria-label="Фотография появится позже"><span>фото скоро</span></div>';
  }

  function renderLineTiles() {
    lineTilesEl.innerHTML = LINE_ORDER.map(tileHTML).join('');
  }

  // ---------- Рендер витрины ----------

  function filteredProducts() {
    return PRODUCTS.filter(function (p) {
      var typeOk = state.type === 'all' || p.type === state.type;
      var lineOk = state.line === 'all' || p.line === state.line;
      return typeOk && lineOk;
    });
  }

  function updateShowcaseHead() {
    // --bg/--tint у нас читаются CSS-правилом body[data-line=...] (весь фон и блики — общий
    // слой .glints лежит вне <section class="showcase">, поэтому атрибут обязан быть на body,
    // а не только на секции).
    if (state.line === 'all') {
      document.body.setAttribute('data-line', 'all');
      showcaseSection.setAttribute('data-line', 'all');
      showcaseTitle.textContent = 'Витрина';
      // D-Д2: «Витрина»/«Четыре линейки»/«Как заказать» — роль «заголовок секции»
      // (32/25px по шкале), а имя выбранной линейки — роль «название линейки над
      // сеткой» (40/27px); один и тот же элемент .showcase__title несёт обе роли.
      showcaseTitle.classList.remove('showcase__title--line');
      showcaseEpigraph.hidden = true;
      showcaseEpigraph.textContent = '';
    } else {
      var line = LINES[state.line];
      document.body.setAttribute('data-line', state.line);
      showcaseSection.setAttribute('data-line', state.line);
      showcaseTitle.textContent = line.name;
      showcaseTitle.classList.add('showcase__title--line');
      showcaseEpigraph.hidden = false;
      showcaseEpigraph.textContent = line.epigraph;
    }
  }

  function emptyMessage() {
    if (state.type === 'perfume' && state.line === 'banya') {
      return {
        title: 'На этой полке пусто',
        text: 'Духов в линейке «Второй пар» нет — в баню мы делаем только свечи. Посмотрите свечи этой линейки или выберите другую.'
      };
    }
    return {
      title: 'На этой полке пусто',
      text: 'Такого сочетания у нас пока нет. Снимите один из фильтров.'
    };
  }

  function notesHTML(notes) {
    return '<ul class="card__notes">' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>';
  }

  function cardHTML(p) {
    var lineName = LINES[p.line].name;
    var alt = p.photo ? PHOTOS[p.photo].alt :
      TYPE_LABEL[p.type] + ' «' + p.name + '», линейка «' + lineName + '» — фотография появится позже';
    var qty = state.cart[p.id] || 0;
    var buyLabel = qty > 0 ? 'В корзине · ' + qty : 'В корзину';
    var tgAria = 'Заказать ' + TYPE_ACC[p.type] + ' «' + p.name + '» в Telegram';
    var igAria = 'Заказать ' + TYPE_ACC[p.type] + ' «' + p.name + '» в Instagram';
    var photo = p.photo ? photoHTML(p.photo, alt, 'card') : placeholderPhoto();
    var light = p.photo ? PHOTOS[p.photo] : NO_PHOTO_LIGHT[p.id];
    var cardStyle = light ? ' style="--lx:' + light.lx + ';--ly:' + light.ly + '"' : '';

    return (
      '<article class="card" data-product-id="' + p.id + '"' + cardStyle + '>' +
        '<span class="card__tag">' + TYPE_LABEL[p.type] + '</span>' +
        '<p class="card__memory">' + p.memory + '</p>' +
        photo +
        '<h3 class="card__name">' + p.name + '</h3>' +
        notesHTML(p.notes) +
        '<p class="card__spec">' + SPEC[p.type] + '</p>' +
        '<div class="card__buy-row">' +
          '<span class="card__price">' + formatPrice(p.price) + '</span>' +
          '<button type="button" class="card__buy" data-action="add-to-cart" data-id="' + p.id + '" aria-label="Добавить «' + p.name + '» в корзину">' + buyLabel + '</button>' +
        '</div>' +
        '<div class="card__links">' +
          '<a href="' + telegramLink('Здравствуйте! Хочу заказать: ' + orderLineText(p) + '.') + '" target="_blank" rel="noopener noreferrer" aria-label="' + tgAria + '">Telegram</a>' +
          '<a href="' + instagramProfileLink() + '" target="_blank" rel="noopener noreferrer" data-action="order-ig-card" data-id="' + p.id + '" aria-label="' + igAria + '">Instagram</a>' +
        '</div>' +
      '</article>'
    );
  }

  function renderGrid() {
    var items = filteredProducts();
    counterEl.textContent = 'Показано ' + items.length + ' из ' + PRODUCTS.length;
    updateShowcaseHead();

    if (items.length === 0) {
      var msg = emptyMessage();
      grid.innerHTML =
        '<div class="empty">' +
          '<h3>' + msg.title + '</h3>' +
          '<p>' + msg.text + '</p>' +
          '<button type="button" class="btn-secondary" data-action="reset-filters" style="width:auto;">Показать всё</button>' +
        '</div>';
      return;
    }

    grid.innerHTML = items.map(cardHTML).join('');
  }

  function resetFilters() {
    state.type = 'all';
    state.line = 'all';
    document.getElementById('type-all').checked = true;
    document.getElementById('line-all').checked = true;
    renderGrid();
    renderLineTiles();
  }

  function selectLine(lineId) {
    state.line = lineId;
    document.getElementById('line-' + lineId).checked = true;
    renderGrid();
    renderLineTiles();
  }

  // ---------- Корзина ----------

  function cartCount() {
    var count = 0;
    for (var id in state.cart) count += state.cart[id];
    return count;
  }

  function cartItemsExpanded() {
    // [{id, name, type, price, qty}]
    return Object.keys(state.cart).map(function (id) {
      var p = productById(id);
      return {
        id: id, name: p.name, type: p.type, price: p.price, qty: state.cart[id]
      };
    });
  }

  function cartLinesForOrder() {
    // одна строка на единицу товара, чтобы Итого совпадало с суммой перечисленных строк
    var items = cartItemsExpanded();
    var expanded = [];
    items.forEach(function (it) {
      for (var i = 0; i < it.qty; i++) {
        expanded.push({ type: it.type, name: it.name, price: it.price });
      }
    });
    return expanded;
  }

  function updateCartUI() {
    var count = cartCount();
    // Только текст счётчика — cartToggle.textContent = '...' затёр бы дочерний
    // <span id="cart-count"> целиком уже на первом вызове (найдено при проверке в браузере).
    cartCountEl.textContent = count;

    var items = cartItemsExpanded();

    if (items.length === 0) {
      cartEmpty.hidden = false;
      cartList.hidden = true;
      cartTotal.hidden = true;
      cartOrder.hidden = true;
      cartList.innerHTML = '';
      cartNote.textContent = DEFAULT_CART_NOTE;
      return;
    }

    cartEmpty.hidden = true;
    cartList.hidden = false;
    cartTotal.hidden = false;
    cartOrder.hidden = false;
    cartNote.textContent = DEFAULT_CART_NOTE;

    cartList.innerHTML = items.map(function (it) {
      var lineTotal = it.price * it.qty;
      var qtyLabel = it.qty > 1 ? ' <span class="cart__item-qty">× ' + it.qty + '</span>' : '';
      return (
        '<li class="cart__item">' +
          '<span class="cart__item-info">' +
            '<span class="cart__item-name">' + it.name + qtyLabel + '</span>' +
            '<span class="cart__item-qty">' + formatPrice(lineTotal) + '</span>' +
          '</span>' +
          '<button type="button" class="cart__item-remove" data-action="remove-from-cart" data-id="' + it.id + '">убрать</button>' +
        '</li>'
      );
    }).join('');

    var total = items.reduce(function (sum, it) { return sum + it.price * it.qty; }, 0);
    cartTotalValue.textContent = formatPrice(total);
  }

  function addToCart(id) {
    state.cart[id] = (state.cart[id] || 0) + 1;
    updateCartUI();
    renderGrid(); // обновить подпись кнопки "В корзине · N" на карточке
  }

  function removeFromCart(id) {
    delete state.cart[id];
    updateCartUI();
    renderGrid();
  }

  // ---------- Открытие/закрытие панели корзины ----------

  function openCart() {
    cartPanel.classList.add('is-open');
    cartPanel.removeAttribute('inert');
    cartBackdrop.classList.add('is-visible');
    cartToggle.setAttribute('aria-expanded', 'true');
    cartClose.focus();
    document.addEventListener('keydown', onCartKeydown);
  }

  function closeCart() {
    cartPanel.classList.remove('is-open');
    cartPanel.setAttribute('inert', '');
    cartBackdrop.classList.remove('is-visible');
    cartToggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onCartKeydown);
    cartToggle.focus();
  }

  function onCartKeydown(e) {
    if (e.key === 'Escape') closeCart();
  }

  // ---------- Оформление заказа ----------

  function orderViaTelegram() {
    var items = cartLinesForOrder();
    if (items.length === 0) return;
    openInNewTab(telegramLink(buildOrderText(items)));
  }

  function orderViaInstagram() {
    var items = cartLinesForOrder();
    if (items.length === 0) return;
    // Instagram не поддерживает предзаполнение текста сообщения через обычную ссылку —
    // копируем текст заказа в буфер обмена и открываем профиль, куда его нужно вставить.
    var copied = copyToClipboard(buildOrderText(items));
    cartNote.textContent = copied
      ? 'Список заказа скопирован — вставьте его в сообщение. Instagram не умеет подставлять текст сам.'
      : DEFAULT_CART_NOTE;
    openInNewTab(instagramProfileLink());
  }

  // ---------- События ----------

  document.getElementById('type-filter').addEventListener('change', function (e) {
    if (e.target.name === 'type-filter') {
      state.type = e.target.value;
      renderGrid();
    }
  });

  document.getElementById('line-filter').addEventListener('change', function (e) {
    if (e.target.name === 'line-filter') {
      state.line = e.target.value;
      renderGrid();
      renderLineTiles();
    }
  });

  filtersReset.addEventListener('click', resetFilters);

  lineTilesEl.addEventListener('click', function (e) {
    var tile = e.target.closest('[data-action="select-line"]');
    if (tile) {
      e.preventDefault();
      selectLine(tile.getAttribute('data-line'));
    }
  });

  grid.addEventListener('click', function (e) {
    var addBtn = e.target.closest('[data-action="add-to-cart"]');
    if (addBtn) {
      addToCart(addBtn.getAttribute('data-id'));
      return;
    }
    var igLink = e.target.closest('[data-action="order-ig-card"]');
    if (igLink) {
      // одиночный товар с карточки: копируем текст заказа, ссылка на профиль откроется штатно
      var p = productById(igLink.getAttribute('data-id'));
      if (p) copyToClipboard('Здравствуйте! Хочу заказать: ' + orderLineText(p) + '.');
      return; // переход по href происходит стандартно
    }
    var resetBtn = e.target.closest('[data-action="reset-filters"]');
    if (resetBtn) {
      resetFilters();
    }
  });

  cartList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action="remove-from-cart"]');
    if (btn) removeFromCart(btn.getAttribute('data-id'));
  });

  cartToggle.addEventListener('click', function () {
    if (cartPanel.classList.contains('is-open')) closeCart();
    else openCart();
  });
  cartClose.addEventListener('click', closeCart);
  cartBackdrop.addEventListener('click', closeCart);

  orderTgBtn.addEventListener('click', orderViaTelegram);
  orderIgBtn.addEventListener('click', orderViaInstagram);

  // ---------- Инициализация ----------

  document.body.setAttribute('data-line', 'all');
  renderLineTiles();
  renderGrid();
  updateCartUI();
})();
