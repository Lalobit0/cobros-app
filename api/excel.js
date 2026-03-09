export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // URLs a intentar en orden
  const urls = [
    "https://onedrive.live.com/download?resid=7FFA92FDFAEB46B1%21BFAAAD0F264D4134B475B5E72CF8E26E&authkey=%21AbyuFkL&em=2",
    "https://onedrive.live.com/download?resid=7FFA92FDFAEB46B1%21BFAAAD0F264D4134B475B5E72CF8E26E&authkey=%21AbyuFkL&download=1",
    "https://api.onedrive.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL3gvYy83ZmZhOTJmZGZhZWI0NmIxL0lRQVByYXFfVFNZMFFiUjF0ZWNzLU9KdUFYXzk4ei1QUmZrNzJ0eUdZSld4My13P2U9Ynl1RmtM/root/content",
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "*/*",
        },
        redirect: "follow",
      });

      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      const bytes  = new Uint8Array(buffer);

      // Verificar magic bytes PK (XLSX es un ZIP)
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) continue;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
      return res.send(Buffer.from(buffer));
    } catch { continue; }
  }

  res.status(403).json({ error: "No se pudo descargar el archivo de OneDrive. Verifica que el archivo esté compartido como público." });
}
