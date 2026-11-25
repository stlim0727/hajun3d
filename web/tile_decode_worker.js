// Off-main-thread PNG -> RGBA decode for Terrarium elevation tiles.
// Failures are posted back so tile_engine.js can fall back to main-thread decode.
self.onmessage = async (event) => {
  const message = event && event.data;
  const id = message && message.id;
  try {
    if (!message || !message.blob) throw new Error('missing tile blob');
    const bitmap = await createImageBitmap(message.blob);
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    if (typeof bitmap.close === 'function') bitmap.close();
    const rgba = ctx.getImageData(0, 0, 256, 256).data;
    self.postMessage({ id, data: rgba.buffer }, [rgba.buffer]);
  } catch (error) {
    self.postMessage({ id, error: String((error && error.message) || error) });
  }
};
