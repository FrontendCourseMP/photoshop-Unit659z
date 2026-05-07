/**
 * Преобразует RGB в CIELAB.
 */
export const rgbToLab = (
  r: number,
  g: number,
  b: number,
): [number, number, number] => {
  // Нормализация RGB в диапазон [0, 1]
  let rN = r / 255;
  let gN = g / 255;
  let bN = b / 255;

  // Линеаризация RGB
  rN = rN > 0.04045 ? Math.pow((rN + 0.055) / 1.055, 2.4) : rN / 12.92;
  gN = gN > 0.04045 ? Math.pow((gN + 0.055) / 1.055, 2.4) : gN / 12.92;
  bN = bN > 0.04045 ? Math.pow((bN + 0.055) / 1.055, 2.4) : bN / 12.92;

  // Переход в XYZ (стандарт D65)
  const x = (rN * 0.4124564 + gN * 0.3575761 + bN * 0.1804375) * 100;
  const y = (rN * 0.2126729 + gN * 0.7151522 + bN * 0.072175) * 100;
  const z = (rN * 0.0193339 + gN * 0.119192 + bN * 0.9503041) * 100;

  // XYZ в Lab
  const xN = x / 95.047;
  const yN = y / 100.0;
  const zN = z / 108.883;

  const f = (t: number) =>
    t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;

  const L = 116 * f(yN) - 16;
  const a = 500 * (f(xN) - f(yN));
  const bb = 200 * (f(yN) - f(zN));

  return [
    Math.round(L * 100) / 100,
    Math.round(a * 100) / 100,
    Math.round(bb * 100) / 100,
  ];
};
