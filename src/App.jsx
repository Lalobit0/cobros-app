import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

function diasRestantes(fecha) {
  if (!fecha) return null;
  let d;
  if (fecha instanceof Date)          d = new Date(fecha);
  else if (typeof fecha === "number") d = new Date((fecha - 25569) * 86400000);
  else if (typeof fecha === "string") {
    const p = fecha.split("/");
    if (p.length === 3) d = new Date(p[2], p[1] - 1, p[0]);
    else return null;
  } else return null;
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - hoy) / 86400000);
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  let d;
  if (fecha instanceof Date)          d = fecha;
  else if (typeof fecha === "number") d = new Date((fecha - 25569) * 86400000);
  else return String(fecha);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
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

export default function App() {
  const [clientes,  setClientes]  = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);
  const [buscar,    setBuscar]    = useState("");
  const [filtro,    setFiltro]    = useState("todos");
  const [notif,     setNotif]     = useState(null);
  const [ultimaAct, setUltimaAct] = useState(null);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      // Llama al API de Vercel que descarga el Excel sin problemas de CORS
      const res = await fetch("/api/excel");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const buffer = await res.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });

      const hojaNombre = wb.SheetNames.find(n => n.includes("CLIENTES"));
      if (!hojaNombre) throw new Error("No se encontró la hoja CLIENTES");

      const ws    = wb.Sheets[hojaNombre];
      const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const hdrs  = filas[1] || [];

      const idx = (kw, excl) => hdrs.findIndex(h => {
        const s = String(h).toUpperCase();
        return s.includes(kw) && (!excl || !s.includes(excl));
      });

      const iNombre = idx("NOMBRE");
      const iCuenta = idx("CUENTA", "CUENTA2");
      const iPrecio = idx("PRECIO");
      const iCol2   = idx("COLUMNA2");
      const iNotas  = idx("NOTAS");

      const datos = filas.slice(2)
        .filter(f => f[iNombre] && String(f[iNombre]).trim())
        .map((f, i) => {
          const notas     = String(f[iNotas] || "").toUpperCase().trim();
          const cancelado = notas.startsWith("CANCELAR") || notas.startsWith("CANCELADO");
          const fecha     = f[iCol2] || null;
          const d         = cancelado ? null : diasRestantes(fecha);
          return { id: i, nombre: String(f[iNombre]).trim(), cuenta: String(f[iCuenta] || "").trim(), precio: Number(f[iPrecio]) || 0, fechaFmt: formatFecha(fecha), d, cancelado };
        })
        .filter(c => !c.cancelado)
        .sort((a, b) => { if (a.d === null) return 1; if (b.d === null) return -1; return a.d - b.d; });

      setClientes(datos);
      setUltimaAct(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarDatos(); }, []);

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return clientes.filter(c => {
      const ok = !q || c.nombre.toLowerCase().includes(q) || c.cuenta.toLowerCase().includes(q);
      if (filtro === "hoy")    return ok && c.d === 0;
      if (filtro === "semana") return ok && c.d !== null && c.d >= 0 && c.d <= 7;
      if (filtro === "mes")    return ok && c.d !== null && c.d >= 0 && c.d <= 30;
      return ok;
    });
  }, [clientes, buscar, filtro]);

  function notificar(c) {
    const diasTxt = c.d === 0 ? "¡HOY!" : `en ${c.d} días`;
    const txt = `Hola! Te aviso que *${c.nombre}* tiene pendiente el pago de *${c.cuenta}* por *$${c.precio}* MXN. Fecha: *${c.fechaFmt}* (${diasTxt}).`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
    setNotif(c.id);
    setTimeout(() => setNotif(null), 3000);
  }

  const urgentes = clientes.filter(c => c.d !== null && c.d >= 0 && c.d <= 7).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0", paddingBottom: 40 }}>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", padding: "20px 16px 14px", borderBottom: "1px solid #1e2640", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💳</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Cobros del mes</div>
                {urgentes > 0
                  ? <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 600 }}>🔔 {urgentes} pago{urgentes > 1 ? "s" : ""} urgente{urgentes > 1 ? "s" : ""}</div>
                  : ultimaAct && <div style={{ fontSize: 11, color: "#4b5563" }}>Actualizado: {ultimaAct.toLocaleTimeString("es-MX")}</div>
                }
              </div>
            </div>
            <button onClick={cargarDatos} disabled={cargando}
              style={{ background: "#1e2640", border: "1px solid #2d3548", color: "#94a3b8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {cargando ? "⏳" : "🔄 Actualizar"}
            </button>
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

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "14px 16px 0" }}>
        {cargando ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#4b5563" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div>Cargando datos desde Excel...</div>
          </div>
        ) : error ? (
          <div style={{ background: "#1a0f00", border: "1px solid #fb923c44", borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div style={{ color: "#fb923c", fontSize: 13, marginBottom: 16 }}>{error}</div>
            <button onClick={cargarDatos} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 24px", cursor: "pointer", fontWeight: 700 }}>Reintentar</button>
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", color: "#4b5563", padding: "60px 0" }}>Sin resultados</div>
        ) : filtrados.map(c => {
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>📅 {c.fechaFmt}</span>
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
        {!cargando && !error && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#374151", marginTop: 16 }}>
            {filtrados.length} de {clientes.length} clientes activos
          </div>
        )}
      </div>
    </div>
  );
}
