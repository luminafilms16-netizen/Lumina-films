/* ═══════════════════════════════════════════════════════════════
   LUMINA FILMS — Global JS v3
═══════════════════════════════════════════════════════════════ */
const API = '/api';

const Auth = {
  getToken() { return localStorage.getItem('lf_token'); },
  getUser()  { return JSON.parse(localStorage.getItem('lf_user') || 'null'); },
  isLogged() { return !!this.getToken(); },
  isAdmin()  { return this.getUser()?.rol === 'admin'; },
  save(token, user) {
    localStorage.setItem('lf_token', token);
    localStorage.setItem('lf_user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
    window.location.href = '/pages/login.html';
  }
};

async function http(method, endpoint, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${Auth.getToken()}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.message || 'Error'), { status: res.status, data });
  return data;
}
const get  = (ep, auth = false)       => http('GET',    ep, null, auth);
const post = (ep, body, auth = false)  => http('POST',   ep, body, auth);
const put  = (ep, body, auth = false)  => http('PUT',    ep, body, auth);
const del  = (ep, auth = false)        => http('DELETE', ep, null, auth);

function toast(msg, type = 'info', duration = 3500) {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const icons = { success: '✓', error: '✕', info: '◆' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 350); }, duration);
}

function showLoader() { document.getElementById('loader')?.classList.add('active'); }
function hideLoader() { document.getElementById('loader')?.classList.remove('active'); }

/* ── SVG Logo ── */
function getLuminaLogo(size = 28) {
  // Cinematic film-reel / projector lens logo
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;display:block">
    <defs>
      <radialGradient id="lg1" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#f0cc6e"/>
        <stop offset="100%" stop-color="#b8872a"/>
      </radialGradient>
      <radialGradient id="lg2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#1a1400"/>
        <stop offset="100%" stop-color="#0a0a0a"/>
      </radialGradient>
    </defs>
    <!-- Outer ring -->
    <circle cx="22" cy="22" r="21" fill="url(#lg2)" stroke="url(#lg1)" stroke-width="1.5"/>
    <!-- Film sprocket holes (top + bottom strip) -->
    <rect x="4" y="5" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <rect x="12" y="5" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <rect x="20" y="5" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <rect x="28" y="5" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <rect x="36" y="5" width="5" height="4" rx="1" fill="#d4a843" opacity="0.35"/>
    <rect x="4" y="35" width="5" height="4" rx="1" fill="#d4a843" opacity="0.35"/>
    <rect x="12" y="35" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <rect x="20" y="35" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <rect x="28" y="35" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <rect x="36" y="35" width="5" height="4" rx="1" fill="#d4a843" opacity="0.7"/>
    <!-- Lens glow ring -->
    <circle cx="22" cy="22" r="11" fill="none" stroke="#d4a843" stroke-width="1" opacity="0.3"/>
    <!-- Lens body -->
    <circle cx="22" cy="22" r="8.5" fill="url(#lg1)" opacity="0.92"/>
    <!-- Inner lens reflection -->
    <circle cx="22" cy="22" r="5.5" fill="#0a0800" opacity="0.85"/>
    <circle cx="19.5" cy="19.5" r="1.5" fill="#fff" opacity="0.18"/>
    <!-- Play triangle (cinema projector beam) -->
    <polygon points="19.5,18.5 19.5,25.5 26,22" fill="#d4a843" opacity="0.9"/>
  </svg>`;
}

/* ── SVG Icons for sidebar ── */
function getSbIcon(name) {
  const icons = {
    grid:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zm0 10h8v8H3zm10-10h8v8h-8zm0 10h8v8h-8z"/></svg>`,
    film:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>`,
    clock:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
    check:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    users:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
    home:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
    logout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
    lock:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`,
    edit:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
    ticket: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.11 0-1.99.89-1.99 2v4c1.11 0 1.99.89 1.99 2s-.88 2-2 2v4c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2v-4c-1.11 0-2-.89-2-2s.89-2 2-2zm-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.8-2.77-1.99-3.46L4 6h16v2.54z"/></svg>`,
  };
  return icons[name] || '';
}

/* ── Admin Sidebar (shared component) ── */
function renderAdminSidebar(activePage = '') {
  const user = Auth.getUser();
  const initials = user ? user.nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'A';
  const firstName = user ? user.nombre.split(' ')[0] : 'Admin';

  const sections = [
    { label: 'Principal',    items: [
      { id:'dashboard', href:'/pages/admin/dashboard.html', icon:'grid',  label:'Dashboard' },
    ]},
    { label: 'Contenido',   items: [
      { id:'peliculas', href:'/pages/admin/peliculas.html',  icon:'film',  label:'Películas' },
      { id:'funciones', href:'/pages/admin/funciones.html',  icon:'clock', label:'Funciones' },
    ]},
    { label: 'Operaciones', items: [
      { id:'validar',   href:'/pages/admin/validar.html',    icon:'check', label:'Validar Tiquetes' },
      { id:'usuarios',  href:'/pages/admin/usuarios.html',   icon:'users', label:'Usuarios' },
    ]},
    { label: 'Sitio',       items: [
      { id:'sitio',     href:'/',                             icon:'home',  label:'Ver sitio' },
      { id:'salir',     href:'#',                            icon:'logout',label:'Cerrar sesión', onclick:'Auth.logout()' },
    ]},
  ];

  let navHtml = '';
  sections.forEach(sec => {
    navHtml += `<div class="sb-section">${sec.label}</div>`;
    sec.items.forEach(item => {
      const isActive = activePage === item.id;
      const onclick  = item.onclick ? ` onclick="${item.onclick}"` : '';
      navHtml += `<a href="${item.href}" class="sb-link${isActive?' active':''}"${onclick}>
        <span class="sb-icon">${getSbIcon(item.icon)}</span>${item.label}
      </a>`;
    });
  });

  const sidebarEl = document.querySelector('.admin-sidebar');
  if (!sidebarEl) return;

  sidebarEl.innerHTML = `
    <div class="sb-brand">
      <a href="/" class="sb-brand-logo" style="display:flex;align-items:center;gap:10px;text-decoration:none">
        ${getLuminaLogo(30)}
        <span style="font-family:var(--font-display);font-size:1.25rem;color:var(--cream);font-style:italic">
          <em>Lumina</em> <span style="color:var(--ember)">Films</span>
        </span>
      </a>
      <div class="sb-brand-sub">Sistema de Gestión</div>
      <div class="sb-admin-badge" style="display:inline-flex;align-items:center;gap:5px">
        ${getSbIcon('lock')} Admin Panel
      </div>
    </div>
    <nav class="sb-nav">${navHtml}</nav>
    <div class="sb-user">
      <div class="sb-avatar">${initials}</div>
      <div>
        <div class="sb-uname">${firstName}</div>
        <div class="sb-urole">Administrador</div>
      </div>
    </div>
  `;
}

/* ── Navbar ── */
function renderNavbar(activePage = '') {
  const user    = Auth.getUser();
  const isAdmin = user?.rol === 'admin';
  const links   = [
    { href:'/',                     label:'Inicio',    page:'home' },
    { href:'/pages/cartelera.html', label:'Cartelera', page:'cartelera' },
    ...(!isAdmin && user ? [{ href:'/pages/mis-tiquetes.html', label:'Mis Tiquetes', page:'tiquetes' }] : []),
    ...(isAdmin ? [{ href:'/pages/admin/dashboard.html', label:'Panel Admin', page:'admin' }] : []),
  ];

  const logoHtml = `<a href="/" class="nav-logo" style="display:flex;align-items:center;gap:10px;text-decoration:none">
    ${getLuminaLogo(26)}
    <span>
      <span class="nav-logo-main"><em>Lumina</em> <span>Films</span></span>
      <span class="nav-logo-sub">Cinema Experience</span>
    </span>
  </a>`;

  const html = `
  <nav class="navbar" id="navbar">
    <div class="container">
      ${logoHtml}
      <ul class="nav-links">
        ${links.map(l=>`<li><a href="${l.href}" class="${activePage===l.page?'active':''}">${l.label}</a></li>`).join('')}
      </ul>
      <div class="nav-actions">
        ${user
          ? `<div class="user-chip">
               <div class="user-avatar">${user.nombre[0].toUpperCase()}</div>
               <span class="user-name">${user.nombre.split(' ')[0]}</span>
             </div>
             <button class="btn btn-ghost btn-sm" onclick="Auth.logout()">Salir</button>`
          : `<a href="/pages/login.html" class="btn btn-ghost btn-sm">Iniciar sesión</a>
             <a href="/pages/registro.html" class="btn btn-primary btn-sm">Registro</a>`
        }
      </div>
    </div>
  </nav>`;
  document.body.insertAdjacentHTML('afterbegin', html);
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', ()=>navbar.classList.toggle('scrolled', window.scrollY>20), {passive:true});
  if(window.scrollY>20) navbar.classList.add('scrolled');
}

/* ── Footer ── */
function renderFooter() {
  const html = `
  <footer>
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand" style="display:flex;align-items:center;gap:10px">
            ${getLuminaLogo(32)}
            <span><em>Lumina</em> <span>Films</span></span>
          </div>
          <p class="footer-tagline">Experiencias cinematográficas que trascienden la pantalla. El mejor cine, en el mejor ambiente.</p>
        </div>
        <div class="footer-col"><h4>Explorar</h4><ul>
          <li><a href="/">Inicio</a></li>
          <li><a href="/pages/cartelera.html">Cartelera</a></li>
        </ul></div>
        <div class="footer-col"><h4>Salas</h4><ul>
          <li><a href="#">Sala 1 — IMAX</a></li>
          <li><a href="#">Sala 2 — Premium</a></li>
          <li><a href="#">Tarifas</a></li>
        </ul></div>
        <div class="footer-col"><h4>Información</h4><ul>
          <li><a href="#">Contacto</a></li>
          <li><a href="#">Términos</a></li>
          <li><a href="#">Privacidad</a></li>
        </ul></div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Lumina Films. Todos los derechos reservados.</span>
        <span>SENA CNCA – Nodo TIC ADSO19</span>
      </div>
    </div>
  </footer>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function renderLoader() {
  document.body.insertAdjacentHTML('beforeend',
    `<div class="loader-overlay" id="loader"><div class="loader-ring"></div></div>`);
}

/* ── Date helpers — fix Invalid Date ── */
function safeDate(d) {
  if (!d) return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T00:00:00');
  return new Date(d);
}
function fmtDate(d) {
  const dt = safeDate(d);
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' });
}
function fmtDateShort(d) {
  const dt = safeDate(d);
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' });
}
function fmtMoney(n) { return '$' + Number(n).toLocaleString('es-CO'); }
function fmtTime(t) {
  if (!t) return '—';
  const parts = String(t).split(':');
  const hr = parseInt(parts[0]);
  const mn = parts[1] || '00';
  return `${hr%12||12}:${mn} ${hr<12?'AM':'PM'}`;
}
function fmtDuration(min) {
  const h=Math.floor(min/60), m=min%60;
  return h>0 ? `${h}h${m>0?' '+m+'min':''}` : `${m}min`;
}
function posterFallback(el) {
  el.onerror=null;
  el.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="%231a1a1f"/><text x="150" y="225" font-size="60" text-anchor="middle" dominant-baseline="central" fill="%232e2e35">🎬</text></svg>';
}

/* ── Persistent Validation History ── */
const ValidationHistory = {
  KEY: 'lf_validation_log',
  get() { try { return JSON.parse(localStorage.getItem(this.KEY)||'[]'); } catch { return []; } },
  add(entry) {
    const log = this.get();
    log.unshift({ ...entry, time: new Date().toISOString() });
    if (log.length > 50) log.pop();
    localStorage.setItem(this.KEY, JSON.stringify(log));
  },
  clear() { localStorage.removeItem(this.KEY); }
};
