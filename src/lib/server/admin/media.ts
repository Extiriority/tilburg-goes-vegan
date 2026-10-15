import { AdminError } from './service';

export function webpDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 30 ||
    bytes.length > 2000000 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' ||
    String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP'
  )
    throw new AdminError('Upload optimized WebP images only');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== bytes.length - 8) throw new AdminError('Invalid image');
  let width = 0,
    height = 0;
  for (let p = 12; p + 8 <= bytes.length;) {
    const kind = String.fromCharCode(...bytes.slice(p, p + 4)),
      size = view.getUint32(p + 4, true),
      d = p + 8;
    if (d + size > bytes.length) throw new AdminError('Invalid image');
    if (kind === 'VP8X' && size >= 10) {
      width = 1 + bytes[d + 4] + (bytes[d + 5] << 8) + (bytes[d + 6] << 16);
      height = 1 + bytes[d + 7] + (bytes[d + 8] << 8) + (bytes[d + 9] << 16);
      break;
    }
    if (
      kind === 'VP8 ' &&
      size >= 10 &&
      bytes[d + 3] === 0x9d &&
      bytes[d + 4] === 1 &&
      bytes[d + 5] === 0x2a
    ) {
      width = view.getUint16(d + 6, true) & 0x3fff;
      height = view.getUint16(d + 8, true) & 0x3fff;
      break;
    }
    if (kind === 'VP8L' && size >= 5 && bytes[d] === 0x2f) {
      const bits = view.getUint32(d + 1, true);
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >>> 14) & 0x3fff);
      break;
    }
    p = d + size + (size % 2);
  }
  if (width < 1 || height < 1 || width > 1600 || height > 1600)
    throw new AdminError('Image dimensions exceed 1600 pixels');
  return { width, height };
}

export async function uploadRecipePhotos(
  db: D1Database,
  bucket: R2Bucket,
  recipeId: string,
  version: number,
  files: File[],
  thumbnails: File[],
  now = Date.now(),
) {
  if (files.length !== 1 || thumbnails.length !== 1)
    throw new AdminError('Select one photo and wait for conversion');
  const photos = [];
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > 2000000 || thumbnails[i].size > 2000000)
      throw new AdminError('Converted image too large');
    const bytes = new Uint8Array(await files[i].arrayBuffer()),
      thumb = new Uint8Array(await thumbnails[i].arrayBuffer());
    const dimensions = webpDimensions(bytes),
      small = webpDimensions(thumb);
    if (small.width > 640 || small.height > 640)
      throw new AdminError('Thumbnail exceeds 640 pixels');
    const id = crypto.randomUUID();
    photos.push({
      id,
      key: `recipes/${id}/full.webp`,
      thumbKey: `recipes/${id}/thumb.webp`,
      bytes,
      thumb,
      ...dimensions,
    });
  }
  try {
    for (const photo of photos) {
      await bucket.put(photo.key, photo.bytes, { httpMetadata: { contentType: 'image/webp' } });
      await bucket.put(photo.thumbKey, photo.thumb, {
        httpMetadata: { contentType: 'image/webp' },
      });
    }
    await db.batch([
      db
        .prepare('UPDATE recipes SET version=version+1 WHERE id=? AND version=?')
        .bind(recipeId, version),
      db
        .prepare('INSERT INTO admin_write_receipts VALUES (?,changes(),?)')
        .bind(crypto.randomUUID(), now),
      db.prepare('DELETE FROM recipe_media WHERE recipe_id=?').bind(recipeId),
      db.prepare('DELETE FROM dish_media WHERE dish_id=?').bind(`recipe:${recipeId}`),
      ...photos.flatMap((p) => [
        db
          .prepare(
            "INSERT INTO media_assets (id,r2_key,mime_type,width,height,alt_text,created_at) SELECT ?,?,'image/webp',?,?,title||' — photo '||CAST(? AS INTEGER),? FROM recipes WHERE id=?",
          )
          .bind(p.id, p.key, p.width, p.height, 1, now, recipeId),
        db
          .prepare(
            'INSERT INTO recipe_media (recipe_id,media_id,position,is_cover) VALUES (?,?,?,?)',
          )
          .bind(
            recipeId,
            p.id,
            0,
            1,
          ),
        db
          .prepare('INSERT INTO dish_media (dish_id,media_id,position,is_cover) VALUES (?,?,?,?)')
          .bind(
            `recipe:${recipeId}`,
            p.id,
            0,
            1,
          ),
      ]),
    ]);
  } catch {
    for (const p of photos) await bucket.delete([p.key, p.thumbKey]);
    throw new AdminError('Photos could not be saved. Reload before trying again.');
  }
  return cleanupUnusedRecipeMedia(db, bucket);
}

/** Keep metadata if object deletion fails, so a later operation can retry cleanup. */
export async function cleanupUnusedRecipeMedia(db: D1Database, bucket: R2Bucket) {
  const unused = await db.prepare(`SELECT id,r2_key FROM media_assets m WHERE r2_key LIKE 'recipes/%/full.webp'
    AND NOT EXISTS(SELECT 1 FROM recipe_media WHERE media_id=m.id)
    AND NOT EXISTS(SELECT 1 FROM dish_media WHERE media_id=m.id)`).all<{id:string;r2_key:string}>();
  let pendingCleanup = 0;
  for (const photo of unused.results) {
    try {
      await bucket.delete([photo.r2_key, photo.r2_key.replace(/full\.webp$/, 'thumb.webp')]);
      await db.prepare(`DELETE FROM media_assets WHERE id=? AND NOT EXISTS(SELECT 1 FROM recipe_media WHERE media_id=media_assets.id) AND NOT EXISTS(SELECT 1 FROM dish_media WHERE media_id=media_assets.id)`).bind(photo.id).run();
    } catch { pendingCleanup++; }
  }
  return { pendingCleanup };
}
export async function deleteRecipePhoto(db: D1Database, bucket: R2Bucket, recipeId: string, version: number, now=Date.now()) {
  await db.batch([
    db.prepare('UPDATE recipes SET version=version+1 WHERE id=? AND version=?').bind(recipeId,version),
    db.prepare('INSERT INTO admin_write_receipts VALUES (?,changes(),?)').bind(crypto.randomUUID(),now),
    db.prepare('DELETE FROM recipe_media WHERE recipe_id=?').bind(recipeId),
    db.prepare('DELETE FROM dish_media WHERE dish_id=?').bind(`recipe:${recipeId}`),
  ]);
  return cleanupUnusedRecipeMedia(db,bucket);
}
export async function describeRecipePhoto(db:D1Database,recipeId:string,version:number,mediaId:string,alt:string,now=Date.now()) {
  if (!alt.trim() || alt.length>500) throw new AdminError('Check the photo description');
  await db.batch([
    db.prepare('UPDATE recipes SET version=version+1 WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM recipe_media WHERE recipe_id=recipes.id AND media_id=?)').bind(recipeId,version,mediaId),
    db.prepare('INSERT INTO admin_write_receipts VALUES (?,changes(),?)').bind(crypto.randomUUID(),now),
    db.prepare('UPDATE media_assets SET alt_text=? WHERE id=?').bind(alt.trim(),mediaId),
  ]);
}
