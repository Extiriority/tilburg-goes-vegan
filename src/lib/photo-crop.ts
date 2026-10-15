export function photoCrop(width: number, height: number, zoom: number, x: number, y: number) {
  if (![width, height, zoom, x, y].every(Number.isFinite) || width <= 0 || height <= 0)
    throw new Error('Invalid crop');
  const w = Math.min(width, (height * 4) / 3) / Math.min(3, Math.max(1, zoom)),
    h = (w * 3) / 4;
  return {
    x: ((width - w) * Math.min(100, Math.max(0, x))) / 100,
    y: ((height - h) * Math.min(100, Math.max(0, y))) / 100,
    width: w,
    height: h,
  };
}
