// Фото у даних мають шлях до оригінального PNG (/photos/tutor-01.png).
// Повертаємо атрибути для зменшених WebP-версій, згенерованих scripts/optimize-images.mjs.
export function photoSources(photo) {
  const base = photo.replace(/\.png$/, '');
  return {
    src: `${base}-400.webp`,
    srcSet: `${base}-400.webp 400w, ${base}-800.webp 800w`,
  };
}
