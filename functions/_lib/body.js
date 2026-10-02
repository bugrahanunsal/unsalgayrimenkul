/* Yalnızca sunucuda (Cloudflare Pages Functions) çalışır.
   İstek gövdesini kesin bir boyut sınırıyla okur. Sınır, gerçekten gelen baytlar üzerinden sayılır:
   Content-Length başlığı olmayan (chunked) ya da yanlış bildiren bir istek belleğe büyük gövde dolduramaz.
   Metni döndürür; gövde `max` bayttan büyükse null döner (çağıran 413 cevabı verir). */
export async function readText(request, max) {
  if ((Number(request.headers.get('Content-Length')) || 0) > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = typeof value === 'string' ? new TextEncoder().encode(value) : value;
      size += chunk.byteLength;
      if (size > max) { reader.cancel().catch(() => {}); return null; }
      parts.push(chunk);
    }
  } catch (_) {
    return null;
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.byteLength; }
  return new TextDecoder().decode(all);
}
