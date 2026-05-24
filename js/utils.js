/* ════════════════════════════════════════════
   UTILS.JS — Fonctions partagées sur tout le site
   ════════════════════════════════════════════ */

/* ── Toast (notification avec icône) ── */
function toast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  el.innerHTML = `<span class="toast-ico">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  el.className = 'toast show ' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3800);
}

/* ── Navbar scroll ── */
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')?.classList.toggle('scrolled', scrollY > 20);
});

/* ══════════════════════════════════════════
   BASE DE DONNÉES LOCALE (localStorage)
   En production → remplacer par une API REST
   ══════════════════════════════════════════ */
const DB = {
  // Utilisateurs
  getUsers:    () => JSON.parse(localStorage.getItem('rg_users')  || '[]'),
  saveUsers:   (u) => localStorage.setItem('rg_users', JSON.stringify(u)),

  // Session connectée
  getSession:  () => JSON.parse(localStorage.getItem('rg_session') || 'null'),
  saveSession: (u) => localStorage.setItem('rg_session', JSON.stringify(u)),
  clearSession:() => localStorage.removeItem('rg_session'),

  // Courses
  getCourses:  () => JSON.parse(localStorage.getItem('rg_courses') || '[]'),
  saveCourses: (c) => localStorage.setItem('rg_courses', JSON.stringify(c)),

  // Ajouter une course
  addCourse(course) {
    const list = this.getCourses();
    list.unshift(course);
    this.saveCourses(list);
  },

  // Mettre à jour une course
  updateCourse(id, changes) {
    const list = this.getCourses().map(c => c.id === id ? { ...c, ...changes } : c);
    this.saveCourses(list);
  },

  // Génère un ID unique simple
  uid: () => Math.random().toString(36).slice(2, 10),
};

/* ══════════════════════════════════════════
   AUTOCOMPLETE ADRESSE — API Nominatim (OpenStreetMap)
   Gratuit, sans clé API, données réelles
   ══════════════════════════════════════════ */
function creerAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return () => null;

  // Conteneur des suggestions
  const dropdown = document.createElement('ul');
  dropdown.className = 'adresse-dropdown';
  input.parentNode.appendChild(dropdown);

  // Marqueur de validation (✓ vert quand une adresse est confirmée)
  const badge = document.createElement('span');
  badge.className = 'adresse-badge';
  input.parentNode.appendChild(badge);

  let adresseValidee = null;
  let activeIdx = -1; // Index clavier actif
  let timer;

  /* ── Debounce frappe : attend 450ms avant d'appeler l'API ── */
  input.addEventListener('input', () => {
    adresseValidee = null;
    activeIdx = -1;
    badge.textContent = '';
    badge.className = 'adresse-badge';
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { dropdown.innerHTML = ''; return; }

    dropdown.innerHTML = '<li class="adresse-loading">🔍 Recherche en cours…</li>';
    timer = setTimeout(() => rechercherNominatim(q), 450);
  });

  /* ── Navigation clavier (↑↓ Enter Escape) ── */
  input.addEventListener('keydown', (e) => {
    const items = [...dropdown.querySelectorAll('li:not(.adresse-loading):not(.adresse-vide)')];
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((li, i) => li.classList.toggle('kbd-actif', i === activeIdx));
      items[activeIdx]?.scrollIntoView({ block: 'nearest' });

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      items.forEach((li, i) => li.classList.toggle('kbd-actif', i === activeIdx));
      items[activeIdx]?.scrollIntoView({ block: 'nearest' });

    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault();
        items[activeIdx]?.click();
      }

    } else if (e.key === 'Escape') {
      dropdown.innerHTML = '';
      activeIdx = -1;
    }
  });

  /* ── Appel à l'API OpenStreetMap Nominatim ── */
  async function rechercherNominatim(query) {
    try {
      const url = 'https://nominatim.openstreetmap.org/search'
        + '?q=' + encodeURIComponent(query)
        + '&format=json&limit=5&countrycodes=fr&accept-language=fr';

      const res  = await fetch(url, { headers: { 'User-Agent': 'RedGlovesApp/1.0' } });
      const data = await res.json();

      dropdown.innerHTML = '';

      if (!data.length) {
        dropdown.innerHTML = '<li class="adresse-vide">Aucun résultat — essayez une autre formulation</li>';
        return;
      }

      data.forEach(item => {
        const li = document.createElement('li');
        const label = item.display_name;
        // Tronquer les labels trop longs (OpenStreetMap renvoie parfois 120+ caractères)
        li.textContent = label.length > 74 ? label.slice(0, 74) + '…' : label;
        li.title = label; // Tooltip = adresse complète
        li.addEventListener('click', () => {
          // Quand l'utilisateur clique (ou appuie Entrée) sur une suggestion
          input.value    = label;
          adresseValidee = { label, lat: parseFloat(item.lat), lon: parseFloat(item.lon) };
          dropdown.innerHTML = '';
          activeIdx = -1;
          badge.textContent  = '✓ Adresse validée';
          badge.className    = 'adresse-badge ok';
          if (onSelect) onSelect(adresseValidee);
        });
        dropdown.appendChild(li);
      });
    } catch {
      dropdown.innerHTML = '<li class="adresse-vide">⚠️ Erreur réseau — vérifiez votre connexion</li>';
    }
  }

  // Ferme le dropdown si on clique ailleurs
  document.addEventListener('click', (e) => {
    if (!input.parentNode.contains(e.target)) {
      dropdown.innerHTML = '';
      activeIdx = -1;
    }
  });

  // Retourne une fonction pour récupérer l'adresse validée de l'extérieur
  return () => adresseValidee;
}

/* ── Redirige vers login si non connecté ── */
function exigerConnexion(role = null) {
  const session = DB.getSession();
  if (!session) { window.location.href = 'auth.html'; return null; }
  if (role && session.role !== role) { window.location.href = 'dashboard.html'; return null; }
  return session;
}

/* ── Met à jour le nom dans la navbar ── */
function majNavbar() {
  const session = DB.getSession();
  const zone = document.getElementById('nav-user');
  if (!zone) return;
  if (session) {
    zone.innerHTML =
      `<span class="nav-nom">👤 ${session.prenom}</span>
       <a href="dashboard.html" class="btn btn-outline btn-sm">Mon espace</a>
       <button class="btn btn-red btn-sm" onclick="deconnexion()">Déconnexion</button>`;
  } else {
    zone.innerHTML =
      `<a href="auth.html" class="btn btn-outline btn-sm">Connexion</a>
       <a href="auth.html#inscription" class="btn btn-red btn-sm">S'inscrire</a>`;
  }
}

function deconnexion() {
  DB.clearSession();
  toast('À bientôt ! 👋', 'info');
  setTimeout(() => window.location.href = 'index.html', 700);
}

// Lance la mise à jour de la navbar dès que la page est chargée
document.addEventListener('DOMContentLoaded', majNavbar);
