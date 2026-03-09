export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");

  const urls = [
    // API de OneDrive shares — más confiable
    "https://api.onedrive.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL3gvYy83ZmZhOTJmZGZhZWI0NmIxL0lRQVByYXFfVFNZMFFiUjF0ZWNzLU9KdUFXLWF5ZXJpX2c5bUtJdlNmd0hZUWhjP2U9MGRQZlg3/root/content",
    // URL descarga directa
    "https://onedrive.live.com/download?resid=7FFA92FDFAEB46B1%21BFAAAD0F264D4134B475B5E72CF8E26E&authkey=%21A0dPfX7&em=2",
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
        redirect: "follow",
      });
      if (!r.ok) continue;
      const buf   = await r.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Verificar magic bytes PK = es un XLSX válido
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) continue;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(Buffer.from(buf));
    } catch { continue; }
  }

  res.status(403).json({ error: "No se pudo descargar el archivo. Verifica que OneDrive esté compartido como público." });
}
