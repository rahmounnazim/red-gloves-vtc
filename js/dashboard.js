/* ════════════════════════════════════════════
   DASHBOARD.JS — Espace client ET chauffeur
   ════════════════════════════════════════════ */

const session = exigerConnexion(); // Redirige vers login si non connecté
if (!session) throw new Error('Non connecté');

const estChauffeur = session.role === 'chauffeur';

/* ── Adapte l'interface selon le rôle ── */
document.getElementById('role-badge').textContent    = estChauffeur ? '🚗' : '👤';
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
    toast(toggleEnLigne.checked ? '🟢 Vous êtes maintenant en ligne' : '🔴 Vous êtes hors ligne', 'info');
    majBadgeSidebar();
  });

  const label = document.getElementById('label-en-ligne');
  if (label) label.textContent = session.en_ligne ? '🟢 En ligne' : '🔴 Hors ligne';
}

/* ══════════════════════════════════════════
   BADGE NOTIFICATION SIDEBAR (chauffeur)
   ══════════════════════════════════════════ */
function majBadgeSidebar() {
  if (!estChauffeur) return;
  const n = DB.getCourses().filter(c => c.statut === 'en_attente').length;
  const btn = document.querySelector('[data-section="sec-disponibles"]');
  if (!btn) return;
  btn.innerHTML = `🔔 Courses disponibles${n > 0 ? ` <span class="badge-notif">${n}</span>` : ''}`;
}
majBadgeSidebar();

/* ══════════════════════════════════════════
   ── SECTIONS CLIENT ──
   ══════════════════════════════════════════ */

/* Section "Réserver" : formulaire avec autocomplete + lien vers page complète */
function chargerReserver() {
  const zone = document.getElementById('sec-reserver');
  if (zone.dataset.init) return;
  zone.dataset.init = '1';

  const getD = creerAutocomplete('dash-depart', () => {});
  const getA = creerAutocomplete('dash-dest',   () => {});

  document.getElementById('dash-btn-calculer')?.addEventListener('click', () => {
    const dep = getD(), arr = getA();
    if (!dep) { toast('Sélectionnez une adresse de départ valide', 'error'); return; }
    if (!arr) { toast('Sélectionnez une adresse d\'arrivée valide', 'error'); return; }
    if (dep.label === arr.label) { toast('Départ et destination identiques', 'error'); return; }

    const btn = document.getElementById('dash-btn-calculer');
    btn.classList.add('btn-loading'); btn.disabled = true;

    setTimeout(() => {
      // Distance Haversine
      const R = 6371;
      const dLat = (arr.lat - dep.lat) * Math.PI/180;
      const dLon = (arr.lon - dep.lon) * Math.PI/180;
      const a = Math.sin(dLat/2)**2 + Math.cos(dep.lat*Math.PI/180)*Math.cos(arr.lat*Math.PI/180)*Math.sin(dLon/2)**2;
      const dist  = +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
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

      btn.classList.remove('btn-loading'); btn.disabled = false;
      toast(`✅ Course réservée ! ${dist} km — ${prix}€ — Un chauffeur arrive bientôt`, 'success');

      // Reset champs
      document.getElementById('dash-depart').value = '';
      document.getElementById('dash-dest').value   = '';
      zone.dataset.init = '';

      setTimeout(() => { chargerHistorique(); afficherSection('sec-historique'); }, 1600);
    }, 300);
  });
}

/* Section "Historique" (client) */
function chargerHistorique() {
  const zone = document.getElementById('liste-historique');
  if (!zone) return;
  const courses = DB.getCourses().filter(c => c.clientId === session.id);

  if (!courses.length) {
    zone.innerHTML = `<div class="vide">🚗<br>Aucune course pour l'instant.<br>Réservez votre premier trajet !</div>`;
    return;
  }

  zone.innerHTML = courses.map(c => {
    /* Bouton annuler — uniquement si en attente */
    const cancelBtn = c.statut === 'en_attente'
      ? `<div class="cc-actions">
           <button class="btn btn-outline btn-sm" onclick="annulerCourse('${c.id}',this)">❌ Annuler la course</button>
         </div>`
      : '';

    /* Notation — uniquement si terminée */
    let ratingHtml = '';
    if (c.statut === 'terminee') {
      if (c.noteClient) {
        ratingHtml = `<div class="note-donnee">Votre note : ${'⭐'.repeat(c.noteClient)}${'☆'.repeat(5 - c.noteClient)} (${c.noteClient}/5) — Merci !</div>`;
      } else {
        const etoiles = [1,2,3,4,5].map(i =>
          `<span class="etoile" onclick="noterChauffeur('${c.id}',${i})" onmouseover="survoleEtoiles(this,${i})" onmouseleave="resetEtoiles(this)">☆</span>`
        ).join('');
        ratingHtml = `<div class="noter-chauffeur">
          <small>⭐ Notez votre chauffeur :</small>
          <div class="etoiles">${etoiles}</div>
        </div>`;
      }
    }

    return `
    <div class="course-card">
      <div class="cc-header">
        <span class="cc-ico">${c.vehiculeIco || '🚗'}</span>
        <div>
          <strong>${c.vehiculeNom}</strong>
          <small>${new Date(c.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}</small>
        </div>
        <span class="statut statut-${c.statut}">${labelStatut(c.statut)}</span>
      </div>
      <div class="cc-adresses">
        <div>📍 ${raccourcir(c.depart, 55)}</div>
        <div>🏁 ${raccourcir(c.destination, 55)}</div>
      </div>
      <div class="cc-footer">
        <span>${c.distanceKm} km • ${c.dureeMin} min • ${c.paiement === 'carte' ? '💳' : '💵'}</span>
        <strong class="prix-red">${c.prix}€</strong>
      </div>
      ${cancelBtn}
      ${ratingHtml}
    </div>`;
  }).join('');
}

/* Annuler une course (double-clic pour confirmer) */
function annulerCourse(id, btn) {
  if (btn.dataset.confirm !== '1') {
    btn.dataset.confirm = '1';
    btn.textContent = '⚠️ Confirmer l\'annulation ?';
    btn.classList.replace('btn-outline', 'btn-red');
    setTimeout(() => {
      if (btn.dataset.confirm === '1') {
        btn.dataset.confirm = '';
        btn.textContent = '❌ Annuler la course';
        btn.classList.replace('btn-red', 'btn-outline');
      }
    }, 3500);
    return;
  }
  DB.updateCourse(id, { statut: 'annulee', annuleeAt: new Date().toISOString() });
  toast('Course annulée', 'info');
  chargerHistorique();
  majBadgeSidebar();
}

/* Notation du chauffeur (1 à 5 étoiles) */
function noterChauffeur(courseId, note) {
  DB.updateCourse(courseId, { noteClient: note });

  /* Met à jour la note moyenne du chauffeur dans sa fiche */
  const course = DB.getCourses().find(c => c.id === courseId);
  if (course?.chauffeurId) {
    const toutesLesCourses = DB.getCourses().filter(
      c => c.chauffeurId === course.chauffeurId && c.noteClient
    );
    const total  = toutesLesCourses.reduce((s, c) => s + (c.noteClient || 0), 0) + note;
    const nb     = toutesLesCourses.length + 1;
    const moyenne = +(total / nb).toFixed(1);
    DB.saveUsers(DB.getUsers().map(u =>
      u.id === course.chauffeurId ? { ...u, note: moyenne } : u
    ));
  }

  toast(`Merci ! Note envoyée : ${'⭐'.repeat(note)} (${note}/5)`, 'success');
  chargerHistorique();
}

/* Hover sur les étoiles */
function survoleEtoiles(el, n) {
  [...el.parentNode.querySelectorAll('.etoile')].forEach((s, i) => {
    s.textContent = i < n ? '⭐' : '☆';
  });
}
function resetEtoiles(el) {
  [...el.parentNode.querySelectorAll('.etoile')].forEach(s => s.textContent = '☆');
}

/* ══════════════════════════════════════════
   ── SECTIONS CHAUFFEUR ──
   ══════════════════════════════════════════ */

/* Courses disponibles (statut en_attente, pas encore acceptées) */
let _refreshTimer = null;
let _refreshSeconds = 8;

function chargerDisponibles() {
  const zone = document.getElementById('liste-disponibles');
  if (!zone) return;

  const courses = DB.getCourses().filter(c => c.statut === 'en_attente');

  // Afficher compte à rebours du prochain refresh
  const cdEl = document.querySelector('.refresh-cd');
  if (cdEl) {
    _refreshSeconds = 8;
    cdEl.textContent = 'Actualisation dans 8s';
  }

  if (!courses.length) {
    zone.innerHTML = `<div class="vide">📭<br>Aucune course en attente pour l'instant.<br>Les nouvelles courses apparaissent automatiquement.</div>`;
    majBadgeSidebar();
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
        <div>📍 ${raccourcir(c.depart, 58)}</div>
        <div>🏁 ${raccourcir(c.destination, 58)}</div>
      </div>
      <div class="cc-footer">
        <span>Demandé le ${new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</span>
        <span>Mode : ${c.paiement === 'carte' ? '💳 Carte' : '💵 Espèces'}</span>
      </div>
      <div class="cc-actions">
        <button class="btn btn-outline btn-sm" onclick="refuserCourse('${c.id}')">✕ Refuser</button>
        <button class="btn btn-red btn-sm"    onclick="accepterCourse('${c.id}')">✓ Accepter</button>
      </div>
    </div>`).join('');

  majBadgeSidebar();
}

function accepterCourse(id) {
  DB.updateCourse(id, {
    chauffeurId:  session.id,
    chauffeurNom: session.prenom + ' ' + session.nom,
    statut:       'acceptee',
    accepteeAt:   new Date().toISOString(),
  });

  /* Met à jour les stats du chauffeur */
  const course = DB.getCourses().find(c => c.id === id);
  const users  = DB.getUsers().map(u => {
    if (u.id !== session.id) return u;
    const nvRevenus = +((( u.revenus_total || 0) + parseFloat(course.prix)) * 0.85).toFixed(2);
    return { ...u, courses_total: (u.courses_total || 0) + 1, revenus_total: nvRevenus };
  });
  DB.saveUsers(users);
  DB.saveSession(users.find(u => u.id === session.id));

  toast('✅ Course acceptée ! Rendez-vous au point de départ.', 'success');
  document.getElementById('cc-' + id)?.remove();
  if (!document.querySelector('.course-card')) chargerDisponibles();
  majBadgeSidebar();
}

function refuserCourse(id) {
  document.getElementById('cc-' + id)?.remove();
  toast('Course refusée', 'info');
  if (!document.querySelector('.course-card')) chargerDisponibles();
  majBadgeSidebar();
}

/* Mes courses (chauffeur) — avec bouton "Terminer" */
function chargerMesCourses() {
  const zone = document.getElementById('liste-mes-courses');
  if (!zone) return;
  const courses = DB.getCourses().filter(c => c.chauffeurId === session.id);

  if (!courses.length) {
    zone.innerHTML = `<div class="vide">🚗<br>Vous n'avez pas encore accepté de course.</div>`;
    return;
  }
  zone.innerHTML = courses.map(c => `
    <div class="course-card" id="mcc-${c.id}">
      <div class="cc-header">
        <span class="cc-ico">${c.vehiculeIco || '🚗'}</span>
        <div>
          <strong>${c.clientNom}</strong>
          <small>${new Date(c.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}</small>
        </div>
        <span class="statut statut-${c.statut}">${labelStatut(c.statut)}</span>
      </div>
      <div class="cc-adresses">
        <div>📍 ${raccourcir(c.depart, 58)}</div>
        <div>🏁 ${raccourcir(c.destination, 58)}</div>
      </div>
      <div class="cc-footer">
        <span>${c.distanceKm} km • ${c.dureeMin} min</span>
        <strong class="prix-red">+${(c.prix * 0.85).toFixed(2)}€ <small>(85%)</small></strong>
      </div>
      ${c.statut === 'acceptee' ? `
      <div class="cc-actions">
        <button class="btn btn-red btn-sm" onclick="terminerCourse('${c.id}')">🏁 Marquer comme terminée</button>
      </div>` : ''}
    </div>`).join('');
}

/* Marquer une course comme terminée */
function terminerCourse(id) {
  DB.updateCourse(id, { statut: 'terminee', termineeAt: new Date().toISOString() });
  toast('🏁 Course terminée ! Merci.', 'success');
  chargerMesCourses();
  chargerStats();
  majBadgeSidebar();
}

/* Statistiques (chauffeur) avec animation count-up */
function chargerStats() {
  const u = DB.getUsers().find(u => u.id === session.id) || session;
  const courses  = u.courses_total  || 0;
  const revenus  = +(u.revenus_total || 0);
  const note     = +(u.note || 5);
  const semaine  = +(revenus * 0.25).toFixed(2);

  animerCompteur(document.getElementById('stat-courses'), courses, '');
  animerCompteur(document.getElementById('stat-revenus'), revenus, '€', 2);
  animerCompteur(document.getElementById('stat-semaine'), semaine, '€', 2);

  const noteEl = document.getElementById('stat-note');
  if (noteEl) noteEl.textContent = note.toFixed(1) + ' / 5';
}

/* Animation count-up pour les chiffres */
function animerCompteur(el, cible, suffixe = '', decimales = 0) {
  if (!el) return;
  if (!cible) { el.textContent = (0).toFixed(decimales) + suffixe; return; }
  const debut = performance.now();
  const duree = 900;
  function step(now) {
    const t    = Math.min((now - debut) / duree, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = (cible * ease).toFixed(decimales) + suffixe;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* Profil (commun client + chauffeur) */
function chargerProfil() {
  const u  = DB.getUsers().find(u => u.id === session.id) || session;
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

  if (!prenom || !nom) { toast('Prénom et nom obligatoires', 'error'); return; }

  const users = DB.getUsers().map(u =>
    u.id === session.id ? { ...u, prenom, nom, tel } : u
  );
  DB.saveUsers(users);
  const updated = { ...session, prenom, nom, tel };
  DB.saveSession(updated);
  document.getElementById('user-prenom').textContent = prenom + ' ' + nom;
  toast('✅ Profil mis à jour avec succès !', 'success');
});

/* ══════════════════════════════════════════
   AUTO-REFRESH — Courses disponibles
   ══════════════════════════════════════════ */
setInterval(() => {
  // Rafraîchit seulement si la section est visible
  const secDispo = document.getElementById('sec-disponibles');
  if (!secDispo || secDispo.classList.contains('cache')) return;
  chargerDisponibles();
  majBadgeSidebar();
}, 8000);

// Compte à rebours affiché
setInterval(() => {
  const cdEl = document.querySelector('.refresh-cd');
  if (!cdEl) return;
  const secDispo = document.getElementById('sec-disponibles');
  if (!secDispo || secDispo.classList.contains('cache')) return;
  _refreshSeconds = Math.max(0, _refreshSeconds - 1);
  cdEl.textContent = _refreshSeconds > 0
    ? `Actualisation dans ${_refreshSeconds}s`
    : 'Actualisation…';
}, 1000);

/* ── Utilitaires ── */
function labelStatut(s) {
  return {
    en_attente: '⏳ En attente',
    acceptee:   '✅ Acceptée',
    terminee:   '🏁 Terminée',
    annulee:    '❌ Annulée',
  }[s] || s;
}

function raccourcir(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '');
}
