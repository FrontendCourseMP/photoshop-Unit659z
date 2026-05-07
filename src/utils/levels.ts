export interface ChannelLevels {
  black: number;
  white: number;
  gamma: number;
}

export interface LevelsConfig {
  master: ChannelLevels;
  r: ChannelLevels;
  g: ChannelLevels;
  b: ChannelLevels;
  a: ChannelLevels;
}

export const defaultChannelLevels = (): ChannelLevels => ({
  black: 0,
  white: 255,
  gamma: 1.0,
});

export const defaultLevelsConfig = (): LevelsConfig => ({
  master: defaultChannelLevels(),
  r: defaultChannelLevels(),
  g: defaultChannelLevels(),
  b: defaultChannelLevels(),
  a: defaultChannelLevels(),
});

// Генерация LUT (Look-Up Table) для одного канала
const buildLUT = (levels: ChannelLevels): Uint8Array => {
  const lut = new Uint8Array(256);
  const { black, white, gamma } = levels;

  for (let i = 0; i < 256; i++) {
    if (i <= black) {
      lut[i] = 0;
    } else if (i >= white) {
      lut[i] = 255;
    } else {
      const normalized = (i - black) / (white - black);
      // Степень 1/gamma дает правильный изгиб: 
      // gamma > 1 осветляет средние тона, gamma < 1 затемняет
      lut[i] = Math.min(255, Math.max(0, Math.round(Math.pow(normalized, 1 / gamma) * 255)));
    }
  }
  return lut;
};

// Применение уровней к изображению с использованием LUT
export const applyLevels = (imgData: ImageData, config: LevelsConfig): ImageData => {
  const { width, height, data } = imgData;
  const newData = new ImageData(new Uint8ClampedArray(data), width, height);

  const lutMaster = buildLUT(config.master);
  const lutR = buildLUT(config.r);
  const lutG = buildLUT(config.g);
  const lutB = buildLUT(config.b);
  const lutA = buildLUT(config.a);

  for (let i = 0; i < newData.data.length; i += 4) {
    // поканальные изменения, затем изменения Master
    newData.data[i] = lutMaster[lutR[data[i]]];         // R
    newData.data[i + 1] = lutMaster[lutG[data[i + 1]]]; // G
    newData.data[i + 2] = lutMaster[lutB[data[i + 2]]]; // B
    newData.data[i + 3] = lutA[data[i + 3]];            // A (Master не влияет на Alpha)
  }

  return newData;
};

// Расчет гистограммы 
export const calculateHistogram = (imgData: ImageData, channel: keyof LevelsConfig): number[] => {
  const bins = new Array(256).fill(0);
  const { data } = imgData;

  for (let i = 0; i < data.length; i += 4) {
    let value = 0;
    switch (channel) {
      case "r": value = data[i]; break;
      case "g": value = data[i + 1]; break;
      case "b": value = data[i + 2]; break;
      case "a": value = data[i + 3]; break;
      case "master":
        // Стандартная формула Luminance
        value = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        break;
    }
    bins[value]++;
  }

  return bins;
};