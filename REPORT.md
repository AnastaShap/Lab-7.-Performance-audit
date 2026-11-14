# Лабораторна робота №7. Аудит продуктивності

Репозиторій: https://github.com/AnastaShap/Lab-7.-Performance-audit
Застосунок: «Каталог репетиторів» (React 18 + Vite), ~2000 репетиторів.

## Підсумок

| № | Проблема | Сценарій | Метрика | До | Після | Коміт |
|---|---|---|---|---|---|---|
| 1 | Повторне обчислення рейтингу під час сортування | S2 | Виклики `tutorScore` за одне сортування (regression-тест) | 38 552 | ≤ 2 000 (0 при повторному сортуванні) | [`0124221`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/0124221) |
| 1 | те саме | S2 | Self time `weightedRating`, мс | 1 700| 0 | [`0124221`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/0124221) |
| 2 | Зсуви макета через зображення без розмірів | S1 | CLS | 0,188 | 0 | [`d443b09`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/d443b09) |
| 3 | Важкі зображення затримують LCP | S1 | LCP, с | 27,2 | 9,6 | [`fbb32cf`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/fbb32cf) |
| 3 | те саме | S1 | Total byte weight, KiB | 22 482 | 78 | [`fbb32cf`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/fbb32cf) |
| 4 | Forced reflow під час скролу | S3 | Layout, Self time, мс | 10 752 | 1 104 | [`c972418`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/c972418) |
| 4 | те саме | S3 | Rendering у Summary, мс | 16 117 | 4 310 | [`c972418`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/c972418) |

## 1. Умови вимірювання

| Параметр | Значення |
|---|---|
| Машина | Intel Core 13(CPU), 16ГБ RAM, Windows 10 |
| Браузер | Google Chrome 157.0.8103.78 |
| Режим | інкогніто, без розширень, інші вкладки закриті |
| Збірка | `npm run build`, потім `npm run preview` (http://localhost:4173) |
| Розмір вікна | 610 × 725 (Responsive), однаковий для всіх замірів |
| S1 (завантаження) | Lighthouse 13.5.0, Navigation, Mobile (Moto G Power), **DevTools throttling** (Simulated throttling вимкнено): Slow 4G + CPU 4× |
| S2, S3 (взаємодія, скрол) | Performance: CPU 4× slowdown, мережа без обмежень |
| Кількість запусків | 3, у таблицях медіана |

Чому DevTools throttling, а не Simulated: з Simulated CLS на базовій лінії дорівнював 0, бо з `localhost` зображення приходять ще до першого малювання, і зсув не проявляється. З реальним сповільненням мережі CLS = 0,188.

Базова лінія знята на коміті `ce958e8`: це початковий код викладача (`ec127d3`) з однією зміною, `build.sourcemap: true`, щоб у трейсах були справжні імена функцій. На швидкість виконання це не впливає.

## 2. Сценарії

| ID | Сценарій | Як відтворити | Метрики |
|---|---|---|---|
| S1 | Завантаження сторінки | DevTools → Lighthouse → Analyze page load | LCP, CLS, TBT, Total byte weight |
| S2 | Введення в пошук | `F5`, клік у поле пошуку, Performance → Record, надрукувати `матем`, Stop | найдовша взаємодія (INP) на доріжці Interactions, сума long tasks |
| S3 | Скрол списку | Performance → Record, у Console запустити скрипт нижче, Stop | Layout (Self time у Bottom-up), Rendering у Summary |

Скрипт для S3 (однаковий скрол у кожному запуску):

```js
(async () => {
  for (let i = 0; i < 60; i++) {
    window.scrollBy(0, 100);
    await new Promise((r) => requestAnimationFrame(r));
  }
})();
```

## 3. Базова лінія (коміт `ce958e8`)

| Сценарій | Метрика | Запуск 1 | Запуск 2 | Запуск 3 | Медіана |
|---|---|---|---|---|---|
| S1 | LCP, с | 27,2 | 27,2 | 27,2 | 27,2 |
| S1 | CLS | 0,188 | 0,188 | 0,188 | 0,188 |
| S1 | TBT, мс | 3 180 | 3 100 | 2 390 | 3 100 |
| S1 | Total byte weight, KiB | 22 482 | 22 482 | 22 482 | 22 482 |
| S2 | Найдовша взаємодія (INP), мс | 4 037 | 5 549 | 4 145 | 4 145 |
| S2 | Сума long tasks, мс | 4 137 | 4 973,3 | ___ | ___ |
| S3 | Layout, Self time, мс | 10 752 | 10 170 | 11 196 | 10 752 |
| S3 | Rendering у Summary, мс | 16 117 | 13 568 | 16 679 | 16 117 |

S3 до виправлень знято на списку після пошуку `матем` (340 карток), без `F5` перед скролом. Усі «після» заміри S3 зроблено в тому самому стані.

## 4. Виправлення

### 4.1. Повторне обчислення рейтингу під час сортування
- **Сценарій:** S2 (введення `матем` у пошук).

| Метрика | Запуск 1 | Запуск 2 | Запуск 3 | Медіана | До (медіана) | Зміна |
|---|---|---|---|---|---|---|
| Найдовша взаємодія (INP), мс | 3 784 | 2 874 | 2 636 | 2 874 | 4 145 | −30,7 % |
| Виклики `tutorScore` за одне сортування (regression-тест) | | | | ≤ 2 000 | 38 552 | −94,8 % |
| Self time `weightedRating` (Bottom-up, весь запис), мс | 0 | 0 | 0 | 0 | ≈ 1 700 | −100 % |

*Спостереження.** Затримка INP складається з input delay 9 мс, processing duration 2,78 с і presentation delay 89 мс (запуск `#7`), тобто майже весь час займає виконання обробників. Після виправлення в Bottom-up нагорі вже не `weightedRating`, а `formatPrice`, `Layout` і `normalizeText`.

**Висновок.** Сортування «Рекомендовані» рахувало рейтинг ~38,5 тис. разів на кожну літеру; тепер не більше одного разу на репетитора, а за повторного сортування жодного разу (тест: 38 552 → ≤ 2 000). weightedRating займав ___ мс і зник із профілю, медіана INP з 4 145 до 2 874 мс. INP сильно залежить від швидкості друку й навантаження ПК, тому основний доказ це зникнення `tutorScore` з Bottom-up і час у `getVisibleTutors`. Решту INP займає відмальовка карток і `formatPrice`.

- **Причина:** Компаратор сортування «Рекомендовані» викликав `tutorScore` для обох елементів на кожне порівняння, тож замість 2000 разів функція виконувалась ~38,5 тис. разів, і кожен виклик ще й парсив дати відгуків. Сортування виконувалось на кожну введену літеру, бо результат не кешувався.
- **Що змінено:** у `src/utils/catalog.js` рейтинг кожного репетитора обчислюється один раз і зберігається в кеші (`WeakMap`), компаратор порівнює готові числа.

### 4.2. Зсуви макета через зображення без розмірів

- **Коміт:** [`d443b09`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/d443b09)
- **Сценарій:** S1.

| Метрика | Запуск 1 | Запуск 2 | Запуск 3 | Медіана | До (медіана) | Зміна |
|---|---|---|---|---|---|---|
| CLS | 0 | 0 | 0 | 0 | 0,188 | −100 % |

- **Причина:** У <img> не було width і height, тому до завантаження браузер резервував для картинки 0 px, а коли вона приходила, виштовхувала вміст нижче (CLS 0,188). З цими атрибутами браузер одразу знає співвідношення сторін і залишає місце заздалегідь.
- **Що змінено:** атрибути `width` і `height` у банера (`Header.jsx`) та фото в картках (`TutorCard.jsx`), тож браузер резервує місце за співвідношенням сторін ще до завантаження зображення.
- **Доказ:** `report/02-cls-before.png`, `report/02-cls-after.png` (Lighthouse: CLS і «Avoid large layout shifts»).

### 4.3. Важкі зображення затримують LCP

- **Коміт:** [`fbb32cf`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/fbb32cf)
- **Сценарій:** S1.

| Метрика | Запуск 1 | Запуск 2 | Запуск 3 | Медіана | До (медіана) | Зміна |
|---|---|---|---|---|---|---|
| LCP, с | 9,7 | 9,5 | 9,6 | 9,6 | 27,2 | −65 % |
| Total byte weight, KiB | 78 | 78 | 78 | 78 | 22 482 | −99,7 % |

LCP після виправлення впирається в рендер 2000 карток: FCP (≈ 9,4 с) майже дорівнює LCP, тобто банер більше не чекає мережі. Total byte weight для `fbb32cf` взято з ___ (Network, transferred / Lighthouse), для бази з Lighthouse.

- **Причина:** Фото карток (PNG ~600 КБ при ширині ~300 px) і банер на 1,3 МБ вантажились одразу всі (22 МБ) і забирали канал одне в одного, тож банер як LCP-елемент приходив пізно. Менші WebP з lazy скоротили трафік до 78 KiB, і LCP перестав залежати від мережі.
- **Що змінено:** WebP потрібних розмірів (генеруються `npm run images`, скрипт `scripts/optimize-images.mjs`), `srcset` і `sizes`, `loading="lazy"` для фото в картках, `fetchpriority="high"` для банера. Оригінальні PNG перенесено в `assets-src/`.
- **Доказ:** `report/03-lcp-before.png`, `report/03-lcp-after.png` (Lighthouse: LCP, «Largest Contentful Paint element», «Avoid enormous network payloads»).

### 4.4. Forced reflow під час скролу

- **Коміт:** [`c972418`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/c972418)
- **Сценарій:** S3.

| Метрика | Запуск 1 | Запуск 2 | Запуск 3 | Медіана | До (медіана) | Зміна |
|---|---|---|---|---|---|---|
| Layout, Self time (Bottom-up), мс | 1 104,4 | 1 207,2 | 979,6 | 1 104,4 | 10 752 | −89,7 % |
| Rendering у Summary, мс | 4 310 | 4 425 | 3 960 | 4 310 | 16 117 | −73,3 % |

До виправлення весь Layout був forced reflow із `useBioClamp`. Після нього залишився переважно Layout, який викликає скрипт скролу (`window.scrollBy`, рядок `VM…` у Bottom-up), тому метрику названо «Layout, Self time».

- **Причина:** На кожну подію scroll хук для кожної картки по черзі змінював клас і читав offsetHeight, а таке читання після запису змушує браузер негайно перерахувати layout усієї сторінки (~104 тис. об'єктів), по 2–3 рази на подію. Тепер читання й записи розділені, клас не змінюється, а оновлення відбувається раз на кадр.
- **Що змінено:** у `src/hooks/useBioClamp.js` спершу виконуються всі читання розмірів, потім усі записи класів; обрізаність тексту визначається через `scrollHeight > clientHeight` без тимчасової зміни класу; оновлення відбувається не частіше разу на кадр (`requestAnimationFrame`). Кнопка «Читати далі» з'являється в тих самих картках, що й раніше.
- **Доказ:** `report/04-scroll-before.png`, `report/04-scroll-after.png`; трейси `report/04-scroll-before.json`, `report/04-scroll-after.json`.

## 5. Regression-тест

Файл: `src/__tests__/recommendedSort.test.js`. Тест перевіряє, скільки разів викликається дорога функція `tutorScore` під час сортування «Рекомендовані», і що порядок сортування правильний.

- Коміт [`4e7d5f5`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/4e7d5f5) (тест додано, код ще не виправлено): 2 тести падають, `expected 38552 to be less than or equal to 2000`. Скріншот: `report/test-fails-before.png`.
- Коміт [`0124221`](https://github.com/AnastaShap/Lab-7.-Performance-audit/commit/0124221) (після виправлення) і далі: усі тести проходять. Скріншот: `report/test-passes-after.png`.

## 6. Перевірено й свідомо не змінено

Усі заміри з трейсу S2 «до» (`report/01-search-before.json`), вкладка Bottom-up, весь запис, якщо не вказано інше.

| Місце | Чому виглядає повільним | Замір | Висновок |
|---|---|---|---|
| `buildSubjectOptions`, `slugify` | ланцюжок map/filter/sort/reduce, багато regex | ___ мс | ___ |
| `suggestNames`, `editDistance` | алгоритм O(n·m) з матрицею | ___ мс (пошук `qqqq`) | ___ |
| `useReferenceData` | три послідовні `await` | ___ мс (трейс завантаження) | ___ |
| `averageRating` у картці | обчислення під час рендеру | ___ мс | ___ |
| `applyFilters` | фільтрація на кожен рендер | ___ мс | ___ |
| JS-бандл | можна було б дробити (code splitting) | ___ КБ gzip (`npm run build`) | ___ |
| `generateTutors` | довга задача при завантаженні | ___ мс (трейс завантаження) | ___ |

## 7. Файли в `report/`

| Файл | Що показує |
|---|---|
| `01-search-before/after.png`, `.json` | S2: трейс введення в пошук |
| `02-cls-before/after.png` | S1: CLS у Lighthouse |
| `03-lcp-before/after.png` | S1: LCP і обсяг даних |
| `04-scroll-before/after.png`, `.json` | S3: трейс скролу |
| `test-fails-before.png`, `test-passes-after.png` | regression-тест до і після виправлення |
