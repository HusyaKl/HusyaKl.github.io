'use strict';

/*
 * Точка отправки заявки на запись — единственное место, которое нужно менять,
 * когда человек ответит на вопрос про механику записи (карточка T-2, вопрос от
 * 30.08 17:36: телеграм / почта / внешний сервис с приёмом заявок).
 *
 * Сейчас channel: null — реального канала нет, поэтому форма честно говорит,
 * что это демонстрация, и никуда ничего не отправляет (молчаливый
 * onsubmit="return false" из прототипа запрещён DoD задачи).
 *
 * Когда канал появится:
 *   channel: 'telegram', telegramHandle: '@ник_студии'
 *     — кнопка откроет t.me/<ник> с уже подставленным текстом заявки.
 *   channel: 'whatsapp', whatsappPhone: '79991234567'
 *     — то же самое через wa.me.
 * Переверстывать форму для этого не нужно — меняется только объект ниже.
 */
const BOOKING_CHANNEL = {
  channel: null, // 'telegram' | 'whatsapp' | null
  telegramHandle: '',
  whatsappPhone: '',
};

function buildMessage(data) {
  const lines = [
    'Заявка на занятие, movimiento',
    `Имя: ${data.name}`,
    `Контакт: ${data.contact}`,
    `Занятие: ${data.slot}`,
  ];
  if (data.comment) lines.push(`Комментарий: ${data.comment}`);
  return lines.join('\n');
}

function channelUrl(data) {
  const text = encodeURIComponent(buildMessage(data));
  if (BOOKING_CHANNEL.channel === 'telegram' && BOOKING_CHANNEL.telegramHandle) {
    const handle = BOOKING_CHANNEL.telegramHandle.replace(/^@/, '');
    return `https://t.me/${handle}?text=${text}`;
  }
  if (BOOKING_CHANNEL.channel === 'whatsapp' && BOOKING_CHANNEL.whatsappPhone) {
    return `https://wa.me/${BOOKING_CHANNEL.whatsappPhone}?text=${text}`;
  }
  return null;
}

function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  const status = document.getElementById('form-status');

  const required = Array.from(form.querySelectorAll('[required]'));

  function fieldWrap(field) {
    return field.closest('.f');
  }

  function validate() {
    let firstInvalid = null;
    required.forEach((field) => {
      const wrap = fieldWrap(field);
      const invalid = !field.value.trim();
      if (wrap) wrap.classList.toggle('f--invalid', invalid);
      field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      if (invalid && !firstInvalid) firstInvalid = field;
    });
    return firstInvalid;
  }

  required.forEach((field) => {
    field.addEventListener('input', () => {
      const wrap = fieldWrap(field);
      if (wrap && wrap.classList.contains('f--invalid') && field.value.trim()) {
        wrap.classList.remove('f--invalid');
        field.setAttribute('aria-invalid', 'false');
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const firstInvalid = validate();
    if (firstInvalid) {
      status.textContent = 'Заполните обязательные поля: имя, контакт и время занятия.';
      firstInvalid.focus();
      return;
    }

    const data = {
      name: form.elements.name.value.trim(),
      contact: form.elements.contact.value.trim(),
      slot: form.elements.slot.value,
      comment: form.elements.comment.value.trim(),
    };

    const url = channelUrl(data);
    if (url) {
      status.textContent = 'Открываем чат — отправьте сообщение, чтобы заявка дошла до студии.';
      window.open(url, '_blank', 'noopener');
      return;
    }

    // Канал приёма заявок ещё не подключён — говорим об этом прямо, а не притворяемся,
    // что заявка ушла.
    status.textContent =
      'Это демонстрационная форма: канал приёма заявок ещё не подключён, заявка не отправлена. ' +
      'Свяжитесь по контактам в подвале страницы — они появятся, как только студия их пришлёт.';
  });
}

initBookingForm();
