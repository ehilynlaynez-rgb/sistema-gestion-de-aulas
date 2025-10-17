/* script.js — Sistema de Gestión de Aulas v4 (localStorage, modales, toasts) */

/* ---------- Keys & Utils ---------- */
const STORAGE_KEY = 'sistema_aulas_v4';
const SESSION_KEY = 'sistema_aulas_session_v4';

function uid(pref='id'){ return pref + '_' + Date.now() + '_' + Math.floor(Math.random()*9999); }
function nowISO(){ return new Date().toISOString(); }

function toast(msg, opts={duration:4000}) {
  const wrap = document.getElementById('toastWrap');
  if(!wrap) { alert(msg); return; }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=> { el.style.opacity = '0'; el.style.transform = 'translateY(12px)'; }, opts.duration - 400);
  setTimeout(()=> el.remove(), opts.duration);
}

/* ---------- Default state & palette ---------- */
function vividPalette(){
  return [
    '#ff6b6b','#f94f8b','#ff9f43','#ffd60a','#ffbe0b',
    '#8bd3dd','#4cc9f0','#4361ee','#8338ec','#9b5de5',
    '#00b894','#00cec9','#74b9ff','#a29bfe','#f78166',
    '#ffadad','#ffd6a5','#fdffb6','#caffbf','#9bf6ff',
    '#bdb2ff','#ffc6ff','#bde0fe','#a0e7e5','#ffb4a2',
    '#ffc6ff','#caffbf','#f9f871','#ffd6e0','#e0bbff'
  ];
}

function defaultState(){
  const colors = vividPalette();
  const aulas = [];
  let idx = 0;
  for(let m=1;m<=5;m++){
    for(let a=1;a<=6;a++){
      const id = `M${m}A${a}`;
      const color = colors[idx++ % colors.length];
      aulas.push({
        id,
        module:m,
        number:a,
        name:`Aula ${(m-1)*6 + a}`,
        color,
        ocupada:false,
        ocupadaPor:null,
        curso:null,
        recursos: [
          { id: uid('r'), nombre:'Computadora', cantidad:6, origenAula:id, danado:false, fotos:[], colorOrigin: color },
          { id: uid('r'), nombre:'Mouse', cantidad:6, origenAula:id, danado:false, fotos:[], colorOrigin: color },
          { id: uid('r'), nombre:'Teclado', cantidad:6, origenAula:id, danado:false, fotos:[], colorOrigin: color }
        ],
        reservas: []
      });
    }
  }
  return {
    aulas,
    users: [
      { username:'admin', pass:'admin', role:'admin' },
      { username:'tecnico', pass:'tecnico', role:'tecnico' },
      { username:'profesor', pass:'profesor', role:'profesor' }
    ],
    borrows: [],
    logs: [],
    settings: { theme: 'light' }
  };
}

function loadState(){ const raw = localStorage.getItem(STORAGE_KEY); if(!raw){ const s = defaultState(); saveState(s); return s; } try{ return JSON.parse(raw); } catch(e){ const s=defaultState(); saveState(s); return s; } }
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

/* ---------- Session helpers ---------- */
function setSession(u){ localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function getSession(){ const r = localStorage.getItem(SESSION_KEY); return r?JSON.parse(r):null; }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

/* Ensure initial */
if(!localStorage.getItem(STORAGE_KEY)) saveState(defaultState());

/* ---------- Router ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const path = window.location.pathname.split('/').pop().toLowerCase();
  if(path === '' || path === 'index.html') initLogin();
  if(path === 'dashboard.html') initDashboard();
  if(path === 'aula.html') initAula();
});

/* ================= LOGIN / REGISTER ================= */
function initLogin(){
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const demoBtn = document.getElementById('demoBtn');

  loginBtn && loginBtn.addEventListener('click', ()=>{
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const role = document.getElementById('loginRole').value;
    if(!user || !pass){ toast('Completa usuario y contraseña'); return; }
    const st = loadState();
    const found = st.users.find(u=> u.username === user && u.pass === pass);
    if(found){ setSession(found); toast('Bienvenido '+found.username); setTimeout(()=> window.location.href='dashboard.html', 400); return; }
    toast('Credenciales no encontradas. Regístrate o usa demo.');
  });

  registerBtn && registerBtn.addEventListener('click', ()=>{
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const role = document.getElementById('loginRole').value;
    if(!user || !pass){ toast('Completa usuario y contraseña'); return; }
    const st = loadState();
    if(st.users.find(u=>u.username===user)){ toast('Usuario ya existe'); return; }
    const nu = { username: user, pass, role };
    st.users.push(nu);
    st.logs.push({ id: uid('log'), ts: nowISO(), text: `Usuario registrado: ${user} (${role})` });
    saveState(st);
    setSession(nu);
    toast('Registro exitoso. Bienvenido '+user);
    setTimeout(()=> window.location.href='dashboard.html', 600);
  });

  demoBtn && demoBtn.addEventListener('click', ()=>{
    const st = loadState();
    const demo = st.users.find(u=>u.username==='admin');
    setSession(demo);
    toast('Demo iniciada como admin');
    setTimeout(()=> window.location.href='dashboard.html', 300);
  });
}

/* ================= DASHBOARD ================= */
function initDashboard(){
  const session = getSession();
  if(!session){ window.location.href='index.html'; return; }

  const badge = document.getElementById('badgeUser');
  const modulesContainer = document.getElementById('modulesContainer');
  const liveSummary = document.getElementById('liveSummary');
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterOccupancy');
  const historyList = document.getElementById('historyList');
  const manageBtn = document.getElementById('manageBtn');
  const themeToggle = document.getElementById('themeToggle');
  const logoutBtn = document.getElementById('logoutBtn');

  badge.textContent = `${session.username} • ${session.role}`;
  if(session.role !== 'admin') manageBtn.style.display = 'none';

  // theme initial
  const st0 = loadState();
  document.body.classList.toggle('dark-mode', st0.settings.theme === 'dark');
  themeToggle.textContent = st0.settings.theme === 'dark' ? '☀️ Light' : '🌙 Dark';
  themeToggle.addEventListener('click', ()=>{
    const s = loadState();
    s.settings.theme = s.settings.theme === 'light' ? 'dark' : 'light';
    saveState(s);
    document.body.classList.toggle('dark-mode', s.settings.theme === 'dark');
    themeToggle.textContent = s.settings.theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    toast(`Modo ${s.settings.theme} activado`);
  });

  logoutBtn.addEventListener('click', ()=> { clearSession(); window.location.href='index.html'; });

  function render(){
    const state = loadState();
    modulesContainer.innerHTML = '';
    // summary
    const total = state.aulas.length;
    const occupied = state.aulas.filter(a=>a.ocupada).length;
    const recCount = state.aulas.reduce((p,c)=>p + c.recursos.length, 0);
    liveSummary.innerHTML = `<div class="card">Aulas: <strong>${total}</strong></div><div class="card">Ocupadas: <strong>${occupied}</strong></div><div class="card">Recursos: <strong>${recCount}</strong></div>`;

    // logs preview
    if(historyList) historyList.innerHTML = state.logs.slice().reverse().slice(0,30).map(l=>`<li>${new Date(l.ts).toLocaleString()} — ${l.text}</li>`).join('');

    for(let m=1;m<=5;m++){
      const row = document.createElement('div'); row.className='module-row';
      const title = document.createElement('div'); title.className='module-box'; title.innerHTML = `<strong>Módulo ${m}</strong>`;
      const grid = document.createElement('div'); grid.className='aulas-grid';

      const q = (searchInput.value||'').toLowerCase();
      const filter = filterSelect.value;

      state.aulas.filter(a=>a.module===m).forEach(aula=>{
        const matches = !q || aula.id.toLowerCase().includes(q) || aula.name.toLowerCase().includes(q) || aula.recursos.some(r=>r.nombre.toLowerCase().includes(q));
        if(!matches) return;
        if(filter === 'occupied' && !aula.ocupada) return;
        if(filter === 'free' && aula.ocupada) return;

        const box = document.createElement('div');
        box.className = 'aula-box';
        if(aula.ocupada) box.classList.add('aula-occupied');
        box.style.background = aula.color;
        box.innerHTML = `<div class="aula-header"><div><div class="aula-id">${aula.id}</div><div class="aula-meta">${aula.name}</div></div><div class="aula-meta">${aula.ocupada ? `Ocupada por ${aula.ocupadaPor} (${aula.curso||'—'})` : 'Libre'}</div></div>
          <div style="font-size:12px;color:rgba(0,0,0,0.6)">${aula.recursos.slice(0,3).map(r=>r.nombre).join(', ')}${aula.recursos.length>3?'...':''}</div>`;
        box.addEventListener('click', ()=> {
          localStorage.setItem('selectedAula', aula.id);
          window.location.href = 'aula.html';
        });
        grid.appendChild(box);
      });

      row.appendChild(title); row.appendChild(grid);
      modulesContainer.appendChild(row);
    }
  }

  // manage
  manageBtn.addEventListener('click', ()=> {
    const session = getSession();
    if(!session || session.role !== 'admin'){ toast('Solo administradores'); return; }
    const action = prompt('Acción: crear / editar / eliminar (cancel = salir)').toLowerCase();
    if(!action) return;
    const state = loadState();
    if(action === 'crear'){
      const name = prompt('Nombre nueva aula (ej. Aula 31)');
      if(!name) return;
      const id = uid('A');
      const color = vividPalette()[Math.floor(Math.random()*20)];
      state.aulas.push({ id, module:6, number: state.aulas.length+1, name, color, ocupada:false, ocupadaPor:null, curso:null, recursos:[], reservas:[] });
      state.logs.push({ id: uid('log'), ts: nowISO(), text: `Aula creada: ${id} (${name}) por ${session.username}` });
      saveState(state); toast('Aula creada');
      render();
    } else if(action === 'eliminar'){
      const id = prompt('ID aula a eliminar (ej. M1A1)');
      if(!id) return;
      const idx = state.aulas.findIndex(a=>a.id===id);
      if(idx>=0){ state.aulas.splice(idx,1); state.logs.push({id:uid('log'), ts:nowISO(), text:`Aula eliminada: ${id} por ${session.username}`}); saveState(state); toast('Aula eliminada'); render(); } else toast('No encontrada');
    } else if(action === 'editar'){
      const id = prompt('ID aula a editar');
      if(!id) return;
      const aula = state.aulas.find(a=>a.id===id);
      if(!aula) return toast('No encontrada');
      const name = prompt('Nuevo nombre', aula.name);
      if(name) aula.name = name;
      const color = prompt('Nuevo color hex (ej. #ff0000) o dejar vacío', aula.color);
      if(color) aula.color = color;
      state.logs.push({id:uid('log'), ts:nowISO(), text:`Aula editada: ${id} por ${session.username}`});
      saveState(state); render(); toast('Aula editada');
    }
  });

  searchInput.addEventListener('input', render);
  filterSelect.addEventListener('change', render);

  // Live check
  function liveCheck(){
    const state = loadState();
    const now = new Date();
    state.aulas.forEach(a=>{
      const occ = a.reservas.find(r => new Date(r.startISO) <= now && new Date(r.endISO) > now);
      if(occ){
        if(!a.ocupada){ a.ocupada = true; a.ocupadaPor = occ.user; a.curso = occ.course; state.logs.push({id:uid('log'), ts:nowISO(), text:`Aula ${a.id} ahora ocupada por ${occ.user} (${occ.course})`}); }
      } else {
        if(a.ocupada){
          const still = a.reservas.find(r => new Date(r.startISO) <= now && new Date(r.endISO) > now);
          if(!still){ a.ocupada = false; a.ocupadaPor = null; a.curso = null; state.logs.push({id:uid('log'), ts:nowISO(), text:`Aula ${a.id} liberada (tiempo)`}); }
        }
      }
    });

    // borrow due notifications
    state.borrows.forEach(b=>{
      if(!b.returned && new Date(b.dueAtISO) <= now && !b.notified){
        toast(`Recordatorio: devolver ${b.recursoNombre} a ${b.fromAula} (tomado por ${b.usuario})`);
        b.notified = true;
        state.logs.push({id:uid('log'), ts:nowISO(), text:`Recordatorio devolución: ${b.recursoNombre} por ${b.usuario}`});
      }
    });

    saveState(state);
    render();
  }

  render();
  liveCheck();
  setInterval(liveCheck, 10_000);
}

/* ================= AULA PAGE ================= */
function initAula(){
  const session = getSession();
  if(!session){ window.location.href='index.html'; return; }
  const aulaId = localStorage.getItem('selectedAula');
  if(!aulaId){ toast('Aula no seleccionada'); window.location.href='dashboard.html'; return; }

  // DOM refs
  const backBtn = document.getElementById('backBtn');
  const aulaTitle = document.getElementById('aulaTitle');
  const aulaSubtitle = document.getElementById('aulaSubtitle');
  const resourcesGrid = document.getElementById('resourcesGrid');
  const reserveBtn = document.getElementById('reserveBtn');
  const endReserveBtn = document.getElementById('endReserveBtn');
  const addResourceBtn = document.getElementById('addResourceBtn');
  const newResourceName = document.getElementById('newResourceName');
  const newResourceQty = document.getElementById('newResourceQty');
  const reportDamageBtn = document.getElementById('reportDamageBtn');
  const damageDesc = document.getElementById('damageDesc');
  const damageFile = document.getElementById('damageFile');
  const borrowList = document.getElementById('borrowList');
  const aulaHistory = document.getElementById('aulaHistory');

  const reserveModal = document.getElementById('reserveModal');
  const modalCourse = document.getElementById('modalCourse');
  const modalStart = document.getElementById('modalStart');
  const modalEnd = document.getElementById('modalEnd');
  const modalReserveSave = document.getElementById('modalReserveSave');
  const modalReserveCancel = document.getElementById('modalReserveCancel');

  const moveModal = document.getElementById('moveModal');
  const moveResourceName = document.getElementById('moveResourceName');
  const moveQty = document.getElementById('moveQty');
  const moveToSelect = document.getElementById('moveToSelect');
  const modalMoveSave = document.getElementById('modalMoveSave');
  const modalMoveCancel = document.getElementById('modalMoveCancel');

  backBtn.addEventListener('click', ()=> window.location.href='dashboard.html');

  function st(){ return loadState(); }
  function save(s){ saveState(s); }

  function render(){
    const s = st();
    const aula = s.aulas.find(x=>x.id===aulaId);
    if(!aula){ toast('Aula no encontrada'); window.location.href='dashboard.html'; return; }
    aulaTitle.textContent = `${aula.id} — ${aula.name}`;
    aulaSubtitle.textContent = `Módulo ${aula.module}`;
    document.querySelector('header .topbar')?.style && (document.querySelector('header .topbar').style.background = aula.color);

    if(aula.ocupada){ reserveBtn.classList.add('hidden'); endReserveBtn.classList.remove('hidden'); } else { reserveBtn.classList.remove('hidden'); endReserveBtn.classList.add('hidden'); }

    // resources
    resourcesGrid.innerHTML = '';
    aula.recursos.forEach(r=>{
      const card = document.createElement('div');
      card.className = 'resource-card';
      card.style.background = r.colorOrigin || aula.color;
      card.innerHTML = `<div style="font-weight:700">${r.nombre} ${r.danado? '🚨 Dañado':''}</div>
        <div class="muted small">Cantidad: ${r.cantidad} • Origen: ${r.origenAula}</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-outline" data-move="${r.id}">Mover</button>
          <button class="btn btn-ghost" data-photos="${r.id}">Fotos (${(r.fotos||[]).length})</button>
          <button class="btn btn-outline" data-report="${r.id}">Reportar</button>
          ${ (session.role === 'tecnico' && r.danado) ? `<button class="btn btn-primary" data-repair="${r.id}">Marcar reparado</button>` : '' }
        </div>`;
      resourcesGrid.appendChild(card);

      card.querySelector('[data-report]')?.addEventListener('click', ()=> reportResource(r.id));
      card.querySelector('[data-move]')?.addEventListener('click', ()=> openMoveModal(r.id));
      card.querySelector('[data-photos]')?.addEventListener('click', ()=> viewPhotos(r.id));
      card.querySelector('[data-repair]')?.addEventListener('click', (e)=> {
        const rid = e.currentTarget.getAttribute('data-repair');
        markRepaired(rid);
      });
    });

    // borrows
    borrowList.innerHTML = '';
    const borrows = s.borrows.filter(b => b.fromAula === aulaId || b.toAula === aulaId);
    borrows.forEach(b=>{
      const div = document.createElement('div');
      div.style = 'padding:8px;border-radius:8px;background:rgba(0,0,0,0.03);margin-bottom:6px';
      div.innerHTML = `${b.recursoNombre} — ${b.usuario} → ${b.toAula} (desde ${b.fromAula}) ${b.returned? '✅ Devuelto':'⏳ Pendiente'}`;
      if(!b.returned && b.toAula === aulaId && b.usuario === session.username){
        const btn = document.createElement('button'); btn.className='btn btn-primary'; btn.textContent='Marcar devuelto';
        btn.addEventListener('click', ()=> {
          const s2 = st();
          const bor = s2.borrows.find(x=>x.id===b.id);
          bor.returned = true;
          s2.logs.push({ id: uid('log'), ts: nowISO(), text: `Devuelto ${bor.recursoNombre} por ${bor.usuario} a ${bor.fromAula}` });
          save(s2); toast('Devolución registrada'); render();
        });
        div.appendChild(btn);
      }
      borrowList.appendChild(div);
    });

    // history
    aulaHistory.innerHTML = s.logs.filter(l=> l.text.includes(aulaId)).slice().reverse().map(l=>`<li>${new Date(l.ts).toLocaleString()} — ${l.text}</li>`).join('');
  }

  /* ----- Reserve modal ----- */
  reserveBtn.addEventListener('click', ()=>{
    modalCourse.value=''; modalStart.value=''; modalEnd.value='';
    reserveModal.classList.remove('hidden');
  });
  modalReserveCancel.addEventListener('click', ()=> reserveModal.classList.add('hidden'));
  modalReserveSave.addEventListener('click', ()=>{
    const course = modalCourse.value.trim();
    const start = modalStart.value;
    const end = modalEnd.value;
    if(!course || !end){ toast('Curso y fecha fin requeridos'); return; }
    const s = st(); const aula = s.aulas.find(x=>x.id===aulaId);
    const startISO = start ? new Date(start).toISOString() : new Date().toISOString();
    const endISO = new Date(end).toISOString();
    if(new Date(startISO) >= new Date(endISO)){ toast('Fin debe ser posterior al inicio'); return; }
    // conflict
    const conflict = aula.reservas.some(r => !(new Date(endISO) <= new Date(r.startISO) || new Date(startISO) >= new Date(r.endISO)));
    if(conflict){ toast('Existe conflicto de horario'); return; }
    const reservation = { id: uid('res'), user: session.username, course, startISO, endISO, createdAt: nowISO() };
    aula.reservas.push(reservation);
    // mark occupied if now in range
    const now = new Date();
    if(new Date(startISO) <= now && new Date(endISO) > now){ aula.ocupada = true; aula.ocupadaPor = session.username; aula.curso = course; }
    s.logs.push({ id: uid('log'), ts: nowISO(), text: `Reserva: ${aula.id} por ${session.username} para ${course} hasta ${new Date(endISO).toLocaleString()}` });
    save(s); toast('Reserva registrada'); reserveModal.classList.add('hidden'); render();
  });

  /* ----- End reservation ----- */
  endReserveBtn.addEventListener('click', ()=>{
    const s = st(); const aula = s.aulas.find(x=>x.id===aulaId);
    const now = new Date();
    const idx = aula.reservas.findIndex(r => new Date(r.startISO) <= now && new Date(r.endISO) > now && r.user === session.username);
    if(idx < 0){ toast('No tienes una reserva activa aquí'); return; }
    const removed = aula.reservas.splice(idx,1)[0];
    aula.ocupada = false; aula.ocupadaPor = null; aula.curso = null;
    s.logs.push({ id: uid('log'), ts: nowISO(), text: `Reserva finalizada: ${aula.id} por ${session.username}` });
    // notify borrows linked to this reservation
    s.borrows.filter(b=> b.reservaId === removed.id && !b.returned).forEach(b=>{
      toast(`Recuerda devolver ${b.recursoNombre} a ${b.fromAula}`);
      s.logs.push({ id: uid('log'), ts: nowISO(), text: `Recordatorio devolución: ${b.recursoNombre} por ${b.usuario}` });
    });
    save(s); render();
  });

  /* ----- Add resource ----- */
  addResourceBtn.addEventListener('click', ()=>{
    const name = newResourceName.value.trim();
    const qty = parseInt(newResourceQty.value) || 1;
    if(!name) return toast('Nombre recurso vacío');
    const s = st(); const aula = s.aulas.find(x=>x.id===aulaId);
    const existing = aula.recursos.find(r=> r.nombre.toLowerCase()===name.toLowerCase() && r.origenAula===aulaId);
    if(existing){ existing.cantidad += qty; }
    else {
      aula.recursos.push({ id: uid('r'), nombre: name, cantidad: qty, origenAula: aulaId, danado: false, fotos: [], colorOrigin: aula.color });
    }
    s.logs.push({ id: uid('log'), ts: nowISO(), text: `Recurso ${name} (+${qty}) agregado en ${aula.id} por ${session.username}` });
    save(s); newResourceName.value=''; newResourceQty.value='1'; toast('Recurso agregado'); render();
  });

  /* ----- Report individual resource ----- */
  function reportResource(recursoId){
    const desc = prompt('Descripción del daño:');
    if(!desc) return;
    const s = st(); const aula = s.aulas.find(x=>x.id===aulaId);
    const r = aula.recursos.find(x=>x.id===recursoId);
    if(!r) return toast('Recurso no encontrado');
    const fileInput = document.getElementById('damageFile');
    if(fileInput && fileInput.files && fileInput.files[0]){
      const reader = new FileReader();
      reader.onload = ev => {
        r.fotos = r.fotos || [];
        r.fotos.push(ev.target.result);
        r.danado = true;
        s.logs.push({ id: uid('log'), ts: nowISO(), text: `Reporte: ${r.nombre} dañado en ${aula.id} por ${session.username} — ${desc}` });
        save(s); toast('Reporte con foto guardado'); render();
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      r.danado = true;
      r.fotos = r.fotos || [];
      s.logs.push({ id: uid('log'), ts: nowISO(), text: `Reporte: ${r.nombre} dañado en ${aula.id} por ${session.username} — ${desc}` });
      save(s); toast('Reporte guardado'); render();
    }
  }

  /* ----- Report general ----- */
  reportDamageBtn.addEventListener('click', ()=>{
    const desc = damageDesc.value.trim();
    if(!desc) return toast('Agrega descripción');
    const fin = damageFile.files && damageFile.files[0];
    const s = st(); const aula = s.aulas.find(x=>x.id===aulaId);
    if(fin){
      const reader = new FileReader();
      reader.onload = ev => {
        s.logs.push({ id: uid('log'), ts: nowISO(), text: `Reporte general en ${aula.id} por ${session.username}: ${desc}` });
        s.logs.push({ id: uid('log'), ts: nowISO(), text: `[FOTO] ${ev.target.result.slice(0,80)}...` });
        save(s); toast('Reporte con foto registrado'); damageDesc.value=''; damageFile.value=''; render();
      };
      reader.readAsDataURL(fin);
    } else {
      s.logs.push({ id: uid('log'), ts: nowISO(), text: `Reporte general en ${aula.id} por ${session.username}: ${desc}` });
      save(s); toast('Reporte registrado'); damageDesc.value=''; render();
    }
  });

  /* ----- Move resource (modal) ----- */
  let currentMove = null;
  function openMoveModal(recursoId){
    const s = st(); const aula = s.aulas.find(x=>x.id===aulaId);
    const r = aula.recursos.find(x=>x.id===recursoId);
    if(!r) return toast('Recurso no encontrado');
    currentMove = { recursoId: recursoId, nombre: r.nombre, available: r.cantidad };
    moveResourceName.value = r.nombre;
    moveQty.value = '1';
    // populate select with other aulas
    moveToSelect.innerHTML = s.aulas.filter(a=> a.id !== aulaId).map(a=>`<option value="${a.id}">${a.id} — ${a.name}</option>`).join('');
    moveModal.classList.remove('hidden');
  }
  modalMoveCancel.addEventListener('click', ()=> { moveModal.classList.add('hidden'); currentMove = null; });
  modalMoveSave.addEventListener('click', ()=>{
    const qty = parseInt(moveQty.value) || 1;
    const destId = moveToSelect.value;
    if(!currentMove || !destId) return toast('Completa datos');
    const s = st(); const fromAula = s.aulas.find(x=>x.id===aulaId); const dest = s.aulas.find(x=>x.id===destId);
    const r = fromAula.recursos.find(x=>x.id===currentMove.recursoId);
    if(!r) return toast('Recurso no encontrado');
    if(qty <=0 || qty > r.cantidad) return toast('Cantidad inválida');
    // adjust origin counts
    if(r.cantidad > qty) r.cantidad -= qty;
    else { fromAula.recursos = fromAula.recursos.filter(x=>x.id!==r.id); }
    // add to dest preserving originAula & colorOrigin
    const moved = { id: uid('r'), nombre: r.nombre, cantidad: qty, origenAula: r.origenAula, danado: r.danado, fotos: r.fotos? [...r.fotos] : [], colorOrigin: r.colorOrigin || fromAula.color };
    dest.recursos.push(moved);
    // create borrow record (link to active reservation of user if any)
    const now = new Date();
    const res = fromAula.reservas.find(rv => new Date(rv.startISO) <= now && new Date(rv.endISO) > now && rv.user === session.username);
    const dueAt = res ? res.endISO : new Date(Date.now() + 2*60*60*1000).toISOString();
    const borrow = { id: uid('b'), recursoId: moved.id, recursoName: moved.nombre, fromAula: fromAula.id, toAula: dest.id, usuario: session.username, reservaId: res ? res.id : null, pickedAtISO: now.toISOString(), dueAtISO: dueAt, returned:false, colorOrigin: moved.colorOrigin };
    s.borrows.push(borrow);
    s.logs.push({ id: uid('log'), ts: nowISO(), text: `Movimiento: ${moved.nombre} de ${fromAula.id} a ${dest.id} por ${session.username}` });
    save(s);
    toast('Movimiento registrado; recuerda devolver al finalizar tu reserva');
    moveModal.classList.add('hidden'); currentMove = null; render();
  });

  /* ----- View photos ----- */
  function viewPhotos(recursoId){
    const s = st(); const aula = s.aulas.find(x=>x.id===aulaId);
    const r = aula.recursos.find(x=>x.id===recursoId);
    if(!r || !r.fotos || r.fotos.length===0) return toast('No hay fotos');
    const w = window.open('','_blank','width=800,height=600');
    w.document.write(`<h2>Fotos — ${r.nombre}</h2>` + r.fotos.map(f=>`<div style="margin:10px"><img src="${f}" style="max-width:300px;border-radius:8px"/></div>`).join(''));
  }

  /* ----- Mark repaired (technician only) ----- */
  function markRepaired(recursoId){
    const s = st();
    if(session.role !== 'tecnico' && session.role !== 'admin'){ toast('Solo técnicos o admins pueden marcar reparado'); return; }
    s.aulas.forEach(a=>{
      const rr = a.recursos.find(x=>x.id===recursoId);
      if(rr){ rr.danado = false; s.logs.push({ id: uid('log'), ts: nowISO(), text: `Reparado ${rr.nombre} en ${a.id} por ${session.username}` }); }
    });
    save(s); toast('Marcado como reparado'); render();
  }

  render();
}
