import { expect, it } from 'vitest';
import { photoCrop } from '../src/lib/photo-crop';
it('centers portrait and landscape photos in a 4:3 crop', () => {
  expect(photoCrop(800, 1200, 1, 50, 50)).toEqual({ x: 0, y: 300, width: 800, height: 600 });
  expect(photoCrop(1600, 900, 1, 50, 50)).toEqual({ x: 200, y: 0, width: 1200, height: 900 });
});
it('keeps zoom and position within the source bounds', () => {
  expect(photoCrop(1600, 900, 2, 100, 0)).toEqual({ x: 1000, y: 0, width: 600, height: 450 });
  expect(photoCrop(1600, 900, 10, -50, 200)).toEqual(photoCrop(1600, 900, 3, 0, 100));
  expect(() => photoCrop(0, 900, 1, 50, 50)).toThrow();
});
