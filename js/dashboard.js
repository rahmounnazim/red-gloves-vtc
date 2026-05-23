/* ════════════════════════════════════════════
   DASHBOARD.JS — Espace client ET chauffeur
   ════════════════════════════════════════════ */

const session = exigerConnexion(); // Redirige vers login si non connecté
if (!session) throw new Error('Non connecté');

const estChauffeur = session.role === 'chauffeur';

/* ── Adapte l'interface selon le rôle ── */
document.getElementById('role-badge').textContent    = estChauffeur ? '🚗 Chauffeur' : '👤 Client';
document.getElementById('user-prenom').textContent   = session.prenom + ' ' + session.nom;
document.getElementById('user-email').textContent    = session.email;

/* Affiche la bonne sidebar */
document.getElementById('sidebar-client').classList.toggle('cache', estChauffeur);
document.getElementById('sidebar-chauffeur').classList.toggle('cache', !estChauffeur);

/* ══════════════════════════════════════════
   NAVIGATION ENTRE SECTIONS
   ══════════════════════════════════════════ */
function afficherSection(id) {
  document.querySelectorAll('.dash-section').forEach(s =>
    s.classList.toggle('cache', s.id !== id)
  );
  document.querySelectorAll('.sidebar-lien').forEach(l =>
    l.classList.toggle('actif', l.dataset.section === id)
  );
  /* Charge le contenu de la section */
  chargerSection(id);
}

function chargerSection(id) {
  if      (id === 'sec-reserver')     chargerReserver();
  else if (id === 'sec-historique')   chargerHistorique();
  else if (id === 'sec-profil')       chargerProfil();
  else if (id === 'sec-disponibles')  chargerDisponibles();
  else if (id === 'sec-mes-courses')  chargerMesCourses();
  else if (id === 'sec-stats')        chargerStats();
}

/* ── Section par défaut selon le rôle ── */
afficherSection(estChauffeur ? 'sec-disponibles' : 'sec-reserver');

/* ══════════════════════════════════════════
   TOGGLE EN LIGNE / HORS LIGNE (chauffeur)
   ══════════════════════════════════════════ */
const toggleEnLigne = document.getElementById('toggle-en-ligne');
if (toggleEnLigne) {
  toggleEnLigne.checked = session.en_ligne;
  toggleEnLigne.addEventListener('change', () => {
    const users = DB.getUsers().map(u =>
      u.id === session.id ? { ...u, en_ligne: toggleEnLigne.checked } : u
    );
    DB.saveUsers(users);
    const updated = { ...session, en_ligne: toggleEnLigne.checked };
    DB.saveSession(updated);

    const label = document.getElementById('label-en-ligne');
    if (label) label.textContent = toggleEnLigne.checked ? '🟢 En ligne' : '🔴 Hors ligne';
    toast(toggleEnLigne.checked ? 'Vous êtes maintenant en ligne' : 'Vous êtes hors ligne', 'info');
  });

  const label = document.getElementById('label-en-ligne');
  if (label) label.textContent = session.en_ligne ? '🟢 En ligne' : '🔴 Hors ligne';
}

/* ══════════════════════════════════════════
   ── SECTIONS CLIENT ──
   ══════════════════════════════════════════ */

/* Section "Réserver" : formulaire inline avec autocomplete */
function chargerReserver() {
  const zone = document.getElementById('sec-reserver');
  if (zone.dataset.init) return; // Évite de recréer les autocompletes

  const getD = creerAutocomplete('dash-depart', () => {});
  const getA = creerAutocomplete('dash-dest',   () => {});
  zone.dataset.init = '1';

  document.getElementById('dash-btn-calculer')?.addEventListener('click', () => {
    const dep = getD(), arr = getA();
    if (!dep) { toast('Sélectionnez une adresse de départ valide', 'error'); return; }
    if (!arr) { toast('Sélectionnez une adresse d\'arrivée valide', 'error'); return; }

    // Distance Haversine
    const R = 6371;
    const dLat = (arr.lat - dep.lat) * Math.PI/180;
    const dLon = (arr.lon - dep.lon) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(dep.lat*Math.PI/180)*Math.cos(arr.lat*Math.PI/180)*Math.sin(dLon/2)**2;
    const dist = +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
    const duree = Math.round(dist * 2.8 + 5);
    const prix  = (5 + dist * 1.8).toFixed(2);

    const course = {
      id: DB.uid(), clientId: session.id,
      clientNom: session.prenom + ' ' + session.nom,
      chauffeurId: null,
      depart: dep.label, destination: arr.label,
      distanceKm: dist, dureeMin: duree,
      vehicule: 'standard', vehiculeNom: 'Red Standard', vehiculeIco: '🚗',
      prix, paiement: 'carte', note: '', statut: 'en_attente',
      createdAt: new Date().toISOString(),
    };
    DB.addCourse(course);
    toast('🎉 Course réservée ! Un chauffeur arrive dans ~5 min.', 'success');
    chargerHistorique();
    afficherSection('sec-historique');
  });
}

/* Section "Historique" (client) */
function chargerHistorique() {
  const zone = document.getElementById('liste-historique');
  if (!zone) return;
  const courses = DB.getCourses().filter(c => c.clientId === session.id);

  if (!courses.length) {
    zone.innerHTML = '<p class="vide">Aucune course pour l\'instant.</p>'; return;
  }
  zone.innerHTML = courses.map(c => `
    <div class="course-card">
      <div class="cc-header">
        <span class="cc-ico">${c.vehiculeIco || '🚗'}</span>
        <div>
          <strong>${c.vehiculeNom}</strong>
          <small>${new Date(c.createdAt).toLocaleDateString('fr-FR')}</small>
        </div>
        <span class="statut statut-${c.statut}">${labelStatut(c.statut)}</span>
      </div>
      <div class="cc-adresses">
        <div>📍 ${raccourcir(c.depart, 50)}</div>
        <div>🏁 ${raccourcir(c.destination, 50)}</div>
      </div>
      <div class="cc-footer">
        <span>${c.distanceKm} km • ${c.dureeMin} min</span>
        <strong class="prix-red">${c.prix}€</strong>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════
   ── SECTIONS CHAUFFEUR ──
   ══════════════════════════════════════════ */

/* Courses disponibles (statut en_attente, pas encore acceptées) */
function chargerDisponibles() {
  const zone = document.getElementById('liste-disponibles');
  if (!zone) return;

  const courses = DB.getCourses().filter(c => c.statut === 'en_attente');

  if (!courses.length) {
    zone.innerHTML = '<p class="vide">Aucune course en attente pour l\'instant.<br>Les nouvelles courses apparaissent ici automatiquement.</p>';
    return;
  }

  zone.innerHTML = courses.map(c => `
    <div class="course-card" id="cc-${c.id}">
      <div class="cc-header">
        <span class="cc-ico">${c.vehiculeIco || '🚗'}</span>
        <div>
          <strong>${c.clientNom}</strong>
          <small>${c.vehiculeNom} • ${c.distanceKm} km • ${c.dureeMin} min</small>
        </div>
        <strong class="prix-red">${c.prix}€</strong>
      </div>
      <div class="cc-adresses">
        <div>📍 ${raccourcir(c.depart, 55)}</div>
        <div>🏁 ${raccourcir(c.destination, 55)}</div>
      </div>
      <div class="cc-actions">
        <button class="btn btn-outline btn-sm" onclick="refuserCourse('${c.id}')">✕ Refuser</button>
        <button class="btn btn-red btn-sm"    onclick="accepterCourse('${c.id}')">✓ Accepter</button>
      </div>
    </div>`).join('');
}

function accepterCourse(id) {
  DB.updateCourse(id, { chauffeurId: session.id, chauffeurNom: session.prenom + ' ' + session.nom, statut: 'acceptee' });

  /* Met à jour les stats du chauffeur */
  const course = DB.getCourses().find(c => c.id === id);
  const users  = DB.getUsers().map(u => {
    if (u.id !== session.id) return u;
    return { ...u, courses_total: (u.courses_total||0)+1, revenus_total: +(((u.revenus_total||0) + parseFloat(course.prix)) * 0.85).toFixed(2) };
  });
  DB.saveUsers(users);
  DB.saveSession(users.find(u => u.id === session.id));

  toast('✅ Course acceptée !', 'success');
  document.getElementById('cc-' + id)?.remove();
  if (!document.querySelector('.course-card')) chargerDisponibles();
}

function refuserCourse(id) {
  document.getElementById('cc-' + id)?.remove();
  toast('Course refusée', 'info');
  if (!document.querySelector('.course-card')) chargerDisponibles();
}

/* Mes courses (chauffeur) */
function chargerMesCourses() {
  const zone = document.getElementById('liste-mes-courses');
  if (!zone) return;
  const courses = DB.getCourses().filter(c => c.chauffeurId === session.id);

  if (!courses.length) {
    zone.innerHTML = '<p class="vide">Vous n\'avez pas encore accepté de course.</p>'; return;
  }
  zone.innerHTML = courses.map(c => `
    <div class="course-card">
      <div class="cc-header">
        <span class="cc-ico">${c.vehiculeIco || '🚗'}</span>
        <div>
          <strong>${c.clientNom}</strong>
          <small>${new Date(c.createdAt).toLocaleDateString('fr-FR')}</small>
        </div>
        <span class="statut statut-acceptee">${labelStatut(c.statut)}</span>
      </div>
      <div class="cc-adresses">
        <div>📍 ${raccourcir(c.depart, 55)}</div>
        <div>🏁 ${raccourcir(c.destination, 55)}</div>
      </div>
      <div class="cc-footer">
        <span>${c.distanceKm} km</span>
        <strong class="prix-red">+${(c.prix * 0.85).toFixed(2)}€ <small>(85%)</small></strong>
      </div>
    </div>`).join('');
}

/* Statistiques (chauffeur) */
function chargerStats() {
  const u = DB.getUsers().find(u => u.id === session.id) || session;
  const el = id => document.getElementById(id);
  if (el('stat-courses'))  el('stat-courses').textContent  = u.courses_total  || 0;
  if (el('stat-revenus'))  el('stat-revenus').textContent  = (u.revenus_total || 0).toFixed(2) + '€';
  if (el('stat-note'))     el('stat-note').textContent     = (u.note || 5).toFixed(1);
  if (el('stat-semaine'))  el('stat-semaine').textContent  = ((u.revenus_total || 0) * 0.25).toFixed(2) + '€';
}

/* Profil (commun client + chauffeur) */
function chargerProfil() {
  const u = DB.getUsers().find(u => u.id === session.id) || session;
  const el = id => document.getElementById(id);
  if (el('p-prenom'))  el('p-prenom').value  = u.prenom;
  if (el('p-nom'))     el('p-nom').value     = u.nom;
  if (el('p-email'))   el('p-email').value   = u.email;
  if (el('p-tel'))     el('p-tel').value     = u.tel;
  if (el('p-vehicule') && u.vehicule) el('p-vehicule').value = u.vehicule;
}

document.getElementById('form-profil')?.addEventListener('submit', e => {
  e.preventDefault();
  const prenom = document.getElementById('p-prenom').value.trim();
  const nom    = document.getElementById('p-nom').value.trim();
  const tel    = document.getElementById('p-tel').value.trim();

  const users = DB.getUsers().map(u =>
    u.id === session.id ? { ...u, prenom, nom, tel } : u
  );
  DB.saveUsers(users);
  const updated = { ...session, prenom, nom, tel };
  DB.saveSession(updated);
  document.getElementById('user-prenom').textContent = prenom + ' ' + nom;
  toast('Profil mis à jour ✓', 'success');
});

/* Rafraîchit les courses disponibles toutes les 8 secondes */
setInterval(() => {
  if (!document.getElementById('liste-disponibles')?.closest('.dash-section:not(.cache)')) return;
  chargerDisponibles();
}, 8000);

/* ── Utilitaires ── */
function labelStatut(s) {
  return { en_attente: '⏳ En attente', acceptee: '✅ Acceptée', terminee: '🏁 Terminée', annulee: '❌ Annulée' }[s] || s;
}
function raccourcir(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '');
}
