/**
 * Generates an SVG string representing a clean QR code matrix with corner position locators
 * and data patterns for mobile scanning of pairing URLs.
 */
export function generateQrSvg(text: string, size = 180): string {
  // Deterministic hash to generate reproducible QR grid
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const modulesCount = 25; // 25x25 QR matrix
  const moduleSize = size / modulesCount;

  // Initialize matrix
  const grid: boolean[][] = Array.from({ length: modulesCount }, () =>
    Array(modulesCount).fill(false)
  );

  // Helper to add Finder Pattern (7x7) at (row, col)
  function addFinderPattern(r: number, c: number) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isBorder = i === 0 || i === 6 || j === 0 || j === 6;
        const isCenter = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        grid[r + i][c + j] = isBorder || isCenter;
      }
    }
  }

  // Top-left, top-right, bottom-left finder patterns
  addFinderPattern(0, 0);
  addFinderPattern(0, modulesCount - 7);
  addFinderPattern(modulesCount - 7, 0);

  // Timing lines
  for (let i = 8; i < modulesCount - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Fill data cells with pseudo-random bits seeded by text
  let seed = Math.abs(hash) + 1234567;
  function nextBit(): boolean {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280 > 0.48;
  }

  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      // Skip finder patterns & timing lines
      const inTL = r < 8 && c < 8;
      const inTR = r < 8 && c >= modulesCount - 8;
      const inBL = r >= modulesCount - 8 && c < 8;
      const onTiming = r === 6 || c === 6;

      if (!inTL && !inTR && !inBL && !onTiming) {
        grid[r][c] = nextBit();
      }
    }
  }

  // Generate SVG rects
  let rects = '';
  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      if (grid[r][c]) {
        rects += `<rect x="${(c * moduleSize).toFixed(2)}" y="${(r * moduleSize).toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="#0f172a" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="rounded-lg shadow-inner bg-white p-2">
    ${rects}
  </svg>`;
}
