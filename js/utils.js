/* ════════════════════════════════════════════
   UTILS.JS — Fonctions partagées sur tout le site
   ════════════════════════════════════════════ */

/* ── Toast (notification) ── */
function toast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
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
  if (!input) return;

  // Conteneur des suggestions (ajouté juste après l'input)
  const dropdown = document.createElement('ul');
  dropdown.className = 'adresse-dropdown';
  input.parentNode.appendChild(dropdown);

  // Marqueur de validation (✓ vert quand une adresse est confirmée)
  const badge = document.createElement('span');
  badge.className = 'adresse-badge';
  input.parentNode.appendChild(badge);

  let adresseValidee = null; // Stocke l'adresse choisie (avec coordonnées GPS)

  // Debounce : attend 450ms après la frappe avant d'appeler l'API
  let timer;
  input.addEventListener('input', () => {
    adresseValidee = null;
    badge.textContent = '';
    badge.className = 'adresse-badge';
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { dropdown.innerHTML = ''; return; }

    dropdown.innerHTML = '<li class="adresse-loading">Recherche…</li>';
    timer = setTimeout(() => rechercherNominatim(q), 450);
  });

  // Appel à l'API OpenStreetMap Nominatim
  async function rechercherNominatim(query) {
    try {
      const url = 'https://nominatim.openstreetmap.org/search'
        + '?q=' + encodeURIComponent(query)
        + '&format=json&limit=5&countrycodes=fr&accept-language=fr';

      const res  = await fetch(url, { headers: { 'User-Agent': 'RedGlovesApp/1.0' } });
      const data = await res.json();

      dropdown.innerHTML = '';

      if (!data.length) {
        dropdown.innerHTML = '<li class="adresse-vide">Aucun résultat</li>';
        return;
      }

      data.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.display_name;
        li.addEventListener('click', () => {
          // Quand l'utilisateur clique sur une suggestion
          input.value   = item.display_name;
          adresseValidee = {
            label: item.display_name,
            lat:   parseFloat(item.lat),
            lon:   parseFloat(item.lon),
          };
          dropdown.innerHTML = '';
          badge.textContent  = '✓ Validée';
          badge.className    = 'adresse-badge ok';
          if (onSelect) onSelect(adresseValidee);
        });
        dropdown.appendChild(li);
      });
    } catch {
      dropdown.innerHTML = '<li class="adresse-vide">Erreur réseau</li>';
    }
  }

  // Ferme le dropdown si on clique ailleurs
  document.addEventListener('click', (e) => {
    if (!input.parentNode.contains(e.target)) dropdown.innerHTML = '';
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
  window.location.href = 'index.html';
}

// Lance la mise à jour de la navbar dès que la page est chargée
document.addEventListener('DOMContentLoaded', majNavbar);
