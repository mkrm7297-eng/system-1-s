/**
 * Standard Code 128 (Subset B) Barcode Generator
 * Used for apparel SKU barcodes and thermal sticker printing.
 * Meets requirements of Unit A: "باركود Code 128 مستقل لكل متغير"
 */

// Code 128 character patterns: widths of 3 bars and 3 spaces (or 4 bars for stop)
// Each digit represents width of alternating bar and space
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

const START_CODE_B = 104;
const STOP_CODE = 106;

export interface BarcodeRenderOptions {
  width?: number; // module width in px
  height?: number; // bar height in px
  includeText?: boolean;
  fontSize?: number;
  textColor?: string;
  barColor?: string;
  backgroundColor?: string;
}

export function encodeCode128B(text: string): { modules: boolean[]; checksum: number; valid: boolean } {
  // ASCII subset B covers 32 to 126
  const cleanText = text.trim();
  if (!cleanText) {
    return { modules: [], checksum: 0, valid: false };
  }

  const values: number[] = [START_CODE_B];
  let checkSumSum = START_CODE_B;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    // ASCII 32 (' ') to 126 ('~') maps to 0 to 94 in Code 128
    let val = charCode - 32;
    if (val < 0 || val > 94) {
      val = 0; // fallback to space
    }
    values.push(val);
    checkSumSum += val * (i + 1);
  }

  const checksum = checkSumSum % 103;
  values.push(checksum);
  values.push(STOP_CODE);

  // Convert pattern strings to boolean modules
  const modules: boolean[] = [];

  // Quiet zone at start (10 modules)
  for (let i = 0; i < 10; i++) modules.push(false);

  for (const val of values) {
    const pattern = CODE128_PATTERNS[val];
    if (!pattern) continue;

    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Quiet zone at end (10 modules)
  for (let i = 0; i < 10; i++) modules.push(false);

  return { modules, checksum, valid: true };
}

/**
 * Returns an SVG string or React-compatible data for Code 128
 */
export function generateCode128SvgData(text: string, options: BarcodeRenderOptions = {}) {
  const {
    width = 1.6,
    height = 50,
    includeText = true,
    fontSize = 11,
    textColor = '#0f172a',
    barColor = '#000000',
    backgroundColor = '#ffffff'
  } = options;

  const { modules, valid } = encodeCode128B(text);
  if (!valid || modules.length === 0) {
    return null;
  }

  const totalWidth = modules.length * width;
  const totalHeight = includeText ? height + fontSize + 10 : height + 8;

  // Build rects
  const rects: { x: number; width: number }[] = [];
  let currentStart = -1;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      if (currentStart === -1) currentStart = i;
    } else {
      if (currentStart !== -1) {
        rects.push({
          x: currentStart * width,
          width: (i - currentStart) * width
        });
        currentStart = -1;
      }
    }
  }

  if (currentStart !== -1) {
    rects.push({
      x: currentStart * width,
      width: (modules.length - currentStart) * width
    });
  }

  return {
    totalWidth,
    totalHeight,
    rects,
    text,
    height,
    fontSize,
    textColor,
    barColor,
    backgroundColor
  };
}
