import { useLayoutEffect } from 'react';

function isInViewport(rect) {
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

// Показує «Читати далі» лише в картках, де біографія не вміщується в 3 рядки.
//
// Раніше для кожної видимої картки код по черзі писав у DOM (знімав/повертав клас)
// і одразу читав розміри (offsetHeight). Кожне таке читання після запису змушувало
// браузер синхронно перераховувати layout усієї сторінки (forced reflow), і так
// десятки разів на кожну подію scroll.
//
// Тепер: 1) не більше одного оновлення на кадр (requestAnimationFrame);
// 2) спочатку всі читання, потім усі записи; 3) обрізаний текст визначаємо без
// зміни класу: у елемента з line-clamp scrollHeight більший за clientHeight.
export function useBioClamp(containerRef, deps) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const update = () => {
      // Фаза читання
      const measured = [];
      container.querySelectorAll('.tutor-card__bio').forEach((bio) => {
        if (!isInViewport(bio.getBoundingClientRect())) return;
        measured.push([bio, bio.scrollHeight > bio.clientHeight + 1]);
      });
      // Фаза запису
      measured.forEach(([bio, hasMore]) => {
        bio.closest('.tutor-card').classList.toggle('has-more', hasMore);
      });
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, deps);
}
