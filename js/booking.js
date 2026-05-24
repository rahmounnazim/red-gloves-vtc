/* ════════════════════════════════════════════
   BOOKING.JS — Réservation avec vérification d'adresse
   ════════════════════════════════════════════ */

const session = DB.getSession();

/* ── Affiche le nom de l'utilisateur connecté ── */
if (session) {
  const el = document.getElementById('user-label');
  if (el) el.textContent = session.prenom;
}

/* ── Types de véhicules ── */
const VEHICULES = [
  { id: 'standard', icone: '🚗', nom: 'Red Standard', desc: '1-4 passagers • Berline confortable', prixBase: 5,  prixKm: 1.8, etaMin: 3, etaMax: 6  },
  { id: 'business', icone: '🚙', nom: 'Red Business',  desc: '1-4 passagers • Haut de gamme',       prixBase: 10, prixKm: 2.8, etaMin: 5, etaMax: 10 },
  { id: 'van',      icone: '🚐', nom: 'Red Van',       desc: '1-7 passagers • Grands bagages',       prixBase: 15, prixKm: 3.2, etaMin: 8, etaMax: 15 },
];

/* ── État de la réservation ── */
let etat = { depart: null, destination: null, vehicule: null, distanceKm: 0, dureeMin: 0 };

/* ── Autocomplete sur les deux champs d'adresse ── */
const getDepart = creerAutocomplete('input-depart', a => { etat.depart = a; });
const getDest   = creerAutocomplete('input-dest',   a => { etat.destination = a; });

/* ══════════════════════════════════════
   ÉTAPE 1 → 2 : Calcul du trajet
   ══════════════════════════════════════ */
document.getElementById('btn-calculer')?.addEventListener('click', () => {
  etat.depart      = getDepart();
  etat.destination = getDest();

  if (!etat.depart)      { toast('Veuillez sélectionner une adresse de départ valide', 'error'); return; }
  if (!etat.destination) { toast('Veuillez sélectionner une adresse d\'arrivée valide', 'error'); return; }
  if (etat.depart.label === etat.destination.label) {
    toast('Le départ et la destination sont identiques', 'error'); return;
  }

  /* Calcul de distance réelle avec les coordonnées GPS (formule de Haversine) */
  etat.distanceKm = haversine(etat.depart.lat, etat.depart.lon, etat.destination.lat, etat.destination.lon);
  etat.dureeMin   = Math.round(etat.distanceKm * 2.8 + 5); // estimation en minutes

  const prixStandard = (5  + etat.distanceKm * 1.8).toFixed(2);
  const prixBusiness = (10 + etat.distanceKm * 2.8).toFixed(2);
  const prixVan      = (15 + etat.distanceKm * 3.2).toFixed(2);

  // Étape 1 — résumé rapide
  document.getElementById('affich-distance').textContent  = etat.distanceKm.toFixed(1) + ' km';
  document.getElementById('affich-duree').textContent     = etat.dureeMin + ' min';
  document.getElementById('affich-prix-min').textContent  = prixStandard + '€';
  document.getElementById('affich-eta').textContent       = '3 – 8 min';
  // Étape 2 — récap mini + grille tarifaire
  document.getElementById('recap-distance').textContent   = etat.distanceKm.toFixed(1) + ' km';
  document.getElementById('recap-duree').textContent      = etat.dureeMin + ' min';
  document.getElementById('recap-prix-min').textContent   = prixStandard + '€';
  document.getElementById('tarif-standard').textContent   = prixStandard + '€';
  document.getElementById('tarif-business').textContent   = prixBusiness + '€';
  document.getElementById('tarif-van').textContent        = prixVan + '€';
  // Étape 2 — grille tarifaire (IDs distincts pour éviter le doublon)
  document.getElementById('tarif2-standard').textContent  = prixStandard + '€';
  document.getElementById('tarif2-business').textContent  = prixBusiness + '€';
  document.getElementById('tarif2-van').textContent       = prixVan + '€';

  document.getElementById('trajet-resultat').classList.remove('cache');

  afficherVehicules();
  allerEtape(2);
});

/* Calcule la distance réelle entre deux points GPS (formule de Haversine) */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ══════════════════════════════════════
   ÉTAPE 2 : Liste des véhicules
   ══════════════════════════════════════ */
function afficherVehicules() {
  const container = document.getElementById('liste-vehicules');
  container.innerHTML = '';

  VEHICULES.forEach((v, i) => {
    const prix = (v.prixBase + etat.distanceKm * v.prixKm).toFixed(2);
    const eta  = v.etaMin + Math.floor(Math.random() * (v.etaMax - v.etaMin + 1));

    const div = document.createElement('div');
    div.className = 'v-option' + (i === 0 ? ' selectionne' : '');
    div.innerHTML = `
      <span class="v-ico">${v.icone}</span>
      <div class="v-texte">
        <strong>${v.nom}</strong>
        <small>${v.desc}</small>
        <small>⏱ ${eta} min d'attente</small>
      </div>
      <div class="v-prix">${prix}€</div>`;

    div.addEventListener('click', () => {
      document.querySelectorAll('.v-option').forEach(o => o.classList.remove('selectionne'));
      div.classList.add('selectionne');
      etat.vehicule = { ...v, prix, eta };
    });

    if (i === 0) etat.vehicule = { ...v, prix, eta };
    container.appendChild(div);
  });
}

/* ══════════════════════════════════════
   ÉTAPE 2 → 3 : Résumé
   ══════════════════════════════════════ */
document.getElementById('btn-vers-resume')?.addEventListener('click', () => {
  if (!etat.vehicule) { toast('Sélectionnez un véhicule', 'error'); return; }

  const v = etat.vehicule;
  document.getElementById('res-depart').textContent   = raccourcir(etat.depart.label, 45);
  document.getElementById('res-dest').textContent     = raccourcir(etat.destination.label, 45);
  document.getElementById('res-distance').textContent = etat.distanceKm.toFixed(1) + ' km';
  document.getElementById('res-duree').textContent    = etat.dureeMin + ' min';
  document.getElementById('res-vehicule').textContent = v.icone + ' ' + v.nom;
  document.getElementById('res-prix').textContent     = v.prix + '€';

  allerEtape(3);
});

/* ══════════════════════════════════════
   ÉTAPE 3 : Confirmer la course
   ══════════════════════════════════════ */
document.getElementById('btn-confirmer')?.addEventListener('click', () => {
  if (!session) {
    toast('Connectez-vous pour réserver', 'error');
    setTimeout(() => window.location.href = 'auth.html', 1200); return;
  }

  const course = {
    id: DB.uid(),
    clientId:    session.id,
    clientNom:   session.prenom + ' ' + session.nom,
    chauffeurId: null,
    depart:      etat.depart.label,
    destination: etat.destination.label,
    distanceKm:  +etat.distanceKm.toFixed(1),
    dureeMin:    etat.dureeMin,
    vehicule:    etat.vehicule.id,
    vehiculeNom: etat.vehicule.nom,
    vehiculeIco: etat.vehicule.icone,
    prix:        etat.vehicule.prix,
    paiement:    document.getElementById('paiement').value,
    note:        document.getElementById('note-course').value.trim(),
    statut:      'en_attente',
    createdAt:   new Date().toISOString(),
  };

  DB.addCourse(course);
  allerEtape(4);

  /* Animation de progression */
  const fill   = document.getElementById('prog-fill');
  const statut = document.getElementById('statut-msg');
  const eta    = document.getElementById('eta-val');
  let reste = etat.vehicule.eta;

  const cd = setInterval(() => {
    reste--;
    if (eta) eta.textContent = Math.max(0, reste);
    if (reste <= 0) clearInterval(cd);
  }, 1000);

  [
    { pct: 25,  msg: 'Course publiée — recherche d\'un chauffeur…', t: 800  },
    { pct: 60,  msg: 'Chauffeur trouvé ! Il se dirige vers vous…',  t: 2500 },
    { pct: 90,  msg: 'Votre chauffeur est proche…',                  t: 5000 },
    { pct: 100, msg: '🎉 Votre chauffeur est arrivé !',             t: 7500 },
  ].forEach(s => setTimeout(() => {
    if (fill)   fill.style.width  = s.pct + '%';
    if (statut) statut.textContent = s.msg;
  }, s.t));
});

/* ══════════════════════════════════════
   Navigation entre étapes
   ══════════════════════════════════════ */
function allerEtape(n) {
  document.querySelectorAll('.etape').forEach(el => {
    el.classList.toggle('cache', el.dataset.etape != n);
  });
  /* Barre de progression */
  document.querySelectorAll('.prog-step').forEach(el => {
    el.classList.toggle('actif',   +el.dataset.step <= n);
    el.classList.toggle('courant', +el.dataset.step === n);
  });
}

function raccourcir(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function recommencer() {
  etat = { depart: null, destination: null, vehicule: null, distanceKm: 0, dureeMin: 0 };
  document.getElementById('input-depart').value = '';
  document.getElementById('input-dest').value   = '';
  document.querySelectorAll('.adresse-badge').forEach(b => { b.textContent = ''; b.className = 'adresse-badge'; });
  allerEtape(1);
}

/* Mise à jour du badge chauffeurs disponibles */
function majBadge() {
  const el = document.getElementById('nb-chauffeurs');
  if (el) {
    const chauffeurs = DB.getUsers().filter(u => u.role === 'chauffeur' && u.en_ligne);
    el.textContent = chauffeurs.length || (6 + Math.floor(Math.random() * 8));
  }
}
majBadge();
setInterval(majBadge, 5000);
