import { useState, useMemo } from "react";

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

function dias(fechaStr) {
  if (!fechaStr) return null;
  const [d, m, y] = fechaStr.split("/");
  const f = new Date(y, m - 1, d);
  f.setHours(0, 0, 0, 0);
  return Math.ceil((f - hoy) / 86400000);
}

function urgencia(d) {
  if (d === null) return { color: "#64748b", bg: "#1e293b" };
  if (d < 0)     return { color: "#94a3b8", bg: "#1e293b" };
  if (d === 0)   return { color: "#f43f5e", bg: "#2d0a14" };
  if (d <= 3)    return { color: "#f43f5e", bg: "#2d0a14" };
  if (d <= 7)    return { color: "#fb923c", bg: "#2d1200" };
  if (d <= 15)   return { color: "#facc15", bg: "#2d2600" };
  return           { color: "#4ade80", bg: "#0a2d14" };
}

function Badge({ d }) {
  const u = urgencia(d);
  return (
    <span style={{ background: u.bg, color: u.color, border: `1px solid ${u.color}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {d === null ? "—" : d < 0 ? `${Math.abs(d)}d vencido` : d === 0 ? "¡HOY!" : `${d} días`}
    </span>
  );
}

const RAW = [
  ["Jonathan","Youtube",100,"15/04/2026"],
  ["Jonathan","Spotify",75,"15/04/2026"],
  ["Jonathan","Spotify",75,"15/04/2026"],
  ["Angel","Star plus",55,"15/04/2026"],
  ["Angel","Prime",55,"15/04/2026"],
  ["Angel","Max",55,"15/04/2026"],
  ["Angel","Paramount",45,"15/04/2026"],
  ["Angel","Disney",55,"15/04/2026"],
  ["Angel","Netflix",130,"15/04/2026"],
  ["Javier","Star plus",75,"19/04/2026"],
  ["Fernando","Max",69,"03/05/2026"],
  ["rolivand","Spotify",75,"28/02/2026"],
  ["LL 664 857 5010","Spotify",99,"07/05/2026"],
  ["LL 664 857 5010","Youtube",100,"07/05/2026"],
  ["LL 664 857 5010","Spotify",99,"07/05/2026"],
  ["LL 664 857 5010","Spotify",99,"07/05/2026"],
  ["6621569631","Spotify",90,"17/03/2026"],
  ["615 109 1722","Spotify",95,"12/03/2026"],
  ["CRIS 6618504503","Youtube",110,"15/03/2026"],
  ["CRIS 6618504503","MAX",99,"15/03/2026"],
  ["CRIS 6618504503","Netflix 4K",89,"15/03/2026"],
  ["6646168328","Youtube",90,"19/03/2026"],
  ["878 154 6864","APPLE ONE",120,"25/03/2026"],
  ["6643356810","YouTube",110,"12/03/2026"],
  ["662 140 8658","Spotify 3",249,"12/04/2026"],
  ["662 140 8658","Netflix 4K",89,"17/03/2026"],
  ["662 140 8658","Netflix 4K",89,"14/03/2026"],
  ["6461503994","Spotify 3",229,"03/04/2026"],
  ["6461503994","Spotify 3",229,"03/04/2026"],
  ["6631276064","OFFICE",650,"22/04/2026"],
  ["6647617077","Disney",65,"26/03/2026"],
  ["311 204 7606","Youtube",100,"19/03/2026"],
  ["664 711 3942","Youtube 3M",100,"17/03/2026"],
  ["222 812 1580","Youtube 3M",250,"09/05/2026"],
  ["442 839 0475","Disney 4K1",330,"14/03/2026"],
  ["56 2834 4120","Youtube 1A",490,"29/05/2026"],
  ["664 151 3389","Netflix extra",155,"20/03/2026"],
  ["664 437 6845","Spotify 3",229,"11/04/2026"],
  ["664 437 6845","Spotify 3",229,"11/04/2026"],
  ["664 437 6845","MAX 4K",99,"31/03/2026"],
  ["619 418 6074","Youtube 3M",259,"11/04/2026"],
  ["+52 775 145 0807","YouTube",119,"18/04/2026"],
  ["246 156 6816","Disney 4K1",119,"01/03/2026"],
  ["dreiker","Spotify 14",750,"01/02/2027"],
  ["656 532 6086","Spotify",99,"11/03/2026"],
  ["668 249 6450","MAX 4K",99,"16/03/2026"],
  ["228 274 1919","Netflix",89,"19/03/2026"],
  ["664 218 6034","Disney 4K1",119,"15/03/2026"],
  ["664 854 9104","Netflix",85,"13/03/2026"],
  ["SEBASTIAN","OFFICE 12 M",1068,"15/11/2026"],
  ["IGNACIO","OFFICE 12 M",650,"23/04/2026"],
  ["RICARDO","OFFICE",89,"27/03/2026"],
  ["IRIS","OFFICE",89,"23/03/2026"],
  ["862 109 1334","Netflix 4K",89,"21/03/2026"],
  ["664 254 1381","OFFICE",89,"06/04/2026"],
  ["81 8653 7013","MAX 4K",99,"02/04/2026"],
  ["442 839 0475","Paramount",69,"07/04/2026"],
  ["664 755 4365","Paramount",69,"07/04/2026"],
  ["661 1963305","Spotify 3",229,"08/04/2026"],
];

const CLIENTES = RAW
  .map(([nombre, cuenta, precio, fecha], i) => ({ id: i, nombre, cuenta, precio, fecha, d: dias(fecha) }))
  .sort((a, b) => { if (a.d === null) return 1; if (b.d === null) return -1; return a.d - b.d; });

export default function App() {
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [notif,  setNotif]  = useState(null);

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return CLIENTES.filter(c => {
      const ok = !q || c.nombre.toLowerCase().includes(q) || c.cuenta.toLowerCase().includes(q);
      if (filtro === "hoy")    return ok && c.d === 0;
      if (filtro === "semana") return ok && c.d !== null && c.d >= 0 && c.d <= 7;
      if (filtro === "mes")    return ok && c.d !== null && c.d >= 0 && c.d <= 30;
      return ok;
    });
  }, [buscar, filtro]);

  function notificar(c) {
    const diasTxt = c.d === 0 ? "¡HOY!" : `en ${c.d} días`;
    const txt = `Hola! Te aviso que *${c.nombre}* tiene pendiente el pago de *${c.cuenta}* por *$${c.precio}* MXN. Fecha: *${c.fecha}* (${diasTxt}).`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
    setNotif(c.id);
    setTimeout(() => setNotif(null), 3000);
  }

  const urgentes = CLIENTES.filter(c => c.d !== null && c.d >= 0 && c.d <= 7).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", padding: "20px 16px 14px", borderBottom: "1px solid #1e2640", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💳</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Cobros del mes</div>
              {urgentes > 0
                ? <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 600 }}>🔔 {urgentes} pago{urgentes > 1 ? "s" : ""} urgente{urgentes > 1 ? "s" : ""}</div>
                : <div style={{ fontSize: 11, color: "#4b5563" }}>{CLIENTES.length} clientes activos</div>
              }
            </div>
          </div>

          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar nombre o servicio..."
              style={{ width: "100%", boxSizing: "border-box", background: "#1e2640", border: "1px solid #2d3548", borderRadius: 10, padding: "10px 12px 10px 36px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {[{ val: "todos", label: "Todos" }, { val: "hoy", label: "🔴 Hoy" }, { val: "semana", label: "🟠 7 días" }, { val: "mes", label: "🟡 30 días" }].map(f => (
              <button key={f.val} onClick={() => setFiltro(f.val)} style={{ background: filtro === f.val ? "#6366f1" : "#1e2640", color: filtro === f.val ? "#fff" : "#94a3b8", border: `1px solid ${filtro === f.val ? "#6366f1" : "#2d3548"}`, borderRadius: 8, padding: "6px 0", cursor: "pointer", fontSize: 11, fontWeight: 600, flex: 1 }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "14px 16px 0" }}>
        {filtrados.length === 0
          ? <div style={{ textAlign: "center", color: "#4b5563", padding: "60px 0", fontSize: 14 }}>Sin resultados</div>
          : filtrados.map(c => {
            const u = urgencia(c.d);
            const urgente = c.d !== null && c.d >= 0 && c.d <= 3;
            const yaNotif = notif === c.id;
            return (
              <div key={c.id} style={{ background: urgente ? u.bg : "#111827", border: `1px solid ${urgente ? u.color + "44" : "#1e2640"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ background: "#1e2640", color: "#94a3b8", fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{c.cuenta}</span>
                      <span style={{ color: "#4ade80", fontWeight: 800, fontSize: 15 }}>${c.precio.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>📅 {c.fecha}</span>
                      <Badge d={c.d} />
                    </div>
                  </div>
                  <button onClick={() => notificar(c)} style={{ background: yaNotif ? "#166534" : "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 64, flexShrink: 0, transition: "all .2s" }}>
                    <span style={{ fontSize: 20 }}>{yaNotif ? "✅" : "📲"}</span>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{yaNotif ? "Enviado" : "Avisar"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        <div style={{ textAlign: "center", fontSize: 11, color: "#374151", marginTop: 16 }}>
          {filtrados.length} de {CLIENTES.length} clientes activos
        </div>
      </div>
    </div>
  );
}
