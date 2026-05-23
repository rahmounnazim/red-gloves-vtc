/*
  ╔══════════════════════════════════════════════════════════╗
  ║  RED GLOVES — Fichier : js/main.js                       ║
  ║  Tout le JavaScript du site                              ║
  ╚══════════════════════════════════════════════════════════╝

  STRUCTURE DE CE FICHIER :
  1. Navbar (scroll + menu)
  2. Toast (notifications)
  3. Page d'accueil
  4. Page Auth (connexion / inscription)
  5. Page Booking (réservation)
  6. Page Driver (devenir chauffeur)

  PRINCIPES EXPLIQUÉS :
  - On utilise localStorage pour stocker les données côté client
    (en production, ce serait une base de données côté serveur)
  - Chaque fonction a un nom explicite en français
  - Les commentaires expliquent le POURQUOI, pas le QUOI
*/


/* ══════════════════════════════════════════
   1. NAVBAR — Effet au défilement
   ══════════════════════════════════════════ */

const navbar = document.querySelector('.navbar');

// window.addEventListener = écoute un événement sur la fenêtre
// 'scroll' = déclenché chaque fois que l'utilisateur défile
window.addEventListener('scroll', function() {
  if (window.scrollY > 30) {
    // scrollY = nombre de pixels défilés depuis le haut
    navbar.classList.add('scrolled');    // Ajoute la classe CSS
  } else {
    navbar.classList.remove('scrolled'); // Retire la classe CSS
  }
});


/* ══════════════════════════════════════════
   2. TOAST — Notification temporaire
   Utilisée partout dans le site
   ══════════════════════════════════════════ */

/*
  Paramètres :
  - message : texte à afficher
  - type    : 'normal' ou 'succès' (change la couleur)
*/
function afficherToast(message, type = 'normal') {
  const toast = document.getElementById('toast');
  if (!toast) return; // Sécurité : si l'élément n'existe pas, on arrête

  toast.textContent = message;
  toast.className = 'toast visible'; // Affiche le toast
  if (type === 'succès') toast.classList.add('succès');

  // setTimeout = exécute une fonction après un délai (en millisecondes)
  // Ici on cache le toast après 3,5 secondes
  setTimeout(function() {
    toast.classList.remove('visible');
  }, 3500);
}


/* ══════════════════════════════════════════
   3. PAGE D'ACCUEIL
   ══════════════════════════════════════════ */

/*
  Appelée quand on soumet le formulaire du hero
  event.preventDefault() empêche le rechargement de la page
*/
function rechercherChauffeur(event) {
  event.preventDefault(); // Empêche la soumission classique du formulaire

  const depart      = document.getElementById('depart').value.trim();
  const destination = document.getElementById('destination').value.trim();

  if (depart === destination) {
    afficherToast('Le départ et la destination doivent être différents !');
    return; // Arrête la fonction ici
  }

  // On stocke les adresses pour les réutiliser sur la page booking
  // localStorage = stockage permanent dans le navigateur
  localStorage.setItem('rg_depart', depart);
  localStorage.setItem('rg_destination', destination);

  // Redirige vers la page de réservation
  window.location.href = 'booking.html';
}

/*
  Formulaire de contact de la page d'accueil
*/
function envoyerMessage(event) {
  event.preventDefault();
  afficherToast('Message envoyé ! Nous vous répondrons sous 24h.', 'succès');
  event.target.reset(); // Vide le formulaire
}


/* ══════════════════════════════════════════
   4. PAGE AUTH — Connexion / Inscription
   ══════════════════════════════════════════ */

/*
  Bascule entre les onglets Connexion et Inscription
  ongletActif : 'connexion' ou 'inscription'
*/
function changerOnglet(ongletActif) {
  // Récupère tous les éléments avec la classe "onglet"
  const onglets = document.querySelectorAll('.onglet');

  onglets.forEach(function(onglet) {
    // data-onglet = attribut personnalisé défini dans le HTML
    if (onglet.dataset.onglet === ongletActif) {
      onglet.classList.add('actif');
    } else {
      onglet.classList.remove('actif');
    }
  });

  // Affiche / cache les formulaires
  const formConnexion   = document.getElementById('form-connexion');
  const formInscription = document.getElementById('form-inscription');

  if (formConnexion && formInscription) {
    if (ongletActif === 'connexion') {
      formConnexion.classList.remove('cache');
      formInscription.classList.add('cache');
    } else {
      formConnexion.classList.add('cache');
      formInscription.classList.remove('cache');
    }
  }
}

// Vérifie l'URL au chargement (ex: auth.html#inscription)
if (window.location.hash === '#inscription') {
  changerOnglet('inscription');
}

/*
  Affiche la force du mot de passe pendant la saisie
  mdp : la valeur du champ mot de passe
*/
function afficherForce(mdp) {
  const barre  = document.getElementById('force-remplissage');
  const texte  = document.getElementById('force-texte');
  if (!barre || !texte) return;

  let score = 0;
  if (mdp.length >= 8)           score++; // Longueur suffisante
  if (/[A-Z]/.test(mdp))         score++; // Contient une majuscule
  if (/[0-9]/.test(mdp))         score++; // Contient un chiffre
  if (/[^A-Za-z0-9]/.test(mdp))  score++; // Contient un caractère spécial

  // Tableau des niveaux de force
  const niveaux = [
    { largeur: '25%', couleur: '#ef4444', label: 'Très faible' },
    { largeur: '50%', couleur: '#f97316', label: 'Faible' },
    { largeur: '75%', couleur: '#eab308', label: 'Moyen' },
    { largeur: '100%', couleur: '#22c55e', label: 'Fort ✓' },
  ];

  if (mdp.length === 0) {
    barre.style.width = '0';
    texte.textContent = '';
    return;
  }

  // Math.max(0, score-1) garantit un index minimum de 0
  const niveau = niveaux[Math.max(0, score - 1)];
  barre.style.width      = niveau.largeur;
  barre.style.background = niveau.couleur;
  texte.textContent      = niveau.label;
  texte.style.color      = niveau.couleur;
}

/*
  Gestion de la base de données locale des utilisateurs
  En production, ce serait une API côté serveur (PHP, Node.js…)
*/
function getUtilisateurs() {
  // JSON.parse : convertit une chaîne JSON en objet JavaScript
  return JSON.parse(localStorage.getItem('rg_utilisateurs') || '[]');
}

function sauvegarderUtilisateurs(liste) {
  // JSON.stringify : convertit un objet JavaScript en chaîne JSON
  localStorage.setItem('rg_utilisateurs', JSON.stringify(liste));
}

function getUtilisateurConnecte() {
  return JSON.parse(localStorage.getItem('rg_user') || 'null');
}

/* Connexion */
function seConnecter(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const mdp   = document.getElementById('login-mdp').value;

  // Vérifie que les champs ne sont pas vides
  if (!email || !mdp) {
    afficherToast('Veuillez remplir tous les champs');
    return;
  }

  const utilisateurs = getUtilisateurs();

  // Array.find() : cherche le premier élément qui correspond
  // btoa() : encode en base64 (simple, pas pour la production !)
  const user = utilisateurs.find(function(u) {
    return u.email === email && u.mdp === btoa(mdp);
  });

  if (!user) {
    afficherToast('Email ou mot de passe incorrect');
    return;
  }

  // Sauvegarde la session utilisateur
  localStorage.setItem('rg_user', JSON.stringify({
    prenom: user.prenom,
    nom:    user.nom,
    email:  user.email,
    tel:    user.tel,
  }));

  afficherToast('Bienvenue ' + user.prenom + ' !', 'succès');

  // Redirige après 1 seconde
  setTimeout(function() {
    window.location.href = 'booking.html';
  }, 1000);
}

/* Inscription */
function sInscrire(event) {
  event.preventDefault();

  const prenom = document.getElementById('prenom').value.trim();
  const nom    = document.getElementById('nom').value.trim();
  const email  = document.getElementById('reg-email').value.trim();
  const tel    = document.getElementById('tel').value.trim();
  const mdp    = document.getElementById('reg-mdp').value;
  const cgu    = document.getElementById('cgu').checked;

  // Validation
  if (!prenom || !nom || !email || !tel || !mdp) {
    afficherToast('Veuillez remplir tous les champs');
    return;
  }
  if (mdp.length < 8) {
    afficherToast('Mot de passe trop court (8 caractères minimum)');
    return;
  }
  if (!cgu) {
    afficherToast('Vous devez accepter les CGU');
    return;
  }

  const utilisateurs = getUtilisateurs();

  // Vérifie que l'email n'est pas déjà utilisé
  const emailExiste = utilisateurs.find(function(u) { return u.email === email; });
  if (emailExiste) {
    afficherToast('Cet email est déjà utilisé');
    return;
  }

  // Ajoute le nouvel utilisateur
  utilisateurs.push({ prenom, nom, email, tel, mdp: btoa(mdp) });
  sauvegarderUtilisateurs(utilisateurs);

  // Connexion automatique
  localStorage.setItem('rg_user', JSON.stringify({ prenom, nom, email, tel }));

  afficherToast('Compte créé ! Bienvenue ' + prenom + ' 🎉', 'succès');
  setTimeout(function() {
    window.location.href = 'booking.html';
  }, 1000);
}


/* ══════════════════════════════════════════
   5. PAGE BOOKING — Réservation
   ══════════════════════════════════════════ */

// Données des 3 types de véhicules
const VEHICULES = [
  {
    id: 'standard',
    icone: '🚗',
    nom: 'Red Standard',
    desc: 'Berline confortable, 1-4 passagers',
    prixKm: 1.8,
    prixBase: 5,
    etaMin: 3, etaMax: 6,
  },
  {
    id: 'business',
    icone: '🚙',
    nom: 'Red Business',
    desc: 'Haut de gamme, 1-4 passagers',
    prixKm: 2.8,
    prixBase: 10,
    etaMin: 5, etaMax: 10,
  },
  {
    id: 'van',
    icone: '🚐',
    nom: 'Red Van',
    desc: 'Grand véhicule, jusqu\'à 7 passagers',
    prixKm: 3.2,
    prixBase: 15,
    etaMin: 8, etaMax: 15,
  },
];

// Chauffeurs fictifs (en production : données de la BDD)
const CHAUFFEURS = [
  { initiale: 'K', nom: 'Karim B.',   note: '4.9', plaque: 'AB-421-CD' },
  { initiale: 'A', nom: 'Ahmed S.',   note: '4.8', plaque: 'XY-099-ZZ' },
  { initiale: 'N', nom: 'Nabil R.',   note: '5.0', plaque: 'EF-337-GH' },
  { initiale: 'Y', nom: 'Youssef M.', note: '4.7', plaque: 'IJ-784-KL' },
];

// Variables de l'état de la réservation en cours
let etatResa = {
  depart:      '',
  destination: '',
  distanceKm:  0,
  dureeMin:    0,
  vehicule:    null, // Véhicule sélectionné
};

/*
  Pré-remplit les champs si on vient de la page d'accueil
*/
(function preRemplir() {
  const champDepart = document.getElementById('b-depart');
  const champDest   = document.getElementById('b-dest');
  if (!champDepart || !champDest) return;

  // Récupère les valeurs stockées par rechercherChauffeur()
  champDepart.value = localStorage.getItem('rg_depart')      || '';
  champDest.value   = localStorage.getItem('rg_destination') || '';
})(); // () à la fin = s'exécute immédiatement au chargement

/*
  Calcule et affiche les informations du trajet
  Simule un appel à une API de cartographie (Google Maps, etc.)
*/
function calculerTrajet() {
  const depart = document.getElementById('b-depart')?.value.trim();
  const dest   = document.getElementById('b-dest')?.value.trim();

  if (!depart || !dest) {
    afficherToast('Veuillez renseigner les deux adresses');
    return;
  }
  if (depart.toLowerCase() === dest.toLowerCase()) {
    afficherToast('Le départ et la destination doivent être différents');
    return;
  }

  etatResa.depart      = depart;
  etatResa.destination = dest;

  // Simulation d'une distance aléatoire (4 à 24 km)
  // En réel : appel à l'API Google Maps Distance Matrix
  etatResa.distanceKm = parseFloat((4 + Math.random() * 20).toFixed(1));
  etatResa.dureeMin   = Math.round(etatResa.distanceKm * 3 + Math.random() * 8);

  // Affiche les résultats
  document.getElementById('affich-distance').textContent = etatResa.distanceKm + ' km';
  document.getElementById('affich-duree').textContent    = etatResa.dureeMin + ' min';
  document.getElementById('resultat-trajet').classList.remove('cache');

  // Affiche les marqueurs sur la carte simulée
  afficherCarte();

  // Construit la liste des véhicules
  construireListe();

  // Passe à l'étape 2
  allerEtape(2);
}

/*
  Navigue vers une étape du formulaire
  num : 1, 2, 3 ou 4
*/
function allerEtape(num) {
  // Cache toutes les étapes
  [1, 2, 3, 4].forEach(function(i) {
    const el = document.getElementById('etape-' + i);
    if (el) el.classList.add('cache');
  });

  // Affiche l'étape demandée
  const etape = document.getElementById('etape-' + num);
  if (etape) etape.classList.remove('cache');

  // Met à jour la barre de progression
  [1, 2, 3].forEach(function(i) {
    const prog = document.getElementById('prog-' + i);
    if (prog) {
      if (i <= num) {
        prog.classList.add('actif');
      } else {
        prog.classList.remove('actif');
      }
    }
  });
}

/*
  Construit la liste HTML des véhicules disponibles
*/
function construireListe() {
  const liste = document.getElementById('liste-vehicules');
  if (!liste) return;

  liste.innerHTML = ''; // Vide la liste avant de la reconstruire

  VEHICULES.forEach(function(v, index) {
    // Calcule le prix total estimé
    const prix = (v.prixBase + etatResa.distanceKm * v.prixKm).toFixed(2);

    // Temps d'attente aléatoire dans la fourchette du véhicule
    const eta  = v.etaMin + Math.floor(Math.random() * (v.etaMax - v.etaMin + 1));

    // Crée un élément div pour ce véhicule
    const div = document.createElement('div');
    div.className = 'vehicule-option' + (index === 0 ? ' selectionne' : '');
    div.dataset.id = v.id;

    // innerHTML : construit le HTML interne de la carte véhicule
    div.innerHTML =
      '<span class="v-icone">' + v.icone + '</span>' +
      '<div>' +
        '<div class="v-nom">' + v.nom + '</div>' +
        '<div class="v-desc">' + v.desc + '</div>' +
        '<div class="v-eta">⏱ ' + eta + ' min d\'attente</div>' +
      '</div>' +
      '<div class="v-prix">' + prix + '€<small>estimé</small></div>';

    // Quand on clique sur cette option :
    div.addEventListener('click', function() {
      // Retire la sélection de tous les véhicules
      document.querySelectorAll('.vehicule-option').forEach(function(opt) {
        opt.classList.remove('selectionne');
      });
      // Ajoute la sélection à celui cliqué
      div.classList.add('selectionne');
      // Sauvegarde dans l'état
      etatResa.vehicule = { ...v, prix: prix, eta: eta };
    });

    // Sélectionne le premier par défaut
    if (index === 0) {
      etatResa.vehicule = { ...v, prix: prix, eta: eta };
    }

    liste.appendChild(div);
  });
}

/*
  Affiche le résumé de commande à l'étape 3
  Appelée par le bouton "Continuer" de l'étape 2
*/
function afficherResume() {
  const v = etatResa.vehicule;
  if (!v) { afficherToast('Sélectionnez un véhicule'); return; }

  const resume = document.getElementById('resume-commande');
  if (!resume) return;

  resume.innerHTML =
    '<div class="resume-ligne"><span>Départ</span><span>' + etatResa.depart + '</span></div>' +
    '<div class="resume-ligne"><span>Arrivée</span><span>' + etatResa.destination + '</span></div>' +
    '<div class="resume-ligne"><span>Distance</span><span>' + etatResa.distanceKm + ' km</span></div>' +
    '<div class="resume-ligne"><span>Durée</span><span>' + etatResa.dureeMin + ' min</span></div>' +
    '<div class="resume-ligne"><span>Véhicule</span><span>' + v.icone + ' ' + v.nom + '</span></div>' +
    '<div class="resume-ligne"><span>Total estimé</span><span style="color:var(--rouge)">' + v.prix + '€</span></div>';
}

/*
  Confirme la course et affiche l'étape 4
*/
function confirmerCourse() {
  const v = etatResa.vehicule;
  if (!v) { afficherToast('Aucun véhicule sélectionné'); return; }

  // Choisit un chauffeur aléatoirement dans le tableau
  const chauffeur = CHAUFFEURS[Math.floor(Math.random() * CHAUFFEURS.length)];

  // Affiche la carte chauffeur
  const carteChauffeur = document.getElementById('carte-chauffeur');
  if (carteChauffeur) {
    carteChauffeur.innerHTML =
      '<div class="ch-avatar">' + chauffeur.initiale + '</div>' +
      '<div class="ch-info">' +
        '<strong>' + chauffeur.nom + '</strong>' +
        '<small>' + v.icone + ' ' + v.nom + '</small>' +
        '<span class="ch-plaque">' + chauffeur.plaque + '</span>' +
      '</div>' +
      '<div class="ch-note">⭐ ' + chauffeur.note + '<small>Note</small></div>';
  }

  // Affiche le temps d'attente
  const etaEl = document.getElementById('eta');
  if (etaEl) etaEl.textContent = v.eta;

  // Sauvegarde dans l'historique
  sauvegarderHistorique();

  allerEtape(4);

  // Lance l'animation d'arrivée
  animerArriveeChauffeur(v.eta);
}

/*
  Anime la progression du chauffeur vers le client
  etaMin : minutes d'attente estimées
*/
function animerArriveeChauffeur(etaMin) {
  const fill   = document.getElementById('prog-fill');
  const statut = document.getElementById('statut-arrivee');
  const etaEl  = document.getElementById('eta');

  // Étapes de la progression avec leur délai
  const etapes = [
    { pct: 20,  msg: 'Chauffeur en route…',           delai: 800  },
    { pct: 50,  msg: 'Chauffeur à 2 minutes…',        delai: 2500 },
    { pct: 80,  msg: 'Chauffeur presque arrivé !',    delai: 4500 },
    { pct: 100, msg: '🎉 Votre chauffeur est là !',   delai: 6500 },
  ];

  // Décompte des minutes
  let restant = etaMin;
  const decompte = setInterval(function() {
    restant--;
    if (etaEl) etaEl.textContent = Math.max(0, restant);
    if (restant <= 0) clearInterval(decompte);
  }, 1000);

  // Mise à jour de la barre de progression
  etapes.forEach(function(e) {
    setTimeout(function() {
      if (fill)   fill.style.width    = e.pct + '%';
      if (statut) statut.textContent = e.msg;
    }, e.delai);
  });

  // Animation de la voiture sur la carte
  animerVoiture();
}

/*
  Sauvegarde le trajet dans l'historique local
*/
function sauvegarderHistorique() {
  const historique = JSON.parse(localStorage.getItem('rg_historique') || '[]');
  historique.unshift({ // unshift = ajoute au début du tableau
    date:     new Date().toLocaleDateString('fr-FR'),
    depart:   etatResa.depart,
    dest:     etatResa.destination,
    vehicule: etatResa.vehicule?.nom,
    prix:     etatResa.vehicule?.prix,
  });
  // Garde seulement les 20 derniers trajets
  localStorage.setItem('rg_historique', JSON.stringify(historique.slice(0, 20)));
}

/*
  Recommencer une réservation
*/
function recommencer() {
  etatResa = { depart: '', destination: '', distanceKm: 0, dureeMin: 0, vehicule: null };
  if (document.getElementById('b-depart'))      document.getElementById('b-depart').value = '';
  if (document.getElementById('b-dest'))        document.getElementById('b-dest').value   = '';
  if (document.getElementById('resultat-trajet')) document.getElementById('resultat-trajet').classList.add('cache');
  cacherCarte();
  allerEtape(1);
}


/* ── Carte simulée ── */

function afficherCarte() {
  const msg        = document.getElementById('carte-message');
  const marqA      = document.getElementById('marqueur-a');
  const marqB      = document.getElementById('marqueur-b');

  if (msg)   msg.style.display    = 'none';
  if (marqA) marqA.classList.remove('cache');
  if (marqB) marqB.classList.remove('cache');
}

function cacherCarte() {
  const msg   = document.getElementById('carte-message');
  const marqA = document.getElementById('marqueur-a');
  const marqB = document.getElementById('marqueur-b');
  const voit  = document.getElementById('voiture-carte');

  if (msg)   msg.style.display = '';
  if (marqA) marqA.classList.add('cache');
  if (marqB) marqB.classList.add('cache');
  if (voit)  voit.classList.add('cache');
}

function animerVoiture() {
  const voiture = document.getElementById('voiture-carte');
  if (!voiture) return;

  voiture.classList.remove('cache');

  // Déplace la voiture de A vers B en 3 étapes
  const positions = [
    { top: '65%', left: '30%' }, // Départ (A)
    { top: '48%', left: '50%' }, // Milieu
    { top: '30%', left: '70%' }, // Arrivée (B)
  ];

  let i = 0;
  const deplacer = function() {
    if (i >= positions.length) return;
    voiture.style.top  = positions[i].top;
    voiture.style.left = positions[i].left;
    i++;
    if (i < positions.length) setTimeout(deplacer, 2000);
  };
  deplacer();
}


/* ── Mise à jour du badge chauffeurs disponibles ── */
setInterval(function() {
  const badge = document.getElementById('nb-chauffeurs');
  if (badge) badge.textContent = 8 + Math.floor(Math.random() * 10);
}, 4000);


/* ══════════════════════════════════════════
   6. PAGE DRIVER — Devenir chauffeur
   ══════════════════════════════════════════ */

/*
  Calcule le revenu mensuel estimé
  Appelée à chaque changement du slider ou du select
*/
function calculerRevenus() {
  const slider = document.getElementById('slider-heures');
  const zone   = document.getElementById('select-zone');
  const affich = document.getElementById('affich-heures');
  const montant = document.getElementById('montant-sim');

  if (!slider || !zone) return;

  const heures      = parseInt(slider.value, 10);
  const multiplicateur = parseFloat(zone.value);

  if (affich) affich.textContent = heures + 'h';

  // Formule : heures × semaines/mois × tarif horaire moyen × zone × commission
  // 4.33 = nombre moyen de semaines par mois
  // 28€ = tarif horaire brut estimé
  // 0.85 = après 15% de commission Red Gloves
  const revenu = Math.round(heures * 4.33 * 28 * multiplicateur * 0.85);

  // toLocaleString : formate le nombre avec séparateur de milliers (ex: 2 100)
  if (montant) montant.textContent = revenu.toLocaleString('fr-FR') + '€';
}

// Lance le calcul au chargement de la page
calculerRevenus();

/*
  Envoie le formulaire de candidature chauffeur
*/
function envoyerCandidature(event) {
  event.preventDefault();

  const prenom   = document.getElementById('c-prenom')?.value.trim();
  const nom      = document.getElementById('c-nom')?.value.trim();
  const email    = document.getElementById('c-email')?.value.trim();
  const tel      = document.getElementById('c-tel')?.value.trim();
  const vtc      = document.getElementById('c-vtc')?.value.trim();
  const vehicule = document.getElementById('c-vehicule')?.value.trim();
  const cgu      = document.getElementById('c-cgu')?.checked;

  if (!prenom || !nom || !email || !tel || !vtc || !vehicule) {
    afficherToast('Veuillez remplir tous les champs obligatoires (*)');
    return;
  }
  if (!cgu) {
    afficherToast('Veuillez accepter les conditions d\'utilisation');
    return;
  }

  // Sauvegarde la candidature
  const candidatures = JSON.parse(localStorage.getItem('rg_candidatures') || '[]');
  candidatures.push({ date: new Date().toISOString(), prenom, nom, email, tel, vtc, vehicule });
  localStorage.setItem('rg_candidatures', JSON.stringify(candidatures));

  // Remplace le formulaire par un message de succès
  const form = document.getElementById('apply-form') || event.target;
  form.innerHTML =
    '<div style="text-align:center;padding:48px 0;">' +
      '<div style="font-size:3rem;margin-bottom:16px;">🎉</div>' +
      '<h2 style="font-size:1.5rem;font-weight:800;margin-bottom:12px;">Candidature reçue !</h2>' +
      '<p style="color:var(--gris-clair);line-height:1.7;max-width:380px;margin:0 auto 28px;">' +
        'Merci <strong>' + prenom + '</strong>, votre candidature a bien été enregistrée. ' +
        'Notre équipe vous contactera à <strong>' + email + '</strong> sous 48 heures.' +
      '</p>' +
      '<a href="index.html" class="btn btn-red">Retour à l\'accueil</a>' +
    '</div>';
}
