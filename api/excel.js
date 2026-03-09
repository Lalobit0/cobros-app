export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const url = "https://onedrive.live.com/download?resid=7FFA92FDFAEB46B1%21BFAAAD0F264D4134B475B5E72CF8E26E&authkey=%21AbyuFkL&em=2";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(502).json({ error: `OneDrive error: ${response.status}` });
    }

    const buffer = await response.arrayBuffer();
    const bytes  = new Uint8Array(buffer);

    // Verificar magic bytes PK (ZIP/XLSX)
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      return res.status(502).json({ error: "El archivo no es un XLSX válido" });
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate"); // cache 5 min
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
