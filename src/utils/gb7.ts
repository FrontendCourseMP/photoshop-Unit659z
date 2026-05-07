export const decodeGB7 = (buffer: ArrayBuffer): ImageData | null => {
  const view = new DataView(buffer);

  // сигнатуры
  if (
    view.getUint8(0) !== 0x47 ||
    view.getUint8(1) !== 0x42 ||
    view.getUint8(2) !== 0x37 ||
    view.getUint8(3) !== 0x1d
  ) {
    alert("Invalid GB7 signature");
    return null;
  }

  // версия
  const version = view.getUint8(4);
  if (version !== 1) {
    alert("Unsupported GB7 version");
    return null;
  }

  // флаги и размеры
  const flags = view.getUint8(5);
  const hasMask = (flags & 0x01) !== 0; // 0й бит

  // 16 битные числа Big-Endian сетевой порядок
  const width = view.getUint16(6, false);
  const height = view.getUint16(8, false);

  //  данные пикселей начинаются с 12 байта
  const pixelData = new Uint8Array(buffer, 12, width * height);

  // объект для canvas RGBA, 4 байт на пиксель
  const imageData = new ImageData(width, height);

  for (let i = 0; i < pixelData.length; i++) {
    const byte = pixelData[i];

    // младшие 7 бит  это оттенок серого от 0 до 127
    const gray7 = byte & 0x7f;

    // 7-битное значение 0-127 в 8 битное 0-255 для canvas
    const gray8 = Math.round((gray7 * 255) / 127);

    // 7 бит если есть маска
    let alpha = 255;
    if (hasMask) {
      const isMasked = (byte & 0x80) === 0; // 0 прозрачный
      if (isMasked) alpha = 0;
    }

    // пиксель в формат RGBA
    const idx = i * 4;
    imageData.data[idx] = gray8; // R
    imageData.data[idx + 1] = gray8; // G
    imageData.data[idx + 2] = gray8; // B
    imageData.data[idx + 3] = alpha; // A
  }

  return imageData;
};

export const encodeGB7 = (imageData: ImageData): Blob => {
  const { width, height, data } = imageData;

  // 12 байт заголовок + по 1 байту на каждый пиксель
  const buffer = new ArrayBuffer(12 + width * height);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  // сигнатура GB7
  view.setUint8(0, 0x47);
  view.setUint8(1, 0x42);
  view.setUint8(2, 0x37);
  view.setUint8(3, 0x1d);

  // версия
  view.setUint8(4, 0x01);

  // флаги 0x01, всегда будет бит маски от альфа-канала
  view.setUint8(5, 0x01);

  // ширина и высота Big-Endian
  view.setUint16(6, width, false);
  view.setUint16(8, height, false);

  // зарезервированные байты
  view.setUint16(10, 0x0000, false);

  // запись пикселей
  let offset = 12;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // перевод в градации серого (стандартная формула светимости)
    const gray8 = 0.299 * r + 0.587 * g + 0.114 * b;

    //  8бит 0-255 в 7бит 0-127
    const gray7 = Math.round((gray8 * 127) / 255) & 0x7f;

    // бит маски 1 если пиксель непрозрачный альфа > 127, 0 если прозрачный
    const maskBit = a > 127 ? 1 : 0;

    // сборка старший бит маска, остальные 7 цвет
    const byte = (maskBit << 7) | gray7;
    uint8View[offset++] = byte;
  }

  return new Blob([buffer], { type: "application/octet-stream" });
};
