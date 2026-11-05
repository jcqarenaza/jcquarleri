// QP C&IA - Panel de Sistemas
var SB_URL = 'https://tviiikkdskucmgcmtswu.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg';
// Usuario autenticado — se setea desde index.html al loguear
function getAuthKey() { return (window._authToken || SB_KEY); }
function isSuperAdmin() { return !window._currentUser || window._currentUser.rol === 'superadmin'; }
function getRevendedorId() { return window._currentUser && window._currentUser.revendedor_id || null; }

// ── Renovación automática de la sesión (el token de acceso dura ~1 hora) ──
function qpTokenExp(t) { try { return JSON.parse(atob(String(t).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp * 1000; } catch(e) { return 0; } }
function qpRefrescarSesion(forzar) {
  var rt = window._refreshToken;
  if (!rt) return Promise.resolve(false);
  if (!forzar && window._authToken && qpTokenExp(window._authToken) - Date.now() > 5*60000) return Promise.resolve(true);
  if (window._qpRefrescando) return window._qpRefrescando;
  window._qpRefrescando = fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {method:'POST', headers:{apikey:SB_KEY,'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:rt})})
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (!d || !d.access_token) return false;
      window._authToken = d.access_token; window._refreshToken = d.refresh_token || rt;
      try { var sv = JSON.parse(sessionStorage.getItem('qp_auth')||'{}'); sv.token = d.access_token; sv.refresh = window._refreshToken; sv.ts = Date.now(); sessionStorage.setItem('qp_auth', JSON.stringify(sv)); } catch(e) {}
      try { var bio = JSON.parse(localStorage.getItem('qp_bio')||'null'); if (bio) { bio.refresh = window._refreshToken; bio.ts = Date.now(); localStorage.setItem('qp_bio', JSON.stringify(bio)); } } catch(e) {}
      return true;
    })
    .catch(function(){ return false; })
    .then(function(ok){ window._qpRefrescando = null; return ok; });
  return window._qpRefrescando;
}
setInterval(function(){ if (window._refreshToken) qpRefrescarSesion(false); }, 4*60000);

// ── Mensajes del sistema: reemplazan alert / confirm / prompt del navegador ──
(function(){
  var nativeConfirm = window.confirm;
  function mk(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
  // Avisos (alert): tarjeta arriba al centro, se cierra sola
  function toast(msg) {
    msg = String(msg == null ? '' : msg);
    var cont = document.getElementById('qp-toasts');
    if (!cont) { cont = mk('div', 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:100000;display:flex;flex-direction:column;gap:8px;width:min(460px,calc(100vw - 24px));pointer-events:none'); cont.id = 'qp-toasts'; document.body.appendChild(cont); }
    var err = /^(error|no se pudo|no pude|fall[oó]|falta|sesi[oó]n)/i.test(msg.trim());
    var t = mk('div', 'pointer-events:auto;background:#fff;border:1px solid '+(err?'#F5C2C2':'#CBD5E1')+';border-left:4px solid '+(err?'#A32D2D':'#0B9EDA')+';border-radius:10px;box-shadow:0 8px 28px rgba(15,23,42,.18);padding:12px 14px;display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#1a2e4a;line-height:1.45');
    t.appendChild(mk('div', 'flex:1;white-space:pre-wrap;word-break:break-word', msg));
    var x = mk('button', 'border:none;background:none;color:#94a3b8;font-size:18px;line-height:1;cursor:pointer;padding:0 2px', '×');
    x.onclick = function(){ t.remove(); };
    t.appendChild(x); cont.appendChild(t);
    setTimeout(function(){ if (t.parentNode) t.remove(); }, err ? 14000 : 7000);
  }
  // Dialogo (confirmar / pedir texto)
  function dialogo(o) {
    var ov = mk('div', 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px');
    var box = mk('div', 'background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(15,23,42,.3);padding:20px 22px;width:min(420px,100%);font-family:inherit');
    box.appendChild(mk('div', 'font-weight:700;font-size:15px;color:#1a2e4a;margin-bottom:8px', o.titulo || 'QP C&IA'));
    box.appendChild(mk('div', 'font-size:13px;color:#475569;line-height:1.5;white-space:pre-wrap;margin-bottom:14px', o.msg));
    var inp = null;
    if (o.input) {
      inp = mk('input', 'width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #CBD5E1;border-radius:8px;font-size:14px;margin-bottom:14px');
      inp.type = o.password ? 'password' : 'text'; inp.value = o.def || ''; box.appendChild(inp);
    }
    var fila = mk('div', 'display:flex;justify-content:flex-end;gap:8px');
    var bNo = mk('button', 'padding:8px 16px;border:1px solid #CBD5E1;background:#fff;color:#334155;border-radius:8px;font-size:13px;cursor:pointer', o.no || 'Cancelar');
    var peligro = !o.input && /elimin|borrar|baja|quitar|desactivar|forzar/i.test(o.msg);
    var bSi = mk('button', 'padding:8px 16px;border:none;background:'+(peligro?'#A32D2D':'#0B9EDA')+';color:#fff;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer', o.si || (peligro ? 'Confirmar' : 'Aceptar'));
    fila.appendChild(bNo); fila.appendChild(bSi); box.appendChild(fila); ov.appendChild(box); document.body.appendChild(ov);
    function cerrar() { document.removeEventListener('keydown', teclas, true); ov.remove(); }
    function teclas(e) { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); o.cancel && o.cancel(); } else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); bSi.click(); } }
    bNo.onclick = function(){ cerrar(); o.cancel && o.cancel(); };
    bSi.onclick = function(){ var v = inp ? inp.value : true; cerrar(); o.ok(v); };
    document.addEventListener('keydown', teclas, true);
    setTimeout(function(){ (inp || bSi).focus(); if (inp) inp.select(); }, 30);
  }
  // confirm()/prompt() son sincronos y el codigo viejo espera la respuesta en el momento:
  // se muestra el dialogo, se devuelve "no", y al aceptar se repite el click original ya aprobado.
  var aprob = {}, abrioNuevo = false;
  function pedir(clave, o, vacio) {
    if (Object.prototype.hasOwnProperty.call(aprob, clave)) return aprob[clave];
    var ev = window.event, tgt = ev && ev.target;
    if (!tgt || !tgt.isConnected) { if (o.input) return vacio; return nativeConfirm.call(window, o.msg); }
    abrioNuevo = true;
    o.cancel = function(){ aprob = {}; };
    o.ok = function(v){
      aprob[clave] = v; abrioNuevo = false;
      try { tgt.click(); } finally { if (!abrioNuevo) aprob = {}; }
    };
    dialogo(o);
    return vacio;
  }
  window.alert = function(m){ toast(m); };
  window.confirm = function(m){ m = String(m); return pedir('C:'+m, {msg:m}, false); };
  window.prompt = function(m, def){ m = String(m); return pedir('P:'+m, {msg:m, input:true, def:def, password:/contrase|password/i.test(m)}, null); };
  // Version con callback (para codigo asincrono): qpConfirm('mensaje', function(){ ... }, {si:'Generar', no:'No'})
  window.qpConfirm = function(m, onYes, lbl) { lbl = lbl || {}; dialogo({msg:String(m), si:lbl.si, no:lbl.no, ok:function(){ onYes && onYes(); }}); };
  window.qpToast = toast;
})();

// Logo
var logoEl = document.getElementById('logo');
var logoData = document.getElementById('logo-data');
if (logoEl && logoData) logoEl.src = JSON.parse(logoData.textContent);

// DB - plain fetch, no SDK
function sbFetch(path, opts) {
  opts = opts || {};
  return fetch(SB_URL + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation'
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(function(r) {
    return r.text().then(function(t) {
      if (!r.ok) {
        var msg = t ? (JSON.parse(t).message || r.status) : r.status;
        throw new Error(path + ': ' + msg);
      }
      return t ? JSON.parse(t) : [];
    });
  });
}
function dbGet(t) { return sbFetch(t + '?select=*'); }
function dbIns(t, b) { return sbFetch(t, { method: 'POST', body: b }); }
function dbUpdCol(t, col, val, b) {
  return fetch(SB_URL + '/rest/v1/' + t + '?' + col + '=eq.' + val, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(b)
  }).then(function(r) {
    if (!r.ok) { return r.text().then(function(t2) { var msg = t2 ? (function(){ try { return JSON.parse(t2).message; } catch(e){ return t2; } })() : r.status; throw new Error('dbUpdCol ' + t + ': ' + msg); }); }
    return r;
  });
}
function dbUpd(t, id, b) {
  return fetch(SB_URL + '/rest/v1/' + t + '?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(b)
  }).then(function(r) {
    if (!r.ok) {
      return r.text().then(function(t2) {
        var msg = t2 ? (function(){ try { return JSON.parse(t2).message; } catch(e){ return t2; } })() : r.status;
        throw new Error('dbUpd ' + t + ': ' + msg);
      });
    }
    return r;
  });
}

// Helpers
var MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Estado de UI de Finanzas que sobrevive a recargas de vFinanzas() (no se resetea con cada refetch)
var _finUIState = { modoFin:null, tabActual:null, mesSeleccionadoPF:null, periodo:null };
var P_LAB = {vercel:'Vercel', supabase:'Supabase', github:'GitHub', app_script:'App Script', otro:'Otro'};
var T_LAB = {mono_empresa:'Mono empresa', multi_empresa:'Multi empresa', multi_usuario:'Multi usuario', saas:'SaaS'};
var M_LAB = {transferencia:'Transferencia', efectivo:'Efectivo', mercadopago:'MercadoPago', tarjeta:'Tarjeta', dai:'DAI (cripto)', otro:'Otro'};
var S_COL = {Cortelab:'#0B9EDA', MobixERP:'#5BBD4E', 'El Piamonte':'#E8855A', 'Envios Distri':'#0C6FA3', Artemis:'#3D8A32'};
var S_BG  = {Cortelab:'#E6F6FD', MobixERP:'#EDF7EA', 'El Piamonte':'#FEF0EB', 'Envios Distri':'#E0F0FA', Artemis:'#E8F5E0'};

function ge(id) { return document.getElementById(id); }
function gv(id) { var e = ge(id); return e ? e.value : ''; }
function fmt(n) { return '$' + Number(n||0).toLocaleString('es-AR'); }
function fdate(d) { if(!d) return '-'; var p=d.slice(0,10).split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }

function chip(n) {
  var c = S_COL[n]||'#64748B', b = S_BG[n]||'#F1F5F9';
  return el('span', {style:'background:'+b+';color:'+c+';padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500'}, n||'-');
}
function chipClass(text, cls) { return el('span', {class:'chip '+cls}, text); }

// DOM builder — avoids ALL string concatenation issues
function el(tag, attrs, content) {
  var e = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function(k) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else if (k.startsWith('on')) e[k] = attrs[k];
    else e.setAttribute(k, attrs[k]);
  });
  if (content !== undefined && content !== null) {
    if (typeof content === 'string' || typeof content === 'number') e.textContent = String(content);
    else if (content instanceof Node) e.appendChild(content);
    else if (Array.isArray(content)) content.forEach(function(c) {
      if (c === null || c === undefined) return;
      if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(String(c)));
      else if (c instanceof Node) e.appendChild(c);
    });
  }
  return e;
}
function elH(tag, attrs, html) {
  var e = el(tag, attrs);
  e.innerHTML = html;
  return e;
}
function app() { return ge('app'); }
function setApp(node) { var a = app(); a.innerHTML = ''; a.appendChild(node); }
function loading() { setApp(el('div', {class:'emp'}, 'Cargando...')); }

// Pagos parciales
var MEDIOS_PAGO = [['transferencia','Transferencia'],['efectivo','Efectivo'],['tarjeta','Tarjeta'],['mercadopago','MercadoPago'],['dai','DAI (cripto)'],['otro','Otro']];
function pagadoDe(c) { return (c._pagos||[]).reduce(function(s,p){ return s+Number(p.monto||0); }, 0); }
function saldoDe(c) { return Math.max(0, Number(c.monto||0) - pagadoDe(c)); }

// Load all data
function cargar() {
  return Promise.all([
    sbFetch('panel_sistemas?select=*&order=nombre.asc'), dbGet('panel_clientes'),
    dbGet('panel_asignaciones'), dbGet('panel_cobros'), dbGet('panel_sub_entidades'),
    dbGet('panel_implementacion_fases'), dbGet('panel_alertas'),
    sbFetch('panel_fases?select=*&order=orden.asc'),
    sbFetch('panel_recibos?select=cobro_id,numero&order=numero.desc'),
    sbFetch('panel_pagos?select=*&order=fecha.asc').catch(function(){ return []; })
  ]).then(function(r) {
    console.log('cargar OK:', r[0].length, 'sis,', r[1].length, 'cls,', r[2].length, 'asigs');
    var sis=r[0], cls=r[1], asigs=r[2], cobs=r[3], subs=r[4], fases=r[5], alertasDb=r[6], fasesEstructura=r[7], recibos=r[8]||[], pagos=r[9]||[];
    // Enriquecer fases de asignación con la fase estructural
    asigs.forEach(function(a) {
      a._sis  = sis.find(function(s){ return s.id===a.sistema_id; })||{nombre:'?'};
      a._cli  = cls.find(function(c){ return c.id===a.cliente_id; })||{nombre:'?'};
      a._subs = subs.filter(function(se){ return se.asignacion_id===a.id; });
      a._cobs = cobs.filter(function(co){ return co.asignacion_id===a.id; });
      a._fases = fases.filter(function(f){ return f.asignacion_id===a.id; }).sort(function(x,y){ return x.numero-y.numero; });
      // Fases estructurales del sistema (sin precio)
      a._fasesEstructura = fasesEstructura.filter(function(f){ return f.sistema_id===a.sistema_id; });
    });
    cobs.forEach(function(c) {
      c._pagos = pagos.filter(function(p){ return p.cobro_id === c.id; });
      var a = asigs.find(function(x){ return x.id===c.asignacion_id; })||{};
      c._sis = a._sis||{nombre:'-'}; c._cli = a._cli||{nombre:'-'};
      c._asig = a;
      c._fase = (a._fases||[]).find(function(f){ return f.id===c.fase_id; })||null;
      var rec = recibos.find(function(rec){ return rec.cobro_id===c.id; });
      c._numRecibo = rec ? rec.numero : null;
    });
    return {sis:sis, cls:cls, asigs:asigs, cobs:cobs, alertasDb:alertasDb, fasesEstructura:fasesEstructura};
  });
}

// Total de implementacion acordado para una asignacion = suma de sus fases.
// Si todavia no tiene fases cargadas (caso raro), cae al campo legacy.
function totalFases(a) {
  if (a._fases && a._fases.length) return a._fases.reduce(function(s,f){ return s+Number(f.monto||0); }, 0);
  return Number(a.costo_implementacion_acordado||a.precio_acordado||0);
}
function pagadoImplementacion(a) {
  return (a._cobs||[]).filter(function(c){ return c.estado==='pagado' && c.tipo_cobro==='implementacion'; })
    .reduce(function(s,c){ return s+Number(c.monto); }, 0);
}
function pagadoFase(f, a) {
  return (a._cobs||[]).filter(function(c){ return c.estado==='pagado' && c.tipo_cobro==='implementacion' && c.fase_id===f.id; })
    .reduce(function(s,c){ return s+Number(c.monto); }, 0);
}

// Alertas
function calcAlertas(asigs, alertasDb) {
  alertasDb = alertasDb || [];
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var out = [];
  asigs.forEach(function(a) {
    if (!a.activo) return;
    if (a._cli && a._cli.es_demo) return;
    if (Number(a.fee_mensual||0) > 0) {
      for (var d=0; d<=1; d++) {
        var fd = new Date(hoy.getFullYear(), hoy.getMonth()+d, a.dia_cobro||1);
        var dias = Math.round((fd-hoy)/86400000);
        if (dias <= 10 && dias >= -5) {
          var mes=fd.getMonth()+1, anio=fd.getFullYear();
          var ms = String(mes).padStart(2,'0');
          var ya = a._cobs.some(function(c) {
            return c.estado==='pagado' && (c.tipo_cobro==='fee'||!c.tipo_cobro)
              && c.created_at && c.created_at.slice(0,7)===anio+'-'+ms;
          });
          var ignorada = alertasDb.some(function(al) {
            return al.asignacion_id===a.id && al.tipo==='fee_mensual' && al.mes===mes && al.anio===anio && al.estado==='ignorado';
          });
          if (!ya && !ignorada) out.push({tipo:'fee', asig:a, dias:dias, mes:mes, anio:anio, monto:Number(a.fee_mensual)});
        }
      }
    }
    var totI = totalFases(a);
    var pagI = pagadoImplementacion(a);
    if (totI > 0 && pagI < totI) out.push({tipo:'impl', asig:a, saldo:totI-pagI, total:totI, pagado:pagI});
  });
  var b = ge('abadge');
  if (b) { b.style.display = out.length ? '' : 'none'; b.textContent = out.length; }
  return out;
}

// Nav
var _D = null;
function getSisIconEl(nombre, size) {
  size = size || 20;
  var logos = {'ConeOS':'https://jcquarleri.vercel.app/coneos-logo.png','El Piamonte':'https://jcquarleri.vercel.app/piamonte-logo.png'};
  if (logos[nombre]) return el('img',{src:logos[nombre],style:'width:'+size+'px;height:'+size+'px;object-fit:contain;border-radius:4px;vertical-align:middle'});
  var emojis = {'Cortelab':'📐','MobixERP':'📱'};
  return el('span',{style:'font-size:'+size+'px'},emojis[nombre]||'💻');
}

function go(v) {
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('on'); });
  var nb = ge('nb-'+v); if (nb) nb.classList.add('on');
  loading();
  ({dash:vDash, sistemas:vSistemas, clientes:vClientes, cobros:vCobros, alertas:vAlertas, salud:vSalud, gastos:vFinanzas, partners:vPartners})[v]();
}

// ── RECIBO ─────────────────────────────────────────────────────
function mRecibo(d) {
  // Si este cobro ya tiene un numero de recibo asignado anteriormente, lo reutiliza.
  // Solo pide un numero NUEVO a la secuencia si es la primera vez que se genera
  // un recibo para este cobro especifico. Asi abrir/cerrar el modal varias veces
  // no salta numeros.
  if (d.cobro_id) {
    sbFetch('panel_recibos?cobro_id=eq.' + d.cobro_id + '&select=numero&order=numero.desc&limit=1')
      .then(function(rows) {
        if (rows && rows.length) { gerarRecibo(d, rows[0].numero); }
        else { pedirNumeroYRegistrar(d); }
      }).catch(function(){ pedirNumeroYRegistrar(d); });
  } else {
    // Cobros sin id (ej. cobro rapido aun no guardado) siempre piden numero nuevo
    pedirNumeroYRegistrar(d);
  }
}

function pedirNumeroYRegistrar(d) {
  fetch(SB_URL + '/rest/v1/rpc/next_recibo_num', {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
    body: '{}'
  }).then(function(r){ return r.json(); }).then(function(num){
    dbIns('panel_recibos', { numero: num, cobro_id: d.cobro_id||null, cliente: d.cli||null, sistema: d.sis||null, monto: d.monto||null, fecha: d.fecha||null }).catch(function(){});
    gerarRecibo(d, num);
  }).catch(function(){ gerarRecibo(d, null); });
}

function gerarRecibo(d, numRec) {
  var w = window.open('', '_blank');
  if (!w) { alert('Permiti las ventanas emergentes para generar el recibo'); return; }
  var numStr = numRec ? String(numRec).padStart(4,'0') : String(d.num||'1').padStart(4,'0');
  var mn = M_LAB[d.met]||d.met||'-';
  var logoSrc = ge('logo') ? ge('logo').src : '';
  var ec = d.estado==='pagado' ? '#3D8A32' : '#854F0B';
  var eb = d.estado==='pagado' ? '#EDF7EA' : '#FAEEDA';
  var estadoLabel = d.estado==='pagado' ? 'PAGADO' : (d.estado==='parcial' ? 'PARCIAL' : 'PENDIENTE');
  var fechaStr = fdate(d.fecha);
  var montoStr = fmt(d.monto);
  var waNum = (d.tel||'').replace(/\D/g,'');
  var waTxt = 'Recibo N' + numStr + ' - ' + (d.desc||'Cobro') + ' - ' + montoStr + ' - ' + estadoLabel + ' | QP Cloud & IA';
  var waUrl = waNum
    ? 'https://wa.me/549' + waNum + '?text=' + encodeURIComponent(waTxt)
    : 'https://wa.me/?text=' + encodeURIComponent(waTxt);

  var css = [
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:"DM Sans",sans-serif;background:#F0F5FA;padding:32px 16px;color:#1a2e4a}',
    '.wrap{max-width:620px;margin:0 auto}',
    '.card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)}',
    '.stripe{height:5px;background:linear-gradient(90deg,#0B9EDA,#5BBD4E)}',
    '.body{padding:32px}',
    '.head{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:22px;border-bottom:2px solid #E6F6FD}',
    '.logo{height:52px;object-fit:contain}',
    '.rec-title{font-size:20px;font-weight:700;color:#0B9EDA;text-align:right}',
    '.rec-num{font-size:13px;color:#64748B;text-align:right;margin-top:3px}',
    '.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em}',
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px}',
    '.lb{font-size:10px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}',
    '.vl{font-size:14px;font-weight:500}',
    '.desc-box{background:#F8FAFC;border-radius:8px;padding:14px 16px;margin-bottom:20px}',
    '.tot{background:linear-gradient(135deg,#E6F6FD,#EDF7EA);border-radius:10px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}',
    '.tot-val{font-size:28px;font-weight:700;color:#0B9EDA}',
    '.ft{text-align:center;font-size:11px;color:#94A3B8;padding-top:16px;border-top:1px solid #F1F5F9;line-height:1.7}',
    '.actions{display:flex;gap:10px;margin-top:18px;justify-content:center}',
    '.btn{border:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;font-family:"DM Sans",sans-serif;text-decoration:none;display:inline-flex;align-items:center;gap:6px}',
    '.btn-p{background:#0B9EDA;color:#fff}',
    '.btn-w{background:#25D366;color:#fff}',
    '@media print{body{background:#fff;padding:0}.card{box-shadow:none}.actions{display:none}}'
  ].join('');

  var svgWa = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.859L.072 23.928l6.263-1.44A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-5.016-1.382l-.36-.214-3.732.858.893-3.63-.235-.374A9.787 9.787 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>';

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo #' + numStr + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">'
    + '<style>' + css + '</style></head><body>'
    + '<div class="wrap"><div class="card"><div class="stripe"></div><div class="body">'
    + '<div class="head"><img src="' + logoSrc + '" class="logo" alt="QP">'
    + '<div><div class="rec-title">Recibo de Pago</div>'
    + '<div class="rec-num">N&#176; ' + numStr + '  &bull;  ' + fechaStr + '</div>'
    + '<span class="badge" style="background:' + eb + ';color:' + ec + '">' + estadoLabel + '</span>'
    + '</div></div>'
    + '<div class="grid">'
    + '<div><div class="lb">Cliente</div><div class="vl">' + (d.cli||'-') + '</div></div>'
    + '<div><div class="lb">Servicio</div><div class="vl" style="display:flex;align-items:center;gap:6px">' + ({'ConeOS':'<img src="https://jcquarleri.vercel.app/coneos-logo.png" style="width:20px;height:20px;object-fit:contain;border-radius:4px">','El Piamonte':'<img src="https://jcquarleri.vercel.app/piamonte-logo.png" style="width:20px;height:20px;object-fit:contain;border-radius:4px">'}[d.sis]||'') + (d.sis||'-') + '</div></div>'
    + '<div><div class="lb">Metodo de pago</div><div class="vl">' + mn + '</div></div>'
    + '<div><div class="lb">Fecha</div><div class="vl">' + fechaStr + '</div></div>'
    + '</div>'
    + '<div class="desc-box"><div class="lb">Concepto</div><div class="vl" style="margin-top:4px">' + (d.desc||'-') + '</div></div>'
    + '<div class="tot"><span style="font-size:13px;font-weight:600;color:#0C6FA3">Total</span><span class="tot-val">' + montoStr + '</span></div>'
    + (d.saldoImpl != null ? (
        '<div class="desc-box" style="background:' + (d.saldoImpl > 0 ? '#FAEEDA' : '#EDF7EA') + '">'
        + '<div class="lb">Implementacion' + (d.faseLabel ? ' &mdash; ' + d.faseLabel : '') + '</div>'
        + (d.faseLabel ? (
            '<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px">'
            + '<span>Monto de la fase: <strong>' + fmt(d.faseMonto) + '</strong></span>'
            + '<span>Saldo de la fase: <strong>' + fmt(d.faseSaldo) + '</strong></span>'
            + '</div>'
          ) : '')
        + '<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px">'
        + '<span>Total acordado: <strong>' + fmt(d.totalImpl) + '</strong></span>'
        + '<span>Pagado: <strong>' + fmt(d.pagadoImpl) + '</strong></span>'
        + '</div>'
        + '<div style="margin-top:8px;font-size:14px;font-weight:700;color:' + (d.saldoImpl > 0 ? '#854F0B' : '#3D8A32') + '">'
        + (d.saldoImpl > 0 ? 'Saldo pendiente: ' + fmt(d.saldoImpl) : 'Implementacion saldada')
        + '</div></div>'
      ) : '')
    + '<div class="ft">QP Cloud &amp; Inteligencia Artificial<br>General Pico, La Pampa &bull; jcquarleri.vercel.app<br>Comprobante N&#176; ' + numStr + ' &bull; Valido como constancia de pago</div>'
    + '</div></div>'
    + '<div class="actions">'
    + '<button class="btn btn-p" onclick="window.print()">Imprimir / PDF</button>'
    + '<a class="btn btn-w" href="' + waUrl + '" target="_blank">' + svgWa + 'Enviar por WhatsApp</a>'
    + '</div></div>'
    + '</body></html>';

  w.document.write(html);
  w.document.close();
}

// ── DASHBOARD ──────────────────────────────────────────────────
function vDash() {
  cargar().then(function(D) {
    var hoy = new Date();
    var mesActual = hoy.getMonth() + 1;
    var anioActual = hoy.getFullYear();
    var als = calcAlertas(D.asigs, D.alertasDb);
    var pen = D.cobs.filter(function(c){ return (c.estado==='pendiente' || c.estado==='parcial') && !c._cli.revendedor_id && !c._cli.eliminado; });
    var totP = pen.reduce(function(s,c){ return s+saldoDe(c); }, 0);
    // Cobrado del mes: suma de PAGOS del mes (incluye parciales); los cobros viejos sin pagos hijos suman por fecha_pago
    var cobradoMes = D.cobs.filter(function(c){ return !c._cli.revendedor_id && !c._cli.eliminado; }).reduce(function(s,c){
      var ps = c._pagos||[];
      if (ps.length) {
        return s + ps.reduce(function(s2,p){
          if (!p.fecha) return s2;
          var f = new Date(p.fecha);
          return (f.getMonth()+1===mesActual && f.getFullYear()===anioActual) ? s2+Number(p.monto||0) : s2;
        }, 0);
      }
      if (c.estado==='pagado' && c.fecha_pago) {
        var f2 = new Date(c.fecha_pago);
        if (f2.getMonth()+1===mesActual && f2.getFullYear()===anioActual) return s+Number(c.monto||0);
      }
      return s;
    }, 0);
    var clsPropios = D.cls.filter(function(cl){ return !cl.revendedor_id && !cl.eliminado; });
    var clsConAsig = clsPropios.filter(function(cl){ return D.asigs.some(function(a){ return a.cliente_id===cl.id; }); });
    var clsSinSis = clsPropios.filter(function(cl){ return !D.asigs.some(function(a){ return a.cliente_id===cl.id; }); });
    var clsConDeuda = D.asigs.filter(function(a){ return totalFases(a) - pagadoImplementacion(a) > 0; }).map(function(a){ return a.cliente_id; });
    var clsDeuda = D.cls.filter(function(cl){ return clsConDeuda.indexOf(cl.id) >= 0; });
    var clsAlDia = clsConAsig.filter(function(cl){ return clsConDeuda.indexOf(cl.id) < 0; });
    var proxVenc = pen.filter(function(c){
      if (!c.fecha_vencimiento) return false;
      var diff = (new Date(c.fecha_vencimiento) - hoy) / (1000*60*60*24);
      return diff >= 0 && diff <= 30;
    }).sort(function(a,b){ return new Date(a.fecha_vencimiento)-new Date(b.fecha_vencimiento); }).slice(0,5);
    var ultCobs = D.cobs.filter(function(c){ return c.estado==='pagado' && c.fecha_pago; })
      .sort(function(a,b){ return new Date(b.fecha_pago)-new Date(a.fecha_pago); }).slice(0,5);
    var wrap = el('div', {});

    // Banner alertas
    if (als.length) {
      var banner = el('div', {class:'abanner'});
      banner.innerHTML = '&#128276;';
      var bannerText = el('div', {style:'flex:1'});
      bannerText.appendChild(el('b', {}, als.length + ' alerta' + (als.length!==1?'s':'') + ' pendiente' + (als.length!==1?'s':'')));
      bannerText.appendChild(el('div', {style:'font-size:11px;margin-top:2px'}, als.map(function(a){ return a.asig._cli.nombre + ' - ' + a.asig._sis.nombre; }).join(', ')));
      banner.appendChild(bannerText);
      banner.onclick = function(){ go('alertas'); };
      wrap.appendChild(banner);
    }

    // Fila 1: KPIs del mes
    wrap.appendChild(el('div', {class:'sh'}, [el('span', {class:'st'}, 'Este mes')]));
    var mets = el('div', {class:'mets'});
    [
      {color:'#EF9F27', label:'Por cobrar', val:fmt(totP), sub:pen.length+' pendiente'+(pen.length!==1?'s':'')},
      {color:'#7F77DD', label:'Cobrado este mes', val:fmt(cobradoMes)},
      {color:'#E53E3E', label:'Alertas', val:als.length, click:function(){ go('alertas'); }},
      {color:'#0B9EDA', label:'Sistemas activos', val:D.sis.filter(function(s){return s.activo;}).length+'/'+D.sis.length},
    ].forEach(function(m) {
      var met = el('div', {class:'met', style:'cursor:'+(m.click?'pointer':'default')});
      if (m.click) met.onclick = m.click;
      met.appendChild(el('div', {class:'mst', style:'background:'+m.color}));
      met.appendChild(el('div', {class:'mlb'}, m.label));
      met.appendChild(el('div', {class:'mv', style:'font-size:'+(m.val.toString().length>6?'18px':'26px')}, m.val));
      if (m.sub) met.appendChild(el('div', {class:'ms'}, m.sub));
      mets.appendChild(met);
    });
    wrap.appendChild(mets);

    // Fila 2: Estado clientes
    wrap.appendChild(el('div', {class:'sh'}, [el('span', {class:'st'}, 'Estado de clientes')]));
    var estadoCard = el('div', {class:'card', style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:16px'});
    [{label:'Al día', count:clsAlDia.length, color:'#3D8A32', bg:'#EDF7EA', items:clsAlDia},
     {label:'Con saldo pendiente', count:clsDeuda.length, color:'#A32D2D', bg:'#FCEBEB', items:clsDeuda},
     {label:'Sin sistema', count:clsSinSis.length, color:'#64748B', bg:'#F1F5F9', items:clsSinSis},
    ].forEach(function(g) {
      var col = el('div', {style:'background:'+g.bg+';border-radius:10px;padding:12px'});
      col.appendChild(el('div', {style:'font-size:11px;font-weight:600;color:'+g.color+';text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px'}, g.label));
      col.appendChild(el('div', {style:'font-size:28px;font-weight:700;color:'+g.color+';margin-bottom:8px'}, String(g.count)));
      g.items.slice(0,4).forEach(function(cl){
        col.appendChild(el('div', {style:'font-size:12px;color:#1a2e4a;padding:2px 0'}, cl.nombre+(cl.empresa?' — '+cl.empresa:'')));
      });
      if (g.items.length > 4) col.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-top:2px'}, '+'+(g.items.length-4)+' más'));
      estadoCard.appendChild(col);
    });
    wrap.appendChild(estadoCard);

    // Fila 3: Proximos vencimientos + Ultimos cobros
    var row3 = el('div', {style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:8px'});

    var vencWrap = el('div', {});
    vencWrap.appendChild(el('div', {class:'sh'}, [el('span', {class:'st'}, 'Próximos vencimientos')]));
    var vencCard = el('div', {class:'card'});
    if (!proxVenc.length) {
      vencCard.appendChild(el('div', {class:'emp'}, 'Sin vencimientos en los próximos 30 días'));
    } else {
      var vencTbl = el('table', {class:'tbl'});
      vencTbl.appendChild(elH('thead',{},'<tr><th>Cliente</th><th>Sistema</th><th>Monto</th><th>Vence</th></tr>'));
      var vencTb = el('tbody');
      proxVenc.forEach(function(c) {
        var diff = Math.round((new Date(c.fecha_vencimiento)-hoy)/(1000*60*60*24));
        var col2 = diff<=3?'#A32D2D':diff<=7?'#854F0B':'#1a2e4a';
        var tr = el('tr');
        tr.appendChild(el('td',{},c._cli.nombre||'-'));
        var td=el('td'); td.appendChild(chip(c._sis.nombre||'-')); tr.appendChild(td);
        tr.appendChild(el('td',{style:'font-weight:500;color:#854f0b'},fmt(c.monto)));
        tr.appendChild(el('td',{style:'color:'+col2+';font-size:12px'}, diff===0?'Hoy':diff===1?'Mañana':'En '+diff+'d'));
        vencTb.appendChild(tr);
      });
      vencTbl.appendChild(vencTb);
      vencCard.appendChild(vencTbl);
    }
    vencWrap.appendChild(vencCard);
    row3.appendChild(vencWrap);

    var cobsWrap = el('div', {});
    cobsWrap.appendChild(el('div', {class:'sh'}, [el('span', {class:'st'}, 'Últimos cobros')]));
    var cobsCard = el('div', {class:'card'});
    if (!ultCobs.length) {
      cobsCard.appendChild(el('div', {class:'emp'}, 'Sin cobros registrados'));
    } else {
      var cobsTbl = el('table', {class:'tbl'});
      cobsTbl.appendChild(elH('thead',{},'<tr><th>Cliente</th><th>Sistema</th><th>Monto</th><th>Fecha</th></tr>'));
      var cobsTb = el('tbody');
      ultCobs.forEach(function(c) {
        var tr = el('tr');
        tr.appendChild(el('td',{},c._cli.nombre||'-'));
        var td2=el('td'); td2.appendChild(chip(c._sis.nombre||'-')); tr.appendChild(td2);
        tr.appendChild(el('td',{style:'font-weight:500;color:#3D8A32'},fmt(c.monto)));
        tr.appendChild(el('td',{style:'font-size:12px;color:#64748B'},fdate(c.fecha_pago)));
        cobsTb.appendChild(tr);
      });
      cobsTbl.appendChild(cobsTb);
      cobsCard.appendChild(cobsTbl);
    }
    cobsWrap.appendChild(cobsCard);
    row3.appendChild(cobsWrap);
    wrap.appendChild(row3);
    setApp(wrap);
  }).catch(function(e) {
    setApp(el('div', {class:'emp', style:'color:red'}, 'Error cargando datos: ' + e.message));
  });
}


// ── ALERTAS ────────────────────────────────────────────────────
function vAlertas() {
  cargar().then(function(D) {
    var als = calcAlertas(D.asigs, D.alertasDb);
    var wrap = el('div', {});
    if (!als.length) {
      setApp(el('div', {class:'card'}, [el('div', {class:'emp'}, 'Sin alertas pendientes')]));
      return;
    }
    var sh = el('div', {class:'sh'});
    sh.appendChild(el('span', {class:'st'}, 'Alertas (' + als.length + ')'));
    wrap.appendChild(sh);
    als.forEach(function(al) {
      var row = el('div', {class:'aitem'});
      var cl = al.asig._cli.nombre, si = al.asig._sis.nombre, aid = al.asig.id;
      var info = el('div', {style:'flex:1'});
      info.appendChild(el('b', {}, cl));

      if (al.tipo === 'fee') {
        var dias = al.dias;
        var col = dias<0?'#A32D2D':dias<=3?'#854F0B':'#0F6E56';
        var bg  = dias<0?'#FCEBEB':dias<=3?'#FAEEDA':'#E1F5EE';
        var lbl = dias<0?'Vencido hace '+Math.abs(dias)+'d':dias===0?'Hoy':'En '+dias+'d';
        var sub = el('div', {style:'font-size:12px;color:#64748B;margin-top:3px'});
        sub.appendChild(chip(si));
        sub.appendChild(document.createTextNode(' Fee ' + MESES[al.mes-1] + ' ' + al.anio + ' ' + fmt(al.monto)));
        info.appendChild(sub);
        row.appendChild(info);
        row.appendChild(el('span', {style:'background:'+bg+';color:'+col+';padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500'}, lbl));
        var btn = el('button', {class:'btn btns btnsm'}, 'Cobrar fee');
        (function(a, c, s, m, mes, anio) {
          btn.onclick = function() { mCobrarFee(a, c, s, m, mes, anio); };
        })(aid, cl, si, al.monto, al.mes, al.anio);
        row.appendChild(btn);
        var btnIg = el('button', {class:'btn btnsm', style:'margin-left:4px;background:#F1F5F9;border-color:#F1F5F9;color:#64748B'}, 'Ignorar');
        (function(a, mes, anio) {
          btnIg.onclick = function() {
            if (!confirm('Ignorar el fee de ' + MESES[mes-1] + ' ' + anio + ' para este cliente?\n\nNo se va a generar ningun cobro ni recibo, solo deja de mostrarse la alerta.')) return;
            dbIns('panel_alertas', {asignacion_id:a, tipo:'fee_mensual', mes:mes, anio:anio, estado:'ignorado'}).then(function(){ vAlertas(); });
          };
        })(aid, al.mes, al.anio);
        row.appendChild(btnIg);
      } else {
        var pct = al.total>0 ? Math.round(al.pagado/al.total*100) : 0;
        var sub2 = el('div', {style:'font-size:12px;color:#64748B;margin-top:3px'});
        sub2.appendChild(chip(si));
        sub2.appendChild(document.createTextNode(' Saldo: ' + fmt(al.saldo) + ' de ' + fmt(al.total)));
        info.appendChild(sub2);
        var prog = el('div', {class:'qprog'}); prog.appendChild(el('div', {class:'qbar', style:'width:'+pct+'%'}));
        info.appendChild(prog);
        row.appendChild(info);
        var btn2 = el('button', {class:'btn btnp btnsm'}, 'Registrar entrega');
        (function(a, c, s, sal) {
          btn2.onclick = function() { mEntrega(a, c, s, sal); };
        })(al.asig, cl, si, al.saldo);
        row.appendChild(btn2);
      }
      wrap.appendChild(row);
    });
    setApp(wrap);
  });
}

// ── SISTEMAS ───────────────────────────────────────────────────
function abrirDrawerClientes(s) {
  if (!_D || !_D.asigs) { cargar().then(function(D){ _D=D; abrirDrawerClientes(s); }); return; }
  var D = _D;
  // Remover drawer anterior si existe
  var existing = document.getElementById('qp-drawer');
  if (existing) existing.remove();

  var asigsSis = (D.asigs||[]).filter(function(a){ return a.sistema_id===s.id; });

  var overlay = el('div', {id:'qp-drawer-overlay', style:'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.3);z-index:9998;backdrop-filter:blur(2px)'});
  overlay.onclick = function(){ drawer.remove(); overlay.remove(); };

  var drawer = el('div', {id:'qp-drawer', style:'position:fixed;top:0;right:0;width:420px;max-width:95vw;height:100%;background:#fff;z-index:9999;box-shadow:-4px 0 24px rgba(0,0,0,.15);display:flex;flex-direction:column;transition:transform .25s'});

  // Header
  var dh = el('div', {style:'display:flex;align-items:center;gap:12px;padding:20px 20px 16px;border-bottom:.5px solid #E2E8F0'});
  (function(){ dh.appendChild(getSisIconEl(s.nombre, 20)); })();
  var dhText = el('div', {style:'flex:1'});
  dhText.appendChild(el('div', {style:'font-size:15px;font-weight:700;color:#1a2e4a'}, s.nombre));
  dhText.appendChild(el('div', {style:'font-size:12px;color:#94a3b8'}, asigsSis.length+' cliente'+(asigsSis.length!==1?'s':'')+' asignado'+(asigsSis.length!==1?'s':'')));
  dh.appendChild(dhText);
  var btnClose = el('button', {style:'background:none;border:none;font-size:20px;cursor:pointer;color:#64748B;padding:4px'}, '×');
  btnClose.onclick = function(){ drawer.remove(); overlay.remove(); };
  dh.appendChild(btnClose);
  drawer.appendChild(dh);

  // Body
  var db = el('div', {style:'flex:1;overflow-y:auto;padding:16px'});

  if (!asigsSis.length) {
    db.appendChild(el('div', {class:'emp'}, 'Sin clientes asignados'));
  } else {
    asigsSis.forEach(function(a) {
      var cl = (D.cls||[]).find(function(c){ return c.id===a.cliente_id; }) || {};
      var cobsA = (D.cobs||[]).filter(function(c){ return c.asignacion_id===a.id; });
      var pagado = cobsA.filter(function(c){ return c.estado==='pagado' && c.tipo_cobro==='implementacion'; }).reduce(function(s,c){ return s+Number(c.monto); },0);
      var saldo = Number(a.costo_implementacion||0) - pagado;
      var pendFees = cobsA.filter(function(c){ return c.estado!=='pagado' && c.tipo_cobro==='fee'; }).length;

      var card = el('div', {style:'background:#F8FAFC;border:.5px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:10px'});

      // Cliente nombre + avatar
      var top = el('div', {style:'display:flex;align-items:center;gap:10px;margin-bottom:10px'});
      var initials = (cl.nombre||'?').split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
      var av = el('div', {style:'width:36px;height:36px;border-radius:50%;background:#1A7FE8;color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0'}, initials);
      top.appendChild(av);
      var info = el('div', {style:'flex:1'});
      info.appendChild(el('div', {style:'font-weight:600;font-size:14px;color:#1a2e4a'}, cl.nombre||'Cliente'));
      info.appendChild(el('div', {style:'font-size:11px;color:#94a3b8'}, cl.empresa||cl.telefono||''));
      top.appendChild(info);
      var estadoChip = chipClass(a.activo?'Activo':'Inactivo', a.activo?'cv':'ca');
      top.appendChild(estadoChip);
      card.appendChild(top);

      // Métricas impl + fee
      var mets = el('div', {style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px'});
      [{label:'Impl. pagado', val:fmt(pagado), col:'#3D8A32'},
       {label:'Saldo impl.', val:fmt(saldo), col:saldo>0?'#854F0B':'#3D8A32'},
       {label:'Fees pend.', val:String(pendFees), col:pendFees>0?'#A32D2D':'#64748B'}
      ].forEach(function(m){
        var mc = el('div', {style:'text-align:center;background:#fff;border-radius:6px;padding:8px 4px;border:.5px solid #E2E8F0'});
        mc.appendChild(el('div', {style:'font-size:13px;font-weight:500;color:'+m.col}, m.val));
        mc.appendChild(el('div', {style:'font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;margin-top:2px'}, m.label));
        mets.appendChild(mc);
      });
      card.appendChild(mets);

      // Botón vincular empresa ConeOS (si es ConeOS)
      if (s.nombre === 'ConeOS') {
        var btnVinc = el('button', {class:'btn btnsm', style:'margin-top:6px;width:100%;color:'+(a.coneos_empresa_id?'#3D8A32':'#854F0B')}, a.coneos_empresa_id ? '✅ Empresa vinculada — cambiar' : '⚠ Vincular empresa ConeOS');
        (function(aa){ btnVinc.onclick = function(){ drawer.remove(); overlay.remove(); mVincularEmpresaConeos(aa); }; })(a);
        card.appendChild(btnVinc);
      }

      // Botón ir a cliente
      var btnIr = el('button', {class:'btn btnsm', style:'margin-top:10px;width:100%'}, 'Ver cliente completo →');
      (function(clienteId){ btnIr.onclick = function(){
        drawer.remove(); overlay.remove();
        go('clientes');
        // Highlight el cliente después de que renderice
        setTimeout(function(){
          var cards = document.querySelectorAll('.cc');
          cards.forEach(function(card){
            if (card.dataset.clienteId === clienteId) {
              card.scrollIntoView({behavior:'smooth', block:'center'});
              card.style.transition = 'box-shadow .3s';
              card.style.boxShadow = '0 0 0 3px #1A7FE8';
              setTimeout(function(){ card.style.boxShadow = ''; }, 2000);
            }
          });
        }, 400);
      }; })(cl.id);
      card.appendChild(btnIr);

      db.appendChild(card);
    });
  }
  drawer.appendChild(db);
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
}

function vSistemas() {
  var sisPromise = sbFetch('panel_sistemas?select=*&order=orden.asc,nombre.asc');
  var dataPromise = _D ? Promise.resolve(_D) : cargar().then(function(D){ _D=D; return D; });
  Promise.all([sisPromise, dataPromise]).then(function(rs) {
    var sis = rs[0].filter(function(s){ return s.id !== '45d2d4de-e938-4a95-827d-f29f575eff10'; });
    var wrap = el('div', {});
    var sh = el('div', {class:'sh'});
    sh.appendChild(el('span', {class:'st'}, 'Sistemas (' + sis.length + ')'));
    var btnGH = el('button', {class:'btn', style:'margin-right:6px'}, 'Importar de GitHub');
    btnGH.onclick = function() { mImportarGitHub(); };
    sh.appendChild(btnGH);
    var btnN = el('button', {class:'btn btnp'}, '+ Nuevo sistema');
    btnN.onclick = function() { mNuevoSistema(); };
    sh.appendChild(btnN);
    wrap.appendChild(sh);

    if (!sis.length) {
      wrap.appendChild(el('div', {class:'card'}, [el('div', {class:'emp'}, 'No hay sistemas todavia')]));
    } else {
      var SIS_CONFIG = {
        'Cortelab':    {letra:'CL', color:'#16A34A', bgLetra:'#DCFCE7', emoji:'📐'},
        'El Piamonte': {letra:'EP', color:'#0284C7', bgLetra:'#E0F2FE', emoji:'🚗', logoUrl:'https://jcquarleri.vercel.app/piamonte-logo.png'},
        'MobixERP':    {letra:'MX', color:'#7C3AED', bgLetra:'#EDE9FE', emoji:'📱'},
        'ConeOS':      {letra:'CO', color:'#F59E0B', bgLetra:'#FEF3C7', emoji:'🍦', logoUrl:'https://jcquarleri.vercel.app/coneos-logo.png'},
      };

      sis.forEach(function(s) {
        var cfg = SIS_CONFIG[s.nombre] || {letra:'--', color:'#64748B', bgLetra:'#F1F5F9'};
        var card = el('div', {class:'card', style:'margin-bottom:14px;padding:0'});

        // Header igual a ConeOS: dos filas, toggle+editar a la derecha
        var hdr = el('div', {style:'padding:12px 14px 8px'});
        var topRow = el('div', {style:'display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:nowrap'});
        // Ícono: emoji si tiene, si no letra
        var icono = cfg.logoUrl
          ? el('img', {src:cfg.logoUrl, style:'width:28px;height:28px;object-fit:contain;border-radius:6px;flex-shrink:0'})
          : cfg.emoji
            ? el('span', {style:'font-size:22px;line-height:1'}, cfg.emoji)
            : el('span', {style:'width:28px;height:28px;border-radius:50%;background:'+cfg.bgLetra+';color:'+cfg.color+';font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0'}, cfg.letra);
        topRow.appendChild(icono);
        topRow.appendChild(el('span', {style:'font-size:14px;font-weight:700;color:'+cfg.color}, s.nombre));
        var tc = s.tipo==='multi_empresa'?'cp':s.tipo==='multi_usuario'?'ct':s.tipo==='saas'?'cb':'cgr';
        topRow.appendChild(chipClass(T_LAB[s.tipo]||s.tipo, tc));
        topRow.appendChild(chipClass(P_LAB[s.plataforma]||s.plataforma, 'cb'));
        // Toggle + Editar a la derecha
        var rightControls = el('div', {style:'display:flex;align-items:center;gap:8px;margin-left:auto'});
        var tog = el('label', {class:'tog'});
        var inp = el('input', {type:'checkbox'}); if (s.activo) inp.checked = true;
        (function(ss, t){ inp.onchange = function(){
          if (!this.checked && !confirm('¿Desactivar '+ss.nombre+'? El sistema quedará inaccesible.')) { t.checked = true; return; }
          dbUpd('panel_sistemas', ss.id, {activo:this.checked});
        }; })(s, inp);
        tog.appendChild(inp); tog.appendChild(el('span', {class:'sl'}));
        rightControls.appendChild(tog);
        var btnE2 = el('button', {class:'btn btnsm'}, 'Editar');
        (function(ss){ btnE2.onclick = function(){ mEditSistema(ss); }; })(s);
        rightControls.appendChild(btnE2);
        topRow.appendChild(rightControls);
        hdr.appendChild(topRow);
        if (s.url_produccion) hdr.appendChild(el('div', {style:'font-size:12px;color:#94a3b8;margin-bottom:2px'}, s.url_produccion));
        // KPIs comerciales del sistema (suma de todas las asignaciones)
        var kpiLine = el('div', {style:'font-size:11px;color:#64748B;display:flex;gap:6px 12px;flex-wrap:wrap;margin-top:4px;align-items:center'});
        var asigsSis = (_D && _D.asigs ? _D.asigs : []).filter(function(a){ return a.sistema_id === s.id; });
        var totImplSis = asigsSis.reduce(function(sum,a){ return sum + totalFases(a); }, 0);
        var pagImplSis = asigsSis.reduce(function(sum,a){ return sum + pagadoImplementacion(a); }, 0);
        var saldoImplSis = totImplSis - pagImplSis;
        var feeSis = asigsSis.reduce(function(sum,a){ return sum + Number(a.fee_mensual||0); }, 0);
        kpiLine.appendChild(el('span', {}, 'Impl. '+fmt(totImplSis)));
        var saldoChip = el('span', {style:'color:'+(saldoImplSis>0?'#A32D2D':'#3B6D11')+';font-weight:500'}, saldoImplSis>0?' (saldo '+fmt(saldoImplSis)+')':' ✓ saldada');
        kpiLine.appendChild(saldoChip);
        kpiLine.appendChild(el('span', {style:'color:#E2E8F0;font-size:10px'}, '·'));
        kpiLine.appendChild(el('span', {}, 'Fee total: '+fmt(feeSis)+'/mes'));
        hdr.appendChild(kpiLine);
        card.appendChild(hdr);

        // Métricas
        var metRow = el('div', {style:'border-top:.5px solid #E2E8F0'});
        if (s.supabase_url && s.supabase_key) {
          var nombreLM = (s.nombre||'').toLowerCase();
          metRow.appendChild(el('div', {style:'padding:10px 14px;text-align:center;color:#94a3b8;font-size:12px'}, 'Cargando...'));
          card.appendChild(metRow);

          function renderTablaSlug(rows, cols, emptyMsg) {
            metRow.innerHTML = '';
            if (!Array.isArray(rows) || !rows.length) { metRow.innerHTML = '<div style="padding:10px 14px;color:#94a3b8;font-size:12px">'+emptyMsg+'</div>'; return; }
            var tbl2 = el('table',{class:'tbl'});
            var thead = '<tr>'+cols.map(function(c){ return '<th'+(c.right?' style="text-align:right"':c.center?' style="text-align:center"':'')+'>'+(c.label||'')+'</th>'; }).join('')+'<th></th></tr>';
            tbl2.appendChild(elH('thead',{},thead));
            var tb2 = el('tbody',{});
            rows.forEach(function(n) {
              var tr2 = el('tr',{});
              var rowDetailFn = function(){ return Promise.resolve([]); };
              cols.forEach(function(c) {
                var td = el('td',{style:(c.right?'text-align:right;':'')+(c.center?'text-align:center;':'')+(c.color?'color:'+c.color+';':'')+(c.bold?'font-weight:500;':'')});
                if (c.render) { var nodes = c.render(n); if (Array.isArray(nodes)) nodes.forEach(function(nd){ td.appendChild(nd); }); else td.textContent = nodes; }
                else td.textContent = c.val ? c.val(n) : '';
                tr2.appendChild(td);
                if (c.detailFn) rowDetailFn = c.detailFn;
              });
              // Boton Ver que despliega ordenes
              var btnVer2 = el('button',{class:'btn btnsm'},'Ver');
              (function(row, detailFn) {
                var open = false;
                var detailRow = null;
                btnVer2.onclick = function() {
                  if (open && detailRow) { detailRow.remove(); open=false; btnVer2.textContent='Ver'; return; }
                  btnVer2.textContent='Cargando...';
                  detailFn(row).then(function(items) {
                    btnVer2.textContent='Cerrar';
                    open = true;
                    detailRow = el('tr',{});
                    var tdD = el('td',{colspan:String(cols.length+1),style:'padding:0;background:#F8FAFC'});
                    if (!items || !items.length) { tdD.appendChild(el('div',{style:'padding:8px 14px;font-size:12px;color:#94a3b8'},'Sin registros')); }
                    else {
                      var dtbl = el('table',{class:'tbl',style:'margin:0'});
                      dtbl.appendChild(elH('thead',{},'<tr style="background:#F1F5F9"><th>#</th><th>Descripcion</th><th style="text-align:right">Total</th><th>Estado</th><th>Fecha</th></tr>'));
                      var dtb = el('tbody',{});
                      items.forEach(function(it) {
                        var dtr = el('tr',{});
                        dtr.appendChild(el('td',{style:'font-size:11px;color:#94a3b8'},String(it.numero||'-')));
                        dtr.appendChild(el('td',{style:'font-size:12px'},it.desc||'-'));
                        dtr.appendChild(el('td',{style:'text-align:right;font-size:12px;color:#3D8A32'},it.total>0?fmt(it.total):'-'));
                        dtr.appendChild(el('td',{style:'font-size:11px'},it.estado||'-'));
                        dtr.appendChild(el('td',{style:'font-size:11px;color:#94a3b8'},it.fecha?fdate(it.fecha):'-'));
                        dtb.appendChild(dtr);
                      });
                      dtbl.appendChild(dtb); tdD.appendChild(dtbl);
                    }
                    detailRow.appendChild(tdD);
                    tr2.after(detailRow);
                  }).catch(function(){ btnVer2.textContent='Ver'; });
                };
              })(n, rowDetailFn);
              tr2.appendChild(el('td',{},[btnVer2]));
              tb2.appendChild(tr2);
            });
            tbl2.appendChild(tb2); tbl2.style.gridColumn = '1 / -1'; metRow.appendChild(tbl2);
          }


          function renderKPIs(data, col) {
            col.innerHTML = '';
            col.style.display = 'grid';
            col.style.gridTemplateColumns = 'repeat(auto-fit,minmax(90px,1fr))';
            data.forEach(function(m) {
              var cell = el('div', {style:'padding:8px 6px;text-align:center;border-right:.5px solid #E2E8F0;min-width:0'});
              cell.appendChild(el('div', {style:'font-size:'+(m.big?'16':'13')+'px;font-weight:600;color:'+m.col+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap'}, m.val));
              cell.appendChild(el('div', {style:'font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-top:2px'}, m.label));
              col.appendChild(cell);
            });
          }

          if (nombreLM.indexOf('mobixerp') >= 0) {
            fetch(SB_URL+'/rest/v1/rpc/get_metricas_negocios', {method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'},body:'{}'}).then(function(r){return r.json();}).then(function(negocios) {
              if (!Array.isArray(negocios)||!negocios.length){ metRow.innerHTML='<div style="padding:10px 14px;color:#94a3b8;font-size:12px">Sin negocios</div>'; return; }
              // Totales sumados
              var totOS = negocios.reduce(function(s,n){ return s+(n.ordenes_mes||0); },0);
              var totFac = negocios.reduce(function(s,n){ return s+Number(n.facturacion_mes||0); },0);
              var totTotal = negocios.reduce(function(s,n){ return s+(n.total_ordenes||0); },0);
              var ultOrden = negocios.reduce(function(u,n){ return (!u||n.ultima_orden>u)?n.ultima_orden:u; },null);
              // Celus en stock — fetch separado
              var SB_URL_M = s.supabase_url ? s.supabase_url.replace(/\/$/, '') : '';
              var SB_KEY_M = s.supabase_key || SB_KEY;
              fetch(SB_URL+'/rest/v1/v_stock_actual?select=id', {headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}})
              .then(function(r){return r.json();}).then(function(stock){
                var celusStock = Array.isArray(stock) ? stock.length : '?';
                renderKPIs([
                  {label:'Ventas este mes', val:String(totOS), col:'#0B9EDA', big:true},
                  {label:'Facturado mes', val:totFac>0?fmt(totFac):'$0', col:'#3D8A32', big:true},
                  {label:'Celus en stock', val:String(celusStock), col:'#7C3AED'},
                  {label:'Ultima actividad', val:ultOrden?fdate(ultOrden):'-', col:'#6366F1'}
                ], metRow);
              }).catch(function(){
                renderKPIs([
                  {label:'Ventas este mes', val:String(totOS), col:'#0B9EDA', big:true},
                  {label:'Facturado mes', val:totFac>0?fmt(totFac):'$0', col:'#3D8A32', big:true},
                  {label:'Celus en stock', val:'-', col:'#7C3AED'},
                  {label:'Ultima actividad', val:ultOrden?fdate(ultOrden):'-', col:'#6366F1'}
                ], metRow);
              });
              // Hint doble click
              var hint = el('div',{style:'font-size:10px;color:#94a3b8;text-align:center;padding:4px;cursor:pointer;border-top:.5px solid #F1F5F9'},'Doble click para ver por negocio');
              hint.style.gridColumn = '1 / -1';
              metRow.appendChild(hint);
              var detalleOpen = false;
              function toggleDetalle() {
                if (detalleOpen) { metRow.removeChild(metRow.lastChild); hint.textContent='Doble click para ver por negocio'; detalleOpen=false; return; }
                hint.textContent='Doble click para ocultar';
                detalleOpen = true;
                renderTablaSlug(negocios, [
                {label:'Negocio', bold:true, render:function(n){ return [el('div',{},n.nombre),el('div',{style:'font-size:11px;color:#94a3b8'},n.slug)]; }, detailFn:function(n){
                  return fetch(s.supabase_url+'/rest/v1/ordenes_service?negocio_id=eq.'+(n.negocio_id||n.id)+'&select=id,numero,falla_reportada,precio_cliente,estado,created_at&order=created_at.desc&limit=10',{headers:{apikey:s.supabase_key,Authorization:'Bearer '+s.supabase_key}}).then(function(r){return r.json();}).then(function(rows){ return (rows||[]).map(function(o){return{numero:o.numero,desc:o.falla_reportada,total:Number(o.precio_cliente||0),estado:o.estado,fecha:o.created_at};}); });
                }},
                {label:'OS este mes', center:true, color:'#0B9EDA', bold:true, val:function(n){ return String(n.ordenes_mes||0); }},
                {label:'Facturado mes', right:true, color:'#3D8A32', val:function(n){ return Number(n.facturacion_mes||0)>0?fmt(Number(n.facturacion_mes)):'-'; }},
                {label:'Ultima OS', right:true, val:function(n){ return n.ultima_orden?fdate(n.ultima_orden):'-'; }}
              ], 'Sin negocios');
              }
              metRow.ondblclick = toggleDetalle;
              hint.ondblclick = toggleDetalle;
            }).catch(function(e){ console.error('MobixERP',e); metRow.innerHTML='<div style="padding:10px 14px;color:#94a3b8;font-size:12px">Error MobixERP</div>'; });

          } else if (nombreLM.indexOf('coneos') >= 0) {
            coneosCall('estado_general').then(function(empresas) {
              if (!Array.isArray(empresas)||!empresas.length){ metRow.innerHTML='<div style="padding:10px 14px;color:#94a3b8;font-size:12px">Sin empresas</div>'; return; }
              var totPH = empresas.reduce(function(s,e){ return s+(e.pedidos_hoy||0); },0);
              var totFH = empresas.reduce(function(s,e){ return s+Number(e.facturacion_hoy||0); },0);
              var totAct = empresas.filter(function(e){ return e.activo; }).length;
              var ultActC = empresas.reduce(function(u,e){ var v=e.ultima_orden||e.last_order||''; return (!u||v>u)?v:u; },null);
              renderKPIs([
                {label:'Pedidos mes', val:String(totPH), col:'#0B9EDA', big:true},
                {label:'Facturado mes', val:totFH>0?fmt(totFH):'$0', col:'#3D8A32', big:true},
                {label:'Ticket promedio', val:totPH>0?fmt(Math.round(totFH/totPH)):'-', col:'#F59E0B'},
                {label:'Ultima actividad', val:ultActC?fdate(ultActC):'-', col:'#6366F1'}
              ], metRow);
              var hintC = el('div',{style:'font-size:10px;color:#94a3b8;text-align:center;padding:4px;cursor:pointer;border-top:.5px solid #F1F5F9'},'Doble click para ver por empresa');
              hintC.style.gridColumn = '1 / -1';
              metRow.appendChild(hintC);
              var detC = false;
              var detCEl2 = null;
              function toggleC() {
                if (detC && detCEl2) { detCEl2.remove(); detCEl2=null; hintC.textContent='Doble click para ver por empresa'; detC=false; return; }
                hintC.textContent='Doble click para ocultar'; detC=true;
                detCEl2 = el('div',{style:'border-top:.5px solid #E2E8F0'});
                detCEl2.style.gridColumn = '1 / -1';
                metRow.appendChild(detCEl2);
                // Fee review
                var feeSection = el('div',{style:'padding:12px 16px;background:#FFFBEB;border-bottom:.5px solid #FEF3C7'});
                feeSection.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#854F0B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'},'Revision de fee'));
                var feeLoad = el('div',{style:'font-size:12px;color:#94a3b8'},'Calculando...');
                feeSection.appendChild(feeLoad);
                detCEl2.appendChild(feeSection);
                // Excluir empresas vinculadas a clientes demo del panel
                var empresasDemoIds = (_D && _D.asigs || []).filter(function(a){
                  return a.coneos_empresa_id && a._cli && a._cli.es_demo;
                }).map(function(a){ return a.coneos_empresa_id; });
                Promise.all([cargarConfigPrecios()].concat(empresas.filter(function(e){ return e.activo && empresasDemoIds.indexOf(e.id) < 0 && String(e.slug||'').indexOf('demo') !== 0; }).map(function(e){
                  return coneosCall('metricas_empresa',{empresa_id:e.id}).then(function(m){ return {emp:e, disp:m.dispositivos_activos||0, fee:m.fee_mensual||75000}; }).catch(function(){ return {emp:e, disp:0, fee:75000}; });
                }))).then(function(resultsAll){
                  var cfgP = resultsAll[0];
                  var results = resultsAll.slice(1);
                  var dispInc = (cfgP && cfgP.fee && cfgP.fee.dispositivos_incluidos) || 4;
                  feeLoad.innerHTML = '';
                  var feeTotal = results.reduce(function(s,r){ return s+r.fee; },0);
                  results.forEach(function(r){
                    var fRow=el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:5px 0;font-size:12px;border-bottom:.5px solid #FEF3C7'});
                    var lft=el('div',{style:'flex:1;min-width:0;display:flex;align-items:baseline;gap:8px'});
                    lft.appendChild(el('span',{style:'font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'},r.emp.nombre));
                    lft.appendChild(el('span',{style:'font-size:10px;color:#94a3b8;white-space:nowrap'},r.disp+' disp.'+(r.disp>dispInc?' ⚠':'')));
                    fRow.appendChild(lft);
                    fRow.appendChild(el('span',{style:'font-weight:600;white-space:nowrap;color:'+(r.disp>dispInc?'#854F0B':'#3D8A32')},fmt(r.fee)+'/mes'));
                    feeLoad.appendChild(fRow);
                  });
                  var totRow=el('div',{style:'display:flex;justify-content:space-between;padding-top:8px;margin-top:4px;border-top:.5px solid #FEF3C7;font-weight:700;font-size:14px'});
                  totRow.appendChild(el('span',{},'Total fee mensual')); totRow.appendChild(el('span',{style:'color:#F59E0B'},fmt(feeTotal)+'/mes'));
                  feeLoad.appendChild(totRow);
                });
                var tblWrap=el('div',{style:'overflow-x:auto;-webkit-overflow-scrolling:touch'});
                var tblC=el('table',{class:'tbl',style:'min-width:400px'});
                tblC.appendChild(elH('thead',{},'<tr><th>Empresa</th><th style="text-align:center">Pedidos hoy</th><th style="text-align:right">Facturado hoy</th><th style="text-align:center">Estado</th><th></th></tr>'));
                var tbC=el('tbody',{});
                empresas.forEach(function(emp){
                  var tr=el('tr',{});
                  var tdN=el('td',{style:'font-weight:500'});
                  tdN.appendChild(el('div',{},emp.nombre));
                  tdN.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},emp.slug));
                  tr.appendChild(tdN);
                  tr.appendChild(el('td',{style:'text-align:center;font-weight:500;color:#0B9EDA'},String(emp.pedidos_hoy||0)));
                  tr.appendChild(el('td',{style:'text-align:right;color:#3D8A32'},emp.facturacion_hoy>0?fmt(emp.facturacion_hoy):'-'));
                  tr.appendChild(el('td',{style:'text-align:center'},[chipClass(emp.activo?'Activo':'Inactivo',emp.activo?'cv':'ca')]));
                  var btnVc=el('button',{class:'btn btnsm'},'Ver');
                  (function(e){ btnVc.onclick=function(){ vConeosEmpresa(e); }; })(emp);
                  tr.appendChild(el('td',{},[btnVc]));
                  tbC.appendChild(tr);
                });
                tblC.appendChild(tbC); tblWrap.appendChild(tblC); detCEl2.appendChild(tblWrap);
              }
              metRow.ondblclick = toggleC; hintC.ondblclick = toggleC;
            }).catch(function(){ metRow.innerHTML='<div style="padding:10px 14px;color:#94a3b8;font-size:12px">Error ConeOS</div>'; });
            // ConeOS footer - misma linea que los otros sistemas
            // se agrega en el footer general de abajo

          } else if (nombreLM.indexOf('cortelab') >= 0) {
            var cortKey = s.supabase_key;
            var cortUrl = s.supabase_url;
            fetch(cortUrl+'/rest/v1/rpc/get_metricas_talleres',{method:'POST',headers:{apikey:cortKey,Authorization:'Bearer '+cortKey,'Content-Type':'application/json'},body:'{}'}).then(function(r){return r.json();}).then(function(talleres){
              if (!Array.isArray(talleres)||!talleres.length){ metRow.innerHTML='<div style="padding:10px 14px;color:#94a3b8;font-size:12px">Sin talleres</div>'; return; }
              var totOM = talleres.reduce(function(s,t){ return s+(t.ordenes_mes||0); },0);
              var totFM = talleres.reduce(function(s,t){ return s+Number(t.facturacion_mes||0); },0);
              var totTot = talleres.reduce(function(s,t){ return s+(t.total_ordenes||0); },0);
              var ultT = talleres.reduce(function(u,t){ return (!u||t.ultima_orden>u)?t.ultima_orden:u; },null);
              var totPend = talleres.reduce(function(s,t){ return s+(t.presupuestos_pendientes||0); },0);
              // Cargar conteos por estado desde orders directamente
              fetch(cortUrl+'/rest/v1/orders?select=status',{headers:{apikey:cortKey,Authorization:'Bearer '+cortKey}}).then(function(r){return r.json();}).then(function(allOrders){
                var ingresados = (allOrders||[]).length;
                var enProd = (allOrders||[]).filter(function(o){ return o.status==='en_produccion'; }).length;
                var entregados = (allOrders||[]).filter(function(o){ return o.status==='entregado'; }).length;
                renderKPIs([
                  {label:'Ingresados', val:String(ingresados), col:'#0B9EDA', big:true},
                  {label:'En producción', val:String(enProd), col:'#F59E0B', big:true},
                  {label:'Entregados', val:String(entregados), col:'#3D8A32', big:true},
                  {label:'Ultima actividad', val:ultT?fdate(ultT):'-', col:'#6366F1'}
                ], metRow);
              }).catch(function(){ renderKPIs([{label:'Ingresados',val:'?',col:'#94a3b8',big:true},{label:'En producción',val:'?',col:'#94a3b8',big:true},{label:'Entregados',val:'?',col:'#94a3b8',big:true},{label:'Ultima actividad',val:ultT?fdate(ultT):'-',col:'#6366F1'}],metRow); });
              var hintT = el('div',{style:'font-size:10px;color:#94a3b8;text-align:center;padding:4px;cursor:pointer;border-top:.5px solid #F1F5F9'},'Doble click para ver por taller');
              hintT.style.gridColumn = '1 / -1';
              metRow.appendChild(hintT);
              var detT = false;
              var detTEl = null;
              function toggleT() {
                if (detT && detTEl) { detTEl.remove(); detTEl=null; hintT.textContent='Doble click para ver por taller'; detT=false; return; }
                hintT.textContent='Doble click para ocultar'; detT=true;
                detTEl = el('div',{style:'border-top:.5px solid #E2E8F0'});
                detTEl.style.gridColumn = '1 / -1';
                metRow.appendChild(detTEl);
                var origMRT = metRow; metRow = detTEl;
                renderTablaSlug(talleres, [
                {label:'Taller', bold:true, render:function(t){ 
                  var dias = t.fecha_vencimiento ? Math.ceil((new Date(t.fecha_vencimiento)-new Date())/86400000) : null;
                  var vcto = dias!==null ? el('div',{style:'font-size:11px;color:'+(dias<=7?'#A32D2D':dias<=30?'#854F0B':'#94a3b8')},'Vence '+fdate(t.fecha_vencimiento)+(dias<=30?' ('+dias+'d)':'')) : el('span',{});
                  return [el('div',{},t.nombre), el('div',{style:'font-size:11px;color:#94a3b8'},t.slug||''), vcto]; 
                }, detailFn:function(t){
                  return fetch(cortUrl+'/rest/v1/orders?taller_id=eq.'+t.taller_id+'&select=numero,material,total_price,status,created_at&order=created_at.desc&limit=10',{headers:{apikey:cortKey,Authorization:'Bearer '+cortKey}}).then(function(r){return r.json();}).then(function(rows){ return (rows||[]).map(function(o){return{numero:o.numero,desc:o.material,total:Number(o.total_price||0),estado:o.status,fecha:o.created_at};}); });
                }},
                {label:'Plan', val:function(t){ return t.plan||'-'; }},
                {label:'Pedidos mes', center:true, color:'#0B9EDA', bold:true, val:function(t){ return String(t.ordenes_mes||0); }},
                {label:'Facturado mes', right:true, color:'#3D8A32', val:function(t){ return Number(t.facturacion_mes||0)>0?fmt(Number(t.facturacion_mes)):'-'; }},
                {label:'Ultima orden', right:true, val:function(t){ return t.ultima_orden?fdate(t.ultima_orden):'-'; }}
              ], 'Sin talleres');
                metRow = origMRT;
              }
              metRow.ondblclick = toggleT; hintT.ondblclick = toggleT;
            }).catch(function(){ metRow.innerHTML='<div style="padding:10px 14px;color:#94a3b8;font-size:12px">Error Cortelab</div>'; });

          } else {
            metRow.style.display = 'grid';
            metRow.style.gridTemplateColumns = 'repeat(auto-fit,minmax(100px,1fr))';
            cargarMetricasSis(s, metRow);
          }
        } else {
          [[fmt(s.costo_implementacion),'Implementacion'],[fmt(s.fee_mensual)+'/mes','Fee mensual'],[fmt(s.precio_empresa_extra||0),'Extra/entidad'],[s.url_produccion||'-','URL']].forEach(function(m) {
            var cell = el('div', {style:'padding:10px 14px;text-align:center;border-right:.5px solid #E2E8F0'});
            cell.appendChild(el('div', {style:'font-size:13px;font-weight:600;color:#1a2e4a'}, m[0]));
            cell.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;margin-top:2px'}, m[1]));
            metRow.appendChild(cell);
          });
          card.appendChild(metRow);
        }

        // Footer con botones
        var footer = el('div', {style:'display:flex;gap:8px;padding:8px 14px 10px;flex-wrap:wrap'});
        var btnClientes = el('button', {class:'btn btnsm'}, 'Clientes →');
        (function(ss){ btnClientes.onclick = function(e){ e.stopPropagation(); abrirDrawerClientes(ss); }; })(s);
        footer.appendChild(btnClientes);
        // ConeOS: Gestionar empresas
        if ((s.nombre||'').toLowerCase().indexOf('coneos') >= 0) {
          var btnGE = el('button', {class:'btn btnsm'}, 'Gestionar empresas');
          btnGE.onclick = function(){ vConeos(); };
          footer.appendChild(btnGE);
        }
        var nombreL = (s.nombre||'').toLowerCase();
        if (s.supabase_url && s.supabase_key) {
          if (nombreL.indexOf('cortelab') >= 0) {
            var btnT = el('button', {class:'btn btnsm'}, 'Gestionar talleres');
            (function(ss){ btnT.onclick = function(){ mSistemaTalleres(ss); }; })(s);
            footer.appendChild(btnT);
          } else if (nombreL.indexOf('mobixerp') >= 0) {
            var btnM = el('button', {class:'btn btnsm'}, 'Gestionar negocios');
            (function(ss){ btnM.onclick = function(){ mSistemaNegocios(ss); }; })(s);
            footer.appendChild(btnM);
          } else if (nombreL.indexOf('piamonte') >= 0) {
            var btnPiam = el('button', {class:'btn btnsm', style:'background:#E8855A;border-color:#E8855A;color:#fff'}, 'Gestionar fases');
            btnPiam.onclick = function(){ mFasesElPiamonte(); };
            footer.appendChild(btnPiam);
          }
        }
        // Botón fases estructurales para todos los sistemas que las tengan
        if ((_D && _D.fasesEstructura || []).some(function(f){ return f.sistema_id === s.id; })) {
          var btnFE = el('button', {class:'btn btnsm', style:'background:#6366F1;border-color:#6366F1;color:#fff'}, '⚙ Fases del sistema');
          (function(ss){ btnFE.onclick = function(){ mGestionFasesEstructura(ss); }; })(s);
          footer.appendChild(btnFE);
        }
        card.appendChild(footer);
        wrap.appendChild(card);
      });
    }

    setApp(wrap);
  });
}

// TALLERES DEL SISTEMA (ej: Cortelab)
function mSistemaTalleres(s) {
  var url = s.supabase_url.replace(/\/$/,'');
  function edgeFn(body) {
    return fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/sistema-clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg' },
      body: JSON.stringify(Object.assign({ supabase_url: url, supabase_key: s.supabase_key }, body))
    }).then(function(r){ return r.json(); });
  }
  function fetchTalleres() { return edgeFn({ accion: 'get_talleres' }); }

  function renderModal(talleres) {
    var wrap = el('div',{});
    var shT = el('div',{class:'sh',style:'margin-bottom:16px'});
    var bSis = el('button',{class:'btn'},'← Sistemas'); bSis.onclick=function(){ go('sistemas'); };
    shT.appendChild(bSis);
    shT.appendChild(el('span',{class:'st',style:'margin-left:12px'},'📐 Cortelab — Talleres ('+talleres.length+')'));
    var btnN = el('button',{class:'btn btnp'},'+ Nuevo taller');
    (function(ss){ btnN.onclick=function(){ crearTaller(ss, function(){ fetchTalleres().then(function(d){ renderModal(d.talleres||[]); }); }); }; })(s);
    shT.appendChild(btnN);
    wrap.appendChild(shT);
    var body = el('div',{});
    wrap.appendChild(body);
    setApp(wrap);
    // Formulario nuevo taller
    var addBox = el('div', {class:'card',style:'background:#E6F6FD;padding:14px;margin-bottom:14px'});
      addBox.appendChild(el('div', {style:'font-size:12px;font-weight:500;color:#0C6FA3;margin-bottom:10px'}, 'Nuevo taller'));
      mkRow2(addBox, mkFg('Nombre', mkInput('nt-nom','text','','Ej: Ferreyra Amoblamientos')), mkFg('Slug', mkInput('nt-slug','text','','ej: ferreyra')));
      mkRow2(addBox, mkFg('Plan', mkSelect('nt-plan',[['mensual','Mensual'],['anual','Anual'],['demo','Demo']],'mensual')), mkFg('Vencimiento', mkInput('nt-venc','date','')));
      addFg(addBox, 'Notas', mkInput('nt-notas','text','','Ej: Pago el 5/6'));
      var btnAdd = el('button', {class:'btn btnp', style:'margin-top:6px'}, '+ Crear taller');
      (function(ss){ btnAdd.onclick = function(){ crearTaller(ss, renderModal); }; })(s);
      addBox.appendChild(btnAdd);
      body.appendChild(addBox);

      if (!talleres.length) {
        body.appendChild(el('div', {class:'emp'}, 'Sin talleres todavia'));
      } else {
        talleres.forEach(function(t) {
          var hoy = new Date();
          var venc = t.fecha_vencimiento ? new Date(t.fecha_vencimiento) : null;
          var vencido = venc && venc < hoy;
          var diasFalta = venc ? Math.ceil((venc - hoy) / 86400000) : null;
          var row = el('div', {style:'border:.5px solid #E2E8F0;border-radius:8px;padding:12px 14px;margin-bottom:8px'});
          var top = el('div', {style:'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'});
          var left = el('div', {});
          var nm = el('div', {style:'font-weight:500;font-size:13px;display:flex;align-items:center;gap:8px'});
          nm.appendChild(document.createTextNode(t.nombre));
          nm.appendChild(chipClass(t.plan||'mensual', 'cb'));
          nm.appendChild(chipClass(t.activo ? 'Activo' : 'Inactivo', t.activo ? 'cg' : 'cr'));
          if (venc) {
            var vLabel = vencido ? 'Vencido' : 'Vence en ' + diasFalta + 'd';
            nm.appendChild(chipClass(vLabel, vencido ? 'cr' : diasFalta <= 7 ? 'ca' : 'cg'));
          }
          left.appendChild(nm);
          left.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-top:3px'}, 'slug: ' + t.slug + (t.notas ? '  |  ' + t.notas : '')));
          top.appendChild(left);
          var right = el('div', {style:'display:flex;gap:6px'});
          // Toggle activo
          var tog = el('label', {class:'tog'});
          var inp = el('input', {type:'checkbox'}); if (t.activo) inp.checked = true;
          (function(tid, ss){ inp.onchange = function(){
            fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/sistema-clientes', {
              method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg'},
              body: JSON.stringify({supabase_url:url, supabase_key:ss.supabase_key, accion:'editar', id:tid, payload:{activo:this.checked}})
            });
          }; })(t.id, s);
          tog.appendChild(inp); tog.appendChild(el('span', {class:'sl'}));
          right.appendChild(tog);
          // Editar taller
          var btnE = el('button', {class:'btn btnsm'}, 'Editar');
          (function(tt, ss){ btnE.onclick = function(){ editarTaller(tt, ss, renderModal); }; })(t, s);
          right.appendChild(btnE);
          // Usuarios del taller
          var btnU = el('button', {class:'btn btnsm btnp'}, 'Usuarios');
          (function(tt, fn){ btnU.onclick = function(){ mTallerUsuarios(tt, s, fn); }; })(t, edgeFn);
          right.appendChild(btnU);
          top.appendChild(right);
          row.appendChild(top);
          body.appendChild(row);
        });
      }
  }

  fetchTalleres().then(function(d) {
    if (d.error) { setApp(el('div',{class:'emp',style:'color:red'},'Error: '+d.error)); return; }
    renderModal(d.talleres || []);
  }).catch(function(e){ setApp(el('div',{class:'emp',style:'color:red'},'Error: '+e.message)); });
}

function crearTaller(s, callback) {
  var nom = gv('nt-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
  var slug = gv('nt-slug').trim(); if (!slug) { alert('Slug obligatorio'); return; }
  var venc = gv('nt-venc');
  var url = s.supabase_url.replace(/\/$/,'');
  fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/sistema-clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg' },
    body: JSON.stringify({ supabase_url: url, supabase_key: s.supabase_key, accion: 'crear_taller', payload: { nombre: nom, slug: slug, plan: gv('nt-plan'), fecha_vencimiento: venc || null, notas: gv('nt-notas') || null, activo: true } })
  }).then(function(r){ return r.json(); }).then(function(d) {
    if (d.error) { alert('Error: ' + d.error); return; }
    closeM();
    mSistemaTalleres(s);
  }).catch(function(e){ alert('Error: ' + e.message); });
}

function editarTaller(t, s, callback) {
  var url = s.supabase_url.replace(/\/$/,'');
  openM(makeModal('Editar: ' + t.nombre, function(body) {
    addFg(body, 'Nombre', mkInput('et-nom','text',t.nombre));
    mkRow2(body, mkFg('Plan', mkSelect('et-plan',[['mensual','Mensual'],['anual','Anual'],['demo','Demo']],t.plan||'mensual')), mkFg('Vencimiento', mkInput('et-venc','date', t.fecha_vencimiento ? t.fecha_vencimiento.slice(0,10) : '')));
    addFg(body, 'Notas', mkInput('et-notas','text',t.notas||''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var venc = gv('et-venc');
      fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/sistema-clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg' },
        body: JSON.stringify({ supabase_url: url, supabase_key: s.supabase_key, accion: 'editar_taller', id: t.id, payload: { nombre: gv('et-nom'), plan: gv('et-plan'), fecha_vencimiento: venc || null, notas: gv('et-notas') || null } })
      }).then(function(){ closeM(); mSistemaTalleres(s); });
    };
    foot.appendChild(ok);
  }));
}

// NEGOCIOS DE MOBIXERP
function mSistemaNegocios(s) {
  function edge(body) {
    return fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/mobix-negocios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg' },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); });
  }

  function recargar() {
    edge({ accion: 'get' }).then(function(d) {
      if (d.error) { setApp(el('div', {class:'emp', style:'color:red'}, 'Error: ' + d.error)); return; }
      renderNegocios(d.negocios || []);
    });
  }

  function renderNegocios(negocios) {
    var wrap = el('div',{});
    var shN = el('div',{class:'sh',style:'margin-bottom:16px'});
    var bSisN = el('button',{class:'btn'},'← Sistemas'); bSisN.onclick=function(){ go('sistemas'); };
    shN.appendChild(bSisN);
    shN.appendChild(el('span',{class:'st',style:'margin-left:12px'},'📱 MobixERP — Negocios ('+negocios.length+')'));
    wrap.appendChild(shN);
    var body = el('div',{});
    wrap.appendChild(body);
    setApp(wrap);
    // Formulario nuevo negocio
    var addBox = el('div', {class:'card',style:'background:#E6F6FD;padding:16px;margin-bottom:14px'});
    addBox.appendChild(el('div', {style:'font-size:12px;font-weight:600;color:#0C6FA3;margin-bottom:12px'}, 'Nuevo cliente MobixERP'));
      mkRow2(addBox, mkFg('Nombre comercial', mkInput('mn-nom','text','','Ej: CeluFull')), mkFg('Slug (URL)', mkInput('mn-slug','text','','Ej: celufull')));
      addBox.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;margin:-8px 0 10px'}, 'La URL sera: mobixerp.vercel.app/[slug]'));
      mkRow2(addBox, mkFg('Responsable', mkInput('mn-resp','text','','Nombre completo')), mkFg('Email admin', mkInput('mn-mail','email','')));
      mkRow2(addBox, mkFg('Password inicial', mkInput('mn-pass','password','','Min. 8 caracteres')), mkFg('Telefono', mkInput('mn-tel','text','')));
      addFg(addBox, 'Ciudad', mkInput('mn-ciu','text',''));

      var btnAdd = el('button', {class:'btn btnp', style:'margin-top:8px;width:100%'}, '+ Crear cliente y usuario admin');
      btnAdd.onclick = function() {
        var nom  = gv('mn-nom').trim();  if (!nom)  { alert('Nombre obligatorio'); return; }
        var slug = gv('mn-slug').trim(); if (!slug) { alert('Slug obligatorio'); return; }
        var mail = gv('mn-mail').trim(); if (!mail) { alert('Email obligatorio'); return; }
        var pass = gv('mn-pass').trim(); if (pass.length < 8) { alert('Password minimo 8 caracteres'); return; }
        var resp = gv('mn-resp').trim(); if (!resp) { alert('Responsable obligatorio'); return; }
        btnAdd.textContent = 'Creando...'; btnAdd.disabled = true;
        edge({ accion: 'crear', payload: {
          slug: slug, nombre: nom, responsable: resp,
          email: mail, password: pass,
          telefono: gv('mn-tel')||null, ciudad: gv('mn-ciu')||null
        }}).then(function(d) {
          btnAdd.textContent = '+ Crear cliente y usuario admin'; btnAdd.disabled = false;
          if (d.error) { alert('Error: ' + d.error); return; }
          var url = 'https://mobixerp.vercel.app/' + slug;
          alert('Cliente creado! URL: ' + url + ' | Admin: ' + mail);
          recargar();
        }).catch(function(e){ btnAdd.textContent = '+ Crear cliente y usuario admin'; btnAdd.disabled = false; alert('Error: ' + e.message); });
      };
      addBox.appendChild(btnAdd);
      body.appendChild(addBox);

      // Lista de negocios
      if (!negocios.length) {
        body.appendChild(el('div', {class:'emp'}, 'Sin negocios todavia'));
        return;
      }
      body.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-bottom:10px'}, negocios.length + ' negocio' + (negocios.length!==1?'s':'')));

      negocios.forEach(function(n) {
        var card = el('div', {style:'border:.5px solid #E2E8F0;border-radius:8px;padding:12px 14px;margin-bottom:8px'});
        var top = el('div', {style:'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'});

        var left = el('div', {style:'flex:1'});
        var nm = el('div', {style:'font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px'});
        nm.appendChild(document.createTextNode(n.nombre));
        nm.appendChild(chipClass(n.activo?'Activo':'Inactivo', n.activo?'cg':'cr'));
        left.appendChild(nm);

        // URL clickeable
        var urlEl = el('a', {href:'https://mobixerp.vercel.app/'+n.slug, target:'_blank', style:'font-size:11px;color:#0B9EDA;text-decoration:none'});
        urlEl.textContent = 'mobixerp.vercel.app/' + n.slug;
        left.appendChild(urlEl);

        var sub = el('div', {style:'font-size:11px;color:#94a3b8;margin-top:2px'});
        sub.textContent = [n.responsable, n.ciudad, n.telefono].filter(Boolean).join('  |  ');
        left.appendChild(sub);
        top.appendChild(left);

        var btns = el('div', {style:'display:flex;gap:6px;align-items:center'});
        // Toggle activo
        var tog = el('label', {class:'tog'});
        var inp = el('input', {type:'checkbox'}); if (n.activo) inp.checked = true;
        (function(nid){ inp.onchange = function(){
          edge({ accion: 'editar', id: nid, payload: { activo: this.checked } });
        }; })(n.id);
        tog.appendChild(inp); tog.appendChild(el('span', {class:'sl'}));
        btns.appendChild(tog);

        // Editar
        var btnE = el('button', {class:'btn btnsm'}, 'Editar');
        (function(nn){ btnE.onclick = function(){ mEditNegocio(nn, edge, recargar); }; })(n);
        btns.appendChild(btnE);

        // Ver usuarios
        var btnU = el('button', {class:'btn btnsm btnp'}, 'Usuarios');
        (function(nn){ btnU.onclick = function(){ mNegocioUsuarios(nn, edge); }; })(n);
        btns.appendChild(btnU);

        top.appendChild(btns);
        card.appendChild(top);
        body.appendChild(card);
      });
  }
  recargar();
}

function mEditNegocio(n, edge, recargar) {
  openM(makeModal('Editar: ' + n.nombre, function(body) {
    mkRow2(body, mkFg('Nombre', mkInput('en-nom','text',n.nombre||'')), mkFg('Responsable', mkInput('en-resp','text',n.responsable||'')));
    mkRow2(body, mkFg('Telefono', mkInput('en-tel','text',n.telefono||'')), mkFg('Ciudad', mkInput('en-ciu','text',n.ciudad||'')));
    addFg(body, 'Email', mkInput('en-mail','email',n.email||''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      edge({ accion: 'editar', id: n.id, payload: {
        nombre: gv('en-nom'), responsable: gv('en-resp')||null,
        telefono: gv('en-tel')||null, ciudad: gv('en-ciu')||null,
        email: gv('en-mail')||null
      }}).then(function(d) {
        if (d.error) { alert('Error: ' + d.error); return; }
        closeM(); recargar();
      });
    };
    foot.appendChild(ok);
  }));
}

function mNegocioUsuarios(negocio, edge) {
  edge({ accion: 'get_usuarios', id: negocio.id }).then(function(d) {
    if (d.error) { alert('Error: ' + d.error); return; }
    var usuarios = d.usuarios || [];
    openM(makeModal(negocio.nombre + ' — Usuarios', function(body) {
      if (!usuarios.length) { body.appendChild(el('div', {class:'emp'}, 'Sin usuarios')); return; }
      body.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-bottom:10px'}, usuarios.length + ' usuario' + (usuarios.length!==1?'s':'')));
      usuarios.forEach(function(u) {
        var row = el('div', {style:'border:.5px solid #E2E8F0;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'});
        var left = el('div', {style:'flex:1'});
        var nm = el('div', {style:'font-weight:500;font-size:13px;display:flex;align-items:center;gap:8px'});
        nm.appendChild(document.createTextNode(u.nombre||'-'));
        nm.appendChild(chipClass(u.rol||'?', u.rol==='admin'?'cp':u.rol==='cajero'?'ca':'cb'));
        nm.appendChild(chipClass(u.activo?'Activo':'Inactivo', u.activo?'cg':'cr'));
        left.appendChild(nm);
        left.appendChild(el('div', {style:'font-size:11px;color:#94a3b8'}, u.email||'-'));
        row.appendChild(left);
        var btns = el('div', {style:'display:flex;gap:6px'});
        // Toggle activo
        var tog = el('label', {class:'tog'});
        var inp = el('input', {type:'checkbox'}); if (u.activo) inp.checked = true;
        (function(uid){ inp.onchange = function(){
          edge({ accion: 'editar_usuario', id: uid, payload: { activo: this.checked } });
        }; })(u.id);
        tog.appendChild(inp); tog.appendChild(el('span', {class:'sl'}));
        btns.appendChild(tog);
        // Reset password
        var btnP = el('button', {class:'btn btnsm'}, 'Reset pass');
        (function(uid, unom){ btnP.onclick = function(){
          var np = prompt('Nueva password para ' + unom + ' (min 8 caracteres):');
          if (!np || np.length < 8) { alert('Minimo 8 caracteres'); return; }
          edge({ accion: 'reset_password', id: uid, payload: { password: np } }).then(function(d){
            if (d.error) alert('Error: ' + d.error);
            else alert('Password actualizada correctamente');
          });
        }; })(u.id, u.nombre);
        btns.appendChild(btnP);
        row.appendChild(btns);
        body.appendChild(row);
      });
    }, function(foot) {
      var x = el('button', {class:'btn'}, 'Cerrar'); x.onclick = closeM; foot.appendChild(x);
    }));
  });
}


// IMPORTAR REPOS DE GITHUB
function mImportarGitHub() {
  var gh_user = 'jcqarenaza';
  // First get current sistemas to know which repos are already added
  dbGet('panel_sistemas').then(function(sis) {
    function norm(s){ return (s||'').toLowerCase().replace(/[-_\s]+/g,''); }
    var existentes = sis.map(function(s){ return norm(s.nombre); });
    // Fetch repos from GitHub
    fetch('https://api.github.com/users/' + gh_user + '/repos?sort=updated&per_page=50')
    .then(function(r){ return r.json(); })
    .then(function(repos) {
      if (!Array.isArray(repos)) { alert('Error al cargar repos de GitHub'); return; }
      var nuevos = repos.filter(function(r) {
        return !existentes.includes(norm(r.name));
      });
      openM(makeModal('Importar desde GitHub (' + gh_user + ')', function(body) {
        if (!nuevos.length) {
          body.appendChild(el('div', {class:'emp'}, 'Todos tus repos ya estan dados de alta en el panel'));
          return;
        }
        body.appendChild(el('div', {style:'font-size:12px;color:#64748B;margin-bottom:14px'}, nuevos.length + ' repos sin registrar de ' + repos.length + ' totales. Los ya registrados se omiten automaticamente.'));
        nuevos.forEach(function(repo) {
          var row = el('div', {style:'border:.5px solid #E2E8F0;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px'});
          var chk = el('input', {type:'checkbox', id:'ghk-' + repo.id});
          row.appendChild(chk);
          var info = el('div', {style:'flex:1'});
          info.appendChild(el('div', {style:'font-weight:500;font-size:13px'}, repo.name));
          info.appendChild(el('div', {style:'font-size:11px;color:#94a3b8'}, (repo.description||'Sin descripcion') + (repo.language ? '  |  ' + repo.language : '')));
          row.appendChild(info);
          var chip = el('span', {class:'chip cgr', style:'font-size:10px'}, repo.private ? 'Privado' : 'Publico');
          row.appendChild(chip);
          body.appendChild(row);
        });
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Importar seleccionados');
        ok.onclick = function() {
          var seleccionados = nuevos.filter(function(r){ var c = ge('ghk-' + r.id); return c && c.checked; });
          if (!seleccionados.length) { alert('Selecciona al menos un repo'); return; }
          ok.textContent = 'Importando...'; ok.disabled = true;
          Promise.all(seleccionados.map(function(repo) {
            return dbIns('panel_sistemas', {
              nombre: repo.name,
              descripcion: repo.description || null,
              plataforma: 'github',
              tipo: 'mono_empresa',
              costo_implementacion: 0,
              fee_mensual: 0,
              precio_base: 0,
              precio_empresa_extra: 0,
              precio_usuario_extra: 0,
              url_produccion: repo.homepage || null,
              activo: true
            }).catch(function(e) {
              // Si ya existe por el UNIQUE constraint, ignorar silenciosamente
              if (e.message && e.message.indexOf('unique') >= 0) return null;
              if (e.message && e.message.indexOf('duplicate') >= 0) return null;
              throw e;
            });
          })).then(function() {
            closeM();
            vSistemas();
          }).catch(function(e){
            ok.textContent = 'Importar seleccionados'; ok.disabled = false;
            alert('Error importando: ' + e.message);
          });
        };
        foot.appendChild(ok);
      }));
    }).catch(function(e){ alert('Error GitHub: ' + e.message); });
  });
}


function cargarMetricasSis(s, row) {
  var nombreL = (s.nombre||''). toLowerCase();
  var esPiamonte = nombreL.indexOf('piamonte') >= 0;
    (esPiamonte && s.supabase_url && s.supabase_key
      // Piamonte: las metricas se piden a la funcion panel-qp del Piamonte con el login del Panel (la anon key ya no alcanza)
      ? fetch(s.supabase_url.replace(/\/$/, '') + '/functions/v1/panel-qp', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + getAuthKey(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'metricas' })
        }).then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      : fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/metricas-sistema', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg'
    },
    body: JSON.stringify({
      supabase_url: s.supabase_url,
      supabase_key: s.supabase_key,
      tabla: s.metrica_tabla || 'orders',
      campo_total: s.metrica_campo_total || 'total_price',
      campo_fecha: s.metrica_campo_fecha || 'created_at'
    })
  }).then(function(r){ return r.json(); })
  ).then(function(d) {
    if (!d || d.error) throw new Error(d ? d.error : 'sin datos');
    row.innerHTML = '';
    [
      [d.month_orders, esPiamonte ? 'OS este mes' : 'Pedidos totales', '#0B9EDA'],
      [esPiamonte ? (d.month_invoices||d.month_orders) : d.month_orders, esPiamonte ? 'Facturas mes' : 'Este mes', '#5BBD4E'],
      [fmt(esPiamonte ? (d.month_revenue||d.total_revenue||0) : (d.total_revenue||0)), esPiamonte ? 'Importe facturado' : 'Facturacion', '#EF9F27'],
      [d.last_order ? fdate(d.last_order) : '-', 'Ultima actividad', '#7F77DD']
    ].forEach(function(m) {
      var cell = el('div', {style:'padding:8px 6px;text-align:center;border-right:.5px solid #f0f0f0;min-width:0'});
      cell.appendChild(el('div', {style:'font-size:13px;font-weight:700;color:'+m[2]+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap'}, String(m[0])));
      cell.appendChild(el('div', {style:'font-size:9px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:.03em'}, m[1]));
      row.appendChild(cell);
    });
  }).catch(function(e) {
    row.innerHTML = '';
    row.appendChild(el('div', {style:'padding:10px 16px;font-size:12px;color:#94a3b8;grid-column:1/-1'}, 'Metricas no disponibles: ' + e.message));
  });
}

// ── METRICAS SISTEMA ──────────────────────────────────────────
var _sisMetrics = {};

function cargarMetricasSistema(s, row) {
  // Only for sistemas with supabase_url / supabase_key
  if (!s.supabase_url || !s.supabase_key) return;
  var baseUrl = s.supabase_url.replace(/\/$/, '');
  var key = s.supabase_key;
  var hoy = new Date();
  var mesStr = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0');

  Promise.all([
    fetch(baseUrl + '/rest/v1/pedidos?select=id,created_at,total', {headers:{apikey:key, Authorization:'Bearer '+key}}).then(function(r){return r.json();}),
  ]).then(function(r) {
    var pedidos = Array.isArray(r[0]) ? r[0] : [];
    var totalPed = pedidos.length;
    var mesPed = pedidos.filter(function(p){ return p.created_at && p.created_at.startsWith(mesStr); }).length;
    var facturacion = pedidos.reduce(function(s,p){ return s+Number(p.total||0); }, 0);
    var ultimo = pedidos.length ? pedidos.sort(function(a,b){ return b.created_at > a.created_at ? 1 : -1; })[0].created_at : null;
    row.innerHTML = '';
    [
      [totalPed, 'Pedidos totales'],
      [mesPed, 'Este mes'],
      [fmt(facturacion), 'Facturacion'],
      [ultimo ? fdate(ultimo) : '-', 'Ultimo pedido']
    ].forEach(function(m) {
      var cell = el('div', {style:'padding:10px 14px;text-align:center;border-right:.5px solid #f0f0f0'});
      cell.appendChild(el('div', {style:'font-size:15px;font-weight:700;color:#0B9EDA'}, m[0]));
      cell.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;margin-top:2px'}, m[1]));
      row.appendChild(cell);
    });
  }).catch(function() {
    row.innerHTML = '<div style="padding:10px 16px;font-size:12px;color:#94a3b8">Metricas no disponibles</div>';
  });
}

// ── CLIENTES ───────────────────────────────────────────────────
function vClientes() {
  cargar().then(function(D) {
    var wrap = el('div', {});
    var sh = el('div', {class:'sh'});
    sh.appendChild(el('span', {class:'st'}, 'Clientes (' + D.cls.length + ')'));
    var btnN = el('button', {class:'btn btnp'}, '+ Nuevo cliente');
    btnN.onclick = function() { mNuevoCliente(); };
    sh.appendChild(btnN);
    wrap.appendChild(sh);

    var clsReales = D.cls.filter(function(cl){ return !cl.es_demo && !cl.revendedor_id && !cl.eliminado; });
    var clsDemo   = D.cls.filter(function(cl){ return !!cl.es_demo && !cl.revendedor_id && !cl.eliminado; });
    var clsPropios = clsReales.concat(clsDemo);

    if (!D.cls.length) {
      wrap.appendChild(el('div', {class:'card'}, [el('div', {class:'emp'}, 'No hay clientes todavia')]));
    } else {
      sh.querySelector('.st').textContent = 'Clientes (' + clsReales.length + ')';
      clsPropios.forEach(function(cl) {
        try {
        var mas = D.asigs.filter(function(a){ return a.cliente_id===cl.id; });
        var cc = el('div', {class:'cc'}); cc.dataset.clienteId = cl.id;
        var ch = el('div', {class:'ch'});
        var nomCl = String(cl.nombre || '?');
        var iniciales = nomCl.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
        var av = el('div', {class:'av'}, iniciales);
        if (cl.es_demo) av.style.background = '#94a3b8';
        ch.appendChild(av);
        var info = el('div', {style:'flex:1'});
        var nm = el('div', {style:'font-weight:500;font-size:14px'}, nomCl);
        if (cl.es_demo) nm.appendChild(chipClass('demo', 'cgr'));
        if (mas.length > 1) nm.appendChild(chipClass(mas.length + ' sistemas', 'cp'));
        info.appendChild(nm);
        var subInfo = [cl.empresa, cl.email, cl.telefono].filter(function(x){ return x && String(x).trim(); }).join(' - ');
        info.appendChild(el('div', {style:'font-size:12px;color:#94a3b8'}, subInfo));
        ch.appendChild(info);
        var btnE = el('button', {class:'btn btnsm', style:'margin-left:4px'}, 'Editar');
        (function(c){ btnE.onclick = function(){ mEditCliente(c); }; })(cl);
        ch.appendChild(btnE);
        if (isSuperAdmin()) {
          var btnDelC = el('button', {class:'btn btnsm', style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'}, 'X');
          (function(c){ btnDelC.onclick = function(){ eliminarClienteCompleto(c); }; })(cl);
          ch.appendChild(btnDelC);
        }
        cc.appendChild(ch);

        if (mas.length) {
          var body = el('div', {class:'cb2'});
          mas.forEach(function(a) {
            var s = a._sis;
            var col = S_COL[s.nombre]||'#64748B';
            var totI = totalFases(a);
            var pagI = pagadoImplementacion(a);
            var saldoI = totI - pagI;
            var ai = el('div', {class:'ai'});
            var row = el('div', {style:'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'});
            var left = el('div', {style:'display:flex;align-items:center;gap:8px'});
            left.appendChild(el('div', {style:'width:8px;height:8px;border-radius:50%;background:'+col+';flex-shrink:0'}));
            
            left.appendChild(getSisIconEl(s.nombre, 18));
            left.appendChild(el('span', {style:'font-weight:500'}, s.nombre||'?'));
            var tc = s.tipo==='multi_empresa'?'cp':s.tipo==='multi_usuario'?'ct':s.tipo==='saas'?'cb':'cgr';
            left.appendChild(chipClass(T_LAB[s.tipo]||'', tc));
            row.appendChild(left);
            var right = el('div', {style:'display:flex;align-items:center;gap:6px;flex-wrap:wrap'});
            var info2 = el('span', {style:'font-size:12px;color:#64748B'});
            info2.appendChild(document.createTextNode('Impl. ' + fmt(totI)));
            if (saldoI > 0) info2.appendChild(el('span', {style:'color:#A32D2D'}, ' (saldo ' + fmt(saldoI) + ')'));
            else info2.appendChild(el('span', {style:'color:#3B6D11'}, ' \u2713'));
            info2.appendChild(document.createTextNode(' Fee '));
            info2.appendChild(el('b', {}, fmt(a.fee_mensual)+'/mes'));
            info2.appendChild(document.createTextNode(' Dia ' + (a.dia_cobro||1)));
            right.appendChild(info2);
            // Fases
            var btnF = el('button', {class:'btn btnsm'}, 'Fases' + (a._fases.length ? ' (' + a._fases.length + ')' : ''));
            (function(aa, cn, sn){ btnF.onclick = function(){ mFases(aa, cn, sn, function(){ vClientes(); }); }; })(a, cl.nombre, s.nombre||'');
            right.appendChild(btnF);
            // Resumen
            var btnRes = el('button', {class:'btn btnsm'}, 'Resumen');
            (function(aa, cli, sis){ btnRes.onclick = function(){ vResumenCliente(aa, cli, sis); }; })(a, cl, s);
            right.appendChild(btnRes);
            // Cobrar
            var btnC = el('button', {class:'btn btns btnsm'}, '$ Cobrar');
            (function(aa, cn, sn, f, ti, sal){ btnC.onclick = function(){ mCobrar(aa, cn, sn, f, ti, sal); }; })(a, cl.nombre, s.nombre||'', Number(a.fee_mensual||0), totI, saldoI);
            right.appendChild(btnC);
            row.appendChild(right);
            ai.appendChild(row);
            // Subs
            if (a._subs.length) {
              var subs = el('div', {style:'margin-top:8px;display:flex;flex-wrap:wrap;gap:5px'});
              a._subs.forEach(function(se){ subs.appendChild(chipClass(se.nombre+(se.precio_extra?' +'+fmt(se.precio_extra):''), se.activo?'ct':'cgr')); });
              ai.appendChild(subs);
            }
            body.appendChild(ai);
          });
          cc.appendChild(body);
        }
        wrap.appendChild(cc);
        } catch(clErr) {
          console.error('Error renderizando cliente', cl, clErr);
          var errDiv = el('div', {class:'cc', style:'border-color:red'});
          errDiv.appendChild(el('div', {class:'ch', style:'color:red'}, 'Error: ' + String(clErr.message) + ' — cliente: ' + JSON.stringify(cl)));
          wrap.appendChild(errDiv);
        }
      });

      // ── Sección Partners ──────────────────────────────────────
      sbFetch('revendedores?select=*&order=nombre.asc').then(function(revs) {
        revs = (revs||[]).filter(function(rv){ return rv.activo!==false; });
        if (!revs || !revs.length) return;
        wrap.appendChild(el('div', {class:'sh', style:'margin-top:16px'}, [el('span', {class:'st'}, 'Partners (' + revs.length + ')')]));
        revs.forEach(function(rev) {
          var clisDel = D.cls.filter(function(c){ return c.revendedor_id === rev.id && !c.eliminado; });
          var card = el('div', {class:'cc'});
          var ch2 = el('div', {class:'ch'});
          var av2;
          if (rev.logo_b64) {
            av2 = el('img', {src:rev.logo_b64, style:'width:36px;height:36px;object-fit:contain;border-radius:8px;border:.5px solid #E2E8F0;background:#fff'});
          } else {
            var ini = rev.nombre.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
            av2 = el('div', {class:'av', style:'background:#7F77DD'}, ini);
          }
          ch2.appendChild(av2);
          var info2 = el('div', {style:'flex:1'});
          info2.appendChild(el('div', {style:'font-weight:500;font-size:14px'}, rev.nombre));
          info2.appendChild(el('div', {style:'font-size:12px;color:#94a3b8'}, clisDel.length + ' cliente' + (clisDel.length!==1?'s':'')));
          ch2.appendChild(info2);
          card.appendChild(ch2);
          if (clisDel.length) {
            var body2 = el('div', {class:'cb2'});
            clisDel.forEach(function(cl) {
              var row2 = el('div', {style:'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:.5px solid #f1f5f9'});
              var nm2 = String(cl.nombre||'?');
              var ini2 = nm2.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
              row2.appendChild(el('div', {class:'av', style:'width:24px;height:24px;font-size:10px;flex-shrink:0'}, ini2));
              var clInfo = el('div', {style:'flex:1'});
              clInfo.appendChild(el('div', {style:'font-size:13px;font-weight:500'}, nm2));
              if (cl.empresa) clInfo.appendChild(el('div', {style:'font-size:11px;color:#94a3b8'}, cl.empresa));
              row2.appendChild(clInfo);
              if (cl.es_demo) row2.appendChild(chipClass('demo', 'cgr'));
              body2.appendChild(row2);
            });
            card.appendChild(body2);
          } else {
            card.appendChild(el('div', {style:'padding:6px 12px 10px;font-size:12px;color:#94a3b8'}, 'Sin clientes'));
          }
          wrap.appendChild(card);
        });
      }).catch(function(){});
    }
    setApp(wrap);
  }).catch(function(e) {
    console.error('vClientes error:', e);
    setApp(el('div', {class:'emp', style:'color:red'}, 'Error en clientes: ' + e.message));
  });
}

// ── COBROS ─────────────────────────────────────────────────────
function vCobros() {
  cargar().then(function(D) {
    _D = D;
    if (!D.asigs.length) {
      var d = el('div', {class:'card'});
      var e = el('div', {class:'emp'}, 'Primero asigna un sistema a un cliente  ');
      var b = el('button', {class:'btn btnp'}, 'Ir a clientes'); b.onclick = function(){ go('clientes'); };
      e.appendChild(b); d.appendChild(e); setApp(d); return;
    }
    var wrap = el('div', {});
    var sh = el('div', {class:'sh'});
    sh.appendChild(el('span', {class:'st'}, 'Cobros'));
    var btnCron = el('button', {class:'btn', style:'margin-right:6px'}, 'Generar fees del mes');
    btnCron.onclick = function() {
      if (!confirm('Generar cobros de fee para el mes actual? Solo crea los que no existen.')) return;
      btnCron.textContent = 'Generando...';
      btnCron.disabled = true;
      fetch('https://tviiikkdskucmgcmtswu.supabase.co/rest/v1/rpc/generar_cobros_fee_mensual', {
        method: 'POST',
        headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg', Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg', 'Content-Type': 'application/json' },
        body: '{}'
      }).then(function(r){ return r.json(); }).then(function(d) {
        btnCron.textContent = 'Generar fees del mes';
        btnCron.disabled = false;
        if (d.error) { alert('Error: ' + d.error); return; }
        alert('Generados: ' + d.creados + ' cobros\nSaltados (ya existian): ' + d.saltados + '\nVencimiento: ' + d.vencimiento);
        vCobros();
      }).catch(function(e){ btnCron.textContent = 'Generar fees del mes'; btnCron.disabled = false; alert('Error: ' + e.message); });
    };
    sh.appendChild(btnCron);
    var btnN = el('button', {class:'btn btnp'}, '+ Registrar cobro');
    btnN.onclick = function() { mCobrarRapido(); };
    sh.appendChild(btnN);

    wrap.appendChild(sh);
    // Tabs
    var tabs = el('div', {class:'tabs'});
    ['todos','pendiente','parcial','pagado','vencido','cancelado'].forEach(function(t, i) {
      var tab = el('button', {class:'tab'+(i===0?' on':'')}, t.charAt(0).toUpperCase()+t.slice(1));
      tab.dataset.tab = t;
      tab.onclick = function() { filtrar(t); };
      tabs.appendChild(tab);
    });
    wrap.appendChild(tabs);
    var sortBar = el('div', {style:'display:flex;gap:6px;margin-bottom:8px;align-items:center'});
    sortBar.appendChild(el('span', {style:'font-size:11px;color:#94a3b8'}, 'Ordenar:'));
    var btnSortFecha = el('button', {class:'btn btnsm on', id:'sort-fecha'}, 'Fecha cobro');
    var btnSortNum = el('button', {class:'btn btnsm', id:'sort-num'}, 'N° Recibo');
    window._cobroSort = 'fecha';
    btnSortFecha.onclick = function() {
      window._cobroSort = 'fecha';
      btnSortFecha.classList.add('on'); btnSortNum.classList.remove('on');
      filtrar(document.querySelector('.tab.on') ? document.querySelector('.tab.on').dataset.tab : 'todos');
    };
    btnSortNum.onclick = function() {
      window._cobroSort = 'num';
      btnSortNum.classList.add('on'); btnSortFecha.classList.remove('on');
      filtrar(document.querySelector('.tab.on') ? document.querySelector('.tab.on').dataset.tab : 'todos');
    };
    sortBar.appendChild(btnSortFecha); sortBar.appendChild(btnSortNum);
    wrap.appendChild(sortBar);
    var card = el('div', {class:'card', style:'overflow-x:auto'});
    var tbl = el('table', {class:'tbl', style:'min-width:700px'});
    tbl.appendChild(elH('thead', {}, '<tr><th style="width:52px">N°</th><th>Cliente</th><th>Sistema</th><th>Tipo</th><th>Descripcion</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr>'));
    tbl.appendChild(el('tbody', {id:'ctbody'}));
    card.appendChild(tbl); wrap.appendChild(card);
    setApp(wrap);
    filtrar('todos');
  });
}
function filtrar(f) {
  if (!_D) return;
  // "Todos" excluye los pagados — lo que importa seguir son pendiente/vencido/cancelado.
  // Para ver los pagados, usar el tab "Pagado" especificamente.
  // Excluir cobros de clientes de partner (revendedor_id != null)
  var cobsPropios = _D.cobs.filter(function(c){ return !c._cli.revendedor_id && !c._cli.eliminado; });
  var lista = (f==='todos' ? cobsPropios.filter(function(c){ return c.estado!=='pagado'; }) : cobsPropios.filter(function(c){ return c.estado===f; })).slice().sort(function(a,b){
    if (window._cobroSort === 'num') {
      var na = a._numRecibo||0, nb = b._numRecibo||0;
      return nb - na;
    }
    var da=(a.fecha_pago||a.fecha_vencimiento||''); var db=(b.fecha_pago||b.fecha_vencimiento||'');
    return da<db?1:-1;
  });
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.toggle('on', t.dataset.tab===f); });
  var tb = ge('ctbody'); if (!tb) return;
  tb.innerHTML = '';
  if (!lista.length) { tb.appendChild(elH('tr', {}, '<td colspan="9" class="emp">Sin registros</td>')); return; }
  lista.forEach(function(c) {
    var tr = el('tr', {});
    tr.appendChild(el('td', {style:'font-size:11px;color:#94a3b8;white-space:nowrap;width:52px'}, c._numRecibo ? String(c._numRecibo).padStart(4,'0') : '—'));
    tr.appendChild(el('td', {}, c._cli.nombre||'-'));
    var td = el('td', {}); td.appendChild(chip(c._sis.nombre||'-')); tr.appendChild(td);
    var tdTipo = el('td', {});
    tdTipo.appendChild(chipClass(c.tipo_cobro||'fee', 'cgr'));
    if (c.tipo_cobro==='implementacion' && c._fase) tdTipo.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;margin-top:3px'}, 'Fase ' + c._fase.numero + ' — ' + c._fase.nombre));
    tr.appendChild(tdTipo);
    var tdDesc = el('td', {style:'color:#94a3b8;font-size:12px'});
    tdDesc.appendChild(document.createTextNode(c.descripcion||'-'));
    tr.appendChild(tdDesc);
    var tdMonto = el('td', {style:'font-weight:500'});
    tdMonto.appendChild(document.createTextNode(fmt(c.monto)));
    if (c.estado==='parcial') {
      tdMonto.appendChild(el('div',{style:'font-size:10px;color:#0B9EDA;font-weight:600'},'pagado '+fmt(pagadoDe(c))));
      tdMonto.appendChild(el('div',{style:'font-size:10px;color:#854F0B'},'saldo '+fmt(saldoDe(c))));
    }
    tr.appendChild(tdMonto);
    // metodo column removed
    var fechaTd = el('td', {});
    if (c.estado === 'pagado' && c.fecha_pago) {
      fechaTd.appendChild(el('div', {style:'font-size:11px;color:#94a3b8'}, 'Cobrado'));
      fechaTd.appendChild(el('div', {}, fdate(c.fecha_pago)));
    } else {
      fechaTd.appendChild(el('div', {style:'font-size:11px;color:#94a3b8'}, 'Vence'));
      fechaTd.appendChild(el('div', {}, fdate(c.fecha_vencimiento)));
    }
    tr.appendChild(fechaTd);
    // Estado select
    var sel = el('select', {class:'fi', style:'width:auto;padding:4px 8px;font-size:11px'});
    ['pendiente','parcial','pagado','vencido','cancelado'].forEach(function(e2) {
      var opt = el('option', {value:e2}, e2); if (c.estado===e2) opt.selected = true; sel.appendChild(opt);
    });
    (function(cid){ sel.onchange = function(){ cambiaEstado(cid, this.value); }; })(c.id);
    tr.appendChild(el('td', {}, [sel]));
    (function(cob){ tr.ondblclick = function(){ mEditarCobro(cob); }; tr.style.cursor='default'; })(c);
    var btnR = el('button', {class:'btn btnsm'}, 'Recibo');
    (function(cob){ btnR.onclick = function(){ verRecibo(cob); }; })(c);
    var btnDel = el('button', {class:'btn btnsm', style:'background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'}, 'X');
    (function(cob){ btnDel.onclick = function(){ eliminarCobroObj(cob); }; })(c);
    var accs = [btnR, btnDel];
    if (c.estado==='pendiente' || c.estado==='vencido' || c.estado==='parcial') {
      var btnP = el('button', {class:'btn btnsm btnp'}, '$ Pago');
      (function(cob){ btnP.onclick = function(){ mRegistrarPago(cob); }; })(c);
      accs = [btnP, btnR, btnDel];
    }
    var tdAcc = el('td', {style:'white-space:nowrap'});
    accs.forEach(function(b, i){ if(i>0) tdAcc.appendChild(document.createTextNode(' ')); tdAcc.appendChild(b); });
    tr.appendChild(tdAcc);
    tb.appendChild(tr);
  });
}
function mRegistrarPago(c) {
  sbFetch('panel_pf_cuentas?select=id,nombre,institucion,moneda,tipo,reservada,ingreso_default&activa=eq.true&order=orden.asc').catch(function(){ return []; })
  .then(function(cts){ mRegistrarPagoUI(c, (cts||[]).filter(function(x){ return x.moneda!=='USD' && !x.reservada && x.tipo!=='tarjeta'; })); });
}
function mRegistrarPagoUI(c, cts) {
  var saldo = saldoDe(c);
  openM(makeModal('Registrar pago', function(body) {
    body.appendChild(el('div', {class:'ibox'}, (c._cli.nombre||'-') + ' — ' + (c.descripcion||c.tipo_cobro||'-')));
    var resumen = el('div',{style:'display:flex;gap:14px;margin:8px 0 12px;font-size:12px'});
    resumen.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Total: '), el('b',{},fmt(c.monto))]));
    resumen.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Pagado: '), el('b',{style:'color:#0B9EDA'},fmt(pagadoDe(c)))]));
    resumen.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Saldo: '), el('b',{style:'color:#854F0B'},fmt(saldo))]));
    body.appendChild(resumen);
    if ((c._pagos||[]).length) {
      var hist = el('div',{style:'background:#F8FAFC;border-radius:8px;padding:8px 10px;margin-bottom:12px;font-size:11px'});
      hist.appendChild(el('div',{style:'font-weight:600;color:#64748b;margin-bottom:4px'},'Pagos registrados'));
      var ML = {}; MEDIOS_PAGO.forEach(function(m){ ML[m[0]]=m[1]; });
      c._pagos.forEach(function(p){
        hist.appendChild(el('div',{style:'display:flex;justify-content:space-between;padding:2px 0'},[
          el('span',{style:'color:#94a3b8'}, fdate(p.fecha) + ' — ' + (ML[p.medio]||p.medio||'-') + (p.notas?' ('+p.notas+')':'')),
          el('b',{}, fmt(p.monto))
        ]));
      });
      body.appendChild(hist);
    }
    mkRow2(body,
      mkFg('Monto del pago ($)', mkInput('rp-monto','number',saldo)),
      mkFg('Fecha', mkInput('rp-fecha','date',new Date().toISOString().slice(0,10)))
    );
    mkRow2(body,
      mkFg('Medio', mkSelect('rp-medio', MEDIOS_PAGO, c.metodo||'transferencia')),
      mkFg('Notas (opcional)', mkInput('rp-notas','text','','ej: últimos 4 díg. tarjeta, hash tx'))
    );
    var lg = el('div',{class:'fg',style:'margin-top:4px'});
    var chk = el('input',{type:'checkbox',id:'rp-recibo',checked:'checked'});
    var lbl = el('label',{style:'font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px'});
    lbl.appendChild(chk); lbl.appendChild(document.createTextNode('Generar recibo de este pago'));
    lg.appendChild(lbl); body.appendChild(lg);
    if (cts.length) {
      var defCta = (cts.find(function(x){ return x.ingreso_default; }) || cts[0]).id;
      addFg(body, '¿A qué cuenta entró?', mkSelect('rp-cuenta', cts.map(function(x){ return [x.id, (x.institucion||x.nombre)+' · pesos']; }), defCta));
    }
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Registrar pago');
    ok.onclick = function() {
      var monto = Number(gv('rp-monto')||0);
      var fecha = gv('rp-fecha');
      var medio = gv('rp-medio');
      if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
      if (monto > saldo + 0.01) { alert('El pago supera el saldo (' + fmt(saldo) + ')'); return; }
      if (!fecha) { alert('Ingresa la fecha'); return; }
      ok.disabled = true; ok.textContent = 'Guardando...';
      var quiereRecibo = ge('rp-recibo') && ge('rp-recibo').checked;
      var rowPago = {cobro_id: c.id, monto: monto, fecha: fecha, medio: medio, notas: gv('rp-notas')||null};
      if (cts.length) rowPago.cuenta_id = gv('rp-cuenta')||null;
      dbIns('panel_pagos', rowPago)
      .then(function(rows){
        var totalPagado = pagadoDe(c) + monto;
        var completo = totalPagado >= Number(c.monto||0) - 0.01;
        var upd = { metodo: medio, estado: completo ? 'pagado' : 'parcial' };
        if (completo) upd.fecha_pago = fecha;
        return dbUpd('panel_cobros', c.id, upd).then(function(){
          closeM(); _D = null;
          vCobros();
          if (quiereRecibo) {
            mostrarReciboModal({
              cli: (c._cli.nombre||'') + (c._cli.empresa ? ' (' + c._cli.empresa + ')' : ''),
              sis: c._sis ? c._sis.nombre : null,
              desc: (c.descripcion||c.tipo_cobro||'Cobro') + (completo ? '' : ' — Pago parcial ' + fmt(monto) + ' de ' + fmt(c.monto)),
              monto: monto, fecha: fecha, met: medio,
              cobro_id: c.id, nuevoRecibo: true
            });
          }
        });
      })
      .catch(function(e){ ok.disabled=false; ok.textContent='Registrar pago'; alert('Error: ' + e.message + (cts.length ? '\n\nSi dice que no existe la columna cuenta_id, falta correr el SQL de cuentas.' : '')); });
    };
    foot.appendChild(ok);
  }));
}

function mEditarCobro(c) {
  openM(makeModal('Editar cobro', function(body) {
    body.appendChild(el('div', {class:'ibox'}, (c._cli.nombre||'-') + ' — ' + (c._sis.nombre||'-')));
    if (c._numRecibo) body.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-bottom:8px'}, 'Recibo N° ' + String(c._numRecibo).padStart(4,'0')));
    addFg(body, 'Descripcion', mkInput('ec-desc','text',c.descripcion||''));
    mkRow2(body,
      mkFg('Monto ($)', mkInput('ec-monto','number',c.monto||0)),
      mkFg('Metodo', mkSelect('ec-met', MEDIOS_PAGO, c.metodo||'transferencia'))
    );
    mkRow2(body,
      mkFg('Vencimiento', mkInput('ec-venc','date',c.fecha_vencimiento?c.fecha_vencimiento.slice(0,10):'')),
      mkFg('Fecha pago', mkInput('ec-pago','date',c.fecha_pago?c.fecha_pago.slice(0,10):''))
    );
    addFg(body, 'Estado', mkSelect('ec-est',[['pendiente','Pendiente'],['pagado','Pagado'],['vencido','Vencido'],['cancelado','Cancelado']],c.estado||'pendiente'));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var estado = gv('ec-est');
      var fechaPago = gv('ec-pago');
      dbUpd('panel_cobros', c.id, {
        descripcion: gv('ec-desc'),
        monto: Number(gv('ec-monto')||0),
        metodo: gv('ec-met'),
        fecha_vencimiento: gv('ec-venc')||null,
        fecha_pago: fechaPago||null,
        estado: estado
      }).then(function(){ closeM(); vCobros(); });
    };
    foot.appendChild(ok);
  }));
}

function eliminarCobroObj(c) {
  var desc = (c._cli ? c._cli.nombre : '-') + ' - ' + (c.descripcion||'cobro');
  if (!confirm('Eliminar ' + desc + '? Esta accion no se puede deshacer.')) return;
  sbFetch('panel_cobros?id=eq.' + c.id, { method: 'DELETE', prefer: 'return=minimal' })
  .then(function(){ vCobros(); })
  .catch(function(e){ alert('Error: ' + e.message); });
}
function eliminarCobro(btn) {
  var cid = btn.dataset.cid;
  var c = _D ? _D.cobs.find(function(x){ return x.id===cid; }) : null;
  var desc = c ? (c._cli.nombre + ' - ' + (c.descripcion||'fee')) : 'este cobro';
  if (!confirm('Eliminar ' + desc + '? Esta accion no se puede deshacer.')) return;
  sbFetch('panel_cobros?id=eq.' + cid, { method: 'DELETE', prefer: 'return=minimal' })
  .then(function(){ vCobros(); })
  .catch(function(e){ alert('Error: ' + e.message); });
}
function cambiaEstado(id, estado) {
  var b = {estado:estado};
  if (estado==='pagado') b.fecha_pago = new Date().toISOString().slice(0,10);
  dbUpd('panel_cobros', id, b).then(function(){ vCobros(); });
}
function verRecibo(c) {
  var d = {cli:c._cli.nombre, sis:c._sis.nombre, desc:c.descripcion, monto:c.monto, met:c.metodo, fecha:c.fecha_pago||c.fecha_vencimiento||'', estado:c.estado, cobro_id:c.id};
  if (c._asig) {
    var totI = totalFases(c._asig);
    var pagI = pagadoImplementacion(c._asig);
    if (totI > 0) {
      d.totalImpl = totI;
      d.pagadoImpl = pagI;
      d.saldoImpl = Math.max(0, totI - pagI);
      if (c.tipo_cobro === 'implementacion' && c._fase) {
        d.faseLabel = c._fase.nombre + (c._asig._fases.length > 1 ? ' de ' + c._asig._fases.length : '');
        d.faseMonto = Number(c._fase.monto);
        d.faseSaldo = Math.max(0, Number(c._fase.monto) - pagadoFase(c._fase, c._asig));
      }
    }
  }
  mostrarReciboModal(d);
}

// ── RECIBO PUNTUAL ──────────────────────────────────────────────
function mReciboRapido() {
  var QP_A_MEDIDA_ID = '45d2d4de-e938-4a95-827d-f29f575eff10';
  var cls = (_D && _D.cls) ? _D.cls : [];
  openM(makeModal('Nuevo recibo puntual', function(body) {
    var fgCli = el('div', {class:'fg'});
    fgCli.appendChild(el('label', {class:'fl'}, 'Cliente'));
    var selCli = el('select', {class:'fi', id:'rr-sel'});
    selCli.appendChild(el('option', {value:'__libre__'}, 'Escribir a mano...'));
    cls.forEach(function(cl) {
      var op = el('option', {value: cl.id});
      op.textContent = cl.nombre + (cl.empresa ? ' — ' + cl.empresa : '');
      selCli.appendChild(op);
    });
    fgCli.appendChild(selCli);
    body.appendChild(fgCli);
    var fgLibre = el('div', {class:'fg', id:'rr-libre-fg', style:'display:none'});
    fgLibre.appendChild(el('label', {class:'fl'}, 'Nombre del cliente'));
    fgLibre.appendChild(el('input', {class:'fi', id:'rr-libre', type:'text', placeholder:'Ej: Juan Garcia'}));
    body.appendChild(fgLibre);
    selCli.onchange = function() {
      ge('rr-libre-fg').style.display = this.value === '__libre__' ? '' : 'none';
    };
    addFg(body, 'Concepto', mkInput('rr-desc', 'text', '', 'Ej: Desarrollo modulo facturacion'));
    addFg(body, 'Monto ($)', mkInput('rr-monto', 'number', ''));
    var fgTog = el('div', {class:'fg', style:'display:flex;align-items:center;gap:10px'});
    var chk = el('input', {type:'checkbox', id:'rr-logo'});
    chk.checked = true;
    var lbl = el('label', {for:'rr-logo', style:'font-size:13px;color:#64748b;cursor:pointer'}, 'Mostrar logo y datos de QP C&IA');
    fgTog.appendChild(chk);
    fgTog.appendChild(lbl);
    body.appendChild(fgTog);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar y ver recibo');
    ok.onclick = function() {
      var selVal = gv('rr-sel');
      var desc = gv('rr-desc').trim();
      var monto = Number(gv('rr-monto')||0);
      var conLogo = ge('rr-logo').checked;
      var nombreLibre = ge('rr-libre') ? ge('rr-libre').value.trim() : '';
      if (selVal === '__libre__' && !nombreLibre) { alert('Ingresa el nombre del cliente'); return; }
      if (!desc) { alert('Ingresa el concepto'); return; }
      if (!monto) { alert('Ingresa el monto'); return; }
      ok.disabled = true; ok.textContent = 'Guardando...';
      var hoy = new Date().toISOString().slice(0,10);
      // 1. Resolver cliente
      var pCli;
      if (selVal !== '__libre__') {
        var clExist = (_D.cls||[]).find(function(c){ return c.id === selVal; });
        pCli = Promise.resolve({id: selVal, nombre: clExist ? clExist.nombre + (clExist.empresa ? ' (' + clExist.empresa + ')' : '') : ''});
      } else {
        pCli = dbIns('panel_clientes', {nombre: nombreLibre, activo: true}).then(function(rows){
          if (_D) _D.cls.push(rows[0]);
          return {id: rows[0].id, nombre: nombreLibre};
        });
      }
      // 2. Crear asignacion con QP A Medida si no existe
      pCli.then(function(cli) {
        var asigExist = (_D.asigs||[]).find(function(a){ return a.cliente_id === cli.id && a.sistema_id === QP_A_MEDIDA_ID; });
        var pAsig = asigExist
          ? Promise.resolve(asigExist)
          : dbIns('panel_asignaciones', {cliente_id: cli.id, sistema_id: QP_A_MEDIDA_ID, fee_mensual: 0, dia_cobro: 1, activo: true}).then(function(rows){ return rows[0]; });
        return pAsig.then(function(asig) {
          // 3. Crear cobro
          return dbIns('panel_cobros', {
            asignacion_id: asig.id,
            tipo_cobro: 'puntual',
            descripcion: desc,
            monto: monto,
            estado: 'pagado',
            fecha_pago: hoy,
            fecha_vencimiento: hoy,
            metodo: 'transferencia'
          }).then(function(rows) {
            closeM();
            mostrarReciboModal({cli: cli.nombre, desc: desc, monto: monto, conLogo: conLogo, cobro_id: rows[0].id});
            if (_D) _D.cobs.push(rows[0]);
          });
        });
      }).catch(function(e){
        ok.disabled = false; ok.textContent = 'Guardar y ver recibo';
        alert('Error: ' + e.message);
      });
    };
    foot.appendChild(ok);
  }));
}

function mostrarReciboModal(d) {
  var logoSrc = ge('logo') ? ge('logo').src : '';
  var M_LAB = {transferencia:'Transferencia',efectivo:'Efectivo',mercadopago:'MercadoPago',tarjeta:'Tarjeta',dai:'DAI (cripto)',otro:'Otro'};

  function renderRecibo(conLogo, numRec) {
    var numStr = numRec ? String(numRec).padStart(4,'0') : '';
    var fechaStr = d.fecha
      ? (function(f){ var p=f.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; })(d.fecha.slice(0,10))
      : new Date().toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'});
    var montoStr = fmt(d.monto);
    var metLabel = d.met ? (M_LAB[d.met]||d.met) : null;
    var css = [
      '*{box-sizing:border-box;margin:0;padding:0}',
      'body{font-family:"DM Sans",sans-serif;background:#F0F5FA;padding:32px 16px;color:#1a2e4a}',
      '.wrap{max-width:620px;margin:0 auto}',
      '.card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09)}',
      '.stripe{height:5px;background:linear-gradient(90deg,#0B9EDA,#5BBD4E)}',
      '.body{padding:32px}',
      '.head{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:22px;border-bottom:2px solid #E6F6FD}',
      '.logo{height:52px;object-fit:contain}',
      '.rec-title{font-size:20px;font-weight:700;color:#0B9EDA;text-align:right}',
      '.rec-num{font-size:13px;color:#64748B;text-align:right;margin-top:3px}',
      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px}',
      '.lb{font-size:10px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}',
      '.vl{font-size:14px;font-weight:500}',
      '.desc-box{background:#F8FAFC;border-radius:8px;padding:14px 16px;margin-bottom:20px}',
      '.tot{background:linear-gradient(135deg,#E6F6FD,#EDF7EA);border-radius:10px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}',
      '.tot-val{font-size:28px;font-weight:700;color:#0B9EDA}',
      '.ft{text-align:center;font-size:11px;color:#94A3B8;padding-top:16px;border-top:1px solid #F1F5F9;line-height:1.7}',
      '.tog{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;color:#64748b}',
      '@media print{.tog{display:none}}'
    ].join('');
    var headHtml = conLogo
      ? '<div class="head"><img src="' + logoSrc + '" class="logo" alt="QP"><div><div class="rec-title">Recibo de Pago</div><div class="rec-num">' + (numStr ? 'N° ' + numStr + '  ·  ' : '') + fechaStr + '</div></div></div>'
      : '<div class="head" style="justify-content:flex-end"><div><div class="rec-title">Recibo de Pago</div><div class="rec-num">' + (numStr ? 'N° ' + numStr + '  ·  ' : '') + fechaStr + '</div></div></div>';
    var footHtml = conLogo
      ? '<div class="ft">QP Cloud &amp; Inteligencia Artificial<br>General Pico, La Pampa &bull; jcquarleri.vercel.app</div>'
      : '';
    return '<html><head><meta charset="UTF-8">'
      + '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">'
      + '<style>' + css + '</style></head><body>'
      + '<div class="wrap"><div class="card"><div class="stripe"></div><div class="body">'
      + headHtml
      + '<div class="grid">'
      + '<div><div class="lb">Cliente</div><div class="vl">' + d.cli + '</div></div>'
      + '<div><div class="lb">Fecha</div><div class="vl">' + fechaStr + '</div></div>'
      + (d.sis && d.sis !== 'QP A Medida' ? '<div><div class="lb">Servicio</div><div class="vl">' + d.sis + '</div></div>' : '')
      + (metLabel ? '<div><div class="lb">Metodo de pago</div><div class="vl">' + metLabel + '</div></div>' : '')
      + '</div>'
      + '<div class="desc-box"><div class="lb">Concepto</div><div class="vl" style="margin-top:4px">' + d.desc + '</div></div>'
      + '<div class="tot"><span style="font-size:13px;font-weight:600;color:#0C6FA3">Total</span><span class="tot-val">' + montoStr + '</span></div>'
      + (d.saldoImpl != null ? ('<div class="desc-box" style="background:' + (d.saldoImpl > 0 ? '#FAEEDA' : '#EDF7EA') + '"><div class="lb">Implementacion' + (d.faseLabel ? ' &mdash; ' + d.faseLabel : '') + '</div><div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px"><span>Total acordado: <strong>' + fmt(d.totalImpl) + '</strong></span><span>Pagado: <strong>' + fmt(d.pagadoImpl) + '</strong></span></div><div style="margin-top:8px;font-size:14px;font-weight:700;color:' + (d.saldoImpl > 0 ? '#854F0B' : '#3D8A32') + '">' + (d.saldoImpl > 0 ? 'Saldo pendiente: ' + fmt(d.saldoImpl) : 'Implementacion saldada') + '</div></div>') : '')
      + footHtml
      + '</div></div></div>'
      + '<div class="tog"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="tog-logo"' + (conLogo ? ' checked' : '') + ' onchange="window.parent.__reciboToggleLogo(this.checked)"> Mostrar logo y datos QP C&IA</label></div>'
      + '</body></html>';
  }

  var ov = el('div', {class:'ov'});
  ov.onclick = function(e){ if (e.target===ov) ge('mroot').innerHTML=''; };
  var mod = el('div', {class:'mod', style:'max-width:680px;width:95%'});
  var hd = el('div', {class:'mhd'});
  hd.appendChild(el('span', {class:'mtt'}, 'Recibo'));
  var x = el('button', {class:'btn btnsm'}, 'X'); x.onclick = function(){ ge('mroot').innerHTML=''; };
  hd.appendChild(x);
  mod.appendChild(hd);
  var mbd = el('div', {class:'mbd', style:'padding:0;max-height:80vh;overflow-y:auto'});
  var iframe = el('iframe', {style:'width:100%;height:200px;border:none;border-radius:0 0 8px 8px'});
  mbd.appendChild(iframe);
  mod.appendChild(mbd);
  ov.appendChild(mod);
  ge('mroot').innerHTML='';
  ge('mroot').appendChild(ov);
  function escribirRecibo(num, val) {
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(renderRecibo(val, num));
    iframe.contentWindow.document.close();
    setTimeout(function() {
      try {
        var h = iframe.contentWindow.document.body.scrollHeight;
        if (h > 100) iframe.style.height = Math.min(h + 20, 700) + 'px';
      } catch(e){}
    }, 150);
  }
  function escribirLoading() {
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px">Generando recibo...</body></html>');
    iframe.contentWindow.document.close();
  }
  window.__reciboToggleLogo = function(val) { escribirRecibo(window.__reciboNum||null, val); };
  // Pedir numero de recibo
  if (d.cobro_id && d.nuevoRecibo) {
    // Pago parcial/nuevo: SIEMPRE un recibo nuevo por cada pago (no reusar el del cobro)
    escribirLoading();
    fetch(SB_URL + '/rest/v1/rpc/next_recibo_num', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function(r){ return r.json(); }).then(function(n){
      window.__reciboNum = n;
      dbIns('panel_recibos', { numero: n, cobro_id: d.cobro_id, cliente: d.cli||null, sistema: d.sis||null, monto: d.monto||null, fecha: d.fecha||null }).catch(function(){});
      escribirRecibo(n, true);
    }).catch(function(){ window.__reciboNum = null; escribirRecibo(null, true); });
  } else if (d.cobro_id) {
    escribirLoading();
    sbFetch('panel_recibos?cobro_id=eq.' + d.cobro_id + '&select=numero&order=numero.desc&limit=1')
      .then(function(rows) {
        var num;
        if (rows && rows.length) {
          num = rows[0].numero;
          window.__reciboNum = num;
          escribirRecibo(num, true);
        } else {
          fetch(SB_URL + '/rest/v1/rpc/next_recibo_num', {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
            body: '{}'
          }).then(function(r){ return r.json(); }).then(function(n){
            num = n;
            window.__reciboNum = num;
            dbIns('panel_recibos', { numero: num, cobro_id: d.cobro_id, cliente: d.cli||null, sistema: d.sis||null, monto: d.monto||null, fecha: d.fecha||null }).catch(function(){});
            escribirRecibo(num, true);
          }).catch(function(){ window.__reciboNum = null; escribirRecibo(null, true); });
        }
      }).catch(function(){ window.__reciboNum = null; escribirRecibo(null, true); });
  } else {
    window.__reciboNum = null;
    escribirRecibo(null, true);
  }
}

// ── MODALES ────────────────────────────────────────────────────
function closeM() { ge('mroot').innerHTML = ''; }
function openM(content) {
  var ov = el('div', {class:'ov'});
  ov.onclick = function(e){ if (e.target===ov) closeM(); };
  ov.appendChild(content);
  ge('mroot').innerHTML = '';
  ge('mroot').appendChild(ov);
}
function makeModal(title, bodyFn, footFn) {
  var mod = el('div', {class:'mod'});
  var hd = el('div', {class:'mhd'});
  hd.appendChild(el('span', {class:'mtt'}, title));
  var x = el('button', {class:'btn btnsm'}, 'X'); x.onclick = closeM;
  hd.appendChild(x);
  mod.appendChild(hd);
  var body = el('div', {class:'mbd'}); bodyFn(body); mod.appendChild(body);
  var foot = el('div', {class:'mft'}); footFn(foot); mod.appendChild(foot);
  return mod;
}
function addFg(parent, label, inputEl) {
  var g = el('div', {class:'fg'});
  g.appendChild(el('label', {class:'fl'}, label));
  g.appendChild(inputEl);
  parent.appendChild(g);
  return inputEl;
}
function mkInput(id, type, val, ph) {
  var i = el('input', {class:'fi', id:id, type:type||'text', value:val||''});
  if (ph) i.placeholder = ph;
  return i;
}
function mkSelect(id, opts, sel) {
  var s = el('select', {class:'fi', id:id});
  opts.forEach(function(o){ var op = el('option', {value:o[0]}, o[1]); if (o[0]===sel) op.selected=true; s.appendChild(op); });
  return s;
}
function mkRow2(parent, a, b) { var r = el('div', {class:'r2'}); r.appendChild(a); r.appendChild(b); parent.appendChild(r); }
function mkRow3(parent, a, b, c) { var r = el('div', {class:'r3'}); r.appendChild(a); r.appendChild(b); r.appendChild(c); parent.appendChild(r); }
function mkFg(label, inputEl) { var g = el('div', {class:'fg'}); g.appendChild(el('label', {class:'fl'}, label)); g.appendChild(inputEl); return g; }
function cancelBtn() { var b = el('button', {class:'btn'}, 'Cancelar'); b.onclick = closeM; return b; }

// NUEVO SISTEMA
function mNuevoSistema() {
  openM(makeModal('Nuevo sistema', function(body) {
    addFg(body, 'Nombre', mkInput('fsn','text','','Ej: Mi Sistema'));
    addFg(body, 'Descripcion', mkInput('fsd','text',''));
    mkRow2(body,
      mkFg('Plataforma', mkSelect('fsp', [['vercel','Vercel'],['supabase','Supabase'],['github','GitHub'],['app_script','App Script'],['otro','Otro']], 'vercel')),
      mkFg('Tipo', mkSelect('fst', [['mono_empresa','Mono empresa'],['multi_empresa','Multi empresa'],['multi_usuario','Multi usuario'],['saas','SaaS']], 'mono_empresa'))
    );
    mkRow3(body, mkFg('Implementacion ($)', mkInput('fsi','number','0')), mkFg('Fee mensual ($)', mkInput('fsf','number','0')), mkFg('Extra/entidad ($)', mkInput('fse','number','0')));
    addFg(body, 'URL produccion', mkInput('fsu','text','','https://...'));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var n = gv('fsn').trim(); if (!n) { alert('Nombre obligatorio'); return; }
      var t = gv('fst'), e = Number(gv('fse')||0);
      dbIns('panel_sistemas', {nombre:n, descripcion:gv('fsd')||null, plataforma:gv('fsp'), tipo:t,
        costo_implementacion:Number(gv('fsi')||0), fee_mensual:Number(gv('fsf')||0), precio_base:Number(gv('fsi')||0),
        precio_empresa_extra:t==='multi_empresa'?e:0, precio_usuario_extra:t==='multi_usuario'?e:0,
        url_produccion:gv('fsu')||null, activo:true})
      .then(function(){ closeM(); vSistemas(); });
    };
    foot.appendChild(ok);
  }));
}

function mEditSistema(s) {
  openM(makeModal('Editar: ' + s.nombre, function(body) {
    addFg(body, 'Nombre', mkInput('esn','text',s.nombre));
    mkRow2(body,
      mkFg('Plataforma', mkSelect('esp', [['vercel','Vercel'],['supabase','Supabase'],['github','GitHub'],['app_script','App Script'],['otro','Otro']], s.plataforma)),
      mkFg('Tipo', mkSelect('est', [['mono_empresa','Mono empresa'],['multi_empresa','Multi empresa'],['multi_usuario','Multi usuario'],['saas','SaaS']], s.tipo))
    );
    mkRow3(body, mkFg('Implementacion ($)', mkInput('esi','number',s.costo_implementacion||0)), mkFg('Fee mensual ($)', mkInput('esf','number',s.fee_mensual||0)), mkFg('Extra/entidad ($)', mkInput('ese','number',s.precio_empresa_extra||s.precio_usuario_extra||0)));
    addFg(body, 'URL produccion', mkInput('esu','text',s.url_produccion||''));
    addFg(body, 'Orden (1 = primero)', mkInput('esor','number',s.orden||99));
    body.appendChild(el('div', {style:'border-top:.5px solid #E2E8F0;margin:14px 0;padding-top:14px'}));
    var revRow = el('div', {style:'display:flex;align-items:center;justify-content:space-between;padding:6px 0'});
    revRow.appendChild(el('div', {}, [
      el('div', {style:'font-size:13px;font-weight:500'}, 'Disponible para reventa'),
      el('div', {style:'font-size:11px;color:#94a3b8'}, 'Los partners pueden vender este sistema')
    ]));
    var togRev = el('input', {type:'checkbox', id:'es_reventa', class:'tgl'});
    if (s.para_reventa) togRev.checked = true;
    var togRevLbl = el('label', {for:'es_reventa', class:'tgl-lbl'});
    var togRevWrap = el('div', {style:'display:flex;align-items:center;gap:6px'});
    togRevWrap.appendChild(togRev); togRevWrap.appendChild(togRevLbl);
    revRow.appendChild(togRevWrap);
    body.appendChild(revRow);
    body.appendChild(el('div', {style:'border-top:.5px solid #E2E8F0;margin:14px 0;padding-top:14px'}));
    body.appendChild(el('div', {style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px'}, 'Integracion Supabase (metricas)'));
    addFg(body, 'Supabase URL', mkInput('essurl','text',s.supabase_url||'','https://xxx.supabase.co'));
    addFg(body, 'Supabase Anon Key', mkInput('esskey','text',s.supabase_key||'','eyJ...'));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var t = gv('est'), e = Number(gv('ese')||0);
      dbUpd('panel_sistemas', s.id, {nombre:gv('esn'), plataforma:gv('esp'), tipo:t,
        costo_implementacion:Number(gv('esi')||0), fee_mensual:Number(gv('esf')||0),
        precio_empresa_extra:t==='multi_empresa'?e:0, precio_usuario_extra:t==='multi_usuario'?e:0,
        url_produccion:gv('esu')||null,
        supabase_url:gv('essurl')||null, supabase_key:gv('esskey')||null,
        orden:Number(gv('esor')||99)})
      .then(function(){ closeM(); vSistemas(); });
    };
    foot.appendChild(ok);
  }));
}

// NUEVO CLIENTE
function mNuevoCliente() {
  dbGet('panel_sistemas').then(function(sis) {
    openM(makeModal('Nuevo cliente', function(body) {
      // Paso 1: datos del cliente
      body.appendChild(el('div', {style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'}, 'Datos del cliente'));
      addFg(body, 'Nombre', mkInput('fcn','text','','Nombre completo'));
      addFg(body, 'Empresa', mkInput('fce','text',''));
      mkRow2(body, mkFg('Email', mkInput('fcm','email','')), mkFg('Teléfono', mkInput('fct','text','')));

      // Paso 2: asignar sistema
      body.appendChild(el('div', {style:'border-top:.5px solid #E2E8F0;margin:14px 0 10px'}));
      body.appendChild(el('div', {style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'}, 'Sistema a asignar'));
      if (sis.length) {
        var selWrap = el('div', {style:'display:flex;align-items:center;gap:8px;margin-bottom:10px'});
        var chkSis = el('input', {type:'checkbox', id:'fc-asignar', style:'width:16px;height:16px;cursor:pointer'});
        chkSis.checked = true;
        var chkLabel = el('label', {for:'fc-asignar', style:'font-size:13px;color:#1a2e4a;cursor:pointer'}, 'Asignar sistema ahora');
        selWrap.appendChild(chkSis); selWrap.appendChild(chkLabel);
        body.appendChild(selWrap);
        var sisBox = el('div', {id:'fc-sisbox'});
        var sel = mkSelect('fc-sis', sis.map(function(s){ return [s.id, s.nombre+' — '+(P_LAB[s.plataforma]||s.plataforma)]; }), sis[0].id);
        addFg(sisBox, 'Sistema', sel);
        mkRow2(sisBox, mkFg('Día de cobro fee', mkInput('fc-dia','number','1')), mkFg('Fecha inicio', mkInput('fc-fec','date',new Date().toISOString().slice(0,10))));
        body.appendChild(sisBox);
        chkSis.onchange = function(){ sisBox.style.display = this.checked ? '' : 'none'; };
        var hint = el('div', {style:'font-size:11px;color:#94a3b8;margin-top:4px'}, 'Los precios se configuran desde Fases una vez creado.');
        body.appendChild(hint);
      } else {
        body.appendChild(el('div', {style:'font-size:12px;color:#94a3b8'}, 'No hay sistemas creados todavía — podrás asignar uno después.'));
      }
    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button', {class:'btn btnp'}, 'Crear cliente');
      ok.onclick = function() {
        var n = gv('fcn').trim(); if (!n) { alert('Nombre obligatorio'); return; }
        ok.textContent = 'Guardando...'; ok.disabled = true;
        dbIns('panel_clientes', {nombre:n, empresa:gv('fce')||null, email:gv('fcm')||null, telefono:gv('fct')||null, activo:true})
        .then(function(r) {
          var cid = (r[0]||{}).id;
          var chk = ge('fc-asignar');
          if (cid && chk && chk.checked && gv('fc-sis')) {
            return dbIns('panel_asignaciones', {
              cliente_id:cid, sistema_id:gv('fc-sis'), activo:true,
              fee_mensual:0, dia_cobro:Number(gv('fc-dia')||1),
              fecha_inicio:gv('fc-fec')||null
            });
          }
        }).then(function(){ closeM(); vClientes(); })
        .catch(function(e){ alert('Error: '+e.message); ok.textContent='Crear cliente'; ok.disabled=false; });
      };
      foot.appendChild(ok);
    }));
  });
}

function eliminarClienteCompleto(cl, cb) {
  // SOFT DELETE: se marca eliminado=true. El historial (asignaciones, cobros, recibos)
  // queda intacto en la base por si el cliente vuelve o se necesita el historico.
  if (!confirm('Eliminar a "' + cl.nombre + '"?\n\nDesaparece del panel pero su historial queda guardado (recuperable).')) return;
  dbUpd('panel_clientes', cl.id, {eliminado: true})
    .then(function(){ _D = null; if (cb) cb(); else vClientes(); })
    .catch(function(e){ alert('Error al eliminar: ' + e.message); });
}

function mEditCliente(cl) {
  openM(makeModal('Editar cliente', function(body) {
    addFg(body, 'Nombre', mkInput('ecn','text',cl.nombre));
    addFg(body, 'Empresa', mkInput('ece','text',cl.empresa||''));
    mkRow2(body, mkFg('Email', mkInput('ecm','email',cl.email||'')), mkFg('Telefono', mkInput('ect','text',cl.telefono||'')));
    var ta = el('textarea', {class:'fi', id:'ecno'}); ta.textContent = cl.notas||'';
    addFg(body, 'Notas', ta);
    // Estado del cliente
    var estadoRow=el('div',{style:'display:flex;align-items:center;gap:8px;margin-top:8px'});
    if (cl.es_demo) {
      var demoChk=el('input',{type:'checkbox',id:'ec-demo',class:'tgl'}); demoChk.checked=true;
      estadoRow.appendChild(demoChk);
      estadoRow.appendChild(el('label',{for:'ec-demo',class:'tgl-lbl'}));
      estadoRow.appendChild(el('span',{style:'font-size:12px;color:#94a3b8'},'Demo — destildá para activar como cliente real (no reversible)'));
    } else {
      var actChk=el('input',{type:'checkbox',id:'ec-activo',class:'tgl'}); if(!cl.pausado) actChk.checked=true;
      estadoRow.appendChild(actChk);
      estadoRow.appendChild(el('label',{for:'ec-activo',class:'tgl-lbl'}));
      var actLbl=el('span',{style:'font-size:13px;color:#64748b'},actChk.checked?'Activo':'Pausado');
      actChk.onchange=function(){ actLbl.textContent=actChk.checked?'Activo':'Pausado'; };
      estadoRow.appendChild(actLbl);
    }
    body.appendChild(estadoRow);
    // Partner (solo superadmin): asignar/sacar el cliente de un revendedor
    if (isSuperAdmin()) {
      var pWrap = el('div',{class:'fg',style:'margin-top:10px'});
      pWrap.appendChild(el('label',{class:'fl'},'Partner'));
      var pSel = el('select',{class:'fi',id:'ec-partner'});
      pSel.appendChild(el('option',{value:''},'— Sin partner (cliente directo QP) —'));
      pWrap.appendChild(pSel);
      pWrap.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-top:3px'},'Al asignar un partner, el cliente sale de tus vistas y cobros y pasa a las del partner.'));
      body.appendChild(pWrap);
      sbFetch('revendedores?select=id,nombre,activo&order=nombre.asc').then(function(revs){
        revs = (revs||[]).filter(function(rv){ return rv.activo!==false; });
        (revs||[]).forEach(function(r){
          var op = el('option',{value:r.id},r.nombre);
          if (cl.revendedor_id === r.id) op.selected = true;
          pSel.appendChild(op);
        });
      }).catch(function(){});
    }
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var eraDemo = !!cl.es_demo;
      var esDemo  = eraDemo ? !!(ge('ec-demo')&&ge('ec-demo').checked) : false;
      var pausado = !eraDemo ? !(ge('ec-activo')&&ge('ec-activo').checked) : false;
      var updCli = {nombre:gv('ecn'), empresa:gv('ece')||null, email:gv('ecm')||null, telefono:gv('ect')||null, notas:gv('ecno')||null, es_demo:esDemo, pausado:pausado};
      if (isSuperAdmin() && ge('ec-partner')) updCli.revendedor_id = gv('ec-partner') || null;
      dbUpd('panel_clientes', cl.id, updCli)
      .then(function(){
        closeM();
        if (eraDemo && !esDemo) {
          // Salió de demo — toast para asignar plan
          var asigConeos = (_D&&_D.asigs||[]).filter(function(a){ return a.cliente_id===cl.id && a.coneos_empresa_id; })[0];
          if (asigConeos) {
            var toast=el('div',{style:'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a2e4a;color:#fff;border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);font-size:13px'});
            toast.appendChild(el('span',{},'¿Asignar plan ahora?'));
            var btnP=el('button',{style:'background:#0B9EDA;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:600'},'Elegir plan');
            btnP.onclick=function(){ document.body.removeChild(toast); mPlanConeOS({id:asigConeos.coneos_empresa_id,nombre:cl.nombre,_dispActivos:0},asigConeos.id); };
            toast.appendChild(btnP);
            var btnX=el('button',{style:'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px'},'✕');
            btnX.onclick=function(){ document.body.removeChild(toast); vClientes(); };
            toast.appendChild(btnX);
            document.body.appendChild(toast);
            setTimeout(function(){ if(document.body.contains(toast)){ document.body.removeChild(toast); vClientes(); } },6000);
            return;
          }
        }
        vClientes();
      });
    };
    foot.appendChild(ok);
  }));
}

// ASIGNAR SISTEMA
function mAsignar(cid, cn) {
  dbGet('panel_sistemas').then(function(sis) {
    if (!sis.length) { alert('Primero crea un sistema.'); return; }
    openM(makeModal('Asignar sistema a ' + cn, function(body) {
      var info = el('div', {style:'background:#F0F9FF;border:.5px solid #BAE6FD;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#0369A1'});
      info.appendChild(document.createTextNode('Los precios de implementación y fee se configuran desde Fases una vez asignado.'));
      body.appendChild(info);
      var sel = mkSelect('assis', sis.map(function(s){ return [s.id, s.nombre+' - '+(P_LAB[s.plataforma]||s.plataforma)]; }), sis[0].id);
      addFg(body, 'Sistema', sel);
      mkRow2(body, mkFg('Dia de cobro fee', mkInput('asdia','number','1')), mkFg('Fecha inicio', mkInput('asfec','date',new Date().toISOString().slice(0,10))));
      addFg(body, 'Notas', mkInput('asnot','text','','Condiciones especiales...'));
    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button', {class:'btn btnp'}, 'Asignar');
      ok.onclick = function() {
        ok.textContent = 'Asignando...'; ok.disabled = true;
        dbIns('panel_asignaciones', {
          cliente_id:cid, sistema_id:gv('assis'), activo:true,
          fee_mensual:0, dia_cobro:Number(gv('asdia')||1),
          fecha_inicio:gv('asfec'), notas:gv('asnot')||null
        }).then(function(){ closeM(); vClientes(); })
        .catch(function(e){ alert('Error: '+e.message); ok.textContent='Asignar'; ok.disabled=false; });
      };
      foot.appendChild(ok);
    }));
  });
}

// FASES DE IMPLEMENTACION (generico, cualquier asignacion)
function mFases(a, cn, sn, cb) {
  function refrescar() {
    sbFetch('panel_implementacion_fases?asignacion_id=eq.' + a.id + '&select=*&order=numero.asc')
      .then(function(fases){ render(fases||[]); })
      .catch(function(){ render(a._fases||[]); });
  }
  function render(fases) {
    var pagosImpl = (a._cobs||[]).filter(function(c){ return c.estado==='pagado' && c.tipo_cobro==='implementacion'; });
    var totGeneral = fases.reduce(function(s,f){ return s+Number(f.monto||0); }, 0);
    var pagGeneral = pagosImpl.reduce(function(s,c){ return s+Number(c.monto); }, 0);

    openM(makeModal('Fases — ' + cn + ' / ' + sn, function(body) {
      // Sección comercial: fee, día, notas
      var comercialBox = el('div', {style:'background:#F8FAFC;border:.5px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:14px'});
      comercialBox.appendChild(el('div', {style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'}, 'Condiciones comerciales'));
      mkRow2(comercialBox, mkFg('Fee mensual ($)', mkInput('mf-fee','number',a.fee_mensual||0)), mkFg('Día de cobro', mkInput('mf-dia','number',a.dia_cobro||1)));
      addFg(comercialBox, 'Notas', mkInput('mf-notas','text',a.notas||''));
      var btnGuardarCom = el('button', {class:'btn btnsm', style:'margin-top:8px'}, 'Guardar condiciones');
      btnGuardarCom.onclick = function() {
        btnGuardarCom.textContent = 'Guardando...'; btnGuardarCom.disabled = true;
        dbUpd('panel_asignaciones', a.id, {fee_mensual:Number(gv('mf-fee')||0), dia_cobro:Number(gv('mf-dia')||1), notas:gv('mf-notas')||null})
        .then(function(){
          a.fee_mensual = Number(gv('mf-fee')||0);
          a.dia_cobro = Number(gv('mf-dia')||1);
          a.notas = gv('mf-notas')||null;
          btnGuardarCom.textContent = '✓ Guardado'; btnGuardarCom.disabled = false;
          setTimeout(function(){ btnGuardarCom.textContent = 'Guardar condiciones'; }, 2000);
        });
      };
      comercialBox.appendChild(btnGuardarCom);
      body.appendChild(comercialBox);

      // Banner precio sugerido ConeOS
      if (sn === 'ConeOS' && a.coneos_empresa_id) {
        var refBanner = el('div', {style:'background:#F0F9FF;border:.5px solid #BAE6FD;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#0369A1'});
        refBanner.appendChild(el('div', {style:'font-weight:600;margin-bottom:4px'}, '💡 Precio sugerido por módulos activos'));
        var refLoad = el('div', {style:'color:#94a3b8'}, 'Cargando...');
        refBanner.appendChild(refLoad);
        body.appendChild(refBanner);
        coneosCall('get_modulos', {empresa_id: a.coneos_empresa_id}).then(function(modulos) {
          refLoad.innerHTML = '';
          var impl = calcImplConeos(modulos||{});
          var lineas = [
            'Base (kiosk+caja+prep+display): '+fmt(500000),
            modulos.delivery    ? '+ Delivery: '+fmt(150000) : null,
            modulos.facturacion ? '+ Facturación: '+fmt(100000) : null,
            modulos.mercadopago ? '+ MercadoPago: '+fmt(100000) : null,
          ].filter(Boolean);
          lineas.forEach(function(l){ refLoad.appendChild(el('div', {}, l)); });
          var tot = el('div', {style:'font-weight:700;margin-top:4px;border-top:.5px solid #BAE6FD;padding-top:4px'}, 'Total sugerido: '+fmt(impl));
          refLoad.appendChild(tot);
        }).catch(function(){ refLoad.textContent = 'No se pudieron cargar los módulos'; });
      }

      if (totGeneral > 0) {
        var resumen = el('div', {style:'display:flex;justify-content:space-between;background:#E6F6FD;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px'});
        resumen.appendChild(el('span', {}, 'Total: ' + fmt(totGeneral) + '  ·  Pagado: ' + fmt(pagGeneral)));
        var saldoG = totGeneral - pagGeneral;
        resumen.appendChild(el('span', {style:'font-weight:700;color:' + (saldoG>0?'#854F0B':'#3D8A32')}, saldoG>0 ? 'Saldo: ' + fmt(saldoG) : 'Saldada'));
        body.appendChild(resumen);
      }

      if (!fases.length) {
        body.appendChild(el('div', {class:'emp', style:'margin-bottom:12px'}, 'Sin fases todavia — agrega la primera abajo.'));
      } else {
        fases.forEach(function(f) {
          var pagF = pagosImpl.filter(function(c){ return c.fase_id===f.id; }).reduce(function(s,c){ return s+Number(c.monto); }, 0);
          var saldoF = Number(f.monto) - pagF;
          var row = el('div', {style:'border:.5px solid #E2E8F0;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'});
          var left = el('div', {});
          left.appendChild(el('div', {style:'font-weight:500;font-size:13px'}, 'Fase ' + f.numero + ' — ' + f.nombre));
          left.appendChild(el('div', {style:'font-size:11px;color:#64748B;margin-top:2px'},
            fmt(f.monto) + ' total · ' + fmt(pagF) + ' pagado · ' + (saldoF>0 ? fmt(saldoF)+' saldo' : 'saldada')));
          row.appendChild(left);
          var right = el('div', {style:'display:flex;gap:6px'});
          var btnE = el('button', {class:'btn btnsm'}, 'Editar');
          (function(ff){ btnE.onclick = function(){ mEditarFase(ff, refrescar); }; })(f);
          right.appendChild(btnE);
          var btnD = el('button', {class:'btn btnsm', style:'background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'}, 'X');
          (function(ff){ btnD.onclick = function(){
            if (pagF > 0) { alert('Esta fase ya tiene pagos registrados, no se puede eliminar.'); return; }
            if (!confirm('Eliminar Fase ' + ff.numero + ' — ' + ff.nombre + '?')) return;
            sbFetch('panel_implementacion_fases?id=eq.' + ff.id, {method:'DELETE', prefer:'return=minimal'}).then(refrescar);
          }; })(f);
          right.appendChild(btnD);
          row.appendChild(right);
          body.appendChild(row);
        });
      }

      body.appendChild(el('div', {style:'border-top:.5px solid #E2E8F0;margin:14px 0 10px'}));
      var addBox = el('div', {style:'background:#F8FAFC;border-radius:8px;padding:14px'});
      // Si el sistema tiene fases estructurales, mostrar selector
      var fasesEstructura = (a._fasesEstructura||[]).filter(function(fe){
        return !fases.some(function(f){ return f.fase_id === fe.id; });
      });
      if (fasesEstructura.length) {
        addBox.appendChild(el('div', {style:'font-size:12px;font-weight:500;color:#64748B;margin-bottom:8px'}, 'Asignar precio a fase del sistema'));
        var sel = el('select', {id:'nf-fase', style:'width:100%;padding:8px 10px;border:.5px solid #E2E8F0;border-radius:8px;font-size:13px;margin-bottom:8px'});
        sel.appendChild(el('option', {value:''}, '— Elegir fase —'));
        fasesEstructura.forEach(function(fe) {
          sel.appendChild(el('option', {value:fe.id}, fe.orden+'. '+fe.nombre+(fe.descripcion?' — '+fe.descripcion:'')));
        });
        addBox.appendChild(sel);
        addFg(addBox, 'Precio acordado ($)', mkInput('nf-monto','number','0'));
        var btnAdd = el('button', {class:'btn btnp', style:'margin-top:6px'}, '+ Asignar precio');
        btnAdd.onclick = function() {
          var faseId = gv('nf-fase'); if (!faseId) { alert('Elegí una fase'); return; }
          var fe = fasesEstructura.find(function(f){ return f.id===faseId; });
          var siguienteNum = fases.length ? Math.max.apply(null, fases.map(function(f){ return f.numero; })) + 1 : 1;
          dbIns('panel_implementacion_fases', {
            asignacion_id:a.id, numero:siguienteNum,
            nombre:fe.nombre, monto:Number(gv('nf-monto')||0), fase_id:faseId
          }).then(refrescar);
        };
        addBox.appendChild(btnAdd);
      } else if (sn === 'ConeOS') {
        // ConeOS: precio único confirmado por módulos
        if (fases.length) {
          addBox.appendChild(el('div', {style:'font-size:12px;color:#3D8A32'}, '✓ Precio de implementación ya confirmado. Editá la fase para ajustarlo.'));
        } else {
          addBox.appendChild(el('div', {style:'font-size:12px;font-weight:500;color:#64748B;margin-bottom:8px'}, 'Confirmar precio de implementación'));
          var hint = el('div', {style:'font-size:11px;color:#94a3b8;margin-bottom:10px'}, 'El precio sugerido se calcula por los módulos activos. Podés ajustarlo si acordaste otro valor con el cliente.');
          addBox.appendChild(hint);
          addFg(addBox, 'Precio acordado ($)', mkInput('nf-monto','number','0'));
          var btnAddC = el('button', {class:'btn btnp', style:'margin-top:6px'}, '✓ Confirmar precio');
          btnAddC.onclick = function() {
            var monto = Number(gv('nf-monto')||0);
            if (!monto) { alert('Ingresá el precio'); return; }
            dbIns('panel_implementacion_fases', {
              asignacion_id:a.id, numero:1,
              nombre:'Implementación ConeOS', monto:monto
            }).then(refrescar);
          };
          addBox.appendChild(btnAddC);
        }
      } else {
        addBox.appendChild(el('div', {style:'font-size:12px;color:#3D8A32'}, '✓ Todas las fases del sistema ya tienen precio asignado.'));
      }
      body.appendChild(addBox);
    }, function(foot) {
      var cerrar = el('button', {class:'btn btnp'}, 'Cerrar');
      cerrar.onclick = function(){ closeM(); cb(); };
      foot.appendChild(cerrar);
    }));
  }
  refrescar();
}

function mEditarFase(f, cb) {
  openM(makeModal('Editar Fase ' + f.numero, function(body) {
    addFg(body, 'Nombre', mkInput('ef-nom','text',f.nombre));
    addFg(body, 'Monto ($)', mkInput('ef-monto','number',f.monto||0));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      dbUpd('panel_implementacion_fases', f.id, {nombre:gv('ef-nom'), monto:Number(gv('ef-monto')||0)})
        .then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}

// EDITAR ASIGNACION
function mEditAsig(a) {
  openM(makeModal('Editar asignacion', function(body) {
    mkRow2(body, mkFg('Precio implementacion ($)', mkInput('eap','number',a.precio_acordado||0)), mkFg('Fee mensual ($)', mkInput('eaf','number',a.fee_mensual||0)));
    mkRow2(body, mkFg('Dia de cobro', mkInput('ead','number',a.dia_cobro||1)), mkFg('Notas', mkInput('ean','text',a.notas||'')));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      dbUpd('panel_asignaciones', a.id, {precio_acordado:Number(gv('eap')||0), costo_implementacion_acordado:Number(gv('eap')||0), fee_mensual:Number(gv('eaf')||0), dia_cobro:Number(gv('ead')||1), notas:gv('ean')||null})
      .then(function(){ closeM(); vClientes(); });
    };
    foot.appendChild(ok);
  }));
}

// SUB ENTIDAD
function mVincularEmpresaConeos(a, cb) {
  coneosCall('listar_empresas').then(function(empresas) {
    if (!Array.isArray(empresas)) { alert('Error al cargar empresas ConeOS'); return; }
    openM(makeModal('Vincular empresa ConeOS', function(body) {
      var info = el('div', {style:'background:#FEF9C3;border:.5px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#854F0B'});
      info.appendChild(document.createTextNode('Seleccioná la empresa de ConeOS que corresponde a este cliente. Esto permite ver los módulos activos y el precio sugerido en Fases.'));
      body.appendChild(info);
      if (a.coneos_empresa_id) {
        var actual = empresas.find(function(e){ return e.id === a.coneos_empresa_id; });
        var actBox = el('div', {style:'background:#F0FDF4;border:.5px solid #BBF7D0;border-radius:8px;padding:8px 14px;margin-bottom:10px;font-size:12px;color:#166534'});
        actBox.appendChild(document.createTextNode('✓ Vinculada: ' + (actual ? actual.nombre : a.coneos_empresa_id)));
        body.appendChild(actBox);
      }
      var sel = el('select', {id:'cev-sel', style:'width:100%;padding:8px 10px;border:.5px solid #E2E8F0;border-radius:8px;font-size:13px'});
      sel.appendChild(el('option', {value:''}, '— Elegir empresa —'));
      empresas.forEach(function(e) {
        var opt = el('option', {value: e.id}, e.nombre + (e.activo ? '' : ' (inactiva)'));
        if (e.id === a.coneos_empresa_id) opt.selected = true;
        sel.appendChild(opt);
      });
      addFg(body, 'Empresa ConeOS', sel);
    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button', {class:'btn btnp'}, 'Vincular');
      ok.onclick = function() {
        var empId = gv('cev-sel');
        if (!empId) { alert('Elegí una empresa'); return; }
        ok.textContent = 'Guardando...'; ok.disabled = true;
        dbUpd('panel_asignaciones', a.id, {coneos_empresa_id: empId}).then(function() {
          a.coneos_empresa_id = empId;
          closeM();
          if (cb) cb(); else vClientes();
        }).catch(function(e) {
          ok.textContent = 'Vincular'; ok.disabled = false;
          alert('Error: ' + e.message);
        });
      };
      foot.appendChild(ok);
    }));
  }).catch(function(e){ alert('Error: ' + e.message); });
}

function mSubEntidad(aid, tipo) {
  var et = tipo==='multi_usuario' ? 'usuario' : 'empresa';
  openM(makeModal('Alta de ' + et, function(body) {
    addFg(body, 'Nombre', mkInput('sen','text','','Ej: Sucursal Norte'));
    addFg(body, 'Email', mkInput('see','email',''));
    addFg(body, 'Precio extra ($)', mkInput('sep','number','0'));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Dar de alta');
    ok.onclick = function() {
      var n = gv('sen').trim(); if (!n) { alert('Nombre obligatorio'); return; }
      dbIns('panel_sub_entidades', {asignacion_id:aid, nombre:n, tipo:et, email:gv('see')||null, precio_extra:Number(gv('sep')||0), activo:true})
      .then(function(){ closeM(); vClientes(); });
    };
    foot.appendChild(ok);
  }));
}

// COBRAR (cliente)
function vResumenCliente(a, cl, s) {
  if (!_D || !_D.cobs) { cargar().then(function(D){ _D=D; vResumenCliente(a, cl, s); }); return; }
  var wrap = el('div', {});

  // Header
  var sh = el('div', {class:'sh', style:'margin-bottom:16px'});
  var btnBack = el('button', {class:'btn'}, '← Clientes');
  btnBack.onclick = function(){ go('clientes'); };
  sh.appendChild(btnBack);
  
  (function(){
    var hdr=el('div',{style:'display:flex;align-items:center;gap:6px;margin-left:12px'});
    hdr.appendChild(getSisIconEl(s.nombre,18));
    hdr.appendChild(el('span',{class:'st'},cl.nombre+' — '+s.nombre));
    sh.appendChild(hdr);
  })();
  wrap.appendChild(sh);

  // Saldos
  var cobs = (_D.cobs||[]).filter(function(c){ return c.asignacion_id === a.id; });
  var impl = Number(a.costo_implementacion||0) || (a._fases||[]).reduce(function(s,f){ return s+Number(f.monto||0); },0);
  var pagadoImpl = cobs.filter(function(c){ return c.tipo_cobro==='implementacion' && c.estado==='pagado'; }).reduce(function(s,c){ return s+Number(c.monto); },0);
  var saldoImpl = impl - pagadoImpl;
  var fee = Number(a.fee_mensual||0);
  var feesPagados = cobs.filter(function(c){ return c.tipo_cobro==='fee' && c.estado==='pagado'; }).length;
  var hoyRes = new Date(); hoyRes.setHours(0,0,0,0);
  var feesPendientes = cobs.filter(function(c){
    return c.tipo_cobro==='fee' && c.estado!=='pagado' &&
      c.fecha_vencimiento && new Date(c.fecha_vencimiento) <= hoyRes;
  });

  // Card saldo
  var saldoCard = el('div', {class:'card', style:'padding:16px;margin-bottom:14px'});
  saldoCard.appendChild(el('div', {class:'st', style:'margin-bottom:12px'}, 'Estado de cuenta'));
  var mets = el('div', {class:'mets'});
  [{label:'Implementación', val:fmt(impl), col:'#64748B'},
   {label:'Pagado', val:fmt(pagadoImpl), col:'#3D8A32'},
   {label:'Saldo impl.', val:fmt(saldoImpl), col:saldoImpl>0?'#854F0B':'#3D8A32'},
   {label:'Fee mensual', val:fmt(fee), col:'#0B9EDA'}
  ].forEach(function(m){
    var mc = el('div', {class:'met'});
    mc.appendChild(el('div', {class:'mst', style:'background:'+m.col}));
    mc.appendChild(el('div', {class:'mlb'}, m.label));
    mc.appendChild(el('div', {class:'mv', style:'font-size:18px;color:'+m.col}, m.val));
    mets.appendChild(mc);
  });
  saldoCard.appendChild(mets);

  // Fees pendientes
  if (feesPendientes.length) {
    var fpWrap = el('div', {style:'margin-top:12px;background:#FEF3C7;border-radius:8px;padding:10px 14px'});
    fpWrap.appendChild(el('div', {style:'font-size:12px;color:#854F0B;font-weight:500'}, '⚠ '+feesPendientes.length+' fee'+(feesPendientes.length!==1?'s':'')+' pendiente'+(feesPendientes.length!==1?'s':'')));
    feesPendientes.forEach(function(f){
      var fr = el('div', {style:'font-size:12px;color:#64748B;margin-top:4px'});
      fr.textContent = (f.descripcion||'Fee') + ' — ' + fmt(Number(f.monto)) + ' · vence ' + fdate(f.fecha_vencimiento);
      fpWrap.appendChild(fr);
    });
    saldoCard.appendChild(fpWrap);
  }
  wrap.appendChild(saldoCard);

  // Historial de pagos
  var histCard = el('div', {class:'card', style:'padding:16px'});
  histCard.appendChild(el('div', {class:'st', style:'margin-bottom:12px'}, 'Historial de pagos'));
  var todosCobrosSorted = cobs.slice().sort(function(x,y){ return (y.fecha_pago||y.fecha_vencimiento||'').localeCompare(x.fecha_pago||x.fecha_vencimiento||''); });
  if (!todosCobrosSorted.length) {
    histCard.appendChild(el('div', {class:'emp'}, 'Sin pagos registrados'));
  } else {
    var tbl = el('table', {class:'tbl'});
    tbl.appendChild(elH('thead', {}, '<tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th style="text-align:right">Monto</th><th>Estado</th></tr>'));
    var tb = el('tbody', {});
    todosCobrosSorted.forEach(function(c) {
      var tr = el('tr', {style: c.estado!=='pagado'?'opacity:.7':''});
      tr.appendChild(el('td', {style:'color:#64748B;font-size:12px'}, fdate(c.fecha_pago||c.fecha_vencimiento)||'-'));
      var tipoLabel = c.tipo_cobro==='implementacion'?'Entrega impl.':c.tipo_cobro==='fee'?'Fee':'Otro';
      tr.appendChild(el('td', {}, [chipClass(tipoLabel, c.tipo_cobro==='implementacion'?'cp':c.tipo_cobro==='fee'?'cb':'cg')]));
      var desc = c.descripcion || '';
      if (c.tipo_cobro==='implementacion' && c._fase) desc = (c._fase.nombre||'Fase '+c._fase.numero) + (desc?' — '+desc:'');
      tr.appendChild(el('td', {style:'font-size:12px;color:#64748B'}, desc||'-'));
      tr.appendChild(el('td', {style:'text-align:right;font-weight:500;color:'+(c.estado==='pagado'?'#3D8A32':'#854F0B')}, fmt(Number(c.monto))));
      var esVencido = c.estado!=='pagado' && c.fecha_vencimiento && new Date(c.fecha_vencimiento) <= hoyRes;
      tr.appendChild(el('td', {}, [chipClass(c.estado==='pagado'?'Pagado':esVencido?'Pendiente':'Por vencer', c.estado==='pagado'?'cv':esVencido?'ca':'cgr')]));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    histCard.appendChild(tbl);
    var totPag = cobs.filter(function(c){ return c.estado==='pagado'; }).reduce(function(s,c){ return s+Number(c.monto); },0);
    var totPend = cobs.filter(function(c){
      return c.estado!=='pagado' && c.fecha_vencimiento && new Date(c.fecha_vencimiento) <= hoyRes;
    }).reduce(function(s,c){ return s+Number(c.monto); },0);
    var totRow = el('div', {style:'display:flex;justify-content:space-between;gap:16px;padding:10px 0 0;margin-top:6px;border-top:.5px solid #E2E8F0;font-size:13px'});
    var tLeft = el('div',{}); tLeft.appendChild(el('span',{style:'color:#64748B'},'Cobrado: ')); tLeft.appendChild(el('span',{style:'font-weight:600;color:#3D8A32'},fmt(totPag)));
    var tRight = el('div',{}); tRight.appendChild(el('span',{style:'color:#64748B'},'Pendiente: ')); tRight.appendChild(el('span',{style:'font-weight:600;color:#854F0B'},fmt(totPend)));
    totRow.appendChild(tLeft); totRow.appendChild(tRight);
    histCard.appendChild(totRow);
  }
  wrap.appendChild(histCard);
  setApp(wrap);
}

function mCobrar(a, cl, si, fee, totI, saldoI) {
  var aid = a.id;
  var fasesConSaldo = (a._fases||[]).map(function(f) {
    var pag = pagadoFase(f, a);
    return {f:f, saldo:Number(f.monto)-pag};
  }).filter(function(x){ return x.saldo > 0.01; });

  openM(makeModal('Cobro - ' + cl, function(body) {
    body.appendChild(el('div', {class:'ibox'}, cl + ' - ' + si));
    var tipos = [['fee','Fee mensual']];
    if (saldoI > 0) tipos.push(['implementacion', 'Entrega impl. (saldo ' + fmt(saldoI) + ')']);
    var selT = mkSelect('rct', tipos, 'fee');
    var faseWrap = el('div', {id:'rcfasewrap', style:'display:none'});
    if (fasesConSaldo.length) {
      var selF = mkSelect('rcfase', fasesConSaldo.map(function(x){ return [x.f.id, 'Fase ' + x.f.numero + ' — ' + x.f.nombre + ' (saldo ' + fmt(x.saldo) + ')']; }), fasesConSaldo[0].f.id);
      selF.onchange = function() {
        var sel = fasesConSaldo.find(function(x){ return x.f.id===this.value; }, this);
        if (sel) { ge('rcm').value = sel.saldo; ge('rcd').value = 'Entrega implementacion — Fase ' + sel.f.numero + ' — ' + sel.f.nombre; }
      };
      faseWrap.appendChild(mkFg('Fase', selF));
    }
    selT.onchange = function() {
      if (this.value==='fee') { ge('rcm').value=fee; ge('rcd').value='Fee mensual '+MESES[new Date().getMonth()]+' '+new Date().getFullYear(); faseWrap.style.display='none'; }
      else {
        faseWrap.style.display = fasesConSaldo.length ? '' : 'none';
        if (fasesConSaldo.length) { ge('rcm').value=fasesConSaldo[0].saldo; ge('rcd').value='Entrega implementacion — Fase ' + fasesConSaldo[0].f.numero + ' — ' + fasesConSaldo[0].f.nombre; }
        else { ge('rcm').value=saldoI; ge('rcd').value='Entrega implementacion'; }
      }
    };
    addFg(body, 'Tipo de cobro', selT);
    body.appendChild(faseWrap);
    addFg(body, 'Descripcion', mkInput('rcd','text','Fee mensual '+MESES[new Date().getMonth()]+' '+new Date().getFullYear()));
    mkRow2(body, mkFg('Monto ($)', mkInput('rcm','number',fee)), mkFg('Metodo', mkSelect('rcmet',[['transferencia','Transferencia'],['efectivo','Efectivo'],['mercadopago','MercadoPago']],'transferencia')));
    mkRow2(body, mkFg('Vencimiento', mkInput('rcv','date',new Date().toISOString().slice(0,10))), mkFg('Estado', mkSelect('rce',[['pendiente','Pendiente'],['pagado','Pagado']],'pendiente')));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Registrar');
    ok.onclick = function() {
      var estado=gv('rce'), monto=Number(gv('rcm')||0), fecha=gv('rcv'), desc=gv('rcd'), met=gv('rcmet'), tipo=gv('rct');
      var faseId = (tipo==='implementacion' && fasesConSaldo.length) ? gv('rcfase') : null;
      dbIns('panel_cobros', {asignacion_id:aid, tipo_cobro:tipo, fase_id:faseId, descripcion:desc, monto:monto, metodo:met, fecha_vencimiento:fecha, fecha_pago:estado==='pagado'?fecha:null, estado:estado})
      .then(function(r) {
        closeM();
        if (estado==='pagado') qpConfirm('Generar recibo?', function(){ mRecibo({cli:cl, sis:si, desc:desc, monto:monto, met:met, fecha:fecha, estado:estado, num:(r[0]||{}).id?(r[0].id.slice(-4)):'0001', cobro_id:(r[0]||{}).id}); }, {si:'Generar', no:'No'});
        vCobros();
      });
    };
    foot.appendChild(ok);
  }));
}

// COBRAR FEE (alertas)
function mCobrarFee(aid, cl, si, monto, mes, anio) {
  openM(makeModal('Fee ' + MESES[mes-1] + ' ' + anio, function(body) {
    body.appendChild(el('div', {class:'ibox'}, si + ' - ' + MESES[mes-1] + ' ' + anio));
    addFg(body, 'Descripcion', mkInput('cfd','text','Fee mensual '+MESES[mes-1]+' '+anio));
    mkRow2(body, mkFg('Monto ($)', mkInput('cfm','number',monto)), mkFg('Metodo', mkSelect('cfmet',[['transferencia','Transferencia'],['efectivo','Efectivo'],['mercadopago','MercadoPago']],'transferencia')));
    mkRow2(body, mkFg('Fecha', mkInput('cff','date',new Date().toISOString().slice(0,10))), mkFg('Estado', mkSelect('cfe',[['pagado','Pagado'],['pendiente','Pendiente']],'pagado')));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btns'}, 'Confirmar');
    ok.onclick = function() {
      var estado=gv('cfe'), mon=Number(gv('cfm')||0), fecha=gv('cff');
      dbIns('panel_cobros', {asignacion_id:aid, tipo_cobro:'fee', descripcion:gv('cfd'), monto:mon, metodo:gv('cfmet'), fecha_pago:estado==='pagado'?fecha:null, fecha_vencimiento:fecha, estado:estado})
      .then(function(r) {
        closeM();
        if (estado==='pagado') { var cfd_ = gv('cfd'), cfmet_ = gv('cfmet'); qpConfirm('Generar recibo?', function(){ mRecibo({cli:cl, sis:si, desc:cfd_, monto:mon, met:cfmet_, fecha:fecha, estado:estado, num:(r[0]||{}).id?r[0].id.slice(-4):'0001', cobro_id:(r[0]||{}).id}); }, {si:'Generar', no:'No'}); }
        vAlertas();
      });
    };
    foot.appendChild(ok);
  }));
}

// ENTREGA IMPL (alertas)
function mEntrega(a, cl, si, saldo) {
  var aid = a.id;
  var fasesConSaldo = (a._fases||[]).map(function(f) {
    var pag = pagadoFase(f, a);
    return {f:f, saldo:Number(f.monto)-pag};
  }).filter(function(x){ return x.saldo > 0.01; });

  openM(makeModal('Entrega implementacion', function(body) {
    body.appendChild(el('div', {class:'ibox iboxg'}, si + ' - Saldo: ' + fmt(saldo)));
    if (fasesConSaldo.length) {
      var selF = mkSelect('cefase', fasesConSaldo.map(function(x){ return [x.f.id, 'Fase ' + x.f.numero + ' — ' + x.f.nombre + ' (saldo ' + fmt(x.saldo) + ')']; }), fasesConSaldo[0].f.id);
      selF.onchange = function() {
        var sel = fasesConSaldo.find(function(x){ return x.f.id===this.value; }, this);
        if (sel) { ge('cem').value = sel.saldo; ge('ced').value = 'Entrega implementacion — Fase ' + sel.f.numero + ' — ' + sel.f.nombre; }
      };
      addFg(body, 'Fase', selF);
      addFg(body, 'Descripcion', mkInput('ced','text','Entrega implementacion — Fase ' + fasesConSaldo[0].f.numero + ' — ' + fasesConSaldo[0].f.nombre));
      mkRow2(body, mkFg('Monto ($)', mkInput('cem','number',fasesConSaldo[0].saldo)), mkFg('Metodo', mkSelect('cemet',[['transferencia','Transferencia'],['efectivo','Efectivo'],['mercadopago','MercadoPago']],'transferencia')));
    } else {
      addFg(body, 'Descripcion', mkInput('ced','text','Entrega implementacion '+si));
      mkRow2(body, mkFg('Monto ($)', mkInput('cem','number',saldo)), mkFg('Metodo', mkSelect('cemet',[['transferencia','Transferencia'],['efectivo','Efectivo'],['mercadopago','MercadoPago']],'transferencia')));
    }
    mkRow2(body, mkFg('Fecha', mkInput('cef','date',new Date().toISOString().slice(0,10))), mkFg('Estado', mkSelect('cee',[['pagado','Pagado'],['pendiente','Pendiente']],'pagado')));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btns'}, 'Confirmar');
    ok.onclick = function() {
      var estado=gv('cee'), mon=Number(gv('cem')||0), fecha=gv('cef');
      var faseId = fasesConSaldo.length ? gv('cefase') : null;
      dbIns('panel_cobros', {asignacion_id:aid, tipo_cobro:'implementacion', fase_id:faseId, descripcion:gv('ced'), monto:mon, metodo:gv('cemet'), fecha_pago:estado==='pagado'?fecha:null, fecha_vencimiento:fecha, estado:estado})
      .then(function(r) {
        closeM();
        if (estado==='pagado') { var ced_ = gv('ced'), cemet_ = gv('cemet'); qpConfirm('Generar recibo?', function(){ mRecibo({cli:cl, sis:si, desc:ced_, monto:mon, met:cemet_, fecha:fecha, estado:estado, num:(r[0]||{}).id?r[0].id.slice(-4):'0001', cobro_id:(r[0]||{}).id}); }, {si:'Generar', no:'No'}); }
        vAlertas();
      });
    };
    foot.appendChild(ok);
  }));
}

// COBRO RAPIDO
function mCobrarRapido() {
  if (!_D || !_D.asigs.length) { alert('No hay asignaciones.'); return; }
  openM(makeModal('Registrar cobro', function(body) {
    var sel = el('select', {class:'fi', id:'rqa'});
    _D.asigs.filter(function(a){ return !a._cli.revendedor_id && !a._cli.eliminado; }).forEach(function(a) {
      var sisNombre = a.sistema_id === '45d2d4de-e938-4a95-827d-f29f575eff10' ? 'Trabajo puntual' : a._sis.nombre;
      var op = el('option', {value:a.id}, a._cli.nombre + ' - ' + sisNombre);
      op.dataset.fee = a.fee_mensual||0; sel.appendChild(op);
    });
    var faseWrap = el('div', {id:'rqfasewrap', style:'display:none'});
    function fasesDeAsig() {
      var a = _D.asigs.find(function(x){ return x.id===sel.value; });
      if (!a) return [];
      return (a._fases||[]).map(function(f){ return {f:f, saldo:Number(f.monto)-pagadoFase(f,a)}; }).filter(function(x){ return x.saldo > 0.01; });
    }
    function actualizarFaseWrap() {
      faseWrap.innerHTML = '';
      var tipo = gv('rqt');
      if (tipo !== 'implementacion') { faseWrap.style.display = 'none'; return; }
      var fases = fasesDeAsig();
      if (!fases.length) { faseWrap.style.display = 'none'; return; }
      var selF = mkSelect('rqfase', fases.map(function(x){ return [x.f.id, 'Fase ' + x.f.numero + ' — ' + x.f.nombre + ' (saldo ' + fmt(x.saldo) + ')']; }), fases[0].f.id);
      selF.onchange = function() {
        var ssel = fases.find(function(x){ return x.f.id===this.value; }, this);
        if (ssel) { ge('rqm').value = ssel.saldo; ge('rqd').value = 'Entrega implementacion — Fase ' + ssel.f.numero + ' — ' + ssel.f.nombre; }
      };
      faseWrap.appendChild(mkFg('Fase', selF));
      faseWrap.style.display = '';
      ge('rqm').value = fases[0].saldo;
      ge('rqd').value = 'Entrega implementacion — Fase ' + fases[0].f.numero + ' — ' + fases[0].f.nombre;
    }
    sel.onchange = function() { var op = sel.options[sel.selectedIndex]; ge('rqm').value = op.dataset.fee||0; actualizarFaseWrap(); };
    addFg(body, 'Cliente / Sistema', sel);
    var selT = mkSelect('rqt',[['fee','Fee mensual'],['implementacion','Implementacion']],'fee');
    selT.onchange = actualizarFaseWrap;
    addFg(body, 'Tipo', selT);
    body.appendChild(faseWrap);
    addFg(body, 'Descripcion', mkInput('rqd','text','Fee mensual '+MESES[new Date().getMonth()]+' '+new Date().getFullYear()));
    mkRow2(body, mkFg('Monto ($)', mkInput('rqm','number',(_D.asigs[0]||{}).fee_mensual||0)), mkFg('Metodo', mkSelect('rqmet',[['transferencia','Transferencia'],['efectivo','Efectivo'],['mercadopago','MercadoPago']],'transferencia')));
    mkRow2(body, mkFg('Vencimiento', mkInput('rqv','date',new Date().toISOString().slice(0,10))), mkFg('Estado', mkSelect('rqe',[['pendiente','Pendiente'],['pagado','Pagado']],'pendiente')));

  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Registrar');
    ok.onclick = function() {
      var sel = ge('rqa'), op = sel.options[sel.selectedIndex];
      var cl = op.textContent.split(' - ')[0], si = op.textContent.split(' - ')[1]||'';
      var estado=gv('rqe'), monto=Number(gv('rqm')||0), fecha=gv('rqv'), tipo=gv('rqt');
      var faseId = (tipo==='implementacion' && ge('rqfase')) ? gv('rqfase') : null;
      var desc=gv('rqd'), met=gv('rqmet');
      dbIns('panel_cobros', {asignacion_id:sel.value, tipo_cobro:tipo, fase_id:faseId, descripcion:desc, monto:monto, metodo:met, fecha_vencimiento:fecha, fecha_pago:estado==='pagado'?fecha:null, estado:estado})
      .then(function(r) {
        closeM();
        if (estado==='pagado') qpConfirm('Generar recibo?', function(){
          mostrarReciboModal({cli:cl, sis:si, desc:desc, monto:monto, met:met, fecha:fecha, estado:estado, cobro_id:(r[0]||{}).id});
        }, {si:'Generar', no:'No'});
        vCobros();
      });
    };
    foot.appendChild(ok);
  }));
}

// ── SALUD DEL SISTEMA ─────────────────────────────────────────
function vSalud() {
  loading();
  var HEALTH_URL = 'https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/health-check';
  var ANON = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg';

  var wrap = el('div', {});
  var sh = el('div', {class:'sh'});
  sh.appendChild(el('span', {class:'st'}, 'Salud de sistemas'));
  var btnR = el('button', {class:'btn'}, 'Actualizar');
  btnR.onclick = function(){ vSalud(); };
  sh.appendChild(btnR);
  function callVacuum(forzar) {
    var url = 'https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/run-vacuum';
    var auth = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({ forzar: forzar })
    }).then(function(r){ return r.json(); });
  }

  var btnV = el('button', {class:'btn', style:'margin-left:6px'}, 'Estado VACUUM');
  btnV.onclick = function() {
    btnV.textContent = 'Consultando...'; btnV.disabled = true;
    callVacuum(false).then(function(d) {
      btnV.textContent = 'Estado VACUUM'; btnV.disabled = false;
      if (d.error) { alert('Error: ' + d.error); return; }
      var res = d.resultados || [];
      var lineas = ['Estado de tablas:', ''];
      res.forEach(function(r) {
        lineas.push('-- ' + r.proyecto + ' --');
        if (!r.ok) { lineas.push('Error: ' + r.error); return; }
        if (!r.tablas_con_bloat) { lineas.push('Todas las tablas OK'); }
        else {
          lineas.push(r.tablas_con_bloat + ' tabla(s) con bloat:');
          (r.detalle||[]).forEach(function(t){ lineas.push('  ' + t.tabla + ': ' + t.muertas + ' muertas / ' + t.filas + ' vivas'); });
        }
        lineas.push('');
      });
      lineas.push('Automatico: ' + (d.vacuum_schedule||'domingos 3am UTC'));
      alert(lineas.join('\n'));
    }).catch(function(e){ btnV.textContent = 'Estado VACUUM'; btnV.disabled = false; alert('Error: ' + e.message); });
  };
  sh.appendChild(btnV);

  var btnVF = el('button', {class:'btn', style:'margin-left:6px;border-color:#EF9F27;color:#854F0B'}, 'Forzar VACUUM');
  btnVF.onclick = function() {
    if (!confirm('Forzar VACUUM ahora en MobixERP, Cortelab, El Piamonte y ConeOS?\nEl proceso corre via pg_cron en ~1 minuto. No hay riesgo para los datos.')) return;
    btnVF.textContent = 'Programando...'; btnVF.disabled = true;
    callVacuum(true).then(function(d) {
      btnVF.textContent = 'Forzar VACUUM'; btnVF.disabled = false;
      if (d.error) { alert('Error: ' + d.error); return; }
      var msgs = (d.resultados||[]).map(function(r){ return r.proyecto + ': ' + (r.mensaje||r.error||'OK'); });
      alert('Vacuum programado:\n\n' + msgs.join('\n') + '\n\nCorrera en ~1 minuto automaticamente.');
    }).catch(function(e){ btnVF.textContent = 'Forzar VACUUM'; btnVF.disabled = false; alert('Error: ' + e.message); });
  };
  sh.appendChild(btnVF);
  wrap.appendChild(sh);

  var loadCard = el('div', {class:'card'});
  var loadDiv = el('div', {class:'emp'}, 'Analizando sistemas...');
  loadCard.appendChild(loadDiv);
  wrap.appendChild(loadCard);
  setApp(wrap);

  Promise.all([
    fetch(HEALTH_URL, { method:'POST', headers:{'Content-Type':'application/json','Authorization':ANON}, body:'{}' }).then(function(r){ return r.json(); }).catch(function(){ return {}; }),
    fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/supa-costos', { method:'POST', headers:{'Content-Type':'application/json','Authorization':ANON}, body:'{}' }).then(function(r){ return r.json(); }).catch(function(){ return null; })
  ]).then(function(res) {
    var d = res[0]; var costos = res[1];
    if (d.error) { loadDiv.textContent = 'Error: ' + d.error; return; }
    var alertas = d.alertas || [];
    var proyectos = d.proyectos || [];
    wrap.removeChild(loadCard);

    if (alertas.length) {
      var aWrap = el('div', {style:'margin-bottom:16px'});
      aWrap.appendChild(el('div', {class:'st', style:'margin-bottom:10px'}, alertas.length + ' ALERTA' + (alertas.length!==1?'S':'')));
      alertas.forEach(function(al) {
        var col = al.tipo==='error'?'#A32D2D':al.tipo==='warning'?'#854F0B':'#0C6FA3';
        var bg  = al.tipo==='error'?'#FCEBEB':al.tipo==='warning'?'#FAEEDA':'#E6F6FD';
        var ic  = al.tipo==='error'?'⚠':'ℹ';
        var row = el('div', {style:'background:'+bg+';border:.5px solid '+col+';border-radius:8px;padding:11px 14px;margin-bottom:7px;display:flex;gap:10px;align-items:flex-start'});
        row.appendChild(el('span', {style:'font-size:15px;flex-shrink:0;color:'+col}, ic));
        var txt = el('div', {});
        txt.appendChild(el('div', {style:'font-weight:500;font-size:13px;color:'+col}, '['+al.sistema+'] '+al.mensaje));
        if (al.detalle) txt.appendChild(el('div', {style:'font-size:11px;color:'+col+';opacity:.8;margin-top:3px'}, al.detalle));
        row.appendChild(txt);
        aWrap.appendChild(row);
      });
      wrap.appendChild(aWrap);
    } else {
      var ok = el('div', {style:'background:#EDF7EA;border:.5px solid #5BBD4E;border-radius:8px;padding:13px 16px;margin-bottom:16px;display:flex;gap:10px;align-items:center'});
      ok.appendChild(el('span', {style:'font-size:18px'}, '✓'));
      ok.appendChild(el('div', {style:'font-weight:500;color:#3D8A32'}, 'Todos los sistemas OK'));
      wrap.appendChild(ok);
    }

    proyectos.forEach(function(p) {
      var card = el('div', {class:'card', style:'padding:16px;margin-bottom:14px'});

      var expanded = false;
      var hdr = el('div', {style:'display:flex;align-items:center;justify-content:space-between;padding:12px 0;cursor:pointer'});
      var hdrLeft = el('div', {style:'display:flex;align-items:center;gap:8px'});
      var arrow = el('span', {style:'font-size:10px;color:#94a3b8'}, '▶');
      hdrLeft.appendChild(arrow);
      hdrLeft.appendChild(el('div', {class:'st'}, p.nombre + ' — DB'));
      hdr.appendChild(hdrLeft);
      var pct = p.pct_uso || 0;
      var gaugeCol = pct > 90 ? '#A32D2D' : pct > 70 ? '#854F0B' : '#5BBD4E';
      var hdrRight = el('div', {style:'display:flex;align-items:center;gap:10px'});
      if (p.error) {
        hdrRight.appendChild(el('span', {style:'font-size:12px;color:#A32D2D;font-weight:600'}, 'sin datos'));
      } else {
        hdrRight.appendChild(el('span', {style:'font-size:12px;color:'+gaugeCol+';font-weight:600'}, pct+'%'));
        hdrRight.appendChild(el('span', {style:'font-size:12px;color:#64748B'}, p.db_size_mb+' MB / '+p.limite_mb+' MB'));
      }
      if (p.tablas_bloat.length > 0) hdrRight.appendChild(chipClass(p.tablas_bloat.length+' bloat', 'ca'));
      hdr.appendChild(hdrRight);
      card.appendChild(hdr);

      var cardBody = el('div', {style:'display:none;border-top:.5px solid #F1F5F9;padding-top:14px'});
      hdr.onclick = function() {
        expanded = !expanded;
        cardBody.style.display = expanded ? '' : 'none';
        arrow.textContent = expanded ? '▼' : '▶';
      };

      var barWrap = el('div', {style:'margin-bottom:14px'});
      var barLbl = el('div', {style:'display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-bottom:5px'});
      barLbl.appendChild(el('span', {}, 'Uso del storage'));
      barLbl.appendChild(el('span', {style:'font-weight:600;color:'+gaugeCol}, pct+'%'));
      barWrap.appendChild(barLbl);
      var barBg = el('div', {style:'background:#E2E8F0;border-radius:10px;height:8px;overflow:hidden'});
      barBg.appendChild(el('div', {style:'background:'+gaugeCol+';height:100%;border-radius:10px;width:'+Math.min(pct,100)+'%'}));
      barWrap.appendChild(barBg);
      cardBody.appendChild(barWrap);

      var stats = el('div', {style:'display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap'});
      [
        ['Tablas', p.tablas.length, '#64748B'],
        ['Con bloat', p.tablas_bloat.length, p.tablas_bloat.length>0?'#854F0B':'#3D8A32'],
        ['Total filas', p.tablas.reduce(function(s,t){ return s+Number(t.n_live_tup||0); },0).toLocaleString('es-AR'), '#0B9EDA']
      ].forEach(function(s) {
        var c = el('div', {style:'background:#F8FAFC;border:.5px solid #E2E8F0;border-radius:8px;padding:10px 14px;text-align:center;flex:1;min-width:80px'});
        c.appendChild(el('div', {style:'font-size:18px;font-weight:700;color:'+s[2]}, String(s[1])));
        c.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:.05em'}, s[0]));
        stats.appendChild(c);
      });
      cardBody.appendChild(stats);

      if (p.tablas.length) {
        cardBody.appendChild(el('div', {style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'}, 'Tablas principales'));
        var tbl = el('table', {class:'tbl', style:'font-size:12px'});
        tbl.appendChild(elH('thead', {}, '<tr><th>Tabla</th><th>Filas vivas</th><th>Filas muertas</th><th>Bloat</th></tr>'));
        var tb = el('tbody', {});
        p.tablas.forEach(function(t) {
          var vivas = Number(t.n_live_tup||0);
          var muertas = Number(t.n_dead_tup||0);
          var bloat = vivas > 0 ? Math.round(muertas/vivas*100) : 0;
          var bCol = bloat > 100 ? '#A32D2D' : bloat > 50 ? '#854F0B' : bloat > 20 ? '#64748B' : '#94a3b8';
          var tr = el('tr', {});
          tr.appendChild(el('td', {style:'font-weight:500'}, t.relname||'-'));
          tr.appendChild(el('td', {}, vivas.toLocaleString('es-AR')));
          tr.appendChild(el('td', {style:'color:'+(muertas>0?'#854F0B':'#94a3b8')}, muertas.toLocaleString('es-AR')));
          tr.appendChild(el('td', {style:'font-weight:500;color:'+bCol}, bloat+'%'));
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        cardBody.appendChild(tbl);
      }
      card.appendChild(cardBody);

      wrap.appendChild(card);
    });

    // Card costos Supabase
    if (costos && !costos.error) {
      var costCard=el('div',{class:'card',style:'padding:14px 16px;margin-bottom:14px'});
      costCard.appendChild(el('div',{class:'st',style:'margin-bottom:12px'},'Costos Supabase'));
      function costRow(label,val,color,strong,indent){
        var row=el('div',{style:'display:flex;justify-content:space-between;align-items:baseline;padding:6px '+(indent?'24px':'0')+' 6px 0;border-bottom:.5px solid #F1F5F9'});
        row.appendChild(el('span',{style:'font-size:'+(strong?'13':'12')+'px;'+(strong?'font-weight:500;':'')+'color:'+(indent?'#94A3B8':strong?'#1a2e4a':'#64748B')},label));
        row.appendChild(el('span',{style:'font-size:'+(strong?'13':'12')+'px;font-weight:'+(strong?'600':'400')+';color:'+(color||'#1a2e4a')},val));
        return row;
      }
      costCard.appendChild(costRow('Pro Plan','$'+costos.plan_pro+'.00',null,true,false));
      costCard.appendChild(costRow('Compute',costos.total_compute_actual>0?'$'+Number(costos.total_compute_actual).toFixed(2):'$0.00','#64748B',false,false));
      if(costos.proyectos) costos.proyectos.forEach(function(p){ if(p.compute==='pausado') return; costCard.appendChild(costRow(p.nombre+' (Micro - '+p.horas+'h)','$'+Number(p.costo_actual).toFixed(2),'#94A3B8',false,true)); });
      costCard.appendChild(costRow('Compute Credits','-$'+costos.credito_compute+'.00','#64748B',false,true));
      costCard.appendChild(el('div',{style:'border-top:1px solid #E2E8F0;margin:8px 0'}));
      costCard.appendChild(costRow('Current Costs','$'+Number(costos.current_cost).toFixed(2),'#1a2e4a',true,false));
      costCard.appendChild(costRow('Projected Costs','$'+Number(costos.projected_cost).toFixed(2),'#0B9EDA',true,false));
      wrap.appendChild(costCard);
    }

    var ts = el('div', {style:'text-align:right;font-size:10px;color:#94a3b8;margin-top:4px'}, 'Analizado: ' + new Date(d.timestamp).toLocaleString('es-AR'));
    wrap.appendChild(ts);

    setApp(wrap);
  }).catch(function(e) {
    loadDiv.textContent = 'Error: ' + e.message;
  });
}


// ── FINANZAS ──────────────────────────────────────────────────
var CAT_ING = {servicio:'Servicio',implementacion:'Implementacion',fee:'Fee mensual',consulta:'Consultoria',otro:'Otro'};
var CAT_GAS = {infraestructura:'Infra',ia:'IA',herramienta:'Herramienta',suscripcion:'Suscripcion',otro:'Otro'};
var CAT_PERS = {vivienda:'Vivienda',alimentacion:'Alimentacion',transporte:'Transporte',salud:'Salud',entretenimiento:'Entretenimiento',suscripcion:'Suscripcion',otro:'Otro'};
var CAT_CUOTA = {credito:'Credito',servicio:'Servicio',alquiler:'Alquiler',seguro:'Seguro',otro:'Otro'};
var FREC_LAB = {mensual:'Mensual',anual:'Anual',unico:'Unico'};
var MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function vFinanzas() {
  loading();

  // Fetches con NOMBRE — agregar uno nuevo es agregar una línea acá, sin correr índices
  var FIN_Q = {
    cobros:             sbFetch('panel_cobros?estado=eq.pagado&select=id,monto,fecha_pago,tipo_cobro,descripcion,asignacion_id&order=fecha_pago.desc').catch(function(){ return []; }),
    cobrosPendientes:   sbFetch('panel_cobros?estado=eq.pendiente&select=monto,fecha_vencimiento,tipo_cobro,descripcion,asignacion_id&order=fecha_vencimiento.asc').catch(function(){ return []; }),
    gastos:             sbFetch('panel_gastos?select=*&order=activo.desc,nombre.asc').catch(function(){ return []; }),
    ingresos:           sbFetch('panel_ingresos?select=*&order=fecha.desc').catch(function(){ return []; }),
    sistemas:           sbFetch('panel_sistemas?select=id,nombre').catch(function(){ return []; }),
    clientes:           sbFetch('panel_clientes?select=id,nombre,es_demo,eliminado').catch(function(){ return []; }),
    pagosCobroPF:       sbFetch('panel_pagos?select=cobro_id,monto,fecha,created_at,cuenta_id').catch(function(){ return []; }),
    cuentasPF:          sbFetch('panel_pf_cuentas?select=*&activa=eq.true&order=orden.asc,created_at.asc').catch(function(){ return []; }),
    movimientosPF:      sbFetch('panel_pf_movimientos?select=*&order=created_at.asc').catch(function(){ return []; }),
    asignacionesFin:    sbFetch('panel_asignaciones?select=id,cliente_id').catch(function(){ return []; }),
    dolarData:          fetch('https://dolarapi.com/v1/dolares/oficial').then(function(r){ return r.json(); }).catch(function(){ return null; }),
    pagoGastos:         sbFetch('panel_gastos_pagos?select=*&order=fecha.desc').catch(function(){ return []; }),
    config:             sbFetch('panel_config?select=clave,valor').catch(function(){ return []; }),
    gastosPers:         sbFetch('panel_gastos_personales?select=*&order=activo.desc,nombre.asc').catch(function(){ return []; }),
    pagoGastosPers:     sbFetch('panel_gastos_personales_pagos?select=*&order=fecha.desc').catch(function(){ return []; }),
    cuotasPF:           sbFetch('panel_pf_cuotas?select=*&order=activa.desc,inicio_year.asc,inicio_month.asc').catch(function(){ return []; }),
    mesesPF:            sbFetch('panel_pf_meses?select=*&order=year.asc,month.asc').catch(function(){ return []; }),
    gastosPF:           sbFetch('panel_pf_gastos?select=*&order=fecha.asc').catch(function(){ return []; }),
    entregasPF:         sbFetch('panel_pf_entregas?select=*&order=fecha.asc').catch(function(){ return []; }),
    ingresosPF:         sbFetch('panel_pf_ingresos?select=*&order=fecha.asc').catch(function(){ return []; }),
    juanPF:             sbFetch('panel_pf_liquidacion_juan?select=*').catch(function(){ return []; }),
    daianaPF:           sbFetch('panel_pf_daiana?select=*').catch(function(){ return []; }),
    deudasPF:           sbFetch('panel_pf_deudas?select=*&order=fecha.desc').catch(function(){ return []; }),
    presupuestoPF:      sbFetch('panel_pf_presupuesto?select=*').catch(function(){ return []; }),
    prestamosPF:        sbFetch('panel_pf_prestamos?select=*&order=activo.desc,fecha.desc').catch(function(){ return []; }),
    prestamosPagosPF:   sbFetch('panel_pf_prestamos_pagos?select=*&order=fecha.asc').catch(function(){ return []; }),
    autoPF:             sbFetch('panel_pf_auto_registros?select=*&order=kms.desc.nullslast,fecha.desc.nullslast').catch(function(){ return []; }),
    deudasMovsPF:       sbFetch('panel_pf_deudas_movimientos?select=*&order=fecha.asc').catch(function(){ return []; }),
    musicaPF:           sbFetch('panel_pf_musica?select=*&order=fecha.asc').catch(function(){ return []; }),
    juntadaParticipantes: sbFetch('panel_juntada_participantes?select=*&order=created_at.asc').catch(function(){ return []; }),
    juntadaPagos:       sbFetch('panel_juntada_pagos?select=*&order=fecha.asc').catch(function(){ return []; }),
    juntadaGastos:      sbFetch('panel_juntada_gastos?select=*&order=fecha.asc').catch(function(){ return []; })
  };
  var FIN_KEYS = Object.keys(FIN_Q);
  Promise.all(FIN_KEYS.map(function(k){ return FIN_Q[k]; })).then(function(rArr) {
    var R = {}; FIN_KEYS.forEach(function(k, i){ R[k] = rArr[i]; });
    var cobros=R.cobros, cobrosPendientes=R.cobrosPendientes, gastos=R.gastos, ingresos=R.ingresos, sistemas=R.sistemas, clientes=R.clientes;
    // Los cobros de clientes demo o eliminados no son plata real: se excluyen de lo pendiente y de la caja
    (function(){
      var malos = {}; (R.clientes||[]).forEach(function(c){ if (c.es_demo || c.eliminado) malos[c.id] = true; });
      var asigMala = {}; (R.asignacionesFin||[]).forEach(function(a){ if (malos[a.cliente_id]) asigMala[a.id] = true; });
      cobrosPendientes = (cobrosPendientes||[]).filter(function(c){ return !asigMala[c.asignacion_id]; });
      cobros = (cobros||[]).filter(function(c){ return !asigMala[c.asignacion_id]; });
    })();
    var dolarData=R.dolarData, pagoGastos=R.pagoGastos, config=R.config||[];
    var gastosPers=R.gastosPers||[], pagoGastosPers=R.pagoGastosPers||[];
    var cuotasPF=R.cuotasPF||[];
    var mesesPF=R.mesesPF||[], gastosPF=R.gastosPF||[], ingresosPF=R.ingresosPF||[], juanPF=R.juanPF||[], daianaPF=R.daianaPF||[], deudasPF=R.deudasPF||[], presupuestoPF=R.presupuestoPF||[];
    var entregasPF=R.entregasPF||[];
    gastosPF.forEach(function(g){ g._entregas = entregasPF.filter(function(e){ return e.gasto_id===g.id; }); });
    // Entregas parciales sobre un gasto PF (en ARS, contra la billetera personal del gasto)
    // Las entregas sin moneda (historicas) son ARS; las de dolares llevan moneda:'USD'
    function entregadoPF(g) { return (g._entregas||[]).filter(function(e){ return (e.moneda||'ARS')!=='USD'; }).reduce(function(s,e){ return s+Number(e.monto||0); }, 0); }
    function saldoPF(g) { return Math.max(0, Number(g.monto||0) - entregadoPF(g)); }
    // Dolares de la tarjeta: lo personal + lo del negocio (es lo que cobra el resumen en USD)
    function usdTotalPF(g) { return Number(g.monto_usd||0) + Number(g.monto_usd_negocio||0); }
    function entregadoUSDPF(g) { return (g._entregas||[]).filter(function(e){ return e.moneda==='USD'; }).reduce(function(s,e){ return s+Number(e.monto||0); }, 0); }
    function saldoUSDPF(g) { return Math.max(0, usdTotalPF(g) - entregadoUSDPF(g)); }
    var prestamosPF=R.prestamosPF||[];
    var prestamosPagosPF=R.prestamosPagosPF||[], autoPF=R.autoPF||[];
    var deudasMovsPF=R.deudasMovsPF||[];
    var musicaPF=R.musicaPF||[];
    var juntadaParticipantes=R.juntadaParticipantes||[], juntadaPagos=R.juntadaPagos||[], juntadaGastos=R.juntadaGastos||[];
    var mesActualPF = (mesesPF.find(function(m){ return m.status==='open'; }) || mesesPF[mesesPF.length-1] || {}).id || null;

    pagoGastosPers = pagoGastosPers.map(function(p) {
      var g = gastosPers.find(function(x){ return x.id === p.gasto_id; });
      return Object.assign({}, p, { _gasto: g || null });
    });

    pagoGastos = pagoGastos.map(function(p) {
      var g = gastos.find(function(x){ return x.id === p.gasto_id; });
      return Object.assign({}, p, { _gasto: g || null });
    });

    var configMap = {};
    config.forEach(function(c){ configMap[c.clave] = c.valor; });
    var empresaInicio = configMap.empresa_inicio ? new Date(configMap.empresa_inicio) : new Date('2026-05-01');

    var tcUSD = dolarData && dolarData.venta ? Number(dolarData.venta) : 1200;
    // Cotización por mes: si el mes está cerrado usa su TC congelado, si no el del día
    function tcDeMes(mesObj) { return (mesObj && mesObj.tc_usd) ? Number(mesObj.tc_usd) : tcUSD; }
    // Agrupa una lista de gastos PF por GASTO_GRUPOS_PF (cada gasto cae en el primer grupo que matchea)
    function agruparGastosPF(lista) {
      var restantes = lista.slice();
      return GASTO_GRUPOS_PF.map(function(grupo) {
        var items = restantes.filter(grupo.match);
        restantes = restantes.filter(function(g){ return !grupo.match(g); });
        return { nombre: grupo.nombre, grupo: grupo, items: items,
                 tot: items.reduce(function(s,g){ return s+Number(g.monto||0); }, 0),
                 totUSD: items.reduce(function(s,g){ return s+Number(g.monto_usd||0); }, 0) };
      });
    }
    var tcFecha = dolarData && dolarData.fechaActualizacion || null;
    var tcActual = tcUSD;

    var mesesVer = [];
    var cur = new Date(empresaInicio.getFullYear(), empresaInicio.getMonth(), 1);
    var hoy = new Date();
    var limit = new Date(hoy.getFullYear(), hoy.getMonth()+1, 1);
    while (cur < limit && mesesVer.length < 12) {
      mesesVer.push({mes:cur.getMonth()+1, anio:cur.getFullYear()});
      cur.setMonth(cur.getMonth()+1);
    }

    function toARS(monto, moneda, tc) {
      return moneda==='ARS' ? Number(monto) : Number(monto)*(Number(tc)||tcActual);
    }

    function ingresosDelMes(mes, anio) {
      var str = anio+'-'+String(mes).padStart(2,'0');
      var deCobros = cobros.filter(function(c){ return c.fecha_pago&&c.fecha_pago.startsWith(str); }).reduce(function(s,c){ return s+Number(c.monto); },0);
      var deIng = ingresos.filter(function(i){ return i.fecha&&i.fecha.startsWith(str); }).reduce(function(s,i){ return s+toARS(i.monto,i.moneda,i.tipo_cambio||tcActual); },0);
      return deCobros+deIng;
    }

    function gastosDelMes_historico(mes, anio) {
      var str = anio+'-'+String(mes).padStart(2,'0');
      return pagoGastos.filter(function(p){ return p.fecha&&p.fecha.startsWith(str); })
        .reduce(function(s,p){ return s+Number(p.monto_ars||Number(p.monto)*Number(p.tipo_cambio||1)); },0);
    }

    function gastosEstimado() {
      var tot=0;
      gastos.filter(function(g){ return g.activo; }).forEach(function(g) {
        var m=Number(g.monto); if(g.frecuencia==='anual') m=m/12;
        tot += g.moneda==='USD' ? m*tcActual : m;
      });
      return tot;
    }

    function gastosParaMes(mes, anio) {
      var hist = gastosDelMes_historico(mes, anio);
      if (hist>0) return hist;
      var hM=hoy.getMonth()+1, hA=hoy.getFullYear();
      if (mes===hM && anio===hA) return gastosEstimado();
      return 0;
    }

    function gastosPersDelMes_historico(mes, anio) {
      var str = anio+'-'+String(mes).padStart(2,'0');
      return pagoGastosPers.filter(function(p){ return p.fecha&&p.fecha.startsWith(str); })
        .reduce(function(s,p){ return s+Number(p.monto_ars||Number(p.monto)*Number(p.tipo_cambio||1)); },0);
    }

    function gastosPersEstimado() {
      var tot=0;
      gastosPers.filter(function(g){ return g.activo; }).forEach(function(g) {
        var m=Number(g.monto); if(g.frecuencia==='anual') m=m/12;
        tot += g.moneda==='USD' ? m*tcActual : m;
      });
      return tot;
    }

    function gastosPersParaMes(mes, anio) {
      var hist = gastosPersDelMes_historico(mes, anio);
      if (hist>0) return hist;
      var hM=hoy.getMonth()+1, hA=hoy.getFullYear();
      if (mes===hM && anio===hA) return gastosPersEstimado();
      return 0;
    }

    function getMesesPeriodo(periodo) {
      var hM=hoy.getMonth()+1, hA=hoy.getFullYear();
      if (periodo==='mes') return [{mes:hM, anio:hA}];
      if (periodo==='trimestre') {
        var out=[];
        for (var i=2;i>=0;i--) { var d=new Date(hA,hM-1-i,1); out.push({mes:d.getMonth()+1,anio:d.getFullYear()}); }
        return out;
      }
      var out2=[];
      for (var m=1;m<=hM;m++) out2.push({mes:m,anio:hA});
      return out2;
    }

    var ingTotal = cobros.reduce(function(s,c){ return s+Number(c.monto); },0)
                 + ingresos.reduce(function(s,i){ return s+toARS(i.monto,i.moneda,i.tipo_cambio||tcActual); },0);

    var periodo = _finUIState.periodo || 'mes';
    var modoFin = _finUIState.modoFin || 'negocio';
    var tabActual = _finUIState.tabActual || 'resumen';
    var mesSeleccionadoPF = _finUIState.mesSeleccionadoPF || mesActualPF;

    var wrap = el('div', {});

    var modoWrap = el('div', {style:'display:flex;gap:4px;margin-bottom:14px;background:#F1F5F9;padding:3px;border-radius:9px;width:fit-content'});
    var negocioControlsWrap = el('div', {});

    var tcBox = el('div', {style:'background:#E6F6FD;border:.5px solid #85B7EB;border-radius:8px;padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap'});
    var tcLeft = el('div', {style:'display:flex;align-items:center;gap:8px'});
    tcLeft.appendChild(el('span', {style:'font-size:11px;font-weight:500;color:#0C6FA3;text-transform:uppercase;letter-spacing:.06em'}, 'Dolar oficial BNA'));
    tcLeft.appendChild(el('span', {style:'font-size:16px;font-weight:700;color:#0B9EDA'}, '$'+tcUSD.toLocaleString('es-AR')));
    if (tcFecha) tcLeft.appendChild(el('span', {style:'font-size:10px;color:#94a3b8'}, tcFecha.slice(0,10)));
    tcBox.appendChild(tcLeft);
    var tcRight = el('div', {style:'display:flex;align-items:center;gap:6px'});
    tcRight.appendChild(el('span', {style:'font-size:11px;color:#64748B'}, 'Override:'));
    var tcInput = el('input', {type:'number', style:'width:80px;padding:4px 8px;border:.5px solid #CBD5E1;border-radius:6px;font-size:13px', placeholder:tcUSD});
    tcInput.oninput = function() { var v=Number(this.value); tcActual=v>0?v:tcUSD; renderAll(); };
    tcRight.appendChild(tcInput);
    tcBox.appendChild(tcRight);
    negocioControlsWrap.appendChild(tcBox);

    var periodoWrap = el('div', {style:'display:flex;gap:4px;margin-bottom:12px;background:#F1F5F9;padding:3px;border-radius:9px;width:fit-content'});
    ['mes','trimestre','anio'].forEach(function(p) {
      var btn = el('button', {class:'tab'+(p==='mes'?' on':'')}, p==='mes'?'Este mes':p==='trimestre'?'Trimestre':'Este año');
      btn.onclick = function() {
        periodo = p;
        _finUIState.periodo = p;
        periodoWrap.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        renderAll();
      };
      periodoWrap.appendChild(btn);
    });
    negocioControlsWrap.appendChild(periodoWrap);

    [['negocio','🏢 Negocio'],['personal','👤 Personal']].forEach(function(md, idx) {
      var btn = el('button', {class:'tab'+(idx===0?' on':'')}, md[1]);
      btn.onclick = function() {
        modoFin = md[0];
        _finUIState.modoFin = modoFin;
        if (typeof qBtn !== 'undefined') qBtn.style.display = modoFin==='personal' ? '' : 'none';
        modoWrap.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        negocioControlsWrap.style.display = modoFin==='negocio' ? '' : 'none';
        tabActual = modoFin==='negocio' ? 'resumen' : 'resumen-pf';
        _finUIState.tabActual = tabActual;
        renderTabs();
        renderAll();
      };
      modoWrap.appendChild(btn);
    });
    var qBtn = el('button',{class:'btn btnp',style:'margin-bottom:14px;display:'+(modoFin==='personal'?'':'none')},'⚡ Gasto rápido');
    qBtn.onclick = function(){ mGastoRapidoPF(); };
    var filaModo = el('div',{style:'display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap'});
    filaModo.appendChild(modoWrap); filaModo.appendChild(qBtn);
    wrap.appendChild(filaModo);
    wrap.appendChild(negocioControlsWrap);

    var tabsEl = el('div', {class:'tabs', style:'margin-bottom:20px;flex-wrap:wrap'});
    wrap.appendChild(tabsEl);

    function tabsForModo() {
      return modoFin === 'negocio'
        ? [['resumen','Resumen'],['ingresos','Ingresos'],['gastos','Gastos']]
        : [['resumen-pf','Resumen'],['ingresos-pf','Ingresos'],['gastos-pf','Gastos'],['cuotas','Cuotas'],['prestamos-pf','Prestamos'],['cuentas-pf','💳 Cuentas'],['auto-pf','Auto'],['deudas-pf','Deudas'],['pedrito-pf','👶 Pedrito'],['juntada-pf','🎲 Juntada']];
    }
    function renderTabs() {
      tabsEl.innerHTML = '';
      tabsForModo().forEach(function(t) {
        var btn = el('button', {class:'tab'+(t[0]===tabActual?' on':'')}, t[1]);
        btn.onclick = function() {
          tabActual = t[0];
          _finUIState.tabActual = tabActual;
          tabsEl.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('on'); });
          btn.classList.add('on');
          renderAll();
        };
        tabsEl.appendChild(btn);
      });
    }
    renderTabs();

    var content = el('div', {});
    wrap.appendChild(content);

    function renderAll() {
      content.innerHTML = '';
      if (modoFin === 'negocio') {
        var mesesP = getMesesPeriodo(periodo);
        var ingP = mesesP.reduce(function(s,m){ return s+ingresosDelMes(m.mes,m.anio); },0);
        var gasP = mesesP.reduce(function(s,m){ return s+gastosParaMes(m.mes,m.anio); },0);
        var balP = ingP - gasP;
        if (tabActual === 'resumen') renderResumen(mesesP, ingP, gasP, balP);
        else if (tabActual === 'ingresos') renderIngresos(mesesP);
        else renderGastos(mesesP, gasP);
      } else {
        if (tabActual === 'resumen-pf') renderResumenPF();
        else if (tabActual === 'ingresos-pf') renderIngresosPF();
        else if (tabActual === 'gastos-pf') renderGastosPF();
        else if (tabActual === 'cuotas') renderCuotasPF();
        else if (tabActual === 'pedrito-pf') renderPedritoPF();
        else if (tabActual === 'juntada-pf') renderJuntada();
        else if (tabActual === 'prestamos-pf') renderPrestamosPF();
        else if (tabActual === 'cuentas-pf') renderCuentasPF();
        else if (tabActual === 'auto-pf') renderAutoPF();
        else if (tabActual === 'asesor-pf') { tabActual = 'resumen-pf'; _finUIState.tabActual = tabActual; renderTabs(); renderResumenPF(); }
        else renderDeudasPF();
      }
      if (typeof actualizarEstadoChatPF === 'function') actualizarEstadoChatPF();
    }

    function renderResumen(mesesP, ingP, gasP, balP) {
      var hM=hoy.getMonth()+1, hA=hoy.getFullYear();
      var labelP = periodo==='mes' ? MESES_CORTOS[hM-1]+' '+hA
        : periodo==='trimestre' ? 'Q'+Math.ceil(hM/3)+' '+hA
        : 'Año '+hA;

      var aCobrarTotal = cobrosPendientes.reduce(function(s,c){ return s+Number(c.monto); },0);
      var mets = el('div', {class:'mets'});
      [
        {label:'Cobrado — '+labelP, val:fmt(ingP), color:'#5BBD4E', sub:'cobros + extras'},
        {label:'A cobrar', val:fmt(aCobrarTotal), color:'#EF9F27', sub:cobrosPendientes.length+' pendiente'+(cobrosPendientes.length!==1?'s':'')},
        {label:'Gastos — '+labelP, val:fmt(gasP), color:'#EF4444', sub:'servicios del periodo'},
        {label:'Balance', val:fmt(balP), color:balP>=0?'#0B9EDA':'#A32D2D', sub:balP>=0?'superavit':'deficit'},
        {label:'Total historico', val:fmt(ingTotal), color:'#7F77DD', sub:'todos los tiempos'}
      ].forEach(function(m) {
        var c=el('div',{class:'met'});
        c.appendChild(el('div',{class:'mst',style:'background:'+m.color}));
        c.appendChild(el('div',{class:'mlb'},m.label));
        c.appendChild(el('div',{class:'mv',style:'font-size:18px;color:'+m.color},m.val));
        if(m.sub) c.appendChild(el('div',{class:'ms'},m.sub));
        mets.appendChild(c);
      });
      content.appendChild(mets);

      var mesesGraf = periodo==='mes' ? mesesVer : mesesP;
      var datos = mesesGraf.map(function(m) {
        return {label:MESES_CORTOS[m.mes-1], ing:ingresosDelMes(m.mes,m.anio), gas:gastosParaMes(m.mes,m.anio)};
      });
      var maxVal = Math.max.apply(null, datos.map(function(d){ return Math.max(d.ing,d.gas); }))||1;
      var labelR = mesesGraf.length===1 ? MESES_CORTOS[mesesGraf[0].mes-1]+' '+mesesGraf[0].anio
        : MESES_CORTOS[mesesGraf[0].mes-1]+' — '+MESES_CORTOS[mesesGraf[mesesGraf.length-1].mes-1]+' '+mesesGraf[mesesGraf.length-1].anio;

      var chartCard = el('div',{class:'card',style:'padding:16px;margin-bottom:16px'});
      chartCard.appendChild(el('div',{class:'st',style:'margin-bottom:14px'},'Evolucion mensual ('+labelR+')'));
      var cw = el('div',{style:'display:flex;flex-direction:column;gap:8px'});
      datos.forEach(function(d) {
        var row=el('div',{style:'display:flex;align-items:center;gap:10px'});
        row.appendChild(el('div',{style:'width:28px;font-size:11px;color:#94a3b8;text-align:right;flex-shrink:0'},d.label));
        var bars=el('div',{style:'flex:1;display:flex;flex-direction:column;gap:3px'});
        var ingPct=d.ing>0?Math.max(3,Math.round(d.ing/maxVal*100)):0;
        var gasPct=d.gas>0?Math.max(3,Math.round(d.gas/maxVal*100)):0;
        var ir=el('div',{style:'display:flex;align-items:center;gap:6px'});
        ir.appendChild(el('div',{style:'height:8px;border-radius:4px;background:#5BBD4E;width:'+ingPct+'%;min-width:'+(d.ing>0?'4px':'0')}));
        ir.appendChild(el('span',{style:'font-size:10px;color:'+(d.ing>0?'#5BBD4E':'#E2E8F0')},d.ing>0?fmt(d.ing):'—'));
        var gr=el('div',{style:'display:flex;align-items:center;gap:6px'});
        gr.appendChild(el('div',{style:'height:8px;border-radius:4px;background:#FCA5A5;width:'+gasPct+'%;min-width:'+(d.gas>0?'4px':'0')}));
        if(d.gas>0) gr.appendChild(el('span',{style:'font-size:10px;color:#EF4444'},fmt(d.gas)));
        bars.appendChild(ir); bars.appendChild(gr);
        row.appendChild(bars);
        cw.appendChild(row);
      });
      chartCard.appendChild(cw);
      var leg=el('div',{style:'display:flex;gap:16px;margin-top:12px;padding-top:10px;border-top:.5px solid #F1F5F9'});
      [['#5BBD4E','Ingresos'],['#FCA5A5','Gastos']].forEach(function(l){
        var li=el('span',{style:'font-size:11px;color:#64748B;display:flex;align-items:center;gap:5px'});
        li.appendChild(el('span',{style:'width:10px;height:6px;border-radius:3px;background:'+l[0]+';display:inline-block'}));
        li.appendChild(document.createTextNode(l[1]));
        leg.appendChild(li);
      });
      chartCard.appendChild(leg);
      content.appendChild(chartCard);

      var gasCard=el('div',{class:'card',style:'padding:16px'});
      if (mesesP.length === 1) {
        gasCard.appendChild(el('div',{class:'st',style:'margin-bottom:12px'},'Gastos fijos mensuales'));
        var totUSD=0, totARS=0;
        gastos.filter(function(g){return g.activo;}).forEach(function(g){
          var m=Number(g.monto); if(g.frecuencia==='anual') m=m/12;
          var row=el('div',{style:'display:flex;justify-content:space-between;padding:7px 0;border-bottom:.5px solid #F1F5F9;font-size:13px'});
          row.appendChild(el('span',{},g.nombre));
          var arsStr=g.moneda==='USD'?' = $'+Math.round(m*tcActual).toLocaleString('es-AR'):'';
          row.appendChild(el('span',{style:'font-weight:500;color:#1a2e4a'},'$'+m.toFixed(g.moneda==='USD'?2:0)+' '+g.moneda+arsStr));
          gasCard.appendChild(row);
          if(g.moneda==='USD') totUSD+=m; else totARS+=m;
        });
        var totRow=el('div',{style:'display:flex;justify-content:space-between;padding:10px 0;font-weight:600;font-size:13px;color:#EF4444'});
        totRow.appendChild(el('span',{},'Total mensual'));
        var totDet=el('div',{style:'text-align:right'});
        if(totUSD>0) totDet.appendChild(el('div',{style:'font-size:11px;font-weight:400;color:#94a3b8'},'$'+totUSD.toFixed(2)+' USD x $'+tcActual.toLocaleString('es-AR')));
        totDet.appendChild(el('div',{style:'color:#EF4444;font-weight:700'},'$'+Math.round(totUSD*tcActual+totARS).toLocaleString('es-AR')+' ARS'));
        totRow.appendChild(totDet);
        gasCard.appendChild(totRow);
      } else {
        var periodoLabel = mesesP.length<=3 ? 'Gastos reales del trimestre' : 'Gastos reales del año';
        gasCard.appendChild(el('div',{class:'st',style:'margin-bottom:12px'},periodoLabel));
        var pagosPer2 = pagoGastos.filter(function(p){
          return mesesP.some(function(m){
            var s=m.anio+'-'+String(m.mes).padStart(2,'0');
            return p.fecha&&p.fecha.startsWith(s);
          });
        });
        if (!pagosPer2.length) {
          gasCard.appendChild(el('div',{style:'font-size:13px;color:#94a3b8;padding:10px 0'},'Sin pagos registrados en este periodo'));
        } else {
          var grupos = {};
          pagosPer2.forEach(function(p){
            var nom = p._gasto ? p._gasto.nombre : 'Desconocido';
            var mon = p._gasto ? p._gasto.moneda : p.moneda;
            if (!grupos[nom]) grupos[nom] = {nombre:nom, moneda:mon, totalUSD:0, totalARS:0, count:0};
            grupos[nom].totalARS += Number(p.monto_ars||Number(p.monto)*Number(p.tipo_cambio||1));
            if (mon==='USD') grupos[nom].totalUSD += Number(p.monto);
            grupos[nom].count++;
          });
          var totalAcum = 0;
          Object.keys(grupos).forEach(function(k){
            var g = grupos[k];
            var row=el('div',{style:'display:flex;justify-content:space-between;padding:7px 0;border-bottom:.5px solid #F1F5F9;font-size:13px'});
            var left=el('div',{});
            left.appendChild(el('div',{},g.nombre));
            left.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},g.count+' pago'+(g.count!==1?'s':'')));
            row.appendChild(left);
            var right=el('div',{style:'text-align:right'});
            if(g.totalUSD>0) right.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},'$'+g.totalUSD.toFixed(2)+' USD'));
            right.appendChild(el('div',{style:'font-weight:500;color:#EF4444'},'$'+Math.round(g.totalARS).toLocaleString('es-AR')+' ARS'));
            row.appendChild(right);
            gasCard.appendChild(row);
            totalAcum += g.totalARS;
          });
          var totRow2=el('div',{style:'display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:13px;color:#EF4444;border-top:.5px solid #E2E8F0'});
          totRow2.appendChild(el('span',{},'Total real del periodo'));
          totRow2.appendChild(el('span',{},'$'+Math.round(totalAcum).toLocaleString('es-AR')+' ARS'));
          gasCard.appendChild(totRow2);
        }
      }
      content.appendChild(gasCard);
    }

    function renderIngresos(mesesP) {
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Ingresos manuales'));
      var btnN=el('button',{class:'btn btnp'},'+ Nuevo ingreso');
      btnN.onclick=function(){ mNuevoIngreso(sistemas,clientes,function(){ vFinanzas(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      var allIng=[];
      cobros.slice(0,30).forEach(function(c){ allIng.push({tipo:'cobro',desc:c.descripcion||'Fee',monto:Number(c.monto),fecha:c.fecha_pago,moneda:'ARS'}); });
      ingresos.forEach(function(i){ allIng.push({tipo:'manual',desc:i.descripcion,monto:Number(i.monto),fecha:i.fecha,moneda:i.moneda,id:i.id}); });
      allIng.sort(function(a,b){ return a.fecha<b.fecha?1:-1; });

      if(!allIng.length){ content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin ingresos registrados')])); return; }
      var card=el('div',{class:'card',style:'overflow-x:auto'});
      var tbl=el('table',{class:'tbl'});
      tbl.appendChild(elH('thead',{},'<tr><th>Descripcion</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th></th></tr>'));
      var tb=el('tbody',{});
      allIng.forEach(function(i){
        var tr=el('tr',{});
        tr.appendChild(el('td',{style:'font-weight:500'},i.desc||'-'));
        tr.appendChild(el('td',{},[chipClass(i.tipo==='cobro'?'Cobro':'Manual',i.tipo==='cobro'?'cg':'cb')]));
        tr.appendChild(el('td',{style:'font-weight:500;color:#3D8A32'},'$'+Number(i.monto).toLocaleString('es-AR')+' '+i.moneda));
        tr.appendChild(el('td',{},fdate(i.fecha)));
        var tdA=el('td',{});
        if(i.tipo==='manual'){
          var btnX=el('button',{class:'btn btnsm',style:'background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
          (function(iid){ btnX.onclick=function(){
            if(!confirm('Eliminar este ingreso?')) return;
            sbFetch('panel_ingresos?id=eq.'+iid,{method:'DELETE',prefer:'return=minimal'}).then(function(){ vFinanzas(); });
          }; })(i.id);
          tdA.appendChild(btnX);
        }
        tr.appendChild(tdA);
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl);
      content.appendChild(card);
    }

    function renderGastos(mesesP, gasP) {
      var hM=hoy.getMonth()+1, hA=hoy.getFullYear();
      var labelP = periodo==='mes'?'Gastos — '+MESES_CORTOS[hM-1]+' '+hA
        :periodo==='trimestre'?'Gastos — Trimestre Q'+Math.ceil(hM/3)+' '+hA
        :'Gastos — Año '+hA;
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},labelP));
      var btnN=el('button',{class:'btn btnp'},'+ Nuevo gasto');
      btnN.onclick=function(){ mNuevoGasto(function(){ vFinanzas(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      if (periodo !== 'mes') {
        var pagosPer = pagoGastos.filter(function(p){
          return mesesP.some(function(m){
            var s=m.anio+'-'+String(m.mes).padStart(2,'0');
            return p.fecha&&p.fecha.startsWith(s);
          });
        });
        if (pagosPer.length > 0) {
          var totPer = pagosPer.reduce(function(s,p){ return s+Number(p.monto_ars||Number(p.monto)*Number(p.tipo_cambio||1)); },0);
          var resCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
          resCard.appendChild(el('div',{class:'st',style:'margin-bottom:10px'},'Total del periodo'));
          var rr=el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px 0'});
          rr.appendChild(el('div',{style:'font-size:13px;color:#64748B'},pagosPer.length+' pago'+(pagosPer.length!==1?'s':'')+' registrado'+(pagosPer.length!==1?'s':'')));
          rr.appendChild(el('div',{style:'font-size:20px;font-weight:700;color:#EF4444'},'$'+Math.round(totPer).toLocaleString('es-AR')+' ARS'));
          resCard.appendChild(rr);
          content.appendChild(resCard);
        }
      }

      if (!gastos.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin gastos')])); return; }
      var card=el('div',{class:'card',style:'overflow-x:auto'});
      var tbl=el('table',{class:'tbl'});
      tbl.appendChild(elH('thead',{},'<tr><th>Servicio</th><th>Categoria</th><th>Monto</th><th>TC</th><th>Proximo pago</th><th>Estado</th><th></th></tr>'));
      var tb=el('tbody',{});
      gastos.forEach(function(g){
        var vence=g.fecha_proximo_pago?new Date(g.fecha_proximo_pago):null;
        var dias=vence?Math.ceil((vence-new Date())/86400000):null;
        var tr=el('tr',{style:g.activo?'':'opacity:.5'});
        var tdN=el('td',{});
        tdN.appendChild(el('div',{style:'font-weight:500'},g.nombre));
        if(g.notas) tdN.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},g.notas));
        tr.appendChild(tdN);
        tr.appendChild(el('td',{},[chipClass(CAT_GAS[g.categoria]||g.categoria,'cgr')]));
        tr.appendChild(el('td',{style:'font-weight:500'},'$'+Number(g.monto).toLocaleString('es-AR')+' '+g.moneda+(g.frecuencia==='anual'?' /año':'')));
        var tdTC=el('td',{style:'font-size:12px;color:#64748B'});
        tdTC.textContent=g.moneda==='USD'?'$'+tcActual.toLocaleString('es-AR'):'-';
        tr.appendChild(tdTC);
        var tdV=el('td',{});
        if(vence&&dias!==null){
          var vc=dias<=3?'#A32D2D':dias<=7?'#854F0B':'#64748B';
          tdV.appendChild(el('div',{},fdate(g.fecha_proximo_pago)));
          tdV.appendChild(el('div',{style:'font-size:11px;color:'+vc+';font-weight:500'},dias<0?'Vencido':dias===0?'Hoy':'En '+dias+'d'));
        } else { tdV.textContent='-'; }
        tr.appendChild(tdV);
        var tog=el('label',{class:'tog'});
        var inp=el('input',{type:'checkbox'}); if(g.activo) inp.checked=true;
        (function(gid){ inp.onchange=function(){ dbUpd('panel_gastos',gid,{activo:this.checked}).then(function(){ vFinanzas(); }); }; })(g.id);
        tog.appendChild(inp); tog.appendChild(el('span',{class:'sl'}));
        tr.appendChild(el('td',{},[tog]));
        var btnE=el('button',{class:'btn btnsm'},'Editar');
        (function(gg){ btnE.onclick=function(){ mEditarGasto(gg,function(){ vFinanzas(); }); }; })(g);
        var btnP=el('button',{class:'btn btnsm btns',style:'margin-left:4px'},'Pagado');
        (function(gg){ btnP.onclick=function(){ registrarPagoGasto(gg,function(){ vFinanzas(); }); }; })(g);
        tr.appendChild(el('td',{style:'white-space:nowrap'},[btnE,btnP]));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl);
      content.appendChild(card);

      var pagosVer = periodo==='mes' ? pagoGastos
        : pagoGastos.filter(function(p){
            return mesesP.some(function(m){
              var s=m.anio+'-'+String(m.mes).padStart(2,'0');
              return p.fecha&&p.fecha.startsWith(s);
            });
          });
      if (pagosVer.length) {
        var hCard=el('div',{class:'card',style:'padding:16px;margin-top:14px'});
        hCard.appendChild(el('div',{class:'st',style:'margin-bottom:12px'},'Historial de pagos'));
        var hTbl=el('table',{class:'tbl',style:'font-size:12px'});
        hTbl.appendChild(elH('thead',{},'<tr><th>Servicio</th><th>Fecha</th><th>USD</th><th>TC</th><th>ARS</th></tr>'));
        var hTb=el('tbody',{});
        pagosVer.forEach(function(p){
          var tr=el('tr',{});
          tr.appendChild(el('td',{style:'font-weight:500'},p._gasto?p._gasto.nombre:'-'));
          tr.appendChild(el('td',{},fdate(p.fecha)));
          tr.appendChild(el('td',{style:'color:#64748B'},'$'+Number(p.monto).toFixed(2)+' '+p.moneda));
          tr.appendChild(el('td',{style:'color:#94a3b8'},'$'+Number(p.tipo_cambio).toLocaleString('es-AR')));
          tr.appendChild(el('td',{style:'font-weight:500;color:#3D8A32'},'$'+Number(p.monto_ars||Number(p.monto)*Number(p.tipo_cambio)).toLocaleString('es-AR')));
          hTb.appendChild(tr);
        });
        hTbl.appendChild(hTb); hCard.appendChild(hTbl);
        content.appendChild(hCard);
      }
    }

    function renderPersonal(mesesP) {
      var hM=hoy.getMonth()+1, hA=hoy.getFullYear();
      var labelP = periodo==='mes'?'Personal — '+MESES_CORTOS[hM-1]+' '+hA
        :periodo==='trimestre'?'Personal — Trimestre Q'+Math.ceil(hM/3)+' '+hA
        :'Personal — Año '+hA;
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},labelP));
      var btnN=el('button',{class:'btn btnp'},'+ Nuevo gasto personal');
      btnN.onclick=function(){ mNuevoGastoPersonal(function(){ vFinanzas(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      var infoBox = el('div', {style:'background:#F5F3FF;border:.5px solid #C4B5FD;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#6D28D9'});
      infoBox.textContent = 'Gastos personales — no afectan el balance del negocio en Resumen.';
      content.appendChild(infoBox);

      var gasPersP = mesesP.reduce(function(s,m){ return s+gastosPersParaMes(m.mes,m.anio); },0);

      if (periodo !== 'mes') {
        var pagosPerP = pagoGastosPers.filter(function(p){
          return mesesP.some(function(m){
            var s=m.anio+'-'+String(m.mes).padStart(2,'0');
            return p.fecha&&p.fecha.startsWith(s);
          });
        });
        if (pagosPerP.length > 0) {
          var totPerP = pagosPerP.reduce(function(s,p){ return s+Number(p.monto_ars||Number(p.monto)*Number(p.tipo_cambio||1)); },0);
          var resCardP=el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
          resCardP.appendChild(el('div',{class:'st',style:'margin-bottom:10px'},'Total del periodo'));
          var rrP=el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px 0'});
          rrP.appendChild(el('div',{style:'font-size:13px;color:#64748B'},pagosPerP.length+' pago'+(pagosPerP.length!==1?'s':'')+' registrado'+(pagosPerP.length!==1?'s':'')));
          rrP.appendChild(el('div',{style:'font-size:20px;font-weight:700;color:#6D28D9'},'$'+Math.round(totPerP).toLocaleString('es-AR')+' ARS'));
          resCardP.appendChild(rrP);
          content.appendChild(resCardP);
        }
      } else {
        var mCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
        var mr=el('div',{style:'display:flex;justify-content:space-between;align-items:center'});
        mr.appendChild(el('div',{class:'st'},'Estimado del mes'));
        mr.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#6D28D9'},'$'+Math.round(gasPersP).toLocaleString('es-AR')+' ARS'));
        mCard.appendChild(mr);
        content.appendChild(mCard);
      }

      if (!gastosPers.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin gastos personales todavia')])); return; }
      var cardP=el('div',{class:'card',style:'overflow-x:auto'});
      var tblP=el('table',{class:'tbl'});
      tblP.appendChild(elH('thead',{},'<tr><th>Gasto</th><th>Categoria</th><th>Monto</th><th>TC</th><th>Proximo pago</th><th>Estado</th><th></th></tr>'));
      var tbP=el('tbody',{});
      gastosPers.forEach(function(g){
        var vence=g.fecha_proximo_pago?new Date(g.fecha_proximo_pago):null;
        var dias=vence?Math.ceil((vence-new Date())/86400000):null;
        var tr=el('tr',{style:g.activo?'':'opacity:.5'});
        var tdN=el('td',{});
        tdN.appendChild(el('div',{style:'font-weight:500'},g.nombre));
        if(g.notas) tdN.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},g.notas));
        tr.appendChild(tdN);
        tr.appendChild(el('td',{},[chipClass(CAT_PERS[g.categoria]||g.categoria,'cp')]));
        tr.appendChild(el('td',{style:'font-weight:500'},'$'+Number(g.monto).toLocaleString('es-AR')+' '+g.moneda+(g.frecuencia==='anual'?' /año':'')));
        var tdTC=el('td',{style:'font-size:12px;color:#64748B'});
        tdTC.textContent=g.moneda==='USD'?'$'+tcActual.toLocaleString('es-AR'):'-';
        tr.appendChild(tdTC);
        var tdV=el('td',{});
        if(vence&&dias!==null){
          var vc=dias<=3?'#A32D2D':dias<=7?'#854F0B':'#64748B';
          tdV.appendChild(el('div',{},fdate(g.fecha_proximo_pago)));
          tdV.appendChild(el('div',{style:'font-size:11px;color:'+vc+';font-weight:500'},dias<0?'Vencido':dias===0?'Hoy':'En '+dias+'d'));
        } else { tdV.textContent='-'; }
        tr.appendChild(tdV);
        var togP=el('label',{class:'tog'});
        var inpP=el('input',{type:'checkbox'}); if(g.activo) inpP.checked=true;
        (function(gid){ inpP.onchange=function(){ dbUpd('panel_gastos_personales',gid,{activo:this.checked}).then(function(){ vFinanzas(); }); }; })(g.id);
        togP.appendChild(inpP); togP.appendChild(el('span',{class:'sl'}));
        tr.appendChild(el('td',{},[togP]));
        var btnEP=el('button',{class:'btn btnsm'},'Editar');
        (function(gg){ btnEP.onclick=function(){ mEditarGastoPersonal(gg,function(){ vFinanzas(); }); }; })(g);
        var btnPP=el('button',{class:'btn btnsm btns',style:'margin-left:4px'},'Pagado');
        (function(gg){ btnPP.onclick=function(){ registrarPagoGastoPersonal(gg,function(){ vFinanzas(); }); }; })(g);
        tr.appendChild(el('td',{style:'white-space:nowrap'},[btnEP,btnPP]));
        tbP.appendChild(tr);
      });
      tblP.appendChild(tbP); cardP.appendChild(tblP);
      content.appendChild(cardP);

      var pagosVerP = periodo==='mes' ? pagoGastosPers
        : pagoGastosPers.filter(function(p){
            return mesesP.some(function(m){
              var s=m.anio+'-'+String(m.mes).padStart(2,'0');
              return p.fecha&&p.fecha.startsWith(s);
            });
          });
      if (pagosVerP.length) {
        var hCardP=el('div',{class:'card',style:'padding:16px;margin-top:14px'});
        hCardP.appendChild(el('div',{class:'st',style:'margin-bottom:12px'},'Historial de pagos'));
        var hTblP=el('table',{class:'tbl',style:'font-size:12px'});
        hTblP.appendChild(elH('thead',{},'<tr><th>Gasto</th><th>Fecha</th><th>Monto</th><th>TC</th><th>ARS</th></tr>'));
        var hTbP=el('tbody',{});
        pagosVerP.forEach(function(p){
          var tr=el('tr',{});
          tr.appendChild(el('td',{style:'font-weight:500'},p._gasto?p._gasto.nombre:'-'));
          tr.appendChild(el('td',{},fdate(p.fecha)));
          tr.appendChild(el('td',{style:'color:#64748B'},'$'+Number(p.monto).toFixed(2)+' '+p.moneda));
          tr.appendChild(el('td',{style:'color:#94a3b8'},'$'+Number(p.tipo_cambio).toLocaleString('es-AR')));
          tr.appendChild(el('td',{style:'font-weight:500;color:#6D28D9'},'$'+Number(p.monto_ars||Number(p.monto)*Number(p.tipo_cambio)).toLocaleString('es-AR')));
          hTbP.appendChild(tr);
        });
        hTblP.appendChild(hTbP); hCardP.appendChild(hTblP);
        content.appendChild(hCardP);
      }
    }

    // Progreso de una cuota: cuota actual "hoy" = cuota_actual (al inicio) + meses transcurridos.
    // Replica isCuotaActive() de Mis Finanzas.
    function cuotaProgresoPF(c) {
      var mRef = getMesPF(mesSeleccionadoPF);
      var hM = mRef ? mRef.month : hoy.getMonth()+1;
      var hA = mRef ? mRef.year : hoy.getFullYear();
      var sy=c.inicio_year||hA, sm=c.inicio_month||1;
      var aunNoEmpezo = (hA<sy) || (hA===sy && hM<sm);
      var elapsed = (hA-sy)*12 + (hM-sm);
      var cuotaActualNum = (c.cuota_actual||1) + (aunNoEmpezo ? 0 : elapsed);
      var finalizada = c.cuota_total ? cuotaActualNum > c.cuota_total : false;
      var pct = c.cuota_total ? Math.min(100, Math.max(0, (cuotaActualNum-1)/c.cuota_total*100)) : 0;
      return {cuotaActualNum:cuotaActualNum, finalizada:finalizada, aunNoEmpezo:aunNoEmpezo, pct:pct};
    }

    function montoCuotaParaMesPF(c) {
      var gastoMes = gastosPF.find(function(g){ return g.cuota_id===c.id && g.mes_id===mesSeleccionadoPF; });
      return gastoMes ? Number(gastoMes.monto) : Number(c.monto);
    }

    // Genera el gasto de una cuota en un mes (si corresponde y no existe todavia)
    function generarGastoCuotaMesPF(c, mes) {
      if (!mes || !isCuotaActivaPF(c, mes.year, mes.month)) return Promise.resolve(null);
      if (gastosPF.find(function(g){ return g.cuota_id===c.id && g.mes_id===mes.id; })) return Promise.resolve(null);
      var fecha = mes.year+'-'+String(mes.month).padStart(2,'0')+'-01';
      return dbIns('panel_pf_gastos', {
        mes_id: mes.id, concepto: nombreConNumeroCuotaPF(c, mes.year, mes.month), monto: c.monto, categoria: 'Créditos',
        tipo: 'fijos', fecha: fecha, cuota_id: c.id, pagado: false
      });
    }

    function renderCuotasPF() {
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Cuotas y creditos'));
      var btnN=el('button',{class:'btn btnp'},'+ Nueva cuota');
      btnN.onclick=function(){ mNuevaCuotaPF(function(nueva){
        // Si hay un mes abierto donde la cuota ya corre, se genera su gasto ahi (antes quedaba afuera hasta crear el mes siguiente)
        var abiertos = mesesPF.filter(function(m){ return m.status==='open'; });
        if (!nueva) { vFinanzas(); return; }
        Promise.all(abiertos.map(function(m){ return generarGastoCuotaMesPF(nueva, m); }))
          .catch(function(e){ alert('La cuota se guardo pero no se pudo generar su gasto del mes: '+e.message); })
          .then(function(){ vFinanzas(); });
      }); };
      sh.appendChild(btnN);
      content.appendChild(sh);
      content.appendChild(mesSelectorPF());

      var activas = cuotasPF.filter(function(c){ return c.activa; });
      var totalMensual = activas.reduce(function(s,c){
        var pr = cuotaProgresoPF(c);
        return (pr.finalizada || pr.aunNoEmpezo) ? s : s+montoCuotaParaMesPF(c);
      }, 0);

      var resCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
      var rr=el('div',{style:'display:flex;justify-content:space-between;align-items:center'});
      rr.appendChild(el('div',{class:'st'},'Compromiso mensual actual'));
      rr.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#A32D2D'},'$'+Math.round(totalMensual).toLocaleString('es-AR')+' ARS'));
      resCard.appendChild(rr);
      content.appendChild(resCard);

      if (!cuotasPF.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin cuotas todavia')])); return; }

      var card=el('div',{class:'card',style:'overflow-x:auto'});
      var tbl=el('table',{class:'tbl'});
      tbl.appendChild(elH('thead',{},'<tr><th>Nombre</th><th>Tipo</th><th>Monto</th><th>Progreso</th><th>Inicio</th><th>Estado</th><th></th></tr>'));
      var tb=el('tbody',{});
      cuotasPF.forEach(function(c){
        var pr = cuotaProgresoPF(c);
        var tr=el('tr',{style:c.activa?'':'opacity:.5'});
        tr.appendChild(el('td',{style:'font-weight:500'},c.nombre));
        tr.appendChild(el('td',{},[chipClass(CAT_CUOTA[c.tipo]||c.tipo,'cgr')]));
        var montoMes = montoCuotaParaMesPF(c);
        var difiere = montoMes !== Number(c.monto);
        var tdM = el('td',{style:'font-weight:500'},'$'+montoMes.toLocaleString('es-AR'));
        if (difiere) tdM.appendChild(el('div',{style:'font-size:10px;color:#94a3b8'},'base: $'+Number(c.monto).toLocaleString('es-AR')));
        tr.appendChild(tdM);
        var tdP=el('td',{});
        if (c.cuota_total) {
          tdP.appendChild(el('div',{style:'font-size:12px;margin-bottom:4px'},
            pr.aunNoEmpezo ? 'Aun no empezo' : pr.finalizada ? 'Finalizada' : 'Cuota ' + pr.cuotaActualNum + ' de ' + c.cuota_total));
          var prog=el('div',{class:'progress',style:'background:#F1F5F9;border-radius:4px;height:6px;width:140px'});
          prog.appendChild(el('div',{style:'height:6px;border-radius:4px;background:'+(pr.finalizada?'#5BBD4E':'#0B9EDA')+';width:'+pr.pct+'%'}));
          tdP.appendChild(prog);
        } else { tdP.textContent = 'Sin plazo fijo'; }
        tr.appendChild(tdP);
        tr.appendChild(el('td',{style:'font-size:12px;color:#64748B'}, (c.inicio_month||1)+'/'+(c.inicio_year||'-')));
        var tog=el('label',{class:'tog'});
        var inp=el('input',{type:'checkbox'}); if (c.activa) inp.checked=true;
        (function(cid){ inp.onchange=function(){ dbUpd('panel_pf_cuotas',cid,{activa:this.checked}).then(function(){ vFinanzas(); }); }; })(c.id);
        tog.appendChild(inp); tog.appendChild(el('span',{class:'sl'}));
        tr.appendChild(el('td',{},[tog]));
        var btnEM=el('button',{class:'btn btnsm', style:'background:#E6F6FD;border-color:#E6F6FD;color:#0C6FA3'},'Monto del mes');
        (function(cc){ btnEM.onclick=function(){
          var gastoMes = gastosPF.find(function(g){ return g.cuota_id===cc.id && g.mes_id===mesSeleccionadoPF; });
          if (!gastoMes) {
            var mesSel = mesesPF.find(function(m){ return m.id===mesSeleccionadoPF; });
            if (mesSel && isCuotaActivaPF(cc, mesSel.year, mesSel.month)) {
              if (confirm('Esta cuota todavia no tiene su gasto en '+MESES[mesSel.month-1]+' '+mesSel.year+'. Generarlo ahora?')) {
                generarGastoCuotaMesPF(cc, mesSel).then(function(){ vFinanzas(); }).catch(function(e){ alert('Error: '+e.message); });
              }
            } else { alert('Esta cuota no corre en el mes seleccionado ('+mesSeleccionadoPF+').'); }
            return;
          }
          mEditarGastoPF(gastoMes, function(patch){ Object.assign(gastoMes, patch); renderAll(); });
        }; })(c);
        var btnE=el('button',{class:'btn btnsm', style:'margin-left:4px'},'Editar cuota base');
        (function(cc){ btnE.onclick=function(){ mEditarCuotaPF(cc,function(){ vFinanzas(); }); }; })(c);
        var btnD=el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
        (function(cid){ btnD.onclick=function(){
          if (!confirm('Eliminar esta cuota? Esta accion no se puede deshacer.')) return;
          sbFetch('panel_pf_cuotas?id=eq.'+cid,{method:'DELETE',prefer:'return=minimal'}).then(function(){ vFinanzas(); });
        }; })(c.id);
        tr.appendChild(el('td',{style:'white-space:nowrap'},[btnEM,btnE,btnD]));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl);
      content.appendChild(card);
    }

    // ── Selector de mes compartido por los tabs PF ──
    function mesSelectorPF() {
      var wrapS = el('div', {style:'margin-bottom:14px;display:flex;align-items:center;gap:8px'});
      wrapS.appendChild(el('span', {style:'font-size:12px;color:#64748B'}, 'Mes:'));
      var opts = mesesPF.map(function(m){ return [m.id, MESES[m.month-1]+' '+m.year+(m.status==='open'?' (abierto)':'')]; });
      var sel = mkSelect('mes-sel-pf', opts, mesSeleccionadoPF);
      sel.style.width = 'auto';
      sel.onchange = function() { mesSeleccionadoPF = this.value; _finUIState.mesSeleccionadoPF = mesSeleccionadoPF; renderAll(); };
      wrapS.appendChild(sel);
      var btnNuevo = el('button', {class:'btn btnsm', style:'margin-left:6px'}, '+ Crear mes siguiente');
      btnNuevo.onclick = function() { crearMesSiguientePF(); };
      wrapS.appendChild(btnNuevo);
      return wrapS;
    }

    // Replica isCuotaActive() de Mis Finanzas
    function isCuotaActivaPF(c, y, mo) {
      var sy = c.inicio_year||y, sm = c.inicio_month||1;
      if (y<sy || (y===sy && mo<sm)) return false;
      if (!c.cuota_total) return true;
      var elapsed = (y-sy)*12 + (mo-sm);
      var cur = (c.cuota_actual||1) + elapsed;
      return cur <= c.cuota_total;
    }
    // Numero de cuota que corresponde a una cuota en un mes/anio dado (no "hoy", el mes que se le pase)
    function numeroCuotaPF(c, y, mo) {
      var sy = c.inicio_year||y, sm = c.inicio_month||1;
      var elapsed = (y-sy)*12 + (mo-sm);
      return (c.cuota_actual||1) + Math.max(0, elapsed);
    }
    function nombreConNumeroCuotaPF(c, y, mo) {
      return c.cuota_total ? c.nombre + ' (' + numeroCuotaPF(c,y,mo) + '/' + c.cuota_total + ')' : c.nombre;
    }

    function crearMesSiguientePF() {
      var ultimo = mesesPF[mesesPF.length-1];
      var y = ultimo ? ultimo.year : hoy.getFullYear(), m = ultimo ? ultimo.month : hoy.getMonth()+1;
      m++; if (m>12) { m=1; y++; }
      var id = y+'-'+m;
      if (mesesPF.find(function(x){ return x.id===id; })) { alert('Ese mes ya existe'); return; }
      // El mes anterior pasa a closed, el nuevo nace open
      var p = Promise.resolve();
      if (ultimo) p = dbUpd('panel_pf_meses', ultimo.id, {status:'closed'});
      p.then(function(){
        return dbIns('panel_pf_meses', {id:id, year:y, month:m, status:'open'});
      }).then(function(){
        // Cargar las cuotas activas en este mes como gastos vinculados (igual que en Mis Finanzas)
        var fecha = y+'-'+String(m).padStart(2,'0')+'-01';
        var activas = cuotasPF.filter(function(c){ return c.activa && isCuotaActivaPF(c, y, m); });
        var inserts = activas.map(function(c) {
          return dbIns('panel_pf_gastos', {
            mes_id: id, concepto: nombreConNumeroCuotaPF(c,y,m), monto: c.monto, categoria: 'Créditos',
            tipo: 'fijos', fecha: fecha, cuota_id: c.id, pagado: false
          });
        });
        // Plantilla: copiar TODOS los gastos no-cuota del ultimo mes (fijos, tarjetas, varios), en cero,
        // para que el modulo completo (Tarjetas, Pedrito, Servicios, etc.) aparezca listo para editar o borrar.
        // Los "ajuste" puntuales (correcciones de un mes especifico) no se copian, no son recurrentes.
        if (ultimo) {
          var noCuotaPrevios = gastosPF.filter(function(g){ return g.mes_id===ultimo.id && g.tipo!=='ajuste' && !g.cuota_id; });
          noCuotaPrevios.forEach(function(g) {
            // Conservar el dia del gasto en el mes nuevo (limitado a 28 para meses cortos)
            var dia = 1;
            if (g.fecha) { var dPrev = parseInt(g.fecha.slice(8,10), 10); if (dPrev >= 1) dia = Math.min(dPrev, 28); }
            var fechaG = y+'-'+String(m).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
            inserts.push(dbIns('panel_pf_gastos', {
              mes_id: id, concepto: g.concepto,
              monto: Number(g.monto||0), monto_usd: Number(g.monto_usd||0),
              monto_negocio: Number(g.monto_negocio||0), monto_usd_negocio: Number(g.monto_usd_negocio||0),
              categoria: g.categoria, tipo: g.tipo, fecha: fechaG, cuota_id: null, pagado: false
            }));
          });
        }
        // Liquidacion Juan: arrastrar los $/punto y la base de rentabilidad del mes anterior
        // (esos valores cambian poco a poco, no arrancan en 0 cada mes; los puntajes logrados
        // y los montos de sueldo si arrancan vacios porque son especificos de cada mes)
        if (ultimo) {
          var jPrev = juanPF.find(function(x){ return x.mes_id===ultimo.id; });
          if (jPrev) {
            inserts.push(dbIns('panel_pf_liquidacion_juan', {
              mes_id: id,
              rent_base: jPrev.rent_base, rent_ppunto: jPrev.rent_ppunto,
              des_ppunto: jPrev.des_ppunto, sup_ppunto: jPrev.sup_ppunto, uni_ppunto: jPrev.uni_ppunto
            }));
          }
        }
        return Promise.all(inserts);
      }).then(function(){ mesSeleccionadoPF = id; _finUIState.mesSeleccionadoPF = id; vFinanzas(); });
    }

    function getMesPF(id) { return mesesPF.find(function(m){ return m.id===id; }); }

    // Replica calcJuanTotals() de Mis Finanzas
    function calcJuanTotalsPF(j, mesMonth) {
      j = j || {};
      var rentPuntaje = j.rent_puntaje || 0;
      var rentBase = (j.rent_base != null && j.rent_base !== '') ? Number(j.rent_base) : 24;
      var rentAMultiplicar = Math.max(0, rentPuntaje - rentBase);
      var rentabilidad = rentAMultiplicar * (j.rent_ppunto || 0);
      var desempeno = (j.des_puntaje||0) * (j.des_ppunto||0);
      var superrubros = (j.sup_puntaje||0) * (j.sup_ppunto||0);
      var unidades = (j.uni_puntaje||0) * (j.uni_ppunto||0);
      var totalConceptos = rentabilidad + desempeno + superrubros + unidades;
      var esAguinaldo = mesMonth === 1 || mesMonth === 7;
      var aguinaldo = esAguinaldo ? (j.aguinaldo || 0) : 0;
      var totalBruto = totalConceptos + aguinaldo;
      var juanSueldo = j.juan_sueldo || 0;
      var juanDS = totalBruto - juanSueldo;
      return {rentBase:rentBase, rentAMultiplicar:rentAMultiplicar, rentabilidad:rentabilidad, desempeno:desempeno, superrubros:superrubros, unidades:unidades,
        totalConceptos:totalConceptos,
        esAguinaldo:esAguinaldo, aguinaldo:aguinaldo, totalBruto:totalBruto, juanSueldo:juanSueldo, juanDS:juanDS};
    }

    function getDaianaSueldoPF(d) {
      if (!d) return 0;
      var horas = d.horas||0, precio = d.precio_hora||0;
      if (horas && precio) return horas*precio;
      return d.sueldo_hist||0;
    }

    function ingresoTotalMesPF(mesId) {
      var mm = getMesPF(mesId);
      var j = juanPF.find(function(x){ return x.mes_id===mesId; });
      var t = calcJuanTotalsPF(j, mm ? mm.month : null);
      var otros = ingresosPF.filter(function(i){ return i.mes_id===mesId && i.categoria!=='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); }, 0);
      var musica = musicaPF.filter(function(m){ return m.mes_id===mesId; }).reduce(function(s,m){ return s+Number(m.cobrado||0)-Number(m.nianera||0); }, 0);
      var cobradoNeg = cobradoNegocioMesPF(mm ? mm.year : 0, mm ? mm.month : 0);
      return t.juanSueldo + t.juanDS + otros + musica + cobradoNeg;
    }
    function gastoTotalMesPF(mesId) {
      return gastosPF.filter(function(g){ return g.mes_id===mesId; }).reduce(function(s,g){ return s+Number(g.monto||0); }, 0);
    }
    function gastoTotalMesUSD_PF(mesId) {
      return gastosPF.filter(function(g){ return g.mes_id===mesId; }).reduce(function(s,g){ return s+Number(g.monto_usd||0); }, 0);
    }
    function gastoNegocioMesPF(mesId) {
      var lista = gastosPF.filter(function(g){ return g.mes_id===mesId; });
      return { ars: lista.reduce(function(s,g){ return s+Number(g.monto_negocio||0); },0), usd: lista.reduce(function(s,g){ return s+Number(g.monto_usd_negocio||0); },0) };
    }
    // Cobrado del negocio (panel_cobros, estado pagado) en un mes/anio dado.
    function cobradoNegocioMesPF(year, month) {
      return cobros.filter(function(c) {
        if (!c.fecha_pago) return false;
        var d = new Date(c.fecha_pago+'T00:00:00');
        return d.getFullYear()===year && (d.getMonth()+1)===month;
      }).reduce(function(s,c){ return s+Number(c.monto); }, 0);
    }

    function renderCrucePF() {
      content.appendChild(mesSelectorPF());
      var m = getMesPF(mesSeleccionadoPF);
      if (!m) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay meses cargados')])); return; }

      var cobrado = cobradoNegocioMesPF(m.year, m.month);
      var gastoPersonal = gastoTotalMesPF(m.id);
      var gNeg = gastoNegocioMesPF(m.id);
      var neto = cobrado - gastoPersonal - gNeg.ars;

      var mets = el('div', {class:'mets'});
      [
        {color:'#3D8A32', label:'Cobrado del negocio', val:fmt(cobrado)},
        {color:'#A32D2D', label:'Gastos personales', val:fmt(gastoPersonal)},
        {color:'#854F0B', label:'Gastos negocio (plata personal)', val:fmt(gNeg.ars)+(gNeg.usd>0?' + '+fmtMon(gNeg.usd,'USD'):'')},
        {color: neto>=0?'#0B9EDA':'#A32D2D', label:'Resultado neto', val:fmt(neto)}
      ].forEach(function(mt) {
        var met = el('div', {class:'met'});
        met.appendChild(el('div', {class:'mst', style:'background:'+mt.color}));
        met.appendChild(el('div', {class:'mlb'}, mt.label));
        met.appendChild(el('div', {class:'mv', style:'font-size:'+(mt.val.length>10?'15px':'20px')}, mt.val));
        mets.appendChild(met);
      });
      content.appendChild(mets);

      var nota = el('div',{class:'card',style:'padding:14px 16px;margin-top:14px;font-size:12px;color:#64748B'});
      nota.appendChild(el('div',{},'Resultado neto = Cobrado del negocio (recibos pagados, fee + implementacion) − Gastos personales − Gastos del negocio que pagaste con plata personal (ej. Supabase, Vercel).'));
      nota.appendChild(el('div',{style:'margin-top:4px'},'Los gastos marcados "🏢 Negocio" en la pestaña Gastos no se cuentan como gasto personal, pero si salieron de tu bolsillo, se restan igual aca para que el neto sea real.'));
      content.appendChild(nota);

      // Evolucion ultimos 6 meses
      var idxMesEv = mesesPF.findIndex(function(mm){ return mm.id===m.id; });
      var ultimosMesesEv = mesesPF.slice(Math.max(0, idxMesEv-5), idxMesEv+1);
      if (ultimosMesesEv.length > 1) {
        var card = el('div',{class:'card',style:'overflow-x:auto;margin-top:14px'});
        var tbl = el('table',{class:'tbl'});
        tbl.appendChild(elH('thead',{},'<tr><th>Mes</th><th>Cobrado negocio</th><th>Gastos personales</th><th>Gastos negocio</th><th>Neto</th></tr>'));
        var tb = el('tbody',{});
        ultimosMesesEv.forEach(function(mm) {
          var cob = cobradoNegocioMesPF(mm.year, mm.month);
          var gp = gastoTotalMesPF(mm.id);
          var gn = gastoNegocioMesPF(mm.id);
          var net = cob - gp - gn.ars;
          var tr = el('tr',{});
          tr.appendChild(el('td',{style:'font-weight:500'}, MESES[mm.month-1]+' '+mm.year));
          tr.appendChild(el('td',{style:'color:#3D8A32'}, fmt(cob)));
          tr.appendChild(el('td',{style:'color:#A32D2D'}, fmt(gp)));
          tr.appendChild(el('td',{style:'color:#854F0B'}, gn.ars>0?fmt(gn.ars):'-'));
          tr.appendChild(el('td',{style:'font-weight:700;color:'+(net>=0?'#0B9EDA':'#A32D2D')}, fmt(net)));
          tb.appendChild(tr);
        });
        tbl.appendChild(tb); card.appendChild(tbl);
        content.appendChild(card);
      }
    }

    var GASTO_GRUPOS_PF = [
      {nombre:'💳 Tarjetas', match:function(g){ return g.categoria==='Tarjetas'; }},
      {nombre:'🏦 Creditos', match:function(g){ return g.categoria==='Créditos'; }},
      {nombre:'👶 Pedrito', match:function(g){ return g.categoria==='Pedrito' || g.categoria==='Alimentos'; }},
      {nombre:'🔌 Servicios', match:function(g){ return g.categoria==='Servicios'; }},
      {nombre:'🚗 Auto y Transporte', match:function(g){ return g.categoria==='Transporte'; }},
      {nombre:'💊 Salud', match:function(g){ return g.categoria==='Salud'; }},
      {nombre:'🎭 Ocio', match:function(g){ return g.categoria==='Ocio'; }},
      {nombre:'📦 Otros', match:function(){ return true; }}
    ];

    function renderResumenPF() {
      content.appendChild(mesSelectorPF());
      var m = getMesPF(mesSeleccionadoPF);
      if (!m) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay meses cargados')])); return; }

      var ing = ingresoTotalMesPF(m.id);
      var gas = gastoTotalMesPF(m.id);
      var bal = ing - gas;
      var cuotasActivas = cuotasPF.filter(function(c){ return c.activa && isCuotaActivaPF(c, m.year, m.month); });
      var compromisoCuotas = cuotasActivas.reduce(function(s,c){ return s+Number(c.monto); }, 0);
      var deudaPend = deudasPF.filter(function(d){ return d.estado==='pendiente'; }).reduce(function(s,d){ return s+Number(d.monto); }, 0);

      var mets = el('div', {class:'mets'});
      [
        {color:'#3D8A32', label:'Ingresos del mes', val:fmt(ing)},
        {color:'#A32D2D', label:'Gastos del mes', val:fmt(gas)},
        {color: bal>=0?'#0B9EDA':'#A32D2D', label:'Saldo', val:fmt(bal)},
        {color:'#854F0B', label:'Cuotas activas', val:String(cuotasActivas.length), sub:fmt(compromisoCuotas)+'/mes'},
        {color:'#7F77DD', label:'Deuda por cobrar', val:fmt(deudaPend)}
      ].forEach(function(mt) {
        var met = el('div', {class:'met'});
        met.appendChild(el('div', {class:'mst', style:'background:'+mt.color}));
        met.appendChild(el('div', {class:'mlb'}, mt.label));
        met.appendChild(el('div', {class:'mv', style:'font-size:'+(mt.val.length>8?'16px':'22px')}, mt.val));
        if (mt.sub) met.appendChild(el('div', {class:'ms'}, mt.sub));
        mets.appendChild(met);
      });
      content.appendChild(mets);
      if (typeof renderProxMesPF === 'function' && cuentasPF.length) renderProxMesPF();

      // ── Flujo próximos 30 días: cobros pendientes (entra) vs gastos sin pagar (sale) ──
      var hoyF = new Date(); var en30 = new Date(hoyF.getTime() + 30*24*60*60*1000);
      var hoyStr = hoyF.toISOString().slice(0,10), en30Str = en30.toISOString().slice(0,10);
      var entra30 = cobrosPendientes.filter(function(c){
        return c.fecha_vencimiento && c.fecha_vencimiento <= en30Str;
      }).reduce(function(s,c){ return s+Number(c.monto); }, 0);
      var gastosSinPagar = gastosPF.filter(function(g){
        return g.mes_id===m.id && !g.pagado && (Number(g.monto)>0 || Number(g.monto_usd)>0);
      });
      var sale30 = gastosSinPagar.reduce(function(s,g){ return s + saldoPF(g) + Math.max(0, Number(g.monto_usd||0) - entregadoUSDPF(g))*tcUSD; }, 0);
      var neto30 = entra30 - sale30;
      var flujoCard = el('div',{class:'card',style:'padding:16px;margin-top:14px'});
      flujoCard.appendChild(el('div',{class:'st',style:'margin-bottom:10px'},'Flujo próximos 30 días'));
      var flujoRow = el('div',{style:'display:grid;grid-template-columns:repeat(3,1fr);gap:10px'});
      [{label:'Entra (cobros pendientes)', val:fmt(entra30), color:'#3D8A32', bg:'#EDF7EA'},
       {label:'Sale (gastos sin pagar)', val:fmt(sale30), color:'#A32D2D', bg:'#FEF2F2', sub:gastosSinPagar.length+' gasto'+(gastosSinPagar.length!==1?'s':'')},
       {label:'Neto', val:fmt(neto30), color:neto30>=0?'#0B9EDA':'#A32D2D', bg:neto30>=0?'#F0F9FF':'#FEF2F2'}
      ].forEach(function(k){
        var kb = el('div',{style:'background:'+k.bg+';border-radius:10px;padding:12px 14px'});
        kb.appendChild(el('div',{style:'font-size:10px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.05em'},k.label));
        kb.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:'+k.color+';margin-top:3px'},k.val));
        if (k.sub) kb.appendChild(el('div',{style:'font-size:10px;color:#94a3b8;margin-top:2px'},k.sub));
        flujoRow.appendChild(kb);
      });
      flujoCard.appendChild(flujoRow);
      content.appendChild(flujoCard);

      var ultimos = mesesPF.slice(-6);
      var chartCard = el('div',{class:'card',style:'padding:16px;margin-top:14px'});
      chartCard.appendChild(el('div',{class:'st',style:'margin-bottom:14px'},'Evolucion (ultimos '+ultimos.length+' meses)'));
      var datos = ultimos.map(function(mm){ return {label:MESES_CORTOS[mm.month-1], ing:ingresoTotalMesPF(mm.id), gas:gastoTotalMesPF(mm.id)}; });
      var maxVal = Math.max.apply(null, datos.map(function(d){ return Math.max(d.ing,d.gas); }))||1;
      var cw = el('div',{style:'display:flex;flex-direction:column;gap:8px'});
      datos.forEach(function(d) {
        var row=el('div',{style:'display:flex;align-items:center;gap:10px'});
        row.appendChild(el('div',{style:'width:28px;font-size:11px;color:#94a3b8;text-align:right;flex-shrink:0'},d.label));
        var bars=el('div',{style:'flex:1;display:flex;flex-direction:column;gap:3px'});
        var ingPct=d.ing>0?Math.max(3,Math.round(d.ing/maxVal*100)):0;
        var gasPct=d.gas>0?Math.max(3,Math.round(d.gas/maxVal*100)):0;
        var ir=el('div',{style:'display:flex;align-items:center;gap:6px'});
        ir.appendChild(el('div',{style:'height:8px;border-radius:4px;background:#5BBD4E;width:'+ingPct+'%;min-width:'+(d.ing>0?'4px':'0')}));
        ir.appendChild(el('span',{style:'font-size:10px;color:'+(d.ing>0?'#5BBD4E':'#E2E8F0')},d.ing>0?fmt(d.ing):'—'));
        var gr=el('div',{style:'display:flex;align-items:center;gap:6px'});
        gr.appendChild(el('div',{style:'height:8px;border-radius:4px;background:#FCA5A5;width:'+gasPct+'%;min-width:'+(d.gas>0?'4px':'0')}));
        if (d.gas>0) gr.appendChild(el('span',{style:'font-size:10px;color:#EF4444'},fmt(d.gas)));
        bars.appendChild(ir); bars.appendChild(gr);
        row.appendChild(bars);
        cw.appendChild(row);
      });
      chartCard.appendChild(cw);
      var leg=el('div',{style:'display:flex;gap:16px;margin-top:12px;padding-top:10px;border-top:.5px solid #F1F5F9'});
      [['#5BBD4E','Ingresos'],['#FCA5A5','Gastos']].forEach(function(l){
        var li=el('span',{style:'font-size:11px;color:#64748B;display:flex;align-items:center;gap:5px'});
        li.appendChild(el('span',{style:'width:10px;height:6px;border-radius:3px;background:'+l[0]+';display:inline-block'}));
        li.appendChild(document.createTextNode(l[1]));
        leg.appendChild(li);
      });
      chartCard.appendChild(leg);
      content.appendChild(chartCard);

      // ── CRUCE DEL MES ──
      var cruceCard=el('div',{class:'card',style:'padding:16px;margin-top:14px'});
      cruceCard.appendChild(el('div',{class:'st',style:'margin-bottom:14px'},'Cruce del mes'));
      var j2=juanPF.find(function(x){ return x.mes_id===m.id; })||{};
      var t2=calcJuanTotalsPF(j2,m.month);
      var cobradoN=cobradoNegocioMesPF(m.year,m.month);
      var gastoP=gastoTotalMesPF(m.id);
      var gNeg2=gastoNegocioMesPF(m.id);
      var ingPersonales=t2.juanSueldo+t2.juanDS+ingresosPF.filter(function(i){ return i.mes_id===m.id&&i.categoria!=='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); },0)+musicaPF.filter(function(x){ return x.mes_id===m.id; }).reduce(function(s,x){ return s+Number(x.cobrado||0)-Number(x.nianera||0); },0);
      var totalIng=ingPersonales+cobradoN;
      var totalGas=gastoP+gNeg2.ars;
      var resultado=totalIng-totalGas;
      var cruceMets=el('div',{class:'mets'});
      [{label:'Ingresos personales',val:fmt(ingPersonales),col:'#0B9EDA'},{label:'Cobrado negocio',val:fmt(cobradoN),col:'#3D8A32'},{label:'Gastos del mes',val:fmt(totalGas),col:'#A32D2D'},{label:'Resultado neto',val:fmt(resultado),col:resultado>=0?'#3D8A32':'#A32D2D'}].forEach(function(mt){
        var cm=el('div',{class:'met'}); cm.appendChild(el('div',{class:'mst',style:'background:'+mt.col})); cm.appendChild(el('div',{class:'mlb'},mt.label)); cm.appendChild(el('div',{class:'mv',style:'font-size:'+(mt.val.length>10?'14px':'18px')+';color:'+mt.col},mt.val)); cruceMets.appendChild(cm);
      });
      cruceCard.appendChild(cruceMets);
      var cruceCols=el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px'});
      function cruceRow(label,val,col){ var r=el('div',{style:'display:flex;justify-content:space-between;padding:5px 0;border-bottom:.5px solid #F1F5F9;font-size:12px'}); r.appendChild(el('span',{style:'color:#64748B'},label)); r.appendChild(el('span',{style:'font-weight:500;color:'+(col||'#1a2e4a')},val)); return r; }
      var colIng=el('div',{});
      colIng.appendChild(el('div',{style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;padding-bottom:6px;border-bottom:.5px solid #E2E8F0'},'Ingresos'));
      if(t2.juanSueldo) colIng.appendChild(cruceRow('Sueldo',fmt(t2.juanSueldo),'#0B9EDA'));
      if(t2.juanDS) colIng.appendChild(cruceRow('DS empresa',fmt(t2.juanDS),'#0B9EDA'));
      ingresosPF.filter(function(i){ return i.mes_id===m.id&&i.categoria!=='Transferencia interna'; }).forEach(function(i){ colIng.appendChild(cruceRow(i.concepto||i.categoria,fmt(Number(i.monto)),'#0B9EDA')); });
      var mus2=musicaPF.filter(function(x){ return x.mes_id===m.id; }).reduce(function(s,x){ return s+Number(x.cobrado||0)-Number(x.nianera||0); },0);
      if(mus2>0) colIng.appendChild(cruceRow('Música',fmt(mus2),'#0B9EDA'));
      if(cobradoN>0) colIng.appendChild(cruceRow('Cobrado negocio',fmt(cobradoN),'#3D8A32'));
      var totIR=el('div',{style:'display:flex;justify-content:space-between;padding:8px 0 0;margin-top:4px;border-top:.5px solid #CBD5E1;font-size:13px'}); totIR.appendChild(el('span',{style:'font-weight:500'},'Total')); totIR.appendChild(el('span',{style:'font-weight:500;color:#3D8A32'},fmt(totalIng))); colIng.appendChild(totIR);
      var colGas=el('div',{});
      colGas.appendChild(el('div',{style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;padding-bottom:6px;border-bottom:.5px solid #E2E8F0'},'Gastos'));
      var restG=gastosPF.filter(function(g){ return g.mes_id===m.id; }).slice();
      agruparGastosPF(restG).forEach(function(gr){ if(gr.tot>0) colGas.appendChild(cruceRow(gr.nombre,fmt(gr.tot),'#A32D2D')); });
      if(gNeg2.ars>0) colGas.appendChild(cruceRow('🏢 Gastos negocio',fmt(gNeg2.ars)+(gNeg2.usd>0?' + USD'+gNeg2.usd.toFixed(2):''),'#854F0B'));
      var totGR=el('div',{style:'display:flex;justify-content:space-between;padding:8px 0 0;margin-top:4px;border-top:.5px solid #CBD5E1;font-size:13px'}); totGR.appendChild(el('span',{style:'font-weight:500'},'Total')); totGR.appendChild(el('span',{style:'font-weight:500;color:#A32D2D'},fmt(totalGas))); colGas.appendChild(totGR);
      cruceCols.appendChild(colIng); cruceCols.appendChild(colGas); cruceCard.appendChild(cruceCols);
      var resBox=el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:8px;margin-top:14px;background:'+(resultado>=0?'#EDF7EA':'#FCEBEB')+';border:.5px solid '+(resultado>=0?'#5BBD4E':'#E53E3E')});
      resBox.appendChild(el('span',{style:'font-weight:500;font-size:13px;color:'+(resultado>=0?'#3D8A32':'#A32D2D')},resultado>=0?'Superávit':'Déficit'));
      resBox.appendChild(el('span',{style:'font-size:18px;font-weight:500;color:'+(resultado>=0?'#3D8A32':'#A32D2D')},fmt(resultado)));
      cruceCard.appendChild(resBox);
      var idxEv=mesesPF.findIndex(function(mm){ return mm.id===m.id; });
      var ultM=mesesPF.slice(Math.max(0,idxEv-5),idxEv+1);
      if(ultM.length>1){
        var evC=el('div',{style:'overflow-x:auto;margin-top:12px;background:#F8FAFC;border-radius:8px;padding:12px'});
        evC.appendChild(el('div',{style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;margin-bottom:10px'},'Evolución'));
        var evT=el('table',{class:'tbl'}); evT.appendChild(elH('thead',{},'<tr><th>Mes</th><th style="text-align:right">Ing.</th><th style="text-align:right">Cob.neg.</th><th style="text-align:right">Gastos</th><th style="text-align:right">Resultado</th></tr>'));
        var evTb=el('tbody',{});
        ultM.forEach(function(mm){ var jj=juanPF.find(function(x){ return x.mes_id===mm.id; })||{}; var tt2=calcJuanTotalsPF(jj,mm.month); var ingP2=tt2.juanSueldo+tt2.juanDS+ingresosPF.filter(function(i){ return i.mes_id===mm.id&&i.categoria!=='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); },0)+musicaPF.filter(function(x){ return x.mes_id===mm.id; }).reduce(function(s,x){ return s+Number(x.cobrado||0)-Number(x.nianera||0); },0); var cobN2=cobradoNegocioMesPF(mm.year,mm.month); var gasT2=gastoTotalMesPF(mm.id)+gastoNegocioMesPF(mm.id).ars; var res2=ingP2+cobN2-gasT2; var tr2=el('tr',{}); tr2.appendChild(el('td',{style:'font-weight:500;font-size:11px'},MESES[mm.month-1].slice(0,3)+' '+mm.year)); tr2.appendChild(el('td',{style:'text-align:right;color:#0B9EDA;font-size:11px'},fmt(ingP2))); tr2.appendChild(el('td',{style:'text-align:right;color:#3D8A32;font-size:11px'},cobN2>0?fmt(cobN2):'-')); tr2.appendChild(el('td',{style:'text-align:right;color:#A32D2D;font-size:11px'},fmt(gasT2))); tr2.appendChild(el('td',{style:'text-align:right;font-weight:500;font-size:11px;color:'+(res2>=0?'#3D8A32':'#A32D2D')},fmt(res2))); evTb.appendChild(tr2); });
        evT.appendChild(evTb); evC.appendChild(evT); cruceCard.appendChild(evC);
      }
      content.appendChild(cruceCard);
    }

    function renderIngresosPF() {
      content.appendChild(mesSelectorPF());
      var m = getMesPF(mesSeleccionadoPF);
      if (!m) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay meses cargados')])); return; }
      var j = juanPF.find(function(x){ return x.mes_id===m.id; }) || {};
      var t = calcJuanTotalsPF(j, m.month);
      var otros = ingresosPF.filter(function(i){ return i.mes_id===m.id; });
      var totalOtros = otros.filter(function(i){ return i.categoria!=='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); }, 0) + musicaPF.filter(function(x){ return x.mes_id===m.id; }).reduce(function(s,x){ return s+Number(x.cobrado||0)-Number(x.nianera||0); }, 0);
      var cobradoReal = cobradoNegocioMesPF(m.year, m.month);
      var totalMes = t.juanSueldo + t.juanDS + totalOtros + cobradoReal;

      var resCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
      var rr=el('div',{style:'display:flex;justify-content:space-between;align-items:center'});
      rr.appendChild(el('div',{class:'st'},'Total ingresos del mes'));
      rr.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#3D8A32'},'$'+Math.round(totalMes).toLocaleString('es-AR')));
      resCard.appendChild(rr);
      content.appendChild(resCard);

      // Card Juan
      var jCard = el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
      jCard.appendChild(el('div',{class:'st',style:'margin-bottom:10px'},'Liquidacion Juan (sueldo'+(t.esAguinaldo?' + aguinaldo':'')+')'));
      var jGrid = el('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px'});
      var jFieldNames = ['rent_puntaje','rent_base','rent_ppunto','des_puntaje','des_ppunto','sup_puntaje','sup_ppunto','uni_puntaje','uni_ppunto'];
      if (t.esAguinaldo) jFieldNames.push('aguinaldo');
      jFieldNames.push('juan_sueldo');
      function jField(label, field, val, span) {
        var inp = mkInput('jpf-'+field,'number',val||'');
        inp.oninput = actualizarPreviewJuan;
        var fg = mkFg(label, inp);
        if (span) fg.style.gridColumn = 'span '+span;
        jGrid.appendChild(fg);
      }
      // Fila 1: rentabilidad en 3 columnas (puntaje | base | $/punto)
      jField('Rentabilidad — puntaje','rent_puntaje',j.rent_puntaje);
      jField('Rentabilidad — base (minimo)','rent_base',j.rent_base!=null?j.rent_base:24);
      jField('Rentabilidad — $/punto','rent_ppunto',j.rent_ppunto);
      // Pares: puntaje | $/punto (ocupan 2 de las 3 col, la 3ra queda vacia via span trick)
      jField('Desempeño — puntaje','des_puntaje',j.des_puntaje);
      jField('Desempeño — $/punto','des_ppunto',j.des_ppunto);
      jGrid.appendChild(el('div',{})); // celda vacia para completar fila
      jField('Superrubros — puntaje','sup_puntaje',j.sup_puntaje);
      jField('Superrubros — $/punto','sup_ppunto',j.sup_ppunto);
      jGrid.appendChild(el('div',{})); // celda vacia
      jField('Unidades — puntaje','uni_puntaje',j.uni_puntaje);
      jField('Unidades — $/punto','uni_ppunto',j.uni_ppunto);
      jGrid.appendChild(el('div',{})); // celda vacia
      if (t.esAguinaldo) {
        jField('Aguinaldo','aguinaldo',j.aguinaldo,3);
        var idxMes = mesesPF.findIndex(function(mm){ return mm.id===m.id; });
        var ultimos6 = mesesPF.slice(Math.max(0, idxMes-6), idxMes);
        var sueldosUltimos6 = ultimos6.map(function(mm) {
          var jj = juanPF.find(function(x){ return x.mes_id===mm.id; });
          return jj ? Number(jj.juan_sueldo||0) : 0;
        });
        if (sueldosUltimos6.length) {
          var promedio6 = sueldosUltimos6.reduce(function(s,v){ return s+v; },0)/sueldosUltimos6.length;
          var sugerido = promedio6/2;
          jGrid.appendChild(el('div',{style:'grid-column:1/-1;font-size:11px;color:#64748B;background:#F8FAFC;border-radius:6px;padding:6px 10px'},
            'Sugerido de aguinaldo (mitad del promedio de sueldo de los ultimos '+sueldosUltimos6.length+' meses calendario): '+fmt(sugerido)+
            ' — todavia es una referencia, no el sueldo real de este mes.'));
        } else {
          jGrid.appendChild(el('div',{style:'grid-column:1/-1;font-size:11px;color:#94a3b8'},'No hay meses anteriores cargados para sugerir un aguinaldo.'));
        }
      }
      jField('Sueldo depositado (Juan)','juan_sueldo',j.juan_sueldo,3);
      jCard.appendChild(jGrid);
      var jTot = el('div',{id:'jpf-totales', style:'background:#F8FAFC;border-radius:8px;padding:12px 14px;font-size:12px;color:#64748B'});
      function pintarTotalesJuan(tt) {
        jTot.innerHTML = '';
        jTot.appendChild(el('div',{},'Rentabilidad a multiplicar: '+tt.rentAMultiplicar.toFixed(2)+' (puntaje − base '+tt.rentBase+') → '+fmt(tt.rentabilidad)));
        jTot.appendChild(el('div',{},'Desempeño '+fmt(tt.desempeno)+' · Superrubros '+fmt(tt.superrubros)+' · Unidades '+fmt(tt.unidades)));
        jTot.appendChild(el('div',{},'Subtotal conceptos '+fmt(tt.totalConceptos)+(tt.esAguinaldo?' · Aguinaldo '+fmt(tt.aguinaldo):'')));
        jTot.appendChild(el('div',{style:'font-weight:700;color:#0B9EDA;margin-top:4px'},'Total bruto '+fmt(tt.totalBruto)));
        jTot.appendChild(el('div',{style:'font-weight:700;color:'+(tt.juanDS>=0?'#3D8A32':'#A32D2D')},'Juan DS (a favor de la empresa) '+fmt(tt.juanDS)));
        // DS pendiente: descontar transferencias internas — detalle por transferencia
        var transItems2 = ingresosPF.filter(function(i){ return i.mes_id===m.id && i.categoria==='Transferencia interna'; });
        var transI2 = transItems2.reduce(function(s,i){ return s+Number(i.monto); },0);
        var dsPend2 = tt.juanDS - transI2;
        var dsPendAbs2 = Math.round(Math.abs(dsPend2)*100)/100;
        // Sueldo depositado
        var sueldoDep2 = Number((ge('jpf-juan_sueldo')?gv('jpf-juan_sueldo'):null)||tt.juanSueldo||0);
        if (transI2 > 0 || tt.juanDS > 0) {
          var dsLine2 = el('div',{style:'margin-top:6px;padding-top:6px;border-top:1px solid #E2E8F0;font-size:12px'});
          // Sueldo bruto y depositado
          dsLine2.appendChild(el('div',{style:'display:flex;justify-content:space-between;color:#64748B;margin-bottom:2px'},
            [el('span',{},'Sueldo bruto'), el('span',{style:'font-weight:500'},fmt(tt.totalBruto))]));
          dsLine2.appendChild(el('div',{style:'display:flex;justify-content:space-between;color:#64748B;margin-bottom:6px'},
            [el('span',{},'Sueldo depositado'), el('span',{style:'font-weight:500;color:#0B9EDA'},fmt(sueldoDep2))]));
          // Detalle transferencias internas
          if (transItems2.length > 0) {
            dsLine2.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px'},'Transferencias internas'));
            transItems2.forEach(function(ti) {
              dsLine2.appendChild(el('div',{style:'display:flex;justify-content:space-between;color:#64748B;margin-bottom:2px'},
                [el('span',{},ti.concepto||'Transferencia'), el('span',{style:'font-weight:500;color:#E53E3E'},fmt(Number(ti.monto)))]));
            });
            dsLine2.appendChild(el('div',{style:'display:flex;justify-content:space-between;color:#64748B;margin-top:4px;padding-top:4px;border-top:.5px solid #E2E8F0'},
              [el('span',{style:'font-weight:600'},'Total transferido'), el('span',{style:'font-weight:700;color:#E53E3E'},fmt(transI2))]));
          }
          // Saldo final
          if (dsPendAbs2 > 0) {
            dsLine2.appendChild(el('div',{style:'display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid #E2E8F0'},
              [el('span',{style:'font-weight:600;font-size:13px'},'Saldo'),
               el('span',{style:'font-weight:700;font-size:13px;color:'+(dsPend2>0?'#3D8A32':'#E53E3E')},fmt(dsPend2)+(dsPend2>0?' a cobrar':' a favor empresa'))]));
          }
          jTot.appendChild(dsLine2);
        }
      }
      function leerDraftJuan() {
        var d = {};
        jFieldNames.forEach(function(f){ d[f] = Number(gv('jpf-'+f)||0); });
        return d;
      }
      function actualizarPreviewJuan() { pintarTotalesJuan(calcJuanTotalsPF(leerDraftJuan(), m.month)); }
      pintarTotalesJuan(t);
      jCard.appendChild(jTot);
      var btnGuardarJuan = el('button',{class:'btn btnp',style:'margin-top:10px'},'Guardar liquidacion');
      btnGuardarJuan.onclick = function() {
        var body = leerDraftJuan();
        var upsert = j.mes_id ? dbUpdCol('panel_pf_liquidacion_juan', 'mes_id', j.mes_id, body) :
          dbIns('panel_pf_liquidacion_juan', Object.assign({mes_id:m.id}, body));
        upsert.then(function(){
          Object.assign(j, body, {mes_id:m.id});
          if (!juanPF.includes(j)) juanPF.push(j);
          renderAll();
        });
      };
      jCard.appendChild(btnGuardarJuan);
      content.appendChild(jCard);

      // Otros ingresos
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Otros ingresos del mes'));
      var btnN=el('button',{class:'btn btnp'},'+ Nuevo ingreso');
      btnN.onclick=function(){ mNuevoIngresoPF(m.id, function(nuevo){ ingresosPF.push(nuevo); renderAll(); avisoIngresoPF(nuevo); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      var card=el('div',{class:'card',style:'overflow-x:auto'});
      var tbl=el('table',{class:'tbl'});
      tbl.appendChild(elH('thead',{},'<tr><th>Concepto</th><th>Categoria</th><th>Monto</th><th></th></tr>'));
      var tb=el('tbody',{});

      var trN = el('tr',{style:'background:#F8FAFC'});
      trN.appendChild(el('td',{style:'font-weight:500'},'🏢 QP C&IA'));
      trN.appendChild(el('td',{},[chipClass('Negocio','cb')]));
      var tdQP = el('td',{style:'font-weight:500;color:#0B9EDA'});
      tdQP.appendChild(document.createTextNode('$'+Math.round(cobradoReal).toLocaleString('es-AR')));
      var aCobrarNeg = cobrosPendientes.reduce(function(s,c){ return s+Number(c.monto); },0);
      if (aCobrarNeg > 0) {
        var subAC = el('div',{style:'font-size:11px;color:#EF9F27;margin-top:2px;font-weight:400'});
        subAC.textContent = '+ $'+Math.round(aCobrarNeg).toLocaleString('es-AR')+' por cobrar';
        tdQP.appendChild(subAC);
      }
      trN.appendChild(tdQP);
      trN.appendChild(el('td',{style:'font-size:10px;color:#94a3b8'},'Se modifica desde Negocio → Cobros'));
      tb.appendChild(trN);

      // Fila Música
      var musicaMes = musicaPF.filter(function(x){ return x.mes_id===m.id; });
      var musicaSaldo = musicaMes.reduce(function(s,x){ return s+Number(x.cobrado||0)-Number(x.nianera||0); }, 0);
      var trMus = el('tr',{style:'background:#F8FAFC'});
      trMus.appendChild(el('td',{style:'font-weight:500'},'🎵 Música'));
      trMus.appendChild(el('td',{},[chipClass('Música','cb')]));
      var tdMusMonto = el('td',{style:'font-weight:500;color:#0B9EDA'});
      tdMusMonto.textContent = '$'+Math.round(musicaSaldo).toLocaleString('es-AR');
      if (musicaMes.length) {
        var det = el('div',{style:'font-size:11px;color:#94A3B8;margin-top:2px'});
        det.textContent = musicaMes.length+' fecha'+(musicaMes.length!==1?'s':'')+' · Cobrado $'+Math.round(musicaMes.reduce(function(s,x){return s+Number(x.cobrado||0);},0)).toLocaleString('es-AR')+' · Niñera $'+Math.round(musicaMes.reduce(function(s,x){return s+Number(x.nianera||0);},0)).toLocaleString('es-AR');
        tdMusMonto.appendChild(det);
      }
      trMus.appendChild(tdMusMonto);
      var btnMus = el('button',{class:'btn btnsm'},'Editar');
      btnMus.onclick = function(){ mEditarMusicaPF(m.id, musicaMes, function(nueva){ musicaPF = musicaPF.filter(function(x){ return x.mes_id!==m.id; }).concat(nueva); renderAll(); }); };
      trMus.appendChild(el('td',{},[btnMus]));
      tb.appendChild(trMus);

      otros.forEach(function(i){
        var tr=el('tr',{});
        tr.appendChild(el('td',{style:'font-weight:500'},i.concepto));
        tr.appendChild(el('td',{},[chipClass(i.categoria,'cb')]));
        tr.appendChild(el('td',{style:'font-weight:500;color:#3D8A32'},'$'+Number(i.monto).toLocaleString('es-AR')));
        var btnE=el('button',{class:'btn btnsm'},'Editar');
        (function(ii){ btnE.onclick=function(){ mEditarIngresoPF(ii,function(patch){ Object.assign(ii, patch); renderAll(); }); }; })(i);
        var btnD=el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
        (function(iid){ btnD.onclick=function(){
          if (!confirm('Eliminar este ingreso?')) return;
          sbFetch('panel_pf_ingresos?id=eq.'+iid,{method:'DELETE',prefer:'return=minimal'}).then(function(){
            var idx = ingresosPF.findIndex(function(x){ return x.id===iid; });
            if (idx>=0) ingresosPF.splice(idx,1);
            renderAll();
          });
        }; })(i.id);
        tr.appendChild(el('td',{style:'white-space:nowrap'},[btnE,btnD]));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl);
      content.appendChild(card);
    }

    function mNuevoIngresoPF(mesId, cb) {
      openM(makeModal('Nuevo ingreso', function(body) {
        addFg(body, 'Concepto', mkInput('nipf-conc','text','','Ej: AUH, Alimentos, Musica'));
        mkRow2(body, mkFg('Categoria', mkSelect('nipf-cat',[['AUH','AUH'],['Alimentos','Alimentos'],['Otros','Otros'],['Inversiones','Inversiones'],['Transferencia interna','Transferencia interna']],'Otros')), mkFg('Monto ($)', mkInput('nipf-monto','number','0')));
        addFg(body, 'Fecha', mkInput('nipf-fecha','date',new Date().toISOString().slice(0,10)));
        if (cuentasPF.length) addFg(body, '¿A qué cuenta entró?', selCuentaPF('nipf-cuenta', cuentaDefaultIngresoPF()));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var conc = gv('nipf-conc').trim(); if (!conc) { alert('Concepto obligatorio'); return; }
          dbIns('panel_pf_ingresos', Object.assign({mes_id:mesId, concepto:conc, categoria:gv('nipf-cat'), monto:Number(gv('nipf-monto')||0), fecha:gv('nipf-fecha')||null}, cuentasPF.length ? {cuenta_id:gv('nipf-cuenta')||null} : {}))
            .then(function(r){ closeM(); cb((r&&r[0])||null); });
        };
        foot.appendChild(ok);
      }));
    }
    function mEditarMusicaPF(mesId, filas, cb) {
      openM(makeModal('Música — fechas del mes', function(body) {
        var rows = filas.slice();
        var container = el('div',{});
        function renderFilas() {
          container.innerHTML = '';
          rows.forEach(function(f, idx) {
            var wrap = el('div',{style:'background:#F8FAFC;border-radius:8px;padding:10px 12px;margin-bottom:8px;border:0.5px solid #E2E8F0'});
            mkRow2(wrap, mkFg('Fecha', mkInput('mus-fecha-'+idx,'date',f.fecha||'')), mkFg('Lugar', mkInput('mus-desc-'+idx,'text',f.descripcion||'')));
            mkRow2(wrap, mkFg('Cobrado ($)', mkInput('mus-cob-'+idx,'number',f.cobrado||0)), mkFg('Niñera ($)', mkInput('mus-nia-'+idx,'number',f.nianera||0)));
            var btnDel = el('button',{class:'btn btnsm',style:'margin-top:6px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'Eliminar');
            (function(i){ btnDel.onclick=function(){ rows.splice(i,1); renderFilas(); }; })(idx);
            wrap.appendChild(btnDel);
            container.appendChild(wrap);
          });
          var btnAdd = el('button',{class:'btn btnsm',style:'margin-top:4px'},'+ Agregar fecha');
          btnAdd.onclick = function(){ rows.push({mes_id:mesId,fecha:'',descripcion:'',cobrado:0,nianera:0}); renderFilas(); };
          container.appendChild(btnAdd);
        }
        renderFilas();
        body.appendChild(container);
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button',{class:'btn btnp'},'Guardar');
        ok.onclick = function() {
          var n = document.querySelectorAll('[id^="mus-fecha-"]').length;
          var toSave = [];
          for (var i=0;i<n;i++) toSave.push({mes_id:mesId,fecha:gv('mus-fecha-'+i)||null,descripcion:gv('mus-desc-'+i)||null,cobrado:Number(gv('mus-cob-'+i)||0),nianera:Number(gv('mus-nia-'+i)||0)});
          sbFetch('panel_pf_musica?mes_id=eq.'+mesId,{method:'DELETE',prefer:'return=minimal'}).then(function(){
            if (!toSave.length){ closeM(); cb([]); return; }
            Promise.all(toSave.map(function(row){ return dbIns('panel_pf_musica',row); })).then(function(res){ closeM(); cb(res.map(function(r){ return r[0]; }).filter(Boolean)); });
          });
        };
        foot.appendChild(ok);
      }));
    }

    function mEditarIngresoPF(i, cb) {
      openM(makeModal('Editar ingreso', function(body) {
        addFg(body, 'Concepto', mkInput('eipf-conc','text',i.concepto));
        mkRow2(body, mkFg('Categoria', mkSelect('eipf-cat',[['AUH','AUH'],['Alimentos','Alimentos'],['Otros','Otros'],['Inversiones','Inversiones'],['Transferencia interna','Transferencia interna']],i.categoria||'Otros')), mkFg('Monto ($)', mkInput('eipf-monto','number',i.monto||0)));
        addFg(body, 'Fecha', mkInput('eipf-fecha','date',i.fecha?i.fecha.slice(0,10):''));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var body2 = {concepto:gv('eipf-conc'), categoria:gv('eipf-cat'), monto:Number(gv('eipf-monto')||0), fecha:gv('eipf-fecha')||null};
          dbUpd('panel_pf_ingresos', i.id, body2)
            .then(function(){ closeM(); cb(body2); });
        };
        foot.appendChild(ok);
      }));
    }

    var PF_CAT_ICON = {'Créditos':'💳','Tarjetas':'💰','Personal':'👤','Servicios':'🔌','Educación':'📚','Supermercado':'🛒','Transporte':'🚗','Ocio':'🎭','Salud':'💊','Ropa':'👗','Varios':'📦','Ajuste':'⚖️'};
    var PF_BUDGET_CATS = ['Supermercado','Transporte','Ocio','Salud','Ropa','Servicios','Educación','Tarjetas','Varios'];
    // GASTO_GRUPOS_PF movido arriba
    // Total (ARS) de un modulo en un mes dado, asignando cada gasto al PRIMER grupo que matchee (igual que al listar)
    function totalesModulosPF(mesId) {
      var mesObj = mesesPF.find(function(mm){ return mm.id===mesId; });
      var tcMes = tcDeMes(mesObj);
      var grupos = agruparGastosPF(gastosPF.filter(function(g){ return g.mes_id===mesId; }));
      var out = {};
      grupos.forEach(function(gr){ out[gr.nombre] = gr.items.reduce(function(s,g){ return s + Number(g.monto||0) + Number(g.monto_usd||0) * tcMes; }, 0); });
      return out;
    }

    function renderGastosPF() {
      content.appendChild(mesSelectorPF());
      var m = getMesPF(mesSeleccionadoPF);
      if (!m) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay meses cargados')])); return; }
      var gMes = gastosPF.filter(function(g){ return g.mes_id===m.id; });
      var totalMes = gMes.reduce(function(s,g){ return s+Number(g.monto||0); }, 0);
      var totalMesUSD = gMes.reduce(function(s,g){ return s+Number(g.monto_usd||0); }, 0);
      var negocioMes = gastoNegocioMesPF(m.id);

      var resCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px;display:flex;gap:24px;flex-wrap:wrap'});
      var rc1=el('div',{}); rc1.appendChild(el('div',{class:'st'},'Total gastado del mes (ARS)')); rc1.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#A32D2D'},'$'+Math.round(totalMes).toLocaleString('es-AR')));
      resCard.appendChild(rc1);
      if (totalMesUSD > 0) {
        var rc2=el('div',{}); rc2.appendChild(el('div',{class:'st'},'Total gastado del mes (USD)')); rc2.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#A32D2D'},fmtMon(totalMesUSD,'USD')));
        resCard.appendChild(rc2);
      }
      if (negocioMes.ars>0 || negocioMes.usd>0) {
        var rc3=el('div',{}); rc3.appendChild(el('div',{class:'st'},'🏢 Gastos negocio (plata personal)'));
        var rc3v = [fmt(negocioMes.ars)]; if (negocioMes.usd>0) rc3v.push(fmtMon(negocioMes.usd,'USD'));
        rc3.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#854F0B'},rc3v.join(' + ')));
        resCard.appendChild(rc3);
      }
      // Cierre de mes: congela la cotización USD del mes
      var rcCierre = el('div',{style:'margin-left:auto;align-self:center'});
      if (m.cerrado) {
        rcCierre.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#3D8A32;background:#EDF7EA;border-radius:20px;padding:5px 12px'},'🔒 Mes cerrado — TC $'+Math.round(Number(m.tc_usd||0)).toLocaleString('es-AR')));
        var btnReabrir = el('button',{class:'btn btnsm',style:'margin-top:4px;display:block;margin-left:auto'},'Reabrir');
        btnReabrir.onclick = function(){
          if (!confirm('Reabrir '+MESES_CORTOS[m.month-1]+' '+m.year+'? La cotización volverá a ser la del día.')) return;
          dbUpd('panel_pf_meses', m.id, {cerrado:false, tc_usd:null}).then(function(){ m.cerrado=false; m.tc_usd=null; renderAll(); });
        };
        rcCierre.appendChild(btnReabrir);
      } else {
        var btnCerrar = el('button',{class:'btn btnsm'},'🔒 Cerrar mes (TC $'+Math.round(tcUSD).toLocaleString('es-AR')+')');
        btnCerrar.onclick = function(){
          if (!confirm('Cerrar '+MESES_CORTOS[m.month-1]+' '+m.year+'? Se congela la cotización USD en $'+Math.round(tcUSD).toLocaleString('es-AR')+' para este mes.')) return;
          dbUpd('panel_pf_meses', m.id, {cerrado:true, tc_usd:tcUSD}).then(function(){ m.cerrado=true; m.tc_usd=tcUSD; renderAll(); });
        };
        rcCierre.appendChild(btnCerrar);
      }
      resCard.appendChild(rcCierre);
      content.appendChild(resCard);

      // Evolucion por modulo (ultimos 6 meses), con flecha de avance/retroceso vs mes anterior
      var idxMesEv = mesesPF.findIndex(function(mm){ return mm.id===m.id; });
      var ultimosMesesEv = mesesPF.slice(Math.max(0, idxMesEv-5), idxMesEv+1);
      if (ultimosMesesEv.length > 1) {
        var totalesPorMes = ultimosMesesEv.map(function(mm){ return {mes:mm, tot:totalesModulosPF(mm.id)}; });
        var evCard = el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
        evCard.appendChild(el('div',{class:'st',style:'margin-bottom:12px'},'Evolucion por modulo (ultimos '+ultimosMesesEv.length+' meses) — USD convertidos a ARS'));
        GASTO_GRUPOS_PF.forEach(function(grupo) {
          var serie = totalesPorMes.map(function(x){ return x.tot[grupo.nombre]||0; });
          if (!serie.some(function(v){ return v>0; })) return; // sin datos en ningun mes, no mostrar fila
          var actual = serie[serie.length-1], anterior = serie.length>1 ? serie[serie.length-2] : null;
          var maxV = Math.max.apply(null, serie) || 1;
          var row = el('div',{style:'margin-bottom:14px'});
          var rowHead = el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:5px'});
          rowHead.appendChild(el('span',{style:'font-size:12px;font-weight:500;color:#334155'}, grupo.nombre));
          var cambioTxt = '';
          if (anterior !== null) {
            if (anterior === 0 && actual > 0) cambioTxt = '(nuevo)';
            else if (anterior > 0) {
              var pctCambio = ((actual-anterior)/anterior*100);
              cambioTxt = (pctCambio>=0?'▲ +':'▼ ')+Math.round(pctCambio)+'%';
            }
          }
          var colorCambio = (anterior!==null && actual>anterior) ? '#A32D2D' : (anterior!==null && actual<anterior) ? '#3D8A32' : '#94a3b8';
          rowHead.appendChild(el('span',{style:'font-size:11px;font-weight:600;color:'+colorCambio}, fmt(actual)+(cambioTxt?'  '+cambioTxt:'')));
          row.appendChild(rowHead);
          function abrevAR(v) {
            if (v >= 1000000) return '$' + (v/1000000).toFixed(1).replace('.', ',').replace(',0','') + 'M';
            if (v >= 1000) return '$' + Math.round(v/1000) + 'k';
            return v > 0 ? '$' + Math.round(v) : '';
          }
          var barsRow = el('div',{style:'display:flex;gap:4px;align-items:flex-end;height:44px'});
          serie.forEach(function(v, idx) {
            var h = Math.max(2, Math.round(v/maxV*28));
            var esUltimo = idx === serie.length-1;
            var bar = el('div',{style:'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:44px'});
            bar.appendChild(el('div',{style:'font-size:9px;color:'+(esUltimo?'#0B9EDA':'#94a3b8')+';font-weight:'+(esUltimo?'600':'400')+';white-space:nowrap;margin-bottom:2px'}, abrevAR(v)));
            bar.appendChild(el('div',{style:'width:100%;border-radius:3px 3px 0 0;background:'+(esUltimo?'#0B9EDA':'#CBD5E1')+';height:'+h+'px'}));
            barsRow.appendChild(bar);
          });
          row.appendChild(barsRow);
          var lblRow = el('div',{style:'display:flex;gap:4px;margin-top:3px'});
          ultimosMesesEv.forEach(function(mm) {
            lblRow.appendChild(el('div',{style:'flex:1;text-align:center;font-size:9px;color:#94a3b8'}, MESES_CORTOS[mm.month-1]));
          });
          row.appendChild(lblRow);
          evCard.appendChild(row);
        });
        content.appendChild(evCard);
      }

      // Presupuesto: barras por categoria (solo pesos, los limites estan en ARS)
      var budget = {}; presupuestoPF.forEach(function(p){ budget[p.categoria] = Number(p.limite); });
      if (Object.keys(budget).length) {
        var bCard = el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
        bCard.appendChild(el('div',{class:'st',style:'margin-bottom:10px'},'Presupuesto del mes'));
        PF_BUDGET_CATS.forEach(function(cat) {
          var limit = budget[cat]; if (!limit) return;
          var spent = gMes.filter(function(g){ return g.categoria===cat; }).reduce(function(s,g){ return s+Number(g.monto||0); }, 0);
          var pct = Math.min(100, spent/limit*100);
          var over = spent > limit;
          var row = el('div',{style:'margin-bottom:10px'});
          var rowH = el('div',{style:'display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px'});
          rowH.appendChild(el('span',{},(PF_CAT_ICON[cat]||'')+' '+cat));
          rowH.appendChild(el('span',{style:'color:'+(over?'#A32D2D':'#64748B')},'$'+Math.round(spent).toLocaleString('es-AR')+' / $'+Math.round(limit).toLocaleString('es-AR')));
          row.appendChild(rowH);
          var bar = el('div',{style:'background:#F1F5F9;border-radius:4px;height:6px'});
          bar.appendChild(el('div',{style:'height:6px;border-radius:4px;background:'+(over?'#A32D2D':pct>75?'#E8A030':'#5BBD4E')+';width:'+pct+'%'}));
          row.appendChild(bar);
          bCard.appendChild(row);
        });
        content.appendChild(bCard);
      }
      var btnPresup = el('button', {class:'btn btnsm', style:'margin-bottom:14px'}, 'Configurar presupuesto');
      btnPresup.onclick = function(){ mPresupuestoPF(function(nuevoBudget){ presupuestoPF = nuevoBudget; renderAll(); }); };
      content.appendChild(btnPresup);

      // Card Daiana
      var d = daianaPF.find(function(x){ return x.mes_id===m.id; }) || {};
      var sueldoDai = getDaianaSueldoPF(d);
      var dCard = el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
      dCard.appendChild(el('div',{class:'st',style:'margin-bottom:10px'},'Sueldo Daiana (horas × precio/hora)'));
      var dRow = el('div',{class:'r2'});
      var horasInp = mkInput('dpf-horas','number',d.horas||'');
      var precioInp = mkInput('dpf-precio','number',d.precio_hora||'');
      var dSueldoPreview = el('div',{style:'font-size:13px;margin-top:6px'});
      function pintarSueldoDaiPreview() {
        var h = Number(horasInp.value)||0, p = Number(precioInp.value)||0;
        var s = (h&&p) ? h*p : (d.sueldo_hist||0);
        dSueldoPreview.innerHTML = '';
        dSueldoPreview.appendChild(document.createTextNode('Sueldo calculado: '));
        dSueldoPreview.appendChild(el('b',{},fmt(s)));
        return s;
      }
      horasInp.oninput = pintarSueldoDaiPreview; precioInp.oninput = pintarSueldoDaiPreview;
      dRow.appendChild(mkFg('Horas', horasInp)); dRow.appendChild(mkFg('Precio/hora ($)', precioInp));
      dCard.appendChild(dRow);
      pintarSueldoDaiPreview();
      dCard.appendChild(dSueldoPreview);
      var btnGuardarDai = el('button',{class:'btn btnsm',style:'margin-top:8px'},'Guardar horas/precio');
      btnGuardarDai.onclick = function() {
        var body = {horas:Number(horasInp.value)||null, precio_hora:Number(precioInp.value)||null};
        var p = d.mes_id ? dbUpd('panel_pf_daiana', d.mes_id, body) : dbIns('panel_pf_daiana', Object.assign({mes_id:m.id}, body));
        p.then(function(){
          Object.assign(d, body, {mes_id:m.id});
          if (!daianaPF.includes(d)) daianaPF.push(d);
          renderAll();
        });
      };
      dCard.appendChild(btnGuardarDai);
      var btnApply = el('button',{class:'btn btns',style:'margin-top:8px;margin-left:6px'},'Aplicar como gasto del mes');
      btnApply.onclick = function() {
        var sueldoActual = pintarSueldoDaiPreview();
        var existente = gMes.find(function(g){ return g.concepto==='Daiana Soledad'; });
        var body = {mes_id:m.id, concepto:'Daiana Soledad', monto:sueldoActual, categoria:'Personal', tipo:'fijos', fecha:m.year+'-'+String(m.month).padStart(2,'0')+'-01', pagado:false};
        var p = existente ? dbUpd('panel_pf_gastos', existente.id, body) : dbIns('panel_pf_gastos', body);
        p.then(function(r){
          if (existente) Object.assign(existente, body);
          else gastosPF.push((r&&r[0])||Object.assign({id:'tmp-'+Date.now()}, body));
          renderAll();
        });
      };
      dCard.appendChild(btnApply);
      content.appendChild(dCard);

      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Gastos del mes ('+gMes.length+')'));
      var btnN=el('button',{class:'btn btnp'},'+ Nuevo gasto');
      btnN.onclick=function(){ mNuevoGastoPF(m, function(nuevo){ gastosPF.push(nuevo); renderAll(); avisoAsesorPF(nuevo); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      if (!gMes.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin gastos este mes')])); return; }

      function tablaGastosPF(lista) {
        var card=el('div',{class:'card',style:'overflow-x:auto'});
        var tbl=el('table',{class:'tbl'});
        var ordenPF = _finUIState.ordenGastosPF || 'monto';
        var thFecha = '<th style="cursor:pointer" id="th-gpf-fecha">Fecha'+(ordenPF==='fecha'?' ▾':'')+'</th>';
        var thMonto = '<th style="cursor:pointer" id="th-gpf-monto">Monto'+(ordenPF==='monto'?' ▾':'')+'</th>';
        tbl.appendChild(elH('thead',{},'<tr><th>Concepto</th><th>Categoria</th><th>Tipo</th>'+thMonto+thFecha+'<th>Pagado</th><th></th></tr>'));
        var thM = tbl.querySelector('#th-gpf-monto'), thF = tbl.querySelector('#th-gpf-fecha');
        if (thM) thM.onclick = function(){ _finUIState.ordenGastosPF='monto'; renderAll(); };
        if (thF) thF.onclick = function(){ _finUIState.ordenGastosPF='fecha'; renderAll(); };
        var tb=el('tbody',{});
        var listaOrd = lista.slice().sort(function(a,b){
          if (ordenPF === 'fecha') {
            var fa=a.fecha||'', fb=b.fecha||'';
            if (fa===fb) return Number(b.monto)-Number(a.monto);
            return fa<fb?-1:1;
          }
          return Number(b.monto)-Number(a.monto);
        });
        listaOrd.forEach(function(g){
          var tr=el('tr',{});
          var tieneNegocio = Number(g.monto_negocio)>0 || Number(g.monto_usd_negocio)>0;
          tr.appendChild(el('td',{style:'font-weight:500'},(PF_CAT_ICON[g.categoria]||'')+' '+g.concepto+(tieneNegocio?' 🏢':'')));
          tr.appendChild(el('td',{},[chipClass(g.categoria,'cgr')]));
          tr.appendChild(el('td',{style:'font-size:11px;color:#94a3b8'},g.tipo));
          var tdMonto = el('td',{style:'font-weight:500;color:#A32D2D'});
          var partes = [];
          if (Number(g.monto)>0) partes.push(fmt(g.monto));
          if (Number(g.monto_usd)>0) partes.push(fmtMon(g.monto_usd,'USD'));
          tdMonto.textContent = partes.length ? partes.join(' + ') : fmt(0);
          if (tieneNegocio) {
            var partesNeg = [];
            if (Number(g.monto_negocio)>0) partesNeg.push(fmt(g.monto_negocio));
            if (Number(g.monto_usd_negocio)>0) partesNeg.push(fmtMon(g.monto_usd_negocio,'USD'));
            tdMonto.appendChild(el('div',{style:'font-size:10px;color:#854F0B;font-weight:500'},'🏢 '+partesNeg.join(' + ')+' negocio'));
          }
          tr.appendChild(tdMonto);
          if (!g.pagado && entregadoPF(g) > 0) {
            tdMonto.appendChild(el('div',{style:'font-size:10px;color:#0B9EDA;font-weight:600'},'entregado '+fmt(entregadoPF(g))));
            tdMonto.appendChild(el('div',{style:'font-size:10px;color:#854F0B'},'falta '+fmt(saldoPF(g))));
          }
          if (!g.pagado && entregadoUSDPF(g) > 0) {
            tdMonto.appendChild(el('div',{style:'font-size:10px;color:#0B9EDA;font-weight:600'},'entregado '+fmtMon(entregadoUSDPF(g),'USD')));
            tdMonto.appendChild(el('div',{style:'font-size:10px;color:#854F0B'},'falta '+fmtMon(saldoUSDPF(g),'USD')));
          }
          tr.appendChild(el('td',{style:'font-size:12px;color:#64748B;white-space:nowrap'}, g.fecha ? fdate(g.fecha) : '—'));
          var tog=el('label',{class:'tog'});
          var inp=el('input',{type:'checkbox'}); if (g.pagado) inp.checked=true;
          (function(gg){ inp.onchange=function(){
            var checked=this.checked;
            if (checked && cuentasPF.length) { this.checked = false; mMarcarPagadoPF(gg, function(){ renderAll(); }); return; }
            var patchP = {pagado:checked}; if (cuentasPF.length && !checked) { patchP.pagado_at = null; patchP.cuenta_id = null; }
            dbUpd('panel_pf_gastos',gg.id,patchP).then(function(){ gg.pagado=checked; if (!checked) { gg.pagado_at=null; gg.cuenta_id=null; } return sincPagoPrestamoPF(gg, checked); }).then(function(){ if (gg.prestamo_id || cuentasPF.length) renderAll(); }).catch(function(e){ alert('Error: '+e.message); });
          }; })(g);
          tog.appendChild(inp); tog.appendChild(el('span',{class:'sl'}));
          tr.appendChild(el('td',{},[tog]));
          var btnPg=null;
          if (!g.pagado && (Number(g.monto)>0 || usdTotalPF(g)>0)) {
            btnPg=el('button',{class:'btn btnsm btnp'},'$');
            (function(gg){ btnPg.onclick=function(){ mEntregaPF(gg); }; })(g);
          }
          var btnE=el('button',{class:'btn btnsm'},'Editar');
          (function(gg){ btnE.onclick=function(){ mEditarGastoPF(gg,function(patch){ Object.assign(gg, patch); renderAll(); }); }; })(g);
          var btnD=el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
          (function(gid){ btnD.onclick=function(){
            if (!confirm('Eliminar este gasto?')) return;
            sbFetch('panel_pf_gastos?id=eq.'+gid,{method:'DELETE',prefer:'return=minimal'}).then(function(){
              var idx = gastosPF.findIndex(function(x){ return x.id===gid; });
              if (idx>=0) gastosPF.splice(idx,1);
              renderAll();
            });
          }; })(g.id);
          var accPF=[]; if (btnPg) accPF.push(btnPg); accPF.push(btnE); accPF.push(btnD);
          var tdAccPF=el('td',{style:'white-space:nowrap'});
          accPF.forEach(function(b,i){ if(i>0) tdAccPF.appendChild(document.createTextNode(' ')); tdAccPF.appendChild(b); });
          tr.appendChild(tdAccPF);
          tb.appendChild(tr);
        });
        tbl.appendChild(tb); card.appendChild(tbl);
        return card;
      }

      // Modal de entregas parciales de un gasto PF (tarjeta, Daiana, etc.)
      function mEntregaPF(g) {
        var hayARS = Number(g.monto||0) > 0, hayUSD = usdTotalPF(g) > 0;
        function monedaSel() { var e = document.getElementById('epf-mon'); return e ? e.value : (hayARS ? 'ARS' : 'USD'); }
        function saldoDe(mon) { return mon==='USD' ? saldoUSDPF(g) : saldoPF(g); }
        function fmtM(n, mon) { return mon==='USD' ? fmtMon(n,'USD') : fmt(n); }
        openM(makeModal('Entregas — ' + g.concepto, function(body) {
          if (hayARS) {
            var resumen = el('div',{style:'display:flex;gap:14px;margin:4px 0 6px;font-size:12px'});
            resumen.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Total $: '), el('b',{},fmt(g.monto))]));
            resumen.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Entregado: '), el('b',{style:'color:#0B9EDA'},fmt(entregadoPF(g)))]));
            resumen.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Falta: '), el('b',{style:'color:#854F0B'},fmt(saldoPF(g)))]));
            body.appendChild(resumen);
          }
          if (hayUSD) {
            var resumenU = el('div',{style:'display:flex;gap:14px;margin:4px 0 12px;font-size:12px'});
            resumenU.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Total USD: '), el('b',{},fmtMon(usdTotalPF(g),'USD'))]));
            resumenU.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Entregado: '), el('b',{style:'color:#0B9EDA'},fmtMon(entregadoUSDPF(g),'USD'))]));
            resumenU.appendChild(el('div',{},[el('span',{style:'color:#94a3b8'},'Falta: '), el('b',{style:'color:#854F0B'},fmtMon(saldoUSDPF(g),'USD'))]));
            body.appendChild(resumenU);
          }
          if ((g._entregas||[]).length) {
            var hist = el('div',{style:'background:#F8FAFC;border-radius:8px;padding:8px 10px;margin-bottom:12px;font-size:11px'});
            hist.appendChild(el('div',{style:'font-weight:600;color:#64748b;margin-bottom:4px'},'Entregas'));
            g._entregas.forEach(function(e2){
              var fila = el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:2px 0'});
              fila.appendChild(el('span',{style:'color:#94a3b8'}, fdate(e2.fecha) + (e2.notas?' — '+e2.notas:'')));
              var der = el('span',{});
              der.appendChild(el('b',{}, fmtM(e2.monto, e2.moneda==='USD'?'USD':'ARS')));
              var bx = el('button',{class:'btn btnsm',style:'margin-left:6px;padding:1px 6px;font-size:10px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'x');
              (function(eid){ bx.onclick = function(){
                if (!confirm('Eliminar esta entrega?')) return;
                sbFetch('panel_pf_entregas?id=eq.'+eid,{method:'DELETE',prefer:'return=minimal'}).then(function(){
                  var ix = g._entregas.findIndex(function(x){ return x.id===eid; });
                  if (ix>=0) g._entregas.splice(ix,1);
                  closeM(); renderAll(); mEntregaPF(g);
                });
              }; })(e2.id);
              der.appendChild(bx);
              fila.appendChild(der);
              hist.appendChild(fila);
            });
            body.appendChild(hist);
          }
          var inicial = hayARS ? 'ARS' : 'USD';
          if (hayARS && hayUSD) {
            var selMon = mkSelect('epf-mon', [['ARS','Pesos (ARS)'],['USD','Dolares (USD)']], 'ARS');
            selMon.onchange = function(){ var m = document.getElementById('epf-monto'); if (m) m.value = saldoDe(this.value); };
            addFg(body, 'Moneda de la entrega', selMon);
          }
          mkRow2(body,
            mkFg('Monto de la entrega', mkInput('epf-monto','number',saldoDe(inicial))),
            mkFg('Fecha', mkInput('epf-fecha','date',new Date().toISOString().slice(0,10)))
          );
          addFg(body, 'Nota (opcional)', mkInput('epf-notas','text','','ej: primera entrega, efectivo'));
          if (cuentasPF.length) addFg(body, '¿De qué cuenta sale?', selCuentaPF('epf-cuenta', (inicial==='USD' && !hayARS ? (cuentaUsdPF()||cuentaDefaultIngresoPF()) : cuentaDefaultIngresoPF())));
        }, function(foot) {
          foot.appendChild(cancelBtn());
          var ok = el('button',{class:'btn btnp'},'Registrar entrega');
          ok.onclick = function() {
            var mon = monedaSel();
            var saldo = saldoDe(mon);
            var monto = Number(gv('epf-monto')||0);
            var fecha = gv('epf-fecha');
            if (!monto || monto<=0) { alert('Ingresa un monto válido'); return; }
            if (monto > saldo + 0.01) { alert('La entrega supera lo que falta ('+fmtM(saldo,mon)+')'); return; }
            if (!fecha) { alert('Ingresa la fecha'); return; }
            ok.disabled = true; ok.textContent = 'Guardando...';
            var rowIns = {gasto_id: g.id, monto: monto, fecha: fecha, notas: gv('epf-notas')||null};
            var ctaE = cuentasPF.length ? (gv('epf-cuenta')||null) : null;
            if (cuentasPF.length) { rowIns.cuenta_id = ctaE; recordarCuentaPF(g.concepto, ctaE); }
            if (mon==='USD') rowIns.moneda = 'USD'; // las ARS no mandan moneda (default ARS)
            dbIns('panel_pf_entregas', rowIns)
            .then(function(rows){
              g._entregas = (g._entregas||[]).concat(rows && rows[0] ? [rows[0]] : [{monto:monto,fecha:fecha,moneda:(mon==='USD'?'USD':undefined)}]);
              // Pagado al cubrir TODAS las monedas del gasto
              var completo = (!hayARS || entregadoPF(g) >= Number(g.monto||0) - 0.01) && (!hayUSD || entregadoUSDPF(g) >= usdTotalPF(g) - 0.01);
              var fin = completo ? dbUpd('panel_pf_gastos', g.id, (cuentasPF.length ? {pagado:true, pagado_at:new Date().toISOString(), cuenta_id:ctaE} : {pagado:true})).then(function(){ g.pagado=true; if (cuentasPF.length) { g.pagado_at=new Date().toISOString(); g.cuenta_id=ctaE; } return sincPagoPrestamoPF(g, true, fecha); }) : Promise.resolve();
              return fin.then(function(){ closeM(); renderAll(); });
            })
            .catch(function(e){ ok.disabled=false; ok.textContent='Registrar entrega'; alert('Error: '+e.message+(mon==='USD'?'\n\nSi dice que no existe la columna "moneda", falta correr el SQL de panel_pf_entregas.':'')); });
          };
          foot.appendChild(ok);
        }));
      }

      var restantes = gMes.slice();
      GASTO_GRUPOS_PF.forEach(function(grupo) {
        var deEsteGrupo = restantes.filter(grupo.match);
        restantes = restantes.filter(function(g){ return !grupo.match(g); });
        if (!deEsteGrupo.length) return;
        var subtotal = deEsteGrupo.reduce(function(s,g){ return s+Number(g.monto||0); }, 0);
        var subtotalUSD = deEsteGrupo.reduce(function(s,g){ return s+Number(g.monto_usd||0); }, 0);
        var negAls = deEsteGrupo.reduce(function(s,g){ return s+Number(g.monto_negocio||0); }, 0);
        var negUsd = deEsteGrupo.reduce(function(s,g){ return s+Number(g.monto_usd_negocio||0); }, 0);
        var ghead = el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px'});
        ghead.appendChild(el('div',{style:'font-size:13px;font-weight:600;color:#334155'}, grupo.nombre + ' (' + deEsteGrupo.length + ')'));
        var ghr = el('div',{style:'font-size:13px;font-weight:600;color:#64748B'}, fmt(subtotal) + (subtotalUSD>0?' + '+fmtMon(subtotalUSD,'USD'):''));
        ghead.appendChild(ghr);
        content.appendChild(ghead);
        if (negAls>0 || negUsd>0) {
          content.appendChild(el('div',{style:'font-size:11px;color:#854F0B;margin:-4px 0 8px'},
            '🏢 Ademas, '+fmt(negAls)+(negUsd>0?' + '+fmtMon(negUsd,'USD'):'')+' de plata del negocio (no es tuyo, ya esta afuera de tu balance personal).'));
        }
        content.appendChild(tablaGastosPF(deEsteGrupo));
      });
    }

    function mNuevoGastoPF(m, cb) {
      openM(makeModal('Nuevo gasto', function(body) {
        addFg(body, 'Concepto', mkInput('ngpf-conc','text','','Ej: Visa BNA, Luz, Claude'));
        mkRow2(body,
          mkFg('Categoria', mkSelect('ngpf-cat', PF_BUDGET_CATS.concat(['Créditos','Personal','Ajuste','Pedrito']).map(function(c){return [c,c];}), 'Varios')),
          mkFg('Tipo', mkSelect('ngpf-tipo',[['fijos','Fijo'],['varios','Varios'],['tarjeta','Tarjeta'],['ajuste','Ajuste']],'varios'))
        );
        body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;margin-top:10px;margin-bottom:4px'},'¿De donde sale la plata? Podes repartir el mismo gasto entre las 4 billeteras si corresponde.'));
        mkRow2(body, mkFg('Pesos personal (ARS)', mkInput('ngpf-monto','number','0')), mkFg('Pesos negocio (ARS)', mkInput('ngpf-montoneg','number','')));
        mkRow2(body, mkFg('USD personal', mkInput('ngpf-montousd','number','')), mkFg('USD negocio', mkInput('ngpf-montousdneg','number','')));
        addFg(body, 'Fecha', mkInput('ngpf-fecha','date',m.year+'-'+String(m.month).padStart(2,'0')+'-01'));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var conc = gv('ngpf-conc').trim(); if (!conc) { alert('Concepto obligatorio'); return; }
          var montoArs = Number(gv('ngpf-monto')||0), montoUsd = Number(gv('ngpf-montousd')||0);
          var montoArsNeg = Number(gv('ngpf-montoneg')||0), montoUsdNeg = Number(gv('ngpf-montousdneg')||0);
          if (!montoArs && !montoUsd && !montoArsNeg && !montoUsdNeg) { alert('Cargá al menos un monto en alguna de las 4 billeteras'); return; }
          dbIns('panel_pf_gastos', {mes_id:m.id, concepto:conc, categoria:gv('ngpf-cat'), tipo:gv('ngpf-tipo'), monto:montoArs, monto_usd:montoUsd, monto_negocio:montoArsNeg, monto_usd_negocio:montoUsdNeg, fecha:gv('ngpf-fecha')||null, pagado:false})
            .then(function(r){ closeM(); cb((r&&r[0])||null); });
        };
        foot.appendChild(ok);
      }));
    }
    function mEditarGastoPF(g, cb) {
      openM(makeModal('Editar: '+g.concepto, function(body) {
        addFg(body, 'Concepto', mkInput('egpf-conc','text',g.concepto));
        mkRow2(body,
          mkFg('Categoria', mkSelect('egpf-cat', PF_BUDGET_CATS.concat(['Créditos','Personal','Ajuste','Pedrito']).map(function(c){return [c,c];}), g.categoria||'Varios')),
          mkFg('Tipo', mkSelect('egpf-tipo',[['fijos','Fijo'],['varios','Varios'],['tarjeta','Tarjeta'],['ajuste','Ajuste']],g.tipo||'varios'))
        );
        body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;margin-top:10px;margin-bottom:4px'},'¿De donde sale la plata? Podes repartir el mismo gasto entre las 4 billeteras si corresponde.'));
        mkRow2(body, mkFg('Pesos personal (ARS)', mkInput('egpf-monto','number',g.monto||0)), mkFg('Pesos negocio (ARS)', mkInput('egpf-montoneg','number',g.monto_negocio||'')));
        mkRow2(body, mkFg('USD personal', mkInput('egpf-montousd','number',g.monto_usd||'')), mkFg('USD negocio', mkInput('egpf-montousdneg','number',g.monto_usd_negocio||'')));
        addFg(body, 'Fecha', mkInput('egpf-fecha','date',g.fecha?g.fecha.slice(0,10):''));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var body2 = {concepto:gv('egpf-conc'), categoria:gv('egpf-cat'), tipo:gv('egpf-tipo'), monto:Number(gv('egpf-monto')||0), monto_usd:Number(gv('egpf-montousd')||0), monto_negocio:Number(gv('egpf-montoneg')||0), monto_usd_negocio:Number(gv('egpf-montousdneg')||0), fecha:gv('egpf-fecha')||null};
          ok.disabled = true; ok.textContent = 'Guardando...';
          dbUpd('panel_pf_gastos', g.id, body2)
            .then(function(){ closeM(); cb(body2); })
            .catch(function(e){ ok.disabled = false; ok.textContent = 'Guardar'; alert('No se pudo guardar: ' + e.message); });
        };
        foot.appendChild(ok);
      }));
    }
    function mPresupuestoPF(cb) {
      var budget = {}; presupuestoPF.forEach(function(p){ budget[p.categoria] = Number(p.limite); });
      openM(makeModal('Presupuesto por categoria', function(body) {
        PF_BUDGET_CATS.forEach(function(cat) {
          addFg(body, (PF_CAT_ICON[cat]||'')+' '+cat, mkInput('bpf-'+cat,'number',budget[cat]||'','Sin limite'));
        });
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var nuevo = PF_BUDGET_CATS.map(function(cat) { return {categoria:cat, limite:Number(gv('bpf-'+cat)||0)}; });
          Promise.all(nuevo.map(function(row) {
            return sbFetch('panel_pf_presupuesto', {method:'POST', prefer:'resolution=merge-duplicates,return=minimal', body:row});
          })).then(function(){ closeM(); cb(nuevo); });
        };
        foot.appendChild(ok);
      }));
    }


    function fmtMon(n, moneda) {
      n = Number(n)||0;
      if (moneda==='USD') return 'USD '+n.toLocaleString('en-US',{minimumFractionDigits:0, maximumFractionDigits:2});
      return fmt(n);
    }
    function pagosDePrestamoPF(p) {
      return prestamosPagosPF.filter(function(pg){ return pg.prestamo_id===p.id; }).sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
    }
    function pagadoPrestamoPF(p) {
      return pagosDePrestamoPF(p).filter(function(pg){ return pg.cuenta_para_saldo!==false; }).reduce(function(s,pg){ return s+Number(pg.monto); }, 0);
    }

    // Gasto vinculado a un prestamo: al marcarlo pagado se crea el pago del prestamo (descuenta el saldo);
    // al desmarcarlo se borra. Asi un pago "programado" avisa como un vencimiento y no descuenta antes de tiempo.
    function sincPagoPrestamoPF(g, pagado, fecha) {
      if (!g || !g.prestamo_id) return Promise.resolve();
      var pr = prestamosPF.find(function(x){ return x.id===g.prestamo_id; });
      if (!pr) return Promise.resolve();
      var ex = prestamosPagosPF.find(function(pg){ return pg.gasto_id===g.id; });
      if (pagado && !ex) {
        var usd = pr.moneda==='USD';
        var monto = usd ? Number(g.prestamo_monto||0) : Number(g.monto||0);
        if (!(monto>0)) return Promise.resolve();
        var row = {prestamo_id:pr.id, monto:monto, fecha:fecha||new Date().toISOString().slice(0,10), cuenta_para_saldo:true, gasto_id:g.id};
        if (usd && Number(g.monto)>0) row.tc = Math.round(Number(g.monto)/monto*100)/100;
        return dbIns('panel_pf_prestamos_pagos', row).then(function(r){
          if (r && r[0]) prestamosPagosPF.push(r[0]);
          if (pr.activo && Number(pr.monto_total)-pagadoPrestamoPF(pr) <= 0.01) { pr.activo=false; dbUpd('panel_pf_prestamos', pr.id, {activo:false}); }
        });
      }
      if (!pagado && ex) {
        return sbFetch('panel_pf_prestamos_pagos?id=eq.'+ex.id,{method:'DELETE',prefer:'return=minimal'}).then(function(){
          var ix = prestamosPagosPF.indexOf(ex); if (ix>=0) prestamosPagosPF.splice(ix,1);
          if (!pr.activo && Number(pr.monto_total)-pagadoPrestamoPF(pr) > 0.01) { pr.activo=true; dbUpd('panel_pf_prestamos', pr.id, {activo:true}); }
        });
      }
      return Promise.resolve();
    }

    function renderPrestamosPF() {
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Prestamos (monto total + pagos parciales)'));
      var btnN=el('button',{class:'btn btnp'},'+ Nuevo prestamo');
      btnN.onclick=function(){ mNuevoPrestamoPF(function(nuevo){ prestamosPF.push(nuevo); renderAll(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      var activos = prestamosPF.filter(function(p){ return p.activo; });
      var saldoARS = activos.filter(function(p){ return p.moneda!=='USD'; }).reduce(function(s,p){ return s + Math.max(0, Number(p.monto_total) - pagadoPrestamoPF(p)); }, 0);
      var saldoUSD = activos.filter(function(p){ return p.moneda==='USD'; }).reduce(function(s,p){ return s + Math.max(0, Number(p.monto_total) - pagadoPrestamoPF(p)); }, 0);
      var resCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px;display:flex;gap:24px;flex-wrap:wrap'});
      var c1=el('div',{}); c1.appendChild(el('div',{class:'st'},'Saldo adeudado (ARS)')); c1.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#A32D2D'},fmt(saldoARS)));
      var c2=el('div',{}); c2.appendChild(el('div',{class:'st'},'Saldo adeudado (USD)')); c2.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#A32D2D'},fmtMon(saldoUSD,'USD')));
      resCard.appendChild(c1); resCard.appendChild(c2);
      content.appendChild(resCard);

      if (!prestamosPF.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin prestamos cargados')])); return; }

      prestamosPF.forEach(function(p) {
        var pagado = pagadoPrestamoPF(p);
        var saldo = Math.max(0, Number(p.monto_total) - pagado);
        var pct = Number(p.monto_total) > 0 ? Math.min(100, pagado/Number(p.monto_total)*100) : 0;
        var card = el('div',{class:'card',style:'padding:16px;margin-bottom:12px'+(p.activo?'':';opacity:.55')});
        var head = el('div',{style:'display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap'});
        var left = el('div',{});
        left.appendChild(el('div',{style:'font-weight:600;font-size:14px'}, p.nombre + (p.activo?'':' (saldado)') + ' · '+(p.moneda||'ARS')));
        left.appendChild(el('div',{style:'font-size:12px;color:#64748B;margin-top:2px'}, fmtMon(pagado,p.moneda)+' pagado de '+fmtMon(p.monto_total,p.moneda)+(p.fecha?' · al '+fdate(p.fecha):'')));
        head.appendChild(left);
        var right = el('div',{style:'display:flex;gap:6px;flex-shrink:0'});
        var btnPago = el('button',{class:'btn btns btnsm'},'+ Registrar / programar pago');
        btnPago.onclick = function(){ mPagoPrestamoPF(p, function(nuevoPago, nuevoGasto){
          if (nuevoPago) prestamosPagosPF.push(nuevoPago);
          if (nuevoGasto) gastosPF.push(nuevoGasto);
          if (nuevoGasto && !nuevoGasto._entregas) nuevoGasto._entregas = [];
          if (nuevoPago && saldo - Number(nuevoPago.monto) <= 0.01) { p.activo = false; dbUpd('panel_pf_prestamos', p.id, {activo:false}); }
          renderAll();
          if (nuevoGasto && !nuevoGasto.pagado) avisoAsesorPF(nuevoGasto);
        }); };
        right.appendChild(btnPago);
        var btnH = el('button',{class:'btn btnsm'},'Historial');
        btnH.onclick = function(){ mHistorialPrestamoPF(p); };
        right.appendChild(btnH);
        var btnE = el('button',{class:'btn btnsm'},'Editar');
        btnE.onclick = function(){ mEditarPrestamoPF(p, function(patch){ Object.assign(p, patch); renderAll(); }); };
        right.appendChild(btnE);
        var btnD = el('button',{class:'btn btnsm',style:'background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
        btnD.onclick = function(){
          if (!confirm('Eliminar este prestamo y todo su historial de pagos?')) return;
          sbFetch('panel_pf_prestamos?id=eq.'+p.id,{method:'DELETE',prefer:'return=minimal'}).then(function(){
            var idx = prestamosPF.indexOf(p); if (idx>=0) prestamosPF.splice(idx,1);
            renderAll();
          });
        };
        right.appendChild(btnD);
        head.appendChild(right);
        card.appendChild(head);
        var bar = el('div',{style:'background:#F1F5F9;border-radius:4px;height:6px;margin-top:10px'});
        bar.appendChild(el('div',{style:'height:6px;border-radius:4px;background:'+(saldo<=0?'#5BBD4E':'#0B9EDA')+';width:'+pct+'%'}));
        card.appendChild(bar);
        card.appendChild(el('div',{style:'font-size:11px;color:#64748B;margin-top:4px'}, saldo>0 ? 'Saldo: '+fmtMon(saldo,p.moneda) : 'Pagado en su totalidad'));
        var pend = gastosPF.filter(function(g){ return g.prestamo_id===p.id && !g.pagado; }).sort(function(x,y){ return String(x.fecha||'').localeCompare(String(y.fecha||'')); });
        if (pend.length) {
          card.appendChild(el('div',{style:'font-weight:600;font-size:12px;color:#854F0B;margin:12px 0 4px'},'Pagos programados (pendientes)'));
          pend.forEach(function(g) {
            var f = el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;padding:6px 0;border-top:1px solid #F1F5F9'});
            var usdG = p.moneda==='USD' && Number(g.prestamo_monto||0)>0;
            f.appendChild(el('span',{}, (g.fecha ? fdate(g.fecha) : 'sin fecha')+' · '+(usdG ? fmtMon(g.prestamo_monto,'USD')+(Number(g.monto)>0 ? ' (≈ '+fmt(g.monto)+')' : '') : fmt(g.monto))));
            var bP = el('button',{class:'btn btnp btnsm'},'Marcar pagado');
            bP.onclick = function(){ mMarcarPagadoPF(g, function(){ renderAll(); }); };
            f.appendChild(bP); card.appendChild(f);
          });
        }
        if (p.notas) card.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-top:4px;white-space:pre-wrap'}, p.notas));
        content.appendChild(card);
      });
    }

    function mNuevoPrestamoPF(cb) {
      openM(makeModal('Nuevo prestamo', function(body) {
        addFg(body, 'Nombre', mkInput('npr-nom','text','','Ej: Prestamo Gustavo Rejas'));
        mkRow2(body, mkFg('Monto total', mkInput('npr-monto','number','0')), mkFg('Moneda', mkSelect('npr-mon',[['ARS','Pesos (ARS)'],['USD','Dolares (USD)']],'ARS')));
        mkRow2(body, mkFg('Fecha', mkInput('npr-fecha','date',new Date().toISOString().slice(0,10))), el('div',{}));
        addFg(body, 'Notas', mkInput('npr-notas','text',''));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var nom = gv('npr-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
          dbIns('panel_pf_prestamos', {nombre:nom, monto_total:Number(gv('npr-monto')||0), moneda:gv('npr-mon'), fecha:gv('npr-fecha')||null, notas:gv('npr-notas')||null, activo:true})
            .then(function(r){ closeM(); cb((r&&r[0])||null); });
        };
        foot.appendChild(ok);
      }));
    }
    function mEditarPrestamoPF(p, cb) {
      openM(makeModal('Editar prestamo', function(body) {
        addFg(body, 'Nombre', mkInput('epr-nom','text',p.nombre));
        mkRow2(body, mkFg('Monto total', mkInput('epr-monto','number',p.monto_total||0)), mkFg('Moneda', mkSelect('epr-mon',[['ARS','Pesos (ARS)'],['USD','Dolares (USD)']],p.moneda||'ARS')));
        mkRow2(body, mkFg('Fecha', mkInput('epr-fecha','date',p.fecha?p.fecha.slice(0,10):'')), mkFg('Estado', mkSelect('epr-activo',[['true','Activo'],['false','Saldado']],p.activo?'true':'false')));
        addFg(body, 'Notas', mkInput('epr-notas','text',p.notas||''));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var body2 = {nombre:gv('epr-nom'), monto_total:Number(gv('epr-monto')||0), moneda:gv('epr-mon'), fecha:gv('epr-fecha')||null, notas:gv('epr-notas')||null, activo:gv('epr-activo')==='true'};
          dbUpd('panel_pf_prestamos', p.id, body2).then(function(){ closeM(); cb(body2); });
        };
        foot.appendChild(ok);
      }));
    }
    function mPagoPrestamoPF(p, cb) {
      var saldo = Math.max(0, Number(p.monto_total) - pagadoPrestamoPF(p));
      var esUSD = p.moneda==='USD';
      var tcDef = Math.round(tcUSD);
      var mMes = esUSD ? /USD\s*([0-9]+)\s*x\s*mes/i.exec(p.notas||'') : null;
      var montoDef = mMes ? Number(mMes[1]) : saldo;
      openM(makeModal('Registrar pago — '+p.nombre, function(body) {
        body.appendChild(el('div',{class:'ibox'}, 'Saldo actual: '+fmtMon(saldo,p.moneda)));
        var selEst = mkSelect('pgp-est', [['pagado','Ya lo pagué'],['programado','Programar: avisarme (no descuenta hasta marcarlo pagado)']], 'pagado');
        addFg(body, 'Estado', selEst);
        var hint = el('div',{style:'font-size:11px;color:#94a3b8;margin:-4px 0 10px;line-height:1.4'});
        function pintarHint() {
          var prog = gv('pgp-est')==='programado';
          hint.textContent = prog
            ? 'Queda como gasto pendiente en ese mes, con su vencimiento, como cualquier otro. Recién descuenta del préstamo cuando lo marcás pagado.'
            : 'Se descuenta del préstamo ahora y queda como gasto pagado en el mes elegido.';
        }
        selEst.onchange = pintarHint; pintarHint();
        var montoInp = mkInput('pgp-monto','number',montoDef);
        mkRow2(body, mkFg('Monto'+(esUSD?' (USD)':''), montoInp), mkFg('Fecha (pago o vencimiento)', mkInput('pgp-fecha','date',new Date().toISOString().slice(0,10))));
        if (esUSD) {
          var tcInp = mkInput('pgp-tc','number',tcDef);
          addFg(body, 'Precio del dólar ($ por USD) — al que los compraste, o estimado si lo programás', tcInp);
          var totBox = el('div',{style:'font-size:12px;color:#1a2e4a;font-weight:600;margin:-4px 0 10px'});
          function pintarTot() { totBox.textContent = 'En pesos: ' + fmt(Math.round(Number(gv('pgp-monto')||montoDef) * Number(gv('pgp-tc')||tcDef))); }
          body.appendChild(totBox);
          tcInp.oninput = pintarTot; montoInp.oninput = pintarTot;
          pintarTot();
          body.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin:-4px 0 10px'},'El gasto del mes queda en pesos (USD x precio) y el préstamo descuenta los USD.'));
        }
        addFg(body, 'Mes (para que cuente como gasto de ese mes)', mkSelect('pgp-mes', mesesPF.map(function(mm){ return [mm.id, MESES[mm.month-1]+' '+mm.year]; }), mesSeleccionadoPF));
        addFg(body, 'Notas', mkInput('pgp-notas','text',''));
        if (cuentasPF.length) addFg(body, '¿De qué cuenta sale? (solo si ya lo pagaste)', selCuentaPF('pgp-cuenta', esUSD ? (cuentaUsdPF() || cuentaDefaultIngresoPF()) : cuentaDefaultIngresoPF()));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var monto = Number(gv('pgp-monto')||0); if (monto<=0) { alert('Monto invalido'); return; }
          var fecha = gv('pgp-fecha')||null, notas = gv('pgp-notas')||null;
          var prog = gv('pgp-est')==='programado';
          var mesId = gv('pgp-mes');
          var tc = esUSD ? Number(gv('pgp-tc')||0) : 0;
          if (esUSD && !(tc>0)) { alert('Ingresá el precio del dólar'); return; }
          var gastoBody = {mes_id:mesId, categoria:'Créditos', tipo:'varios', fecha:fecha, prestamo_id:p.id, pagado:!prog};
          if (cuentasPF.length && !prog) { gastoBody.cuenta_id = gv('pgp-cuenta')||null; gastoBody.pagado_at = new Date().toISOString(); recordarCuentaPF(p.nombre, gastoBody.cuenta_id); }
          if (esUSD) { gastoBody.concepto = p.nombre+' (USD '+monto+')'; gastoBody.monto = Math.round(monto*tc); gastoBody.prestamo_monto = monto; }
          else { gastoBody.concepto = p.nombre; gastoBody.monto = monto; }
          ok.disabled = true; ok.textContent = 'Guardando...';
          dbIns('panel_pf_gastos', gastoBody).then(function(rg) {
            var gastoRow = (rg&&rg[0])||null;
            if (prog) { closeM(); cb(null, gastoRow); return; }
            var rowPago = {prestamo_id:p.id, monto:monto, fecha:fecha, cuenta_para_saldo:true, notas:notas, gasto_id:gastoRow?gastoRow.id:null};
            if (esUSD) rowPago.tc = tc;
            return dbIns('panel_pf_prestamos_pagos', rowPago).then(function(rp){ closeM(); cb((rp&&rp[0])||null, gastoRow); });
          }).catch(function(e){ ok.disabled=false; ok.textContent='Guardar'; alert('Error: '+e.message+'\n\nSi dice que no existe la columna "tc" o "prestamo_monto", falta correr el SQL de préstamos.'); });
        };
        foot.appendChild(ok);
      }));
    }
    function mHistorialPrestamoPF(p) {
      var pagos = pagosDePrestamoPF(p);
      openM(makeModal('Historial — '+p.nombre, function(body) {
        if (!pagos.length) { body.appendChild(el('div',{class:'emp'},'Sin pagos registrados')); return; }
        pagos.forEach(function(pg) {
          var row = el('div',{style:'display:flex;justify-content:space-between;padding:8px 0;border-bottom:.5px solid #F1F5F9;font-size:13px'});
          var l = el('div',{});
          l.appendChild(el('div',{},fdate(pg.fecha)));
          if (pg.notas) l.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},pg.notas + (pg.cuenta_para_saldo===false?' (historico, no descuenta del saldo)':'')));
          else if (pg.cuenta_para_saldo===false) l.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},'Historico, no descuenta del saldo'));
          row.appendChild(l);
          var derH = el('div',{style:'text-align:right'});
          derH.appendChild(el('div',{style:'font-weight:600'}, fmtMon(pg.monto,p.moneda)));
          if (pg.tc) derH.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'}, 'a '+fmt(pg.tc)+' = '+fmt(Math.round(Number(pg.monto)*Number(pg.tc)))));
          row.appendChild(derH);
          body.appendChild(row);
        });
      }, function(foot) {
        var cerrar = el('button', {class:'btn btnp'}, 'Cerrar');
        cerrar.onclick = function(){ closeM(); };
        foot.appendChild(cerrar);
      }));
    }

    function renderAutoPF() {
      var vehiculo = (autoPF[0]||{}).vehiculo || 'Clio 1.2 Autentic KVN902';
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Auto — '+vehiculo));
      var btnN=el('button',{class:'btn btnp'},'+ Nuevo registro');
      btnN.onclick=function(){ mNuevoAutoPF(vehiculo, function(nuevo){ autoPF.push(nuevo); renderAll(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      var totalGastado = autoPF.reduce(function(s,a){ return s+Number(a.costo||0); }, 0);
      var ultimoKm = autoPF.filter(function(a){ return a.kms; }).map(function(a){ return Number(a.kms); }).sort(function(a,b){return b-a;})[0]||0;
      var resCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px;display:flex;gap:24px;flex-wrap:wrap'});
      var c1=el('div',{}); c1.appendChild(el('div',{class:'st'},'Ultimo km registrado')); c1.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#0B9EDA'},ultimoKm.toLocaleString('es-AR')+' km'));
      var c2=el('div',{}); c2.appendChild(el('div',{class:'st'},'Total gastado en mantenimiento')); c2.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#A32D2D'},fmt(totalGastado)));
      resCard.appendChild(c1); resCard.appendChild(c2);
      content.appendChild(resCard);

      if (!autoPF.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin registros')])); return; }
      var card=el('div',{class:'card',style:'overflow-x:auto'});
      var tbl=el('table',{class:'tbl'});
      tbl.appendChild(elH('thead',{},'<tr><th>Kms</th><th>Fecha</th><th>Descripcion</th><th>Costo</th><th></th></tr>'));
      var tb=el('tbody',{});
      autoPF.slice().sort(function(a,b){ return (Number(b.kms)||0)-(Number(a.kms)||0) || (b.fecha||'').localeCompare(a.fecha||''); }).forEach(function(a) {
        var tr=el('tr',{});
        tr.appendChild(el('td',{},a.kms?Number(a.kms).toLocaleString('es-AR'):'-'));
        tr.appendChild(el('td',{},a.fecha?fdate(a.fecha):'-'));
        tr.appendChild(el('td',{style:'font-weight:500'},a.descripcion));
        tr.appendChild(el('td',{style:'font-weight:500'}, a.costo>0?fmt(a.costo):'-'));
        var btnE=el('button',{class:'btn btnsm'},'Editar');
        (function(aa){ btnE.onclick=function(){ mEditarAutoPF(aa,function(patch){ Object.assign(aa, patch); renderAll(); }); }; })(a);
        var btnD=el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
        (function(aid){ btnD.onclick=function(){
          if (!confirm('Eliminar este registro?')) return;
          sbFetch('panel_pf_auto_registros?id=eq.'+aid,{method:'DELETE',prefer:'return=minimal'}).then(function(){
            var idx = autoPF.findIndex(function(x){ return x.id===aid; });
            if (idx>=0) autoPF.splice(idx,1);
            renderAll();
          });
        }; })(a.id);
        tr.appendChild(el('td',{style:'white-space:nowrap'},[btnE,btnD]));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl);
      content.appendChild(card);
    }
    function mNuevoAutoPF(vehiculo, cb) {
      openM(makeModal('Nuevo registro — '+vehiculo, function(body) {
        mkRow2(body, mkFg('Kms', mkInput('nau-kms','number','')), mkFg('Fecha', mkInput('nau-fecha','date',new Date().toISOString().slice(0,10))));
        addFg(body, 'Descripcion', mkInput('nau-desc','text','','Ej: Cambio de aceite y filtros'));
        addFg(body, 'Costo ($)', mkInput('nau-costo','number','0'));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var desc = gv('nau-desc').trim(); if (!desc) { alert('Descripcion obligatoria'); return; }
          dbIns('panel_pf_auto_registros', {vehiculo:vehiculo, kms:gv('nau-kms')?Number(gv('nau-kms')):null, fecha:gv('nau-fecha')||null, descripcion:desc, costo:Number(gv('nau-costo')||0)})
            .then(function(r){ closeM(); cb((r&&r[0])||null); });
        };
        foot.appendChild(ok);
      }));
    }
    function mEditarAutoPF(a, cb) {
      openM(makeModal('Editar registro', function(body) {
        mkRow2(body, mkFg('Kms', mkInput('eau-kms','number',a.kms||'')), mkFg('Fecha', mkInput('eau-fecha','date',a.fecha?a.fecha.slice(0,10):'')));
        addFg(body, 'Descripcion', mkInput('eau-desc','text',a.descripcion));
        addFg(body, 'Costo ($)', mkInput('eau-costo','number',a.costo||0));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var body2 = {kms:gv('eau-kms')?Number(gv('eau-kms')):null, fecha:gv('eau-fecha')||null, descripcion:gv('eau-desc'), costo:Number(gv('eau-costo')||0)};
          dbUpd('panel_pf_auto_registros', a.id, body2).then(function(){ closeM(); cb(body2); });
        };
        foot.appendChild(ok);
      }));
    }

    function renderDeudasPF() {
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Deudas a cobrar'));
      var btnN=el('button',{class:'btn btnp'},'+ Nueva deuda');
      btnN.onclick=function(){ mNuevaDeudaPF(function(nueva){ deudasPF.push(nueva); renderAll(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      var totalPend = deudasPF.filter(function(d){ return d.estado==='pendiente'; }).reduce(function(s,d){ return s+Number(d.monto); }, 0);
      var resCard=el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
      var rr=el('div',{style:'display:flex;justify-content:space-between;align-items:center'});
      rr.appendChild(el('div',{class:'st'},'Total pendiente de cobro'));
      rr.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#854F0B'},'$'+Math.round(totalPend).toLocaleString('es-AR')));
      resCard.appendChild(rr);
      content.appendChild(resCard);

      if (!deudasPF.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin deudas registradas')])); return; }
      var ESTADO_CHIP = {pendiente:'ca', cobrado:'cg', dudoso:'cb', incobrable:'cr'};
      var card=el('div',{class:'card',style:'overflow-x:auto'});
      var tbl=el('table',{class:'tbl'});
      tbl.appendChild(elH('thead',{},'<tr><th>Nombre</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr>'));
      var tb=el('tbody',{});
      deudasPF.forEach(function(d){
        var tr=el('tr',{});
        tr.appendChild(el('td',{style:'font-weight:500'},d.nombre));
        tr.appendChild(el('td',{style:'font-size:12px;color:#64748B'},d.concepto||'-'));
        tr.appendChild(el('td',{style:'font-weight:500'},'$'+Number(d.monto).toLocaleString('es-AR')));
        tr.appendChild(el('td',{},fdate(d.fecha)));
        tr.appendChild(el('td',{},[chipClass(d.estado,ESTADO_CHIP[d.estado]||'cgr')]));
        var btnM=el('button',{class:'btn btnsm'},'Movimientos');
        (function(dd){ btnM.onclick=function(){ mMovimientosDeudaPF(dd, function(nuevoSaldo){ dd.monto = nuevoSaldo; renderAll(); }); }; })(d);
        var btnE=el('button',{class:'btn btnsm',style:'margin-left:4px'},'Editar');
        (function(dd){ btnE.onclick=function(){ mEditarDeudaPF(dd,function(patch){ Object.assign(dd, patch); renderAll(); }); }; })(d);
        var btnD=el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
        (function(did){ btnD.onclick=function(){
          if (!confirm('Eliminar esta deuda?')) return;
          sbFetch('panel_pf_deudas?id=eq.'+did,{method:'DELETE',prefer:'return=minimal'}).then(function(){
            var idx = deudasPF.findIndex(function(x){ return x.id===did; });
            if (idx>=0) deudasPF.splice(idx,1);
            renderAll();
          });
        }; })(d.id);
        tr.appendChild(el('td',{style:'white-space:nowrap'},[btnM,btnE,btnD]));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl);
      content.appendChild(card);
    }

    function movimientosDeDeudaPF(d) {
      return deudasMovsPF.filter(function(m){ return m.deuda_id===d.id; }).sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
    }
    function mMovimientosDeudaPF(d, cb) {
      function refrescar() { closeM(); mMovimientosDeudaPF(d, cb); }
      var movs = movimientosDeDeudaPF(d);
      openM(makeModal('Movimientos — '+d.nombre, function(body) {
        body.appendChild(el('div',{class:'ibox'}, 'Saldo actual: $'+Number(d.monto).toLocaleString('es-AR')));
        if (movs.length) {
          var hist = el('div',{style:'max-height:280px;overflow-y:auto;margin-bottom:14px'});
          movs.forEach(function(m) {
            var row = el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:.5px solid #F1F5F9;font-size:13px'});
            var l = el('div',{}); l.appendChild(el('div',{},m.concepto)); l.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},fdate(m.fecha)));
            row.appendChild(l);
            var right = el('div',{style:'display:flex;align-items:center;gap:6px;flex-shrink:0'});
            right.appendChild(el('div',{style:'font-weight:600;color:'+(Number(m.monto)>=0?'#A32D2D':'#3D8A32')}, (Number(m.monto)>=0?'+':'')+'$'+Number(m.monto).toLocaleString('es-AR')));
            var btnEm = el('button',{class:'btn btnsm',style:'padding:2px 8px;font-size:11px'},'Editar');
            (function(mm){ btnEm.onclick = function(){ mEditarMovimientoDeudaPF(d, mm, refrescar); }; })(m);
            right.appendChild(btnEm);
            var btnXm = el('button',{class:'btn btnsm',style:'padding:2px 8px;font-size:11px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
            (function(mm){ btnXm.onclick = function(){
              if (!confirm('Eliminar este movimiento? El saldo se va a recalcular.')) return;
              sbFetch('panel_pf_deudas_movimientos?id=eq.'+mm.id,{method:'DELETE',prefer:'return=minimal'}).then(function() {
                var idx = deudasMovsPF.findIndex(function(x){ return x.id===mm.id; });
                if (idx>=0) deudasMovsPF.splice(idx,1);
                var nuevoSaldo = Number(d.monto) - Number(mm.monto);
                dbUpd('panel_pf_deudas', d.id, {monto:nuevoSaldo}).then(function(){ d.monto = nuevoSaldo; refrescar(); });
              });
            }; })(m);
            right.appendChild(btnXm);
            row.appendChild(right);
            hist.appendChild(row);
          });
          body.appendChild(hist);
        }
        body.appendChild(el('div',{style:'border-top:.5px solid #E2E8F0;margin:10px 0'}));
        addFg(body, 'Concepto', mkInput('mdv-conc','text','','Ej: Netflix, Tarjeta, Pago, Transferencia'));
        mkRow2(body,
          mkFg('Monto (+ aumenta lo que debe / − si paga)', mkInput('mdv-monto','number','')),
          mkFg('Fecha', mkInput('mdv-fecha','date',new Date().toISOString().slice(0,10)))
        );
      }, function(foot) {
        var cerrar = el('button', {class:'btn btnsm'}, 'Cerrar');
        cerrar.onclick = function(){ closeM(); cb(d.monto); };
        foot.appendChild(cerrar);
        var ok = el('button', {class:'btn btnp'}, '+ Agregar movimiento');
        ok.onclick = function() {
          var conc = gv('mdv-conc').trim(); if (!conc) { alert('Concepto obligatorio'); return; }
          var delta = Number(gv('mdv-monto')||0); if (!delta) { alert('Monto invalido'); return; }
          dbIns('panel_pf_deudas_movimientos', {deuda_id:d.id, concepto:conc, monto:delta, fecha:gv('mdv-fecha')||null})
            .then(function(r) {
              var nuevoMov = (r&&r[0])||null;
              if (nuevoMov) deudasMovsPF.push(nuevoMov);
              var nuevoSaldo = Number(d.monto) + delta;
              dbUpd('panel_pf_deudas', d.id, {monto:nuevoSaldo}).then(function() {
                d.monto = nuevoSaldo;
                refrescar();
              });
            });
        };
        foot.appendChild(ok);
      }));
    }
    function mEditarMovimientoDeudaPF(d, m, cb) {
      openM(makeModal('Editar movimiento', function(body) {
        addFg(body, 'Concepto', mkInput('emdv-conc','text',m.concepto));
        mkRow2(body,
          mkFg('Monto (+ aumenta lo que debe / − si paga)', mkInput('emdv-monto','number',m.monto)),
          mkFg('Fecha', mkInput('emdv-fecha','date',m.fecha?m.fecha.slice(0,10):''))
        );
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var nuevoDelta = Number(gv('emdv-monto')||0);
          var deltaDeCambio = nuevoDelta - Number(m.monto);
          var body2 = {concepto:gv('emdv-conc'), monto:nuevoDelta, fecha:gv('emdv-fecha')||null};
          dbUpd('panel_pf_deudas_movimientos', m.id, body2).then(function() {
            Object.assign(m, body2);
            var nuevoSaldo = Number(d.monto) + deltaDeCambio;
            dbUpd('panel_pf_deudas', d.id, {monto:nuevoSaldo}).then(function(){ d.monto = nuevoSaldo; closeM(); cb(); });
          });
        };
        foot.appendChild(ok);
      }));
    }

    function mNuevaDeudaPF(cb) {
      openM(makeModal('Nueva deuda a cobrar', function(body) {
        addFg(body, 'Nombre', mkInput('ndpf-nom','text','','Ej: Daiana Magali'));
        addFg(body, 'Concepto', mkInput('ndpf-conc','text','','Ej: Saldo deudor'));
        mkRow2(body, mkFg('Monto ($)', mkInput('ndpf-monto','number','0')), mkFg('Fecha', mkInput('ndpf-fecha','date',new Date().toISOString().slice(0,10))));
        addFg(body, 'Estado', mkSelect('ndpf-est',[['pendiente','Pendiente'],['cobrado','Cobrado'],['dudoso','Dudoso'],['incobrable','Incobrable']],'pendiente'));
        addFg(body, 'Notas', mkInput('ndpf-notas','text',''));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var nom = gv('ndpf-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
          dbIns('panel_pf_deudas', {nombre:nom, concepto:gv('ndpf-conc')||null, monto:Number(gv('ndpf-monto')||0), fecha:gv('ndpf-fecha')||null, estado:gv('ndpf-est'), notas:gv('ndpf-notas')||null})
            .then(function(r){ closeM(); cb((r&&r[0])||null); });
        };
        foot.appendChild(ok);
      }));
    }
    function mEditarDeudaPF(d, cb) {
      openM(makeModal('Editar deuda', function(body) {
        addFg(body, 'Nombre', mkInput('edpf-nom','text',d.nombre));
        addFg(body, 'Concepto', mkInput('edpf-conc','text',d.concepto||''));
        mkRow2(body, mkFg('Monto ($)', mkInput('edpf-monto','number',d.monto||0)), mkFg('Fecha', mkInput('edpf-fecha','date',d.fecha?d.fecha.slice(0,10):'')));
        addFg(body, 'Estado', mkSelect('edpf-est',[['pendiente','Pendiente'],['cobrado','Cobrado'],['dudoso','Dudoso'],['incobrable','Incobrable']],d.estado||'pendiente'));
        addFg(body, 'Notas', mkInput('edpf-notas','text',d.notas||''));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var body2 = {nombre:gv('edpf-nom'), concepto:gv('edpf-conc')||null, monto:Number(gv('edpf-monto')||0), fecha:gv('edpf-fecha')||null, estado:gv('edpf-est'), notas:gv('edpf-notas')||null};
          dbUpd('panel_pf_deudas', d.id, body2)
            .then(function(){ closeM(); cb(body2); });
        };
        foot.appendChild(ok);
      }));
    }

    // ---- ASESOR IA (Claude via Edge Function asesor-pf) ----
    // Arma el resumen del mes: pendientes con fecha, calendario de caja, tarjetas, cobros y deudas
    function datosAsesorPF(m, efectivo, diaDS) {
      var hoy = new Date();
      var hoyStr = hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'+String(hoy.getDate()).padStart(2,'0');
      var mesStr = m.year+'-'+String(m.month).padStart(2,'0');
      function aHoy(f) { return (f && f < hoyStr) ? hoyStr : f; }
      var j = juanPF.find(function(x){ return x.mes_id===m.id; })||{};
      var t = calcJuanTotalsPF(j, m.month);
      var ingMes = ingresosPF.filter(function(i){ return i.mes_id===m.id; });
      var transI = ingMes.filter(function(i){ return i.categoria==='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); },0);
      var dsPend = Math.max(0, Math.round(t.juanDS - transI));

      var usdHold = cuentasPF.length ? disponibleUsdPF() : 0;
      var pend = gastosPF.filter(function(g){ return g.mes_id===m.id && !g.pagado; }).map(function(g){
        return {concepto:g.concepto, categoria:g.categoria, fecha:g.fecha, saldo_ars:Math.round(saldoPF(g)), saldo_usd:Math.round(saldoUSDPF(g)*100)/100, prestamo_usd:Number(g.prestamo_monto||0)};
      }).filter(function(g){ return g.saldo_ars>0 || g.saldo_usd>0; });

      var ev = [];
      pend.forEach(function(g){
        var saleArs = g.saldo_ars + g.saldo_usd*tcUSD, notaUsd = '';
        if (usdHold > 0 && g.saldo_usd > 0) { var cu = Math.min(usdHold, g.saldo_usd); usdHold -= cu; saleArs -= cu*tcUSD; notaUsd = ' (USD '+cu+' cubiertos con tus dolares)'; }
        else if (usdHold > 0 && g.prestamo_usd > 0 && g.saldo_ars > 0) { var cu2 = Math.min(usdHold, g.prestamo_usd); usdHold -= cu2; saleArs = g.saldo_ars*(1 - cu2/g.prestamo_usd); notaUsd = ' (USD '+cu2+' cubiertos con tus dolares)'; }
        ev.push({fecha:aHoy(g.fecha), entra:0, sale:Math.round(Math.max(0,saleArs)), tarjeta:g.categoria==='Tarjetas', detalle:g.concepto+notaUsd});
      });
      // Pagos mensuales fijos en USD que no estan como gasto del mes (ej: Susana, "USD 400 x mes")
      prestamosPF.filter(function(p){ return p.activo && p.moneda==='USD'; }).forEach(function(p){
        var mm = /USD\s*([0-9]+)\s*x\s*mes/i.exec(p.notas||''); if(!mm) return;
        var yaPago = pagosDePrestamoPF(p).some(function(pg){ return (pg.fecha||'').slice(0,7)===mesStr; }) || gastosPF.some(function(g){ return g.mes_id===m.id && g.prestamo_id===p.id; });
        if (yaPago) return;
        var dia = (p.fecha||'').slice(8,10) || '15';
        var usdSus = Number(mm[1]), cuS = Math.min(usdHold, usdSus); usdHold -= cuS;
        ev.push({fecha:aHoy(mesStr+'-'+dia), entra:0, sale:Math.round((usdSus-cuS)*tcUSD), tarjeta:false, detalle:p.nombre+' (USD '+mm[1]+', no figura en los gastos del mes'+(cuS>0?'; USD '+cuS+' cubiertos con tus dolares':'')+')'});
      });
      // Ingresos esperados con fecha
      if (dsPend > 500) {
        var dd = Math.min(31, Math.max(1, Number(diaDS)||10));
        ev.push({fecha:aHoy(mesStr+'-'+String(dd).padStart(2,'0')), entra:dsPend, sale:0, tarjeta:false, detalle:'DS pendiente de la distri (tope: llega como maximo el dia '+dd+')'});
      }
      var finMes = mesStr+'-31';
      var porCobrar = cobrosPendientes.map(function(c){
        var venc = c.fecha_vencimiento ? c.fecha_vencimiento.slice(0,10) : null;
        var vencido = !!venc && venc < hoyStr;
        if (venc && !vencido && venc <= finMes && venc >= mesStr+'-01') {
          ev.push({fecha:venc, entra:Number(c.monto), sale:0, tarjeta:false, detalle:'Cobro: '+(c.descripcion||c.tipo_cobro||'')});
        }
        return {descripcion:c.descripcion||c.tipo_cobro, monto:Number(c.monto), vencimiento:venc, vencido:vencido};
      });

      var porFecha = {};
      ev.forEach(function(e){ var k=e.fecha||hoyStr; (porFecha[k]=porFecha[k]||[]).push(e); });
      var saldo = Number(efectivo)||0;
      var calendario = Object.keys(porFecha).sort().map(function(f){
        var entra=0, sale=0, saleTarj=0, det=[];
        porFecha[f].forEach(function(e){
          entra += e.entra;
          if (e.tarjeta) saleTarj += e.sale; else sale += e.sale;
          det.push((e.entra?'+':'-')+(e.entra||e.sale)+' '+e.detalle+(e.tarjeta?' [tarjeta, no incluida en el saldo]':''));
        });
        saldo += entra - sale;
        return {fecha:f, entra:entra, sale_sin_tarjetas:sale, sale_tarjetas:saleTarj, saldo_sin_tarjetas:Math.round(saldo), detalle:det};
      });

      return {
        hoy:hoyStr, mes:mesStr, tc_usd:tcUSD, efectivo_hoy:Number(efectivo)||0,
        ingresos_cargados_mes: ingMes.map(function(i){ return {concepto:i.concepto, categoria:i.categoria, monto:Number(i.monto), fecha:i.fecha}; }),
        liquidacion: {sueldo_bruto:Math.round(t.totalBruto), sueldo_depositado:Math.round(t.juanSueldo), ds_pendiente:dsPend, dia_tope_llegada_ds:Number(diaDS)||10, nota_ds:'El DS pendiente entra a mas tardar ese dia (peor caso). Si llega antes, Juan lo carga como Transferencia interna y el DS pendiente baja solo.'},
        gastos_pendientes: pend,
        tarjetas_pendientes: pend.filter(function(g){ return g.categoria==='Tarjetas'; }),
        calendario_caja: calendario,
        por_cobrar_negocio: porCobrar,
        deudas_a_cobrar: deudasPF.filter(function(d){ return d.estado==='pendiente'; }).map(function(d){ return {nombre:d.nombre, concepto:d.concepto, monto:Number(d.monto)}; }),
        prestamos: prestamosPF.filter(function(p){ return p.activo && !(cuentasPF.length && /descubierto/i.test(p.nombre||'')); }).map(function(p){ return {nombre:p.nombre, moneda:p.moneda, saldo:Math.max(0, Number(p.monto_total)-pagadoPrestamoPF(p)), notas:p.notas||null}; })
      };
    }

    // Texto del asesor -> nodos (sin innerHTML): **negrita**, listas "- " y titulos "#"
    function textoAsesorPF(txt) {
      var wrap = el('div',{style:'font-size:13px;color:#1a2e4a;line-height:1.6'});
      var ul = null;
      function inline(parent, str) {
        str.split(/(\*\*[^*]+\*\*)/).forEach(function(part){
          if (!part) return;
          if (part.length>4 && part.slice(0,2)==='**' && part.slice(-2)==='**') parent.appendChild(el('b',{},part.slice(2,-2)));
          else parent.appendChild(document.createTextNode(part));
        });
      }
      String(txt||'').split('\n').forEach(function(line){
        var l = line.replace(/^\s+/,'');
        var mb = /^[-•*]\s+(.*)$/.exec(l);
        var mh = /^#{1,4}\s+(.*)$/.exec(l);
        if (mb) {
          if (!ul) { ul = el('ul',{style:'margin:4px 0 8px 18px;padding:0'}); wrap.appendChild(ul); }
          var li = el('li',{style:'margin:2px 0'}); inline(li, mb[1]); ul.appendChild(li); return;
        }
        ul = null;
        if (!l.trim()) return;
        var p = el('div',{style:'margin:'+(mh?'14px 0 4px':'6px 0')+';'+(mh?'font-weight:700;font-size:14px;':'')});
        inline(p, mh ? mh[1] : l); wrap.appendChild(p);
      });
      return wrap;
    }

    // ---- GASTO RAPIDO ----
    var TIPOS_RAPIDO_PF = [
      {k:'Combustible', cat:'Transporte', ic:'⛽'},
      {k:'Súper / Despensa', cat:'Supermercado', ic:'🛒'},
      {k:'Farmacia', cat:'Salud', ic:'💊'},
      {k:'Salidas', cat:'Ocio', ic:'🎭'},
      {k:'Otro', cat:'Varios', ic:'🧾'}
    ];
    function mGastoRapidoPF() {
      var sel = TIPOS_RAPIDO_PF[0];
      openM(makeModal('⚡ Gasto rápido', function(body) {
        var chips = el('div',{style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px'});
        var btns = [];
        TIPOS_RAPIDO_PF.forEach(function(t) {
          var b = el('button',{class:'btn btnsm',type:'button'}, t.ic+' '+t.k);
          b.onclick = function(){ sel = t; pintar(); var c = document.getElementById('gr-conc'); if (c && (!c.value || btns.some(function(x){ return x.t.k===c.value; }))) c.value = t.k; };
          btns.push({b:b, t:t}); chips.appendChild(b);
        });
        function pintar() { btns.forEach(function(x){ x.b.className = 'btn btnsm' + (x.t===sel ? ' btnp' : ''); }); }
        body.appendChild(chips); pintar();
        mkRow2(body, mkFg('Concepto', mkInput('gr-conc','text',sel.k)), mkFg('Monto ($)', mkInput('gr-monto','number','','0')));
        var cuentasOk = cuentasPF.filter(function(c){ return !c.reservada && c.moneda!=='USD'; });
        if (cuentasOk.length) {
          addFg(body, '¿De qué cuenta sale?', mkSelect('gr-cuenta', cuentasOk.map(function(c){ return [c.id, etiqCtaPF(c)]; }), cuentaDefaultIngresoPF() || cuentasOk[0].id));
        }
        mkRow2(body, mkFg('Fecha', mkInput('gr-fecha','date',new Date().toISOString().slice(0,10))), mkFg('Nota (opcional)', mkInput('gr-nota','text','')));
        setTimeout(function(){ var m = document.getElementById('gr-monto'); if (m) m.focus(); }, 50);
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button',{class:'btn btnp'},'Cargar gasto');
        ok.onclick = function() {
          var monto = Number(gv('gr-monto')||0); if (!(monto>0)) { alert('Poné el monto'); return; }
          var fecha = gv('gr-fecha') || new Date().toISOString().slice(0,10);
          var conc = (gv('gr-conc')||sel.k).trim() || sel.k; var nota = gv('gr-nota').trim();
          var mm = mesesPF.find(function(x){ return x.year===Number(fecha.slice(0,4)) && x.month===Number(fecha.slice(5,7)); }) || getMesPF(mesSeleccionadoPF);
          if (!mm) { alert('No hay un mes cargado para esa fecha'); return; }
          var cid = cuentasPF.length ? (gv('gr-cuenta')||null) : null;
          var conTarjeta = (cid==='__tarjeta'); if (conTarjeta) cid = null;
          var cta = cid ? cuentasPF.find(function(c){ return c.id===cid; }) : null;
          if (cta && cta.tipo!=='tarjeta' && saldoCuentaPF(cta) - monto < 0 && saldoCuentaPF(cta) >= 0) {
            if (!confirm(etiqCtaPF(cta)+' quedaría en '+fmt(Math.round(saldoCuentaPF(cta)-monto))+'. ¿Cargarlo igual?')) return;
          }
          var iso = new Date().toISOString();
          var row = {mes_id:mm.id, concepto:conc+(nota?' — '+nota:'')+(conTarjeta?' (tarjeta)':''), monto:monto, categoria:sel.cat, tipo:'varios', fecha:fecha, pagado:!conTarjeta};
          if (cuentasPF.length && !conTarjeta) { row.pagado_at = iso; row.cuenta_id = cid; }
          ok.disabled = true; ok.textContent = 'Guardando...';
          dbIns('panel_pf_gastos', row).then(function(r){
            var g = (r&&r[0]) || row; if (!g._entregas) g._entregas = []; gastosPF.push(g);
            closeM(); renderAll();
          }).catch(function(e){ ok.disabled=false; ok.textContent='Cargar gasto'; alert('Error: '+e.message+'\n\nSi dice que no existe la columna, falta correr el SQL de cuentas.'); });
        };
        foot.appendChild(ok);
      }));
    }

    // ---- PESTAÑA CUENTAS ----
    var cuentasAbiertasPF = {};
    var LOGOS_BANCOS_PF = {NX:'data:image/png;base64,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', SA:'data:image/png;base64,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', BN:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAIAAADajyQQAAAZtklEQVR42t176ZMb15Fn5jvqBNAAuoG+m7dEkaJuazwej21NTOzasxG7X/Yf3Y3dCG9MxHocO2M7rMO2LFEHT4l9At0NNI4qVL33MufDA9DNJilSYznC6wp+YBeqXr18ef8yE5kZvuVFzI7YMRGDQAylQMSnP0l8lE1GRVk4Z5gBQCOGUlbCYDGJhHj6W8xcOCJmgSBRSIHiGet/w4X/AcKevByxJXJEzi/HYJwblaaXFSeTYlwa45xlBgCFqKVMA70QhY0krARaSwkICCARpRBKCCnwT9+S+laMImZm0FI8dsAAe8Pxdn94MMpOJsXEWOPIMRfWjUuTG1taZ4kIAAAEgBIiUDLWKg10qKRE1FJEWi1E4XIl2ahX1xcq5ygzjhBB4LdgnfpWx8AzUTkre9snw4+2Ox9tH3x2cLw9GJ7k5cRYBmBmx+yPA3j6LgLAbIsSERERINJqIQ42atVXlptvbSwz8OZC9axkzj/9XXLMbxHhsQM7zibH2WRYlMdZ/uB48NHOwe+2u593e/2TAeQlWAtevBBBiCk1OD8bBgYgAubpn0pBHNQXao/6w+44646yS81aM4mrYdBMomYSaYlzIhkA8fmMe46OMQMBOyIACKT0N0uif32w88FX+3eP+p1R1ssm+8NxZ5z3swImBTgHRJ43gAgCAf2/03MCZiCG6acZhAApIQrrSdhO45Vq2kiidiW5ulh/58LKDy+tB2Iq/KVzACCFEPAc4p7DMUSQgEIIYgYAx8zMf9zt/ur+zv+9++iP+4eH4wwsAzJIKQRyHML5D57KIZyRxinlZ44QEft50R9lX+4fg8KlNLm1slQ6txAGr6+1EFEiSkSBL8KwZxDmlQJnp+IX7U+KTw+Ovuz0vtzpvL/T+aRzfNgbwmQCgKAkBMBKSiEEIiLgTH+Y2Tiyzk35gyil1FIgohdyZmb2LoTAOigNWAfAh6X7BEAQjcf5x+vtl9qNm8uL9Sh81iZflGM8Pezpa8bRF93e/7p9//988fCo0zsxNhMIWgKE3hqAQGa2RAgAiAIAvf9hIC97M5n3bhCQiZmJ6dQ+MAiEQINSAAxa9ifFBw937+x0FtuN//zyRSXEW2ttb5M9VXye788mbP6ogOlRGEf9SXHvsP//7m//8s7Xv7u3DaMMwlBU4zjQTikAoOnRn56IIwZDQASIoGQYaC0EABiiwtiyNMBetQQK9AcBM1Z7ayMFFtaeDPOTovh6OI6EaEYhE19ZqtejUEuBZwzEkxSqpxhARGIGBAlgndsbZB/tdf7l7qMPH+5+vtMB40ArkIKIDdGMs+B3N9fpgh0YA4UBpXQYrC9Um3EEAMf55FFvYMYTsBZCDSryNslbKc8FvygREzFIAVqBcZ/vdP4nwM5w/JOrm2+tttdqiZLSc1siMvM5kVRPahcg+GDHOLc3GP9up/vPdx7+/LOHX3WOnbEQh0pLR8DA1hE8bhUcAgBKAQjAUkIkgkr8Sqt5c2VprVYBgN3BqBrozwSWoxwEIoBjcvQUGzNV7jiSaWSN643yX9/f2R3lxjkkAGit1lIlpecU83mbpZ7utRABoDcpP9rt/vOXX/3m7qP7nSPIS1Ay0EppZZ2zjhhAzNYlR+wcOAeOrJIQ6LV67UKjutVq3FxevN5uLldTADgYjq+3G58eHH3d7X3VG+6OM5uVYB1IAVKClEJOnSUxIICSQkkpAMvSuLy43zn6jZLAyAg/CHQ7jefO7Rk6xgwIwAjAjkEhls7dOez/4t72z794cHBwDMZBFIAQhsgZS8wA7F02AgJCyQx2biRwMY3f2lp57+rmGxvLW/XqYhonWgFAZuyb6+2v+8Pfbx/84u6j4uu9o9LC3LoIVELMXDgTs3HkiIkIAg1KgnFf7Hb7ziklW5WkHgWBlG6q3AjIwOB5NyXMy4JAUCgAYFyazzvHv7q3/dsHO/cPjiAvZRzoOCJmY50jQgAGcI7cdEMCBEZJFGsdabWUxK+sNP/h6tZPr1+8UK/6Qx2XFgDqUdCIw6tL9StL9TQKkyj4bP/4MMsnxubGTKwrjZ2aHB8dAjtmBAhCLRBNPhnnxf2Do98m8UYliaS43m6mgZ7Z26nZOyXM2zQxi1zuHfX/x6f3/u2zB3d2u2AsKMlCMHv9EYgoEK1zzjkwFshBoCvV9NrSwo3lxUvN+la9eq3VuLXaWkymbufzTu/r3gAAthq1V5abAHChXv3vr730cqtxp9v7uj98cNy/fXB05/BkNBxDaUEI0EpKpaRkZgIGQGZgIUBJMPbOTufnzENjtBSvrbbmWRLi4xzjM1GmJfrdTud/375/+952aS3EUaClJS6t9ZZHzAIjEAhagdDVJHqp1fjbi6s/urTx6srSai2txaE/Ocf8bw92/vXB7pfdHgC81Gp0x2t/d2ldIi4m4Y+ubLyx1tobjD/ZP2wkkUDxJcAwmwAxCGQGnoXRDhwwoxBBGpXG9QajX2WTPvOVxYUby4szAT6jY8Q8D20L63rZZHswen/74LNubzLOQCutpQ60M46sBeuYiKwFBlAqTeO1eqVdSVZrlWutxpvrrXc2ltuVpLTubre3Oxh1R/l2f/jh9sHvdrtf94cAsFWv3t4//PDRwUa92qrEa7VKK423GtVIS0CohuGl5sLeYNQZZbv90Xicl9YCACgFUoAUQimtJQOYMU3G2Wfd3vvbBzdXljZqlUYSzQkhZuWIhUSvd/28+P1u9/1H+x/udHJjIQxACEuMjqammBmsg0kJzFBVl5YWfnxl84211vpCtV2JW5WkGUdH4/zj3e5vHx38Ya/z1fHwaJx1hlmZT8A4ALh9MrzbOf7lvUeLaXKhWX19tf3u5vJra61WmvzN1url5kJnlO+cDH+/2/3lvUefZDlMirm+eaNiHFliUAqEyI39cKeznCbf21x5c73dTCIfazti5aNbKVACjsryk73DX9x9dL/T04hUTZmIAKyxDIxChLFSlUQ4K4RYb9R+fGXjn1659O7m8lKazKJvOs4m949PPu8cf9Hp7ZyMS2eVEGGtorUCAGOsc9QZ5/2JmVgbSrWURhv16kqtslWvbtWrAHA4ztYWKl7xd3oDImKprHMTRzx3M3GIQgjE+53eL4SMlbrWqi9Xk1OOnfWK49LcPz75dP/wuDdgpXSomUXpHBvHwFGkrywuXGs11ipxI47aC5VbK4tvb67UwmC+gkSMtd5qVN91Kxea1VFhESCUQkkRKAUApbXWUeGIASqhWq6kW41qrLU841+X0uSHl9ZjJV9qNTuD0Ule7I7yO93jO4cnk4kBQNRSK4WIpjDHvcGnANfbzXFpziYU6mwgcjjO9oajo1Hm8gJiUMH0V3YOgAMpLjZrP7q88fZ6+0KjWo1Cn9ufdYuZMZVQv7raurG8JAQqgUoIBHBnXKhEZABLZImJWAiMlcqMqZ45oFoY/ODi+utr7VFRPOqPPtzplM5+1RtOnGNA1BIRmdlZC3lxpLO94ehwnJ2NWJREZIaJtb1scvdocDDKHdE87sIzh4CIWsqFKFipVTabCwJgYt3eYDwqSgbQUvjsAxG1FGEgQyUjJUOtxBMhOAEXxk6sK6wrnJtYlw+z7ihHBOMIASuhbiRRM4kaSVQSLBz2AykRcS5eOAt8GdERHYzyu0eD661RI4kipSSiEoiOqTPKPt7rfrjd2RtmAABKskCaJRMgEAgd0VGW3z08WYijkTUhil4+ORhm/XwCCInWsdahlj4kNY4ck0CMtKqGQTUMlFIAYK0dFuWwKCfGErNE4XMzx1wYlxuTGQMM9ThariaNOCqYHh4N7hz2D8f+xAWgz7+ZmFkgKAkAe8Psw+3OajV5bbW1vlARnjDjaG8w/uBR5+Odbn+cg5QQAAikeRAmBCAYop2T0Yfb+0fjvF2LE6UJuLDOW2QpRCCVVgIASutK64gJZ4iaFsJrkWM2RB6rY2aBIlAyUBIAjKXS2SkMoVTYlQIws6YzyB/0TrZPRoYI5JT9ziNEQkCgQcr+OP94p7tSSVppslJNlRIKABxRd5Td7hw96B5neSElglaOiJinMiQEMFii42zyBfX2+6OKlkkSbdSrq9W0FoWFdUfjyVE2GJaldaSlaMTRSjWpR0Fh3XZ/+PB4QOMcAEQaX2zW1hcqSRj082J3MOrlE+NISVENgsUkWkyjUMlRYR71h9v9YZZNRsaeGHsyKSzRDBoCYmZgQJRaAkKWFw+6x7cblXc22o4IQCp/iv282OmPjvpDS4RJKFEA4ilqhggIRJwbW1h3WFpJlDaqS5X4QqN6oVk7ycvf73Y/6xx/3j3OS7tcTd7ZXLm2VL+y1DgeT7qj/Itub7TTAYDKevulVuPWSquZRvcOe3vD7O5h/2CYxYG63mpebNZuLC8uxMFXx4MHvZNPD47GvaETggJFPEWe5wZ9aiUQHZObFEel2emP+nnhDdU0pJpYNygKWxQghOcQ0FPAAkdUEMEoh8JkgQqkvLy4cL29eDIpOqOcATqjzGZlHKhE60vN+s2Vxf3B+P3t/X5ejI5PAMA2F6pRcK1VX6mlRPzBdndQlL3+aJgEL7eaa7XKzZXFhSiUiL/6aq87zm1/CIGGaqyEeCqcJgQ4B+CcNWZQFBPrTtMWZjBEuXFgHOgpgxDhacAcTiFB5wCgEujVWqVViathsFpN00AhADArIWpR0KokzSQyzlXDIFRyhAAAoZLVMFhMo2YStSpJLQqUEMCMAGmgVqvpxkI10vJkUqn4mN06UBJ4bgjPg2gevgQiMC43ztCUl8pnypZoZiieiWwhgBQIIK2SEKg00LUorMdRpFSoVDOJ6lFYCYOepWoY1KIgDbUWItYqDXU9Do+SCADqcZiGOtZKC5GGuhYF1TCAUFfCoB6FzSRaiEMEqMdRLQrTQJ8ECpRUUkqBjr4BD/ZHypbIOAcAwjEPS1NYx8zPhex8wiIFekMXSOERCwQIlQyVCIRQ0/vCozdSoBYiVFJppbQKldSzssNsBaGECIQIlQjVNHEKpPQr+BrFC26MmQvrhqVxzKK0rpdNxoWxzIRzdP5ZwDAzMxH7woojptmjjskSW2bH5IjdzFd4n2OJnCPnyBLNvQj7chSxY7LMltgxPV6pYkfTF56FWM+hMUKwzOPC9LJJaZ3KjDmZlLmx7GE9fAEof0akY7bOGyG2jtxZ9JPZ4wd+fzTbmf/JETOAPf1pvprXCLTOuTPUPL8igeCBzdzYk0mZGSPGpc2MKZ0jj/R49PYpiNFf5DXd6HTnxFw6lxkzLq3KjPUwBvM3WY5nHdNM+M8rAU5N1mk14rk/zVabLfetqURmcETGusxYUTrn5QH+Ki4v6qVzAv5KLxFIKfE/Ur3+C6UHUSIGUqpEK62kFJ60P4tA4rQehqf///NYEkSQQmglE61EGqhE60BK4YMoXwoFhP8vWDgPqZiBWSAGUiZap4FSidYLURBrhYhADOJFmfAszpwavdN8GYgZiaatB+eex9MXn7rmC0kRAxAjYqzVQhQkWqtAyUYSpaFWiGJe28fnybEPds48N70phZZSCeEB4zPOE5VA/xieiYOmaaiUSgpfDT0LjSghlBDuOcHU7IwYFGIa6kYSBUoqiVgNdKjktCw2Ty6/ueGDyBDZM06CmA1Raam0trRkiM66EAYwfD6GePwVfe4Vy2yIDBEwP1eMfJSCiKGS1UBLRAUA/oxnR8nPUU9kcARFOfAtN0SWyJdRTiZFL8shy4+yfDApMmMs+biRjCOw5Oujjsh38mTGDCbFUZZDlvcQTiZFZqxfzRCNSzOYFFCUICUg8HPsNk/BKSG0lNPSBCJoIWItQUsQYtqvwE9v+GAAEAhKRkpNEfNpeZl9yw0o6e9bYmZAwFjrZhJBNYVq2kyiWGsEZAZLDABKCFAymL7F82K1EiJSCpQEgfyMIhjPQyohQMtYSz0T52kGHSlZC0MVhv7AiJ4wFYhMRMaBgCRNmkv1GxdWX19rtdPYV7svNGrvbq04ov6kvNRYuLW6tFJJtBSLaXxzufmP17aaaQIAb60t3VxuLqaxQFipJLdWl7qj/MHSQj0K3t1audCo+dXaafz6WuvvL6/fluI4LwvyLUuMQpw78+lWpVRa18IwmuGcyqtpPQ7X65X79Wovmzhf0mVGgTCtpKFAtMRgLQZqa6nx3pWNn7x84ceXN5NZberVlaVEqx9eXJ9YV4/CrUa1XUk8d//24tpyNf3ZKAeA1Up8eXHBIxertfSnL1+80V7sT4pIybVaenmx7ldLAv3Tly/GWv7LQvUX97bvHva4tKCklEizTiFA8KmBQJRR2Eii9XqlHodyXkaSQrQqyY324nZvVHSO+pMCrAOBAsWscutLcOyMQYHVJLqx1n57Y3mOlfvr8mJ9vrOzVyDl9XbzevspmtGuJJ7+J6/lavL2xnJnmH+wd+isY2NACoHopc9Hy47JGQtKVuPwUqt5o73YqiRSiGkZSQpcraXvbLb3R9n+OOuPMygNBEqgonNZJzNb15sUX5+MPtk/2umPhqWxziFiqFSiZaS1RDREubG5McaR9y2JVh4ML6zLjPXpn5Yi1lOYwDFPjMmMK6xlZiVlNdD+Q71JwdadS34RUSA4IigtINTT+LX11jub7dVaKgUSs/JwbLuSvL2+vDfM/rjXfdg5AutQSYQppswMblrJVYDYGY5//XB3bzAMpMxKa8nNzJHQQni3YRwZ5xwzAmoptBQzi0LGkXHEwBJRS6k9H7xxd+TRFyVkEqjSuYfHw85wDIigFAh0MxuCvgGDmK2DUK9Wk7c32m+vLzeSSKJwTMoxKwGxVvFC5epibbkSSyHc4wrKxIyMQsg41EqlgR4V5aP+UArhDbfHtKa5MDACCvSNKVODRrPMSMyaoXB6fwp9elxMIAIiM3uowxGNijINtKkkxloHQL6zBM/YeGYpxHIlvrpYW1uozBtD1VkSltJktVpZrCTHxrJSKNCji0wEiEqJZhyt1Cob9cp6rVKLA+UJc+T36Xc5TxnFdPsznP1MFCIQ5xD8KY6OKHDakKekkAIt0SAvdwaj7f5ofzA6zifWEjCDFP4DUimMoVlJVquVeY3Oa4w6G+2mgb7cXLi5svQpQC8vrHWnoQCRFKqRxC+1Gm+stW4sL7arcSBl6VxpeVZw/E4yRWCGQKFfvDPMbx8c/V53C+tOitKS9UGUc44JhZKNanJzZelyc2HeO+BjY+X9mcebKkHw6upSbm1O7jcP92A0BqVEFLIQ7BwipIFaqaZXlxqvr7bW65VAyom1hXVTKfqOUmBmCJWMlCqd2+mPSkf7w+z+UX8aFno1nhTOWldJL7cb713dfHV1qRIExpFHBwWikrParkcz31hrLVXig3H2h51uPikhYBlHJNEL99n2V49OFtZNrPV9f98JYW4mm0qIaeRypjMVEYUUAoBKA6WJGwtvr7d/9sqljVqlHoczQjzyeWZDoZIrtXSpEn9vY/nXD3ZvD8alc8a4KcwKkBm7PxzfPewFSuwPxoCQlfbPQVikVBIoYOiMs7uHvf3hOPN9xsDOOscghAjS5JVW43sby2+stbzJNbPeLuGD4HP5lRLizfX2f7lxuY74h73u0SgHYgyVFGJYlF8e9sZFeeeoXw00IBbWWXIA+B2KIgArIUMlgXlYmoPBeGc4HhalFAKZeVKAwEYtfX219XevXHpzva1mjbVnkzo193dnN3Zlsf7fbl6pap0hHj3YhqxEBmLu50Uvmzw8OtHSSwQ8H/L/1kjhqfH0tTvjyBB594gM7AjC4Npa+6e3rv3DS1tXzsQ6ZycUpoSJqdqAB5nTQN9aXZo42h5lnSzvHByPrJ1kE/9wzuy73J6fk/5JJDIATLvi5l9xrpKE7eXmu5fWf3Bl49bqUiClD9wlCnEm31bnE1FGXxcIpLy2VH/vyoa19jdKfrTThbwAISAKQAkoEcBNe+ZeOH//NvDP1GmDkhAosASTEoggDl9ab33/yuZ7VzauLdV9SUQiOobHmuCf7Ff0vtVvsxEFb621kAEQ+sZ91TkmYxlRo3CBZq08Hv5nRGqYvVkyyChQhOGFdvP7Vzf/07WLb661GlHAcz16IllTT4UQiBgQtJRrtRQACUEL+WElvr3TPR6MDRMEWsVhKKW3zTxrWP5TAOUp4o04A3mwcM7mBZUGUDRq6Y311tsX1n58dfPNtWnrrGMGhqcODaknE0qYKi4DgJJytZb+MFhbrSTrtZQAfpXlMCoAkKOAgd2UnmmRZR6/fVuacGamEdkbMonAzFBaKAxU4uvrrf9669rfX97wzc5KitP8/2lYv3oWrkYAOIvNW2lcj0IUeDwpcqJpezpiVhgwdt6ePivxwmMiys9F8BB42qROfoKCGIBBK61kpZosNGuL7caPrm396Ormk+3p4hk2+ekjIE/t1T83UPBx57j72ECBxjMDBfBYAZHPT0qcCgfMi4OOiM8MFEAUtRrV19rN7623X/quBgrOQcE+76hH4fe3Vv9mc+UPq0tpGpMQfwQ4HMv5CAgiOiL35AjIi4CuzIjISgICBIEfAXl1ZeknVzd/9sql+QiIIxKnpaZvwqvVc33JfGhHAkhEQLy11jopykDKq0v1bxramcK8+JhdmjNv2uB8OrTDzxjauTWLmHzA5ZhfZGjn+RN/8zGrsyu96JiVb6TBcwD2jKTpPMLpmNX1VuPNjdZb68vnxqweA0ZfrCyoXsRZ+nV8TQ0YlMCz33t0MmxVklaabNar38lg3Fsb7XODcZYYEKajSC9c3nxR0/wNo4w7J6O/tFHGv9rhU/xrHRf+dx6rKNVtGXQCAAAAAElFTkSuQmCC', MP:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAIAAADajyQQAAAcJklEQVR42u17Z5Nkx3XluZn5fFW9cu17unu6xwOEEQCCECWSklZSKGJ3v+yH/a1rFFKIIXKXIEACBDi+ve/y5tnMvPuhunsGwxEJkNgILZcvqiOqo8yrm/fmNeecJGbGH+Ml8Ed6/cmw/9cu9e1/JeOb7lq6/Pt3aRjzpU38wrbfkZcIAIgAJhBf2kffkoX0x5oV1Tf3DF/7gi9DD0QEgvjDAooBO/M2M71wKejSs/R/PRSZwVeOZtC1hSDQ75uO7MwwBviFbUz4vYz6JqE4e9dvvQHDWhgLzdpYY9lYtsxX2+5y+V9aAhJEUpAUpKSAIkgB8du8/jV+wzfxGDMzw1pmAEJI8W/4hA3S3E7y6bgcT8tJppOizLUxsDO3XhvGAAgSwlMydJ2Kr6oVJ6o4IvIQuSDntf40DBhLgBBE9Lud+LsNI3rpi17/bVymZTItpuNsNEwHg6I3zAdJOcrKRGsNy2BxtdAMWDCBFESoVM136qHTjL163a3FNso4jNgJnFfuRIAiQIqv77HXh+JlgmDwbIVefq3IykE2GOaTzKQaqZATiE7O/dykuU6ycpKYYWrHpZ0am7PVxCAWTC95jAGSlnyiUMqqQ3EgK5GMQtf3VN2ltkIVNmAbOFTxZT32nNiH538lzVgmgGgW1N/AMLaWrYVlVo6ULz5pirP+8e5g92B03Cs6BfWkeyK9XasuII0UWkojqSBVKqWlsFKwAIjpJRcwAAuyEKWVxjpGu2wkswJLa9umWDf5ks5aVs+FYrnpbaxVl9fq7mL9Or40w2grCWK2U1/nRPVvhZ+UJOVViOdlluok1/1JdtqZHh5nz0+Kw155oelCimNH7ZIySsB3EThwHXgufBeeAw9QgHztpgEKIDfICqQ5Mo28RFaIHBuFWSr0vCnnA7Fa0InKVjFZnHKzGgSeDHylPKUc8Q1CkZmNYQBKvfwxPXh68fDXnafn2bZRR57Xg3OR2UFJE4ixVAOpNDmQCo6Eq+BKOAqegk/wARdQv7E5ZzlkZlsCJAVSjaxEoVGWqixqpqgZUxWoezQXiSbplSLfEuZO2713txXfakJ4L6LIWADiq3tG/Yar+BXP9k8nXzzu/fjnpz87yR76tdMbC3ohNu2AfZcdYQTsdTNNV7Vs9mCgAGmweJ1hBBDIgh0gcuErWG+2upq5zxhbppKpLGWaqYv+0vHkzXT03SXXuuLNul+dd65LJs3aMnpdKFo7S+YkpQBgtT45GZ91ktNBudvNnx3lv9Dhw3p4Vq2h0UC9jti99AYgAIcgZ0WWwQQGdAlOgUHO0wxFIbRxmMXV/Q1QEkNKdhUCH5EPX8CBdAABFrCE0gI5kHoY+9AYlWUxVYWiaUc8eThdPy7mAzkXu3NzkZBytnLW8nUCf2GYtdZ1L/+dDJOHnx/99LPzTw+LZxyMm/X+2nqyHCF0IAMoeRldBgQIAggswIAVYAUIMAEjoJvivI/BKMqyijEKBEEWyIAhWCuFSohWjMUmGiEUDCAIQoAYTLCzkqYUqk1aD3tl+dmw2Bum0SejOyZ5r84f3Ior3nLQqFzGpLZC0izXXVoihJCSGChyXRZmd7t7sNvd2+k93C0eOzX4dcRVuRxLxWbCyDUKmhUUBjRDXzYFDGIQBDPlcMaZSie+TRdFvqSKhrSuIBLSAIm1F9oeG93LYBNpxw6TtamrBVmCFS+FNDMI8CTiYMjBMEn2z0bY7nfzgT9vm5zHNXftnus40nWl48jrhKG0tkoJIQBQlpvPPz89OhiOeyNtsL5aG8nCy9REZEmnO+FkYhkpgSRCD4EDKWEZhUZWINcgA7LIcznOqoVZi9RGTaysOxtBa8mhuiN8JYQUDEy1OZ+We5PyNLVT8NCORr1xr8BFgQtDDAmpoARmdcYyBNgDrMXJFNsXOO8Hfk5annUmH//iaOc8W1mt378757qXhUlrq4xhdZVBup3pZ5+dPHl0HlecB/fad99YenNUPD9Ljobl/uB05wTPMjEWLqohmlXUAzgSxiIrMc0wTpGmyHI1mrQmyaYvPtiKP7zdvns7XpmvRIHrOUIJIkEAtOFpprvjojNIu93k+Gxy3En2BsXOxD7NxAE7UC5cBSVggVwjK1AW0DmSbC7LbtX4naVwa8UX4Gd7w2dHyb1xvjhfWVioXO8sNYvI6SQfj/Pnzzr97hTMjWa0drO1dbNhSn37ZHR0PN47TZ91y3VlD4UtAm1Urq3VOZXaBIRaA5pM53x4/vxCjaebTfdHN1t/vhl+9KDe3GqAHF2UvVGa5dpoBjj0VbsRxpVocykqB9PdgPdluS7tRsXeSGi7wEQyO5YkFIMzNsog0aR0LaCbQXi37W+tVOotfzApst1+b5BfdJLd/b5SFIZuEDhEpKQga+zx0fDpk4vjo2FcUTfXVjY2W+sbjXozBNsgdOfmKjdvlm9NzUVqu4VNDCcakzIfZDqDacX+zYUoH5ifHhQ/PutKa/7s3fZ//Nute5v1xnoDEOUo+eXDsy+f9M46SZJoIl6aj95/Z+m999cAOPXo5hbCyL+R6zc1Opm9SG1qGSRIkgDBWFtom2sBEyhqV5zFuh9XXSdQo2lZa1UPj4Z5pp897xZZubbeWF2tkyBFgrJEn56OHv76NJ3mb7+z/GfvrS0u16QzC1AZNZyoUVm4TDs6nRbTUTYeZINR3hmXiaZ6DUuxHWs7rdFo3o9i7/sf3fjwh1tCQFseDdMnj8+/+PLsy0fdg9PpeFIK4tXF0Bp2fPf+3XkhSNWj5TiaFSKjTZ4UZamZZ408Xbd4RKQc5QaO41z2MguG5xbjhYXq40fnB3vdPMnD0FlcqHqeUrnBcFIMhtlwlLqSmq1wZTWGlK/tU6RSlVhVfDHvi7TqDBM3t5znpns4uDifxJHzd3+zub7R+OCjNSFw0k0/++Ls9GRUTHNJtLVRj1tRmhoirvpiNMr+5z8+/+STk82b9Q8+WAkD9+oWMqwFgHlRxV8apl/9PZJasSdF3DkdbT8pex097CdZUnieUhe9tNeZlprr9aBWceN6eG0VM79+7HFcqoqwCtcyMz/b7n38sLu7P1hZrf/wR1tvP5hzAwfAF5+f/OM/bXc60zsb8UfvL2+sNYxUxlgi5JP0558c//hfD3rd9L13F5da/p03ll6HC36tEaUSOs2G32wEeVqUeTnsJ64j1MFeN53mrie3bs/VY7/eqjBgjCWQtZZm0xiYZ39EIGII6zi+pFmwlo6z3y1+fTDhKMgYSWl7k+lZN905GE6nhRLUbAQb682NrfbLXXC3m372+XnnIjk6nfz8s1OrRL1ZqVU9z1OSYED2Cui6dhZfwRIz7ABgKcUsT8zNVW7dak/Hueup/iDRxsrv//l/zbOyWvPXt1oLy424HipXlqW1V/AgvTRvCgIRCQECXc8yo0m5vdu/uEhsqW1Rnp6MHz/vHZ5NIbCxGr9xb+7+3bn1tYbrvdyXklKyWvVWb8RayN2zZP9kWhq0Gl4tci/9RZdjuyASAoJezKo8uywzyDJLKUjKIPIqcZCXpjdITi8m8tbaP8DYuXbl/r35+bmK78hZXDtSKCmkEEKQlCQECUGzOkTMbFmIS8vyTGeJNtrotBh2psfH44t+ylJu3mx8/8PV995aWl6uuZ6ybGftt7HMluPY39xqPniwMCn44c7w4HgiJbXqXq3iuI4kIgEIQYJweVNAADOYRAghpVBKzDpbQeS5slb1PUeenI53d3o7O33ZCP5aWCzUgwfrsRt7syZSXuIKl4/roZWvIKTZc2vZWrbMSooocCqhCgMnjNx6M1pert273bq9Vp9lNiKU2lrDxrLWFoKUFEKQUoKUGk8La5msLTI9nZZFaaQjAk/RLFAAbawxzOArnGL2IKJZ5rQES8RmlDz68uzRlxfbz3qS6G+IKI7clbmw1XDhECwgxCtDhuEXhoFeIA8ESElR5MzNRWs34q2t1p077bt32ls3G4tzke++yK5CkJAkBUkp5EuzU+DJhXa42AqyJD86Gp2dT3JjPV/GNU9JMbt7qY21DBBmK/5K9khzFLmeTJ8/7Xz6i9OHv+4d7E/UBTluKb8cmPZhOmxmXmiMQeipOFSegCvgKqGUULMG57V4kBK+p+qx/xp0yV7WHyFwbcplvTKstZFSRIG6vRFvrlYl2yLV3UFydDRUCmVpbyzXKpEbeMp/aX+y0WVhy1yXhc0KMxjnoyS3bKdp8eRp/1fH6c7YdgpSk4XqSbMCvzpI/Z8dCqdMeZTU2C76YkHxcoCVurO0Ug2X678HFsoMyyxeRzq8AqFJJd64Nxf46tnzzun5+Mnji/2D8Y21xt2t1nfutr7innFyftA/3e4fHyZnY32ouecoE/kF5EXXHKdO1/GTCim9XBm0apN6fVvGcuihk+IsidNsxcFNl+9V8WDRu8O0EQZxPfjGJJUgIeRrcSQhyHW/0ga02mFc92sV9cvP7KNn3aOzaWeUW8uturd81d32Run+4XD70cXTX549eTzcHppdx+k1azwnuBJaExjXmiqzkooDaXzHBC58H64D5UEGY4Fz8AWhxzhNnO1DuzIdtpvJSkU0QmkNj3Ob5FYS+S5cQeIS7CXHEb7vVCpu4KmvgwEyc5GbLCuMYVIiCN1mu3Ln1hyIvMPBKCl2drrG2HazYhhWyc44PxlM90+KvUTtqMphyCPPQ7WKahVxiJKhDfIcplSY5AhyGA2X0FJwK4hc5GUhceRQ4mLbikonjZ4OW5S9O08P5h1iOh7o7tR6gloVij0KlVCSSAk/cJqtcFXWgq9ULbb2Rey9jB5ZvmwOe4NskJTKU/U4XN1ozi1UNo96Dx9fPN0b/rdn/d6Ux1pQJShCbxq4Ey+crDRGa26iJKSE7yJ2ECp0c2RjXBikmZLdKVwPRQGX0JRUDbgSwMJK5ApnwOkYGBAGI9mbnh+kF3W0Ise4fipULsC5LlxqRMp1pLaWBzSaFpqpZBFHSgkSBCXouui9vMcAkgRHCSkoy8qTk2FW2uWVenx7bnW1vrocxhVVZOXjJ0efPR7v5w5adSw3seSiUceNJuYqFIAsCEAF8AAnxS6QpNQbyxuNvw99T7VjuzpPTYcAoUECdoYHzrgdRfCYMzvZ74/3BhVB33kw95035lcXoopCJVAL7ajZCAg8HmXdQX4xMWcj3R2VSWZA5HuOFFegm7XXwNF116uI8kKPRul4lOZJabUNQjcM/dZ8JRRI+0lvUp6H1XJ5EattLNaxEKNdRQ3wIGdkRgThQfW58vwk3juLz/rqFtkJm05pktSUU8CCUwhmlnQJaBBhycWNNgJ3uN97tDNcn6et1fpH313UxhztqLzg+YWK76vzk6Eu9PAk6ZxNDwYmDJyFuru5FNIallr+b2FM3Mhrz1fSNIcpO9306ZMyK8yb76y0q+7WzdaH35nrkzPm+qeLN3SzAl9ASUhgCkxgNbQAAezCH5f1vGwbHbFWa1XueraEOc/LPGEWBGOJLVlBBmSM8JQTkhM76aherLSyi+RMehcTnQ7Tqo+FmpKeW21VAIS+SjOtSTkTm0D2x1nvfNQ7VzpJnTutRuxL15k1QbMSNxxlRWmEFFHkRVV/dbXuKCI5PO5kx6cT9fnZcjvQg0l3XJiqF9brtRvtaR1sgQyUW50xW5A1UJJTohQqKRqCVyPZbHnyP/3ovyAOklrYDaJceRBEAiTBTGAwEStiSdaizAVbwJVaCZPkw7Nh0p8osrW67wb+rBY5nlOpuu1WsDwXJpN0d6dzctxHkTdCWQuV5zugS8PStNzZG2zv9zv9jIEgdCuhF1Q8Ffm5kKNhfvys9/CTo598fPwvO8NfFmo/jofNugmIGTaHLZmZmIgUg0ClFcOiOhjfysebrtloOmrz7XmVyYuk4O1T0zfYatNyhRwgA2d8CalNYBJYw1irU8XpHHb++2l3+3jw4bz4/r2aJayyCOKIBDUbQatxWe6ozI/3OvujSbc7PTkbNxu+cN2wGszY90lSTtNyNMm1zsrSEPPqYjWK/EUSg1F28qx4+KTz+Gn/2VgfxmG+JVAQslIkLltwDmiGIPIF+QIl+HBknnfsqF+vmPWtxkbUUG98cDM8TfZ+el58co6wi/AtcbsiKzBdILUAwYINGICEiFzhCi3sGTjpT8QkdZ9Psn7a3R6056PmYq210oR3ydzdv90+76W1mqvAY02HvSJFEox0XmhrmSQ1WpHjO2eno7PTcTbJTVauzkflJDH7F+Oj3v6k/JVbOV7wsBBjtYV6FURcWFhAA8aCAVfIJngCczLCPz/K82H9o/atd1e2Virq/ts3vbDzq5+ceY8OJ2UHtxfovWVRucSMMWPMr1g/NmyExEKMOJj28t2Tc/fivHvY3wy6q0vhjc3WaomljXboSQCNmv+991dXVuu9QZZkppPwOJ8I5mlSAFhZrt3aat1wpDT2ZK9/cTxIkrJ/EaI/3nt8cnyWndeq/fVFtJtohah58B2Q4hJgQMz4aQtAMGgKbJ/j46eek8+9V9taqW3enlOVWrS8pNcWKusR0p1e8vmO3mjS/SaiiCoOCFxcARCGoS2UoEhRXXEl7Fn7ZJL2psVJmi93eRnTpcnp0uF4dS5aaPrNerjYCBYbQS/j4/PJ2elo2BklozTLtec7tuUrbSKFhrQxme44e7zTf3aWikna7dhdN+ouLJRra2IhFiEIQIEyB+wMGCaaNQAa5bOpftjD5/vRcLB5M1ibD+bnoiDyFIBaI7z91uL3frCu9c6TRzuZ0eZ4U350V2xVjYQZAdrAzDh9sABpWAIEpo1IbyyOF2pdlM9Lqg1H1aNO0xxuxerBWvyd+wtvvLWkQr/pU7xWdU0xPe+l00RIUQs80vpw+8KxJh8mLV92Kt7P+/bxRQ5ys+rSpFXtzDd1swJvtl2BHCgt2EICrhJ1CMA+z82/bOMn29HT/fsb4Q/+au3+O4vVeniJ3UtXrn9n8S+TPMnKyf/Y3v7pQzvNuRJS5RbqLiwwIw8NMwhEnAEZQEDo5utzhUsTwHYNHh/QTj84Hdx0zWEvG5ZcEN64vxDWQgmQFANLnRItV0a+zKf59m5/PMrrvgwjz7Tc46T8eEK2UuXlllyqIXJBhBSWAA0wQxCkBBgGSMFT2F+f8j8/wSfPVur83e+v/+g/37v59pLjOwBUUWjlyLnF6jsf3Bh1ku7BYPK/ji8e7nJFllki7q/IlTmKlVWwmmCAEsiZSksC7Ar2BYfQDJQCrToW2hPgEesSbnFcTIrj86Px3HxVVKLHY/2zoeiW3u2CGuNSp/rTo3R3bFpx0JRe13X3G1wqiUqEVt1GDiRIM7RlAqSES3AgHIiCeFTybs9s9/GTZ+rh7hySt+4tfu+HG2+9f6O9UBNClIVWAAmiyFHrS/EHH653z5PU0me/Or74+Av0+jR4Q37foagNF+yABWABskzMFigsWKK8oifnKwjXkS+VmvfSQnc6vSfnTx51GrXItBvbQfWL0tUskjSnMi+T8peZ+hKhV/rexNfV4HzOw5ILR8GV0EDJzBZgEEEBLkhCACqHPejZ//3U/mwbO8cLonjnw/af//3mu+/fWJqvuULOejd1La8JXLW5NffBX+kCAIovPj3oPt4ppTAkMFxDq46qi9CBknDkjPKj2X01YEAKouliqckStkR6ofeNHXZG2908muRFXpy2MaiG8CjgFKUwUM8r3ilCSAfCgROgFcqaIgLn4BIMYilnLByYMdY8KfUo1ed9fHmAnz6Vjw7mlHnrg4W/+Ifb7/1oc22z7Sp1DdcpKQl0Cd/FNffB/blAoSJ0zaXPvjx7vn2A4QS/3sbyothcUOttXmpyM+IKoMCzyMwADQiwBAlgRnB5qmjFF/nyoB47SuowLOIqogCuOLZuWXrW2DNyIFxAQEkEDhw14xMJmNGlwgEZ0BjoFnTUKbfP+PkJjs+we47z0aLPb78x/1d/e/sv/8OdjVtztZp/2YwKklKoWfPGlpkgBC02g+Y7y5Eng8h3Gk+Kn+8d7O3j6Aj1eXH3Bt+/Ye9kvDGPdszhrJ6AcfkEOZBfiQKIMV9DKyotlwQIASFmuowJgpRrfMmHXqEGgmBhJldV0wFKsAZloPMEOxfi4YH8Ylc/3sPgAkbPN6O331r5wQ/v/ODv7r719uoMtLSWmVmCpBTqhSTEWIIQgvzAufvGkiGhQhXWnC8/PewcDzrd/uhzjc4Y+x2stTBXQy1EM0AcIfCEN1teAUmQIBfkETzFrrICTCADoSEt2KIk6CtM3p1FjgEXsCk401yWNi9QFBhnGGY8TnE+xF7X7F6Ik048HrfrbnOxeefNpfc+2Hjvg807by77gXMlebDX0xBdyfR4xm5cjxKjcX5+Ntrd6Tz81ckXnx5+8vHJk/3huGD4LmoOKi6qVdyco81FsdiW9RoFAfsehy58hRAIAAdWXAofiCEYwl5mGQvMZICzdSUNpMCQMRzxeGJ6Q3s64O0u9nqYDDGeYphDm0bg3lmrvfPu3IO3Fu48mF9fb80vxM1mRC+BYtdz+qvKHGPt7KXZy7nF/uHo04/3//Wfnv3y53s7u73BINFFalgzfF6ZMxtLWG6jHiMMUfFR8xH5qAbwPAgBy5jhgfTKEMZfea4N0hz9CbpDjEboDnDUlzs9Ou4LTCVZ6bmtuXhra+Ht99c++ov1d95dWluteVdusJYZLL+Khb4iYIGxFvwVAYsBdvZHj7843nl8uvPk9Giv2zsbdC4m/b4dwhl6vvW8S2Y1dFH1EHoIXLguIMECVgDyBaT8ivCSDWCgC6QZxglGKdIceSGyspaVdbKtplxYDFuLteXN+fXbizfvLty5P7++UnkZ3zLagl4VsHwtvWJZ2jQtkkl+ctjd2+7s7fd3docHe5PDw/HZ2bQ7TCbZrKEkqNl4SyAJSMAFHEC9DpNkQIM1qIQtoAtoDQtAVHy/VfPn5yura7XNzfj2Vmtjo35jvdVeioPI8wPlqN+NcP42kRhbtpYdR9KLvcenp4Ojk8nu4eToYHT0vH+62+ueDXqD8TTNilznmS4LY4rSasssGApwAPlawwiWyApppWMdB14gXd+vBEGjUWvNVxc26iu3mhsbza31xo2V6suoJlsuS0Pikip5LYn3O2R9YBbyqzg+2/GkGI7L0SgfdNNBZ5qMkmQ0GY+Sfj/tdNPBIE3Huc4LY4xlXJa234RMmQSRlEK5Kqiqeuy120GjEVVrYRhXwlpQb4f1VlCPg3rsR+Gr6kxr7CXQ9Xq7vl4oXr2FX5HnGiA3YG1MXkxH6XknOT6bdrrJZJiVWW5MaawBXRMZX1VSMUkhpXQc36vEfrsVLi9E8+0wqgXSc0lJT35FNXcpf7/UsH8bmuAr7SKDIaR4Wbz4ypVr2xtkw1GeJaUuSmu1ZXPZd/2mRIxJkBRCKdf1Izeu+s265/0bm2dGsrJhzDg68buls9+i2BkzZYrW1ho74xyvNcC/TZZLQkihlFCSvpXf8PscKOArWfrVz76OUSJxSRf+IWctZmQnXa/FlRyZvvkhim94UuKa1746WfAyQ/2Hn96YKfqv99OVabMG8pt9+5+OgHyNEzsve/LrL9fLJzzo2zu38y177OX+7Budsvr6WeH/91D801HGPxn27+T6P1FyiPjyAZBpAAAAAElFTkSuQmCC', BP:'data:image/png;base64,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'};
    function marcaCtaPF(k) {
      var n = String(k||'');
      if (/^tarjetas$/i.test(n)) return {c:'#6B4FBB', t:'💳'};
      if (/mercado/i.test(n)) return {c:'#00B1EA', t:'MP', img:LOGOS_BANCOS_PF.MP};
      if (/naranja/i.test(n)) return {c:'#FF6A00', t:'NX', img:LOGOS_BANCOS_PF.NX};
      if (/naci[oó]n/i.test(n)) return {c:'#0B5CA8', t:'BN', img:LOGOS_BANCOS_PF.BN};
      if (/r[ií]o/i.test(n) || /santander/i.test(n)) return {c:'#EC0000', t:'S', img:LOGOS_BANCOS_PF.SA};
      if (/pampa/i.test(n)) return {c:'#00A3E0', t:'BP', img:LOGOS_BANCOS_PF.BP};
      if (/efectivo/i.test(n)) return {c:'#3D8A32', t:'💵'};
      return {c:'#64748B', t:n.slice(0,2).toUpperCase()};
    }

    // ---- Tarjetas: consumo por mes y resumen real (panel_config 'pf_resumenes_tarjeta') ----
    var resumenesTjPF = (function(){ var r = (config||[]).find(function(c){ return c.clave==='pf_resumenes_tarjeta'; }); if (!r) return {}; try { return JSON.parse(r.valor)||{}; } catch(e) { return {}; } })();
    var cicloTjPF = (function(){ var r = (config||[]).find(function(c){ return c.clave==='pf_tarjetas_ciclo'; }); if (!r) return {}; try { return JSON.parse(r.valor)||{}; } catch(e) { return {}; } })();
    function guardarCicloTjPF(cid, cierre, venc) {
      cicloTjPF[cid] = Object.assign({}, cicloTjPF[cid]||{}, {cierre:cierre||0, venc:venc||0});
      return guardarCfgCicloPF();
    }
    function guardarFechasCicloTjPF(cid, k, cf, vf) {
      var o = cicloTjPF[cid] = cicloTjPF[cid] || {}; o.fechas = o.fechas || {};
      if (cf || vf) o.fechas[k] = {c:cf||'', v:vf||''}; else delete o.fechas[k];
      return guardarCfgCicloPF();
    }
    function guardarCfgCicloPF() {
      return sbFetch('panel_config?on_conflict=clave', {method:'POST', body:{clave:'pf_tarjetas_ciclo', valor:JSON.stringify(cicloTjPF)}, prefer:'resolution=merge-duplicates,return=minimal'}).catch(function(e){ alert('No se pudo guardar: '+e.message); });
    }
    function cfgTjPF(c) { var x = cicloTjPF[c.id] || {}; return (x.cierre>0) ? x : null; }
    function diasMesPF(k) { return new Date(Number(k.slice(0,4)), Number(k.slice(5,7)), 0).getDate(); }
    function pad2PF(n) { return String(n).padStart(2,'0'); }
    function cierreFechaTjPF(c, k) { var cfg = cfgTjPF(c); if (!cfg) return null; var ov = ((cicloTjPF[c.id]||{}).fechas||{})[k]; if (ov && ov.c) return ov.c; return k+'-'+pad2PF(Math.min(cfg.cierre, diasMesPF(k))); }
    function vencFechaTjPF(c, k) { var cfg = cfgTjPF(c); if (!cfg) return null; var ov = ((cicloTjPF[c.id]||{}).fechas||{})[k]; if (ov && ov.v) return ov.v; if (!(cfg.venc>0)) return null; var km = cfg.venc > cfg.cierre ? k : ymSumaPF(k,1); return km+'-'+pad2PF(Math.min(cfg.venc, diasMesPF(km))); }
    function cicloKeyTjPF(c, fecha) {
      var f = String(fecha).slice(0,10), ym = f.slice(0,7);
      if (!cfgTjPF(c)) return ym;
      var k = ymSumaPF(ym,-1);
      for (var i=0; i<4 && cierreFechaTjPF(c,k) < f; i++) k = ymSumaPF(k,1);
      return k;
    }
    function pagoKeyTjPF(c, fecha) {
      var f = String(fecha).slice(0,10), ym = f.slice(0,7);
      if (!cfgTjPF(c) || !(cfgTjPF(c).venc>0)) return ym;
      var best = null, bd = 1e18;
      [ymSumaPF(ym,-2), ymSumaPF(ym,-1), ym].forEach(function(k){ var d = Math.abs(new Date(vencFechaTjPF(c,k)+'T12:00:00') - new Date(f+'T12:00:00')); if (d < bd) { bd = d; best = k; } });
      return best;
    }
    function ddmmPF(f) { return f ? f.slice(8,10)+'/'+f.slice(5,7) : '?'; }
    function guardarResumenTjPF(cid, key, monto) {
      resumenesTjPF[cid] = resumenesTjPF[cid] || {};
      if (monto > 0) resumenesTjPF[cid][key] = monto; else delete resumenesTjPF[cid][key];
      return sbFetch('panel_config?on_conflict=clave', {method:'POST', body:{clave:'pf_resumenes_tarjeta', valor:JSON.stringify(resumenesTjPF)}, prefer:'resolution=merge-duplicates,return=minimal'}).catch(function(e){ alert('No se pudo guardar: '+e.message); });
    }
    var MESES_CORTO_PF = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    function ymKeyPF(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
    function ymSumaPF(key, n) { var y = Number(key.slice(0,4)), m = Number(key.slice(5,7))-1+n; var d = new Date(y, m, 1); return ymKeyPF(d); }
    function ymEtiqPF(key) { return MESES_CORTO_PF[Number(key.slice(5,7))-1]+' '+key.slice(0,4); }
    function tjMesesPF(c) {
      var ts = new Date(c.saldo_inicial_ts||0).getTime(), mp = {};
      function b(k){ return mp[k] || (mp[k] = {cons:0, pag:0}); }
      gastosPF.forEach(function(g){
        if (g.pagado && g.cuenta_id===c.id && g.pagado_at && new Date(g.pagado_at).getTime()>ts) { var a = montoGastoEnCuentaPF(g, c); if (a>0) b(cicloKeyTjPF(c, g.fecha||g.pagado_at)).cons += a; }
        (g._entregas||[]).forEach(function(e){ if (e.cuenta_id===c.id && e.created_at && new Date(e.created_at).getTime()>ts) b(cicloKeyTjPF(c, e.fecha||e.created_at)).cons += convPF(Number(e.monto||0), e.moneda==='USD'?'USD':'ARS', c.moneda); });
      });
      [R.pagoGastos, R.pagoGastosPers].forEach(function(arr){ (arr||[]).forEach(function(p){
        if (!(p.cuenta_id===c.id && p.created_at && new Date(p.created_at).getTime()>ts)) return;
        var m = (p.moneda||'ARS')===c.moneda ? Number(p.monto||0) : (c.moneda==='USD' ? convPF(Number(p.monto_ars||0),'ARS','USD') : Number(p.monto_ars||0));
        b(cicloKeyTjPF(c, p.fecha||p.created_at)).cons += m;
      }); });
      movimientosPF.forEach(function(mv){
        if (!(mv.created_at && new Date(mv.created_at).getTime()>ts)) return;
        if (mv.cuenta_destino===c.id) b(pagoKeyTjPF(c, mv.fecha||mv.created_at)).pag += Number(mv.monto_destino||0);
        if (mv.cuenta_origen===c.id) b(cicloKeyTjPF(c, mv.fecha||mv.created_at)).cons += Number(mv.monto_origen||0);
      });
      return mp;
    }
    function fmtTjPF(c, n) { return c.moneda==='USD' ? 'USD '+(Math.round(n*100)/100) : fmt(Math.round(n)); }
    function renderTarjetasMesPF(box) {
      var tjs = cuentasPF.filter(function(c){ return c.tipo==='tarjeta'; });
      if (!tjs.length) return;
      var hoyF = fechaLocalPF(Date.now());
      box.appendChild(el('div',{style:'font-weight:700;font-size:14px;color:#1a2e4a;margin:18px 0 4px'},'💳 Tarjetas por ciclo'));
      box.appendChild(el('div',{style:'font-size:11px;color:#64748B;margin-bottom:8px;line-height:1.5'},'Poné el día habitual de cierre y vencimiento de cada tarjeta; después, en cada ciclo, corregí las fechas exactas del mes (cambian de un mes a otro). Se muestra el ciclo en curso y los anteriores que todavía no están pagos.'));
      tjs.forEach(function(c){
        var mp = tjMesesPF(c), hoyK = cicloKeyTjPF(c, hoyF), keys = [hoyK];
        for (var qi=1; qi<=4; qi++) { var qk = ymSumaPF(hoyK,-qi), qx = mp[qk] || {cons:0,pag:0}, qreal = (resumenesTjPF[c.id]||{})[qk]; if (((qreal||qx.cons) - qx.pag) > 0.5) keys.push(qk); }
        var cab2 = el('div',{style:'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 4px'});
        cab2.appendChild(el('div',{style:'font-weight:600;font-size:13px;color:#1a2e4a'},'💳 '+c.nombre+' · debés '+fmtTjPF(c, Math.max(0,-saldoCuentaPF(c)))));
        var cf = cicloTjPF[c.id] || {};
        var iCi = el('input',{type:'number',min:'1',max:'31',value:cf.cierre||'',placeholder:'19',style:'width:48px;padding:3px 5px;border:1px solid #CBD5E1;border-radius:6px;text-align:center;font-size:12px'});
        var iVe = el('input',{type:'number',min:'1',max:'31',value:cf.venc||'',placeholder:'2',style:'width:48px;padding:3px 5px;border:1px solid #CBD5E1;border-radius:6px;text-align:center;font-size:12px'});
        function guardaCfg(){ guardarCicloTjPF(c.id, Number(iCi.value||0), Number(iVe.value||0)).then(function(){ renderAll(); }); }
        iCi.onchange = guardaCfg; iVe.onchange = guardaCfg;
        var cfgBox = el('span',{style:'font-size:11px;color:#64748B'}); cfgBox.appendChild(document.createTextNode('Cierra el día ')); cfgBox.appendChild(iCi); cfgBox.appendChild(document.createTextNode(' · vence el día ')); cfgBox.appendChild(iVe);
        cab2.appendChild(cfgBox); box.appendChild(cab2);
        var tw = el('div',{style:'overflow-x:auto'}), tb = el('table',{class:'tbl',style:'font-size:12px'});
        tb.appendChild(elH('thead',{},'<tr><th>Ciclo</th><th style="text-align:right">Consumo cargado</th><th style="text-align:right">Pagos a la tarjeta</th><th style="text-align:right">Resumen real</th><th style="text-align:right">Diferencia</th></tr>'));
        var tbd = el('tbody');
        keys.forEach(function(k){
          var x = mp[k] || {cons:0, pag:0}, real = (resumenesTjPF[c.id]||{})[k];
          var tr = el('tr',{});
          var tdc = el('td',{style:'font-weight:600;white-space:nowrap'});
          if (cfgTjPF(c)) {
            var dC = el('input',{type:'date',value:cierreFechaTjPF(c,k),style:'padding:2px 4px;border:1px solid #CBD5E1;border-radius:6px;font-size:11px'});
            var dV = el('input',{type:'date',value:vencFechaTjPF(c,k)||'',style:'padding:2px 4px;border:1px solid #CBD5E1;border-radius:6px;font-size:11px'});
            function gf(){ guardarFechasCicloTjPF(c.id, k, dC.value, dV.value).then(function(){ renderAll(); }); }
            dC.onchange = gf; dV.onchange = gf;
            tdc.appendChild(document.createTextNode('Cierra ')); tdc.appendChild(dC); tdc.appendChild(document.createTextNode(' · vence ')); tdc.appendChild(dV);
            if (k===hoyK) tdc.appendChild(document.createTextNode(' (en curso)'));
          } else tdc.appendChild(document.createTextNode(ymEtiqPF(k)+(k===hoyK?' (en curso)':'')));
          tr.appendChild(tdc);
          tr.appendChild(el('td',{style:'text-align:right'}, fmtTjPF(c, x.cons)));
          tr.appendChild(el('td',{style:'text-align:right'}, x.pag>0 ? fmtTjPF(c, x.pag) : '—'));
          var td = el('td',{style:'text-align:right'}), inp = el('input',{type:'number',value:real||'',placeholder:'total resumen',style:'width:110px;padding:4px 6px;border:1px solid #CBD5E1;border-radius:6px;text-align:right;font-size:12px'});
          inp.onchange = function(){ guardarResumenTjPF(c.id, k, Number(inp.value||0)).then(function(){ renderAll(); }); };
          td.appendChild(inp); tr.appendChild(td);
          var dif = real ? real - x.cons : null;
          tr.appendChild(el('td',{style:'text-align:right;font-weight:600;color:'+(dif===null?'#94a3b8':(Math.abs(dif)<1?'#3D8A32':'#A32D2D'))}, dif===null ? '—' : (Math.abs(dif)<1 ? 'OK' : (dif>0?'Falta cargar ':'Sobra ')+fmtTjPF(c, Math.abs(dif)))));
          tbd.appendChild(tr);
        });
        tb.appendChild(tbd); tw.appendChild(tb); box.appendChild(tw);
      });
    }
    function renderProxMesPF() {
      var tjs = cuentasPF.filter(function(c){ return c.tipo==='tarjeta'; });
      var hoyF = fechaLocalPF(Date.now()), hoyK = ymKeyPF(new Date()), sigK = ymSumaPF(hoyK,1);
      var card = el('div',{class:'card',style:'padding:16px;margin-top:14px'});
      card.appendChild(el('div',{class:'st',style:'margin-bottom:4px'},'Tarjetas y gastos a pagar'));
      card.appendChild(el('div',{style:'font-size:11px;color:#64748B;margin-bottom:10px'},'Por vencimiento de cada tarjeta (si cargaste el resumen real, se usa ese) y los gastos sin pagar del mes siguiente.'));
      var total = 0, hayFila = false;
      function fila(txt, valTxt) {
        hayFila = true;
        var f = el('div',{style:'display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:5px 0;border-bottom:1px solid #F1F5F9'});
        f.appendChild(el('span',{}, txt)); f.appendChild(el('b',{}, valTxt)); card.appendChild(f);
      }
      tjs.forEach(function(c){
        var mp = tjMesesPF(c), cfg = cfgTjPF(c), mon = c.moneda==='USD'?'USD':'ARS';
        var keys = cfg ? [ymSumaPF(cicloKeyTjPF(c, hoyF),-1), cicloKeyTjPF(c, hoyF)] : [hoyK];
        keys.forEach(function(k){
          var venc = cfg ? vencFechaTjPF(c,k) : null;
          if (venc && venc < hoyF) return;
          var x = mp[k] || {cons:0, pag:0}, real = (resumenesTjPF[c.id]||{})[k], base = real || Math.max(0, x.cons - x.pag);
          if (!(base > 0) && !real) return;
          var ars = convPF(base, mon, 'ARS'); total += ars;
          fila('💳 '+c.nombre+' · '+(cfg ? 'vence '+ddmmPF(venc) : 'consumo de '+ymEtiqPF(k))+(real?' (resumen real)':''), c.moneda==='USD' ? 'USD '+(Math.round(base*100)/100)+' ≈ '+fmt(Math.round(ars)) : fmt(Math.round(ars)));
        });
        if (!cfg) card.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;padding:2px 0 4px'},'Cargá cierre y vencimiento de '+c.nombre+' en Cuentas para ver la fecha exacta.'));
      });
      var mSig = mesesPF.find(function(x){ return ymKeyPF(new Date(x.year, x.month-1, 1))===sigK; });
      if (mSig) {
        var pend = gastosPF.filter(function(g){ return g.mes_id===mSig.id && !g.pagado; });
        var sum = pend.reduce(function(a,g){ return a + saldoPF(g) + Math.max(0, Number(g.monto_usd||0) - entregadoUSDPF(g))*tcUSD; }, 0);
        total += sum; fila('Gastos cargados de '+ymEtiqPF(sigK)+' ('+pend.length+')', fmt(Math.round(sum)));
      } else card.appendChild(el('div',{style:'font-size:12px;color:#94a3b8;padding:5px 0'},'Todavía no está generado el mes siguiente.'));
      var ft = el('div',{style:'display:flex;justify-content:space-between;font-size:14px;padding-top:8px'}); ft.appendChild(el('b',{},'Total estimado')); ft.appendChild(el('b',{style:'color:#854F0B'}, fmt(Math.round(total)))); card.appendChild(ft);
      content.appendChild(card);
    }
    function renderCuentasPF() {
      var box = el('div',{class:'card',style:'padding:20px;margin-bottom:14px;background:#fff'});
      var top = el('div',{style:'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px'});
      top.appendChild(el('div',{style:'font-weight:700;font-size:15px;color:#1a2e4a'},'💳 Cuentas'));
      var acc = el('div',{style:'display:flex;gap:8px;flex-wrap:wrap'});
      var bMov = el('button',{class:'btn btnp btnsm'},'↔ Mover plata / comprar USD');
      var bNew = el('button',{class:'btn btnsm'},'+ Nueva cuenta');
      acc.appendChild(bMov); acc.appendChild(bNew); top.appendChild(acc); box.appendChild(top);
      if (!cuentasPF.length) {
        box.appendChild(el('div',{style:'font-size:13px;color:#64748B;line-height:1.5'},'Todavía no hay cuentas. Corré el SQL de cuentas en Supabase y recargá.'));
        content.appendChild(box); return;
      }
      var kp = el('div',{style:'display:flex;gap:24px;flex-wrap:wrap;margin-bottom:14px'});
      function kpi(l,v,c){ var x=el('div',{}); x.appendChild(el('div',{style:'font-size:11px;color:#64748B'},l)); x.appendChild(el('div',{style:'font-size:17px;font-weight:700;color:'+c},v)); kp.appendChild(x); }
      kpi('Disponible en pesos', fmt(Math.round(disponibleArsPF())), '#3D8A32');
      kpi('Dólares', 'USD '+(Math.round(disponibleUsdPF()*100)/100), '#0B9EDA');
      kpi('Descubierto', fmt(Math.round(descubiertoPF())), descubiertoPF()<0 ? '#A32D2D' : '#64748B');
      if (consumoTarjetaPF() > 0) kpi('Consumo en tarjeta', fmt(Math.round(consumoTarjetaPF())), '#854F0B');
      if (reservadoArsPF() > 0) kpi('Reservado en pesos', fmt(Math.round(reservadoArsPF())), '#854F0B');
      if (reservadoUsdPF() > 0) kpi('Reservado en USD', 'USD '+(Math.round(reservadoUsdPF()*100)/100), '#854F0B');
      box.appendChild(kp);
      var grupos = [], gmap = {};
      cuentasPF.forEach(function(c){ var k = instCtaPF(c); if (!gmap[k]) { gmap[k] = {k:k, items:[]}; grupos.push(gmap[k]); } gmap[k].items.push(c); });
      grupos.forEach(function(g) {
        g.items.sort(function(a,b){ return (a.moneda==='USD'?1:0) - (b.moneda==='USD'?1:0); });
        var card = el('div',{style:'border:1px solid #E2E8F0;border-radius:12px;padding:0 14px;margin-bottom:10px;background:#fff'});
        var bm = marcaCtaPF(g.k);
        var sumArs = 0, sumUsd = 0, resArs = 0, resUsd = 0, deudaTj = 0, esTj = g.items.every(function(c){ return c.tipo==='tarjeta'; });
        g.items.forEach(function(c){ var v = saldoCuentaPF(c); if (c.tipo==='tarjeta') { deudaTj += convPF(Math.max(0,-v), c.moneda==='USD'?'USD':'ARS', 'ARS'); return; } if (c.moneda==='USD') { if (c.reservada) resUsd += v; else sumUsd += v; } else { if (c.reservada) resArs += v; else sumArs += v; } });
        var cab = el('div',{style:'display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer;user-select:none'});
        if (bm.img) cab.appendChild(el('img',{src:bm.img,alt:g.k,style:'width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #E2E8F0;background:#fff;flex:0 0 auto'}));
        else cab.appendChild(el('div',{style:'width:36px;height:36px;border-radius:50%;background:'+bm.c+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:'+(bm.t.length>2?'13':'15')+'px;flex:0 0 auto'}, bm.t));
        cab.appendChild(el('div',{style:'font-weight:700;font-size:14px;color:#1a2e4a;flex:1;min-width:90px'}, g.k));
        var resu = el('div',{style:'display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;justify-content:flex-end'});
        if (esTj) resu.appendChild(el('span',{style:'font-size:14px;font-weight:700;color:'+(deudaTj>0?'#854F0B':'#64748B')}, 'Debés '+fmt(Math.round(deudaTj))));
        else resu.appendChild(el('span',{style:'font-size:14px;font-weight:700;color:'+(sumArs<0?'#A32D2D':'#1a2e4a')}, fmt(Math.round(sumArs))));
        if (!esTj && g.items.some(function(c){ return c.moneda==='USD' && !c.reservada; })) resu.appendChild(el('span',{style:'font-size:14px;font-weight:700;color:#0B9EDA'}, 'USD '+(Math.round(sumUsd*100)/100)));
        if (resArs>0 || resUsd>0) resu.appendChild(el('span',{style:'font-size:12px;font-weight:600;color:#854F0B'}, '🔒 '+[resArs>0?fmt(Math.round(resArs)):'', resUsd>0?'USD '+(Math.round(resUsd*100)/100):''].filter(Boolean).join(' + ')));
        cab.appendChild(resu);
        var chev = el('span',{style:'color:#94a3b8;font-size:12px;width:12px;text-align:center'}, cuentasAbiertasPF[g.k] ? '▾' : '▸');
        cab.appendChild(chev); card.appendChild(cab);
        var cuerpo = el('div',{style:'display:'+(cuentasAbiertasPF[g.k] ? 'block' : 'none')}); card.appendChild(cuerpo);
        cab.onclick = function(){ cuentasAbiertasPF[g.k] = !cuentasAbiertasPF[g.k]; cuerpo.style.display = cuentasAbiertasPF[g.k] ? 'block' : 'none'; chev.textContent = cuentasAbiertasPF[g.k] ? '▾' : '▸'; };
        g.items.forEach(function(c) {
          var sa = saldoCuentaPF(c), usd = c.moneda==='USD';
          var fila = el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:1px solid #F1F5F9'});
          var izq = el('div',{style:'min-width:150px'});
          var rot = c.tipo==='tarjeta' ? c.nombre+' · lo negativo es lo que debés' : (usd ? 'Dólares' : 'Pesos');
          if (c.reservada) rot = c.nombre+' · reservada (no disponible)';
          else if (c.nombre!==g.k && c.tipo!=='tarjeta' && !/^dólares$/i.test(c.nombre)) rot += ' · '+c.nombre;
          if (c.ingreso_default) rot += ' · recibe cobros';
          izq.appendChild(el('div',{style:'font-size:12px;color:#64748B'}, rot));
          izq.appendChild(el('div',{style:'font-size:16px;font-weight:700;color:'+(sa<0?'#A32D2D':(c.reservada?'#854F0B':'#1a2e4a'))}, usd ? 'USD '+(Math.round(sa*100)/100) : fmt(Math.round(sa))));
          izq.appendChild(el('div',{style:'font-size:10px;color:#94a3b8'}, 'base '+(usd?'USD '+c.saldo_inicial:fmt(Number(c.saldo_inicial)))+' al '+fmtFechaHoraPF(new Date(c.saldo_inicial_ts).getTime())));
          fila.appendChild(izq);
          var td = el('div',{style:'white-space:nowrap'});
          var bRes = el('button',{class:'btn btnsm',style:'margin-right:4px'}, c.reservada ? 'Hacer disponible' : 'Reservar'); bRes.onclick = function(){ dbUpd('panel_pf_cuentas', c.id, {reservada:!c.reservada}).then(function(){ c.reservada = !c.reservada; renderAll(); }).catch(function(e){ alert('Error: '+e.message+'\n\nSi dice que no existe la columna, falta correr el SQL de reservas.'); }); };
          var bAj = el('button',{class:'btn btnsm'},'Ajustar'); var bDet = el('button',{class:'btn btnsm',style:'margin-left:4px'},'Movimientos'); var bX = el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'×');
          bAj.onclick = function(){ mAjustarCuentaPF(c); }; bDet.onclick = function(){ mMovimientosCuentaPF(c); };
          bX.onclick = function(){ if (!confirm('Quitar la cuenta "'+etiqCtaPF(c)+'"? Los pagos ya cargados no se borran.')) return; dbUpd('panel_pf_cuentas', c.id, {activa:false}).then(function(){ cuentasPF.splice(cuentasPF.indexOf(c),1); renderAll(); }); };
          td.appendChild(bRes); td.appendChild(bAj); td.appendChild(bDet); td.appendChild(bX); fila.appendChild(td); cuerpo.appendChild(fila);
        });
        box.appendChild(card);
      });
      box.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-top:10px;line-height:1.5'},'El saldo = base + ingresos − pagos − movimientos posteriores a la hora de la base. Los cobros del negocio entran a la cuenta marcada "recibe cobros". Si un saldo no coincide con tu banco, tocá Ajustar: te muestra la diferencia que no se explica con lo cargado.'));
      renderTarjetasMesPF(box);
      var movs = movimientosPF.slice().sort(function(a,b){ return new Date(b.created_at)-new Date(a.created_at); }).slice(0,12);
      if (movs.length) {
        box.appendChild(el('div',{style:'font-weight:600;font-size:13px;color:#1a2e4a;margin:16px 0 6px'},'Últimos movimientos entre cuentas'));
        movs.forEach(function(mv){
          var co = cuentasPF.find(function(x){ return x.id===mv.cuenta_origen; }) || {nombre:'?',moneda:'ARS'}, cd = cuentasPF.find(function(x){ return x.id===mv.cuenta_destino; }) || {nombre:'?',moneda:'ARS'};
          function mm(n,c){ return c.moneda==='USD' ? 'USD '+n : fmt(Math.round(Number(n))); }
          var f = el('div',{style:'display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 0;border-bottom:1px solid #F1F5F9'});
          f.appendChild(el('span',{}, fdate(mv.fecha)+' · '+etiqCtaPF(co)+' → '+etiqCtaPF(cd)+' · '+mm(mv.monto_origen,co)+(co.moneda!==cd.moneda ? ' → '+mm(mv.monto_destino,cd)+(mv.tc?' (dólar a '+fmt(Number(mv.tc))+')':'') : '')+(mv.notas?' · '+mv.notas:'')));
          var bd = el('button',{class:'btn btnsm',style:'background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'×');
          bd.onclick = function(){ if (!confirm('Eliminar este movimiento?')) return; sbFetch('panel_pf_movimientos?id=eq.'+mv.id,{method:'DELETE',prefer:'return=minimal'}).then(function(){ movimientosPF.splice(movimientosPF.indexOf(mv),1); renderAll(); }); };
          f.appendChild(bd); box.appendChild(f);
        });
      }
      bNew.onclick = function(){ mNuevaCuentaPF(); };
      bMov.onclick = function(){ mMoverPlataPF(); };
      content.appendChild(box);
    }
    function mNuevaCuentaPF() {
      var insts = []; cuentasPF.forEach(function(c){ var k = instCtaPF(c); if (c.tipo!=='tarjeta' && insts.indexOf(k)<0) insts.push(k); });
      openM(makeModal('Nueva cuenta', function(body) {
        var dl = el('datalist',{id:'nc-insts'}); insts.forEach(function(k){ dl.appendChild(el('option',{value:k})); }); body.appendChild(dl);
        var inpI = mkInput('nc-inst','text','','Ej: Mercado Pago, Santander'); inpI.setAttribute('list','nc-insts');
        addFg(body, 'Banco / billetera', inpI);
        addFg(body, 'Tipo', mkSelect('nc-tipo',[['normal','Cuenta normal (disponible)'],['reserva','Reserva / inversión / plazo fijo (no disponible)']],'normal'));
        addFg(body, 'Nombre (solo para reservas, ej: Plazo fijo, Reserva auto)', mkInput('nc-nom','text','','Ej: Plazo fijo'));
        mkRow2(body, mkFg('Moneda', mkSelect('nc-mon',[['ARS','Pesos'],['USD','Dólares']],'ARS')), mkFg('Saldo de hoy', mkInput('nc-sal','number','0')));
        body.appendChild(el('div',{style:'font-size:11px;color:#64748B;line-height:1.5'},'Una reserva no cuenta como plata disponible ni cubre pagos. Para llenarla usá "Mover plata"; para sumar intereses usá "Ajustar".'));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button',{class:'btn btnp'},'Crear');
        ok.onclick = function() {
          var inst = gv('nc-inst').trim(); if (!inst) { alert('Poné el banco o billetera'); return; }
          var res = gv('nc-tipo')==='reserva', nom = gv('nc-nom').trim() || (res ? 'Reserva' : inst);
          dbIns('panel_pf_cuentas', {nombre:nom, institucion:inst, moneda:gv('nc-mon'), reservada:res, saldo_inicial:Number(gv('nc-sal')||0), orden:cuentasPF.length+1}).then(function(r){ if (r&&r[0]) cuentasPF.push(r[0]); closeM(); renderAll(); }).catch(function(e){ alert('Error: '+e.message); });
        };
        foot.appendChild(ok);
      }));
    }
    function mAjustarCuentaPF(c) {
      var calc = saldoCuentaPF(c), usd = c.moneda==='USD';
      openM(makeModal('Ajustar — '+etiqCtaPF(c), function(body) {
        body.appendChild(el('div',{class:'ibox'},'Saldo según lo cargado: '+(usd?'USD '+(Math.round(calc*100)/100):fmt(Math.round(calc)))));
        var inp = mkInput('aj-real','number',Math.round(calc*100)/100);
        addFg(body, 'Saldo real hoy (el que ves en la app del banco)', inp);
        var dif = el('div',{style:'font-size:12px;font-weight:600;margin:-4px 0 8px'});
        function pintar(){ var d = Number(gv('aj-real')||0) - calc; dif.style.color = Math.abs(d)<1 ? '#3D8A32' : '#A32D2D'; dif.textContent = Math.abs(d)<1 ? 'Coincide con lo cargado.' : 'Hay '+(usd?'USD '+(Math.round(d*100)/100):fmt(Math.round(d)))+' que no se explican con los movimientos cargados (un pago, ingreso o transferencia sin cargar).'; }
        inp.oninput = pintar; pintar(); body.appendChild(dif);
        body.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;line-height:1.4'},'Al guardar, ese saldo pasa a ser la nueva base de la cuenta, con la hora de ahora.'));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button',{class:'btn btnp'},'Guardar saldo real');
        ok.onclick = function() {
          var real = Number(gv('aj-real')||0), iso = new Date().toISOString();
          dbUpd('panel_pf_cuentas', c.id, {saldo_inicial:real, saldo_inicial_ts:iso}).then(function(){ c.saldo_inicial = real; c.saldo_inicial_ts = iso; closeM(); renderAll(); }).catch(function(e){ alert('Error: '+e.message); });
        };
        foot.appendChild(ok);
      }));
    }
    function mMovimientosCuentaPF(c) {
      var usd = c.moneda==='USD';
      openM(makeModal('Movimientos — '+etiqCtaPF(c), function(body) {
        var lista = movimientosCuentaPF(c).sort(function(a,b){ return b.t-a.t; });
        body.appendChild(el('div',{style:'font-size:12px;color:#64748B;margin-bottom:8px'},'Desde la base: '+(usd?'USD '+c.saldo_inicial:fmt(Number(c.saldo_inicial)))+' ('+fmtFechaHoraPF(new Date(c.saldo_inicial_ts).getTime())+')'));
        if (!lista.length) body.appendChild(el('div',{style:'font-size:13px;color:#94a3b8'},'Sin movimientos después de la base.'));
        lista.forEach(function(x){
          var f = el('div',{style:'display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid #F1F5F9;gap:10px'});
          f.appendChild(el('span',{}, fmtFechaHoraPF(x.t)+' · '+x.det));
          f.appendChild(el('b',{style:'color:'+(x.monto<0?'#A32D2D':'#3D8A32')}, (x.monto<0?'−':'+')+(usd?'USD '+(Math.round(Math.abs(x.monto)*100)/100):fmt(Math.round(Math.abs(x.monto))))));
          body.appendChild(f);
        });
      }, function(foot) { foot.appendChild(cancelBtn()); }));
    }
    function mMoverPlataPF() {
      var opts = cuentasPF.map(function(c){ return [c.id, etiqCtaPF(c)]; });
      var usdId = cuentaCompraUsdPF();
      openM(makeModal('Mover plata entre cuentas', function(body) {
        var sO = mkSelect('mv-o', opts, opts[0] ? opts[0][0] : ''), sD = mkSelect('mv-d', opts, usdId || (opts[1] ? opts[1][0] : ''));
        mkRow2(body, mkFg('Sale de', sO), mkFg('Entra a', sD));
        var inpM = mkInput('mv-m','number','');
        var inpTc = mkInput('mv-tc','number',Math.round(tcUSD));
        mkRow2(body, mkFg('Monto que sale', inpM), mkFg('Fecha', mkInput('mv-f','date',new Date().toISOString().slice(0,10))));
        var fgTc = mkFg('Precio del dólar ($ por USD)', inpTc); body.appendChild(fgTc);
        var res = el('div',{style:'font-size:12px;font-weight:600;color:#1a2e4a;margin:-2px 0 10px'}); body.appendChild(res);
        addFg(body, 'Nota (opcional)', mkInput('mv-n','text','','ej: compra USD para Susana, cubrir descubierto'));
        function cta(id){ return cuentasPF.find(function(x){ return x.id===id; }); }
        function calc() {
          var o = cta(sO.value), d = cta(sD.value); if (!o||!d) return null;
          var m = Number(inpM.value||0), tc = Number(inpTc.value||0), dif = o.moneda!==d.moneda;
          fgTc.style.display = dif ? '' : 'none';
          var dest = !dif ? m : (o.moneda==='USD' ? m*tc : (tc>0 ? m/tc : 0));
          res.textContent = m>0 ? ('Entra: '+(d.moneda==='USD'?'USD '+(Math.round(dest*100)/100):fmt(Math.round(dest)))) : '';
          return {o:o,d:d,m:m,tc:dif?tc:null,dest:dest,dif:dif};
        }
        [sO,sD,inpM,inpTc].forEach(function(x){ x.oninput = calc; x.onchange = calc; }); calc();
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button',{class:'btn btnp'},'Registrar');
        ok.onclick = function() {
          var o = cuentasPF.find(function(x){ return x.id===gv('mv-o'); }), d = cuentasPF.find(function(x){ return x.id===gv('mv-d'); });
          var m = Number(gv('mv-m')||0), tc = Number(gv('mv-tc')||0);
          if (!o||!d||o.id===d.id) { alert('Elegí dos cuentas distintas'); return; }
          if (!(m>0)) { alert('Poné el monto'); return; }
          var dif = o.moneda!==d.moneda; if (dif && !(tc>0)) { alert('Poné el precio del dólar'); return; }
          var dest = !dif ? m : (o.moneda==='USD' ? m*tc : m/tc);
          ok.disabled = true;
          dbIns('panel_pf_movimientos', {fecha:gv('mv-f')||null, cuenta_origen:o.id, cuenta_destino:d.id, monto_origen:m, monto_destino:Math.round(dest*100)/100, tc:dif?tc:null, notas:gv('mv-n')||null})
            .then(function(r){ if (r&&r[0]) movimientosPF.push(r[0]); closeM(); renderAll(); }).catch(function(e){ ok.disabled=false; alert('Error: '+e.message); });
        };
        foot.appendChild(ok);
      }));
    }

    // ---- Estado persistente del asesor (panel_config, clave 'pf_asesor') ----
    var asesorEstPF = (function(){
      var r = (config||[]).find(function(c){ return c.clave==='pf_asesor'; });
      if (!r) return {};
      try { return JSON.parse(r.valor) || {}; } catch(e) { return {}; }
    })();
    var _asesorBusyPF = false, _asesorFalloPF = null;
    function guardarAsesorEstPF(patch) {
      Object.assign(asesorEstPF, patch);
      return sbFetch('panel_config?on_conflict=clave', {method:'POST', body:{clave:'pf_asesor', valor:JSON.stringify(asesorEstPF)}, prefer:'resolution=merge-duplicates,return=minimal'}).catch(function(){});
    }
    // ---- Consumo de tokens del asesor (panel_config, clave 'pf_asesor_uso') ----
    var usoAsesorPF = (function(){ var r = (config||[]).find(function(c){ return c.clave==='pf_asesor_uso'; }); if (!r) return {}; try { return JSON.parse(r.valor)||{}; } catch(e) { return {}; } })();
    function registrarUsoAsesorPF(d) {
      var k = new Date().toISOString().slice(0,7), u = usoAsesorPF[k] = usoAsesorPF[k] || {calls:0, tin:0, tout:0};
      u.calls += 1; u.tin += Number(d.tokens_in||0); u.tout += Number(d.tokens_out||0);
      sbFetch('panel_config?on_conflict=clave', {method:'POST', body:{clave:'pf_asesor_uso', valor:JSON.stringify(usoAsesorPF)}, prefer:'resolution=merge-duplicates,return=minimal'}).catch(function(){});
      try { var el2 = document.getElementById('asesor-uso-pf'); if (el2) el2.textContent = textoUsoAsesorPF(); } catch(e) {}
    }
    var gastoRealAsesorPF = null;
    function consultarGastoRealPF(el2) {
      var tok = window._authToken; if (!tok) return;
      el2.textContent = 'Consultando gasto real...';
      qpRefrescarSesion(false).then(function(){ return fetch(SB_URL+'/functions/v1/asesor-pf', {method:'POST', headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+window._authToken}, body:JSON.stringify({modo:'uso'})}); })
        .then(function(r){ return r.json().catch(function(){ return {}; }); })
        .then(function(d){
          if (d.error) { el2.textContent = 'Gasto real: '+d.error; return; }
          gastoRealAsesorPF = d;
          var det = Object.keys(d.por_modelo||{}).filter(function(k){ return d.por_modelo[k] > 0; }).map(function(k){ return k+' US$ '+d.por_modelo[k].toFixed(2); }).join(' · ');
          el2.textContent = 'Gasto real de la API este mes (toda la cuenta): US$ '+Number(d.total_usd||0).toFixed(2)+(det ? ' · '+det : '');
        }).catch(function(e){ el2.textContent = 'Gasto real: '+e.message; });
    }
    function textoUsoAsesorPF() {
      var k = new Date().toISOString().slice(0,7), u = usoAsesorPF[k];
      function f(n){ return n>=1000 ? (Math.round(n/100)/10)+'k' : String(n); }
      if (!u || !u.calls) return 'Consumo del asesor este mes: sin consultas todavía';
      return 'Consumo del asesor este mes: '+u.calls+' consulta'+(u.calls!==1?'s':'')+' · '+f(u.tin)+' tokens de entrada · '+f(u.tout)+' de salida';
    }
    function hashAsesorPF(o) { var s2 = JSON.stringify(o), h = 5381; for (var i=0;i<s2.length;i++) h = ((h<<5)+h+s2.charCodeAt(i))|0; return String(h); }
    function fmtFechaHoraPF(ts) { var d = new Date(ts); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }


    // ---- CUENTAS: cada cuenta arranca con un saldo base (con hora) y se mueve con los pagos, ingresos y movimientos posteriores ----
    var cuentasPF = (R.cuentasPF||[]), movimientosPF = (R.movimientosPF||[]), pagosCobroPF = (R.pagosCobroPF||[]);
    function fechaLocalPF(ts) { var d = new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
    function convPF(monto, de, a) { de = de||'ARS'; a = a||'ARS'; if (de===a) return monto; return de==='USD' ? monto*tcUSD : monto/tcUSD; }
    function montoGastoEnCuentaPF(g, c) {
      var remARS = Math.max(0, Number(g.monto||0) - entregadoPF(g)), remUSD = saldoUSDPF(g);
      if (c.moneda === 'USD') {
        if (remUSD > 0) return remUSD + remARS/tcUSD;
        if (Number(g.prestamo_monto||0) > 0 && remARS > 0) return Number(g.prestamo_monto);
        return remARS/tcUSD;
      }
      return remARS + remUSD*tcUSD;
    }
    function movimientosCuentaPF(c) {
      var ts = new Date(c.saldo_inicial_ts||0).getTime(), out = [];
      ingresosPF.forEach(function(i){ if (i.cuenta_id===c.id && i.created_at && new Date(i.created_at).getTime()>ts) out.push({t:new Date(i.created_at).getTime(), monto:convPF(Number(i.monto||0),'ARS',c.moneda), det:'Ingreso: '+(i.concepto||i.categoria||'')}); });
      if (c.moneda !== 'USD') {
        var defId = cuentaDefaultIngresoPF(), conPagos = {};
        pagosCobroPF.forEach(function(pg){
          conPagos[pg.cobro_id] = true;
          var dest = pg.cuenta_id || defId;
          if (dest===c.id && pg.created_at && new Date(pg.created_at).getTime()>ts) out.push({t:new Date(pg.created_at).getTime(), monto:Number(pg.monto||0), det:'Cobro del negocio'});
        });
        if (c.ingreso_default) {
          var dTs = fechaLocalPF(ts);
          cobros.forEach(function(co){ if (!co.id || conPagos[co.id]) return; if (co.fecha_pago && String(co.fecha_pago).slice(0,10) > dTs && String(co.fecha_pago).slice(0,10) <= fechaLocalPF(Date.now())) out.push({t:new Date(co.fecha_pago+'T12:00:00').getTime(), monto:Number(co.monto||0), det:'Cobro: '+(co.descripcion||co.tipo_cobro||'')}); });
        }
      }
      gastosPF.forEach(function(g){
        if (g.pagado && g.cuenta_id===c.id && g.pagado_at && new Date(g.pagado_at).getTime()>ts) { var a = montoGastoEnCuentaPF(g, c); if (a > 0) out.push({t:new Date(g.pagado_at).getTime(), monto:-a, det:'Pago: '+(g.concepto||'')}); }
        (g._entregas||[]).forEach(function(e){ if (e.cuenta_id===c.id && e.created_at && new Date(e.created_at).getTime()>ts) out.push({t:new Date(e.created_at).getTime(), monto:-convPF(Number(e.monto||0), e.moneda==='USD'?'USD':'ARS', c.moneda), det:'Entrega: '+(g.concepto||'')}); });
      });
      [['Gasto del negocio', R.pagoGastos], ['Gasto personal fijo', R.pagoGastosPers]].forEach(function(par){
        (par[1]||[]).forEach(function(p){
          if (!(p.cuenta_id===c.id && p.created_at && new Date(p.created_at).getTime()>ts)) return;
          var m = (p.moneda||'ARS')===c.moneda ? Number(p.monto||0) : (c.moneda==='USD' ? convPF(Number(p.monto_ars||0),'ARS','USD') : Number(p.monto_ars||0));
          out.push({t:new Date(p.created_at).getTime(), monto:-m, det:par[0]+': '+((p._gasto&&p._gasto.nombre)||'')});
        });
      });
      movimientosPF.forEach(function(mv){
        if (!(mv.created_at && new Date(mv.created_at).getTime()>ts)) return;
        if (mv.cuenta_destino===c.id) out.push({t:new Date(mv.created_at).getTime(), monto:Number(mv.monto_destino||0), det:'Movimiento entrante'+(mv.notas?': '+mv.notas:'')});
        if (mv.cuenta_origen===c.id) out.push({t:new Date(mv.created_at).getTime(), monto:-Number(mv.monto_origen||0), det:'Movimiento saliente'+(mv.notas?': '+mv.notas:'')});
      });
      return out;
    }
    function saldoCuentaPF(c) { return Number(c.saldo_inicial||0) + movimientosCuentaPF(c).reduce(function(a,x){ return a + x.monto; }, 0); }
    function disponibleArsPF() { return cuentasPF.filter(function(c){ return c.moneda!=='USD' && !c.reservada && c.tipo!=='tarjeta'; }).reduce(function(a,c){ return a + Math.max(0, saldoCuentaPF(c)); }, 0); }
    function disponibleUsdPF() { return cuentasPF.filter(function(c){ return c.moneda==='USD' && !c.reservada && c.tipo!=='tarjeta'; }).reduce(function(a,c){ return a + Math.max(0, saldoCuentaPF(c)); }, 0); }
    function reservadoArsPF() { return cuentasPF.filter(function(c){ return c.moneda!=='USD' && c.reservada && c.tipo!=='tarjeta'; }).reduce(function(a,c){ return a + Math.max(0, saldoCuentaPF(c)); }, 0); }
    function reservadoUsdPF() { return cuentasPF.filter(function(c){ return c.moneda==='USD' && c.reservada && c.tipo!=='tarjeta'; }).reduce(function(a,c){ return a + Math.max(0, saldoCuentaPF(c)); }, 0); }
    function consumoTarjetaPF() { return cuentasPF.filter(function(c){ return c.tipo==='tarjeta'; }).reduce(function(a,c){ return a + convPF(Math.max(0, -saldoCuentaPF(c)), c.moneda==='USD'?'USD':'ARS', 'ARS'); }, 0); }
    function descubiertoPF() { return cuentasPF.filter(function(c){ return c.moneda!=='USD' && c.tipo!=='tarjeta'; }).reduce(function(a,c){ return a + Math.min(0, saldoCuentaPF(c)); }, 0); }
    function instCtaPF(c) { return c.tipo==='tarjeta' ? 'Tarjetas' : (c.institucion || c.nombre); }
    function etiqCtaPF(c) {
      if (c.tipo==='tarjeta') return '💳 '+c.nombre;
      var inst = instCtaPF(c), mon = c.moneda==='USD' ? 'USD' : 'pesos';
      if (c.reservada) return c.nombre+' ('+inst+' '+mon+', reservada)';
      return inst+' · '+mon;
    }
    function selCuentaPF(id, def) { return mkSelect(id, [['','(sin asignar)']].concat(cuentasPF.map(function(c){ return [c.id, etiqCtaPF(c)]; })), def||''); }
    function claveCtaPF(t) { return String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().slice(0,40); }
    function ultimaCuentaPF(concepto) { try { var mp = JSON.parse(localStorage.getItem('qp_ultima_cuenta')||'{}'); var id = mp[claveCtaPF(concepto)]; if (id && cuentasPF.some(function(c){ return c.id===id; })) return id; } catch(e) {} return ''; }
    function recordarCuentaPF(concepto, id) { try { var mp = JSON.parse(localStorage.getItem('qp_ultima_cuenta')||'{}'); mp[claveCtaPF(concepto)] = id||''; localStorage.setItem('qp_ultima_cuenta', JSON.stringify(mp)); } catch(e) {} }
    function cuentaDefaultIngresoPF() { var c = cuentasPF.find(function(x){ return x.ingreso_default; }); return c ? c.id : ''; }
    function cuentaUsdPF() { var us = cuentasPF.filter(function(x){ return x.moneda==='USD' && !x.reservada && x.tipo!=='tarjeta'; }); var c = us.find(function(x){ return /santander|r[ií]o/i.test(instCtaPF(x)); }) || us[0]; return c ? c.id : ''; }
    function cuentaCompraUsdPF() { var us = cuentasPF.filter(function(x){ return x.moneda==='USD' && !x.reservada && x.tipo!=='tarjeta'; }); var c = us.find(function(x){ return /naranja/i.test(instCtaPF(x)) && x.tipo!=='tarjeta'; }) || us[0]; return c ? c.id : ''; }
    // Marcar un gasto como pagado pidiendo la cuenta
    function mMarcarPagadoPF(g, onDone) {
      var defId = (Number(g.prestamo_monto||0)>0 || (usdTotalPF(g)>0 && Number(g.monto||0)===0)) ? (cuentaUsdPF() || cuentaDefaultIngresoPF()) : cuentaDefaultIngresoPF();
      openM(makeModal('Marcar pagado — '+(g.concepto||'gasto'), function(body) {
        addFg(body, '¿De qué cuenta salió?', selCuentaPF('mpg-cuenta', defId));
        body.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;line-height:1.4'},'El saldo de esa cuenta baja solo. Si pagaste desde una cuenta en dólares, descuenta los USD.'));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button',{class:'btn btnp'},'Marcar pagado');
        ok.onclick = function() {
          var cid = gv('mpg-cuenta')||null, iso = new Date().toISOString();
          ok.disabled = true; ok.textContent = 'Guardando...';
          dbUpd('panel_pf_gastos', g.id, {pagado:true, pagado_at:iso, cuenta_id:cid}).then(function(){
            g.pagado = true; g.pagado_at = iso; g.cuenta_id = cid; recordarCuentaPF(g.concepto, cid);
            return sincPagoPrestamoPF(g, true);
          }).then(function(){ closeM(); onDone(); }).catch(function(e){ ok.disabled=false; ok.textContent='Marcar pagado'; alert('Error: '+e.message+'\n\nSi dice que no existe la columna, falta correr el SQL de cuentas.'); });
        };
        foot.appendChild(ok);
      }));
    }

    // ---- Caja calculada desde el panel: sueldo depositado + ingresos cargados - pagos hechos del mes ----
    function efectivoDetallePF(m) {
      m = m || getMesPF(mesSeleccionadoPF); if (!m) return null;
      var hoy = new Date().toISOString().slice(0,10);
      var j = juanPF.find(function(x){ return x.mes_id===m.id; })||{};
      var sueldo = Number(calcJuanTotalsPF(j, m.month).juanSueldo)||0;
      var ing = ingresosPF.filter(function(i){ return i.mes_id===m.id && (!i.fecha || String(i.fecha).slice(0,10) <= hoy); })
        .reduce(function(a,i){ return a + Number(i.monto||0); }, 0);
      var cobL = (cobros||[]).filter(function(c){ return c.fecha_pago && String(c.fecha_pago).slice(0,7)===(m.year+'-'+String(m.month).padStart(2,'0')) && String(c.fecha_pago).slice(0,10) <= hoy; });
      var cob = cobL.reduce(function(a,c){ return a + Number(c.monto||0); }, 0);
      var pag = gastosPF.filter(function(g){ return g.mes_id===m.id; }).reduce(function(a,g){
        if (g.pagado) return a + Number(g.monto||0) + Number(g.monto_usd||0)*tcUSD;
        return a + Math.max(0, Number(g.monto||0) - saldoPF(g)) + Math.max(0, usdTotalPF(g) - saldoUSDPF(g))*tcUSD;
      }, 0);
      var calc = sueldo+ing+cob-pag;
      var conCuentas = cuentasPF.length > 0;
      return {valor:(conCuentas ? disponibleArsPF() : calc), calculado:calc, origen:(conCuentas ? 'cuentas' : 'panel'), sueldo:sueldo, ing:ing, cob:cob, pag:pag, cobL:cobL};
    }
    function efectivoPF(m) { var d = efectivoDetallePF(m); return d ? Math.round(d.valor) : 0; }
    function lineaEfectivoPF() {
      var d = efectivoDetallePF(); if (!d) return '';
      if (d.origen === 'cuentas') {
        var partes = cuentasPF.map(function(c){ var sa = saldoCuentaPF(c); return etiqCtaPF(c)+' '+(c.moneda==='USD' ? 'USD '+(Math.round(sa*100)/100) : fmt(Math.round(sa))); });
        return 'Cuentas: '+partes.join(' · ')+'. Disponible en pesos: '+fmt(Math.round(d.valor))+(descubiertoPF()<0 ? ' · descubierto '+fmt(Math.round(descubiertoPF())) : '')+'.';
      }
      return 'Caja según el panel: sueldo depositado '+fmt(d.sueldo)+' + ingresos cargados '+fmt(d.ing)+' + cobros del negocio '+fmt(d.cob)+' − pagos hechos '+fmt(d.pag)+' = '+fmt(d.valor)+'. No incluye saldo de meses anteriores.';
    }

    // Llama a la Edge Function asesor-pf. o: {efectivo, diaDS, pregunta, modo:'completo'|'gasto', gastoNuevo}
    function llamarAsesorPF(m, o) {
      var tok = window._authToken;
      if (!tok) return Promise.reject(new Error('Sesión no válida. Ingresá de nuevo al panel.'));
      var ing = Number(o.ingreso)||0;
      var datos = datosAsesorPF(m, Number(o.efectivo||0), o.diaDS);
      var hash = hashAsesorPF(datos);
      if (ing > 0) { datos.ingreso_nuevo = ing; datos.efectivo_antes_del_ingreso = Number(o.efectivo||0) - ing; }
      datos.efectivo_origen = 'Calculado por el panel: sueldo depositado + ingresos personales cargados + cobros del negocio cobrados - pagos hechos del mes. No incluye saldo de meses anteriores ni plata que no este cargada en el panel. Todo lo listado en caja_detalle YA esta cobrado/pagado y ya esta sumado/restado en efectivo_hoy: no pidas marcarlo como cobrado ni lo confundas con los cobros pendientes (por_cobrar_negocio), que son otros.';
      if (cuentasPF.length) {
        datos.efectivo_origen = 'Suma de saldos en pesos de las cuentas de Juan (solo saldos positivos). Cada pago, ingreso y movimiento de plata se registra con su cuenta, asi que los saldos se actualizan solos; se corrigen cuando Juan ajusta una cuenta con su saldo real. El descubierto del Banco Rio (saldo negativo) no es plata disponible: se repite todos los meses, su costo son los intereses, y todo ingreso que entre a esa cuenta se come primero el descubierto. Los dolares disponibles cubren los pagos en USD (ej: Susana) antes de usar pesos.';
        datos.cuentas = cuentasPF.map(function(c){ var sa = saldoCuentaPF(c); return {nombre:etiqCtaPF(c), moneda:c.moneda, saldo:(c.moneda==='USD' ? Math.round(sa*100)/100 : Math.round(sa)), tipo:(c.tipo==='tarjeta' ? 'tarjeta (saldo negativo = consumos nuevos que hay que pagar)' : (c.reservada ? 'reservada (no disponible)' : (sa<0 ? 'descubierto' : 'disponible')))}; });
        datos.descubierto_total = Math.round(descubiertoPF());
        datos.usd_disponibles = Math.round(disponibleUsdPF()*100)/100;
        datos.consumo_nuevo_en_tarjeta = Math.round(consumoTarjetaPF());
        datos.usd_reservados_no_tocar = Math.round(reservadoUsdPF()*100)/100;
        datos.pesos_reservados_no_tocar = Math.round(reservadoArsPF());
        datos.nota_reservas = 'Las cuentas marcadas reservada (por ejemplo la reserva en dolares para la juntada) NO son plata disponible ni cubren pagos: no las uses para armar la caja.';
      }
      var dc = efectivoDetallePF(m);
      if (dc) datos.caja_detalle = {sueldo_depositado:Math.round(dc.sueldo), ingresos_personales_cargados:Math.round(dc.ing), pagos_hechos_del_mes:Math.round(dc.pag),
        cobros_negocio_ya_cobrados_este_mes:dc.cobL.map(function(c){ return {descripcion:c.descripcion||c.tipo_cobro, monto:Number(c.monto), fecha_pago:c.fecha_pago}; })};
      function enviarAsesor() {
        return fetch(SB_URL+'/functions/v1/asesor-pf', {
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+window._authToken},
          body:JSON.stringify({pregunta:o.pregunta||'', modo:o.modo||'completo', gasto_nuevo:o.gastoNuevo||null, mensajes:o.historial||[], datos:datos})
        }).then(function(r) {
          return r.json().catch(function(){ return {}; }).then(function(d){ d._status=r.status; return d; });
        });
      }
      return qpRefrescarSesion(false).then(enviarAsesor).then(function(d) {
        if (d._status===401 || /jwt/i.test(String(d.error||d.message||''))) {
          return qpRefrescarSesion(true).then(function(ok){ return ok ? enviarAsesor() : d; });
        }
        return d;
      }).then(function(d) {
        if (/jwt/i.test(String(d.error||d.message||''))) throw new Error('Tu sesión venció. Recargá la página e ingresá de nuevo.');
        if (d.error || !d.texto) throw new Error(d.error || d.message || ('error '+d._status));
        d._hash = hash; registrarUsoAsesorPF(d); return d;
      });
    }

    // Aviso flotante (abajo a la derecha)
    function toastAsesorPF(titulo) {
      var old = document.getElementById('asesor-toast-pf'); if (old) old.remove();
      var t = el('div',{id:'asesor-toast-pf',style:'position:fixed;right:16px;bottom:16px;width:min(390px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#fff;border:1px solid #CBD5E1;border-radius:12px;box-shadow:0 8px 28px rgba(15,23,42,.18);padding:14px 16px;z-index:9999'});
      var hd = el('div',{style:'display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px'});
      hd.appendChild(el('div',{style:'font-weight:700;font-size:13px;color:#1a2e4a'},titulo));
      var x = el('button',{class:'btn btnsm',style:'padding:1px 8px'},'×'); x.onclick = function(){ t.remove(); };
      hd.appendChild(x); t.appendChild(hd);
      var body = el('div',{}); t.appendChild(body);
      document.body.appendChild(t);
      return {box:t, body:body};
    }
    function irAAsesorPF() {
      var tt = document.getElementById('asesor-toast-pf'); if (tt) tt.remove();
      if (modoFin !== 'personal') return;
      setAbiertoChatPF(true);
    }
    // Al cargar un gasto pendiente: el asesor dice que hacer con ese gasto
    function avisoAsesorPF(g) {
      if (!g || g.pagado) return;
      if (chatPF && chatPF.mounted) {
        setAbiertoChatPF(true);
        var monTxt = Number(g.monto||0) ? fmt(g.monto) : (Number(g.monto_usd||0) ? fmtMon(g.monto_usd,'USD') : '');
        enviarChatPF('Cargué un gasto: '+(g.concepto||'')+(monTxt?' por '+monTxt:'')+(g.fecha?', vence '+fdate(g.fecha):'')+'. ¿Qué hago?',
          {modo:'gasto', gastoNuevo:{concepto:g.concepto, monto_ars:Number(g.monto||0), monto_usd:Number(g.monto_usd||0), fecha:g.fecha||null}});
        return;
      }
      var m = getMesPF(g.mes_id) || getMesPF(mesSeleccionadoPF);
      if (!m) return;
      var tt = toastAsesorPF('🤖 Asesor · ' + (g.concepto || 'gasto nuevo'));
      tt.body.appendChild(el('div',{style:'font-size:13px;color:#64748B'},'Revisando cómo impacta en tu calendario de caja…'));
      llamarAsesorPF(m, {efectivo:efectivoPF(m), diaDS:asesorEstPF.dia_ds||10, modo:'gasto',
        gastoNuevo:{concepto:g.concepto, monto_ars:Number(g.monto||0), monto_usd:Number(g.monto_usd||0), fecha:g.fecha||null}})
      .then(function(d) {
        if (!tt.box.isConnected) return;
        tt.body.innerHTML = '';
        tt.body.appendChild(textoAsesorPF(d.texto));
        var bf = el('button',{class:'btn btnsm',style:'margin-top:10px'},'Ver análisis completo'); bf.onclick = irAAsesorPF; tt.body.appendChild(bf);
      }).catch(function(e) {
        if (!tt.box.isConnected) return;
        tt.body.innerHTML = '';
        tt.body.appendChild(el('div',{style:'font-size:13px;color:#A32D2D'},'No pude consultar al asesor: '+e.message));
      });
    }

    function renderAsesorIAPF(m) {
      var box = el('div',{class:'card',style:'padding:20px;margin-bottom:14px;background:#fff'});
      box.appendChild(el('div',{style:'font-weight:700;font-size:15px;color:#1a2e4a;margin-bottom:4px'},'🤖 Asesor IA'));
      box.appendChild(el('div',{style:'font-size:12px;color:#64748B;margin-bottom:14px;line-height:1.5'},
        'Ya tiene tus gastos con fecha, tarjetas, DS pendiente, cobros y préstamos. La caja de hoy la calcula solo del panel (sueldo depositado + ingresos + cobros del negocio − pagos hechos). Se actualiza solo cuando cambian los datos, y cuando cargás un gasto te avisa qué hacer.'));
      var iSt = 'padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;background:#fff;color:#1a2e4a;box-sizing:border-box;';
      var row = el('div',{style:'display:flex;gap:12px;flex-wrap:wrap;margin-bottom:6px'});
      var c2 = el('div',{}); c2.appendChild(el('div',{style:'font-size:11px;color:#64748B;margin-bottom:4px'},'Distri llega como máximo el día'));
      var inpDia = el('input',{type:'number',min:'1',max:'31',style:iSt+'width:110px'}); inpDia.value = asesorEstPF.dia_ds || 10; c2.appendChild(inpDia);
      row.appendChild(c2); box.appendChild(row);
      var lineaTab = el('div',{style:'font-size:11px;margin-bottom:10px;color:#94a3b8'}, lineaEfectivoPF()); box.appendChild(lineaTab);
      box.appendChild(el('div',{style:'font-size:11px;color:#64748B;margin-bottom:4px'},'Pregunta (opcional)'));
      var txt = el('textarea',{rows:'2',placeholder:'Ej: ¿qué pago primero? / ¿y si la distri llega el 6?',style:iSt+'width:100%;resize:vertical;margin-bottom:10px;font-family:inherit'});
      box.appendChild(txt);
      var btn = el('button',{class:'btn btnp'},'Actualizar y consultar');
      box.appendChild(btn);
      var out = el('div',{style:'margin-top:14px'});
      box.appendChild(out);

      // Calendario de caja en vivo (sin IA): cambia solo al tocar efectivo / dia / ingreso y con cada gasto cargado
      var vivo = el('div',{style:'margin:8px 0 14px'});
      box.insertBefore(vivo, txt.previousSibling);
      function pintarVivo() {
        vivo.innerHTML = '';
        var efe = efectivoPF(m), ing = 0, dia = Number(inpDia.value)||10; lineaTab.textContent = lineaEfectivoPF();
        var d = datosAsesorPF(m, efe+ing, dia);
        var cal = d.calendario_caja;
        var entra = cal.reduce(function(a,r){ return a+r.entra; },0);
        var sale = cal.reduce(function(a,r){ return a+r.sale_sin_tarjetas; },0);
        var tarj = d.tarjetas_pendientes.reduce(function(a,g){ return a+g.saldo_ars; },0);
        var cierre = cal.length ? cal[cal.length-1].saldo_sin_tarjetas : (efe+ing);
        var kp = el('div',{style:'display:flex;gap:20px;flex-wrap:wrap;margin-bottom:10px'});
        function kpi(l,v,c){ var x=el('div',{}); x.appendChild(el('div',{style:'font-size:11px;color:#64748B'},l)); x.appendChild(el('div',{style:'font-size:15px;font-weight:700;color:'+c},v)); kp.appendChild(x); }
        kpi('Caja (según el panel)', fmt(Math.round(efe+ing)), '#0B9EDA');
        kpi('Sale (sin tarjetas)', fmt(Math.round(sale)), '#A32D2D');
        kpi('Entra esperado', fmt(Math.round(entra)), '#3D8A32');
        kpi('Saldo al cierre', fmt(Math.round(cierre)), cierre>=0?'#3D8A32':'#A32D2D');
        kpi('Tarjetas (aparte)', fmt(Math.round(tarj)), '#854F0B');
        vivo.appendChild(kp);
        var neg = cal.filter(function(r){ return r.saldo_sin_tarjetas < 0; })[0];
        vivo.appendChild(el('div',{style:'font-size:12px;margin-bottom:8px;font-weight:600;color:'+(neg?'#A32D2D':'#3D8A32')},
          neg ? 'Primer día en negativo: '+fdate(neg.fecha)+' (saldo '+fmt(neg.saldo_sin_tarjetas)+')' : 'Con estos datos no queda ningún día en negativo (sin contar tarjetas).'));
        if (!cal.length) return;
        var tw = el('div',{style:'overflow-x:auto'});
        var tb = el('table',{class:'tbl',style:'font-size:12px'});
        tb.appendChild(elH('thead',{},'<tr><th>Fecha</th><th style="text-align:right">Entra</th><th style="text-align:right">Sale</th><th style="text-align:right">Saldo</th><th>Detalle</th></tr>'));
        var tbd = el('tbody');
        cal.forEach(function(r) {
          var tr = el('tr',{});
          tr.appendChild(el('td',{style:'white-space:nowrap'},fdate(r.fecha)));
          tr.appendChild(el('td',{style:'text-align:right;color:#3D8A32'},r.entra?fmt(Math.round(r.entra)):'-'));
          tr.appendChild(el('td',{style:'text-align:right;color:#A32D2D'},r.sale_sin_tarjetas?fmt(Math.round(r.sale_sin_tarjetas)):'-'));
          tr.appendChild(el('td',{style:'text-align:right;font-weight:700;color:'+(r.saldo_sin_tarjetas<0?'#A32D2D':'#1a2e4a')},fmt(r.saldo_sin_tarjetas)));
          tr.appendChild(el('td',{style:'color:#64748B;font-size:11px'},r.detalle.map(function(x){ return x.replace(/^[-+]\d+ /,''); }).join(' · ')));
          tbd.appendChild(tr);
        });
        tb.appendChild(tbd); tw.appendChild(tb); vivo.appendChild(tw);
      }
      inpDia.oninput = pintarVivo;
      pintarVivo();

      function pintarGuardado() {
        out.innerHTML = '';
        if (!asesorEstPF.texto) {
          out.appendChild(el('div',{style:'font-size:13px;color:#64748B'},'Tocá "Actualizar y consultar". Después se actualiza solo cuando cambian los datos.'));
          return;
        }
        out.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-bottom:8px'},
          'Análisis del '+fmtFechaHoraPF(asesorEstPF.texto_ts)+(asesorEstPF.pregunta?' · respuesta a: «'+asesorEstPF.pregunta+'»':'')));
        out.appendChild(textoAsesorPF(asesorEstPF.texto));
        if (asesorEstPF.tokens_in) out.appendChild(el('div',{style:'margin-top:12px;font-size:11px;color:#94a3b8'},(asesorEstPF.modelo||'')+' · '+asesorEstPF.tokens_in+' tokens de entrada, '+asesorEstPF.tokens_out+' de salida'));
      }
      function ejecutar(manual, hashActual) {
        if (_asesorBusyPF) return;
        var efe = efectivoPF(m);
        var dia = Number(inpDia.value) || asesorEstPF.dia_ds || 10;
        var ing = 0;
        var pregunta = manual ? txt.value.trim() : '';
        if (ing > 0 && !pregunta) pregunta = 'Me ingresaron '+fmt(ing)+'. ¿Qué hago con esta plata? Dame las prioridades de pago en orden.';
        _asesorBusyPF = true; btn.disabled = true; btn.textContent = 'Analizando...';
        var carga = el('div',{style:'color:#64748B;font-size:13px;margin-bottom:8px'}, manual ? 'Armando el análisis, puede tardar unos segundos…' : 'Los datos cambiaron desde el último análisis, actualizando…');
        if (manual) out.innerHTML = ''; out.insertBefore(carga, out.firstChild);
        llamarAsesorPF(m, {efectivo:efe, diaDS:dia, pregunta:pregunta, ingreso:ing}).then(function(d) {
          _asesorFalloPF = null;
          if (ing > 0) {
            // Respuesta puntual sobre una plata que entro: se muestra pero no reemplaza el analisis guardado
            guardarAsesorEstPF({dia_ds:dia});
            if (box.isConnected) {
              out.innerHTML = '';
              out.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-bottom:8px'},'Prioridades para los '+fmt(ing)+' que ingresaron'));
              out.appendChild(textoAsesorPF(d.texto));
            }
            return;
          }
          var patch = {dia_ds:dia, texto:d.texto, texto_ts:Date.now(), hash:d._hash, mes_id:m.id, modelo:d.modelo, tokens_in:d.tokens_in, tokens_out:d.tokens_out, pregunta:pregunta||null};
          guardarAsesorEstPF(patch);
          if (box.isConnected) pintarGuardado();
        }).catch(function(e) {
          if (!manual) _asesorFalloPF = hashActual;
          if (box.isConnected) { carga.remove(); out.appendChild(el('div',{style:'color:#A32D2D;font-size:13px;margin-top:6px'},'No se pudo consultar: '+e.message)); }
        }).then(function(){ _asesorBusyPF = false; btn.disabled = false; btn.textContent = 'Actualizar y consultar'; });
      }
      btn.onclick = function(){ ejecutar(true); };
      pintarGuardado();
      // Si ya hay efectivo guardado y los datos cambiaron desde el ultimo analisis, se actualiza solo
      if (!_asesorBusyPF) {
        var h = hashAsesorPF(datosAsesorPF(m, efectivoPF(m), asesorEstPF.dia_ds || 10));
        if ((h !== asesorEstPF.hash || asesorEstPF.mes_id !== m.id) && h !== _asesorFalloPF) ejecutar(false, h);
      }
      content.appendChild(box);
    }

    function fmtR(n) { return fmt(Math.round(Number(n)||0)); }
    // ---- CHAT LATERAL DEL ASESOR ----
    var chatPF = (function(){
      var r = (config||[]).find(function(c){ return c.clave==='pf_asesor_chat'; });
      var msgs = [];
      if (r) { try { msgs = (JSON.parse(r.valor)||{}).msgs || []; } catch(e) {} }
      return {msgs:msgs, mounted:false, abierto:false, busy:false, ui:null};
    })();
    function guardarChatPF() {
      var arr = chatPF.msgs.filter(function(x){ return !x.pend; }).slice(-40);
      return sbFetch('panel_config?on_conflict=clave', {method:'POST', body:{clave:'pf_asesor_chat', valor:JSON.stringify({msgs:arr})}, prefer:'resolution=merge-duplicates,return=minimal'}).catch(function(){});
    }
    function chatAbiertoPrefPF() {
      try { var v = localStorage.getItem('qp_asesor_chat_open'); if (v==='1') return true; if (v==='0') return false; } catch(e) {}
      return false;
    }
    function setAbiertoChatPF(v) {
      if (!chatPF.mounted) return;
      chatPF.abierto = v;
      try { localStorage.setItem('qp_asesor_chat_open', v ? '1' : '0'); } catch(e) {}
      var u = chatPF.ui;
      var visible = (modoFin === 'personal');
      u.panel.style.display = (v && visible) ? 'flex' : 'none';
      u.launcher.style.display = (!v && visible) ? '' : 'none';
      if (v) { u.badge.style.display = 'none'; u.lista.scrollTop = u.lista.scrollHeight; }
    }
    function pintarMsgsChatPF() {
      var u = chatPF.ui; if (!u) return;
      u.lista.innerHTML = '';
      if (!chatPF.msgs.length) {
        u.lista.appendChild(el('div',{style:'font-size:13px;color:#64748B;line-height:1.6'},
          'Hola Juan. Veo tus gastos con fecha, tarjetas, DS pendiente, cobros y lo que vas cargando. La caja la calculo del panel: no hace falta que me pases nada. Cuando cargues un gasto o un ingreso te aviso qué hacer, o preguntame: "¿qué pago primero?", "¿y si la distri llega el 6?".'));
      }
      chatPF.msgs.forEach(function(x) {
        var esU = x.r === 'u';
        var fila = el('div',{style:'margin:0 0 10px;display:flex;justify-content:'+(esU?'flex-end':'flex-start')});
        var bub = el('div',{style:'max-width:94%;padding:8px 11px;border-radius:12px;font-size:13px;line-height:1.5;color:#1a2e4a;'+(esU?'background:#E6F6FD;':'background:#F8FAFC;border:1px solid #EEF2F6;')+(x.err?'border:1px solid #F5C2C2;color:#A32D2D;':'')});
        if (x.pend) bub.appendChild(el('span',{style:'color:#64748B'},'Pensando…'));
        else if (esU || x.err) bub.textContent = x.t;
        else bub.appendChild(textoAsesorPF(x.t));
        fila.appendChild(bub); u.lista.appendChild(fila);
      });
      u.lista.scrollTop = u.lista.scrollHeight;
    }
    // Linea de estado que cambia sola con los datos (se llama en cada renderAll)
    function avisoIngresoPF(n) {
      if (!n || !chatPF || !chatPF.mounted || modoFin !== 'personal') return;
      var hoy = new Date().toISOString().slice(0,10);
      var yaEntro = !n.fecha || String(n.fecha).slice(0,10) <= hoy;
      setAbiertoChatPF(true);
      enviarChatPF('Cargué un ingreso: '+(n.concepto||n.categoria||'ingreso')+' por '+fmt(n.monto)+(yaEntro?'':' (con fecha '+fdate(n.fecha)+')')+'. ¿Qué hago con esta plata? Dame las prioridades de pago en orden.',
        yaEntro ? {ingreso:Number(n.monto)||0} : {});
    }
    function actualizarEstadoChatPF() {
      if (!chatPF || !chatPF.mounted) return;
      setAbiertoChatPF(chatPF.abierto);
      var u = chatPF.ui, m = getMesPF(mesSeleccionadoPF);
      if (!m) return;
      u.linea.textContent = cuentasPF.length
        ? 'Disponible '+fmt(Math.round(disponibleArsPF()))+(disponibleUsdPF()>0 ? ' · USD '+(Math.round(disponibleUsdPF()*100)/100) : '')+(descubiertoPF()<0 ? ' · descubierto '+fmt(Math.round(descubiertoPF())) : '')+(consumoTarjetaPF()>0 ? ' · tarjetas '+fmt(Math.round(consumoTarjetaPF())) : '')
        : lineaEfectivoPF();
      var uso = document.getElementById('asesor-uso-pf');
      if (!uso && u.estado && u.estado.parentNode) { uso = el('div',{id:'asesor-uso-pf',style:'font-size:10px;color:#94a3b8;padding:2px 12px 4px'}); u.estado.parentNode.insertBefore(uso, u.estado.nextSibling); }
      if (uso) uso.textContent = textoUsoAsesorPF();
      var real = document.getElementById('asesor-real-pf');
      if (!real && uso && uso.parentNode) {
        real = el('div',{id:'asesor-real-pf',style:'font-size:10px;color:#0B9EDA;padding:0 12px 4px;cursor:pointer;text-decoration:underline'},'Ver gasto real en dólares');
        real.onclick = function(){ consultarGastoRealPF(real); };
        uso.parentNode.insertBefore(real, uso.nextSibling);
      }
      var d = datosAsesorPF(m, efectivoPF(m), asesorEstPF.dia_ds || 10);
      var cal = d.calendario_caja;
      var neg = cal.filter(function(r){ return r.saldo_sin_tarjetas < 0; })[0];
      var cierre = cal.length ? cal[cal.length-1].saldo_sin_tarjetas : efectivoPF(m);
      if (neg) { u.estado.textContent = '⚠ Primer día en negativo: '+fdate(neg.fecha)+' ('+fmt(neg.saldo_sin_tarjetas)+') · cierre '+fmt(cierre); u.estado.style.color = '#A32D2D'; }
      else { u.estado.textContent = '✔ Sin días en negativo (sin tarjetas) · cierre '+fmt(cierre); u.estado.style.color = '#3D8A32'; }
    }
    function enviarChatPF(texto, o) {
      o = o || {};
      if (!chatPF.mounted || chatPF.busy) return;
      texto = String(texto||'').trim(); if (!texto) return;
      var m = getMesPF(mesSeleccionadoPF); if (!m) return;
      chatPF.msgs.push({r:'u', t:texto, ts:Date.now()});
      var hist = chatPF.msgs.slice(0,-1).filter(function(x){ return !x.pend && !x.err; }).slice(-10).map(function(x){ return {role:x.r==='u'?'user':'assistant', content:x.t}; });
      var pend = {r:'a', t:'', pend:true};
      chatPF.msgs.push(pend); chatPF.busy = true; chatPF.ui.btnSend.disabled = true; pintarMsgsChatPF();
      llamarAsesorPF(m, {efectivo:efectivoPF(m), diaDS:asesorEstPF.dia_ds||10, pregunta:texto, modo:o.modo||'chat', gastoNuevo:o.gastoNuevo, ingreso:o.ingreso, historial:hist})
      .then(function(d){ pend.pend = false; pend.t = d.texto; pend.ts = Date.now(); })
      .catch(function(e){ pend.pend = false; pend.err = true; pend.t = 'No pude consultar: '+e.message; })
      .then(function(){
        chatPF.busy = false; chatPF.ui.btnSend.disabled = false; pintarMsgsChatPF(); guardarChatPF();
        if (!chatPF.abierto) chatPF.ui.badge.style.display = '';
      });
    }
    function montarChatAsesorPF(root) {
      var iSt = 'padding:6px 8px;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;background:#fff;color:#1a2e4a;box-sizing:border-box;';
      var panel = el('div',{style:'position:fixed;top:max(56px, calc(env(safe-area-inset-top) + 48px));right:14px;bottom:calc(14px + env(safe-area-inset-bottom));width:min(360px,calc(100vw - 28px));background:#fff;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 10px 36px rgba(15,23,42,.18);overflow:hidden;z-index:800;display:none;flex-direction:column'});
      var hd = el('div',{style:'padding:12px 14px;border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;gap:8px'});
      hd.appendChild(el('div',{style:'font-weight:700;font-size:14px;color:#1a2e4a'},'🤖 Asesor · finanzas personales'));
      var hb = el('div',{style:'display:flex;gap:6px'});
      var bClr = el('button',{class:'btn btnsm',title:'Borrar la conversación'},'Borrar');
      var bMin = el('button',{class:'btn btnsm',title:'Cerrar'},'×');
      hb.appendChild(bClr); hb.appendChild(bMin); hd.appendChild(hb); panel.appendChild(hd);

      var linea = el('div',{style:'padding:8px 14px 4px;font-size:10px;color:#94a3b8;line-height:1.4'}); panel.appendChild(linea);
      var bCta = el('button',{class:'btn btnsm',style:'margin:2px 14px 6px;font-size:11px;align-self:flex-start'},'💳 Ver cuentas');
      var boxCta = el('div',{style:'display:none'});
      panel.appendChild(bCta);
      bCta.onclick = function(){ tabActual = 'cuentas-pf'; _finUIState.tabActual = tabActual; renderTabs(); renderAll(); };
      var estado = el('div',{style:'padding:2px 14px 8px;font-size:11px;font-weight:600;border-bottom:1px solid #F1F5F9;line-height:1.4'}); panel.appendChild(estado);

      var lista = el('div',{style:'flex:1;overflow:auto;padding:12px 14px'}); panel.appendChild(lista);

      var chips = el('div',{style:'padding:6px 14px 0;display:flex;gap:6px;flex-wrap:wrap'});
      function chip(txt, fn) { var b = el('button',{class:'btn btnsm',style:'font-size:11px'},txt); b.onclick = fn; chips.appendChild(b); }
      chip('¿Cómo viene el mes?', function(){ enviarChatPF('¿Cómo viene el mes? Dame el análisis completo.'); });
      chip('¿Qué pago esta semana?', function(){ enviarChatPF('¿Qué tengo que pagar esta semana y en qué orden?'); });
      chip('💰 Entró plata', function(){ enviarChatPF('Entró plata nueva que ya cargué en el panel. ¿Qué hago con ella? Dame las prioridades de pago en orden.'); });
      panel.appendChild(chips);

      var fin = el('div',{style:'padding:8px 14px 12px;display:flex;gap:8px;align-items:flex-end'});
      var txt = el('textarea',{rows:'2',placeholder:'Preguntale al asesor…',style:iSt+'flex:1;resize:none;font-family:inherit;font-size:13px'});
      var btnSend = el('button',{class:'btn btnp'},'Enviar');
      fin.appendChild(txt); fin.appendChild(btnSend); panel.appendChild(fin);

      var launcher = el('button',{class:'qp-asesor-launcher',style:'position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:800;background:#0B9EDA;color:#fff;border:0;border-radius:26px;padding:11px 18px;font-weight:600;font-size:14px;box-shadow:0 6px 20px rgba(11,158,218,.4);cursor:pointer'},'🤖 Asesor');
      var badge = el('span',{style:'display:none;margin-left:8px;background:#E24B4A;border-radius:10px;width:10px;height:10px;vertical-align:middle;display:none'});
      launcher.appendChild(badge);

      chatPF.ui = {linea:linea, root:root, panel:panel, launcher:launcher, lista:lista, estado:estado, btnSend:btnSend, badge:badge};
      chatPF.mounted = true;
      root.appendChild(panel); root.appendChild(launcher);

      function enviarDesdeCaja() { var v = txt.value; txt.value = ''; enviarChatPF(v); }
      btnSend.onclick = enviarDesdeCaja;
      txt.onkeydown = function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarDesdeCaja(); } };
      bClr.onclick = function() { if (!confirm('Borrar toda la conversación con el asesor?')) return; chatPF.msgs = []; pintarMsgsChatPF(); guardarChatPF(); };
      bMin.onclick = function(){ setAbiertoChatPF(false); };
      launcher.onclick = function(){ setAbiertoChatPF(true); };

      pintarMsgsChatPF();
      actualizarEstadoChatPF();
      setAbiertoChatPF(chatAbiertoPrefPF());
    }

    function renderAsesorPF() {
      var m=getMesPF(mesSeleccionadoPF);
      if(!m){ content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay mes seleccionado')])); return; }
      content.appendChild(el('div',{class:'sh',style:'margin-bottom:16px'},[el('span',{class:'st'},'🤖 Asesor — '+MESES[m.month-1]+' '+m.year)]));
      renderAsesorIAPF(m);
      var card=el('div',{class:'card',style:'padding:20px'});
      var j=juanPF.find(function(x){ return x.mes_id===m.id; })||{};
      var t=calcJuanTotalsPF(j,m.month);
      var cobN=cobradoNegocioMesPF(m.year,m.month);
      var gasP=gastoTotalMesPF(m.id);
      var gN=gastoNegocioMesPF(m.id);
      var transI=ingresosPF.filter(function(i){ return i.mes_id===m.id&&i.categoria==='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); },0);
      var totalIng=t.juanSueldo+t.juanDS+ingresosPF.filter(function(i){ return i.mes_id===m.id&&i.categoria!=='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); },0)+musicaPF.filter(function(x){ return x.mes_id===m.id; }).reduce(function(s,x){ return s+Number(x.cobrado||0)-Number(x.nianera||0); },0)+cobN;
      var totalGas=gasP+gN.ars;
      var bal=totalIng-totalGas;
      var pct=totalIng>0?Math.round(totalGas/totalIng*100):0;
      var dsP=t.juanDS-transI;
      var cuotasA=cuotasPF.filter(function(c){ return c.activa&&isCuotaActivaPF(c,m.year,m.month); });
      var cuotasTerm=cuotasPF.filter(function(c){ if(!c.activa) return false; var num=numeroCuotaPF(c,m.year,m.month); return num&&c.total_cuotas&&(c.total_cuotas-num)<=3&&(c.total_cuotas-num)>=0; });
      var deudaP=deudasPF.filter(function(d){ return d.estado==='pendiente'; }).reduce(function(s,d){ return s+Number(d.monto); },0);
      var sug=[];
      if(bal>=0) sug.push({emoji:'✅',titulo:'Balance positivo',detalle:'Cerrás el mes con '+fmtR(bal)+' de superávit. Tus gastos son el '+pct+'% de tus ingresos.'});
      else sug.push({emoji:'🔴',titulo:'Déficit este mes',detalle:'Gastos superan ingresos por '+fmtR(Math.abs(bal))+'. Los gastos son el '+pct+'% de tus ingresos.'});
      if(dsP>500) sug.push({emoji:'💰',titulo:'DS pendiente',detalle:'Tenés '+fmtR(dsP)+' que la empresa todavía te debe.'});
      else if(dsP<0) sug.push({emoji:'🏢',titulo:'DS saldado',detalle:'Ya cobraste todo. Te adelantaron '+fmtR(Math.abs(dsP))+'.'});
      cuotasTerm.forEach(function(c){ var num=numeroCuotaPF(c,m.year,m.month); var q=c.total_cuotas-num; sug.push({emoji:'🎉',titulo:'Cuota por terminar: '+c.nombre,detalle:(q===0?'Última cuota.':c.nombre+' termina en '+q+' cuota'+(q!==1?'s':'')+' más.')+' Liberás '+fmtR(Number(c.monto))+'/mes.'}); });
      var gMax=null,gMaxV=0,rG=gastosPF.filter(function(g){ return g.mes_id===m.id; }).slice();
      agruparGastosPF(rG).forEach(function(gr){ if(gr.tot>gMaxV){ gMaxV=gr.tot; gMax=gr.nombre; } });
      if(gMax&&gMaxV>0){ var pG=totalGas>0?Math.round(gMaxV/totalGas*100):0; sug.push({emoji:'📊',titulo:'Mayor gasto: '+gMax,detalle:gMax+' representa el '+pG+'% de tus gastos con '+fmtR(gMaxV)+'.'}); }
      if(cuotasA.length>0) sug.push({emoji:'📋',titulo:cuotasA.length+' cuotas activas',detalle:'Tenés '+cuotasA.length+' cuotas corriendo en paralelo.'});
      if(deudaP>0) sug.push({emoji:'👤',titulo:'Deuda pendiente a cobrar',detalle:'Tenés '+fmtR(deudaP)+' en deudas pendientes.'});
      sug.forEach(function(s){ var row=el('div',{style:'display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:.5px solid #F1F5F9'}); var ico=el('div',{style:'font-size:28px;flex-shrink:0;width:40px;text-align:center'},s.emoji); var bod=el('div',{style:'flex:1'}); bod.appendChild(el('div',{style:'font-weight:600;font-size:14px;color:#1a2e4a;margin-bottom:4px'},s.titulo)); bod.appendChild(el('div',{style:'font-size:13px;color:#64748B;line-height:1.5'},s.detalle)); row.appendChild(ico); row.appendChild(bod); card.appendChild(row); });
      if(!sug.length) card.appendChild(el('div',{class:'emp'},'Sin datos suficientes.'));
      content.appendChild(card);
    }

    renderAll();

    // ---- JUNTADA ----
    var _juntadaCollapsed = {};
    function checkCollapsed(id){ return _juntadaCollapsed[id] !== false; }
    function renderJuntada() {
      var old2 = document.getElementById('juntada-section'); if(old2) old2.remove();
      var collapsed = _juntadaCollapsed;
      var sec = el('div', {id:'juntada-section'});
        var sh2 = el('div', {class:'sh', style:'display:flex;justify-content:space-between;align-items:center'});
        sh2.appendChild(el('span', {class:'st'}, '\uD83C\uDFB2 Juntada \u2014 San Rafael 2026'));
        var btnNP = el('button',{class:'btn btnsm'},'+ Participante');
        btnNP.onclick = mNuevoParticipante2;
        var btnPrJ = el('button',{class:'btn btnsm',style:'margin-right:6px'},'\uD83D\uDDA8 Imprimir');
        btnPrJ.onclick = mImprimirJuntada;
        var hdrBtnsJ = el('span',{}); hdrBtnsJ.appendChild(btnPrJ); hdrBtnsJ.appendChild(btnNP);
        sh2.appendChild(hdrBtnsJ);
        sec.appendChild(sh2);
        var totalAportado2 = juntadaPagos.reduce(function(s,p){ return s+Number(p.importe); },0);
        var gastosComunes2 = juntadaGastos.filter(function(g){ return g.tipo !== 'interes_mp'; });
        var interesesMP2 = juntadaGastos.filter(function(g){ return g.tipo === 'interes_mp'; });
        var totalGastado2 = gastosComunes2.reduce(function(s,g){ return s+Number(g.importe); },0);
        var totalIntereses2 = interesesMP2.reduce(function(s,g){ return s+Number(g.importe); },0);
        var resCard2 = el('div',{class:'card',style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;padding:14px;margin-bottom:10px'});
        [{label:'Total aportado',val:fmt(totalAportado2),color:'#3D8A32'},
         {label:'Total gastado', val:fmt(totalGastado2), color:'#A32D2D'},
         {label:'Intereses MP',  val:fmt(totalIntereses2), color:'#854F0B'},
         {label:'Disponible',    val:fmt(totalAportado2+totalIntereses2-totalGastado2), color:'#0B9EDA'},
        ].forEach(function(m){
          var col=el('div',{style:'text-align:center'});
          col.appendChild(el('div',{style:'font-size:11px;color:#64748B;margin-bottom:4px'},m.label));
          col.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:'+m.color},m.val));
          resCard2.appendChild(col);
        });
        sec.appendChild(resCard2);
        var intBox2 = el('div',{style:'background:#FEF3C7;border:.5px solid #FDE68A;border-radius:8px;padding:10px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px'});
        intBox2.appendChild(el('span',{style:'font-size:13px;color:#854F0B;flex:1'},'Intereses MercadoPago: '+fmt(totalIntereses2)));
        var btnIE2 = el('button',{class:'btn btnsm',style:'border-color:#FDE68A;color:#854F0B'},'Editar');
        btnIE2.onclick = mEditarInteresesMP2;
        intBox2.appendChild(btnIE2);
        sec.appendChild(intBox2);
        // Tabla aportes
        var shA2 = el('div',{class:'sh',style:'display:flex;justify-content:space-between;align-items:center;cursor:pointer'});
        var shAL = el('span',{style:'display:flex;align-items:center;gap:8px'});
        var shArr = el('span',{style:'font-size:10px;color:#94a3b8'},'\u25BC');
        shAL.appendChild(shArr); shAL.appendChild(el('span',{class:'st'},'Aportes por persona'));
        shA2.appendChild(shAL);
        shA2.appendChild(el('span',{style:'font-size:13px;font-weight:700;color:#3D8A32'},fmt(totalAportado2)));
        var tblCard2 = el('div',{class:'card'});
        var aportesCollapsed2 = false;
        shA2.onclick = function(){ aportesCollapsed2=!aportesCollapsed2; shArr.textContent=aportesCollapsed2?'\u25B6':'\u25BC'; tblCard2.style.display=aportesCollapsed2?'none':''; };
        sec.appendChild(shA2);
        var tbl2 = el('table',{class:'tbl'});
        tbl2.appendChild(elH('thead',{},'<tr><th>Qui\xE9n</th><th>Fecha</th><th style="text-align:right">Importe</th><th style="text-align:right">Subtotal</th><th></th></tr>'));
        var tb2 = el('tbody');
        var _totJ = {}; juntadaPagos.forEach(function(p){ _totJ[p.participante_id] = (_totJ[p.participante_id]||0) + Number(p.importe); });
        juntadaParticipantes.filter(function(p){return p.activo;}).sort(function(x,y){ return (_totJ[y.id]||0) - (_totJ[x.id]||0) || String(x.nombre).localeCompare(String(y.nombre)); }).forEach(function(part){
          var pagosP2 = juntadaPagos.filter(function(p){return p.participante_id===part.id;}).sort(function(a,b){return new Date(a.fecha)-new Date(b.fecha);});
          var subtotal2 = pagosP2.reduce(function(s,p){return s+Number(p.importe);},0);
          var isC = checkCollapsed(part.id);
          var trH2 = el('tr',{style:'background:#F8FAFC'});
          var tdT2 = el('td',{style:'font-weight:600;color:#1a2e4a;cursor:pointer;user-select:none'});
          var arr2 = el('span',{style:'margin-right:6px;font-size:10px;color:#94a3b8'},isC?'\u25B6':'\u25BC');
          tdT2.appendChild(arr2); tdT2.appendChild(document.createTextNode(part.nombre));
          (function(pid2){ tdT2.onclick = function(){ collapsed[pid2]=checkCollapsed(pid2)?false:true; renderJuntada(); }; })(part.id);
          trH2.appendChild(tdT2);
          trH2.appendChild(el('td',{},''));
          trH2.appendChild(el('td',{style:'text-align:right;font-size:12px;color:#64748B'},pagosP2.length?pagosP2.length+' entrega'+(pagosP2.length!==1?'s':''):'-'));
          trH2.appendChild(el('td',{style:'text-align:right;font-weight:700;color:'+(subtotal2>0?'#3D8A32':'#94a3b8')},subtotal2>0?fmt(subtotal2):'-'));
          var tdHAcc2 = el('td',{style:'text-align:right'});
          var btnAH2 = el('button',{class:'btn btnsm'},'+ Entrega');
          (function(pp2){btnAH2.onclick=function(e){e.stopPropagation();mNuevaEntrega2(pp2);};})(part);
          tdHAcc2.appendChild(btnAH2); trH2.appendChild(tdHAcc2); tb2.appendChild(trH2);
          if (!isC) {
            if (!pagosP2.length) { var trV=el('tr'); trV.appendChild(el('td',{colspan:'5',style:'text-align:center;font-size:12px;color:#94a3b8;padding:6px'},'Sin entregas')); tb2.appendChild(trV); }
            else { pagosP2.forEach(function(p2){ var tr2=el('tr'); tr2.appendChild(el('td',{style:'padding-left:24px;color:#64748B;font-size:13px'},'')); tr2.appendChild(el('td',{style:'font-size:12px;color:#64748B'},fdate(p2.fecha))); tr2.appendChild(el('td',{style:'text-align:right'},fmt(p2.importe))); tr2.appendChild(el('td',{},''));
              var tdX2=el('td',{style:'text-align:right'}); var btnX2=el('button',{class:'btn btnsm',style:'color:#E53E3E;border-color:#FECACA'},'x');
              (function(pp3){btnX2.onclick=function(){if(confirm('Eliminar entrega?')){sbFetch('panel_juntada_pagos?id=eq.'+pp3.id,{method:'DELETE',headers:{'Prefer':'return=minimal'}}).then(function(){juntadaPagos=juntadaPagos.filter(function(x){return x.id!==pp3.id;});renderJuntada();});}};})(p2);
              tdX2.appendChild(btnX2); tr2.appendChild(tdX2); tb2.appendChild(tr2); }); }
          }
          var sep2=el('tr'); sep2.appendChild(elH('td',{colspan:'5',style:'padding:0;border-top:.5px solid #F1F5F9'},''));  tb2.appendChild(sep2);
        });
        var trTot2=el('tr',{style:'background:#F0FDF4'});
        trTot2.appendChild(el('td',{style:'font-weight:700;color:#3D8A32'},'TOTAL'));
        [1,2,3].forEach(function(){trTot2.appendChild(el('td',{},''));});
        trTot2.appendChild(el('td',{style:'text-align:right;font-weight:700;color:#3D8A32'},fmt(totalAportado2)));
        trTot2.appendChild(el('td',{},''));
        tb2.appendChild(trTot2);
        tbl2.appendChild(tb2); tblCard2.appendChild(tbl2); sec.appendChild(tblCard2);
        // Gastos comunes
        var gsh2=el('div',{class:'sh',style:'display:flex;justify-content:space-between;align-items:center;margin-top:8px'});
        gsh2.appendChild(el('span',{class:'st'},'Gastos comunes'));
        var btnG2=el('button',{class:'btn btnsm'},'+ Gasto'); btnG2.onclick=mNuevoGastoJuntada2; gsh2.appendChild(btnG2); sec.appendChild(gsh2);
        var gtblCard2=el('div',{class:'card'});
        if (!gastosComunes2.length) { gtblCard2.appendChild(el('div',{class:'emp'},'Sin gastos registrados')); }
        else {
          var gtbl2=el('table',{class:'tbl'}); gtbl2.appendChild(elH('thead',{},'<tr><th>Descripci\xF3n</th><th>Fecha</th><th style="text-align:right">Importe</th><th></th></tr>')); var gtb2=el('tbody');
          gastosComunes2.forEach(function(g2){ var tr2=el('tr'); tr2.appendChild(el('td',{},g2.descripcion)); tr2.appendChild(el('td',{style:'font-size:12px;color:#64748B'},fdate(g2.fecha))); tr2.appendChild(el('td',{style:'text-align:right;font-weight:500;color:#A32D2D'},fmt(g2.importe))); var tdX3=el('td'); var btnX3=el('button',{class:'btn btnsm',style:'color:#E53E3E;border-color:#FECACA'},'x'); (function(gg2){btnX3.onclick=function(){if(confirm('Eliminar gasto?')){sbFetch('panel_juntada_gastos?id=eq.'+gg2.id,{method:'DELETE',headers:{'Prefer':'return=minimal'}}).then(function(){juntadaGastos=juntadaGastos.filter(function(x){return x.id!==gg2.id;});renderJuntada();});}};})(g2); tdX3.appendChild(btnX3); tr2.appendChild(tdX3); gtb2.appendChild(tr2); });
          var trG2=el('tr',{style:'background:#FFF5F5'}); trG2.appendChild(el('td',{style:'font-weight:700;color:#A32D2D'},'TOTAL')); trG2.appendChild(el('td',{},''));  trG2.appendChild(el('td',{style:'text-align:right;font-weight:700;color:#A32D2D'},fmt(totalGastado2))); trG2.appendChild(el('td',{},''));
          gtb2.appendChild(trG2); gtbl2.appendChild(gtb2); gtblCard2.appendChild(gtbl2);
        }
        sec.appendChild(gtblCard2);
        content.appendChild(sec);

        function mImprimirJuntada() {
          var parts = juntadaParticipantes.filter(function(p){return p.activo;});
          var opts = [['todos','Todos los participantes']].concat(parts.map(function(p){return [p.id,p.nombre];}));
          openM(makeModal('Imprimir Juntada', function(body) {
            addFg(body,'Participante',mkSelect('jpr-part',opts,'todos'));
            mkRow2(body,mkFg('Desde (opcional)',mkInput('jpr-desde','date','')),mkFg('Hasta (opcional)',mkInput('jpr-hasta','date','')));
            body.appendChild(el('div',{style:'font-size:12px;color:#64748B;margin-top:6px'},'Detalle de entregas por fecha, con subtotal por persona.'));
          }, function(foot) {
            foot.appendChild(cancelBtn()); var ok=el('button',{class:'btn btnp'},'🖨 Imprimir');
            ok.onclick=function(){ imprimirJuntada(gv('jpr-part'),gv('jpr-desde'),gv('jpr-hasta')); closeM(); };
            foot.appendChild(ok);
          }));
        }
        function imprimirJuntada(partId, desde, hasta) {
          function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
          var parts = juntadaParticipantes.filter(function(p){return p.activo && (partId==='todos' || p.id===partId);});
          var granTotal = 0, nEntregas = 0, bloques = '';
          // de los que más aportaron a los que menos (según el período elegido)
          var _totP = {};
          juntadaPagos.forEach(function(p){
            var f=(p.fecha||'').slice(0,10);
            if (desde && f<desde) return; if (hasta && f>hasta) return;
            _totP[p.participante_id] = (_totP[p.participante_id]||0) + Number(p.importe);
          });
          parts = parts.slice().sort(function(x,y){ return (_totP[y.id]||0) - (_totP[x.id]||0) || String(x.nombre).localeCompare(String(y.nombre)); });
          parts.forEach(function(part){
            var pagos = juntadaPagos.filter(function(p){
              if (p.participante_id!==part.id) return false;
              var f=(p.fecha||'').slice(0,10);
              if (desde && f<desde) return false;
              if (hasta && f>hasta) return false;
              return true;
            }).sort(function(a,b){return String(a.fecha).localeCompare(String(b.fecha));});
            var sub = pagos.reduce(function(s,p){return s+Number(p.importe);},0);
            granTotal += sub; nEntregas += pagos.length;
            bloques += '<div class="pb"><div class="ph"><span>'+esc(part.nombre)+'</span><span class="pc">'+pagos.length+' entrega'+(pagos.length!==1?'s':'')+'</span></div>';
            if (!pagos.length) { bloques += '<div class="vacio">Sin entregas</div>'; }
            else {
              bloques += '<table><tbody>';
              pagos.forEach(function(p){ bloques += '<tr><td class="f">'+fdate(p.fecha)+'</td><td class="d">'+esc(p.descripcion||'')+'</td><td class="r">'+fmt(p.importe)+'</td></tr>'; });
              bloques += '</tbody></table>';
            }
            bloques += '<div class="pt"><span>Subtotal</span><span>'+fmt(sub)+'</span></div></div>';
          });
          var periodo = (desde||hasta) ? ('Per\xEDodo: '+(desde?fdate(desde):'inicio')+' al '+(hasta?fdate(hasta):'hoy')) : 'Todas las fechas';
          var aportadoGlobal = juntadaPagos.reduce(function(s,p){return s+Number(p.importe);},0);
          var gastosL = juntadaGastos.filter(function(g){return g.tipo!=='interes_mp';}).sort(function(a,b){return String(a.fecha).localeCompare(String(b.fecha));});
          var gastado = gastosL.reduce(function(s,g){return s+Number(g.importe);},0);
          var intereses = juntadaGastos.filter(function(g){return g.tipo==='interes_mp';}).reduce(function(s,g){return s+Number(g.importe);},0);
          var saldo = aportadoGlobal + intereses - gastado;
          var kpis = '<div class="k"><small>Aportado'+(partId==='todos'?'':' (selecci\xF3n)')+((desde||hasta)?' (per\xEDodo)':'')+'</small><b class="v">'+fmt(granTotal)+'</b></div>'
                   + '<div class="k"><small>Total gastado</small><b class="g">'+fmt(gastado)+'</b></div>'
                   + '<div class="k"><small>Intereses MP</small><b class="i">'+fmt(intereses)+'</b></div>'
                   + '<div class="k sd"><small>Saldo disponible</small><b>'+fmt(saldo)+'</b></div>';
          var gastosHtml = '';
          if (partId==='todos' && gastosL.length) {
            gastosHtml = '<div class="pb gb"><div class="ph"><span>Gastos comunes</span><span class="pc">'+gastosL.length+' gasto'+(gastosL.length!==1?'s':'')+'</span></div><table><tbody>';
            gastosL.forEach(function(g){ gastosHtml += '<tr><td class="f">'+fdate(g.fecha)+'</td><td class="d">'+esc(g.descripcion||'')+'</td><td class="r" style="color:#A32D2D">'+fmt(g.importe)+'</td></tr>'; });
            gastosHtml += '</tbody></table><div class="pt" style="background:#FFF5F5;color:#A32D2D;border-top-color:#FECACA"><span>Total gastado</span><span>'+fmt(gastado)+'</span></div></div>';
          }
          var html = '<!doctype html><html><head><meta charset="utf-8"><title>Juntada - San Rafael 2026</title><style>'
            + '@page{size:A4;margin:10mm}'
            + '*{box-sizing:border-box}'
            + 'body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a2e4a;margin:0;padding:10mm;font-size:10.5px;line-height:1.25;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
            + '.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0B9EDA;padding-bottom:6px;margin-bottom:8px}'
            + 'h1{font-size:18px;margin:0;letter-spacing:-.3px}.sub{color:#64748B;font-size:10px;text-align:right}'
            + '.kp{display:flex;gap:6px;margin-bottom:10px}.k{flex:1;border:1px solid #E2E8F0;border-radius:6px;padding:5px 8px;text-align:center}'
            + '.k small{display:block;color:#64748B;font-size:9px;text-transform:uppercase;letter-spacing:.4px}.k b{font-size:14px}'
            + '.sd{background:#E0F2FE;border-color:#0B9EDA}.sd b{color:#0B7AB0;font-size:16px}.v{color:#3D8A32}.g{color:#A32D2D}.i{color:#854F0B}.d2{color:#0B9EDA}'
            + '.cols{column-count:2;column-gap:10px}'
            + '.pb{break-inside:avoid;page-break-inside:avoid;border:1px solid #E2E8F0;border-radius:6px;margin-bottom:8px;overflow:hidden}'
            + '.ph{display:flex;justify-content:space-between;background:#1a2e4a;color:#fff;padding:4px 8px;font-weight:700;font-size:11px}.pc{font-weight:400;opacity:.85;font-size:9.5px}'
            + 'table{width:100%;border-collapse:collapse}td{padding:2.5px 8px;border-bottom:1px solid #F1F5F9}'
            + '.f{width:62px;color:#64748B;white-space:nowrap}.d{color:#475569;font-size:9.5px}.r{text-align:right;font-weight:600;white-space:nowrap}'
            + '.pt{display:flex;justify-content:space-between;background:#F0FDF4;color:#3D8A32;font-weight:700;padding:3px 8px;border-top:1px solid #BBF7D0}'
            + '.vacio{color:#94a3b8;font-style:italic;padding:4px 8px}'
            + '.np{margin-bottom:8px;text-align:right}'
            + '@media print{body{padding:0}.np{display:none}}'
            + (parts.length<=1 ? '.cols{column-count:1}' : '')
            + '</style></head><body>'
            + '<div class="np"><button onclick="window.print()" style="padding:6px 14px;cursor:pointer">Imprimir / PDF</button></div>'
            + '<div class="top"><h1>🎲 Juntada — San Rafael 2026</h1><div class="sub">'+periodo+'<br>Emitido '+fdate(new Date().toISOString())+'</div></div>'
            + '<div class="kp">'+kpis+'</div>'
            + '<div class="cols">'+bloques+gastosHtml+'</div>'
            + '</body></html>';
          var w = window.open('','_blank');
          if (!w) { alert('El navegador bloque\xF3 la ventana. Permit\xED popups para imprimir.'); return; }
          w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 400);
        }
        function mNuevoParticipante2() {
          openM(makeModal('Nuevo participante', function(body) { addFg(body,'Nombre',mkInput('jp2-nom','text','')); }, function(foot) {
            foot.appendChild(cancelBtn()); var ok=el('button',{class:'btn btnp'},'Agregar');
            ok.onclick=function(){ var nom=gv('jp2-nom').trim(); if(!nom){alert('Nombre obligatorio');return;} ok.disabled=true;
              dbIns('panel_juntada_participantes',{nombre:nom,activo:true}).then(function(r){ juntadaParticipantes.push(r[0]); closeM(); renderJuntada(); }); };
            foot.appendChild(ok);
          }));
        }
        function mNuevaEntrega2(part) {
          openM(makeModal('Entrega \u2014 '+part.nombre, function(body) { mkRow2(body,mkFg('Importe ($)',mkInput('je2-imp','number','30000')),mkFg('Fecha',mkInput('je2-fec','date',new Date().toISOString().slice(0,10)))); addFg(body,'Descripci\xF3n',mkInput('je2-desc','text','')); }, function(foot) {
            foot.appendChild(cancelBtn()); var ok=el('button',{class:'btn btnp'},'Guardar');
            ok.onclick=function(){ var imp=Number(gv('je2-imp')||0); if(!imp){alert('Ingres\xE1 el importe');return;} ok.disabled=true;
              dbIns('panel_juntada_pagos',{participante_id:part.id,importe:imp,fecha:gv('je2-fec'),descripcion:gv('je2-desc')||null,tipo:'aporte'}).then(function(r){ juntadaPagos.push(r[0]); closeM(); renderJuntada(); }).catch(function(e){ alert('Error: '+e.message); ok.disabled=false; }); };
            foot.appendChild(ok);
          }));
        }
        function mNuevoGastoJuntada2() {
          openM(makeModal('Nuevo gasto', function(body) { addFg(body,'Descripci\xF3n',mkInput('jg2-desc','text','')); mkRow2(body,mkFg('Importe ($)',mkInput('jg2-imp','number','0')),mkFg('Fecha',mkInput('jg2-fec','date',new Date().toISOString().slice(0,10)))); }, function(foot) {
            foot.appendChild(cancelBtn()); var ok=el('button',{class:'btn btnp'},'Guardar');
            ok.onclick=function(){ var desc=gv('jg2-desc').trim(); if(!desc){alert('Descripci\xF3n obligatoria');return;} var imp=Number(gv('jg2-imp')||0); if(!imp){alert('Ingres\xE1 el importe');return;} ok.disabled=true;
              dbIns('panel_juntada_gastos',{descripcion:desc,importe:imp,fecha:gv('jg2-fec'),tipo:'gasto'}).then(function(r){ juntadaGastos.push(r[0]); closeM(); renderJuntada(); }).catch(function(e){ alert('Error: '+e.message); ok.disabled=false; }); };
            foot.appendChild(ok);
          }));
        }
        function mEditarInteresesMP2() {
          var actual2 = juntadaGastos.filter(function(g){return g.tipo==='interes_mp';});
          var totalActual2 = actual2.reduce(function(s,g){return s+Number(g.importe);},0);
          openM(makeModal('Intereses MercadoPago', function(body) {
            var info2=el('div',{style:'background:#FEF3C7;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#854F0B'}); info2.appendChild(document.createTextNode('Total actual: '+fmt(totalActual2)+'. Al guardar reemplaza el valor anterior.')); body.appendChild(info2);
            addFg(body,'Intereses MP ($)',mkInput('ji2-imp','number',totalActual2||'')); addFg(body,'Fecha',mkInput('ji2-fec','date',new Date().toISOString().slice(0,10)));
          }, function(foot) {
            foot.appendChild(cancelBtn()); var ok=el('button',{class:'btn btnp'},'Guardar');
            ok.onclick=function(){ var imp=Number(gv('ji2-imp')||0); ok.disabled=true;
              var delP=actual2.map(function(g){ return sbFetch('panel_juntada_gastos?id=eq.'+g.id,{method:'DELETE',headers:{'Prefer':'return=minimal'}}); });
              Promise.all(delP).then(function(){ juntadaGastos=juntadaGastos.filter(function(g){return g.tipo!=='interes_mp';}); if(imp>0){ return dbIns('panel_juntada_gastos',{descripcion:'Intereses MercadoPago',importe:imp,fecha:gv('ji2-fec'),tipo:'interes_mp'}).then(function(r){juntadaGastos.push(r[0]);}); } }).then(function(){closeM();renderJuntada();}).catch(function(e){alert('Error: '+e.message);ok.disabled=false;}); };
            foot.appendChild(ok);
          }));
        }
      content.appendChild(sec);
    }

    // ---- PEDRITO TAB ----
    function renderPedritoPF() {
      var hoy2 = new Date();
      var esPedrito = function(g) { return g.categoria==='Pedrito' || g.categoria==='Alimentos'; };
      var gastosPedrito = gastosPF.filter(esPedrito);
      var mesesUnicos = [];
      gastosPedrito.forEach(function(g) { if (g.mes_id && mesesUnicos.indexOf(g.mes_id)<0) mesesUnicos.push(g.mes_id); });
      if (mesesUnicos.indexOf(mesActualPF)<0) mesesUnicos.push(mesActualPF);
      mesesUnicos.sort(function(a,b){
        var pa=a.split('-'), pb=b.split('-');
        return Number(pb[0])-Number(pa[0]) || Number(pb[1])-Number(pa[1]);
      });
      var MESES_NOM = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

      var shP = el('div',{class:'sh',style:'display:flex;justify-content:space-between;align-items:center'});
      shP.appendChild(el('span',{class:'st'},'\uD83D\uDC76 Gastos Pedrito'));
      var btnPrint = el('button',{class:'btn btnp'},'\uD83D\uDDA8 Imprimir resumen');
      shP.appendChild(btnPrint);
      content.appendChild(shP);

      // Agrupar por año
      var aniosMap = {};
      mesesUnicos.forEach(function(key) { var a=key.split('-')[0]; if(!aniosMap[a]) aniosMap[a]=[]; aniosMap[a].push(key); });
      var anios = Object.keys(aniosMap).sort().reverse();
      var anioSel = _finUIState.anioPedritoSel || anios[0];
      if (anios.indexOf(anioSel)<0) anioSel = anios[0];

      var anioBox = el('div',{style:'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap'});
      anios.forEach(function(anio) {
        var btn = el('button',{class:'tab'+(anio===anioSel?' on':'')}, anio);
        btn.onclick = function(){ _finUIState.anioPedritoSel=anio; anioSel=anio; anioBox.querySelectorAll('.tab').forEach(function(b){b.classList.remove('on');}); btn.classList.add('on'); renderMesesDelAnio(anio); };
        anioBox.appendChild(btn);
      });
      content.appendChild(anioBox);

      var mesSelBox = el('div',{style:'display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap'});
      content.appendChild(mesSelBox);
      var mesContent = el('div',{}); content.appendChild(mesContent);

      function renderMesesDelAnio(anio) {
        mesSelBox.innerHTML = '';
        var mesesDelAnio = (aniosMap[anio] || []).slice().sort(function(a,b){ return Number(b.split('-')[1])-Number(a.split('-')[1]); });
        var mesSelKey = _finUIState.mesPedritoSel;
        if (!mesSelKey || mesesDelAnio.indexOf(mesSelKey)<0) mesSelKey = mesesDelAnio[0];
        mesesDelAnio.forEach(function(key) {
          var parts = key.split('-');
          var btn = el('button',{class:'tab'+(key===mesSelKey?' on':'')}, MESES_NOM[Number(parts[1])]);
          btn.onclick = function(){ _finUIState.mesPedritoSel=key; mesSelBox.querySelectorAll('.tab').forEach(function(b){b.classList.remove('on');}); btn.classList.add('on'); renderMesPedrito(key); };
          mesSelBox.appendChild(btn);
        });
        if (mesSelKey) renderMesPedrito(mesSelKey);
      }

      function renderMesPedrito(key) {
        mesContent.innerHTML = '';
        var gastosMes = gastosPedrito.filter(function(g){ return g.mes_id===key; });
        var totalMes = gastosMes.reduce(function(s,g){return s+Number(g.monto||0);},0);
        var totalPagado = gastosMes.filter(function(g){return g.pagado;}).reduce(function(s,g){return s+Number(g.monto||0);},0);
        var totalPendiente = totalMes - totalPagado;

        var ingPrev = ingresosPF.filter(function(i){ return i.mes_id===key && (i.categoria==='Pedrito'||i.categoria==='Alimentos'); });
        var totalIngPrev = ingPrev.reduce(function(s,i){return s+Number(i.monto||0);},0);
        var aCargoJuan = Math.max(0, totalMes - totalIngPrev);
        var kpiRow = el('div',{style:'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px'});
        [{label:'Total gastos',val:fmt(totalMes),color:'#1a2e4a',bg:'#F0F9FF',border:'#BAE6FD'},
         {label:'Aporte Emilse',val:fmt(totalIngPrev),color:'#3D8A32',bg:'#EDF7EA',border:'#BBF7D0'},
         {label:'A cargo Juan Cruz',val:fmt(aCargoJuan),color:'#0B9EDA',bg:'#F0F9FF',border:'#BAE6FD'},
        ].forEach(function(k){ var box=el('div',{style:'background:'+k.bg+';border:.5px solid '+k.border+';border-radius:10px;padding:14px 16px'}); box.appendChild(el('div',{style:'font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px'},k.label)); box.appendChild(el('div',{style:'font-size:20px;font-weight:700;color:'+k.color},k.val)); kpiRow.appendChild(box); });
        mesContent.appendChild(kpiRow);

        var tblCard = el('div',{class:'card'});
        if (!gastosMes.length) { tblCard.appendChild(el('div',{class:'emp'},'Sin gastos para este mes.')); }
        else {
          var tbl = el('table',{class:'tbl'}); tbl.appendChild(elH('thead',{},'<tr><th>Concepto</th><th style="text-align:right">Monto</th><th style="text-align:center">Estado</th></tr>')); var tb = el('tbody');
          gastosMes.sort(function(a,b){return Number(b.monto)-Number(a.monto);}).forEach(function(g){
            var tr=el('tr'); tr.appendChild(el('td',{style:'font-weight:500;color:#1a2e4a'},g.concepto||'-')); tr.appendChild(el('td',{style:'text-align:right;font-weight:600;font-size:14px'},fmt(g.monto||0)));
            var est=el('td',{style:'text-align:center'}); est.appendChild(el('span',{style:'font-size:11px;padding:2px 8px;border-radius:12px;background:'+(g.pagado?'#EDF7EA':'#FEF2F2')+';color:'+(g.pagado?'#3D8A32':'#A32D2D')},g.pagado?'Pagado':'Pendiente')); tr.appendChild(est); tb.appendChild(tr);
          });
          tbl.appendChild(tb); tblCard.appendChild(tbl);
        }
        mesContent.appendChild(tblCard);

        // Ingresos de Pedrito
        var ingP = ingresosPF.filter(function(i){ return i.mes_id===key && (i.categoria==='Pedrito'||i.categoria==='Alimentos'); });
        if (ingP.length) {
          var ingShEl=el('div',{class:'sh',style:'margin-top:14px'}); ingShEl.appendChild(el('span',{class:'st'},'\uD83D\uDCB0 Ingresos del mes')); mesContent.appendChild(ingShEl);
          var totalIng=ingP.reduce(function(s,i){return s+Number(i.monto||0);},0);
          var ingCard=el('div',{class:'card'}); var ingTbl=el('table',{class:'tbl'}); ingTbl.appendChild(elH('thead',{},'<tr><th>Concepto</th><th style="text-align:right">Monto</th></tr>')); var ingTb=el('tbody');
          ingP.forEach(function(i){ var tr=el('tr'); tr.appendChild(el('td',{style:'font-weight:500'},i.concepto||i.categoria||'-')); tr.appendChild(el('td',{style:'text-align:right;font-weight:600;color:#3D8A32'},fmt(i.monto||0))); ingTb.appendChild(tr); });
          ingTbl.appendChild(ingTb); ingCard.appendChild(ingTbl); mesContent.appendChild(ingCard);

        }

        var parts2 = key.split('-');
        btnPrint.onclick = function(){ imprimirPedrito(gastosMes, ingPrev, totalMes, totalIngPrev, diferencia, Number(parts2[1]), Number(parts2[0])); };
      }

      if (anios.length) renderMesesDelAnio(anioSel);
      else mesContent.appendChild(el('div',{class:'emp'},'Sin gastos registrados para Pedrito todavía.'));
    }

    function imprimirPedrito(gastos, ingresos, total, totalIng, diferencia, mes, anio) {
      var MN = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      var filas = gastos.sort(function(a,b){return Number(b.monto)-Number(a.monto);}).map(function(g){
        return '<tr><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a2e4a">'+(g.concepto||'-')+'</td>'+
          '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px">$'+Number(g.monto||0).toLocaleString('es-AR')+'</td>'+
          '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:center"><span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+(g.pagado?'#EDF7EA':'#FEF2F2')+';color:'+(g.pagado?'#3D8A32':'#A32D2D')+'">'+(g.pagado?'Pagado':'Pendiente')+'</span></td></tr>';
      }).join('');
      var filasIng = ingresos.length ? ingresos.map(function(i){
        return '<tr><td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a2e4a">'+(i.concepto||i.categoria||'-')+'</td>'+
          '<td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;color:#3D8A32">$'+Number(i.monto||0).toLocaleString('es-AR')+'</td></tr>';
      }).join('') : '<tr><td colspan="2" style="padding:10px 16px;color:#94a3b8;font-size:13px">Sin ingresos registrados</td></tr>';
      var difColor = diferencia >= 0 ? '#3D8A32' : '#A32D2D';
      var html='<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Gastos Pedro \u2014 '+MN[mes]+' '+anio+'</title>'+
        '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Helvetica Neue",Arial,sans-serif;background:#f8fafc;padding:40px}'+
        '.container{max-width:680px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}'+
        '.header{background:linear-gradient(135deg,#1a2e4a 0%,#0B9EDA 100%);padding:32px 36px;color:#fff}'+
        '.header h1{font-size:26px;font-weight:800;margin-bottom:4px}.header p{font-size:14px;opacity:.75}'+
        '.kpis{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:2px solid #f0f0f0}'+
        '.kpi{padding:18px 20px;text-align:center;border-right:1px solid #f0f0f0}.kpi:last-child{border-right:none}'+
        '.kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:6px}'+
        '.kpi-val{font-size:20px;font-weight:800}'+
        '.section-title{padding:14px 16px 6px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;border-top:1px solid #f0f0f0}'+
        'table{width:100%;border-collapse:collapse}thead tr{background:#F8FAFC}'+
        'thead th{padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;text-align:left;border-bottom:1px solid #f0f0f0}'+
        'thead th:nth-child(2){text-align:right}thead th:nth-child(3){text-align:center}'+
        '.balance{padding:16px 20px;display:flex;justify-content:space-between;align-items:center;background:#F8FAFC;border-top:2px solid #f0f0f0}'+
        '.footer{padding:14px 36px;font-size:11px;color:#94a3b8;text-align:center;border-top:1px solid #f0f0f0}'+
        '@media print{body{padding:0;background:#fff}.container{box-shadow:none;border-radius:0}}</style></head><body>'+
        '<div class="container">'+
        '<div class="header"><h1>\uD83D\uDC76 Gastos de Pedro</h1><p>'+MN[mes]+' '+anio+'</p></div>'+
        '<div class="kpis">'+
          '<div class="kpi"><div class="kpi-label">Total gastos</div><div class="kpi-val" style="color:#1a2e4a">$'+Number(total).toLocaleString('es-AR')+'</div></div>'+
          '<div class="kpi"><div class="kpi-label">Aporte Emilse</div><div class="kpi-val" style="color:#3D8A32">$'+Number(totalIng).toLocaleString('es-AR')+'</div></div>'+
          '<div class="kpi"><div class="kpi-label">A cargo Juan Cruz</div><div class="kpi-val" style="color:#0B9EDA">$'+Number(Math.max(0,total-totalIng)).toLocaleString('es-AR')+'</div></div>'+
        '</div>'+
        '<div class="section-title">Gastos del mes</div>'+
        '<table><thead><tr><th>Concepto</th><th style="text-align:right">Monto</th><th style="text-align:center">Estado</th></tr></thead><tbody>'+filas+'</tbody></table>'+
        '<div class="section-title">Aportes de Emilse</div>'+
        '<table><thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead><tbody>'+filasIng+'</tbody></table>'+
        '<div class="balance"><span style="font-size:13px;color:#64748B;font-weight:500">A cargo Juan Cruz (gastos − aporte Emilse)</span><span style="font-size:20px;font-weight:800;color:#0B9EDA">$'+Number(Math.max(0,total-totalIng)).toLocaleString('es-AR')+'</span></div>'+
        '<div class="footer">Generado por QP C&IA \u00B7 '+new Date().toLocaleDateString('es-AR')+'</div></div></body></html>';
      var w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(function(){w.print();},500);
    }

    montarChatAsesorPF(wrap);
    setApp(wrap);
  }).catch(function(e){ setApp(el('div',{class:'emp',style:'color:red'},'Error: '+e.message)); });
}


function mNuevaCuotaPF(cb) {
  openM(makeModal('Nueva cuota / credito', function(body) {
    addFg(body, 'Nombre', mkInput('npf-nom','text','','Ej: Credito Nacion 1/36'));
    mkRow2(body,
      mkFg('Tipo', mkSelect('npf-tipo',[['credito','Credito'],['servicio','Servicio'],['alquiler','Alquiler'],['seguro','Seguro'],['otro','Otro']],'credito')),
      mkFg('Monto cuota ($)', mkInput('npf-monto','number','0'))
    );
    mkRow2(body,
      mkFg('Cuota actual (al inicio)', mkInput('npf-actual','number','1')),
      mkFg('Cantidad total de cuotas', mkInput('npf-total','number',''))
    );
    addFg(body, 'Mes de inicio', mkInput('npf-inicio','month',new Date().toISOString().slice(0,7)));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var nom = gv('npf-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
      var inicio = gv('npf-inicio'); var iy=null, im=null;
      if (inicio) { var p = inicio.split('-'); iy = Number(p[0]); im = Number(p[1]); }
      dbIns('panel_pf_cuotas', {
        nombre: nom, tipo: gv('npf-tipo'), monto: Number(gv('npf-monto')||0),
        cuota_actual: Number(gv('npf-actual')||1), cuota_total: gv('npf-total')?Number(gv('npf-total')):null,
        inicio_year: iy, inicio_month: im, activa: true
      }).then(function(r){ closeM(); cb((r&&r[0])||null); });
    };
    foot.appendChild(ok);
  }));
}

function mEditarCuotaPF(c, cb) {
  openM(makeModal('Editar: ' + c.nombre, function(body) {
    addFg(body, 'Nombre', mkInput('epf-nom','text',c.nombre));
    mkRow2(body,
      mkFg('Tipo', mkSelect('epf-tipo',[['credito','Credito'],['servicio','Servicio'],['alquiler','Alquiler'],['seguro','Seguro'],['otro','Otro']],c.tipo||'credito')),
      mkFg('Monto cuota ($)', mkInput('epf-monto','number',c.monto||0))
    );
    mkRow2(body,
      mkFg('Cuota actual (al inicio)', mkInput('epf-actual','number',c.cuota_actual||1)),
      mkFg('Cantidad total de cuotas', mkInput('epf-total','number',c.cuota_total||''))
    );
    var inicioVal = (c.inicio_year && c.inicio_month) ? (c.inicio_year+'-'+String(c.inicio_month).padStart(2,'0')) : '';
    addFg(body, 'Mes de inicio', mkInput('epf-inicio','month',inicioVal));
    addFg(body, 'Activa', mkSelect('epf-activa',[['true','Si'],['false','No']],c.activa?'true':'false'));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var inicio = gv('epf-inicio'); var iy=null, im=null;
      if (inicio) { var p = inicio.split('-'); iy = Number(p[0]); im = Number(p[1]); }
      dbUpd('panel_pf_cuotas', c.id, {
        nombre: gv('epf-nom'), tipo: gv('epf-tipo'), monto: Number(gv('epf-monto')||0),
        cuota_actual: Number(gv('epf-actual')||1), cuota_total: gv('epf-total')?Number(gv('epf-total')):null,
        inicio_year: iy, inicio_month: im, activa: gv('epf-activa')==='true'
      }).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}


function mNuevoIngreso(sistemas, clientes, cb) {
  var hoy = new Date().toISOString().slice(0,10);
  openM(makeModal('Nuevo ingreso', function(body) {
    addFg(body, 'Descripcion', mkInput('ni-desc','text','','Ej: Consultoria puntual'));
    mkRow2(body,
      mkFg('Categoria', mkSelect('ni-cat',[['servicio','Servicio'],['implementacion','Implementacion'],['fee','Fee'],['consulta','Consultoria'],['otro','Otro']],'servicio')),
      mkFg('Fecha', mkInput('ni-fecha','date',hoy))
    );
    mkRow2(body, mkFg('Monto', mkInput('ni-monto','number','0')), mkFg('Moneda', mkSelect('ni-mon',[['ARS','ARS'],['USD','USD']],'ARS')));
    addFg(body, 'Sistema (opcional)', mkSelect('ni-sis', [['','-- ninguno --']].concat(sistemas.map(function(s){ return [s.id, s.nombre]; })), ''));
    addFg(body, 'Cliente (opcional)', mkSelect('ni-cli', [['','-- ninguno --']].concat(clientes.map(function(c){ return [c.id, c.nombre]; })), ''));
    addFg(body, 'Notas', mkInput('ni-notas','text',''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var desc = gv('ni-desc').trim(); if (!desc) { alert('Descripcion obligatoria'); return; }
      dbIns('panel_ingresos', {
        descripcion: desc, categoria: gv('ni-cat'),
        monto: Number(gv('ni-monto')||0), moneda: gv('ni-mon'),
        fecha: gv('ni-fecha'), notas: gv('ni-notas')||null,
        sistema_id: gv('ni-sis')||null, cliente_id: gv('ni-cli')||null
      }).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}

function mNuevoGasto(cb) {
  var hoy = new Date().toISOString().slice(0,10);
  openM(makeModal('Nuevo gasto', function(body) {
    addFg(body, 'Nombre', mkInput('ng-nom','text','','Ej: Supabase Pro'));
    mkRow2(body,
      mkFg('Categoria', mkSelect('ng-cat',[['infraestructura','Infraestructura'],['ia','IA'],['herramienta','Herramienta'],['suscripcion','Suscripcion'],['otro','Otro']],'herramienta')),
      mkFg('Frecuencia', mkSelect('ng-frec',[['mensual','Mensual'],['anual','Anual'],['unico','Unico']],'mensual'))
    );
    mkRow2(body, mkFg('Monto', mkInput('ng-monto','number','0')), mkFg('Moneda', mkSelect('ng-mon',[['USD','USD'],['ARS','ARS']],'USD')));
    addFg(body, 'Proximo pago', mkInput('ng-fecha','date',hoy));
    addFg(body, 'Notas', mkInput('ng-notas','text',''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var nom = gv('ng-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
      dbIns('panel_gastos', {
        nombre: nom, categoria: gv('ng-cat'), frecuencia: gv('ng-frec'),
        monto: Number(gv('ng-monto')||0), moneda: gv('ng-mon'),
        fecha_proximo_pago: gv('ng-fecha')||null, notas: gv('ng-notas')||null, activo: true
      }).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}

function mEditarGasto(g, cb) {
  openM(makeModal('Editar: '+g.nombre, function(body) {
    addFg(body, 'Nombre', mkInput('eg-nom','text',g.nombre));
    mkRow2(body,
      mkFg('Categoria', mkSelect('eg-cat',[['infraestructura','Infraestructura'],['ia','IA'],['herramienta','Herramienta'],['suscripcion','Suscripcion'],['otro','Otro']],g.categoria||'herramienta')),
      mkFg('Frecuencia', mkSelect('eg-frec',[['mensual','Mensual'],['anual','Anual'],['unico','Unico']],g.frecuencia||'mensual'))
    );
    mkRow2(body, mkFg('Monto', mkInput('eg-monto','number',g.monto||0)), mkFg('Moneda', mkSelect('eg-mon',[['USD','USD'],['ARS','ARS']],g.moneda||'USD')));
    addFg(body, 'Proximo pago', mkInput('eg-fecha','date',g.fecha_proximo_pago?g.fecha_proximo_pago.slice(0,10):''));
    addFg(body, 'Notas', mkInput('eg-notas','text',g.notas||''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      dbUpd('panel_gastos', g.id, {
        nombre:gv('eg-nom'), categoria:gv('eg-cat'), frecuencia:gv('eg-frec'),
        monto:Number(gv('eg-monto')||0), moneda:gv('eg-mon'),
        fecha_proximo_pago:gv('eg-fecha')||null, notas:gv('eg-notas')||null
      }).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}


function cargarCuentasGastoPF() {
  return sbFetch('panel_pf_cuentas?select=id,nombre,institucion,moneda,tipo,reservada&activa=eq.true&order=orden.asc').catch(function(){ return []; })
    .then(function(cts){ return (cts||[]).filter(function(x){ return !x.reservada; }); });
}
function selCuentaGastoPF(cts, id, gasto) {
  var opts = [['','(sin asignar)']].concat(cts.map(function(c){
    return [c.id, c.tipo==='tarjeta' ? '💳 '+c.nombre : (c.institucion||c.nombre)+' · '+(c.moneda==='USD'?'USD':'pesos')];
  }));
  var def = '';
  try { def = localStorage.getItem('qp_cta_gasto_'+gasto.id) || ''; } catch(e) {}
  if (!cts.some(function(c){ return c.id===def; })) {
    var mon = gasto.moneda==='USD' ? 'USD' : 'ARS';
    var tj = cts.find(function(c){ return c.tipo==='tarjeta' && c.moneda===mon; });
    def = tj ? tj.id : '';
  }
  return mkSelect(id, opts, def);
}
function registrarPagoGasto(g, cb) { cargarCuentasGastoPF().then(function(cts){ registrarPagoGastoUI(g, cb, cts); }); }
function registrarPagoGastoUI(g, cb, cts) {
  if (!g.fecha_proximo_pago) { alert('Sin fecha de proximo pago configurada'); return; }
  var fecha = new Date(g.fecha_proximo_pago);
  if (g.frecuencia==='mensual') fecha.setMonth(fecha.getMonth()+1);
  else if (g.frecuencia==='anual') fecha.setFullYear(fecha.getFullYear()+1);
  var nuevaFecha = fecha.toISOString().slice(0,10);
  openM(makeModal('Registrar pago: '+g.nombre, function(body) {
    body.appendChild(el('div', {class:'ibox'}, g.nombre+' — $'+Number(g.monto).toFixed(2)+' '+g.moneda));
    mkRow2(body,
      mkFg('Fecha de pago', mkInput('rp-fecha','date',g.fecha_proximo_pago?g.fecha_proximo_pago.slice(0,10):new Date().toISOString().slice(0,10))),
      mkFg('Monto pagado', mkInput('rp-monto','number',g.monto||0))
    );
    if (g.moneda === 'USD') {
      mkRow2(body,
        mkFg('Tipo de cambio BNA (auto)', mkInput('rp-tc','number','','Cargando...')),
        mkFg('Moneda', mkSelect('rp-mon',[['USD','USD'],['ARS','ARS']],g.moneda||'USD'))
      );
      fetch('https://dolarapi.com/v1/dolares/oficial').then(function(r){ return r.json(); }).then(function(d){
        var inp = document.getElementById('rp-tc'); if (inp) inp.value = d.venta || 1200;
      }).catch(function(){ var inp = document.getElementById('rp-tc'); if (inp) inp.value = 1200; });
    }
    if (cts.length) addFg(body, '¿Con qué pagaste? (tarjeta o cuenta)', selCuentaGastoPF(cts, 'rp-cuenta', g));
    addFg(body, 'Notas', mkInput('rp-notas','text','','Ej: Factura #123'));
    body.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-top:4px'}, 'Proximo pago quedara en: '+nuevaFecha));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btns'}, 'Confirmar pago');
    ok.onclick = function() {
      var tc = Number(document.getElementById('rp-tc') ? document.getElementById('rp-tc').value : 1) || 1;
      var monto = Number(gv('rp-monto')||g.monto);
      var moneda = document.getElementById('rp-mon') ? gv('rp-mon') : g.moneda;
      var montoARS = moneda==='USD' ? monto*tc : monto;
      Promise.all([
        dbIns('panel_gastos_pagos', Object.assign({
          gasto_id: g.id, fecha: gv('rp-fecha'),
          monto: monto, moneda: moneda,
          tipo_cambio: tc, monto_ars: montoARS,
          notas: gv('rp-notas')||null
        }, cts.length ? {cuenta_id: gv('rp-cuenta')||null} : {})),
        dbUpd('panel_gastos', g.id, {fecha_proximo_pago: nuevaFecha})
      ]).then(function(){ try { if (cts.length) localStorage.setItem('qp_cta_gasto_'+g.id, gv('rp-cuenta')||''); } catch(e) {} closeM(); cb(); }).catch(function(e){ alert('Error: '+e.message+(cts.length ? '\n\nSi dice que no existe la columna cuenta_id, falta correr el SQL de tarjetas.' : '')); });
    };
    foot.appendChild(ok);
  }));
}

// ── GASTOS PERSONALES ─────────────────────────────────────────
function mNuevoGastoPersonal(cb) {
  var hoy = new Date().toISOString().slice(0,10);
  openM(makeModal('Nuevo gasto personal', function(body) {
    addFg(body, 'Nombre', mkInput('ngp-nom','text','','Ej: Alquiler, Gimnasio, Netflix'));
    mkRow2(body,
      mkFg('Categoria', mkSelect('ngp-cat',[['vivienda','Vivienda'],['alimentacion','Alimentacion'],['transporte','Transporte'],['salud','Salud'],['entretenimiento','Entretenimiento'],['suscripcion','Suscripcion'],['otro','Otro']],'otro')),
      mkFg('Frecuencia', mkSelect('ngp-frec',[['mensual','Mensual'],['anual','Anual'],['unico','Unico']],'mensual'))
    );
    mkRow2(body, mkFg('Monto', mkInput('ngp-monto','number','0')), mkFg('Moneda', mkSelect('ngp-mon',[['ARS','ARS'],['USD','USD']],'ARS')));
    addFg(body, 'Proximo pago', mkInput('ngp-fecha','date',hoy));
    addFg(body, 'Notas', mkInput('ngp-notas','text',''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var nom = gv('ngp-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
      dbIns('panel_gastos_personales', {
        nombre: nom, categoria: gv('ngp-cat'), frecuencia: gv('ngp-frec'),
        monto: Number(gv('ngp-monto')||0), moneda: gv('ngp-mon'),
        fecha_proximo_pago: gv('ngp-fecha')||null, notas: gv('ngp-notas')||null, activo: true
      }).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}

function mEditarGastoPersonal(g, cb) {
  openM(makeModal('Editar: '+g.nombre, function(body) {
    addFg(body, 'Nombre', mkInput('egp-nom','text',g.nombre));
    mkRow2(body,
      mkFg('Categoria', mkSelect('egp-cat',[['vivienda','Vivienda'],['alimentacion','Alimentacion'],['transporte','Transporte'],['salud','Salud'],['entretenimiento','Entretenimiento'],['suscripcion','Suscripcion'],['otro','Otro']],g.categoria||'otro')),
      mkFg('Frecuencia', mkSelect('egp-frec',[['mensual','Mensual'],['anual','Anual'],['unico','Unico']],g.frecuencia||'mensual'))
    );
    mkRow2(body, mkFg('Monto', mkInput('egp-monto','number',g.monto||0)), mkFg('Moneda', mkSelect('egp-mon',[['ARS','ARS'],['USD','USD']],g.moneda||'ARS')));
    addFg(body, 'Proximo pago', mkInput('egp-fecha','date',g.fecha_proximo_pago?g.fecha_proximo_pago.slice(0,10):''));
    addFg(body, 'Notas', mkInput('egp-notas','text',g.notas||''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      dbUpd('panel_gastos_personales', g.id, {
        nombre:gv('egp-nom'), categoria:gv('egp-cat'), frecuencia:gv('egp-frec'),
        monto:Number(gv('egp-monto')||0), moneda:gv('egp-mon'),
        fecha_proximo_pago:gv('egp-fecha')||null, notas:gv('egp-notas')||null
      }).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}

function registrarPagoGastoPersonal(g, cb) { cargarCuentasGastoPF().then(function(cts){ registrarPagoGastoPersonalUI(g, cb, cts); }); }
function registrarPagoGastoPersonalUI(g, cb, cts) {
  if (!g.fecha_proximo_pago) { alert('Sin fecha de proximo pago configurada'); return; }
  var fecha = new Date(g.fecha_proximo_pago);
  if (g.frecuencia==='mensual') fecha.setMonth(fecha.getMonth()+1);
  else if (g.frecuencia==='anual') fecha.setFullYear(fecha.getFullYear()+1);
  var nuevaFecha = fecha.toISOString().slice(0,10);
  openM(makeModal('Registrar pago: '+g.nombre, function(body) {
    body.appendChild(el('div', {class:'ibox'}, g.nombre+' — $'+Number(g.monto).toFixed(2)+' '+g.moneda));
    mkRow2(body,
      mkFg('Fecha de pago', mkInput('rpp-fecha','date',g.fecha_proximo_pago?g.fecha_proximo_pago.slice(0,10):new Date().toISOString().slice(0,10))),
      mkFg('Monto pagado', mkInput('rpp-monto','number',g.monto||0))
    );
    if (g.moneda === 'USD') {
      mkRow2(body,
        mkFg('Tipo de cambio BNA (auto)', mkInput('rpp-tc','number','','Cargando...')),
        mkFg('Moneda', mkSelect('rpp-mon',[['USD','USD'],['ARS','ARS']],g.moneda||'USD'))
      );
      fetch('https://dolarapi.com/v1/dolares/oficial').then(function(r){ return r.json(); }).then(function(d){
        var inp = document.getElementById('rpp-tc'); if (inp) inp.value = d.venta || 1200;
      }).catch(function(){ var inp = document.getElementById('rpp-tc'); if (inp) inp.value = 1200; });
    }
    if (cts.length) addFg(body, '¿Con qué pagaste? (tarjeta o cuenta)', selCuentaGastoPF(cts, 'rpp-cuenta', g));
    addFg(body, 'Notas', mkInput('rpp-notas','text','','Ej: Factura'));
    body.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-top:4px'}, 'Proximo pago quedara en: '+nuevaFecha));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btns'}, 'Confirmar pago');
    ok.onclick = function() {
      var tc = Number(document.getElementById('rpp-tc') ? document.getElementById('rpp-tc').value : 1) || 1;
      var monto = Number(gv('rpp-monto')||g.monto);
      var moneda = document.getElementById('rpp-mon') ? gv('rpp-mon') : g.moneda;
      var montoARS = moneda==='USD' ? monto*tc : monto;
      Promise.all([
        dbIns('panel_gastos_personales_pagos', Object.assign({
          gasto_id: g.id, fecha: gv('rpp-fecha'),
          monto: monto, moneda: moneda,
          tipo_cambio: tc, monto_ars: montoARS,
          notas: gv('rpp-notas')||null
        }, cts.length ? {cuenta_id: gv('rpp-cuenta')||null} : {})),
        dbUpd('panel_gastos_personales', g.id, {fecha_proximo_pago: nuevaFecha})
      ]).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}


// ── EL PIAMONTE — CONTROL DE FASES ───────────────────────────────────────────
var PIAMONTE_URL = 'https://hjzhatercccblhgaukgx.supabase.co';
var PIAMONTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqemhhdGVyY2NjYmxoZ2F1a2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQwMjMsImV4cCI6MjA5NjMyMDAyM30.XYoxEnhkvxIB0pAPAT6H3-mn70uxLzwNYqJQIjoKc3o';

function mGestionFasesEstructura(s) {
  function refrescar() {
    sbFetch('panel_fases?sistema_id=eq.'+s.id+'&order=orden.asc').then(function(fases){ render(fases||[]); });
  }
  function render(fases) {
    openM(makeModal('⚙ Fases — '+s.nombre, function(body) {
      var info = el('div', {style:'background:#EEF2FF;border:.5px solid #6366F1;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#4338CA'});
      info.appendChild(document.createTextNode('Estas son las fases estructurales del sistema. Los precios por cliente se asignan desde Clientes → Fases.'));
      body.appendChild(info);

      if (!fases.length) {
        body.appendChild(el('div', {class:'emp', style:'margin-bottom:12px'}, 'Sin fases definidas todavía.'));
      } else {
        fases.forEach(function(f) {
          var row = el('div', {style:'display:flex;align-items:center;gap:8px;padding:8px 12px;border:.5px solid #E2E8F0;border-radius:8px;margin-bottom:6px'});
          var ord = el('span', {style:'font-size:11px;font-weight:700;color:#6366F1;width:20px;flex-shrink:0'}, f.orden+'.');
          row.appendChild(ord);
          var txt = el('div', {style:'flex:1'});
          txt.appendChild(el('div', {style:'font-weight:500;font-size:13px'}, f.nombre));
          if (f.descripcion) txt.appendChild(el('div', {style:'font-size:11px;color:#64748B'}, f.descripcion));
          row.appendChild(txt);
          var btnEdit = el('button', {class:'btn btnsm'}, 'Editar');
          (function(ff){ btnEdit.onclick = function() {
            var nom = prompt('Nombre de la fase:', ff.nombre); if (!nom) return;
            var desc = prompt('Descripción (opcional):', ff.descripcion||'');
            sbFetch('panel_fases?id=eq.'+ff.id, {method:'PATCH', headers:{'Content-Type':'application/json','Prefer':'return=minimal'}, body:JSON.stringify({nombre:nom, descripcion:desc||null})})
            .then(refrescar);
          }; })(f);
          row.appendChild(btnEdit);
          var btnDel = el('button', {class:'btn btnsm', style:'color:#E53E3E;border-color:#FECACA'}, '×');
          (function(ff){ btnDel.onclick = function() {
            if (!confirm('¿Eliminar fase "'+ff.nombre+'"? Se perderá el vínculo con los cobros asociados.')) return;
            sbFetch('panel_fases?id=eq.'+ff.id, {method:'DELETE', headers:{'Prefer':'return=minimal'}}).then(refrescar);
          }; })(f);
          row.appendChild(btnDel);
          body.appendChild(row);
        });
      }

      // Agregar nueva fase
      body.appendChild(el('div', {style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px'}, 'Agregar fase'));
      mkRow2(body, mkFg('Nombre', mkInput('gfe-nom','text','','Ej: Gestión Avanzada')), mkFg('Orden', mkInput('gfe-ord','number', fases.length+1)));
      addFg(body, 'Descripción (opcional)', mkInput('gfe-desc','text',''));

    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button', {class:'btn btnp'}, '+ Agregar fase');
      ok.onclick = function() {
        var nom = gv('gfe-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
        var ord = Number(gv('gfe-ord')||1);
        var desc = gv('gfe-desc')||null;
        ok.textContent = 'Guardando...'; ok.disabled = true;
        dbIns('panel_fases', {sistema_id:s.id, nombre:nom, orden:ord, descripcion:desc})
        .then(function(){ refrescar(); ok.textContent='+ Agregar fase'; ok.disabled=false; })
        .catch(function(e){ alert('Error: '+e.message); ok.textContent='+ Agregar fase'; ok.disabled=false; });
      };
      foot.appendChild(ok);
    }));
  }
  refrescar();
}

function mFasesElPiamonte() {
  fetch(PIAMONTE_URL + '/functions/v1/panel-qp', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + getAuthKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'fase_get' })
  }).then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function(data) {
    var faseActual = (data && data.fase_habilitada) ? Number(data.fase_habilitada) : 1;
    renderModalFases(faseActual);
  }).catch(function(e) {
    alert('Error al leer configuracion: ' + e.message);
  });
}

function renderModalFases(faseActual) {
  var FASES = [
    { num: 1, label: 'Fase 1 — Operativa', desc: 'Turnos · Clientes · Precios · Presupuestos · OS · Comprobantes · ADAS · Caja · Stock basico · Catalogo', precio: '$1.500.000', color: '#5BBD4E' },
    { num: 2, label: 'Fase 2 — Gestion avanzada', desc: 'Compras · Proveedores · Articulos · Depositos · Stock movimientos · Arqueo · Tarjetas · Rentabilidades · Cta Corriente · Busqueda · Remitos', precio: '$600.000', color: '#0B9EDA' },
    { num: 3, label: 'Fase 3 — Contabilidad', desc: 'Modulo Contable · Libro IVA · Balance · Para el contador · ARCA (pendiente certificado del cliente)', precio: '$600.000', color: '#7F77DD' }
  ];

  var wrapF = el('div',{});
  var shF = el('div',{class:'sh',style:'margin-bottom:16px'});
  var bSisF = el('button',{class:'btn'},'← Sistemas'); bSisF.onclick=function(){ go('sistemas'); };
  shF.appendChild(bSisF);
  (function(){
    var hP=el('div',{style:'display:flex;align-items:center;gap:6px;margin-left:12px'});
    hP.appendChild(el('img',{src:'https://jcquarleri.vercel.app/piamonte-logo.png',style:'width:20px;height:20px;object-fit:contain;border-radius:4px'}));
    hP.appendChild(el('span',{class:'st'},'El Piamonte — Control de fases'));
    shF.appendChild(hP);
  })();
  wrapF.appendChild(shF);
  var body = el('div',{});
  wrapF.appendChild(body);
  setApp(wrapF);
  var info = el('div', {class:'card',style:'background:#FEF0EB;border:.5px solid #E8855A;padding:12px 16px;margin-bottom:14px'});
  var infoTxt = el('div', {style:'font-size:12px;color:#854F0B'});
  infoTxt.appendChild(el('b', {}, 'Fase activa: ' + faseActual));
  infoTxt.appendChild(document.createTextNode(' — Los módulos de fases superiores están ocultos para el cliente hasta que se desbloqueen.'));
  info.appendChild(infoTxt);
    body.appendChild(info);

    FASES.forEach(function(f) {
      var pagada = faseActual >= f.num;
      var esSiguiente = f.num === faseActual + 1;

      var card = el('div', {style:'border:.5px solid '+(pagada?f.color:'#E2E8F0')+';border-radius:10px;padding:14px 16px;margin-bottom:10px;background:'+(pagada?'rgba(0,0,0,.02)':'#FAFAFA')});

      var top = el('div', {style:'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px'});
      var left = el('div', {style:'display:flex;align-items:center;gap:10px'});
      var dot = el('div', {style:'width:14px;height:14px;border-radius:50%;flex-shrink:0;background:'+(pagada?f.color:'#CBD5E1')});
      var titWrap = el('div', {});
      titWrap.appendChild(el('div', {style:'font-weight:600;font-size:13px;color:'+(pagada?f.color:'#94A3B8')}, f.label));
      titWrap.appendChild(el('div', {style:'font-size:11px;color:#94A3B8;margin-top:1px'}, f.precio));
      left.appendChild(dot); left.appendChild(titWrap);
      top.appendChild(left);

      var badgeTxt = pagada ? (faseActual === f.num ? 'Activa' : 'Incluida') : (esSiguiente ? 'Pendiente pago' : 'Bloqueada');
      var badgeBg  = pagada ? f.color : esSiguiente ? '#FEF0EB' : '#F1F5F9';
      var badgeCol = pagada ? '#fff'   : esSiguiente ? '#854F0B' : '#94A3B8';
      top.appendChild(el('span', {style:'padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:'+badgeBg+';color:'+badgeCol}, badgeTxt));
      card.appendChild(top);

      card.appendChild(el('div', {style:'font-size:12px;color:#64748B;line-height:1.5;padding-left:24px'}, f.desc));

      if (esSiguiente) {
        var btnU = el('button', {class:'btn btnp', style:'margin-top:10px;margin-left:24px'}, 'Desbloquear ' + f.label);
        (function(num, lbl) {
          btnU.onclick = function() {
            if (!confirm('Confirmas desbloquear ' + lbl + ' para El Piamonte?\n\nEsto habilitara los modulos inmediatamente en el sistema del cliente.')) return;
            btnU.textContent = 'Desbloqueando...'; btnU.disabled = true;
            fetch(PIAMONTE_URL + '/functions/v1/panel-qp', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + getAuthKey(), 'Content-Type': 'application/json' },
              body: JSON.stringify({ accion: 'fase_set', fase: num })
            }).then(function(r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              closeM();
              alert(lbl + ' desbloqueada correctamente.\nEl cliente ya puede acceder a los nuevos modulos.');
            }).catch(function(e) {
              btnU.textContent = 'Desbloquear ' + lbl; btnU.disabled = false;
              alert('Error: ' + e.message);
            });
          };
        })(f.num, f.label);
        card.appendChild(btnU);
      }

      body.appendChild(card);
    });

    var linkRow = el('div', {style:'text-align:center;margin-top:10px'});
    linkRow.appendChild(el('a', {href:'https://elpiamonte.vercel.app', target:'_blank', style:'font-size:12px;color:#E8855A;text-decoration:none'}, 'Ir a elpiamonte.vercel.app'));
  body.appendChild(linkRow);
}

// ── CONEOS SUPERADMIN ────────────────────────────────────────────────
var _coneosEmpresas = [];
var _coneosEmpresaSel = null;

function coneosCall(action, payload) {
  // Paso 0: la Edge Function valida al actor — se manda el JWT del usuario logueado, no la anon key
  var tok = window._authToken;
  if (!tok) {
    alert('Sesión no válida. Ingresá de nuevo al panel.');
    sessionStorage.removeItem('qp_auth'); location.reload();
    return Promise.reject(new Error('sin sesión'));
  }
  return fetch(SB_URL + '/functions/v1/coneos-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + tok },
    body: JSON.stringify({ action: action, payload: payload || {} })
  }).then(function(r) {
    // 401: token vencido o inválido (puede venir del gateway, antes de nuestra función)
    if (r.status === 401) {
      alert('Tu sesión expiró. Ingresá de nuevo al panel.');
      sessionStorage.removeItem('qp_auth'); location.reload();
      throw new Error('sesión expirada');
    }
    return r.json();
  }).then(function(d) {
    if (d && d.error === 'NO_AUTORIZADO') {
      alert('No tenés permisos para esta acción.');
      throw new Error('NO_AUTORIZADO');
    }
    return d;
  });
}

function vConeos() {
  var wrap = el('div', {});
  var sh = el('div', { class: 'sh' });
  var btnSisCone = el('button', { class: 'btn' }, '← Sistemas');
  btnSisCone.onclick = function() { go('sistemas'); };
  sh.appendChild(btnSisCone);
  sh.appendChild(el('div', {style:'display:flex;align-items:center;gap:8px'}, [el('img',{src:'https://jcquarleri.vercel.app/coneos-logo.png',style:'width:24px;height:24px;object-fit:contain;border-radius:6px'}), el('span',{class:'st'},'ConeOS — Superadmin')]));
  var btnNew = el('button', { class: 'btn btnp' }, '+ Nueva empresa');
  btnNew.onclick = function() { mNuevaEmpresaConeos(function() { vConeos(); }); };
  sh.appendChild(btnNew);
  wrap.appendChild(sh);

  var loadCard = el('div', { class: 'card' });
  var loadDiv = el('div', { class: 'emp' }, 'Cargando empresas...');
  loadCard.appendChild(loadDiv);
  wrap.appendChild(loadCard);
  setApp(wrap);

  Promise.all([
    coneosCall('estado_general'),
    sbFetch('panel_asignaciones?coneos_empresa_id=not.is.null&select=coneos_empresa_id,cliente_id').catch(function(){ return []; }),
    sbFetch('panel_clientes?revendedor_id=not.is.null&select=id,revendedor_id').catch(function(){ return []; }),
    sbFetch('revendedores?select=id,nombre').catch(function(){ return []; })
  ]).then(function(rr) {
    var empresas = rr[0];
    if (!Array.isArray(empresas)) { loadDiv.textContent = 'Error al cargar empresas'; return; }
    // Mapa empresa ConeOS -> nombre del partner (si el cliente vinculado es de un revendedor)
    var partnerDeEmpresa = {};
    (rr[1]||[]).forEach(function(a){
      var cli = (rr[2]||[]).find(function(c){ return c.id === a.cliente_id; });
      if (!cli) return;
      var rev = (rr[3]||[]).find(function(r2){ return r2.id === cli.revendedor_id; });
      if (rev) partnerDeEmpresa[a.coneos_empresa_id] = rev.nombre;
    });
    _coneosEmpresas = empresas;
    loadCard.innerHTML = '';

    if (!empresas.length) {
      loadCard.appendChild(el('div', { class: 'emp' }, 'No hay empresas creadas todavía'));
      return;
    }

    var tbl = el('table', { class: 'tbl' });
    tbl.appendChild(elH('thead', {}, '<tr><th>Empresa</th><th>Plan</th><th>Estado</th><th>Pedidos hoy</th><th>Facturado hoy</th><th></th></tr>'));
    var tb = el('tbody', {});

    empresas.forEach(function(emp) {
      var tr = el('tr', {});
      var tdN = el('td', {});
      var nomRow = el('div', { style: 'font-weight:500;display:flex;align-items:center;gap:6px' });
      nomRow.appendChild(document.createTextNode(emp.nombre));
      if (partnerDeEmpresa[emp.id]) nomRow.appendChild(el('span', {style:'font-size:10px;font-weight:600;background:#EFEDFB;color:#7F77DD;border-radius:999px;padding:2px 8px'}, '🤝 ' + partnerDeEmpresa[emp.id]));
      tdN.appendChild(nomRow);
      tdN.appendChild(el('div', { style: 'font-size:11px;color:#94a3b8' }, emp.slug));
      tr.appendChild(tdN);
      tr.appendChild(el('td', {}, emp.plan ? chipClass(emp.plan, 'cb') : '-'));
      tr.appendChild(el('td', {}, [chipClass(emp.activo ? 'Activo' : 'Inactivo', emp.activo ? 'cv' : 'ca')]));
      tr.appendChild(el('td', { style: 'text-align:center;font-weight:500;color:#0B9EDA' }, String(emp.pedidos_hoy||0)));
      tr.appendChild(el('td', { style: 'font-weight:500;color:#3D8A32' }, emp.facturacion_hoy > 0 ? fmt(emp.facturacion_hoy) : '-'));
      var btnVer = el('button', { class: 'btn btnsm' }, 'Ver detalle');
      (function(e) { btnVer.onclick = function() { vConeosEmpresa(e); }; })(emp);
      tr.appendChild(el('td', {}, [btnVer]));
      tb.appendChild(tr);
    });

    tbl.appendChild(tb);
    loadCard.appendChild(tbl);
  }).catch(function(e) {
    loadDiv.textContent = 'Error: ' + e.message;
  });
}

function vConeosEmpresa(emp) {
  var wrap = el('div', {});
  var sh = el('div', { class: 'sh' });
  var btnSis = el('button', { class: 'btn' }, '← Sistemas');
  btnSis.onclick = function() { go('sistemas'); };
  sh.appendChild(btnSis);
  var btnBack = el('button', { class: 'btn' }, 'Empresas');
  btnBack.onclick = function() { vConeos(); };
  sh.appendChild(btnBack);
  sh.appendChild(el('div', {style:'display:flex;align-items:center;gap:8px;margin-left:12px'}, [el('img',{src:'https://jcquarleri.vercel.app/coneos-logo.png',style:'width:20px;height:20px;object-fit:contain;border-radius:4px'}), el('span',{class:'st'},emp.nombre)]));
  var btnEdit = el('button', { class: 'btn' }, 'Editar');
  btnEdit.onclick = function() { mEditarEmpresaConeos(emp, function(empAct) { vConeosEmpresa(empAct); }); };
  sh.appendChild(btnEdit);
  var btnMod = el('button', { class: 'btn', style:'background:#6366F1;border-color:#6366F1;color:#fff' }, 'Plan');
  btnMod.onclick = function() { mPlanConeOS(emp, null); };
  sh.appendChild(btnMod);
  var btnAdmin = el('button', { class: 'btn btnp' }, '+ Usuario admin');
  btnAdmin.onclick = function() { mNuevoAdminConeos(emp, function() { vConeosEmpresa(emp); }); };
  sh.appendChild(btnAdmin);
  wrap.appendChild(sh);

  // Métricas + detalle
  var metCard = el('div', { class: 'card', style: 'padding:16px;margin-bottom:14px' });
  metCard.appendChild(el('div', { class: 'st', style: 'margin-bottom:12px' }, 'Estado de hoy'));
  var metLoad = el('div', { style: 'color:#94a3b8;font-size:13px' }, 'Cargando...');
  metCard.appendChild(metLoad);
  wrap.appendChild(metCard);

  Promise.all([
    coneosCall('metricas_empresa', { empresa_id: emp.id }),
    cargarConfigPrecios()
  ]).then(function(rsMet) {
    var d = rsMet[0], cfgPrecios = rsMet[1];
    metLoad.innerHTML = '';
    var dispActivos = d.dispositivos_activos||0;
    emp._dispActivos = dispActivos;
    var feeActual = d.fee_mensual || calcFeeConeos(dispActivos, emp.slug);
    var dispIncluidos = (cfgPrecios && cfgPrecios.fee && cfgPrecios.fee.dispositivos_incluidos) || 4;
    var dispAlert = dispActivos > dispIncluidos;

    // KPIs
    var mets = el('div', { class: 'mets' });
    [{label:'Pedidos hoy', val:String(d.pedidos_hoy||0), col:'#0B9EDA'},
     {label:'Facturado hoy', val:fmt(d.total_hoy||0), col:'#3D8A32'},
     {label:'Total pedidos', val:String(d.total_pedidos||0), col:'#6366F1'},
     {label:'Dispositivos', val:String(dispActivos)+(dispAlert?' ⚠':''), col:dispAlert?'#854F0B':'#64748B'},
     {label:'Fee mensual', val:fmt(feeActual), col:'#F59E0B'}
    ].forEach(function(m) {
      var c = el('div', { class: 'met' });
      c.appendChild(el('div', { class: 'mst', style: 'background:' + m.col }));
      c.appendChild(el('div', { class: 'mlb' }, m.label));
      c.appendChild(el('div', { class: 'mv', style: 'font-size:18px;color:' + m.col }, m.val));
      mets.appendChild(c);
    });
    metLoad.appendChild(mets);

    // Alerta dispositivos
    if (dispAlert) {
      var alBox = el('div', {style:'background:#FEF3C7;border:.5px solid #F59E0B;border-radius:8px;padding:10px 14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center'});
      alBox.appendChild(el('span', {style:'font-size:13px;color:#854F0B'}, '⚠ '+dispActivos+' dispositivos activos — el fee base cubre hasta '+dispIncluidos));
      var btnCobrar = el('button', {class:'btn btnsm', style:'background:#F59E0B;border-color:#F59E0B;color:#fff'}, 'Editar fee');
      btnCobrar.onclick = function() { mEditarFeeConeOS(emp, feeActual, d); };
      alBox.appendChild(btnCobrar);
      metLoad.appendChild(alBox);
    } else {
      var btnCobrarN = el('button', {class:'btn btnsm', style:'margin-top:10px'}, 'Editar fee mensual');
      btnCobrarN.onclick = function() { mEditarFeeConeOS(emp, feeActual, d); };
      metLoad.appendChild(btnCobrarN);
    }

    // Operadores
    if (d.operadores && d.operadores.length) {
      var opSec = el('div', {style:'margin-top:14px'});
      opSec.appendChild(el('div', {style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px'}, 'Operadores activos ('+d.operadores.length+')'));
      var opRow = el('div', {style:'display:flex;flex-wrap:wrap;gap:6px'});
      d.operadores.forEach(function(o) { opRow.appendChild(chipClass(o.nombre, 'cb')); });
      opSec.appendChild(opRow);
      metLoad.appendChild(opSec);
    }

    // Admins
    if (d.admins && d.admins.length) {
      var admSec = el('div', {style:'margin-top:12px'});
      admSec.appendChild(el('div', {style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px'}, 'Usuarios admin'));
      var admTbl = el('table', {class:'tbl'});
      admTbl.appendChild(elH('thead', {}, '<tr><th>Nombre</th><th>Email</th><th></th></tr>'));
      var admTb = el('tbody', {});
      d.admins.forEach(function(a) {
        var tr = el('tr', {});
        tr.appendChild(el('td', {style:'font-weight:500'}, a.nombre||'-'));
        tr.appendChild(el('td', {style:'color:#64748B;font-size:12px'}, a.email||'-'));
        var btnReset = el('button', {class:'btn btnsm'}, 'Resetear pass');
        (function(admin){ btnReset.onclick = function() {
          var nueva = prompt('Nueva contraseña para '+admin.email+':');
          if (!nueva || nueva.length < 6) { alert('Mínimo 6 caracteres'); return; }
          btnReset.textContent = 'Guardando...'; btnReset.disabled = true;
          coneosCall('resetear_password', {user_id: admin.id, nueva_password: nueva}).then(function(r){
            if (r.error) { alert('Error: '+r.error); }
            else { alert('Contraseña actualizada para '+admin.email); }
            btnReset.textContent = 'Resetear pass'; btnReset.disabled = false;
          }).catch(function(){ btnReset.textContent = 'Resetear pass'; btnReset.disabled = false; });
        }; })(a);
        var btnImp = el('button', {class:'btn btnsm', style:'margin-left:4px;background:#E6F6FD;border-color:#E6F6FD;color:#0C6FA3'}, 'Entrar como →');
        (function(admin){ btnImp.onclick = function() {
          if (btnImp.disabled) return; // anti doble click (la Edge además deduplica server-side)
          btnImp.textContent = 'Generando...'; btnImp.disabled = true;
          coneosCall('impersonar_admin', {user_id: admin.id}).then(function(r){
            btnImp.textContent = 'Entrar como →'; btnImp.disabled = false;
            if (r.error === 'EN_CURSO') { alert('Ya hay una impersonación en curso para este usuario — esperá unos segundos.'); return; }
            if (r.error || !r.token_hash) { alert('Error: '+(r.error||'no se pudo generar el acceso')); return; }
            window.open('https://coneos.com.ar/auth/callback?token_hash=' + encodeURIComponent(r.token_hash), '_blank');
          }).catch(function(e){ btnImp.textContent = 'Entrar como →'; btnImp.disabled = false; alert('Error: '+e.message); });
        }; })(a);
        tr.appendChild(el('td', {}, [btnReset, btnImp]));
        admTb.appendChild(tr);
      });
      admTbl.appendChild(admTb); admSec.appendChild(admTbl);
      metLoad.appendChild(admSec);
    }

  }).catch(function() { metLoad.textContent = 'Error al cargar métricas'; });

  // Sucursales
  var sucCard = el('div', { class: 'card', style: 'padding:16px;margin-bottom:14px' });
  sucCard.appendChild(el('div', { class: 'st', style: 'margin-bottom:12px' }, 'Sucursales'));
  var sucLoad = el('div', { style: 'color:#94a3b8;font-size:13px' }, 'Cargando...');
  sucCard.appendChild(sucLoad);
  wrap.appendChild(sucCard);

  coneosCall('listar_sucursales', { empresa_id: emp.id }).then(function(suc) {
    sucLoad.innerHTML = '';
    if (!Array.isArray(suc) || !suc.length) { sucLoad.textContent = 'Sin sucursales'; return; }
    var tbl = el('table', { class: 'tbl' });
    tbl.appendChild(elH('thead', {}, '<tr><th>Nombre</th><th>Slug</th><th>Estado</th></tr>'));
    var tb = el('tbody', {});
    suc.forEach(function(s) {
      var tr = el('tr', {});
      tr.appendChild(el('td', { style: 'font-weight:500' }, s.nombre));
      tr.appendChild(el('td', { style: 'color:#64748B;font-size:12px' }, s.slug));
      tr.appendChild(el('td', {}, [chipClass(s.activo ? 'Activo' : 'Inactivo', s.activo ? 'cv' : 'ca')]));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb); sucLoad.appendChild(tbl);
  }).catch(function() { sucLoad.textContent = 'Error al cargar sucursales'; });

  // Facturación ARCA v2 — por alcance (marca o sucursal)
  var facCard = el('div', { class: 'card', style: 'padding:16px;margin-bottom:14px' });
  facCard.appendChild(el('div', { class: 'st', style:'margin-bottom:12px' }, '🧾 Facturación electrónica ARCA'));
  var facLoad = el('div', { style: 'color:#94a3b8;font-size:13px' }, 'Cargando...');
  facCard.appendChild(facLoad);
  wrap.appendChild(facCard);

  // Cargar sucursales + configs en paralelo — vista solo lectura, todas las configs juntas
  Promise.all([
    coneosCall('listar_sucursales', { empresa_id: emp.id }),
    coneosCall('get_facturacion_configs', { empresa_id: emp.id })
  ]).then(function(rs) {
    var sucursales = Array.isArray(rs[0]) ? rs[0] : [];
    var configs    = Array.isArray(rs[1]) ? rs[1] : [];
    facLoad.innerHTML = '';

    if (!configs.length) {
      facLoad.appendChild(el('div', {style:'font-size:13px;color:#94a3b8'}, 'Sin configuración ARCA todavía.'));
      facLoad.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-top:4px'}, 'Solo lectura — la configuración ARCA se gestiona fuera del panel.'));
      return;
    }

    configs.forEach(function(cfg) {
      var suc = cfg.sucursal_id ? sucursales.find(function(s){ return s.id === cfg.sucursal_id; }) : null;
      var alcanceLabel = cfg.sucursal_id ? ('🏪 ' + (suc ? suc.nombre : 'Sucursal')) : '🏢 Marca (todas las sucursales sin config propia)';

      var box = el('div', {style:'border:.5px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:10px'});
      var head = el('div', {style:'display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap'});
      head.appendChild(el('div', {style:'font-weight:600;font-size:13px'}, alcanceLabel));
      var estadoChip = el('span', {style:'font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:'+(cfg.activo?'#EDF7EA':'#FEF3C7')+';color:'+(cfg.activo?'#3D8A32':'#854F0B')}, cfg.activo ? '✓ Activa' : '⚠ Inactiva');
      head.appendChild(estadoChip);
      box.appendChild(head);

      var infoRow = el('div', {style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px'});
      [{label:'CUIT', val:cfg.cuit||'-'},
       {label:'Razón social', val:cfg.razon_social||'-'},
       {label:'Cond. fiscal', val:cfg.condicion_fiscal==='ri'?'Resp. Inscripto':'Monotributo'},
       {label:'Punto de venta', val:cfg.punto_venta||'-'},
       {label:'Ambiente', val:cfg.ambiente||'-'},
       {label:'Certificado', val:cfg.cert_pem?'✓ Cargado':'Sin certificado'},
      ].forEach(function(f){
        var b=el('div',{style:'background:#F8FAFC;border-radius:6px;padding:7px 10px'});
        b.appendChild(el('div',{style:'font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em'},f.label));
        b.appendChild(el('div',{style:'font-size:12px;font-weight:500;color:#1a2e4a;margin-top:2px'},String(f.val)));
        infoRow.appendChild(b);
      });
      box.appendChild(infoRow);
      facLoad.appendChild(box);
    });

    facLoad.appendChild(el('div', {style:'font-size:11px;color:#94a3b8;margin-top:4px'}, 'Solo lectura — la configuración ARCA se gestiona fuera del panel. Las sucursales sin config propia usan la de la marca.'));
  }).catch(function(e){ facLoad.textContent = 'Error: '+e.message; });

  setApp(wrap);
}

function mEditarFeeConeOS(emp, feeCalc, metricas) {
  var feeActual = emp.fee_mensual || feeCalc;
  var periodoActual = new Date().toISOString().slice(0,7).replace('-','/');
  openM(makeModal('Fee mensual — '+emp.nombre, function(body) {
    var info = el('div', {style:'background:#F8FAFC;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#64748B'});
    var linEmp = el('div', {}); linEmp.appendChild(document.createTextNode('Empresa: ')); linEmp.appendChild(el('b', {}, emp.nombre));
    info.appendChild(linEmp);
    info.appendChild(el('div', {}, '📱 Dispositivos: '+(metricas.dispositivos_activos||0)));
    info.appendChild(el('div', {}, '💰 Fee sugerido por dispositivos: '+fmt(feeCalc)));
    body.appendChild(info);
    mkRow2(body, mkFg('Fee mensual acordado ($)', mkInput('ef-fee','number', feeActual)), mkFg('Período', mkInput('ef-periodo','text', periodoActual)));
    addFg(body, 'Fecha de vencimiento', mkInput('ef-venc','date', new Date().toISOString().slice(0,10)));
    var hint = el('div', {style:'font-size:11px;color:#94a3b8;margin-top:6px'}, 'El fee queda guardado en la empresa. El período y vencimiento son solo referencia.');
    body.appendChild(hint);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar fee');
    ok.onclick = function() {
      var nuevoFee = Number(gv('ef-fee')||0);
      if (!nuevoFee) { alert('Ingresá el fee'); return; }
      ok.textContent = 'Guardando...'; ok.disabled = true;
      coneosCall('editar_empresa', { empresa_id: emp.id, datos: {
        nombre: emp.nombre, slug: emp.slug, activo: emp.activo, plan: emp.plan, fee_mensual: nuevoFee
      }}).then(function(r) {
        if (r.error) { alert('Error: '+r.error); ok.textContent = 'Guardar fee'; ok.disabled = false; return; }
        emp.fee_mensual = nuevoFee;
        closeM();
      }).catch(function(e) {
        ok.textContent = 'Guardar fee'; ok.disabled = false;
        alert('Error: '+e.message);
      });
    };
    foot.appendChild(ok);
  }));
}

function mConfigFacturacionConeos(emp, sucursalId, cfg, cb) {
  var certArea, keyArea;
  openM(makeModal('🧾 Facturación — '+(sucursalId===null?'Marca '+emp.nombre:'Sucursal'), function(body) {
    var info = el('div',{style:'background:#F0F9FF;border:.5px solid #BAE6FD;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#0369A1'});
    info.appendChild(document.createTextNode(sucursalId===null?'Configuración de la MARCA — aplica a todas las sucursales sin config propia.':'Configuración propia de esta sucursal — tiene prioridad sobre la marca.'));
    body.appendChild(info);
    mkRow2(body, mkFg('CUIT (11 dígitos)', mkInput('ff-cuit','text',cfg.cuit||'')), mkFg('Punto de venta', mkInput('ff-pv','number',cfg.punto_venta||'')));
    addFg(body, 'Razón social', mkInput('ff-rs','text',cfg.razon_social||''));
    addFg(body, 'Condición fiscal', mkSelect('ff-cond',[['monotributo','Monotributo'],['ri','Responsable Inscripto']], cfg.condicion_fiscal||'monotributo'));
    addFg(body, 'Ambiente', mkSelect('ff-amb',[['produccion','Producción'],['homologacion','Homologación']], cfg.ambiente||'produccion'));

    // Cert PEM
    var certWrap = el('div',{style:'margin-bottom:10px'});
    var certLbl = el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px'},'Certificado PEM (.crt)');
    if (cfg.cert_pem) certLbl.appendChild(el('span',{style:'color:#3D8A32;font-weight:400;margin-left:8px'},'✓ Ya cargado — vacío = no pisar'));
    certWrap.appendChild(certLbl);
    certArea = el('textarea',{id:'ff-cert',style:'width:100%;height:80px;font-family:monospace;font-size:11px;padding:8px;border:.5px solid #E2E8F0;border-radius:6px;resize:vertical',placeholder:'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'});
    certWrap.appendChild(certArea);
    var certFile = el('input',{type:'file',accept:'.pem,.crt',style:'font-size:11px;margin-top:4px'});
    certFile.onchange = function(){ var f=certFile.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(e){ certArea.value=e.target.result; }; r.readAsText(f); };
    certWrap.appendChild(certFile);
    body.appendChild(certWrap);

    // Key PEM
    var keyWrap = el('div',{style:'margin-bottom:10px'});
    var keyLbl = el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px'},'Clave privada PEM (.key)');
    if (cfg.key_pem) keyLbl.appendChild(el('span',{style:'color:#3D8A32;font-weight:400;margin-left:8px'},'✓ Ya cargada — vacío = no pisar'));
    keyWrap.appendChild(keyLbl);
    keyArea = el('textarea',{id:'ff-key',style:'width:100%;height:80px;font-family:monospace;font-size:11px;padding:8px;border:.5px solid #E2E8F0;border-radius:6px;resize:vertical',placeholder:'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'});
    keyWrap.appendChild(keyArea);
    var keyFile = el('input',{type:'file',accept:'.pem,.key',style:'font-size:11px;margin-top:4px'});
    keyFile.onchange = function(){ var f=keyFile.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(e){ keyArea.value=e.target.result; }; r.readAsText(f); };
    keyWrap.appendChild(keyFile);
    body.appendChild(keyWrap);

  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button',{class:'btn btnp'},'Guardar configuración');
    ok.onclick = function(){
      var cuit = gv('ff-cuit').replace(/\D/g,'');
      if (cuit.length !== 11) { alert('El CUIT debe tener 11 dígitos'); return; }
      var rs = gv('ff-rs').trim();
      if (!rs) { alert('Ingresá la razón social'); return; }
      var datos = {
        cuit: cuit, razon_social: rs,
        condicion_fiscal: gv('ff-cond'),
        punto_venta: Number(gv('ff-pv')||0),
        ambiente: gv('ff-amb'),
      };
      var certVal = certArea ? certArea.value.trim() : '';
      var keyVal  = keyArea  ? keyArea.value.trim()  : '';
      if (certVal) datos.cert_pem = certVal;
      if (keyVal)  datos.key_pem  = keyVal;
      ok.textContent='Guardando...'; ok.disabled=true;
      coneosCall('upsert_facturacion_config', { empresa_id: emp.id, sucursal_id: sucursalId, datos: datos }).then(function(r){
        if (r.error) { alert('Error: '+r.error); ok.textContent='Guardar configuración'; ok.disabled=false; return; }
        // Construir cfg actualizado para devolver al caller
        var nuevaCfg = Object.assign({}, cfg, datos, {empresa_id:emp.id, sucursal_id:sucursalId, cert_pem:datos.cert_pem?true:(cfg.cert_pem||false), key_pem:datos.key_pem?true:(cfg.key_pem||false)});
        closeM(); cb(nuevaCfg);
      }).catch(function(e){ alert('Error: '+e.message); ok.textContent='Guardar configuración'; ok.disabled=false; });
    };
    foot.appendChild(ok);
  }));
}

// Config de precios ConeOS — se carga una vez y se cachea
var _configPrecios = null;

function cargarConfigPrecios() {
  if (_configPrecios) return Promise.resolve(_configPrecios);
  return sbFetch('panel_config_coneos?select=*').then(function(rows) {
    var cfg = {};
    (rows||[]).forEach(function(r){ cfg[r.clave] = r.valor; });
    _configPrecios = {
      impl:   cfg.implementacion || { starter:100, pro:150, full:200 },
      fee:    cfg.fee_base       || { usd:50, dispositivos_incluidos:4 },
      tramos: cfg.fee_tramos     || []
    };
    return _configPrecios;
  });
}

function calcFeeUSD(dispActivos, cfg) {
  var base = cfg.fee.usd;
  var incl = cfg.fee.dispositivos_incluidos || 4;
  if (dispActivos <= incl) return base;
  var extra = dispActivos - incl;
  // Buscar tramo
  var tramos = cfg.tramos || [];
  var adicional = 0;
  for (var i=0; i<tramos.length; i++) {
    if (extra <= tramos[i].hasta) { adicional = tramos[i].usd_por_disp * extra; break; }
  }
  return base + adicional;
}

function calcFeeConeos(dispActivos, slug) {
  // Legacy ARS — se mantiene para compatibilidad con vista principal mientras no haya TCambio
  if (slug === 'cecchetto-lucia') return 75000;
  if (dispActivos <= 3) return 75000;
  return 75000 + (dispActivos - 3) * 25000;
}

function calcImplConeos(modulos) {
  // Legacy ARS — ya no se usa en mPlanConeOS
  var base = 500000;
  var extra = 0;
  if (modulos.mesas)       extra += 100000;
  if (modulos.delivery)    extra += 150000;
  if (modulos.facturacion) extra += 100000;
  if (modulos.mercadopago) extra += 100000;
  if (modulos.beneficios)  extra += 100000;
  return base + extra;
}

// PLANES CONEOS ── reemplaza mModulosConeOS
var PLANES_CONEOS = {
  starter: { label: 'STARTER', color: '#3D8A32', modulos: { kiosk:true, caja:true, preparacion:true, display:true, beneficios:true, mesas:false, delivery:false, takeaway:false, facturacion:false, mercadopago:false } },
  pro:     { label: 'PRO',     color: '#0B9EDA', modulos: { kiosk:true, caja:true, preparacion:true, display:true, beneficios:true, mesas:true,  delivery:true,  takeaway:true,  facturacion:false, mercadopago:false } },
  full:    { label: 'FULL',    color: '#7C3AED', modulos: { kiosk:true, caja:true, preparacion:true, display:true, beneficios:true, mesas:true,  delivery:true,  takeaway:true,  facturacion:true,  mercadopago:false, reparto:false } }
};

var MODULOS_INFO = [
  { key:'kiosk',       label:'Kiosk',                   desc:'Pantalla táctil para clientes — pedidos en mostrador' },
  { key:'caja',        label:'Caja',                    desc:'Gestión de pagos, cobros y arqueo de caja' },
  { key:'preparacion', label:'Preparación',             desc:'Pantalla de preparación para el equipo interno' },
  { key:'display',     label:'Display',                 desc:'Pantalla pública con menú y precios' },
  { key:'beneficios',  label:'Programa de Beneficios',  desc:'Los clientes acumulan puntos al comprar' },
  { key:'mesas',       label:'Mesas',                   desc:'Gestión de mesas y pedidos en salón' },
  { key:'delivery',    label:'Delivery',                desc:'Pedidos a domicilio' },
  { key:'takeaway',    label:'Take Away 🥡',            desc:'Pedidos desde el celular para retirar en el local' },
  { key:'facturacion', label:'Facturación',             desc:'Emisión de facturas electrónicas ARCA' },
  { key:'mercadopago', label:'MercadoPago',             desc:'Cobros con MercadoPago integrado' },
  { key:'reparto',     label:'🛵 Reparto',              desc:'App de cadetes + seguimiento en vivo' },
  { key:'reparto_mapa',label:'🗺 Seguimiento con mapa', desc:'El cliente ve al cadete en un mapa en vivo' },
  { key:'compras',     label:'Compras',                 desc:'Proveedores, stock y pagos' }
];

function mModulosConeOS(emp) { mPlanConeOS(emp, null); }

function mPlanConeOS(emp, asigId) {
  Promise.all([
    coneosCall('get_modulos', { empresa_id: emp.id }),
    coneosCall('get_beneficios_config', { empresa_id: emp.id }),
    asigId ? sbFetch('panel_asignaciones?id=eq.'+asigId+'&select=coneos_plan,impl_cobrada_usd,mayorista_pct_impl,mayorista_pct_fee,fee_acordado_usd').then(function(r){ return r[0]||{}; }) : Promise.resolve({}),
    cargarConfigPrecios()
  ]).then(function(results) {
    var modActuales = results[0] || {};
    var benefConfig = results[1] || {};
    var asigData    = results[2] || {};
    var cfg         = results[3];

    var planActual = asigData.coneos_plan || null;
    if (!planActual) {
      if (modActuales.facturacion) planActual = 'full';
      else if (modActuales.delivery || modActuales.mesas) planActual = 'pro';
      else planActual = 'starter';
    }
    // Switches individuales (fuera de presets) — en este scope para que
    // los vean tanto el body (toggle) como el foot (guardar)
    var repartoOn = !!modActuales.reparto;
    var repartoMapaOn = !!modActuales.reparto_mapa;
    var comprasOn = !!modActuales.compras;

    openM(makeModal(''+emp.nombre+' — Plan', function(body) {

      // Estado actual real de la empresa (empresa_config.modulos hoy) — verificación visual
      var actualesOn = MODULOS_INFO.filter(function(m){ return !!modActuales[m.key]; }).map(function(m){ return m.label; });
      var actBox = el('div',{style:'background:#F8FAFC;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#64748B'});
      actBox.appendChild(el('div',{style:'font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;color:#94a3b8'},'Activos ahora en la empresa'));
      actBox.appendChild(el('div',{}, actualesOn.length ? actualesOn.join(' · ') : 'Ninguno'));
      body.appendChild(actBox);

      // Selector de plan con precio USD
      body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'},'Plan asignado'));
      var planBtns = {};
      var planWrap = el('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px'});
      ['starter','pro','full'].forEach(function(p) {
        var info = PLANES_CONEOS[p];
        var precio = cfg.impl[p] || 0;
        var btn = el('div',{style:'border:2px solid '+(planActual===p?info.color:'#E2E8F0')+';border-radius:10px;padding:10px;text-align:center;cursor:pointer;background:'+(planActual===p?info.color+'18':'#fff')+';transition:all .15s'});
        btn.appendChild(el('div',{style:'font-weight:700;font-size:14px;color:'+(planActual===p?info.color:'#64748b')},info.label));
        btn.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-top:2px'},'impl. USD '+precio));
        planBtns[p] = btn;
        btn.onclick = function() {
          planActual = p;
          ['starter','pro','full'].forEach(function(pp) {
            var inf = PLANES_CONEOS[pp];
            var b = planBtns[pp];
            if (!b) return;
            b.style.border = '2px solid '+(pp===p?inf.color:'#E2E8F0');
            b.style.background = pp===p ? inf.color+'18' : '#fff';
            b.querySelector('div').style.color = pp===p ? inf.color : '#64748b';
          });
          // Actualizar impl cobrada sugerida
          var implInp = document.getElementById('_impl_cobrada');
          if (implInp && !implInp._editado) implInp.value = cfg.impl[p] || 0;
          actualizarModulos();
        };
        planWrap.appendChild(btn);
      });
      body.appendChild(planWrap);

      // Fee mensual estimado
      var dispActivos = emp._dispActivos || 0;
      var feeUSD = calcFeeUSD(dispActivos, cfg);
      var feeBox = el('div',{style:'background:#f0f9ff;border-radius:8px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center'});
      feeBox.appendChild(el('div',{}, [
        el('div',{style:'font-size:12px;color:#64748b'},'Fee mensual estimado'),
        el('div',{style:'font-size:11px;color:#94a3b8'},dispActivos+' disp. activos + IVA')
      ]));
      var feeRight = el('div',{style:'text-align:right'});
      feeRight.appendChild(el('div',{style:'font-weight:700;font-size:16px;color:#0B9EDA'},'USD '+feeUSD));
      var feeARS = el('div',{style:'font-size:11px;color:#94a3b8'},'...');
      feeRight.appendChild(feeARS);
      feeBox.appendChild(feeRight);
      body.appendChild(feeBox);
      // Traer dólar oficial
      fetch('https://dolarapi.com/v1/dolares/oficial').then(function(r){ return r.json(); }).then(function(d){
        var tc = d && d.venta ? Number(d.venta) : null;
        if (tc) feeARS.textContent = '≈ $'+Math.round(feeUSD*tc).toLocaleString('es-AR')+' ARS (oficial $'+tc.toLocaleString('es-AR')+')';
      }).catch(function(){});

      // Impl cobrada
      if (asigId) {
        var implWrap = el('div',{class:'fg',style:'margin-bottom:12px'});
        implWrap.appendChild(el('label',{class:'fl'},'Implementación cobrada (USD)'));
        var implInp = el('input',{class:'fi',id:'_impl_cobrada',type:'number',placeholder:'0'});
        implInp.value = asigData.impl_cobrada_usd || cfg.impl[planActual] || 0;
        implInp._editado = false;
        implInp.addEventListener('input', function(){ implInp._editado = true; });
        implWrap.appendChild(implInp);
        body.appendChild(implWrap);
      }

      // Campos mayorista solo para superadmin
      if (asigId && isSuperAdmin()) {
        body.appendChild(el('div',{style:'border-top:.5px solid #E2E8F0;margin:10px 0 10px'}));
        body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'},'Condiciones mayoristas'));
        // Fee acordado
        var feeAcordadoWrap=el('div',{class:'fg',style:'margin-bottom:8px'});
        feeAcordadoWrap.appendChild(el('label',{class:'fl'},'Fee acordado (USD/mes) — sugerido: '+feeUSD));
        var feeAcordadoInp=el('input',{class:'fi',id:'_fee_acordado',type:'number',placeholder:String(feeUSD)});
        feeAcordadoInp.value = asigData.fee_acordado_usd != null ? asigData.fee_acordado_usd : feeUSD;
        feeAcordadoWrap.appendChild(feeAcordadoInp);
        body.appendChild(feeAcordadoWrap);
        // % mayorista impl y fee en grid
        var gridM=el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'});
        var fgI=el('div',{class:'fg'}); fgI.appendChild(el('label',{class:'fl'},'% mayorista impl.')); var inpPI=el('input',{class:'fi',id:'_pct_impl',type:'number',placeholder:'0',min:'0',max:'100'}); inpPI.value=asigData.mayorista_pct_impl||0; fgI.appendChild(inpPI); gridM.appendChild(fgI);
        var fgF=el('div',{class:'fg'}); fgF.appendChild(el('label',{class:'fl'},'% mayorista fee')); var inpPF=el('input',{class:'fi',id:'_pct_fee',type:'number',placeholder:'0',min:'0',max:'100'}); inpPF.value=asigData.mayorista_pct_fee||0; fgF.appendChild(inpPF); gridM.appendChild(fgF);
        body.appendChild(gridM);
        // Preview de lo que paga el partner
        var prevM=el('div',{style:'font-size:11px;color:#64748b;background:#f8fafc;border-radius:6px;padding:6px 10px;margin-bottom:8px'});
        function actualizarPreviewMayorista() {
          var pctI=Number(inpPI.value)||0, pctF=Number(inpPF.value)||0;
          var implCobrada=Number((document.getElementById('_impl_cobrada')||{}).value||0);
          var feeAcordado=Number(feeAcordadoInp.value||feeUSD);
          var mayorImpl=implCobrada*pctI/100, mayorFee=feeAcordado*pctF/100;
          prevM.textContent='Partner paga: USD '+mayorImpl.toFixed(0)+' impl + USD '+mayorFee.toFixed(0)+'/mes';
        }
        inpPI.oninput=actualizarPreviewMayorista; inpPF.oninput=actualizarPreviewMayorista; feeAcordadoInp.oninput=actualizarPreviewMayorista;
        actualizarPreviewMayorista();
        body.appendChild(prevM);
        body.appendChild(el('div',{style:'border-top:.5px solid #E2E8F0;margin:0 0 10px'}));
      }

      // Módulos del plan
      body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'},'Módulos incluidos'));
      var modWrap = el('div',{style:'display:flex;flex-direction:column;gap:4px'});
      body.appendChild(modWrap);

      // Pesos por punto
      var pppWrap = el('div',{style:'margin-top:10px;display:none'});
      pppWrap.appendChild(el('div',{style:'font-size:11px;color:#64748B;margin-bottom:4px'},'Pesos por punto (Programa de Beneficios)'));
      pppWrap.appendChild(mkInput('mod-beneficios-ppp','number',benefConfig.pesos_por_punto||1000,''));
      body.appendChild(pppWrap);

      function actualizarModulos() {
        var plan = PLANES_CONEOS[planActual];
        modWrap.innerHTML = '';
        MODULOS_INFO.forEach(function(m) {
          // Reparto: switch individual (agregado de Delivery, no viene en presets)
          if (m.key === 'reparto') {
            var repActivo = repartoOn;
            var deliveryOn = !!plan.modulos.delivery;
            // Regla: solo puede ACTIVARSE en plan Full (y con delivery activo); desactivar siempre se permite
            var bloqueado = !repActivo && (planActual !== 'full' || !deliveryOn);
            var rowR = el('div',{style:'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:'+(repActivo?'#F0FDF4':'#F8FAFC')+';cursor:'+(bloqueado?'not-allowed':'pointer')+(bloqueado?';opacity:.55':'')});
            rowR.appendChild(el('span',{style:'font-size:13px'},repActivo?'✅':'⬜'));
            var txtR = el('div',{style:'flex:1'});
            txtR.appendChild(el('div',{style:'font-size:13px;font-weight:500;color:'+(repActivo?'#1a2e4a':'#94a3b8')},m.label + ' (cadetes + seguimiento en vivo)'));
            txtR.appendChild(el('div',{style:'font-size:11px;color:'+(bloqueado?'#A32D2D':'#94a3b8')}, bloqueado ? (planActual !== 'full' ? 'Disponible solo en plan Full' : 'Requiere el módulo Delivery activo') : ('Agregado de Delivery — click para '+(repActivo?'apagar':'prender'))));
            rowR.appendChild(txtR);
            if (!bloqueado) {
              rowR.onclick = function() {
                repartoOn = !repartoOn;
                actualizarModulos();
              };
            }
            modWrap.appendChild(rowR);
            return;
          }
          // Seguimiento con mapa: escalón 3 — requiere reparto ON; solo activable en Full
          if (m.key === 'reparto_mapa') {
            var mapaActivo = repartoMapaOn;
            var mapaBloqueado = !mapaActivo && (planActual !== 'full' || !repartoOn);
            var rowM = el('div',{style:'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:'+(mapaActivo?'#F0FDF4':'#F8FAFC')+';cursor:'+(mapaBloqueado?'not-allowed':'pointer')+(mapaBloqueado?';opacity:.55':'')});
            rowM.appendChild(el('span',{style:'font-size:13px'},mapaActivo?'✅':'⬜'));
            var txtM = el('div',{style:'flex:1'});
            txtM.appendChild(el('div',{style:'font-size:13px;font-weight:500;color:'+(mapaActivo?'#1a2e4a':'#94a3b8')},m.label));
            var subM;
            if (mapaBloqueado) subM = planActual !== 'full' ? 'Disponible solo en plan Full' : 'Requiere Seguimiento (Reparto) activo';
            else subM = 'ON: el cliente ve al cadete en un mapa en vivo. OFF: el cadete opera y la caja ve el mapa igual; solo el cliente pierde el mapita.';
            txtM.appendChild(el('div',{style:'font-size:11px;color:'+(mapaBloqueado?'#A32D2D':'#94a3b8')}, subM));
            rowM.appendChild(txtM);
            if (!mapaBloqueado) {
              rowM.onclick = function() {
                repartoMapaOn = !repartoMapaOn;
                actualizarModulos();
              };
            }
            modWrap.appendChild(rowM);
            return;
          }
          // Compras: switch individual (no viene en presets, sin dependencias)
          if (m.key === 'compras') {
            var cmpActivo = comprasOn;
            // Regla: solo puede ACTIVARSE en plan Full; desactivar siempre se permite
            var cmpBloqueado = !cmpActivo && planActual !== 'full';
            var rowC = el('div',{style:'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:'+(cmpActivo?'#F0FDF4':'#F8FAFC')+';cursor:'+(cmpBloqueado?'not-allowed':'pointer')+(cmpBloqueado?';opacity:.55':'')});
            rowC.appendChild(el('span',{style:'font-size:13px'},cmpActivo?'✅':'⬜'));
            var txtC = el('div',{style:'flex:1'});
            txtC.appendChild(el('div',{style:'font-size:13px;font-weight:500;color:'+(cmpActivo?'#1a2e4a':'#94a3b8')},m.label + ' (proveedores, stock y pagos)'));
            txtC.appendChild(el('div',{style:'font-size:11px;color:'+(cmpBloqueado?'#A32D2D':'#94a3b8')}, cmpBloqueado ? 'Disponible solo en plan Full' : ('Agregado individual — click para '+(cmpActivo?'apagar':'prender'))));
            rowC.appendChild(txtC);
            if (!cmpBloqueado) {
              rowC.onclick = function() {
                comprasOn = !comprasOn;
                actualizarModulos();
              };
            }
            modWrap.appendChild(rowC);
            return;
          }
          var activo = !!plan.modulos[m.key];
          // MercadoPago: siempre mostrar, pero con nota si está en plan Full
          var esMp = m.key === 'mercadopago';
          var incluidoComercial = esMp && planActual === 'full';
          var row = el('div',{style:'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:'+(activo||incluidoComercial?'#F0FDF4':'#F8FAFC')});
          row.appendChild(el('span',{style:'font-size:13px'},activo?'✅':(incluidoComercial?'🔗':'⬜')));
          var txt = el('div',{style:'flex:1'});
          txt.appendChild(el('div',{style:'font-size:13px;font-weight:500;color:'+(activo||incluidoComercial?'#1a2e4a':'#94a3b8')},m.label));
          if (incluidoComercial) txt.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},'Incluido — el dueño conecta su cuenta por OAuth'));
          row.appendChild(txt);
          modWrap.appendChild(row);
        });
        pppWrap.style.display = !!plan.modulos.beneficios ? '' : 'none';
      }
      actualizarModulos();

    }, function(foot) {
      // Botón config precios (solo superadmin)
      if (isSuperAdmin()) {
        var btnCfg = el('button',{class:'btn btnsm',style:'margin-right:auto'},'⚙ Precios');
        btnCfg.onclick = function(){ closeM(); mConfigPreciosConeos(function(){ _configPrecios=null; mPlanConeOS(emp,asigId); }); };
        foot.appendChild(btnCfg);
      }
      foot.appendChild(cancelBtn());
      var ok = el('button',{class:'btn btnp'},'Guardar plan');
      ok.onclick = function() {
        var plan = PLANES_CONEOS[planActual];
        var modulosFinal = {};
        Object.keys(plan.modulos).forEach(function(k){ modulosFinal[k] = plan.modulos[k]; });
        modulosFinal.reparto = repartoOn;
        modulosFinal.reparto_mapa = repartoMapaOn;
        modulosFinal.compras = comprasOn;
        ok.textContent = 'Guardando...'; ok.disabled = true;
        var pppVal = Number((document.getElementById('mod-beneficios-ppp')||{}).value || 1000);
        var promesas = [
          coneosCall('actualizar_modulos', { empresa_id: emp.id, modulos: modulosFinal }),
          coneosCall('upsert_beneficios_config', { empresa_id: emp.id, activo: !!plan.modulos.beneficios, pesos_por_punto: pppVal })
        ];
        if (asigId) {
          var implVal = Number((document.getElementById('_impl_cobrada')||{}).value || 0);
          var feeAcordadoEl = document.getElementById('_fee_acordado');
          var pctImplEl = document.getElementById('_pct_impl');
          var pctFeeEl  = document.getElementById('_pct_fee');
          promesas.push(dbUpd('panel_asignaciones', asigId, {
            coneos_plan: planActual,
            impl_cobrada_usd: implVal,
            fee_acordado_usd: feeAcordadoEl ? Number(feeAcordadoEl.value)||null : null,
            mayorista_pct_impl: pctImplEl ? Number(pctImplEl.value)||0 : 0,
            mayorista_pct_fee:  pctFeeEl  ? Number(pctFeeEl.value)||0  : 0
          }));
        }
        Promise.all(promesas).then(function(rs) {
          if (rs[0] && rs[0].error) { alert('Error: '+rs[0].error); ok.textContent='Guardar plan'; ok.disabled=false; return; }
          closeM();
        }).catch(function(e){ alert('Error: '+e.message); ok.textContent='Guardar plan'; ok.disabled=false; });
      };
      foot.appendChild(ok);
    }));
  }).catch(function(e){ alert('Error al cargar plan: '+e.message); });
}

function mConfigPreciosConeos(cb) {
  cargarConfigPrecios().then(function(cfg) {
    openM(makeModal('⚙ Configuración de precios ConeOS', function(body) {

      body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'},'Implementación (USD, pago único)'));
      var gridImpl = el('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px'});
      ['starter','pro','full'].forEach(function(p) {
        var fg = el('div',{class:'fg'});
        fg.appendChild(el('label',{class:'fl'},p.toUpperCase()));
        fg.appendChild(mkInput('cfg-impl-'+p,'number',cfg.impl[p]||0,''));
        gridImpl.appendChild(fg);
      });
      body.appendChild(gridImpl);

      body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'},'Fee mensual base (USD)'));
      var gridFee = el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px'});
      var fg1=el('div',{class:'fg'}); fg1.appendChild(el('label',{class:'fl'},'USD base')); fg1.appendChild(mkInput('cfg-fee-usd','number',cfg.fee.usd||50,'')); gridFee.appendChild(fg1);
      var fg2=el('div',{class:'fg'}); fg2.appendChild(el('label',{class:'fl'},'Dispositivos incluidos')); fg2.appendChild(mkInput('cfg-fee-disp','number',cfg.fee.dispositivos_incluidos||4,'')); gridFee.appendChild(fg2);
      body.appendChild(gridFee);

      body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px'},'Tramos adicionales (USD por dispositivo extra)'));
      body.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-bottom:8px'},'Configurar cuando haya más de '+( cfg.fee.dispositivos_incluidos||4)+' dispositivos. Por ahora vacío.'));
      // Tramos: tabla simple
      var tramosWrap = el('div',{id:'_tramos_wrap',style:'display:flex;flex-direction:column;gap:6px'});
      var tramos = JSON.parse(JSON.stringify(cfg.tramos||[]));
      function renderTramos() {
        tramosWrap.innerHTML = '';
        tramos.forEach(function(t,i) {
          var row = el('div',{style:'display:flex;gap:8px;align-items:center'});
          var inpH = el('input',{class:'fi',type:'number',placeholder:'Hasta N disp',style:'flex:1'}); inpH.value=t.hasta||'';
          var inpU = el('input',{class:'fi',type:'number',placeholder:'USD/disp',style:'flex:1'}); inpU.value=t.usd_por_disp||'';
          inpH.oninput=function(){ tramos[i].hasta=Number(inpH.value); };
          inpU.oninput=function(){ tramos[i].usd_por_disp=Number(inpU.value); };
          var btnX=el('button',{class:'btn btnsm',style:'color:#e53e3e;border-color:#e53e3e'},'✕');
          btnX.onclick=function(){ tramos.splice(i,1); renderTramos(); };
          row.appendChild(inpH); row.appendChild(inpU); row.appendChild(btnX);
          tramosWrap.appendChild(row);
        });
        var btnAdd=el('button',{class:'btn btnsm'},'+ Tramo');
        btnAdd.onclick=function(){ tramos.push({hasta:0,usd_por_disp:0}); renderTramos(); };
        tramosWrap.appendChild(btnAdd);
      }
      renderTramos();
      body.appendChild(tramosWrap);

    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button',{class:'btn btnp'},'Guardar precios');
      ok.onclick = function() {
        ok.textContent='Guardando...'; ok.disabled=true;
        var implNew = { starter:Number(document.getElementById('cfg-impl-starter').value||100), pro:Number(document.getElementById('cfg-impl-pro').value||150), full:Number(document.getElementById('cfg-impl-full').value||200) };
        var feeNew  = { usd:Number(document.getElementById('cfg-fee-usd').value||50), dispositivos_incluidos:Number(document.getElementById('cfg-fee-disp').value||4) };
        Promise.all([
          sbFetch('panel_config_coneos?on_conflict=clave', {method:'POST', body:{clave:'implementacion',valor:implNew}, headers:{'Prefer':'resolution=merge-duplicates'}}),
          sbFetch('panel_config_coneos?on_conflict=clave', {method:'POST', body:{clave:'fee_base',valor:feeNew}, headers:{'Prefer':'resolution=merge-duplicates'}}),
          sbFetch('panel_config_coneos?on_conflict=clave', {method:'POST', body:{clave:'fee_tramos',valor:tramos}, headers:{'Prefer':'resolution=merge-duplicates'}})
        ]).then(function(){
          _configPrecios = null; // invalidar cache
          closeM();
          if (cb) cb();
        }).catch(function(e){ alert('Error: '+e.message); ok.textContent='Guardar precios'; ok.disabled=false; });
      };
      foot.appendChild(ok);
    }));
  });
}


function mEditarEmpresaConeos(emp, cb) {
  openM(makeModal('Editar: ' + emp.nombre, function(body) {
    addFg(body, 'Nombre', mkInput('ee-nombre', 'text', emp.nombre||''));
    addFg(body, 'Slug',   mkInput('ee-slug',   'text', emp.slug||''));
    mkRow2(body,
      mkFg('Color primario',    mkInput('ee-color1', 'color', emp.primary_color||'#6366F1')),
      mkFg('Color secundario',  mkInput('ee-color2', 'color', emp.secondary_color||'#4F46E5'))
    );
    var togWrap = el('div', {style:'display:flex;align-items:center;gap:8px;margin-top:8px'});
    var togLbl = el('label', {class:'tog'});
    var togInp = el('input', {type:'checkbox', id:'ee-activo'}); if(emp.activo) togInp.checked=true;
    togLbl.appendChild(togInp); togLbl.appendChild(el('span',{class:'sl'}));
    togWrap.appendChild(togLbl);
    togWrap.appendChild(el('span',{style:'font-size:13px;color:#64748B'},'Activo'));
    body.appendChild(togWrap);
  }, function(foot) {
    var btnPlan = el('button', {class:'btn btnsm', style:'margin-right:auto'}, '📋 Plan');
    btnPlan.onclick = function(){ closeM(); mPlanConeOS(emp, null); };
    foot.appendChild(btnPlan);
    foot.appendChild(cancelBtn());
    var ok = el('button', { class: 'btn btnp' }, 'Guardar');
    ok.onclick = function() {
      var datos = {
        nombre: gv('ee-nombre'),
        slug:   gv('ee-slug'),
        activo: document.getElementById('ee-activo').checked,
      };
      ok.textContent = 'Guardando...'; ok.disabled = true;
      coneosCall('editar_empresa', { empresa_id: emp.id, datos: datos }).then(function(r) {
        if (r.error) { alert('Error: ' + r.error); ok.textContent = 'Guardar'; ok.disabled = false; return; }
        closeM();
        cb(Object.assign({}, emp, datos));
      });
    };
    foot.appendChild(ok);
  }));
}


function mNuevaEmpresaConeos(cb) {
  openM(makeModal('Nueva empresa ConeOS', function(body) {
    addFg(body, 'Nombre', mkInput('ce-nombre', 'text', '', 'Ej: Heladería El Centro'));
    addFg(body, 'Slug', mkInput('ce-slug', 'text', '', 'Ej: heladeria-centro'));
    mkRow2(body, mkFg('Color primario', mkInput('ce-color1', 'color', '#6366F1')), mkFg('Color secundario', mkInput('ce-color2', 'color', '#4F46E5')));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', { class: 'btn btnp' }, 'Crear empresa');
    ok.onclick = function() {
      var nombre = gv('ce-nombre'), slug = gv('ce-slug');
      if (!nombre || !slug) { alert('Nombre y slug son requeridos'); return; }
      ok.textContent = 'Creando...'; ok.disabled = true;
      coneosCall('crear_empresa', { nombre: nombre, slug: slug, primary_color: gv('ce-color1'), secondary_color: gv('ce-color2') }).then(function(r) {
        if (r.error) { alert('Error: ' + r.error); ok.textContent = 'Crear empresa'; ok.disabled = false; return; }
        closeM(); cb();
      });
    };
    foot.appendChild(ok);
  }));
}

function mNuevoAdminConeos(emp, cb) {
  openM(makeModal('Nuevo admin — ' + emp.nombre, function(body) {
    addFg(body, 'Nombre', mkInput('ca-nombre', 'text', ''));
    addFg(body, 'Email', mkInput('ca-email', 'email', ''));
    addFg(body, 'Contraseña', mkInput('ca-pass', 'password', ''));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', { class: 'btn btnp' }, 'Crear admin');
    ok.onclick = function() {
      var nombre = gv('ca-nombre'), email = gv('ca-email'), pass = gv('ca-pass');
      if (!nombre || !email || !pass) { alert('Todos los campos son requeridos'); return; }
      ok.textContent = 'Creando...'; ok.disabled = true;
      coneosCall('crear_usuario_admin', { nombre: nombre, email: email, password: pass, empresa_id: emp.id }).then(function(r) {
        if (r.error) { alert('Error: ' + r.error); ok.textContent = 'Crear admin'; ok.disabled = false; return; }
        closeM(); cb();
      });
    };
    foot.appendChild(ok);
  }));
}

(function(){
  var u=window._currentUser;
  if (window._onAuthReady && u) window._onAuthReady(u);
  else document.body.classList.remove('qp-loading');
  if (u && u.rol==='partner') go('partners');
  else if (u && u.rol==='superadmin') go('dash');
  else if (u) setApp(el('div',{class:'emp'},'Acceso deshabilitado. Contactá a QP C&IA.'));
  // Sin sesión: la pantalla de login está visible — no se renderiza ni carga nada
})();
// ── PARTNERS ────────────────────────────────────────────────────

function vPartners() {
  if (!isSuperAdmin()) { vPartnerPropio(); return; }
  loading();
  Promise.all([
    sbFetch('revendedores?select=*&order=nombre.asc'),
    sbFetch('panel_revendedor_sistemas?select=*'),
    sbFetch('panel_sistemas?select=*&order=nombre.asc&para_reventa=eq.true'),
    sbFetch('panel_clientes?select=*'),
    sbFetch('panel_asignaciones?select=*'),
    fetch('https://dolarapi.com/v1/dolares/oficial').then(function(r){ return r.json(); }).catch(function(){ return null; })
  ]).then(function(r) {
    var revs=r[0]||[],revSis=r[1],sistemas=r[2],clientes=r[3],asigs=r[4],dolarData=r[5];
    var revsActivos=revs.filter(function(rv){ return rv.activo!==false; });
    var tc = dolarData && dolarData.venta ? Number(dolarData.venta) : null;
    var wrap=el('div',{}); var sh=el('div',{class:'sh'});
    sh.appendChild(el('span',{class:'st'},'Partners ('+revsActivos.length+')'));
    var btnN=el('button',{class:'btn btnp'},'+ Nuevo partner');
    btnN.onclick=function(){ mNuevoPartner(sistemas,function(){ vPartners(); }); };
    sh.appendChild(btnN); wrap.appendChild(sh);
    if (!revs.length) {
      wrap.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay partners todavía')]));
    } else {
      revs.forEach(function(rev) {
        if (rev.activo === false) {
          // Partner dado de baja: visible, griseado, solo Habilitar
          var cardB=el('div',{class:'cc',style:'opacity:.55'}); var chB=el('div',{class:'ch'});
          if (rev.logo_b64) {
            chB.appendChild(el('img',{src:rev.logo_b64,style:'width:36px;height:36px;object-fit:contain;border-radius:8px;border:.5px solid #E2E8F0;background:#fff;filter:grayscale(1)'}));
          } else {
            var iniB=rev.nombre.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
            chB.appendChild(el('div',{class:'av',style:'background:#94a3b8'},iniB));
          }
          var infoB=el('div',{style:'flex:1'});
          var nomB=el('div',{style:'font-weight:500;font-size:14px;display:flex;align-items:center;gap:8px'});
          nomB.appendChild(document.createTextNode(rev.nombre));
          nomB.appendChild(el('span',{style:'font-size:10px;font-weight:600;background:#F1F5F9;color:#64748b;border-radius:999px;padding:2px 8px'},'De baja'));
          infoB.appendChild(nomB);
          infoB.appendChild(el('div',{style:'font-size:12px;color:#94a3b8'},rev.email||''));
          chB.appendChild(infoB);
          var btnHab=el('button',{class:'btn btnsm btnp'},'Habilitar');
          btnHab.onclick=(function(rv){ return function(){
            if (!confirm('Volver a habilitar a "'+rv.nombre+'"? Su usuario recupera el acceso al panel. Los clientes que tenía NO vuelven solos (quedaron donde los traspasaste).')) return;
            btnHab.disabled=true; btnHab.textContent='Habilitando...';
            sbFetch('revendedores?id=eq.'+rv.id, {method:'PATCH', prefer:'return=minimal', body: {activo:true}})
              .then(function(){ return sbFetch('panel_usuarios?revendedor_id=eq.'+rv.id+'&rol=eq.baja', {method:'PATCH', prefer:'return=minimal', body: {rol:'partner'}}).catch(function(){}); })
              .then(function(){ _D=null; vPartners(); })
              .catch(function(e){ btnHab.disabled=false; btnHab.textContent='Habilitar'; alert('Error: '+e.message); });
          }; })(rev);
          chB.appendChild(btnHab);
          cardB.appendChild(chB);
          wrap.appendChild(cardB);
          return;
        }
        var sisIds=revSis.filter(function(rs){ return rs.revendedor_id===rev.id; }).map(function(rs){ return rs.sistema_id; });
        var sisList=sistemas.filter(function(s){ return sisIds.indexOf(s.id)!==-1; });
        var clisDel = clientes.filter(function(c){ return c.revendedor_id===rev.id && !c.eliminado; });
        var cliCount = clisDel.length;

        // Calcular saldo a cobrar este mes
        var saldoImplUSD = 0, saldoFeeUSD = 0;
        clisDel.forEach(function(cl) {
          var asigsCli = asigs.filter(function(a){ return a.cliente_id===cl.id; });
          asigsCli.forEach(function(a) {
            if (a.mayorista_pct_impl && a.impl_cobrada_usd) saldoImplUSD += a.impl_cobrada_usd * a.mayorista_pct_impl / 100;
            if (a.mayorista_pct_fee) {
              var feeBase = a.fee_acordado_usd != null ? a.fee_acordado_usd : 50;
              saldoFeeUSD += feeBase * a.mayorista_pct_fee / 100;
            }
          });
        });
        var saldoTotalUSD = saldoImplUSD + saldoFeeUSD;

        var card=el('div',{class:'cc'}); var ch=el('div',{class:'ch'});
        if (rev.logo_b64) {
          ch.appendChild(el('img',{src:rev.logo_b64,style:'width:36px;height:36px;object-fit:contain;border-radius:8px;border:.5px solid #E2E8F0;background:#fff'}));
        } else {
          var ini=rev.nombre.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
          ch.appendChild(el('div',{class:'av'},ini));
        }
        var info=el('div',{style:'flex:1'});
        info.appendChild(el('div',{style:'font-weight:500;font-size:14px'},rev.nombre));
        info.appendChild(el('div',{style:'font-size:12px;color:#94a3b8'},[rev.email,cliCount+' cliente'+(cliCount!==1?'s':'')].filter(Boolean).join(' · ')));
        ch.appendChild(info);

        // Saldo a cobrar
        if (saldoTotalUSD > 0) {
          var saldoEl = el('div',{style:'text-align:right;margin-right:8px'});
          saldoEl.appendChild(el('div',{style:'font-size:13px;font-weight:700;color:#0B9EDA'},'USD '+saldoTotalUSD.toFixed(0)));
          if (tc) saldoEl.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},'$'+Math.round(saldoTotalUSD*tc).toLocaleString('es-AR')));
          saldoEl.appendChild(el('div',{style:'font-size:10px;color:#94a3b8'},'este mes'));
          ch.appendChild(saldoEl);
        }

        var btnE=el('button',{class:'btn btnsm'},'Editar');
        btnE.onclick=(function(rv,sl){ return function(){ mEditarPartner(rv,sl,sistemas,function(){ vPartners(); }); }; })(rev,sisList);
        ch.appendChild(btnE);
        var btnV=el('button',{class:'btn btnsm btnp',style:'margin-left:4px'},'Ver clientes');
        btnV.onclick=(function(rv){ return function(){ vClientesPartner(rv,sistemas); }; })(rev);
        var btnL=el('button',{class:'btn btnsm',style:'margin-left:4px'},'Liquidación');
        btnL.onclick=(function(rv,cds,asg,t){ return function(){ vLiquidacionPartner(rv,cds,asg,t); }; })(rev,clisDel,asigs,tc);
        var btnRP=el('button',{class:'btn btnsm',style:'margin-left:4px'},'Resetear pass');
        btnRP.onclick=(function(rv){ return function(){
          var np = prompt('Nueva contraseña para el usuario del panel de "'+rv.nombre+'" (mín. 6):');
          if (!np) return;
          if (np.length < 6) { alert('Mínimo 6 caracteres'); return; }
          coneosCall('resetear_password_panel', {revendedor_id: rv.id, nueva_password: np}).then(function(r){
            if (r.error) { alert('Error: '+r.error+(r.detalle?'\n'+r.detalle:'')); return; }
            alert('Contraseña actualizada para '+(r.email||'el usuario del partner'));
          }).catch(function(e){ alert('Error: '+e.message); });
        }; })(rev);
        var btnBaja=el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'Dar de baja');
        btnBaja.onclick=(function(rv,cnt){ return function(){
          mBajaPartner(rv, revsActivos, cnt, function(){ vPartners(); });
        }; })(rev, cliCount);
        ch.appendChild(btnV); ch.appendChild(btnL); ch.appendChild(btnRP); ch.appendChild(btnBaja); card.appendChild(ch);
        if (sisList.length) {
          var body=el('div',{style:'padding:8px 12px 10px;display:flex;flex-wrap:wrap;gap:6px'});
          sisList.forEach(function(s){ body.appendChild(chip(s.nombre)); });
          card.appendChild(body);
        } else {
          card.appendChild(el('div',{style:'padding:6px 12px 10px;font-size:12px;color:#94a3b8'},'Sin sistemas asignados'));
        }
        wrap.appendChild(card);
      });
    }
    setApp(wrap);
  }).catch(function(e){ setApp(el('div',{class:'emp',style:'color:red'},'Error partners: '+e.message)); });
}

function vPartnerPropio() {
  var revId=getRevendedorId();
  if (!revId){ setApp(el('div',{class:'emp'},'Sin partner asignado')); return; }
  loading();
  Promise.all([
    sbFetch('revendedores?id=eq.'+revId+'&select=*'),
    sbFetch('panel_revendedor_sistemas?revendedor_id=eq.'+revId+'&select=sistema_id'),
    sbFetch('panel_sistemas?select=*&order=nombre.asc')
  ]).then(function(r) {
    var rev=r[0][0];
    // Header con la marca del partner (white-label)
    if (rev && rev.logo_b64) {
      var lg = document.getElementById('logo');
      if (lg) lg.src = rev.logo_b64;
    }
    var sisIds=r[1].map(function(x){ return x.sistema_id; });
    var sisDisp=r[2].filter(function(s){ return sisIds.indexOf(s.id)!==-1; });
    vClientesPartner(rev,sisDisp);
  }).catch(function(e){ setApp(el('div',{class:'emp',style:'color:red'},'Error: '+e.message)); });
}

function mNuevoPartner(sistemas,cb) {
  var err;
  openM(makeModal('+ Nuevo partner', function(body) {
    addFg(body,'Nombre',mkInput('pnombre','text','','Nombre del partner'));
    addFg(body,'Email (login)',mkInput('pemail','email','','email@ejemplo.com'));
    addFg(body,'Contraseña',mkInput('ppass','password','','Contraseña inicial'));
    var sg=el('div',{class:'fg'});
    sg.appendChild(el('label',{class:'fl'},'Sistemas que puede vender'));
    var sisDiv=el('div',{style:'display:flex;flex-direction:column;gap:6px;margin-top:4px'});
    sistemas.forEach(function(s){
      var row=el('div',{style:'display:flex;align-items:center;gap:8px'});
      var chk=el('input',{type:'checkbox',id:'psis_'+s.id});
      row.appendChild(chk); row.appendChild(el('label',{for:'psis_'+s.id,style:'font-size:13px;cursor:pointer'},s.nombre));
      sisDiv.appendChild(row);
    });
    sg.appendChild(sisDiv); body.appendChild(sg);
    err=el('div',{style:'color:#c0392b;font-size:12px;display:none;margin-top:4px'}); body.appendChild(err);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var btnG=el('button',{class:'btn btnp'},'Crear partner');
    btnG.onclick=function() {
      var nombre=gv('pnombre').trim(),email=gv('pemail').trim(),pass=gv('ppass').trim();
      if (!nombre||!email||!pass){ err.textContent='Completá todos los campos'; err.style.display=''; return; }
      btnG.disabled=true; btnG.textContent='Creando...';
      fetch(SB_URL+'/functions/v1/panel-admin',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+SB_KEY},
        body:JSON.stringify({action:'crear_usuario_partner',email:email,password:pass,nombre:nombre})
      }).then(function(r){ return r.json(); }).then(function(res) {
        if (res.error) throw new Error(res.error);
        return dbIns('revendedores',{nombre:nombre}).then(function(rows) {
          var rev=rows[0];
          return dbIns('panel_usuarios',{user_id:res.user_id,rol:'partner',revendedor_id:rev.id}).then(function() {
            var checks=sistemas.filter(function(s){ var c=ge('psis_'+s.id); return c&&c.checked; });
            if (!checks.length) return;
            return Promise.all(checks.map(function(s){ return dbIns('panel_revendedor_sistemas',{revendedor_id:rev.id,sistema_id:s.id}); }));
          });
        });
      }).then(function(){ closeM(); cb(); })
      .catch(function(e){ err.textContent='Error: '+e.message; err.style.display=''; btnG.disabled=false; btnG.textContent='Crear partner'; });
    };
    foot.appendChild(btnG);
  }));
}

function mEditarPartner(rev,sisList,sistemas,cb) {
  var err;
  var _logoInp, _logoB64;
  openM(makeModal('Editar partner — '+rev.nombre, function(body) {
    addFg(body,'Nombre',mkInput('epnombre','text',rev.nombre,''));

    // Logo
    var logoFg=el('div',{class:'fg'});
    logoFg.appendChild(el('label',{class:'fl'},'Logo del partner'));
    var logoPreview=el('div',{style:'margin-bottom:8px'});
    if (rev.logo_b64) {
      logoPreview.appendChild(el('img',{src:rev.logo_b64,style:'height:48px;object-fit:contain;border-radius:8px;border:1px solid #E2E8F0'}));
    }
    logoFg.appendChild(logoPreview);
    _logoInp=el('input',{type:'file',accept:'image/*',style:'font-size:12px;width:100%'});
    _logoInp.onchange=function(){
      var file=_logoInp.files[0];
      if (!file) return;
      if (file.size > 300*1024){ alert('El logo no puede superar 300KB'); _logoInp.value=''; return; }
      var reader=new FileReader();
      reader.onload=function(e){
        _logoB64=e.target.result;
        logoPreview.innerHTML='';
        logoPreview.appendChild(el('img',{src:_logoB64,style:'height:48px;object-fit:contain;border-radius:8px;border:1px solid #E2E8F0'}));
      };
      reader.readAsDataURL(file);
    };
    logoFg.appendChild(_logoInp);
    body.appendChild(logoFg);

    var sg=el('div',{class:'fg'});
    sg.appendChild(el('label',{class:'fl'},'Sistemas que puede vender'));
    var sisIds=sisList.map(function(s){ return s.id; });
    var sisDiv=el('div',{style:'display:flex;flex-direction:column;gap:6px;margin-top:4px'});
    sistemas.forEach(function(s){
      var row=el('div',{style:'display:flex;align-items:center;gap:8px'});
      var chk=el('input',{type:'checkbox',id:'epsis_'+s.id});
      if (sisIds.indexOf(s.id)!==-1) chk.checked=true;
      row.appendChild(chk); row.appendChild(el('label',{for:'epsis_'+s.id,style:'font-size:13px;cursor:pointer'},s.nombre));
      sisDiv.appendChild(row);
    });
    sg.appendChild(sisDiv); body.appendChild(sg);
    err=el('div',{style:'color:#c0392b;font-size:12px;display:none;margin-top:4px'}); body.appendChild(err);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var btnG=el('button',{class:'btn btnp'},'Guardar');
    btnG.onclick=function() {
      var nombre=gv('epnombre').trim();
      if (!nombre){ err.textContent='Ingresá un nombre'; err.style.display=''; return; }
      btnG.disabled=true; btnG.textContent='Guardando...';
      var revData={nombre:nombre};
      if (_logoB64) revData.logo_b64=_logoB64;
      dbUpd('revendedores',rev.id,revData).then(function() {
        return fetch(SB_URL+'/rest/v1/panel_revendedor_sistemas?revendedor_id=eq.'+rev.id,{
          method:'DELETE',headers:{apikey:SB_KEY,'Authorization':'Bearer '+SB_KEY}
        });
      }).then(function() {
        var checks=sistemas.filter(function(s){ var c=ge('epsis_'+s.id); return c&&c.checked; });
        if (!checks.length) return;
        return Promise.all(checks.map(function(s){ return dbIns('panel_revendedor_sistemas',{revendedor_id:rev.id,sistema_id:s.id}); }));
      }).then(function(){ closeM(); cb(); })
      .catch(function(e){ err.textContent='Error: '+e.message; err.style.display=''; btnG.disabled=false; btnG.textContent='Guardar'; });
    };
    foot.appendChild(btnG);
  }));
}

function mBajaPartner(rev, revsActivos, cliCount, cb) {
  openM(makeModal('Dar de baja — ' + rev.nombre, function(body) {
    body.appendChild(el('div',{style:'font-size:13px;color:#64748b;margin-bottom:10px'},
      'El partner queda inactivo (recuperable desde la base) y su usuario pierde el acceso al panel. ' +
      (cliCount>0 ? 'Tiene ' + cliCount + ' cliente' + (cliCount!==1?'s':'') + ': elegí a dónde pasan.' : 'No tiene clientes.')));
    if (cliCount>0) {
      var selW = el('div',{class:'fg'});
      selW.appendChild(el('label',{class:'fl'},'Traspasar clientes a'));
      var sel = el('select',{class:'fi',id:'bp-destino'});
      sel.appendChild(el('option',{value:''},'QP C&IA (clientes directos, sin partner)'));
      revsActivos.filter(function(r2){ return r2.id!==rev.id; }).forEach(function(r2){
        sel.appendChild(el('option',{value:r2.id}, r2.nombre));
      });
      selW.appendChild(sel);
      body.appendChild(selW);
      body.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-top:4px'},'Historial de cobros y asignaciones viaja con cada cliente.'));
    }
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button',{class:'btn',style:'background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'Dar de baja');
    ok.onclick = function() {
      var destino = cliCount>0 ? (gv('bp-destino')||null) : null;
      var destinoNombre = destino ? (revsActivos.find(function(r2){ return r2.id===destino; })||{}).nombre : 'QP C&IA (directos)';
      if (!confirm('Dar de baja a "' + rev.nombre + '"' + (cliCount>0 ? ' y pasar sus ' + cliCount + ' cliente(s) a ' + destinoNombre : '') + '?')) return;
      ok.disabled = true; ok.textContent = 'Procesando...';
      var pasos = Promise.resolve();
      if (cliCount>0) {
        pasos = pasos.then(function(){
          return sbFetch('panel_clientes?revendedor_id=eq.'+rev.id, {method:'PATCH', prefer:'return=minimal', body: {revendedor_id: destino}});
        });
      }
      pasos
        .then(function(){ return sbFetch('revendedores?id=eq.'+rev.id, {method:'PATCH', prefer:'return=minimal', body: {activo:false}}); })
        .then(function(){ return sbFetch('panel_usuarios?revendedor_id=eq.'+rev.id+'&rol=eq.partner', {method:'PATCH', prefer:'return=minimal', body: {rol:'baja'}}).catch(function(){}); })
        .then(function(){ _D = null; closeM(); if (cb) cb(); })
        .catch(function(e){ ok.disabled=false; ok.textContent='Dar de baja'; alert('Error: ' + e.message); });
    };
    foot.appendChild(ok);
  }));
}

function mCrearEmpresaClienteOnb(cl, cb) {
  openM(makeModal('Crear empresa ConeOS para ' + cl.nombre, function(body) {
    addFg(body, 'Nombre de la empresa', mkInput('oce-nombre','text',cl.empresa||cl.nombre||''));
    addFg(body, 'Slug (URL)', mkInput('oce-slug','text','','ej: heladeria-centro'));
    mkRow2(body, mkFg('Color primario', mkInput('oce-c1','color','#6366F1')), mkFg('Color secundario', mkInput('oce-c2','color','#4F46E5')));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button',{class:'btn btnp'},'Crear empresa');
    ok.onclick = function() {
      var nombre = gv('oce-nombre').trim(), slug = gv('oce-slug').trim();
      if (!nombre || !slug) { alert('Nombre y slug son requeridos'); return; }
      ok.disabled = true; ok.textContent = 'Creando...';
      coneosCall('crear_empresa_cliente', {cliente_id: cl.id, nombre: nombre, slug: slug, primary_color: gv('oce-c1'), secondary_color: gv('oce-c2')})
      .then(function(r){
        if (r.error) { alert('Error: ' + r.error + (r.detalle ? '\n' + r.detalle : '')); ok.disabled=false; ok.textContent='Crear empresa'; return; }
        closeM(); cb();
      }).catch(function(e){ alert('Error: '+e.message); ok.disabled=false; ok.textContent='Crear empresa'; });
    };
    foot.appendChild(ok);
  }));
}

function mMostrarLinkInvitacion(r, datosReenvio) {
  var link = 'https://coneos.com.ar/auth/callback?token_hash=' + r.token_hash + '&tipo=' + (r.verificacion === 'invite' ? 'invite' : 'email');
  openM(makeModal('Invitación generada', function(body) {
    body.appendChild(el('div',{style:'font-size:13px;color:#64748b;margin-bottom:8px'},'Pasale este link a ' + (r.email||'el cliente') + ' para que elija su contraseña y entre a ' + (r.empresa||'su sistema') + '. Expira en 10 minutos — si se vence, Reenviar genera uno nuevo.'));
    var inp = el('input',{class:'fi',id:'inv-link',readonly:'readonly',value:link,style:'font-size:11px'});
    body.appendChild(inp);
  }, function(foot) {
    var btnRe = el('button',{class:'btn'},'Reenviar');
    btnRe.onclick = function() {
      btnRe.disabled = true; btnRe.textContent = 'Generando...';
      coneosCall('reenviar_invitacion', datosReenvio).then(function(r2){
        if (r2.error) { alert('Error: ' + (r2.error==='EN_CURSO'?'Esperá unos segundos y reintentá':r2.error)); btnRe.disabled=false; btnRe.textContent='Reenviar'; return; }
        var nuevo = 'https://coneos.com.ar/auth/callback?token_hash=' + r2.token_hash + '&tipo=' + (r2.verificacion === 'invite' ? 'invite' : 'email');
        var inp = ge('inv-link'); if (inp) inp.value = nuevo;
        btnRe.disabled = false; btnRe.textContent = 'Reenviar';
      });
    };
    foot.appendChild(btnRe);
    var btnC = el('button',{class:'btn btnp'},'Copiar link');
    btnC.onclick = function() {
      var inp = ge('inv-link'); inp.select();
      try { navigator.clipboard.writeText(inp.value); btnC.textContent = 'Copiado ✓'; } catch(e){ document.execCommand('copy'); btnC.textContent = 'Copiado ✓'; }
      setTimeout(function(){ btnC.textContent = 'Copiar link'; }, 1500);
    };
    foot.appendChild(btnC);
    var btnOk = el('button',{class:'btn'},'Cerrar');
    btnOk.onclick = function(){ closeM(); };
    foot.appendChild(btnOk);
  }));
}

function mInvitarAdminOnb(empresaId, cb) {
  openM(makeModal('Invitar administrador', function(body) {
    body.appendChild(el('div',{style:'font-size:12px;color:#94a3b8;margin-bottom:8px'},'Se crea el usuario SIN contraseña: el cliente la elige al abrir el link. Nadie mas la conoce.'));
    addFg(body, 'Nombre', mkInput('inv-nombre','text','','Nombre del administrador'));
    addFg(body, 'Email', mkInput('inv-email','email','','email@delcliente.com'));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button',{class:'btn btnp'},'Generar invitación');
    ok.onclick = function() {
      var nombre = gv('inv-nombre').trim(), email = gv('inv-email').trim();
      if (!nombre || !email) { alert('Nombre y email son requeridos'); return; }
      ok.disabled = true; ok.textContent = 'Generando...';
      var datos = {empresa_id: empresaId, email: email, nombre: nombre};
      coneosCall('invitar_admin', datos).then(function(r){
        if (r.error) { alert('Error: ' + (r.error==='EN_CURSO'?'Esperá unos segundos y reintentá':r.error)); ok.disabled=false; ok.textContent='Generar invitación'; return; }
        closeM();
        mMostrarLinkInvitacion(r, datos);
        if (cb) cb();
      }).catch(function(e){ alert('Error: '+e.message); ok.disabled=false; ok.textContent='Generar invitación'; });
    };
    foot.appendChild(ok);
  }));
}

function vClientesPartner(rev,sistemas) {
  loading();
  Promise.all([
    sbFetch('panel_clientes?revendedor_id=eq.'+rev.id+'&eliminado=eq.false&select=*&order=nombre.asc'),
    sbFetch('panel_asignaciones?select=*'),
    sbFetch('panel_revendedor_sistemas?revendedor_id=eq.'+rev.id+'&select=sistema_id')
  ]).then(function(r) {
    var clientes=r[0],asigs=r[1],revSis=r[2];
    var sisPermitidos=revSis.map(function(rs){ return rs.sistema_id; });
    var sisDisp=Array.isArray(sistemas)?sistemas.filter(function(s){ return sisPermitidos.indexOf(s.id)!==-1; }):[];
    var wrap=el('div',{}); var sh=el('div',{class:'sh'});
    if (isSuperAdmin()) {
      var btnBack=el('button',{class:'btn btnsm'},'← Partners');
      btnBack.onclick=function(){ vPartners(); }; sh.appendChild(btnBack);
    }
    sh.appendChild(el('span',{class:'st',style:'margin-left:8px'},rev.nombre+' — '+clientes.length+' cliente'+(clientes.length!==1?'s':'')));
    var btnN=el('button',{class:'btn btnp'},'+ Nuevo cliente');
    btnN.onclick=function(){ mNuevoClientePartner(rev,sisDisp,function(){ vClientesPartner(rev,sistemas); }); };
    sh.appendChild(btnN); wrap.appendChild(sh);
    if (!clientes.length) {
      wrap.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay clientes todavía')]));
    } else {
      clientes.forEach(function(cl) {
        var misAsigs=asigs.filter(function(a){ return a.cliente_id===cl.id; });
        var card=el('div',{class:'cc'}); var ch=el('div',{class:'ch'});
        var ini=cl.nombre.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
        ch.appendChild(el('div',{class:'av'},ini));
        var info=el('div',{style:'flex:1'});
        info.appendChild(el('div',{style:'font-weight:500;font-size:14px'},cl.nombre));
        var sub=[cl.empresa,cl.email].filter(Boolean).join(' · ');
        if (sub) info.appendChild(el('div',{style:'font-size:12px;color:#94a3b8'},sub));
        ch.appendChild(info);
        var btnA=el('button',{class:'btn btnsm'+(misAsigs.length?'':' btnp')},misAsigs.length?'Sistemas ('+misAsigs.length+')':'+ Asignar sistema');
        btnA.onclick=(function(c,aa){ return function(){ mAsignacionesPartner(c,aa,sisDisp,function(){ vClientesPartner(rev,sistemas); }); }; })(cl,misAsigs);
        ch.appendChild(btnA);
        var btnE=el('button',{class:'btn btnsm',style:'margin-left:4px'},'Editar');
        btnE.onclick=(function(c){ return function(){ mEditarClientePartner(c,rev,sistemas,function(){ vClientesPartner(rev,sistemas); }); }; })(cl);
        ch.appendChild(btnE);
        if (isSuperAdmin()) {
          var btnDelP=el('button',{class:'btn btnsm',style:'margin-left:4px;background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'},'X');
          btnDelP.onclick=(function(c){ return function(){ eliminarClienteCompleto(c, function(){ vClientesPartner(rev,sistemas); }); }; })(cl);
          ch.appendChild(btnDelP);
        }
        card.appendChild(ch);
        if (misAsigs.length) {
          var body=el('div',{style:'padding:6px 12px 10px;display:flex;flex-wrap:wrap;gap:6px'});
          misAsigs.forEach(function(a){ body.appendChild(chipClass(a.activo?'Activo':'Inactivo',a.activo?'ct':'cgr')); });
          // Onboarding ConeOS: crear empresa / invitar admin
          var sisConeos = (Array.isArray(sistemas)?sistemas:[]).find(function(s){ return s.nombre === 'ConeOS'; });
          var asigConeSis = sisConeos ? misAsigs.find(function(a){ return a.sistema_id === sisConeos.id; }) : null;
          if (asigConeSis && !asigConeSis.coneos_empresa_id) {
            var btnCE = el('button',{class:'btn btnsm btnp'},'Crear empresa ConeOS');
            btnCE.onclick = (function(c){ return function(){ mCrearEmpresaClienteOnb(c, function(){ vClientesPartner(rev,sistemas); }); }; })(cl);
            body.appendChild(btnCE);
          }
          if (asigConeSis && asigConeSis.coneos_empresa_id) {
            var btnInv = el('button',{class:'btn btnsm'},'Invitar admin');
            btnInv.onclick = (function(eid){ return function(){ mInvitarAdminOnb(eid, null); }; })(asigConeSis.coneos_empresa_id);
            body.appendChild(btnInv);
          }
          card.appendChild(body);
          // Estado ConeOS del cliente (visible también para el partner, scopeado server-side)
          var asigConeos = misAsigs.find(function(a){ return a.coneos_empresa_id; });
          if (asigConeos) {
            var metBox = el('div',{style:'padding:0 12px 12px'});
            var metInner = el('div',{style:'background:#F8FAFC;border-radius:10px;padding:10px 12px;font-size:12px;color:#94a3b8'},'Cargando estado del sistema...');
            metBox.appendChild(metInner); card.appendChild(metBox);
            coneosCall('metricas_empresa',{empresa_id:asigConeos.coneos_empresa_id}).then(function(m){
              if (m.error) { metInner.textContent = 'Sin acceso al estado ('+m.error+')'; return; }
              metInner.innerHTML = '';
              metInner.style.display='grid'; metInner.style.gridTemplateColumns='repeat(auto-fit,minmax(110px,1fr))'; metInner.style.gap='8px';
              [{l:'Pedidos hoy',v:String(m.pedidos_hoy||0),c:'#0B9EDA'},
               {l:'Facturado hoy',v:'$'+Math.round(m.total_hoy||0).toLocaleString('es-AR'),c:'#3D8A32'},
               {l:'Total pedidos',v:String(m.total_pedidos||0),c:'#7C3AED'},
               {l:'Dispositivos',v:String(m.dispositivos_activos||0),c:'#854F0B'},
               {l:'Operadores',v:String((m.operadores||[]).length),c:'#64748B'}
              ].forEach(function(k){
                var kb=el('div',{});
                kb.appendChild(el('div',{style:'font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8'},k.l));
                kb.appendChild(el('div',{style:'font-size:15px;font-weight:700;color:'+k.c},k.v));
                metInner.appendChild(kb);
              });
            }).catch(function(){ metInner.textContent='No se pudo cargar el estado'; });
          }
        }
        wrap.appendChild(card);
      });
    }
    setApp(wrap);
  }).catch(function(e){ setApp(el('div',{class:'emp',style:'color:red'},'Error: '+e.message)); });
}

function mNuevoClientePartner(rev,sisDisp,cb) {
  var err;
  openM(makeModal('+ Nuevo cliente', function(body) {
    addFg(body,'Nombre',mkInput('pcnombre','text','','Nombre del cliente'));
    addFg(body,'Empresa',mkInput('pcempresa','text','','Empresa'));
    addFg(body,'Email',mkInput('pcemail','email','','email@ejemplo.com'));
    addFg(body,'Teléfono',mkInput('pctelefono','text','','Teléfono'));
    err=el('div',{style:'color:#c0392b;font-size:12px;display:none;margin-top:4px'}); body.appendChild(err);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var btnG=el('button',{class:'btn btnp'},'Crear cliente');
    btnG.onclick=function() {
      var nombre=gv('pcnombre').trim();
      if (!nombre){ err.textContent='Ingresá el nombre'; err.style.display=''; return; }
      btnG.disabled=true; btnG.textContent='Creando...';
      coneosCall('crear_cliente',{nombre:nombre,empresa:gv('pcempresa').trim()||null,email:gv('pcemail').trim()||null,telefono:gv('pctelefono').trim()||null})
      .then(function(r){ if (r.error) throw new Error(r.error==='CLIENTE_EXISTENTE'?'Ya existe un cliente con ese nombre':r.error); return r; })
      .then(function(){ closeM(); cb(); })
      .catch(function(e){ err.textContent='Error: '+e.message; err.style.display=''; btnG.disabled=false; btnG.textContent='Crear cliente'; });
    };
    foot.appendChild(btnG);
  }));
}

function mAsignacionesPartner(cl,asigs,sisDisp,cb) {
  var err;
  openM(makeModal('Sistemas — '+cl.nombre, function(body) {
    if (asigs.length) {
      body.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'},'Asignados'));
      asigs.forEach(function(a) {
        // Buscar nombre del sistema
        var sis = sisDisp.filter(function(s){ return s.id===a.sistema_id; })[0];
        var sisNom = sis ? sis.nombre : a.sistema_id;
        var sisPlat = sis ? sis.plataforma : null;
        var esConeos = sisNom && sisNom.toLowerCase().indexOf('coneos') >= 0;
        var card=el('div',{style:'background:#f8fafc;border-radius:8px;margin-bottom:6px;overflow:hidden'});
        var row=el('div',{style:'display:flex;align-items:center;gap:8px;padding:8px 10px'});
        var info=el('div',{style:'flex:1'});
        info.appendChild(el('div',{style:'font-size:13px;font-weight:500'},sisNom));
        row.appendChild(info);
        row.appendChild(chipClass(a.activo?'Activo':'Inactivo',a.activo?'ct':'cgr'));
        // Botón módulos si es ConeOS y tiene empresa vinculada
        if (esConeos) {
          var btnMod=el('button',{class:'btn btnsm',style:'margin-left:4px'},a.coneos_empresa_id?'Plan':'⚠ Vincular ConeOS');
          (function(asig,cnombre){ btnMod.onclick=function(){
            if (asig.coneos_empresa_id) {
              closeM(); mPlanConeOS({id:asig.coneos_empresa_id, nombre:cnombre}, asig.id);
            } else {
              closeM(); mVincularEmpresaConeos(asig, function(){ mPlanConeOS({id:asig.coneos_empresa_id,nombre:cnombre},asig.id); });
            }
          }; })(a,cl.nombre);
          row.appendChild(btnMod);
        }
        card.appendChild(row);
        body.appendChild(card);
      });
      body.appendChild(el('div',{style:'margin-top:12px;border-top:1px solid #f1f5f9;padding-top:12px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px'},'+ Asignar sistema'));
    }
    var asigSisIds=asigs.map(function(a){ return a.sistema_id; });
    var disponibles=sisDisp.filter(function(s){ return asigSisIds.indexOf(s.id)===-1; });
    if (disponibles.length) {
      var selSis=el('select',{class:'fi',id:'pasis',style:'margin-top:6px'});
      selSis.appendChild(el('option',{value:''},'— Seleccionar sistema —'));
      disponibles.forEach(function(s){ selSis.appendChild(el('option',{value:s.id},s.nombre)); });
      body.appendChild(selSis);
      mkRow2(body, mkFg('Fee mensual',mkInput('pasisfee','number','','0')), mkFg('Día de cobro',mkInput('pasisdiac','number','1','')));
    } else if (!asigs.length) {
      body.appendChild(el('div',{style:'font-size:12px;color:#94a3b8;margin-top:8px'},'No hay sistemas disponibles para asignar'));
    }
    err=el('div',{style:'color:#c0392b;font-size:12px;display:none;margin-top:4px'}); body.appendChild(err);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var asigSisIds2=asigs.map(function(a){ return a.sistema_id; });
    var disponibles2=sisDisp.filter(function(s){ return asigSisIds2.indexOf(s.id)===-1; });
    if (disponibles2.length) {
      var btnG=el('button',{class:'btn btnp'},'+ Asignar');
      btnG.onclick=function() {
        var sisId=gv('pasis');
        if (!sisId){ err.textContent='Seleccioná un sistema'; err.style.display=''; return; }
        btnG.disabled=true; btnG.textContent='Asignando...';
        dbIns('panel_asignaciones',{cliente_id:cl.id,sistema_id:sisId,fee_mensual:Number(gv('pasisfee'))||0,dia_cobro:Number(gv('pasisdiac'))||1,activo:true})
        .then(function(){ closeM(); cb(); })
        .catch(function(e){ err.textContent='Error: '+e.message; err.style.display=''; btnG.disabled=false; btnG.textContent='+ Asignar'; });
      };
      foot.appendChild(btnG);
    }
  }));
}

// ── LIQUIDACIÓN PARTNER ─────────────────────────────────────────

function vLiquidacionPartner(rev, clientes, asigs, tc) {
  var wrap = el('div',{});
  var sh = el('div',{class:'sh'});
  var btnBack = el('button',{class:'btn btnsm'},'← Partners');
  btnBack.onclick = function(){ vPartners(); };
  sh.appendChild(btnBack);
  sh.appendChild(el('span',{class:'st',style:'margin-left:8px'},'Liquidación — '+rev.nombre));
  wrap.appendChild(sh);

  // Totales del mes
  var totalImplUSD=0, totalFeeUSD=0;
  clientes.forEach(function(cl) {
    asigs.filter(function(a){ return a.cliente_id===cl.id; }).forEach(function(a) {
      if (a.mayorista_pct_impl && a.impl_cobrada_usd) totalImplUSD += a.impl_cobrada_usd * a.mayorista_pct_impl / 100;
      if (a.mayorista_pct_fee) totalFeeUSD += (a.fee_acordado_usd!=null?a.fee_acordado_usd:50) * a.mayorista_pct_fee / 100;
    });
  });
  var totalUSD = totalImplUSD + totalFeeUSD;

  // KPIs
  var kpiRow = el('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px'});
  function kpi(label, val, sub) {
    var k=el('div',{class:'card',style:'padding:12px;text-align:center'});
    k.appendChild(el('div',{style:'font-size:11px;color:#64748b;margin-bottom:4px'},label));
    k.appendChild(el('div',{style:'font-size:18px;font-weight:700;color:#0B9EDA'},val));
    if (sub) k.appendChild(el('div',{style:'font-size:11px;color:#94a3b8'},sub));
    return k;
  }
  kpiRow.appendChild(kpi('Impl. este mes','USD '+totalImplUSD.toFixed(0), tc?'$'+Math.round(totalImplUSD*tc).toLocaleString('es-AR'):null));
  kpiRow.appendChild(kpi('Fee mensual','USD '+totalFeeUSD.toFixed(0), tc?'$'+Math.round(totalFeeUSD*tc).toLocaleString('es-AR'):null));
  kpiRow.appendChild(kpi('Total a cobrar','USD '+totalUSD.toFixed(0), tc?'$'+Math.round(totalUSD*tc).toLocaleString('es-AR'):null));
  wrap.appendChild(kpiRow);

  // Detalle por cliente
  wrap.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'},'Detalle por cliente'));

  if (!clientes.length) {
    wrap.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin clientes')]));
  } else {
    clientes.forEach(function(cl) {
      var asigsCli = asigs.filter(function(a){ return a.cliente_id===cl.id; });
      var card = el('div',{class:'cc'});

      // Header cliente
      var ch = el('div',{class:'ch'});
      var ini = cl.nombre.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
      ch.appendChild(el('div',{class:'av'},ini));
      var info = el('div',{style:'flex:1'});
      info.appendChild(el('div',{style:'font-weight:500;font-size:14px'},cl.nombre));
      if (cl.empresa) info.appendChild(el('div',{style:'font-size:12px;color:#94a3b8'},cl.empresa));
      ch.appendChild(info);
      // Botón Plan directo desde liquidación
      var primerAsig = asigsCli[0];
      if (primerAsig && primerAsig.coneos_empresa_id) {
        var btnPlan = el('button',{class:'btn btnsm btnp'},'⚙ Plan');
        (function(asig, cnombre){ btnPlan.onclick = function(){
          mPlanConeOS({id:asig.coneos_empresa_id, nombre:cnombre, _dispActivos:0}, asig.id);
        }; })(primerAsig, cl.nombre);
        ch.appendChild(btnPlan);
      }
      card.appendChild(ch);

      // Detalle por asignación
      asigsCli.forEach(function(a) {
        var implMay = (a.mayorista_pct_impl && a.impl_cobrada_usd) ? a.impl_cobrada_usd * a.mayorista_pct_impl / 100 : 0;
        var feeBase = a.fee_acordado_usd != null ? a.fee_acordado_usd : 50;
        var feeMay  = a.mayorista_pct_fee ? feeBase * a.mayorista_pct_fee / 100 : 0;
        var planLabel = a.coneos_plan ? a.coneos_plan.toUpperCase() : '—';

        var det = el('div',{style:'padding:8px 12px;border-top:.5px solid #f1f5f9;display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:4px;font-size:12px'});

        function col(label, val, color) {
          var d = el('div',{});
          d.appendChild(el('div',{style:'color:#94a3b8;font-size:10px'},label));
          d.appendChild(el('div',{style:'font-weight:500;color:'+(color||'#1a2e4a')},val));
          return d;
        }

        det.appendChild(col('Plan', planLabel));
        det.appendChild(col('Fee acordado', 'USD '+feeBase));
        det.appendChild(col('Impl. mayorista', implMay>0?'USD '+implMay.toFixed(0):'—', implMay>0?'#0B9EDA':null));
        det.appendChild(col('Fee mayorista/mes', feeMay>0?'USD '+feeMay.toFixed(0):'—', feeMay>0?'#0B9EDA':null));
        card.appendChild(det);

        // Si no tiene % configurado, mostrar aviso
        if (!a.mayorista_pct_fee && !a.mayorista_pct_impl) {
          var aviso = el('div',{style:'padding:4px 12px 8px;font-size:11px;color:#f59e0b'});
          aviso.textContent = '⚠ Sin porcentajes mayoristas configurados — abrí Plan para definirlos';
          card.appendChild(aviso);
        }
      });

      if (!asigsCli.length) {
        var sin = el('div',{style:'padding:8px 12px;font-size:12px;color:#94a3b8'});
        sin.textContent = 'Sin sistemas asignados';
        card.appendChild(sin);
      }

      wrap.appendChild(card);
    });
  }

  // Nota dólar
  if (tc) {
    wrap.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-top:8px;text-align:right'},'Dólar oficial: $'+tc.toLocaleString('es-AR')));
  }

  setApp(wrap);
}

function mEditarClientePartner(cl, rev, sistemas, cb) {
  var err;
  openM(makeModal('Editar cliente', function(body) {
    addFg(body,'Nombre',mkInput('epc-nombre','text',cl.nombre||''));
    addFg(body,'Empresa',mkInput('epc-empresa','text',cl.empresa||''));
    addFg(body,'Email',mkInput('epc-email','email',cl.email||''));
    addFg(body,'Telefono',mkInput('epc-tel','text',cl.telefono||''));
    var estadoRow=el('div',{style:'display:flex;align-items:center;gap:8px;margin-top:8px'});
    var actChk=el('input',{type:'checkbox',id:'epc-activo',class:'tgl'}); if(!cl.pausado) actChk.checked=true;
    estadoRow.appendChild(actChk);
    estadoRow.appendChild(el('label',{for:'epc-activo',class:'tgl-lbl'}));
    var actLbl=el('span',{style:'font-size:13px;color:#64748b'},actChk.checked?'Activo':'Pausado');
    actChk.onchange=function(){ actLbl.textContent=actChk.checked?'Activo':'Pausado'; };
    estadoRow.appendChild(actLbl);
    body.appendChild(estadoRow);
    err=el('div',{style:'color:#c0392b;font-size:12px;display:none;margin-top:4px'}); body.appendChild(err);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var btnG=el('button',{class:'btn btnp'},'Guardar');
    btnG.onclick=function() {
      var nombre=gv('epc-nombre').trim();
      if (!nombre){ err.textContent='Ingresa el nombre'; err.style.display=''; return; }
      btnG.disabled=true; btnG.textContent='Guardando...';
      var pausado=!(ge('epc-activo')&&ge('epc-activo').checked);
      dbUpd('panel_clientes',cl.id,{nombre:nombre,empresa:gv('epc-empresa').trim()||null,email:gv('epc-email').trim()||null,telefono:gv('epc-tel').trim()||null,pausado:pausado})
      .then(function(){ closeM(); cb(); })
      .catch(function(e){ err.textContent='Error: '+e.message; err.style.display=''; btnG.disabled=false; btnG.textContent='Guardar'; });
    };
    foot.appendChild(btnG);
  }));
}
