import { useState, useEffect, useMemo } from "react";

// ─── CONFIG ───────────────────────────────────────────────
const SHEET_CSV  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2zZwes2sBIGWHuBxBG56_7QpKC-bzp7fe7qphlGzD2roQkUyYvn12CIG1fdrAt-Q0GbPtdUwnZdJR/pub?gid=918785499&single=true&output=csv";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzOTSUtzWW8eiK3k7CDC58i3twKMj29KgO35mtdlUB-IDSMw3G_1EiJQWkxS4jHkgMAZA/exec";

const USUARIOS = {
  Admin:    { pass: "Karina.25",  rol: "admin" },
  Angelica: { pass: "Damian123",  rol: "ayudante" },
};

const VINCULADAS_LISTA = ["SIX","Lalobit","ed.perma out","EDGAR.PERMA","ARES","Laloshop","edd.perma gmail"];
const SERVICIOS_LISTA  = ["Netflix","Netflix extra","Netflix genérico","HBO HD","HBO 4K","HBO PLATINO","Disney 4K","Disney HD","PRIME","Paramount","VIX","Crunchyroll","Spotify","Spotify 3","ChatGPT gen","ChatGPT+","Office","Office3","Office12","Canva1","Canva12","APPLE ONE","Apple TV","Youtubep1","Youtubep3","ARES1","ARES2","ARES12","IPTVLAT1","IPTVLAT3"];

// ─── UTILIDADES ───────────────────────────────────────────
const hoy = new Date(); hoy.setHours(0,0,0,0);

function diasDesdeFecha(f) {
  if (!f) return null;
  f = f.trim();
  let d,m,y;
  if (f.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const p = f.split("/");
    if (Number(p[1])>12){m=p[0];d=p[1];y=p[2];}else{d=p[0];m=p[1];y=p[2];}
  } else if (f.match(/^\d{4}-\d{2}-\d{2}$/)){[y,m,d]=f.split("-");}
  else return null;
  const fecha=new Date(Number(y),Number(m)-1,Number(d));fecha.setHours(0,0,0,0);
  return Math.ceil((fecha-hoy)/86400000);
}

function parseFecha(f) {
  if (!f) return "—"; f=f.trim();
  if (f.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)){
    const p=f.split("/");
    if(Number(p[1])>12)return`${String(p[1]).padStart(2,'0')}/${String(p[0]).padStart(2,'0')}/${p[2]}`;
    return f;
  }
  return f;
}

function sumarMeses(fechaStr,meses){
  const [d,m,y]=fechaStr.split("/").map(Number);
  const b=new Date(y,m-1,d);b.setMonth(b.getMonth()+meses);
  return`${String(b.getDate()).padStart(2,'0')}/${String(b.getMonth()+1).padStart(2,'0')}/${b.getFullYear()}`;
}

function fechaHoyStr(){
  return`${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;
}

function urgencia(d){
  if(d===null)return{color:"#64748b",bg:"#1e293b"};
  if(d<0)return{color:"#94a3b8",bg:"#1e293b"};
  if(d===0)return{color:"#f43f5e",bg:"#2d0a14"};
  if(d<=3)return{color:"#f43f5e",bg:"#2d0a14"};
  if(d<=7)return{color:"#fb923c",bg:"#2d1200"};
  if(d<=15)return{color:"#facc15",bg:"#2d2600"};
  return{color:"#4ade80",bg:"#0a2d14"};
}

function Badge({d}){
  const u=urgencia(d);
  return<span style={{background:u.bg,color:u.color,border:`1px solid ${u.color}55`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>
    {d===null?"—":d<0?`${Math.abs(d)}d vencido`:d===0?"¡HOY!":`${d} días`}
  </span>;
}

function parseCols(line){
  const cols=[];let cur="",inQ=false;
  for(const ch of line){if(ch==='"')inQ=!inQ;else if(ch===","&&!inQ){cols.push(cur.trim().replace(/^"|"$/g,""));cur="";}else cur+=ch;}
  cols.push(cur.trim().replace(/^"|"$/g,""));return cols;
}

function parseCSV(text){
  const lines=text.trim().split("\n");
  if(lines.length<2)return{rows:[]};
  let headerIdx=0;
  for(let i=0;i<Math.min(5,lines.length);i++){if(lines[i].toUpperCase().includes("NOMBRE")){headerIdx=i;break;}}
  const headers=parseCols(lines[headerIdx]).map(h=>h.toUpperCase());
  const iN=headers.findIndex(h=>h.includes("NOMBRE"));
  const iC=headers.findIndex(h=>h.includes("CUENTA")&&!h.includes("CUENTA2"));
  const iP=headers.findIndex(h=>h.includes("PRECIO"));
  const iF=headers.findIndex(h=>h.includes("FECHA"));
  const iNt=headers.findIndex(h=>h.includes("NOTAS"));
  const iT=headers.findIndex(h=>h.includes("TEL")||h.includes("WHATSAPP")||h.includes("TELEFONO"));
  const iV=headers.findIndex(h=>h.includes("VINCULADA")||h.includes("ACTUALIZA"));
  const iAv=headers.findIndex(h=>h.includes("AVISO"));
  const iCob=headers.findIndex(h=>h.includes("COBRADO"));
  const mesActual=hoy.getMonth();
  const mesesNombres=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  const iMesActual=headers.findIndex(h=>h===mesesNombres[mesActual]);

  const rows=lines.slice(headerIdx+1)
    .map((line,idx)=>({cols:parseCols(line),rowNum:headerIdx+2+idx}))
    .filter(({cols})=>cols[iN]&&cols[iN].trim())
    .map(({cols,rowNum})=>{
      const notas=(cols[iNt]||"").toUpperCase().trim();
      const cancelado=notas.startsWith("CANCELAR")||notas.startsWith("CANCELADO");
      const precio=parseFloat((cols[iP]||"0").replace(/[$,"]/g,""))||0;
      const fechaRaw=(cols[iF]||"").trim();
      const d=cancelado?null:diasDesdeFecha(fechaRaw);
      const cobrado=iCob>=0?(cols[iCob]||"").trim():"";
      const pagoMesActual=iMesActual>=0?(cols[iMesActual]||"").trim().toUpperCase()==="Y":false;
      return{
        rowNum,nombre:cols[iN].trim(),cuenta:(cols[iC]||"").trim(),
        precio,fecha:parseFecha(fechaRaw),fechaRaw,d,
        notas:(cols[iNt]||"").trim(),
        tel:iT>=0?(cols[iT]||"").trim():"",
        vinculada:iV>=0?(cols[iV]||"").trim():"",
        aviso:iAv>=0?(cols[iAv]||"").trim():"",
        cobrado,pagoMesActual,
        colFecha:iF,colCobrado:iCob,cancelado,
      };
    }).filter(c=>!c.cancelado);
  return{rows};
}

function agruparClientes(lista){
  const mapa=new Map();
  for(const c of lista){
    if(!mapa.has(c.nombre))mapa.set(c.nombre,{nombre:c.nombre,tel:c.tel,servicios:[]});
    mapa.get(c.nombre).servicios.push(c);
  }
  return Array.from(mapa.values()).map(cl=>{
    const validos=cl.servicios.filter(s=>s.d!==null);
    const dMin=validos.length>0?Math.min(...validos.map(s=>s.d)):null;
    const total=cl.servicios.reduce((s,x)=>s+x.precio,0);
    const notas=[...new Set(cl.servicios.map(s=>s.notas).filter(Boolean))];
    const porFecha=new Map();
    for(const s of cl.servicios){
      const key=s.fecha||"—";
      if(!porFecha.has(key))porFecha.set(key,{fecha:s.fecha,d:s.d,servicios:[]});
      porFecha.get(key).servicios.push(s);
    }
    const grupos=Array.from(porFecha.values()).sort((a,b)=>{if(a.d===null)return 1;if(b.d===null)return-1;return a.d-b.d;});
    const todosCobrados=cl.servicios.every(s=>s.cobrado);
    const algunCobrado=cl.servicios.some(s=>s.cobrado);
    return{nombre:cl.nombre,tel:cl.tel,servicios:cl.servicios,grupos,dMin,total,notas,todosCobrados,algunCobrado};
  }).sort((a,b)=>{if(a.dMin===null)return 1;if(b.dMin===null)return-1;return a.dMin-b.dMin;});
}

// ─── APPS SCRIPT ─────────────────────────────────────────
async function scriptPost(payload){
  const res=await fetch(SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(payload)});
  if(!res.ok)throw new Error(`Script error ${res.status}`);
  const json=await res.json();
  if(!json.ok)throw new Error(json.error||"Error en script");
  return json;
}
async function agregarFila(d){await scriptPost({action:"append",nombre:d.nombre,vinculada:d.vinculada||"",cuenta:d.cuenta,precio:d.precio,fecha:d.fecha,notas:d.notas,tel:d.tel});}
async function renovarServicioSheet(rowNum,nuevaFecha,notas){await scriptPost({action:"renovar",row:rowNum,fecha:nuevaFecha,notas:notas||""});}
async function eliminarFila(rowNum){await scriptPost({action:"delete",row:rowNum});}
async function cancelarServicioSheet(rowNum){await scriptPost({action:"cancelar",row:rowNum});}
async function marcarCobradoSheet(rowNum,colCobrado,fecha){await scriptPost({action:"cobrado",row:rowNum,col:colCobrado,fecha});}

// ─── MODAL CONFIRMAR ──────────────────────────────────────
function ModalConfirmar({mensaje,detalle,onConfirmar,onCancelar,colorBtn="#ef4444",textoBtn="Confirmar"}){
  return<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"#111827",border:"1px solid #1e2640",borderRadius:16,padding:24,width:"100%",maxWidth:340,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
      <div style={{fontWeight:800,fontSize:16,marginBottom:8}}>{mensaje}</div>
      {detalle&&<div style={{fontSize:13,color:"#64748b",marginBottom:20,whiteSpace:"pre-line"}}>{detalle}</div>}
      <div style={{display:"flex",gap:10}}>
        <button onClick={onCancelar} style={{flex:1,background:"#1e2640",border:"1px solid #2d3548",color:"#94a3b8",borderRadius:10,padding:"11px",fontWeight:700,cursor:"pointer",fontSize:14}}>Cancelar</button>
        <button onClick={onConfirmar} style={{flex:1,background:colorBtn,border:"none",color:"#fff",borderRadius:10,padding:"11px",fontWeight:700,cursor:"pointer",fontSize:14}}>{textoBtn}</button>
      </div>
    </div>
  </div>;
}

// ─── MODAL RENOVAR ────────────────────────────────────────
function ModalRenovar({servicio,nombreCliente,onRenovar,onCerrar}){
  const fechaBase=servicio.fecha&&servicio.fecha!=="—"?servicio.fecha:fechaHoyStr();
  const opciones=[{label:"+ 1 mes",fecha:sumarMeses(fechaBase,1)},{label:"+ 3 meses",fecha:sumarMeses(fechaBase,3)},{label:"+ 6 meses",fecha:sumarMeses(fechaBase,6)},{label:"+ 1 año",fecha:sumarMeses(fechaBase,12)}];
  const [sel,setSel]=useState(opciones[0].fecha);
  const [manual,setManual]=useState(false);
  const [fechaM,setFechaM]=useState("");
  const [notas,setNotas]=useState("");
  const [guardando,setGuardando]=useState(false);
  const [guardado,setGuardado]=useState(false);
  const [error,setError]=useState("");
  const fechaFinal=manual?fechaM:sel;

  async function renovar(){
    if(!fechaFinal||!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaFinal))return setError("Fecha debe ser DD/MM/AAAA");
    setGuardando(true);setError("");
    try{await renovarServicioSheet(servicio.rowNum,fechaFinal,notas);setGuardado(true);setTimeout(()=>{onRenovar();onCerrar();},800);}
    catch(e){setError("Error al actualizar. Intenta de nuevo.");setGuardando(false);}
  }

  return<div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:150,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div style={{background:"#111827",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontWeight:800,fontSize:16}}>🔄 Renovar</div><div style={{fontSize:12,color:"#64748b"}}>{nombreCliente} · {servicio.cuenta}</div></div>
        <button onClick={onCerrar} style={{background:"#1e2640",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 10px",cursor:"pointer"}}>✕</button>
      </div>
      <div style={{fontSize:11,color:"#64748b",marginBottom:8,fontWeight:600}}>FECHA ACTUAL: {servicio.fecha}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {opciones.map(o=>(
          <button key={o.label} onClick={()=>{setSel(o.fecha);setManual(false);}}
            style={{background:!manual&&sel===o.fecha?"#6366f1":"#1e2640",color:!manual&&sel===o.fecha?"#fff":"#94a3b8",border:`1px solid ${!manual&&sel===o.fecha?"#6366f1":"#2d3548"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:700,fontSize:13}}>{o.label}</div>
            <div style={{fontSize:11,color:!manual&&sel===o.fecha?"#c4b5fd":"#4b5563",marginTop:2}}>📅 {o.fecha}</div>
          </button>
        ))}
      </div>
      <button onClick={()=>setManual(!manual)} style={{background:manual?"#1e3a5f":"#1e2640",border:`1px solid ${manual?"#3b82f6":"#2d3548"}`,color:manual?"#93c5fd":"#64748b",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600,width:"100%",marginBottom:manual?8:12,textAlign:"left"}}>
        ✏️ Fecha manual {manual?"▲":"▼"}
      </button>
      {manual&&<input value={fechaM} onChange={e=>setFechaM(e.target.value)} placeholder="DD/MM/AAAA" maxLength={10}
        style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #3b82f6",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none",marginBottom:12}}/>}
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>NOTAS (opcional)</label>
        <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: Renovó 3 meses, pagó en efectivo..."
          style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
      </div>
      {error&&<div style={{background:"#2d0a14",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#f43f5e"}}>⚠️ {error}</div>}
      <button onClick={renovar} disabled={guardando||guardado}
        style={{width:"100%",background:guardado?"#166534":guardando?"#374151":"linear-gradient(135deg,#6366f1,#a855f7)",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:700,fontSize:15,cursor:"pointer"}}>
        {guardado?"✅ Renovado":guardando?"Guardando...":`Renovar → ${fechaFinal}`}
      </button>
    </div>
  </div>;
}

// ─── BUSCADOR SERVICIO ────────────────────────────────────
function BuscadorServicio({value,onChange}){
  const [query,setQuery]=useState(value||"");
  const [abierto,setAbierto]=useState(false);
  const filtrados=query.length>0?SERVICIOS_LISTA.filter(s=>s.toLowerCase().includes(query.toLowerCase())):SERVICIOS_LISTA;
  function sel(s){setQuery(s);onChange(s);setAbierto(false);}
  return<div style={{position:"relative"}}>
    <input value={query} onChange={e=>{setQuery(e.target.value);onChange(e.target.value);setAbierto(true);}} onFocus={()=>setAbierto(true)} onBlur={()=>setTimeout(()=>setAbierto(false),150)} placeholder="Busca o escribe un servicio..."
      style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
    {abierto&&filtrados.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,maxHeight:180,overflowY:"auto",zIndex:50,marginTop:4}}>
      {filtrados.map(s=><div key={s} onMouseDown={()=>sel(s)} style={{padding:"9px 14px",cursor:"pointer",fontSize:13,color:value===s?"#a5b4fc":"#e2e8f0",background:value===s?"#2d3748":"transparent",borderBottom:"1px solid #2d354820"}}>{s}</div>)}
    </div>}
  </div>;
}

// ─── FORM NUEVO CLIENTE ───────────────────────────────────
function FormNuevoCliente({onGuardar,onCerrar,clienteExistente}){
  const [form,setForm]=useState({nombre:clienteExistente||"",vinculada:"",cuenta:"",precio:"",fecha:"",tel:"",notas:""});
  const [error,setError]=useState("");
  const [guardando,setGuardando]=useState(false);
  const [guardado,setGuardado]=useState(false);
  function set(k,v){setForm(p=>({...p,[k]:v}));setError("");}

  async function guardar(){
    if(!form.nombre.trim())return setError("El nombre es obligatorio");
    if(!form.cuenta.trim())return setError("El servicio es obligatorio");
    if(!form.fecha.trim())return setError("La fecha es obligatoria");
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(form.fecha))return setError("Fecha debe ser DD/MM/AAAA");
    setGuardando(true);setError("");
    try{await agregarFila({...form,precio:parseFloat(form.precio)||0});setGuardado(true);setTimeout(()=>{onGuardar();onCerrar();},800);}
    catch(e){setError("Error al guardar. Intenta de nuevo.");setGuardando(false);}
  }

  return<div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div style={{background:"#111827",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:17}}>{clienteExistente?"➕ Agregar servicio":"➕ Nuevo cliente"}</div>
        <button onClick={onCerrar} style={{background:"#1e2640",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 10px",cursor:"pointer"}}>✕</button>
      </div>
      {/* Nombre */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>NOMBRE O WHATSAPP *</label>
        <input value={form.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="Ej: Juan García o 664 123 4567" readOnly={!!clienteExistente}
          style={{width:"100%",boxSizing:"border-box",background:clienteExistente?"#0f172a":"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
      </div>
      {/* Vinculada */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>VINCULADA</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {VINCULADAS_LISTA.map(v=>(
            <button key={v} onClick={()=>set("vinculada",form.vinculada===v?"":v)}
              style={{background:form.vinculada===v?"#6366f1":"#1e2640",color:form.vinculada===v?"#fff":"#94a3b8",border:`1px solid ${form.vinculada===v?"#6366f1":"#2d3548"}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>
              {v}
            </button>
          ))}
        </div>
      </div>
      {/* Servicio */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>SERVICIO / CUENTA *</label>
        <BuscadorServicio value={form.cuenta} onChange={v=>set("cuenta",v)}/>
      </div>
      {/* Precio y Fecha */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>PRECIO (MXN)</label>
          <input value={form.precio} onChange={e=>set("precio",e.target.value)} placeholder="Ej: 95" type="number"
            style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
        </div>
        <div>
          <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>FECHA VENC. *</label>
          <input value={form.fecha} onChange={e=>set("fecha",e.target.value)} placeholder="DD/MM/AAAA" maxLength={10}
            style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
        </div>
      </div>
      {/* Tel */}
      {!clienteExistente&&<div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>TELÉFONO WHATSAPP</label>
        <input value={form.tel} onChange={e=>set("tel",e.target.value)} placeholder="10 dígitos: 6641234567" type="tel"
          style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
      </div>}
      {/* Notas */}
      <div style={{marginBottom:20}}>
        <label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:5}}>NOTAS</label>
        <input value={form.notas} onChange={e=>set("notas",e.target.value)} placeholder="Ej: Perfil 4, pin 3333 / usuario: juan@mail.com"
          style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
      </div>
      {error&&<div style={{background:"#2d0a14",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:12,color:"#f43f5e"}}>⚠️ {error}</div>}
      <button onClick={guardar} disabled={guardando||guardado}
        style={{width:"100%",background:guardado?"#166534":guardando?"#374151":"linear-gradient(135deg,#6366f1,#a855f7)",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:700,fontSize:15,cursor:"pointer"}}>
        {guardado?"✅ Guardado":guardando?"Guardando...":"Guardar"}
      </button>
      <div style={{textAlign:"center",fontSize:11,color:"#374151",marginTop:10}}>Se guardará en tu Google Sheet</div>
    </div>
  </div>;
}

// ─── LOGIN ────────────────────────────────────────────────
function Login({onLogin}){
  const [usuario,setUsuario]=useState("");
  const [pass,setPass]=useState("");
  const [verPass,setVerPass]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  function intentarLogin(){
    setLoading(true);setError("");
    setTimeout(()=>{
      const u=USUARIOS[usuario.trim()];
      if(u&&u.pass===pass){onLogin({usuario:usuario.trim(),rol:u.rol});}
      else{setError("Usuario o contraseña incorrectos");setLoading(false);}
    },600);
  }

  return<div style={{minHeight:"100vh",background:"#0b0f1a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif",padding:16}}>
    <div style={{width:"100%",maxWidth:360}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:38,marginBottom:12,boxShadow:"0 0 40px #6366f155"}}>👾</div>
        <div style={{fontWeight:800,fontSize:22,color:"#e2e8f0"}}>👾 Streaming</div>
        <div style={{fontSize:13,color:"#4b5563",marginTop:4}}>Inicia sesión para continuar</div>
      </div>
      <div style={{background:"#111827",border:"1px solid #1e2640",borderRadius:16,padding:24}}>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,color:"#64748b",fontWeight:600,display:"block",marginBottom:6}}>USUARIO</label>
          <input value={usuario} onChange={e=>{setUsuario(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&intentarLogin()} placeholder="Admin / Angelica"
            style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:`1px solid ${error?"#f43f5e55":"#2d3548"}`,borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:12,color:"#64748b",fontWeight:600,display:"block",marginBottom:6}}>CONTRASEÑA</label>
          <div style={{position:"relative"}}>
            <input type={verPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&intentarLogin()} placeholder="••••••••"
              style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:`1px solid ${error?"#f43f5e55":"#2d3548"}`,borderRadius:10,padding:"11px 40px 11px 14px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
            <button onClick={()=>setVerPass(!verPass)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:16}}>
              {verPass?"🙈":"👁️"}
            </button>
          </div>
        </div>
        {error&&<div style={{background:"#2d0a14",border:"1px solid #f43f5e33",borderRadius:8,padding:"8px 12px",marginBottom:16,fontSize:12,color:"#f43f5e",textAlign:"center"}}>⚠️ {error}</div>}
        <button onClick={intentarLogin} disabled={loading||!usuario||!pass}
          style={{width:"100%",background:loading||!usuario||!pass?"#1e2640":"linear-gradient(135deg,#6366f1,#a855f7)",color:loading||!usuario||!pass?"#4b5563":"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,fontSize:15,cursor:loading||!usuario||!pass?"not-allowed":"pointer"}}>
          {loading?"Verificando...":"Entrar →"}
        </button>
      </div>
    </div>
  </div>;
}

// ─── APP PRINCIPAL ────────────────────────────────────────
const FILTROS=[
  {val:"todos",label:"Todos"},
  {val:"vencidos",label:"💀 Vencidos"},
  {val:"hoy",label:"🔴 Hoy"},
  {val:"3dias",label:"🔴 3 días"},
  {val:"semana",label:"🟠 7 días"},
  {val:"mes",label:"🟡 30 días"},
];

const ORDEN_OPTS=[
  {val:"fecha",label:"📅 Fecha"},
  {val:"nombre",label:"🔤 Nombre"},
  {val:"precio",label:"💰 Precio"},
];

function AppPrincipal({sesion,onLogout}){
  const [rawData,setRawData]=useState([]);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState(null);
  const [buscar,setBuscar]=useState("");
  const [filtro,setFiltro]=useState("todos");
  const [orden,setOrden]=useState("fecha");
  const [filtroVinc,setFiltroVinc]=useState("");
  const [notif,setNotif]=useState({});
  const [verRes,setVerRes]=useState(false);
  const [ultimaAct,setUltimaAct]=useState(null);
  const [mostrarForm,setMostrarForm]=useState(false);
  const [clienteParaServicio,setClienteParaServicio]=useState(null);
  const [modalRenovar,setModalRenovar]=useState(null);
  const [modalConfirm,setModalConfirm]=useState(null);
  const esAdmin=sesion.rol==="admin";

  async function cargarDatos(){
    setCargando(true);setError(null);
    try{
      const res=await fetch(SHEET_CSV+"&t="+Date.now());
      if(!res.ok)throw new Error(`Error ${res.status}`);
      const text=await res.text();
      const{rows}=parseCSV(text);
      if(rows.length===0)throw new Error("No se encontraron clientes");
      setRawData(rows);setUltimaAct(new Date());
    }catch(e){setError(e.message);}
    finally{setCargando(false);}
  }

  useEffect(()=>{cargarDatos();},[]);

  const clientes=useMemo(()=>agruparClientes(rawData),[rawData]);

  const clientesFiltrados=useMemo(()=>{
    const q=buscar.toLowerCase();
    let lista=clientes.filter(c=>{
      const matchBuscar=!q||c.nombre.toLowerCase().includes(q)||c.servicios.some(s=>s.cuenta.toLowerCase().includes(q))||c.servicios.some(s=>s.vinculada&&s.vinculada.toLowerCase().includes(q));
      const matchVinc=!filtroVinc||c.servicios.some(s=>s.vinculada===filtroVinc);
      const ok=matchBuscar&&matchVinc;
      if(filtro==="vencidos")return ok&&c.dMin!==null&&c.dMin<0;
      if(filtro==="hoy")return ok&&c.dMin===0;
      if(filtro==="3dias")return ok&&c.dMin!==null&&c.dMin>=0&&c.dMin<=3;
      if(filtro==="semana")return ok&&c.dMin!==null&&c.dMin>=0&&c.dMin<=7;
      if(filtro==="mes")return ok&&c.dMin!==null&&c.dMin>=0&&c.dMin<=30;
      return ok;
    });
    if(orden==="nombre")lista=[...lista].sort((a,b)=>a.nombre.localeCompare(b.nombre));
    else if(orden==="precio")lista=[...lista].sort((a,b)=>b.total-a.total);
    return lista;
  },[clientes,buscar,filtro,filtroVinc,orden]);

  function notificarGrupo(nombre,tel,grupo){
    const key=`${nombre}__${grupo.fecha}`;
    const lineas=grupo.servicios.map(s=>{
      const vinc=s.vinculada?` (${s.vinculada})`:"";
      const nota=s.notas?`\n  📝 ${s.notas}`:"";
      return`• ${s.cuenta}${vinc}: $${s.precio} MXN${nota}`;
    }).join("\n");
    const total=grupo.servicios.reduce((s,x)=>s+x.precio,0);
    const diasTxt=grupo.d===0?"¡HOY!":grupo.d!==null?`en ${grupo.d} días`:"próximamente";
    const txt=`Hola! Te recuerdo el pago de *${nombre}* (${diasTxt}):\n${lineas}\n\n*Total: $${total} MXN*\nFecha: *${grupo.fecha}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,"_blank");
    setNotif(prev=>({...prev,[key]:true}));
    setTimeout(()=>setNotif(prev=>{const n={...prev};delete n[key];return n;}),3000);
  }

  function pedirCancelarServicio(s,nombreCliente){
    setModalConfirm({
      mensaje:"¿Cancelar servicio?",
      detalle:`${nombreCliente} · ${s.cuenta}\nSe marcará como CANCELADO.`,
      colorBtn:"#fb923c",textoBtn:"Cancelar servicio",
      onConfirmar:async()=>{
        try{await cancelarServicioSheet(s.rowNum);await cargarDatos();}
        catch(e){alert("Error al cancelar.");}
        setModalConfirm(null);
      }
    });
  }

  function pedirEliminarServicio(s,nombreCliente){
    setModalConfirm({
      mensaje:"¿Eliminar servicio?",
      detalle:`${nombreCliente} · ${s.cuenta}\nEsta acción no se puede deshacer.`,
      colorBtn:"#ef4444",textoBtn:"Eliminar",
      onConfirmar:async()=>{
        try{await eliminarFila(s.rowNum);await cargarDatos();}
        catch(e){alert("Error al eliminar.");}
        setModalConfirm(null);
      }
    });
  }

  function pedirEliminarCliente(nombreCliente,servicios){
    setModalConfirm({
      mensaje:"¿Eliminar cliente completo?",
      detalle:`Se eliminarán TODOS los servicios de ${nombreCliente}.`,
      colorBtn:"#ef4444",textoBtn:"Eliminar todo",
      onConfirmar:async()=>{
        try{
          const rows=[...servicios].sort((a,b)=>b.rowNum-a.rowNum);
          for(const s of rows)await eliminarFila(s.rowNum);
          await cargarDatos();
        }catch(e){alert("Error al eliminar.");}
        setModalConfirm(null);
      }
    });
  }

  function pedirMarcarCobrado(s,nombreCliente){
    setModalConfirm({
      mensaje:"¿Marcar como cobrado?",
      detalle:`${nombreCliente} · ${s.cuenta}\nSe registrará la fecha de hoy.`,
      colorBtn:"#16a34a",textoBtn:"✅ Cobrado",
      onConfirmar:async()=>{
        try{await marcarCobradoSheet(s.rowNum,s.colCobrado,fechaHoyStr());await cargarDatos();}
        catch(e){alert("Error al marcar cobrado.");}
        setModalConfirm(null);
      }
    });
  }

  // Resumen
  const totalMes=clientes.reduce((s,c)=>s+c.total,0);
  const urgentes=clientes.filter(c=>c.dMin!==null&&c.dMin>=0&&c.dMin<=7);
  const totalUrg=urgentes.reduce((s,c)=>s+c.total,0);
  const urgentes3=clientes.filter(c=>c.dMin!==null&&c.dMin>=0&&c.dMin<=3).length;
  const urgentes7=urgentes.length;

  // Resumen por vinculada
  const resumenVinc=useMemo(()=>{
    const m=new Map();
    clientes.forEach(c=>c.servicios.forEach(s=>{
      const k=s.vinculada||"Sin vinculada";
      if(!m.has(k))m.set(k,{total:0,count:0});
      m.get(k).total+=s.precio;m.get(k).count+=1;
    }));
    return Array.from(m.entries()).sort((a,b)=>b[1].total-a[1].total);
  },[clientes]);

  // Resumen por tipo de servicio
  const resumenServicio=useMemo(()=>{
    const m=new Map();
    clientes.forEach(c=>c.servicios.forEach(s=>{
      const base=s.cuenta.replace(/\s*(4K|HD|extra|gen|genérico|\+|3|1|12|platino)/gi,"").trim();
      const k=base||s.cuenta;
      if(!m.has(k))m.set(k,{total:0,count:0});
      m.get(k).total+=s.precio;m.get(k).count+=1;
    }));
    return Array.from(m.entries()).sort((a,b)=>b[1].total-a[1].total);
  },[clientes]);

  return<div style={{minHeight:"100vh",background:"#0b0f1a",fontFamily:"system-ui,sans-serif",color:"#e2e8f0",paddingBottom:40}}>

    {mostrarForm&&esAdmin&&<FormNuevoCliente onGuardar={()=>cargarDatos()} onCerrar={()=>setMostrarForm(false)}/>}
    {clienteParaServicio&&esAdmin&&<FormNuevoCliente clienteExistente={clienteParaServicio} onGuardar={()=>cargarDatos()} onCerrar={()=>setClienteParaServicio(null)}/>}
    {modalRenovar&&<ModalRenovar servicio={modalRenovar.servicio} nombreCliente={modalRenovar.nombreCliente} onRenovar={()=>cargarDatos()} onCerrar={()=>setModalRenovar(null)}/>}
    {modalConfirm&&<ModalConfirmar mensaje={modalConfirm.mensaje} detalle={modalConfirm.detalle} colorBtn={modalConfirm.colorBtn} textoBtn={modalConfirm.textoBtn} onConfirmar={modalConfirm.onConfirmar} onCancelar={()=>setModalConfirm(null)}/>}

    {/* Header */}
    <div style={{background:"linear-gradient(135deg,#0f172a,#1e1b4b)",padding:"20px 16px 14px",borderBottom:"1px solid #1e2640",position:"sticky",top:0,zIndex:10}}>
      <div style={{maxWidth:500,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👾</div>
            <div>
              <div style={{fontWeight:800,fontSize:15}}>👾 Streaming</div>
              <div style={{fontSize:11,color:"#4b5563"}}>{sesion.usuario} · <span style={{color:esAdmin?"#a855f7":"#38bdf8"}}>{esAdmin?"Admin":"Ayudante"}</span></div>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {esAdmin&&<button onClick={()=>setMostrarForm(true)} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>➕ Nuevo</button>}
            <button onClick={cargarDatos} disabled={cargando} style={{background:"#1e2640",border:"1px solid #2d3548",color:"#94a3b8",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12}}>{cargando?"⏳":"🔄"}</button>
            <button onClick={onLogout} style={{background:"#1e2640",border:"1px solid #2d3548",color:"#94a3b8",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12}}>🚪</button>
          </div>
        </div>

        {urgentes3>0&&<div style={{fontSize:11,color:"#f43f5e",fontWeight:600,marginBottom:6}}>🔴 {urgentes3} cliente{urgentes3>1?"s":""} en 3 días o menos</div>}
        {!cargando&&ultimaAct&&urgentes3===0&&<div style={{fontSize:11,color:"#374151",marginBottom:6}}>Actualizado: {ultimaAct.toLocaleTimeString("es-MX")}</div>}

        {/* Resumen solo admin */}
        {esAdmin&&<div onClick={()=>setVerRes(!verRes)} style={{background:"#0f172a",border:"1px solid #1e2640",borderRadius:10,padding:"10px 14px",marginBottom:10,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>💰 Resumen del mes</span>
            <span style={{fontSize:11,color:"#4b5563"}}>{verRes?"▲":"▼"}</span>
          </div>
          {verRes&&<div style={{marginTop:10}}>
            {/* Totales */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div style={{background:"#1e2640",borderRadius:8,padding:"8px 12px"}}>
                <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>Total por cobrar</div>
                <div style={{fontSize:18,fontWeight:800,color:"#4ade80"}}>${totalMes.toLocaleString()}</div>
                <div style={{fontSize:10,color:"#374151"}}>{clientes.length} clientes</div>
              </div>
              <div style={{background:"#2d1200",borderRadius:8,padding:"8px 12px",border:"1px solid #fb923c33"}}>
                <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>Urgente (7 días)</div>
                <div style={{fontSize:18,fontWeight:800,color:"#fb923c"}}>${totalUrg.toLocaleString()}</div>
                <div style={{fontSize:10,color:"#374151"}}>{urgentes7} clientes</div>
              </div>
            </div>
            {/* Por vinculada */}
            <div style={{background:"#0f172a",borderRadius:8,padding:"10px 12px",border:"1px solid #1e2640",marginBottom:8}}>
              <div style={{fontSize:11,color:"#a5b4fc",fontWeight:700,marginBottom:8}}>🔗 Por vinculada</div>
              {resumenVinc.map(([nombre,d])=>(
                <div key={nombre} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{nombre}</span>
                    <span style={{fontSize:10,color:"#374151",background:"#1e2640",borderRadius:4,padding:"1px 5px"}}>{d.count}</span>
                  </div>
                  <span style={{fontSize:12,color:"#4ade80",fontWeight:700}}>${d.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
            {/* Por servicio */}
            <div style={{background:"#0f172a",borderRadius:8,padding:"10px 12px",border:"1px solid #1e2640"}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:8}}>📊 Por tipo de servicio</div>
              {resumenServicio.map(([nombre,d])=>(
                <div key={nombre} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{nombre}</span>
                    <span style={{fontSize:10,color:"#374151",background:"#1e2640",borderRadius:4,padding:"1px 5px"}}>{d.count}</span>
                  </div>
                  <span style={{fontSize:12,color:"#4ade80",fontWeight:700}}>${d.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>}
        </div>}

        {/* Buscador */}
        <div style={{position:"relative",marginBottom:8}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#64748b"}}>🔍</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar nombre, servicio o vinculada..."
            style={{width:"100%",boxSizing:"border-box",background:"#1e2640",border:"1px solid #2d3548",borderRadius:10,padding:"10px 12px 10px 36px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
        </div>

        {/* Filtros por vinculada */}
        <div style={{display:"flex",gap:5,overflowX:"auto",marginBottom:8,paddingBottom:2}}>
          <button onClick={()=>setFiltroVinc("")} style={{background:filtroVinc===""?"#a855f7":"#1e2640",color:filtroVinc===""?"#fff":"#94a3b8",border:`1px solid ${filtroVinc===""?"#a855f7":"#2d3548"}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>
            Todas
          </button>
          {VINCULADAS_LISTA.map(v=>(
            <button key={v} onClick={()=>setFiltroVinc(filtroVinc===v?"":v)} style={{background:filtroVinc===v?"#312e81":"#1e2640",color:filtroVinc===v?"#a5b4fc":"#64748b",border:`1px solid ${filtroVinc===v?"#6366f1":"#2d3548"}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>
              {v}
            </button>
          ))}
        </div>

        {/* Filtros de tiempo + orden */}
        <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
          {FILTROS.map(f=>(
            <button key={f.val} onClick={()=>setFiltro(f.val)} style={{background:filtro===f.val?"#6366f1":"#1e2640",color:filtro===f.val?"#fff":"#94a3b8",border:`1px solid ${filtro===f.val?"#6366f1":"#2d3548"}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>
              {f.label}
            </button>
          ))}
          <div style={{width:1,background:"#1e2640",flexShrink:0}}/>
          {ORDEN_OPTS.map(o=>(
            <button key={o.val} onClick={()=>setOrden(o.val)} style={{background:orden===o.val?"#0f4c75":"#1e2640",color:orden===o.val?"#38bdf8":"#64748b",border:`1px solid ${orden===o.val?"#0ea5e9":"#2d3548"}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Lista */}
    <div style={{maxWidth:500,margin:"0 auto",padding:"14px 16px 0"}}>
      {cargando?(
        <div style={{textAlign:"center",padding:"60px 0",color:"#4b5563"}}>
          <div style={{fontSize:36,marginBottom:12}}>⏳</div>
          <div>Cargando datos...</div>
        </div>
      ):error?(
        <div style={{background:"#1a0f00",border:"1px solid #fb923c44",borderRadius:14,padding:24,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
          <div style={{color:"#fb923c",fontSize:13,marginBottom:16}}>{error}</div>
          <button onClick={cargarDatos} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"8px 24px",cursor:"pointer",fontWeight:700}}>Reintentar</button>
        </div>
      ):clientesFiltrados.length===0?(
        <div style={{textAlign:"center",color:"#4b5563",padding:"60px 0"}}>Sin resultados</div>
      ):clientesFiltrados.map(c=>{
        const u=urgencia(c.dMin);
        const urgente=c.dMin!==null&&c.dMin>=0&&c.dMin<=3;
        const multiGrupo=c.grupos.length>1;

        return<div key={c.nombre} style={{background:urgente?u.bg:"#111827",border:`1px solid ${urgente?u.color+"44":"#1e2640"}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>

          {/* Header cliente */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{fontWeight:800,fontSize:15,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</div>
            {esAdmin&&<span style={{color:"#4ade80",fontWeight:800,fontSize:13,whiteSpace:"nowrap"}}>Total ${c.total.toLocaleString()}</span>}
            {c.tel&&<a href={`https://wa.me/52${c.tel.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
              style={{background:"#14532d",border:"1px solid #16a34a44",color:"#4ade80",borderRadius:8,padding:"4px 8px",fontSize:11,fontWeight:700,textDecoration:"none"}}>📱</a>}
            {esAdmin&&<button onClick={()=>setClienteParaServicio(c.nombre)} style={{background:"#1e3a5f",border:"1px solid #3b82f644",color:"#93c5fd",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>+</button>}
            {esAdmin&&<button onClick={()=>pedirEliminarCliente(c.nombre,c.servicios)} style={{background:"#2d0a14",border:"1px solid #f43f5e33",color:"#f43f5e",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️</button>}
          </div>

          {/* Notas globales (solo admin) */}
          {c.notas.length>0&&esAdmin&&<div style={{background:"#1e2640",borderRadius:6,padding:"5px 10px",marginBottom:8,fontSize:11,color:"#94a3b8"}}>📝 {c.notas.join(" · ")}</div>}

          {/* Grupos por fecha */}
          {c.grupos.map((grupo,gi)=>{
            const ug=urgencia(grupo.d);
            const urgGrupo=grupo.d!==null&&grupo.d>=0&&grupo.d<=3;
            const key=`${c.nombre}__${grupo.fecha}`;
            const yaNotif=notif[key];
            return<div key={gi} style={{background:urgGrupo?ug.bg+"99":"#0f172a",border:`1px solid ${multiGrupo?(urgGrupo?ug.color+"33":"#1e2640"):"transparent"}`,borderRadius:multiGrupo?10:0,padding:multiGrupo?"10px 12px":"0",marginBottom:gi<c.grupos.length-1?8:0}}>
              {/* Fecha + badge + avisar */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:"#64748b"}}>📅 {grupo.fecha}</span>
                  <Badge d={grupo.d}/>
                </div>
                <button onClick={()=>notificarGrupo(c.nombre,c.tel,grupo)} style={{background:yaNotif?"#166534":"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700}}>
                  <span>{yaNotif?"✅":"📲"}</span>
                  <span style={{fontSize:10}}>{yaNotif?"Enviado":"Avisar"}</span>
                </button>
              </div>
              {/* Servicios */}
              {grupo.servicios.map((s,si)=>(
                <div key={si} style={{background:"#0d1424",borderRadius:8,padding:"8px 10px",marginBottom:si<grupo.servicios.length-1?6:0,border:"1px solid #1e2640"}}>
                  {/* Fila 1: cuenta + vinculada + cobrado + precio */}
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:s.notas&&esAdmin?4:esAdmin?6:0}}>
                    <span style={{background:"#1e2640",color:"#e2e8f0",fontSize:12,padding:"2px 8px",borderRadius:6,fontWeight:700}}>{s.cuenta}</span>
                    {s.vinculada&&<span style={{background:"#312e81",color:"#a5b4fc",fontSize:10,padding:"2px 7px",borderRadius:6,fontWeight:600}}>{s.vinculada}</span>}
                    {s.cobrado&&<span style={{background:"#14532d",color:"#4ade80",fontSize:10,padding:"2px 7px",borderRadius:6,fontWeight:600}}>✅ {s.cobrado}</span>}
                    {esAdmin&&<span style={{color:"#4ade80",fontSize:12,fontWeight:700,marginLeft:"auto"}}>${s.precio.toLocaleString()}</span>}
                  </div>
                  {/* Notas del servicio (solo admin) */}
                  {s.notas&&esAdmin&&<div style={{fontSize:11,color:"#64748b",marginBottom:6,paddingLeft:2}}>📝 {s.notas}</div>}
                  {/* Botones admin */}
                  {esAdmin&&<div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {!s.cobrado&&<button onClick={()=>pedirMarcarCobrado(s,c.nombre)} style={{background:"#0f2a0f",border:"1px solid #4ade8033",color:"#4ade80",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontSize:10,fontWeight:700}}>
                      ✅ Cobrado
                    </button>}
                    <div style={{flex:1}}/>
                    <button onClick={()=>pedirCancelarServicio(s,c.nombre)} style={{background:"#2d1a00",border:"1px solid #fb923c33",color:"#fb923c",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontSize:10,fontWeight:700}}>❌ Cancelar</button>
                    <button onClick={()=>setModalRenovar({servicio:s,nombreCliente:c.nombre})} style={{background:"#1e3a5f",border:"1px solid #3b82f644",color:"#93c5fd",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontSize:10,fontWeight:700}}>🔄 Renovar</button>
                    <button onClick={()=>pedirEliminarServicio(s,c.nombre)} style={{background:"#2d0a14",border:"1px solid #f43f5e33",color:"#f43f5e",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️</button>
                  </div>}
                </div>
              ))}
            </div>;
          })}
        </div>;
      })}
      {!cargando&&!error&&<div style={{textAlign:"center",fontSize:11,color:"#374151",marginTop:16}}>{clientesFiltrados.length} de {clientes.length} clientes</div>}
    </div>
  </div>;
}

export default function App(){
  const [sesion,setSesion]=useState(null);
  if(!sesion)return<Login onLogin={setSesion}/>;
  return<AppPrincipal sesion={sesion} onLogout={()=>setSesion(null)}/>;
}
