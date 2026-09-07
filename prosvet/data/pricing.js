'use strict';

/*
 * Единственный источник прайса и формулы сметы (DoD задачи T-4: «прайс и формула расчёта
 * лежат в одном файле данных, значения на экране совпадают с этим файлом»).
 *
 * Цены — ДОПУЩЕНИЕ, не факт о ценах компании «Просвет»: человек ответил (карточка T-4,
 * 12:04), что смета считается по демонстрационным коэффициентам, реального прайса нет.
 * Модель и числа — workspace/design/prosvet-requirements.md, раздел «Модель сметы».
 * Диапазоны размеров и раскладка створок — тот же документ, «Параметры конструктора»,
 * закреплены решением роли designer C в workspace/design/prosvet.md («РЕШЕНИЯ РОЛИ»).
 */
window.PROSVET_PRICING = (function () {
  var RANGES = {
    width: { min: 400, max: 3000, def: 2000 },
    height: { min: 400, max: 2500, def: 1400 },
    sashCount: { options: [1, 2, 3], def: 2 }
  };

  // Порядок позиций сверху вниз — тот же, что в спецификации на странице.
  var PROFILE_PRICE_PER_M = { 3: 900, 5: 1300, 7: 1800 }; // ₽/пог.м, по числу камер
  var GLASS_PRICE_PER_M2 = { single: 3500, double: 4800, energy: 6200 }; // ₽/м²
  var FITTINGS_PRICE_PER_SASH = { turn: 2200, tilt: 1800, po: 2900 }; // ₽/створку, deaf = 0
  var MONTAGE_PRICE_PER_M2 = 1200; // ₽/м²
  var DELIVERY_PRICE = 1500; // ₽/заказ, фиксированная

  var PROFILE_LABEL = { 3: '3-камерный', 5: '5-камерный', 7: '7-камерный' };
  var GLASS_LABEL = { single: 'Однокамерный', double: 'Двухкамерный', energy: 'Энергосберегающий' };
  var SASH_LABEL = { deaf: 'Глухая', turn: 'Поворотная', tilt: 'Откидная', po: 'Поворотно-откидная' };

  // Дефолтная раскладка типов открывания: крайние створки открываются, средняя — глухая.
  // Для N=1 и N=2 берётся тот же массив срезом — совпадает с допущением analyst.
  var SASH_DEFAULT = ['po', 'deaf', 'po'];

  function round(v) {
    return Math.round(v); // «до ближайшего целого», 0.5 — вверх (Math.round так и делает)
  }

  /**
   * params = { width, height, sashCount, sashTypes: ['po','deaf',...], profile, glass }
   * Возвращает разбивку по позициям — числа для спецификации на экране берутся отсюда,
   * а не считаются повторно в разметке.
   */
  function computeEstimate(params) {
    var wm = params.width / 1000;
    var hm = params.height / 1000;
    var n = params.sashCount;
    var types = params.sashTypes.slice(0, n);

    var perimeterM = 2 * (wm + hm);
    var impostsM = (n - 1) * hm;
    var profileLengthM = perimeterM + impostsM;
    var profileSum = round(profileLengthM * PROFILE_PRICE_PER_M[params.profile]);

    var areaM2 = wm * hm;
    var glassSum = round(areaM2 * GLASS_PRICE_PER_M2[params.glass]);

    var fittingsCount = 0;
    var fittingsRaw = 0;
    types.forEach(function (t) {
      if (t === 'deaf') return;
      fittingsRaw += FITTINGS_PRICE_PER_SASH[t];
      fittingsCount += 1;
    });
    var fittingsSum = round(fittingsRaw);

    var montageSum = round(areaM2 * MONTAGE_PRICE_PER_M2);
    var deliverySum = DELIVERY_PRICE;

    // Итог — сумма уже округлённых позиций (не отдельное округление общей суммы):
    // так «сумма позиций сходится с итогом до рубля» гарантировано построением.
    var total = profileSum + glassSum + fittingsSum + montageSum + deliverySum;

    return {
      profile: { qty: profileLengthM, rate: PROFILE_PRICE_PER_M[params.profile], sum: profileSum },
      glass: { qty: areaM2, rate: GLASS_PRICE_PER_M2[params.glass], sum: glassSum },
      fittings: { count: fittingsCount, sum: fittingsSum },
      montage: { qty: areaM2, rate: MONTAGE_PRICE_PER_M2, sum: montageSum },
      delivery: { sum: deliverySum },
      total: total
    };
  }

  return {
    RANGES: RANGES,
    PROFILE_PRICE_PER_M: PROFILE_PRICE_PER_M,
    GLASS_PRICE_PER_M2: GLASS_PRICE_PER_M2,
    FITTINGS_PRICE_PER_SASH: FITTINGS_PRICE_PER_SASH,
    MONTAGE_PRICE_PER_M2: MONTAGE_PRICE_PER_M2,
    DELIVERY_PRICE: DELIVERY_PRICE,
    PROFILE_LABEL: PROFILE_LABEL,
    GLASS_LABEL: GLASS_LABEL,
    SASH_LABEL: SASH_LABEL,
    SASH_DEFAULT: SASH_DEFAULT,
    computeEstimate: computeEstimate
  };
})();
