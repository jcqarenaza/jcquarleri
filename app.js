// QP C&IA - Panel de Sistemas
var SB_URL = 'https://tviiikkdskucmgcmtswu.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aWlpa2tkc2t1Y21nY210c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTM2OTQsImV4cCI6MjA5MjA4OTY5NH0.TtmNyaOd1gKVUmbBf0e1Epj8V3J6W5R64yPp9uLiDDg';

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
var M_LAB = {transferencia:'Transferencia', efectivo:'Efectivo', mercadopago:'MercadoPago', otro:'Otro'};
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

// Load all data
function cargar() {
  return Promise.all([
    dbGet('panel_sistemas'), dbGet('panel_clientes'),
    dbGet('panel_asignaciones'), dbGet('panel_cobros'), dbGet('panel_sub_entidades'),
    dbGet('panel_implementacion_fases'), dbGet('panel_alertas')
  ]).then(function(r) {
    console.log('cargar OK:', r[0].length, 'sis,', r[1].length, 'cls,', r[2].length, 'asigs');
    var sis=r[0], cls=r[1], asigs=r[2], cobs=r[3], subs=r[4], fases=r[5], alertasDb=r[6];
    asigs.forEach(function(a) {
      a._sis  = sis.find(function(s){ return s.id===a.sistema_id; })||{nombre:'?'};
      a._cli  = cls.find(function(c){ return c.id===a.cliente_id; })||{nombre:'?'};
      a._subs = subs.filter(function(se){ return se.asignacion_id===a.id; });
      a._cobs = cobs.filter(function(co){ return co.asignacion_id===a.id; });
      a._fases = fases.filter(function(f){ return f.asignacion_id===a.id; }).sort(function(x,y){ return x.numero-y.numero; });
    });
    cobs.forEach(function(c) {
      var a = asigs.find(function(x){ return x.id===c.asignacion_id; })||{};
      c._sis = a._sis||{nombre:'-'}; c._cli = a._cli||{nombre:'-'};
      c._asig = a;
      c._fase = (a._fases||[]).find(function(f){ return f.id===c.fase_id; })||null;
    });
    return {sis:sis, cls:cls, asigs:asigs, cobs:cobs, alertasDb:alertasDb};
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
function go(v) {
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('on'); });
  var nb = ge('nb-'+v); if (nb) nb.classList.add('on');
  loading();
  ({dash:vDash, sistemas:vSistemas, clientes:vClientes, cobros:vCobros, alertas:vAlertas, salud:vSalud, gastos:vFinanzas})[v]();
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
  var estadoLabel = d.estado==='pagado' ? 'PAGADO' : 'PENDIENTE';
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
    + '<div><div class="lb">Servicio</div><div class="vl">' + (d.sis||'-') + '</div></div>'
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
    var als = calcAlertas(D.asigs, D.alertasDb);
    var pen = D.cobs.filter(function(c){ return c.estado==='pendiente'; });
    var totP = pen.reduce(function(s,c){ return s+Number(c.monto); }, 0);
    var totC = D.cobs.filter(function(c){ return c.estado==='pagado'; }).reduce(function(s,c){ return s+Number(c.monto); }, 0);
    var nCli = D.cls.length;
    var wrap = el('div', {});

    // Alerta banner
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

    // Metricas
    var mets = el('div', {class:'mets'});
    [{color:'#0B9EDA', label:'Sistemas activos', val:D.sis.filter(function(s){return s.activo;}).length+'/'+D.sis.length},
     {color:'#5BBD4E', label:'Clientes', val:nCli},
     {color:'#EF9F27', label:'Por cobrar', val:fmt(totP), sub:pen.length+' pendiente'+(pen.length!==1?'s':'')},
     {color:'#7F77DD', label:'Total cobrado', val:fmt(totC)}
    ].forEach(function(m) {
      var met = el('div', {class:'met'});
      met.appendChild(el('div', {class:'mst', style:'background:'+m.color}));
      met.appendChild(el('div', {class:'mlb'}, m.label));
      met.appendChild(el('div', {class:'mv', style:'font-size:'+(m.val.toString().length>6?'18px':'26px')}, m.val));
      if (m.sub) met.appendChild(el('div', {class:'ms'}, m.sub));
      mets.appendChild(met);
    });
    wrap.appendChild(mets);

    // Tabla sistemas
    if (D.sis.length) {
      wrap.appendChild(el('div', {class:'sh'}, [el('span', {class:'st'}, 'Sistemas')]));
      var card = el('div', {class:'card'});
      var tbl = el('table', {class:'tbl'});
      tbl.appendChild(elH('thead', {}, '<tr><th>Sistema</th><th>Plataforma</th><th>Impl.</th><th>Fee</th><th>Estado</th></tr>'));
      var tb = el('tbody', {});
      D.sis.forEach(function(s) {
        var tr = el('tr', {});
        var td1 = el('td', {}); td1.appendChild(chip(s.nombre));
        if (s.url_produccion) td1.appendChild(el('div', {style:'font-size:11px;color:#94a3b8'}, s.url_produccion));
        tr.appendChild(td1);
        tr.appendChild(el('td', {}, [chipClass(P_LAB[s.plataforma]||s.plataforma, 'cb')]));
        tr.appendChild(el('td', {style:'font-weight:500'}, fmt(s.costo_implementacion)));
        tr.appendChild(el('td', {}, fmt(s.fee_mensual)+'/mes'));
        tr.appendChild(el('td', {}, [chipClass(s.activo?'Activo':'Inactivo', s.activo?'cg':'cr')]));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      card.appendChild(tbl);
      wrap.appendChild(card);
    }

    // Cobros pendientes
    if (pen.length) {
      wrap.appendChild(el('div', {class:'sh'}, [el('span', {class:'st'}, 'Cobros pendientes')]));
      var card2 = el('div', {class:'card'});
      var tbl2 = el('table', {class:'tbl'});
      tbl2.appendChild(elH('thead', {}, '<tr><th>Cliente</th><th>Sistema</th><th>Tipo</th><th>Monto</th><th>Vence</th></tr>'));
      var tb2 = el('tbody', {});
      pen.forEach(function(c) {
        var tr = el('tr', {});
        tr.appendChild(el('td', {}, c._cli.nombre||'-'));
        var td = el('td', {}); td.appendChild(chip(c._sis.nombre||'-')); tr.appendChild(td);
        tr.appendChild(el('td', {}, [chipClass(c.tipo_cobro||'fee', 'cgr')]));
        tr.appendChild(el('td', {style:'font-weight:500;color:#854f0b'}, fmt(c.monto)));
        tr.appendChild(el('td', {}, fdate(c.fecha_vencimiento)));
        tb2.appendChild(tr);
      });
      tbl2.appendChild(tb2);
      card2.appendChild(tbl2);
      wrap.appendChild(card2);
    }

    if (!D.sis.length && !pen.length) {
      wrap.appendChild(el('div', {class:'card'}, [el('div', {class:'emp'}, 'Panel vacio - crea sistemas y clientes para empezar')]));
    }
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
  dh.appendChild(el('span', {style:'font-size:20px'}, s.nombre==='Cortelab'?'📐':s.nombre==='El Piamonte'?'🚗':s.nombre==='MobixERP'?'📱':s.nombre==='ConeOS'?'🍦':'💻'));
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
      var mets = el('div', {style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px'});
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
  sbFetch('panel_sistemas?select=*&order=orden.asc,nombre.asc').then(function(sis) {
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
        'El Piamonte': {letra:'EP', color:'#0284C7', bgLetra:'#E0F2FE', emoji:'🚗'},
        'MobixERP':    {letra:'MX', color:'#7C3AED', bgLetra:'#EDE9FE', emoji:'📱'},
        'ConeOS':      {letra:'CO', color:'#F59E0B', bgLetra:'#FEF3C7', emoji:'🍦'},
      };

      sis.forEach(function(s) {
        var cfg = SIS_CONFIG[s.nombre] || {letra:'--', color:'#64748B', bgLetra:'#F1F5F9'};
        var card = el('div', {class:'card', style:'margin-bottom:14px;padding:0'});

        // Header igual a ConeOS: dos filas, toggle+editar a la derecha
        var hdr = el('div', {style:'padding:14px 16px 10px'});
        var topRow = el('div', {style:'display:flex;align-items:center;gap:8px;margin-bottom:4px'});
        // Ícono: emoji si tiene, si no letra
        var icono = cfg.emoji
          ? el('span', {style:'font-size:22px;line-height:1'}, cfg.emoji)
          : el('span', {style:'width:28px;height:28px;border-radius:50%;background:'+cfg.bgLetra+';color:'+cfg.color+';font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0'}, cfg.letra);
        topRow.appendChild(icono);
        topRow.appendChild(el('span', {style:'font-size:15px;font-weight:700;color:'+cfg.color}, s.nombre));
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
        hdr.appendChild(el('div', {style:'font-size:12px;color:#64748B'}, 'Impl. '+fmt(s.costo_implementacion)+' | Fee '+fmt(s.fee_mensual)+'/mes'));
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
            tbl2.appendChild(tb2); metRow.appendChild(tbl2);
          }


          function renderKPIs(data, col) {
            col.innerHTML = '';
            col.style.display = 'grid';
            col.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
            data.forEach(function(m) {
              var cell = el('div', {style:'padding:12px 16px;text-align:center;border-right:.5px solid #E2E8F0'});
              cell.appendChild(el('div', {style:'font-size:'+(m.big?'20':'16')+'px;font-weight:500;color:'+m.col}, m.val));
              cell.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-top:2px'}, m.label));
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
              renderKPIs([
                {label:'OS este mes', val:String(totOS), col:'#0B9EDA', big:true},
                {label:'Facturado mes', val:totFac>0?fmt(totFac):'$0', col:'#3D8A32', big:true},
                {label:'Negocios activos', val:String(negocios.filter(function(n){ return n.activo; }).length)+'/'+String(negocios.length), col:'#7C3AED'},
                {label:'Ultima actividad', val:ultOrden?fdate(ultOrden):'-', col:'#6366F1'}
              ], metRow);
              // Hint doble click
              var hint = el('div',{style:'font-size:10px;color:#94a3b8;text-align:center;padding:4px;cursor:pointer;border-top:.5px solid #F1F5F9'},'Doble click para ver por negocio');
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
                {label:'Pedidos hoy', val:String(totPH), col:'#0B9EDA', big:true},
                {label:'Facturado hoy', val:totFH>0?fmt(totFH):'$0', col:'#3D8A32', big:true},
                {label:'Empresas activas', val:String(totAct)+'/'+String(empresas.length), col:'#F59E0B'},
                {label:'Ultima actividad', val:ultActC?fdate(ultActC):'-', col:'#6366F1'}
              ], metRow);
              var hintC = el('div',{style:'font-size:10px;color:#94a3b8;text-align:center;padding:4px;cursor:pointer;border-top:.5px solid #F1F5F9'},'Doble click para ver por empresa');
              metRow.appendChild(hintC);
              var detC = false;
              var detCEl2 = null;
              function toggleC() {
                if (detC && detCEl2) { detCEl2.remove(); detCEl2=null; hintC.textContent='Doble click para ver por empresa'; detC=false; return; }
                hintC.textContent='Doble click para ocultar'; detC=true;
                detCEl2 = el('div',{style:'border-top:.5px solid #E2E8F0'});
                metRow.appendChild(detCEl2);
                // Fee review
                var feeSection = el('div',{style:'padding:12px 16px;background:#FFFBEB;border-bottom:.5px solid #FEF3C7'});
                feeSection.appendChild(el('div',{style:'font-size:11px;font-weight:600;color:#854F0B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'},'Revision de fee'));
                var feeLoad = el('div',{style:'font-size:12px;color:#94a3b8'},'Calculando...');
                feeSection.appendChild(feeLoad);
                detCEl2.appendChild(feeSection);
                Promise.all(empresas.filter(function(e){ return e.activo; }).map(function(e){
                  return coneosCall('metricas_empresa',{empresa_id:e.id}).then(function(m){ return {emp:e, disp:m.dispositivos_activos||0, fee:m.fee_mensual||75000}; }).catch(function(){ return {emp:e, disp:0, fee:75000}; });
                })).then(function(results){
                  feeLoad.innerHTML = '';
                  var feeTotal = results.reduce(function(s,r){ return s+r.fee; },0);
                  results.forEach(function(r){
                    var fRow=el('div',{style:'display:flex;justify-content:space-between;padding:4px 0;font-size:13px'});
                    var lft=el('div',{}); lft.appendChild(el('span',{style:'font-weight:500'},r.emp.nombre)); lft.appendChild(el('span',{style:'font-size:11px;color:#94a3b8;margin-left:8px'},r.disp+' disp.'+(r.disp>3?' ⚠':'')));
                    fRow.appendChild(lft); fRow.appendChild(el('span',{style:'font-weight:500;color:'+(r.disp>3?'#854F0B':'#3D8A32')},fmt(r.fee)+'/mes'));
                    feeLoad.appendChild(fRow);
                  });
                  var totRow=el('div',{style:'display:flex;justify-content:space-between;padding-top:8px;margin-top:4px;border-top:.5px solid #FEF3C7;font-weight:700;font-size:14px'});
                  totRow.appendChild(el('span',{},'Total fee mensual')); totRow.appendChild(el('span',{style:'color:#F59E0B'},fmt(feeTotal)+'/mes'));
                  feeLoad.appendChild(totRow);
                });
                var tblC=el('table',{class:'tbl'});
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
                tblC.appendChild(tbC); detCEl2.appendChild(tblC);
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
              renderKPIs([
                {label:'Pedidos este mes', val:String(totOM), col:'#0B9EDA', big:true},
                {label:'Facturado mes', val:totFM>0?fmt(totFM):'$0', col:'#3D8A32', big:true},
                {label:'Talleres activos', val:String(talleres.filter(function(t){ return t.activo; }).length)+'/'+String(talleres.length), col:'#16A34A'},
                {label:'Ultima actividad', val:ultT?fdate(ultT):'-', col:'#6366F1'}
              ], metRow);
              var hintT = el('div',{style:'font-size:10px;color:#94a3b8;text-align:center;padding:4px;cursor:pointer;border-top:.5px solid #F1F5F9'},'Doble click para ver por taller');
              metRow.appendChild(hintT);
              var detT = false;
              var detTEl = null;
              function toggleT() {
                if (detT && detTEl) { detTEl.remove(); detTEl=null; hintT.textContent='Doble click para ver por taller'; detT=false; return; }
                hintT.textContent='Doble click para ocultar'; detT=true;
                detTEl = el('div',{style:'border-top:.5px solid #E2E8F0'});
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
            metRow.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
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
        var footer = el('div', {style:'display:flex;gap:8px;padding:8px 14px 10px'});
        var btnClientes = el('button', {class:'btn btnsm'}, 'Clientes →');
        (function(ss){ btnClientes.onclick = function(e){ e.stopPropagation(); abrirDrawerClientes(ss); }; })(s);
        footer.appendChild(btnClientes);
        // ConeOS: agregar Gestionar empresas en el mismo footer
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
          }
        }
        if (nombreL.indexOf('piamonte') >= 0) {
          var btnPiam = el('button', {class:'btn btnsm', style:'background:#E8855A;border-color:#E8855A;color:#fff'}, 'Gestionar fases');
          btnPiam.onclick = function(){ mFasesElPiamonte(); };
          footer.appendChild(btnPiam);
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
  fetch('https://tviiikkdskucmgcmtswu.supabase.co/functions/v1/metricas-sistema', {
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
  }).then(function(r){ return r.json(); }).then(function(d) {
    if (!d || d.error) throw new Error(d ? d.error : 'sin datos');
    row.innerHTML = '';
    var esStock = s.metrica_tabla === 'stock';
    [
      [d.total_orders, esStock ? 'Productos en stock' : 'Pedidos totales', '#0B9EDA'],
      [d.month_orders, esStock ? 'Ingresados este mes' : 'Este mes', '#5BBD4E'],
      [fmt(d.total_revenue), esStock ? 'Valor del stock' : 'Facturacion', '#EF9F27'],
      [d.last_order ? fdate(d.last_order) : '-', esStock ? 'Ultimo movimiento' : 'Ultima factura', '#7F77DD']
    ].forEach(function(m) {
      var cell = el('div', {style:'padding:10px 14px;text-align:center;border-right:.5px solid #f0f0f0'});
      cell.appendChild(el('div', {style:'font-size:15px;font-weight:700;color:'+m[2]}, String(m[0])));
      cell.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;margin-top:2px'}, m[1]));
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

    if (!D.cls.length) {
      wrap.appendChild(el('div', {class:'card'}, [el('div', {class:'emp'}, 'No hay clientes todavia')]));
    } else {
      D.cls.forEach(function(cl) {
        try {
        var mas = D.asigs.filter(function(a){ return a.cliente_id===cl.id; });
        var cc = el('div', {class:'cc'}); cc.dataset.clienteId = cl.id;
        var ch = el('div', {class:'ch'});
        var nomCl = String(cl.nombre || '?');
        var iniciales = nomCl.split(' ').map(function(x){ return x[0]||''; }).slice(0,2).join('');
        var av = el('div', {class:'av'}, iniciales);
        ch.appendChild(av);
        var info = el('div', {style:'flex:1'});
        var nm = el('div', {style:'font-weight:500;font-size:14px'}, nomCl);
        if (mas.length > 1) nm.appendChild(chipClass(mas.length + ' sistemas', 'cp'));
        info.appendChild(nm);
        var subInfo = [cl.empresa, cl.email, cl.telefono].filter(function(x){ return x && String(x).trim(); }).join(' - ');
        info.appendChild(el('div', {style:'font-size:12px;color:#94a3b8'}, subInfo));
        ch.appendChild(info);
        var btnA = el('button', {class:'btn btnsm'}, '+ Asignar');
        (function(cid, cn){ btnA.onclick = function(){ mAsignar(cid, cn); }; })(cl.id, nomCl);
        ch.appendChild(btnA);
        var btnE = el('button', {class:'btn btnsm', style:'margin-left:4px'}, 'Editar');
        (function(c){ btnE.onclick = function(){ mEditCliente(c); }; })(cl);
        ch.appendChild(btnE);
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
            var SIS_EMOJI = {'Cortelab':'📐','El Piamonte':'🚗','MobixERP':'📱','ConeOS':'🍦'};
            var sisEmoji = SIS_EMOJI[s.nombre];
            if (sisEmoji) left.appendChild(el('span', {style:'font-size:15px;line-height:1'}, sisEmoji));
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
            // Toggle asig
            var tog = el('label', {class:'tog'});
            var inp = el('input', {type:'checkbox'}); if (a.activo) inp.checked = true;
            (function(aid){ inp.onchange = function(){ dbUpd('panel_asignaciones', aid, {activo:this.checked}); }; })(a.id);
            tog.appendChild(inp); tog.appendChild(el('span', {class:'sl'}));
            right.appendChild(tog);
            // Sub entidad
            if (s.tipo !== 'mono_empresa') {
              var btnSub = el('button', {class:'btn btnsm'}, '+Entidad');
              (function(aid, t){ btnSub.onclick = function(){ mSubEntidad(aid, t); }; })(a.id, s.tipo);
              right.appendChild(btnSub);
            }
            // Fases de implementacion
            var btnF = el('button', {class:'btn btnsm'}, 'Fases' + (a._fases.length ? ' (' + a._fases.length + ')' : ''));
            (function(aa, cn, sn){ btnF.onclick = function(){ mFases(aa, cn, sn, function(){ vClientes(); }); }; })(a, cl.nombre, s.nombre||'');
            right.appendChild(btnF);
            // Resumen
            var btnRes = el('button', {class:'btn btnsm'}, 'Resumen');
            (function(aa, cli, sis){ btnRes.onclick = function(){ vResumenCliente(aa, cli, sis); }; })(a, cl, s);
            right.appendChild(btnRes);
            // Editar asig
            var btnEA = el('button', {class:'btn btnsm'}, 'Editar');
            (function(aa){ btnEA.onclick = function(){ mEditAsig(aa); }; })(a);
            right.appendChild(btnEA);
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
    ['todos','pendiente','pagado','vencido','cancelado'].forEach(function(t, i) {
      var tab = el('button', {class:'tab'+(i===0?' on':'')}, t.charAt(0).toUpperCase()+t.slice(1));
      tab.dataset.tab = t;
      tab.onclick = function() { filtrar(t); };
      tabs.appendChild(tab);
    });
    wrap.appendChild(tabs);
    var card = el('div', {class:'card', style:'overflow-x:auto'});
    var tbl = el('table', {class:'tbl', style:'min-width:750px'});
    tbl.appendChild(elH('thead', {}, '<tr><th>Cliente</th><th>Sistema</th><th>Tipo</th><th>Descripcion</th><th>Monto</th><th>Vence</th><th>Estado</th><th></th></tr>'));
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
  var lista = (f==='todos' ? _D.cobs.filter(function(c){ return c.estado!=='pagado'; }) : _D.cobs.filter(function(c){ return c.estado===f; })).slice().sort(function(a,b){ var da=(a.fecha_pago||a.fecha_vencimiento||''); var db=(b.fecha_pago||b.fecha_vencimiento||''); return da<db?1:-1; });
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.toggle('on', t.dataset.tab===f); });
  var tb = ge('ctbody'); if (!tb) return;
  tb.innerHTML = '';
  if (!lista.length) { tb.appendChild(elH('tr', {}, '<td colspan="9" class="emp">Sin registros</td>')); return; }
  lista.forEach(function(c) {
    var tr = el('tr', {});
    tr.appendChild(el('td', {}, c._cli.nombre||'-'));
    var td = el('td', {}); td.appendChild(chip(c._sis.nombre||'-')); tr.appendChild(td);
    var tdTipo = el('td', {});
    tdTipo.appendChild(chipClass(c.tipo_cobro||'fee', 'cgr'));
    if (c.tipo_cobro==='implementacion' && c._fase) tdTipo.appendChild(el('div', {style:'font-size:10px;color:#94a3b8;margin-top:3px'}, 'Fase ' + c._fase.numero + ' — ' + c._fase.nombre));
    tr.appendChild(tdTipo);
    tr.appendChild(el('td', {style:'color:#94a3b8;font-size:12px'}, c.descripcion||'-'));
    tr.appendChild(el('td', {style:'font-weight:500'}, fmt(c.monto)));
    // metodo column removed
    tr.appendChild(el('td', {}, fdate(c.fecha_vencimiento)));
    // Estado select
    var sel = el('select', {class:'fi', style:'width:auto;padding:4px 8px;font-size:11px'});
    ['pendiente','pagado','vencido','cancelado'].forEach(function(e2) {
      var opt = el('option', {value:e2}, e2); if (c.estado===e2) opt.selected = true; sel.appendChild(opt);
    });
    (function(cid){ sel.onchange = function(){ cambiaEstado(cid, this.value); }; })(c.id);
    tr.appendChild(el('td', {}, [sel]));
    var btnE2 = el('button', {class:'btn btnsm'}, 'Editar');
    (function(cob){ btnE2.onclick = function(){ mEditarCobro(cob); }; })(c);
    var btnR = el('button', {class:'btn btnsm'}, 'Recibo');
    (function(cob){ btnR.onclick = function(){ verRecibo(cob); }; })(c);
    var btnDel = el('button', {class:'btn btnsm', style:'background:#FCEBEB;border-color:#FCEBEB;color:#A32D2D'}, 'X');
    (function(cob){ btnDel.onclick = function(){ eliminarCobroObj(cob); }; })(c);
    var tdAcc = el('td', {style:'white-space:nowrap'});
    [btnE2, btnR, btnDel].forEach(function(b, i){ if(i>0) tdAcc.appendChild(document.createTextNode(' ')); tdAcc.appendChild(b); });
    tr.appendChild(tdAcc);
    tb.appendChild(tr);
  });
}
function mEditarCobro(c) {
  openM(makeModal('Editar cobro', function(body) {
    body.appendChild(el('div', {class:'ibox'}, (c._cli.nombre||'-') + ' — ' + (c._sis.nombre||'-')));
    addFg(body, 'Descripcion', mkInput('ec-desc','text',c.descripcion||''));
    mkRow2(body,
      mkFg('Monto ($)', mkInput('ec-monto','number',c.monto||0)),
      mkFg('Metodo', mkSelect('ec-met',[['transferencia','Transferencia'],['efectivo','Efectivo'],['mercadopago','MercadoPago'],['otro','Otro']],c.metodo||'transferencia'))
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
  var d = {cli:c._cli.nombre, sis:c._sis.nombre, desc:c.descripcion, monto:c.monto, met:c.metodo, fecha:c.fecha_pago||c.fecha_vencimiento||'', estado:c.estado, num:c.id.slice(-4), cobro_id:c.id};
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
  mRecibo(d);
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
  openM(makeModal('Nuevo cliente', function(body) {
    addFg(body, 'Nombre', mkInput('fcn','text','','Nombre completo'));
    addFg(body, 'Empresa', mkInput('fce','text',''));
    mkRow2(body, mkFg('Email', mkInput('fcm','email','')), mkFg('Telefono', mkInput('fct','text','')));
    addFg(body, 'Notas', el('textarea', {class:'fi', id:'fcno'}));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      var n = gv('fcn').trim(); if (!n) { alert('Nombre obligatorio'); return; }
      dbIns('panel_clientes', {nombre:n, empresa:gv('fce')||null, email:gv('fcm')||null, telefono:gv('fct')||null, notas:gv('fcno')||null, activo:true})
      .then(function(){ closeM(); vClientes(); });
    };
    foot.appendChild(ok);
  }));
}

function mEditCliente(cl) {
  openM(makeModal('Editar cliente', function(body) {
    addFg(body, 'Nombre', mkInput('ecn','text',cl.nombre));
    addFg(body, 'Empresa', mkInput('ece','text',cl.empresa||''));
    mkRow2(body, mkFg('Email', mkInput('ecm','email',cl.email||'')), mkFg('Telefono', mkInput('ect','text',cl.telefono||'')));
    var ta = el('textarea', {class:'fi', id:'ecno'}); ta.textContent = cl.notas||'';
    addFg(body, 'Notas', ta);
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Guardar');
    ok.onclick = function() {
      dbUpd('panel_clientes', cl.id, {nombre:gv('ecn'), empresa:gv('ece')||null, email:gv('ecm')||null, telefono:gv('ect')||null, notas:gv('ecno')||null})
      .then(function(){ closeM(); vClientes(); });
    };
    foot.appendChild(ok);
  }));
}

// ASIGNAR SISTEMA
function mAsignar(cid, cn) {
  dbGet('panel_sistemas').then(function(sis) {
    if (!sis.length) { alert('Primero crea un sistema.'); return; }
    openM(makeModal('Asignar sistema a ' + cn, function(body) {
      var sel = mkSelect('assis', sis.map(function(s){ return [s.id, s.nombre+' - '+(P_LAB[s.plataforma]||s.plataforma)]; }), sis[0].id);
      sel.onchange = function() { var s = sis.find(function(x){ return x.id===this.value; }, this); if(s){ ge('asimpl').value=s.costo_implementacion||0; ge('asfee').value=s.fee_mensual||0; calcA(); } };
      addFg(body, 'Sistema', sel);
      mkRow2(body, mkFg('Costo total ($)', mkInput('asimpl','number',sis[0].costo_implementacion||0)), mkFg('Fee mensual ($)', mkInput('asfee','number',sis[0].fee_mensual||0)));
      var abox = el('div', {style:'background:#E6F6FD;border-radius:8px;padding:14px;margin-bottom:12px'});
      abox.appendChild(el('div', {style:'font-size:12px;font-weight:500;color:#0C6FA3;margin-bottom:8px'}, 'Anticipo inicial'));
      var r = el('div', {class:'r2'});
      var pctI = mkInput('aspct','number','25'); pctI.min='0'; pctI.max='100'; pctI.oninput = calcA;
      var antI = mkInput('asant','number','0'); antI.oninput = syncA;
      r.appendChild(mkFg('Porcentaje (%)', pctI)); r.appendChild(mkFg('Monto anticipo ($)', antI));
      abox.appendChild(r);
      abox.appendChild(el('div', {id:'assaldo', style:'font-size:11px;color:#64748B;margin-top:6px'}, 'Saldo restante: $0'));
      body.appendChild(abox);
      mkRow2(body, mkFg('Dia de cobro fee', mkInput('asdia','number','1')), mkFg('Fecha inicio', mkInput('asfec','date',new Date().toISOString().slice(0,10))));
      addFg(body, 'Notas', mkInput('asnot','text','','Condiciones especiales...'));
      setTimeout(calcA, 50);
    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button', {class:'btn btnp'}, 'Asignar');
      ok.onclick = function() {
        var impl = Number(gv('asimpl')||0), fee = Number(gv('asfee')||0);
        var dia = Number(gv('asdia')||1), ant = Number(gv('asant')||0), fec = gv('asfec');
        dbIns('panel_asignaciones', {cliente_id:cid, sistema_id:gv('assis'), activo:true,
          precio_acordado:impl, costo_implementacion_acordado:impl, fee_mensual:fee,
          dia_cobro:dia, fecha_inicio:fec, notas:gv('asnot')||null,
          implementacion_en_cuotas:false, implementacion_cant_cuotas:1,
          implementacion_cuota_monto:ant, implementacion_cuotas_pagadas:0})
        .then(function(r) {
          var aid = (r[0]||{}).id;
          var p = Promise.resolve(null);
          if (aid && impl > 0) {
            p = dbIns('panel_implementacion_fases', {asignacion_id:aid, numero:1, nombre:'Fase 1', monto:impl})
              .then(function(fr){ return (fr[0]||{}).id || null; });
          }
          return p.then(function(faseId) {
            if (aid && ant > 0) {
              return dbIns('panel_cobros', {asignacion_id:aid, tipo_cobro:'implementacion', fase_id:faseId,
                descripcion:'Anticipo implementacion (' + (impl>0?Math.round(ant/impl*100):0) + '%)',
                monto:ant, metodo:'transferencia', fecha_vencimiento:fec, estado:'pendiente'});
            }
          });
        }).then(function(){ closeM(); vClientes(); });
      };
      foot.appendChild(ok);
    }));
  });
}
function calcA() {
  var t=Number(gv('asimpl')||0), p=Number(gv('aspct')||25), a=Math.round(t*p/100);
  var ai=ge('asant'); if(ai) ai.value=a;
  var s=ge('assaldo'); if(s) s.textContent='Saldo restante: '+fmt(t-a);
}
function syncA() {
  var t=Number(gv('asimpl')||0), a=Number(gv('asant')||0);
  var pi=ge('aspct'); if(pi&&t>0) pi.value=Math.round(a/t*100);
  var s=ge('assaldo'); if(s) s.textContent='Saldo restante: '+fmt(t-a);
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

    openM(makeModal('Fases de implementacion — ' + cn + ' / ' + sn, function(body) {
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
      addBox.appendChild(el('div', {style:'font-size:12px;font-weight:500;color:#64748B;margin-bottom:8px'}, 'Agregar fase'));
      mkRow2(addBox,
        mkFg('Nombre', mkInput('nf-nom','text','','Ej: Fase 2 — Gestion avanzada')),
        mkFg('Monto ($)', mkInput('nf-monto','number','0'))
      );
      var btnAdd = el('button', {class:'btn btnp', style:'margin-top:6px'}, '+ Agregar');
      btnAdd.onclick = function() {
        var nom = gv('nf-nom').trim(); if (!nom) { alert('Nombre obligatorio'); return; }
        var siguienteNum = fases.length ? Math.max.apply(null, fases.map(function(f){ return f.numero; })) + 1 : 1;
        dbIns('panel_implementacion_fases', {asignacion_id:a.id, numero:siguienteNum, nombre:nom, monto:Number(gv('nf-monto')||0)})
          .then(refrescar);
      };
      addBox.appendChild(btnAdd);
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
  var SIS_EMOJI = {'Cortelab':'📐','El Piamonte':'🚗','MobixERP':'📱','ConeOS':'🍦'};
  sh.appendChild(el('span', {class:'st', style:'margin-left:12px'}, (SIS_EMOJI[s.nombre]||'💻')+' '+cl.nombre+' — '+s.nombre));
  wrap.appendChild(sh);

  // Saldos
  var cobs = (_D.cobs||[]).filter(function(c){ return c.asignacion_id === a.id; });
  var impl = Number(a.costo_implementacion||0) || (a._fases||[]).reduce(function(s,f){ return s+Number(f.monto||0); },0);
  var pagadoImpl = cobs.filter(function(c){ return c.tipo_cobro==='implementacion' && c.estado==='pagado'; }).reduce(function(s,c){ return s+Number(c.monto); },0);
  var saldoImpl = impl - pagadoImpl;
  var fee = Number(a.fee_mensual||0);
  var feesPagados = cobs.filter(function(c){ return c.tipo_cobro==='fee' && c.estado==='pagado'; }).length;
  var feesPendientes = cobs.filter(function(c){ return c.tipo_cobro==='fee' && c.estado!=='pagado'; });

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
      tr.appendChild(el('td', {}, [chipClass(c.estado==='pagado'?'Pagado':'Pendiente', c.estado==='pagado'?'cv':'ca')]));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    histCard.appendChild(tbl);
    var totPag = cobs.filter(function(c){ return c.estado==='pagado'; }).reduce(function(s,c){ return s+Number(c.monto); },0);
    var totPend = cobs.filter(function(c){ return c.estado!=='pagado'; }).reduce(function(s,c){ return s+Number(c.monto); },0);
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
        if (estado==='pagado' && confirm('Generar recibo?')) mRecibo({cli:cl, sis:si, desc:desc, monto:monto, met:met, fecha:fecha, estado:estado, num:(r[0]||{}).id?(r[0].id.slice(-4)):'0001', cobro_id:(r[0]||{}).id});
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
        if (estado==='pagado' && confirm('Generar recibo?')) mRecibo({cli:cl, sis:si, desc:gv('cfd'), monto:mon, met:gv('cfmet'), fecha:fecha, estado:estado, num:(r[0]||{}).id?r[0].id.slice(-4):'0001', cobro_id:(r[0]||{}).id});
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
        if (estado==='pagado' && confirm('Generar recibo?')) mRecibo({cli:cl, sis:si, desc:gv('ced'), monto:mon, met:gv('cemet'), fecha:fecha, estado:estado, num:(r[0]||{}).id?r[0].id.slice(-4):'0001', cobro_id:(r[0]||{}).id});
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
    _D.asigs.forEach(function(a) {
      var op = el('option', {value:a.id}, a._cli.nombre + ' - ' + a._sis.nombre);
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
      dbIns('panel_cobros', {asignacion_id:sel.value, tipo_cobro:tipo, fase_id:faseId, descripcion:gv('rqd'), monto:monto, metodo:gv('rqmet'), fecha_vencimiento:fecha, fecha_pago:estado==='pagado'?fecha:null, estado:estado})
      .then(function(r) {
        closeM();
        if (estado==='pagado' && confirm('Generar recibo?')) mRecibo({cli:cl, sis:si, desc:gv('rqd'), monto:monto, met:gv('rqmet'), fecha:fecha, estado:estado, num:(r[0]||{}).id?r[0].id.slice(-4):'0001', cobro_id:(r[0]||{}).id});
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
      hdrRight.appendChild(el('span', {style:'font-size:12px;color:'+gaugeCol+';font-weight:600'}, pct+'%'));
      hdrRight.appendChild(el('span', {style:'font-size:12px;color:#64748B'}, p.db_size_mb+' MB / '+p.limite_mb+' MB'));
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

  Promise.all([
    sbFetch('panel_cobros?estado=eq.pagado&select=monto,fecha_pago,tipo_cobro,descripcion,asignacion_id&order=fecha_pago.desc').catch(function(){ return []; }),
    sbFetch('panel_gastos?select=*&order=activo.desc,nombre.asc').catch(function(){ return []; }),
    sbFetch('panel_ingresos?select=*&order=fecha.desc').catch(function(){ return []; }),
    sbFetch('panel_sistemas?select=id,nombre').catch(function(){ return []; }),
    sbFetch('panel_clientes?select=id,nombre').catch(function(){ return []; }),
    fetch('https://dolarapi.com/v1/dolares/oficial').then(function(r){ return r.json(); }).catch(function(){ return null; }),
    sbFetch('panel_gastos_pagos?select=*&order=fecha.desc').catch(function(){ return []; }),
    sbFetch('panel_config?select=clave,valor').catch(function(){ return []; }),
    sbFetch('panel_gastos_personales?select=*&order=activo.desc,nombre.asc').catch(function(){ return []; }),
    sbFetch('panel_gastos_personales_pagos?select=*&order=fecha.desc').catch(function(){ return []; }),
    sbFetch('panel_pf_cuotas?select=*&order=activa.desc,inicio_year.asc,inicio_month.asc').catch(function(){ return []; }),
    sbFetch('panel_pf_meses?select=*&order=year.asc,month.asc').catch(function(){ return []; }),
    sbFetch('panel_pf_gastos?select=*&order=fecha.asc').catch(function(){ return []; }),
    sbFetch('panel_pf_ingresos?select=*&order=fecha.asc').catch(function(){ return []; }),
    sbFetch('panel_pf_liquidacion_juan?select=*').catch(function(){ return []; }),
    sbFetch('panel_pf_daiana?select=*').catch(function(){ return []; }),
    sbFetch('panel_pf_deudas?select=*&order=fecha.desc').catch(function(){ return []; }),
    sbFetch('panel_pf_presupuesto?select=*').catch(function(){ return []; }),
    sbFetch('panel_pf_prestamos?select=*&order=activo.desc,fecha.desc').catch(function(){ return []; }),
    sbFetch('panel_pf_prestamos_pagos?select=*&order=fecha.asc').catch(function(){ return []; }),
    sbFetch('panel_pf_auto_registros?select=*&order=kms.desc.nullslast,fecha.desc.nullslast').catch(function(){ return []; }),
    sbFetch('panel_pf_deudas_movimientos?select=*&order=fecha.asc').catch(function(){ return []; }),
    sbFetch('panel_pf_musica?select=*&order=fecha.asc').catch(function(){ return []; })
  ]).then(function(r) {
    var cobros=r[0], gastos=r[1], ingresos=r[2], sistemas=r[3], clientes=r[4];
    var dolarData=r[5], pagoGastos=r[6], config=r[7]||[];
    var gastosPers=r[8]||[], pagoGastosPers=r[9]||[];
    var cuotasPF=r[10]||[];
    var mesesPF=r[11]||[], gastosPF=r[12]||[], ingresosPF=r[13]||[], juanPF=r[14]||[], daianaPF=r[15]||[], deudasPF=r[16]||[], presupuestoPF=r[17]||[];
    var prestamosPF=r[18]||[];
    var prestamosPagosPF=r[19]||[], autoPF=r[20]||[];
    var deudasMovsPF=r[21]||[];
    var musicaPF=r[22]||[];
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
    wrap.appendChild(modoWrap);
    wrap.appendChild(negocioControlsWrap);

    var tabsEl = el('div', {class:'tabs', style:'margin-bottom:20px;flex-wrap:wrap'});
    wrap.appendChild(tabsEl);

    function tabsForModo() {
      return modoFin === 'negocio'
        ? [['resumen','Resumen'],['ingresos','Ingresos'],['gastos','Gastos']]
        : [['resumen-pf','Resumen'],['ingresos-pf','Ingresos'],['gastos-pf','Gastos'],['cuotas','Cuotas'],['prestamos-pf','Prestamos'],['auto-pf','Auto'],['deudas-pf','Deudas'],['asesor-pf','🤖 Asesor']];
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
        else if (tabActual === 'prestamos-pf') renderPrestamosPF();
        else if (tabActual === 'auto-pf') renderAutoPF();
        else if (tabActual === 'asesor-pf') renderAsesorPF();
        else renderDeudasPF();
      }
    }

    function renderResumen(mesesP, ingP, gasP, balP) {
      var hM=hoy.getMonth()+1, hA=hoy.getFullYear();
      var labelP = periodo==='mes' ? MESES_CORTOS[hM-1]+' '+hA
        : periodo==='trimestre' ? 'Q'+Math.ceil(hM/3)+' '+hA
        : 'Año '+hA;

      var mets = el('div', {class:'mets'});
      [
        {label:'Ingresos — '+labelP, val:fmt(ingP), color:'#5BBD4E', sub:'cobros + extras'},
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

    function renderCuotasPF() {
      var sh=el('div',{class:'sh'});
      sh.appendChild(el('span',{class:'st'},'Cuotas y creditos'));
      var btnN=el('button',{class:'btn btnp'},'+ Nueva cuota');
      btnN.onclick=function(){ mNuevaCuotaPF(function(){ vFinanzas(); }); };
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
          if (!gastoMes) { alert('Esta cuota todavia no tiene un gasto generado en '+mesSeleccionadoPF+'. Se genera solo al crear el mes con cuotas activas.'); return; }
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
            inserts.push(dbIns('panel_pf_gastos', {
              mes_id: id, concepto: g.concepto, monto: 0, monto_usd: 0, categoria: g.categoria,
              tipo: g.tipo, fecha: fecha, cuota_id: null, pagado: false
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
      {nombre:'👶 Pedrito', match:function(g){ return g.categoria==='Educación' || g.categoria==='Personal'; }},
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
      GASTO_GRUPOS_PF.forEach(function(grp){ var dG=restG.filter(grp.match); restG=restG.filter(function(g){ return !grp.match(g); }); var tot=dG.reduce(function(s,g){ return s+Number(g.monto||0); },0); if(tot>0) colGas.appendChild(cruceRow(grp.nombre,fmt(tot),'#A32D2D')); });
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
        // DS pendiente: descontar transferencias internas
        var transI2 = ingresosPF.filter(function(i){ return i.mes_id===m.id && i.categoria==='Transferencia interna'; }).reduce(function(s,i){ return s+Number(i.monto); },0);
        var dsPend2 = tt.juanDS - transI2;
        var dsPendAbs2 = Math.round(Math.abs(dsPend2)*100)/100;
        if (transI2 > 0 || tt.juanDS > 0) {
          var dsLine2 = el('div',{style:'margin-top:6px;padding-top:6px;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B'});
          dsLine2.appendChild(el('span',{},'Transferido: '+fmt(transI2)));
          if (dsPendAbs2 > 0) {
            dsLine2.appendChild(el('span',{},' · '));
            dsLine2.appendChild(el('span',{style:'font-weight:700;color:'+(dsPend2>0?'#3D8A32':'#E53E3E')},fmt(dsPend2)+(dsPend2>0?' a cobrar':' a favor empresa')));
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
      btnN.onclick=function(){ mNuevoIngresoPF(m.id, function(nuevo){ ingresosPF.push(nuevo); renderAll(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      var card=el('div',{class:'card',style:'overflow-x:auto'});
      var tbl=el('table',{class:'tbl'});
      tbl.appendChild(elH('thead',{},'<tr><th>Concepto</th><th>Categoria</th><th>Monto</th><th></th></tr>'));
      var tb=el('tbody',{});

      var trN = el('tr',{style:'background:#F8FAFC'});
      trN.appendChild(el('td',{style:'font-weight:500'},'🏢 QP C&IA (cobrado real del negocio)'));
      trN.appendChild(el('td',{},[chipClass('Negocio','cb')]));
      trN.appendChild(el('td',{style:'font-weight:500;color:#0B9EDA'},'$'+Math.round(cobradoReal).toLocaleString('es-AR')));
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
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Guardar');
        ok.onclick = function() {
          var conc = gv('nipf-conc').trim(); if (!conc) { alert('Concepto obligatorio'); return; }
          dbIns('panel_pf_ingresos', {mes_id:mesId, concepto:conc, categoria:gv('nipf-cat'), monto:Number(gv('nipf-monto')||0), fecha:gv('nipf-fecha')||null})
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
      var gMes = gastosPF.filter(function(g){ return g.mes_id===mesId; });
      var restantes = gMes.slice();
      var out = {};
      GASTO_GRUPOS_PF.forEach(function(grupo) {
        var deEsteGrupo = restantes.filter(grupo.match);
        restantes = restantes.filter(function(g){ return !grupo.match(g); });
        out[grupo.nombre] = deEsteGrupo.reduce(function(s,g){ return s+Number(g.monto||0); }, 0);
      });
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
      content.appendChild(resCard);

      // Evolucion por modulo (ultimos 6 meses), con flecha de avance/retroceso vs mes anterior
      var idxMesEv = mesesPF.findIndex(function(mm){ return mm.id===m.id; });
      var ultimosMesesEv = mesesPF.slice(Math.max(0, idxMesEv-5), idxMesEv+1);
      if (ultimosMesesEv.length > 1) {
        var totalesPorMes = ultimosMesesEv.map(function(mm){ return {mes:mm, tot:totalesModulosPF(mm.id)}; });
        var evCard = el('div',{class:'card',style:'padding:16px;margin-bottom:14px'});
        evCard.appendChild(el('div',{class:'st',style:'margin-bottom:12px'},'Evolucion por modulo (ultimos '+ultimosMesesEv.length+' meses)'));
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
          var barsRow = el('div',{style:'display:flex;gap:4px;align-items:flex-end;height:28px'});
          serie.forEach(function(v, idx) {
            var h = Math.max(2, Math.round(v/maxV*28));
            var esUltimo = idx === serie.length-1;
            var bar = el('div',{style:'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:28px'});
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
      btnN.onclick=function(){ mNuevoGastoPF(m, function(nuevo){ gastosPF.push(nuevo); renderAll(); }); };
      sh.appendChild(btnN);
      content.appendChild(sh);

      if (!gMes.length) { content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'Sin gastos este mes')])); return; }

      function tablaGastosPF(lista) {
        var card=el('div',{class:'card',style:'overflow-x:auto'});
        var tbl=el('table',{class:'tbl'});
        tbl.appendChild(elH('thead',{},'<tr><th>Concepto</th><th>Categoria</th><th>Tipo</th><th>Monto</th><th>Pagado</th><th></th></tr>'));
        var tb=el('tbody',{});
        lista.sort(function(a,b){ return Number(b.monto)-Number(a.monto); }).forEach(function(g){
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
          var tog=el('label',{class:'tog'});
          var inp=el('input',{type:'checkbox'}); if (g.pagado) inp.checked=true;
          (function(gg){ inp.onchange=function(){ var checked=this.checked; dbUpd('panel_pf_gastos',gg.id,{pagado:checked}).then(function(){ gg.pagado=checked; }); }; })(g);
          tog.appendChild(inp); tog.appendChild(el('span',{class:'sl'}));
          tr.appendChild(el('td',{},[tog]));
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
          tr.appendChild(el('td',{style:'white-space:nowrap'},[btnE,btnD]));
          tb.appendChild(tr);
        });
        tbl.appendChild(tb); card.appendChild(tbl);
        return card;
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
          mkFg('Categoria', mkSelect('ngpf-cat', PF_BUDGET_CATS.concat(['Créditos','Personal','Ajuste']).map(function(c){return [c,c];}), 'Varios')),
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
          mkFg('Categoria', mkSelect('egpf-cat', PF_BUDGET_CATS.concat(['Créditos','Personal','Ajuste']).map(function(c){return [c,c];}), g.categoria||'Varios')),
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
        var btnPago = el('button',{class:'btn btns btnsm'},'+ Registrar pago');
        btnPago.onclick = function(){ mPagoPrestamoPF(p, function(nuevoPago, nuevoGasto){
          prestamosPagosPF.push(nuevoPago);
          if (nuevoGasto) gastosPF.push(nuevoGasto);
          if (saldo - Number(nuevoPago.monto) <= 0.01) { p.activo = false; dbUpd('panel_pf_prestamos', p.id, {activo:false}); }
          renderAll();
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
      openM(makeModal('Registrar pago — '+p.nombre, function(body) {
        body.appendChild(el('div',{class:'ibox'}, 'Saldo actual: '+fmtMon(saldo,p.moneda)));
        mkRow2(body, mkFg('Monto del pago', mkInput('pgp-monto','number',saldo)), mkFg('Fecha', mkInput('pgp-fecha','date',new Date().toISOString().slice(0,10))));
        if (p.moneda!=='USD') {
          addFg(body, 'Mes (para que cuente como gasto de ese mes)', mkSelect('pgp-mes', mesesPF.map(function(mm){ return [mm.id, MESES[mm.month-1]+' '+mm.year]; }), mesSeleccionadoPF));
        } else {
          body.appendChild(el('div',{style:'font-size:11px;color:#94a3b8;margin-top:4px'},'En USD: este pago no se suma a los gastos en pesos del mes, solo descuenta del saldo del prestamo.'));
        }
        addFg(body, 'Notas', mkInput('pgp-notas','text',''));
      }, function(foot) {
        foot.appendChild(cancelBtn());
        var ok = el('button', {class:'btn btnp'}, 'Registrar');
        ok.onclick = function() {
          var monto = Number(gv('pgp-monto')||0); if (monto<=0) { alert('Monto invalido'); return; }
          var fecha = gv('pgp-fecha')||null, notas = gv('pgp-notas')||null;
          if (p.moneda!=='USD') {
            var mesId = gv('pgp-mes');
            dbIns('panel_pf_gastos', {mes_id:mesId, concepto:p.nombre, monto:monto, categoria:'Créditos', tipo:'varios', fecha:fecha, prestamo_id:p.id, pagado:true})
              .then(function(rg) {
                var gastoRow = (rg&&rg[0])||null;
                return dbIns('panel_pf_prestamos_pagos', {prestamo_id:p.id, monto:monto, fecha:fecha, cuenta_para_saldo:true, notas:notas, gasto_id:gastoRow?gastoRow.id:null})
                  .then(function(rp){ closeM(); cb((rp&&rp[0])||null, gastoRow); });
              });
          } else {
            dbIns('panel_pf_prestamos_pagos', {prestamo_id:p.id, monto:monto, fecha:fecha, cuenta_para_saldo:true, notas:notas})
              .then(function(rp){ closeM(); cb((rp&&rp[0])||null, null); });
          }
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
          row.appendChild(el('div',{style:'font-weight:600'}, fmtMon(pg.monto,p.moneda)));
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

    function renderAsesorPF() {
      var m=getMesPF(mesSeleccionadoPF);
      if(!m){ content.appendChild(el('div',{class:'card'},[el('div',{class:'emp'},'No hay mes seleccionado')])); return; }
      content.appendChild(el('div',{class:'sh',style:'margin-bottom:16px'},[el('span',{class:'st'},'🤖 Asesor — '+MESES[m.month-1]+' '+m.year)]));
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
      if(bal>=0) sug.push({emoji:'✅',titulo:'Balance positivo',detalle:'Cerrás el mes con '+fmt(bal)+' de superávit. Tus gastos son el '+pct+'% de tus ingresos.'});
      else sug.push({emoji:'🔴',titulo:'Déficit este mes',detalle:'Gastos superan ingresos por '+fmt(Math.abs(bal))+'. Los gastos son el '+pct+'% de tus ingresos.'});
      if(dsP>500) sug.push({emoji:'💰',titulo:'DS pendiente',detalle:'Tenés '+fmt(dsP)+' que la empresa todavía te debe.'});
      else if(dsP<0) sug.push({emoji:'🏢',titulo:'DS saldado',detalle:'Ya cobraste todo. Te adelantaron '+fmt(Math.abs(dsP))+'.'});
      cuotasTerm.forEach(function(c){ var num=numeroCuotaPF(c,m.year,m.month); var q=c.total_cuotas-num; sug.push({emoji:'🎉',titulo:'Cuota por terminar: '+c.nombre,detalle:(q===0?'Última cuota.':c.nombre+' termina en '+q+' cuota'+(q!==1?'s':'')+' más.')+' Liberás '+fmt(Number(c.monto))+'/mes.'}); });
      var gMax=null,gMaxV=0,rG=gastosPF.filter(function(g){ return g.mes_id===m.id; }).slice();
      GASTO_GRUPOS_PF.forEach(function(grp){ var dG=rG.filter(grp.match); rG=rG.filter(function(g){ return !grp.match(g); }); var tot=dG.reduce(function(s,g){ return s+Number(g.monto||0); },0); if(tot>gMaxV){ gMaxV=tot; gMax=grp.nombre; } });
      if(gMax&&gMaxV>0){ var pG=totalGas>0?Math.round(gMaxV/totalGas*100):0; sug.push({emoji:'📊',titulo:'Mayor gasto: '+gMax,detalle:gMax+' representa el '+pG+'% de tus gastos con '+fmt(gMaxV)+'.'}); }
      if(cuotasA.length>0) sug.push({emoji:'📋',titulo:cuotasA.length+' cuotas activas',detalle:'Tenés '+cuotasA.length+' cuotas corriendo en paralelo.'});
      if(deudaP>0) sug.push({emoji:'👤',titulo:'Deuda pendiente a cobrar',detalle:'Tenés '+fmt(deudaP)+' en deudas pendientes.'});
      sug.forEach(function(s){ var row=el('div',{style:'display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:.5px solid #F1F5F9'}); var ico=el('div',{style:'font-size:28px;flex-shrink:0;width:40px;text-align:center'},s.emoji); var bod=el('div',{style:'flex:1'}); bod.appendChild(el('div',{style:'font-weight:600;font-size:14px;color:#1a2e4a;margin-bottom:4px'},s.titulo)); bod.appendChild(el('div',{style:'font-size:13px;color:#64748B;line-height:1.5'},s.detalle)); row.appendChild(ico); row.appendChild(bod); card.appendChild(row); });
      if(!sug.length) card.appendChild(el('div',{class:'emp'},'Sin datos suficientes.'));
      content.appendChild(card);
    }

    renderAll();
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
      }).then(function(){ closeM(); cb(); });
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

function registrarPagoGasto(g, cb) {
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
        dbIns('panel_gastos_pagos', {
          gasto_id: g.id, fecha: gv('rp-fecha'),
          monto: monto, moneda: moneda,
          tipo_cambio: tc, monto_ars: montoARS,
          notas: gv('rp-notas')||null
        }),
        dbUpd('panel_gastos', g.id, {fecha_proximo_pago: nuevaFecha})
      ]).then(function(){ closeM(); cb(); });
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

function registrarPagoGastoPersonal(g, cb) {
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
        dbIns('panel_gastos_personales_pagos', {
          gasto_id: g.id, fecha: gv('rpp-fecha'),
          monto: monto, moneda: moneda,
          tipo_cambio: tc, monto_ars: montoARS,
          notas: gv('rpp-notas')||null
        }),
        dbUpd('panel_gastos_personales', g.id, {fecha_proximo_pago: nuevaFecha})
      ]).then(function(){ closeM(); cb(); });
    };
    foot.appendChild(ok);
  }));
}


// ── EL PIAMONTE — CONTROL DE FASES ───────────────────────────────────────────
var PIAMONTE_URL = 'https://hjzhatercccblhgaukgx.supabase.co';
var PIAMONTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqemhhdGVyY2NjYmxoZ2F1a2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQwMjMsImV4cCI6MjA5NjMyMDAyM30.XYoxEnhkvxIB0pAPAT6H3-mn70uxLzwNYqJQIjoKc3o';

function mFasesElPiamonte() {
  fetch(PIAMONTE_URL + '/rest/v1/config_sistema?select=fase_habilitada&id=eq.1', {
    headers: { 'apikey': PIAMONTE_KEY, 'Authorization': 'Bearer ' + PIAMONTE_KEY }
  }).then(function(r){ return r.json(); }).then(function(data) {
    var faseActual = (data && data[0]) ? Number(data[0].fase_habilitada) : 1;
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
  shF.appendChild(el('span',{class:'st',style:'margin-left:12px'},'🚗 El Piamonte — Control de fases'));
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
            fetch(PIAMONTE_URL + '/rest/v1/config_sistema?id=eq.1', {
              method: 'PATCH',
              headers: {
                'apikey': PIAMONTE_KEY, 'Authorization': 'Bearer ' + PIAMONTE_KEY,
                'Content-Type': 'application/json', 'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ fase_habilitada: num })
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
  return fetch(SB_URL + '/functions/v1/coneos-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SB_KEY },
    body: JSON.stringify({ action: action, payload: payload || {} })
  }).then(function(r) { return r.json(); });
}

function vConeos() {
  var wrap = el('div', {});
  var sh = el('div', { class: 'sh' });
  var btnSisCone = el('button', { class: 'btn' }, '← Sistemas');
  btnSisCone.onclick = function() { go('sistemas'); };
  sh.appendChild(btnSisCone);
  sh.appendChild(el('span', { class: 'st' }, '🍦 ConeOS — Superadmin'));
  var btnNew = el('button', { class: 'btn btnp' }, '+ Nueva empresa');
  btnNew.onclick = function() { mNuevaEmpresaConeos(function() { vConeos(); }); };
  sh.appendChild(btnNew);
  wrap.appendChild(sh);

  var loadCard = el('div', { class: 'card' });
  var loadDiv = el('div', { class: 'emp' }, 'Cargando empresas...');
  loadCard.appendChild(loadDiv);
  wrap.appendChild(loadCard);
  setApp(wrap);

  coneosCall('estado_general').then(function(empresas) {
    if (!Array.isArray(empresas)) { loadDiv.textContent = 'Error al cargar empresas'; return; }
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
      tdN.appendChild(el('div', { style: 'font-weight:500' }, emp.nombre));
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
  sh.appendChild(el('span', { class: 'st', style: 'margin-left:12px' }, '🍦 ' + emp.nombre));
  var btnEdit = el('button', { class: 'btn' }, 'Editar');
  btnEdit.onclick = function() { mEditarEmpresaConeos(emp, function(empAct) { vConeosEmpresa(empAct); }); };
  sh.appendChild(btnEdit);
  var btnMod = el('button', { class: 'btn', style:'background:#6366F1;border-color:#6366F1;color:#fff' }, 'Módulos');
  btnMod.onclick = function() { mModulosConeOS(emp); };
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

  coneosCall('metricas_empresa', { empresa_id: emp.id }).then(function(d) {
    metLoad.innerHTML = '';
    var dispActivos = d.dispositivos_activos||0;
    emp._dispActivos = dispActivos;
    var feeActual = calcFeeConeos(dispActivos, emp.slug);
    var dispAlert = dispActivos > 3;

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
      alBox.appendChild(el('span', {style:'font-size:13px;color:#854F0B'}, '⚠ '+dispActivos+' dispositivos activos — el fee base cubre hasta 3'));
      var btnCobrar = el('button', {class:'btn btnsm', style:'background:#F59E0B;border-color:#F59E0B;color:#fff'}, 'Registrar fee');
      btnCobrar.onclick = function() { mRegistrarFeeConeOS(emp, feeActual, d); };
      alBox.appendChild(btnCobrar);
      metLoad.appendChild(alBox);
    } else {
      var btnCobrarN = el('button', {class:'btn btnsm', style:'margin-top:10px'}, 'Registrar fee mensual');
      btnCobrarN.onclick = function() { mRegistrarFeeConeOS(emp, feeActual, d); };
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
        tr.appendChild(el('td', {}, [btnReset]));
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

  setApp(wrap);
}

function mRegistrarFeeConeOS(emp, fee, metricas) {
  // Buscar asignacion de ConeOS en panel_cobros
  openM(makeModal('Registrar fee — '+emp.nombre, function(body) {
    var info = el('div', {style:'background:#F8FAFC;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#64748B'});
    info.appendChild(el('div', {}, '🍦 Empresa: '+el('b',{},emp.nombre).outerHTML));
    info.appendChild(el('div', {}, '📱 Dispositivos: '+(metricas.dispositivos_activos||0)));
    info.appendChild(el('div', {}, '💰 Fee calculado: '+fmt(fee)));
    body.appendChild(info);
    mkRow2(body, mkFg('Monto ($)', mkInput('crf-monto','number',fee)), mkFg('Período', mkInput('crf-periodo','text', new Date().toISOString().slice(0,7).replace('-','/'))));
    addFg(body, 'Comentario / N° transferencia', mkInput('crf-nota','text','','Ej: Transferencia 00123456'));
    addFg(body, 'Fecha de pago', mkInput('crf-fecha','date', new Date().toISOString().slice(0,10)));
  }, function(foot) {
    foot.appendChild(cancelBtn());
    var ok = el('button', {class:'btn btnp'}, 'Registrar cobro');
    ok.onclick = function() {
      var monto = Number(gv('crf-monto')||0);
      var nota = gv('crf-nota')||'';
      var fecha = gv('crf-fecha')||new Date().toISOString().slice(0,10);
      var periodo = gv('crf-periodo')||'';
      if (!monto) { alert('Ingresá el monto'); return; }
      ok.textContent = 'Guardando...'; ok.disabled = true;
      // Registrar en panel_cobros como cobro de tipo fee
      // Primero buscar asignacion de ConeOS
      sbFetch('panel_asignaciones?select=id&sistema_id=in.('+
        'select id from panel_sistemas where nombre=ilike.*ConeOS*'+')'
      ).catch(function(){ return []; }).then(function() {
        // Registrar directamente como ingreso manual en finanzas negocio
        dbIns('panel_ingresos', {
          descripcion: 'Fee ConeOS — '+emp.nombre+' ('+periodo+')'+(nota?' | '+nota:''),
          monto: monto,
          fecha: fecha,
          tipo: 'cobro',
          categoria: 'Negocio'
        }).then(function() {
          closeM();
          alert('Fee registrado correctamente');
        }).catch(function(e) {
          ok.textContent = 'Registrar cobro'; ok.disabled = false;
          alert('Error: '+e.message);
        });
      });
    };
    foot.appendChild(ok);
  }));
}

function calcFeeConeos(dispActivos, slug) {
  if (slug === 'cecchetto-lucia') return 75000;
  if (dispActivos <= 3) return 75000;
  return 75000 + (dispActivos - 3) * 25000;
}

function calcImplConeos(modulos) {
  var base = 500000;
  var extra = 0;
  if (modulos.delivery)    extra += 150000;
  if (modulos.facturacion) extra += 100000;
  if (modulos.mercadopago) extra += 100000;
  return base + extra;
}

function mModulosConeOS(emp) {
  coneosCall('get_modulos', { empresa_id: emp.id }).then(function(modulos) {
    var MODULOS = [
      { key: 'kiosk',       label: 'Kiosk',        desc: 'Pantalla táctil para clientes — pedidos en mostrador', color: '#0B9EDA', base: true },
      { key: 'caja',        label: 'Caja',          desc: 'Gestión de pagos, cobros y arqueo de caja',           color: '#3D8A32', base: true },
      { key: 'preparacion', label: 'Preparación',   desc: 'Pantalla de preparación para el equipo interno',      color: '#7C3AED', base: true },
      { key: 'display',     label: 'Display',        desc: 'Pantalla pública con menú y precios',                color: '#F59E0B', base: true },
      { key: 'delivery',    label: 'Delivery',       desc: 'Pedidos a domicilio — impl. +$150.000',              color: '#E53E3E', base: false, impl: 150000 },
      { key: 'facturacion', label: 'Facturación',    desc: 'Emisión de facturas electrónicas — impl. +$100.000', color: '#0891B2', base: false, impl: 100000 },
      { key: 'mercadopago', label: 'MercadoPago',    desc: 'Cobros con MercadoPago integrado — impl. +$100.000', color: '#009EE3', base: false, impl: 100000 },
    ];

    openM(makeModal('🍦 '+emp.nombre+' — Módulos', function(body) {

      // Info banner
      var info = el('div', {style:'background:#EEF2FF;border:.5px solid #6366F1;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#4338CA'});
      info.appendChild(el('b', {}, 'Control de módulos activos.'));
      info.appendChild(document.createTextNode(' Los cambios se aplican al guardar.'));
      body.appendChild(info);

      // Resumen de precios (dinámico)
      var resBox = el('div', {style:'background:#F8FAFC;border:.5px solid #E2E8F0;border-radius:10px;padding:12px 16px;margin-bottom:14px'});
      var resTitle = el('div', {style:'font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'}, 'Precio calculado');
      resBox.appendChild(resTitle);
      var resImpl = el('div', {style:'display:flex;justify-content:space-between;font-size:13px;padding:3px 0'});
      resImpl.appendChild(el('span', {style:'color:#64748B'}, 'Implementación'));
      var resImplVal = el('span', {style:'font-weight:600;color:#1a2e4a'});
      resImpl.appendChild(resImplVal);
      resBox.appendChild(resImpl);
      var resFee = el('div', {style:'display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-top:.5px solid #F1F5F9;margin-top:4px'});
      resFee.appendChild(el('span', {style:'color:#64748B'}, 'Fee mensual'));
      var resFeeVal = el('span', {style:'font-weight:600;color:#F59E0B'});
      resFee.appendChild(resFeeVal);
      resBox.appendChild(resFee);
      body.appendChild(resBox);

      function actualizarResumen() {
        var mod = {};
        MODULOS.forEach(function(m) {
          var inp = document.getElementById('mod-'+m.key);
          mod[m.key] = inp ? inp.checked : false;
        });
        resImplVal.textContent = fmt(calcImplConeos(mod));
        // fee: usamos dispActivos del contexto si está disponible, sino 1
        var disp = emp._dispActivos || 1;
        resFeeVal.textContent = fmt(calcFeeConeos(disp, emp.slug)) + '/mes';
      }

      // Módulos base (siempre activos, no toggleables)
      var baseWrap = el('div', {style:'margin-bottom:6px'});
      baseWrap.appendChild(el('div', {style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px'}, 'Módulos base — incluidos ($500.000)'));
      MODULOS.filter(function(m){ return m.base; }).forEach(function(m) {
        var row = el('div', {style:'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:.5px solid #F1F5F9'});
        var dot = el('div', {style:'width:8px;height:8px;border-radius:50%;background:'+m.color+';flex-shrink:0'});
        row.appendChild(dot);
        row.appendChild(el('span', {style:'font-size:13px;color:#1a2e4a;flex:1'}, m.label));
        row.appendChild(el('span', {style:'font-size:11px;color:#5BBD4E;font-weight:600'}, '✓ Incluido'));
        var inp = el('input', {type:'checkbox', id:'mod-'+m.key, style:'display:none'});
        inp.checked = true;
        row.appendChild(inp);
        baseWrap.appendChild(row);
      });
      body.appendChild(baseWrap);

      // Módulos extra (toggleables)
      var extraWrap = el('div', {style:'margin-top:10px'});
      extraWrap.appendChild(el('div', {style:'font-size:11px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px'}, 'Módulos adicionales'));
      MODULOS.filter(function(m){ return !m.base; }).forEach(function(m) {
        var activo = !!modulos[m.key];
        var card = el('div', {style:'border:.5px solid '+(activo?m.color:'#E2E8F0')+';border-radius:10px;padding:11px 14px;margin-bottom:8px;background:'+(activo?'#FAFBFF':'#FAFAFA');transition:'border .15s'});
        var row = el('div', {style:'display:flex;align-items:center;gap:10px'});
        var dot = el('div', {style:'width:10px;height:10px;border-radius:50%;flex-shrink:0;background:'+m.color});
        row.appendChild(dot);
        var titWrap = el('div', {style:'flex:1'});
        titWrap.appendChild(el('div', {style:'font-weight:600;font-size:13px;color:#1a2e4a'}, m.label));
        titWrap.appendChild(el('div', {style:'font-size:11px;color:#64748B;margin-top:2px'}, m.desc));
        row.appendChild(titWrap);
        var tog = el('label', {class:'tog'});
        var inp = el('input', {type:'checkbox', id:'mod-'+m.key});
        if (activo) inp.checked = true;
        inp.addEventListener('change', function() {
          card.style.border = '.5px solid '+(inp.checked ? m.color : '#E2E8F0');
          actualizarResumen();
        });
        tog.appendChild(inp); tog.appendChild(el('span', {class:'sl'}));
        row.appendChild(tog);
        card.appendChild(row);
        extraWrap.appendChild(card);
      });
      body.appendChild(extraWrap);

      actualizarResumen();

    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button', {class:'btn btnp'}, 'Guardar módulos');
      ok.onclick = function() {
        var nuevosModulos = {};
        MODULOS.forEach(function(m){
          var inp = document.getElementById('mod-'+m.key);
          nuevosModulos[m.key] = inp ? inp.checked : false;
        });
        ok.textContent = 'Guardando...'; ok.disabled = true;
        coneosCall('actualizar_modulos', { empresa_id: emp.id, modulos: nuevosModulos }).then(function(r) {
          if (r.error) { alert('Error: '+r.error); ok.textContent = 'Guardar módulos'; ok.disabled = false; return; }
          closeM();
        }).catch(function(){ ok.textContent = 'Guardar módulos'; ok.disabled = false; });
      };
      foot.appendChild(ok);
    }));
  }).catch(function(e){ alert('Error al cargar módulos: '+e.message); });
}

function mEditarEmpresaConeos(emp, cb) {
  // Cargar módulos para calcular precio de referencia
  coneosCall('get_modulos', { empresa_id: emp.id }).then(function(modulos) {
    var implCalc = calcImplConeos(modulos);
    var feeCalc  = calcFeeConeos(emp._dispActivos || 1, emp.slug);

    openM(makeModal('Editar: ' + emp.nombre, function(body) {
      addFg(body, 'Nombre', mkInput('ee-nombre', 'text', emp.nombre||''));
      addFg(body, 'Slug',   mkInput('ee-slug',   'text', emp.slug||''));

      // Referencia calculada por módulos
      var refBox = el('div', {style:'background:#F0F9FF;border:.5px solid #BAE6FD;border-radius:8px;padding:10px 14px;margin-bottom:14px'});
      refBox.appendChild(el('div', {style:'font-size:11px;font-weight:600;color:#0369A1;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px'}, '💡 Precio calculado por módulos'));
      var refRow1 = el('div', {style:'display:flex;justify-content:space-between;font-size:12px;padding:2px 0'});
      refRow1.appendChild(el('span', {style:'color:#64748B'}, 'Implementación sugerida'));
      refRow1.appendChild(el('span', {style:'font-weight:600;color:#1a2e4a'}, fmt(implCalc)));
      refBox.appendChild(refRow1);
      var refRow2 = el('div', {style:'display:flex;justify-content:space-between;font-size:12px;padding:2px 0'});
      refRow2.appendChild(el('span', {style:'color:#64748B'}, 'Fee sugerido'));
      refRow2.appendChild(el('span', {style:'font-weight:600;color:#F59E0B'}, fmt(feeCalc)+'/mes'));
      refBox.appendChild(refRow2);
      var refHint = el('div', {style:'font-size:11px;color:#0369A1;margin-top:6px;border-top:.5px solid #BAE6FD;padding-top:6px'});
      refHint.appendChild(document.createTextNode('Podés ajustar manualmente si acordaste otro precio con el cliente.'));
      refBox.appendChild(refHint);
      body.appendChild(refBox);

      // Campos editables con valor precargado (calculado o el que ya tenía)
      var implVal = emp.costo_implementacion || implCalc;
      var feeVal  = emp.fee_mensual || feeCalc;
      mkRow2(body,
        mkFg('Implementación ($)', mkInput('ee-impl', 'number', implVal)),
        mkFg('Fee mensual ($)',    mkInput('ee-fee',  'number', feeVal))
      );

      // Botón para resetear al calculado
      var resetBtn = el('button', {class:'btn btnsm', style:'margin-bottom:14px;font-size:11px;color:#0369A1;border-color:#BAE6FD'}, '↺ Usar precio calculado');
      resetBtn.onclick = function() {
        document.getElementById('ee-impl').value = implCalc;
        document.getElementById('ee-fee').value  = feeCalc;
      };
      body.appendChild(resetBtn);

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
      foot.appendChild(cancelBtn());
      var ok = el('button', { class: 'btn btnp' }, 'Guardar');
      ok.onclick = function() {
        var datos = {
          nombre: gv('ee-nombre'),
          slug:   gv('ee-slug'),
          activo: document.getElementById('ee-activo').checked,
          costo_implementacion: Number(gv('ee-impl')||0),
          fee_mensual: Number(gv('ee-fee')||75000)
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
  }).catch(function() {
    // Si falla la carga de módulos, abre el modal igual sin referencia
    openM(makeModal('Editar: ' + emp.nombre, function(body) {
      addFg(body, 'Nombre', mkInput('ee-nombre', 'text', emp.nombre||''));
      addFg(body, 'Slug',   mkInput('ee-slug',   'text', emp.slug||''));
      mkRow2(body,
        mkFg('Implementación ($)', mkInput('ee-impl', 'number', emp.costo_implementacion||500000)),
        mkFg('Fee mensual ($)',    mkInput('ee-fee',  'number', emp.fee_mensual||75000))
      );
      mkRow2(body,
        mkFg('Color primario',   mkInput('ee-color1', 'color', emp.primary_color||'#6366F1')),
        mkFg('Color secundario', mkInput('ee-color2', 'color', emp.secondary_color||'#4F46E5'))
      );
      var togWrap = el('div', {style:'display:flex;align-items:center;gap:8px;margin-top:8px'});
      var togLbl = el('label', {class:'tog'});
      var togInp = el('input', {type:'checkbox', id:'ee-activo'}); if(emp.activo) togInp.checked=true;
      togLbl.appendChild(togInp); togLbl.appendChild(el('span',{class:'sl'}));
      togWrap.appendChild(togLbl);
      togWrap.appendChild(el('span',{style:'font-size:13px;color:#64748B'},'Activo'));
      body.appendChild(togWrap);
    }, function(foot) {
      foot.appendChild(cancelBtn());
      var ok = el('button', { class: 'btn btnp' }, 'Guardar');
      ok.onclick = function() {
        var datos = {
          nombre: gv('ee-nombre'),
          slug:   gv('ee-slug'),
          activo: document.getElementById('ee-activo').checked,
          costo_implementacion: Number(gv('ee-impl')||0),
          fee_mensual: Number(gv('ee-fee')||75000)
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
  });
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

go('dash');