import { useState, useEffect, useMemo } from "react";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdtqRFnZ5Dq0qmw966hg8dj5EjPCv2hKahtevMK6Yb4Eq_ZE0OMSEcRSE5tIvsAA/pub?gid=918785499&single=true&output=csv";

const hoy = new Date();
hoy.setHours(0,0,0,0);

function dias(f) {
  if (!f) return null;
  f = f.trim();
  let d, m, y;
  // DD/MM/YYYY
  if (f.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) { [d,m,y] = f.split("/"); }
  // M/D/YYYY (formato americano que usa Google Sheets)
  else if (f.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) { [m,d,y] = f.split("/"); }
  // YYYY-MM-DD
  else if (f.match(/^\d{4}-\d{2}-\d{2}$/)) { [y,m,d] = f.split("-"); }
  else return null;
  const fecha = new Date(Number(y), Number(m)-1, Number(d));
  fecha.setHours(0,0,0,0);
  return Math.ceil((fecha - hoy) / 86400000);
}

function parseFecha(f) {
  // Google Sheets exporta como M/D/YYYY — detectar y convertir a DD/MM/YYYY
  if (!f) return "—";
  f = f.trim();
  if (f.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = f.split("/");
    if (parts.length === 3) {
      // Si el primer número > 12, es DD/MM/YYYY; si no, asumir M/D/YYYY de Google
      const first = Number(parts[0]);
      const second = Number(parts[1]);
      if (second > 12) {
        // Es M/D/YYYY → convertir a DD/MM/YYYY
        return `${String(second).padStart(2,'0')}/${String(first).padStart(2,'0')}/${parts[2]}`;
      }
      return f;
    }
  }
  return f;
}

function diasDesdeFecha(f) {
  if (!f) return null;
  f = f.trim();
  let d, m, y;
  if (f.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = f.split("/");
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    // Google Sheets: M/D/YYYY
    if (second > 12) { m = first; d = second; y = parts[2]; }
    else { d = first; m = second; y = parts[2]; }
  } else if (f.match(/^\d{4}-\d{2}-\d{2}$/)) {
    [y,m,d] = f.split("-");
  } else return null;
  const fecha = new Date(Number(y), Number(m)-1, Number(d));
  fecha.setHours(0,0,0,0);
  return Math.ceil((fecha - hoy) / 86400000);
}

function urgencia(d) {
  if (d === null) return { color:"#64748b", bg:"#1e293b" };
  if (d < 0)     return { color:"#94a3b8", bg:"#1e293b" };
  if (d === 0)   return { color:"#f43f5e", bg:"#2d0a14" };
  if (d <= 3)    return { color:"#f43f5e", bg:"#2d0a14" };
  if (d <= 7)    return { color:"#fb923c", bg:"#2d1200" };
  if (d <= 15)   return { color:"#facc15", bg:"#2d2600" };
  return           { color:"#4ade80", bg:"#0a2d14" };
}

function Badge({ d }) {
  const u = urgencia(d);
  return (
    <span style={{ background:u.bg, color:u.color, border:`1px solid ${u.color}55`, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {d===null?"—":d<0?`${Math.abs(d)}d vencido`:d===0?"¡HOY!":`${d} días`}
    </span>
  );
}

function parseCols(line) {
  const cols = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch==='"') inQ=!inQ;
    else if (ch==="," && !inQ) { cols.push(cur.trim().replace(/^"|"$/g,"")); cur=""; }
    else cur+=ch;
  }
  cols.push(cur.trim().replace(/^"|"$/g,""));
  return cols;
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Buscar fila de encabezados (la que tiene NOMBRE)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].toUpperCase().includes("NOMBRE")) { headerIdx = i; break; }
  }

  const headers = parseCols(lines[headerIdx]).map(h => h.toUpperCase());
  const iN  = headers.findIndex(h => h.includes("NOMBRE"));
  const iC  = headers.findIndex(h => h.includes("CUENTA") && !h.includes("CUENTA2"));
  const iP  = headers.findIndex(h => h.includes("PRECIO"));
  const iF  = headers.findIndex(h => h.includes("FECHA"));
  const iNt = headers.findIndex(h => h.includes("NOTAS"));

  return lines.slice(headerIdx + 1)
    .map(line => parseCols(line))
    .filter(cols => cols[iN] && cols[iN].trim())
    .map((cols, i) => {
      const notas = (cols[iNt]||"").toUpperCase().trim();
      const cancelado = notas.startsWith("CANCELAR") || notas.startsWith("CANCELADO");
      const precio = parseFloat((cols[iP]||"0").replace(/[$,"]/g,"")) || 0;
      const fechaRaw = (cols[iF]||"").trim();
      const fechaFmt = parseFecha(fechaRaw);
      const d = cancelado ? null : diasDesdeFecha(fechaRaw);
      return { id:i, nombre:cols[iN].trim(), cuenta:(cols[iC]||"").trim(), precio, fecha:fechaFmt, d, cancelado };
    })
    .filter(c => !c.cancelado)
    .sort((a,b) => { if(a.d===null)return 1; if(b.d===null)return -1; return a.d-b.d; });
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
      const res = await fetch(SHEET_URL + "&t=" + Date.now());
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const text = await res.text();
      const datos = parseCSV(text);
      if (datos.length === 0) throw new Error("No se encontraron clientes. Verifica que la hoja tenga columnas NOMBRE, CUENTA, PRECIO, FECHA");
      setClientes(datos);
      setUltimaAct(new Date());
    } catch(e) {
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
      if (filtro==="hoy")    return ok && c.d===0;
      if (filtro==="semana") return ok && c.d!==null && c.d>=0 && c.d<=7;
      if (filtro==="mes")    return ok && c.d!==null && c.d>=0 && c.d<=30;
      return ok;
    });
  }, [clientes, buscar, filtro]);

  function notificar(c) {
    const diasTxt = c.d===0?"¡HOY!":`en ${c.d} días`;
    const txt = `Hola! Te aviso que *${c.nombre}* tiene pendiente el pago de *${c.cuenta}* por *$${c.precio}* MXN. Fecha: *${c.fecha}* (${diasTxt}).`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
    setNotif(c.id);
    setTimeout(() => setNotif(null), 3000);
  }

  const urgentes = clientes.filter(c => c.d!==null && c.d>=0 && c.d<=7).length;

  return (
    <div style={{ minHeight:"100vh", background:"#0b0f1a", fontFamily:"system-ui,sans-serif", color:"#e2e8f0", paddingBottom:40 }}>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e1b4b)", padding:"20px 16px 14px", borderBottom:"1px solid #1e2640", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:500, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#a855f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💳</div>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>Cobros del mes</div>
                {urgentes>0
                  ? <div style={{ fontSize:11, color:"#fb923c", fontWeight:600 }}>🔔 {urgentes} pago{urgentes>1?"s":""} urgente{urgentes>1?"s":""}</div>
                  : ultimaAct && <div style={{ fontSize:11, color:"#4b5563" }}>Actualizado: {ultimaAct.toLocaleTimeString("es-MX")}</div>
                }
              </div>
            </div>
            <button onClick={cargarDatos} disabled={cargando}
              style={{ background:"#1e2640", border:"1px solid #2d3548", color:"#94a3b8", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
              {cargando?"⏳":"🔄 Actualizar"}
            </button>
          </div>
          <div style={{ position:"relative", marginBottom:10 }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#64748b" }}>🔍</span>
            <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar nombre o servicio..."
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2640", border:"1px solid #2d3548", borderRadius:10, padding:"10px 12px 10px 36px", color:"#e2e8f0", fontSize:14, outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[{val:"todos",label:"Todos"},{val:"hoy",label:"🔴 Hoy"},{val:"semana",label:"🟠 7 días"},{val:"mes",label:"🟡 30 días"}].map(f=>(
              <button key={f.val} onClick={()=>setFiltro(f.val)} style={{ background:filtro===f.val?"#6366f1":"#1e2640", color:filtro===f.val?"#fff":"#94a3b8", border:`1px solid ${filtro===f.val?"#6366f1":"#2d3548"}`, borderRadius:8, padding:"6px 0", cursor:"pointer", fontSize:11, fontWeight:600, flex:1 }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:500, margin:"0 auto", padding:"14px 16px 0" }}>
        {cargando ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#4b5563" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>
            <div>Cargando datos...</div>
          </div>
        ) : error ? (
          <div style={{ background:"#1a0f00", border:"1px solid #fb923c44", borderRadius:14, padding:24, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
            <div style={{ color:"#fb923c", fontSize:13, marginBottom:16 }}>{error}</div>
            <button onClick={cargarDatos} style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"8px 24px", cursor:"pointer", fontWeight:700 }}>Reintentar</button>
          </div>
        ) : filtrados.length===0 ? (
          <div style={{ textAlign:"center", color:"#4b5563", padding:"60px 0" }}>Sin resultados</div>
        ) : filtrados.map(c => {
          const u = urgencia(c.d);
          const urgente = c.d!==null && c.d>=0 && c.d<=3;
          const yaNotif = notif===c.id;
          return (
            <div key={c.id} style={{ background:urgente?u.bg:"#111827", border:`1px solid ${urgente?u.color+"44":"#1e2640"}`, borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nombre}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                    <span style={{ background:"#1e2640", color:"#94a3b8", fontSize:11, padding:"2px 8px", borderRadius:6, fontWeight:600 }}>{c.cuenta}</span>
                    <span style={{ color:"#4ade80", fontWeight:800, fontSize:15 }}>${c.precio.toLocaleString()}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, color:"#64748b" }}>📅 {c.fecha}</span>
                    <Badge d={c.d} />
                  </div>
                </div>
                <button onClick={()=>notificar(c)} style={{ background:yaNotif?"#166534":"#16a34a", color:"#fff", border:"none", borderRadius:10, padding:"10px 14px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, minWidth:64, flexShrink:0, transition:"all .2s" }}>
                  <span style={{ fontSize:20 }}>{yaNotif?"✅":"📲"}</span>
                  <span style={{ fontSize:10, fontWeight:700 }}>{yaNotif?"Enviado":"Avisar"}</span>
                </button>
              </div>
            </div>
          );
        })}
        {!cargando && !error && (
          <div style={{ textAlign:"center", fontSize:11, color:"#374151", marginTop:16 }}>
            {filtrados.length} de {clientes.length} clientes
          </div>
        )}
      </div>
    </div>
  );
}
