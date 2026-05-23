/* ════════════════════════════════════════════
   AUTH.JS — Connexion & Inscription
   ════════════════════════════════════════════ */

/* ── Bascule entre les onglets ── */
function changerOnglet(onglet) {
  document.querySelectorAll('.onglet').forEach(b =>
    b.classList.toggle('actif', b.dataset.onglet === onglet)
  );
  document.getElementById('form-connexion').classList.toggle('cache', onglet !== 'connexion');
  document.getElementById('form-inscription').classList.toggle('cache', onglet !== 'inscription');
}

/* ── Affichage du bloc chauffeur selon le rôle choisi ── */
document.querySelectorAll('input[name="role"]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('bloc-chauffeur').classList.toggle('cache', r.value !== 'chauffeur');
  });
});

/* ── Barre de force du mot de passe ── */
function afficherForce(val) {
  const barre  = document.getElementById('force-fill');
  const label  = document.getElementById('force-label');
  if (!barre) return;
  let score = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const niveaux = [
    { w: '20%', c: '#ef4444', t: 'Très faible' },
    { w: '45%', c: '#f97316', t: 'Faible'      },
    { w: '70%', c: '#eab308', t: 'Moyen'       },
    { w: '100%',c: '#22c55e', t: 'Fort ✓'      },
  ];
  const n = niveaux[Math.max(0, score - 1)];
  barre.style.cssText = val ? `width:${n.w};background:${n.c}` : 'width:0';
  if (label) { label.textContent = val ? n.t : ''; label.style.color = n.c; }
}

/* ══════════════════
   CONNEXION
   ══════════════════ */
document.getElementById('form-connexion')?.addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const mdp   = document.getElementById('login-mdp').value;

  if (!email || !mdp) { toast('Remplissez tous les champs', 'error'); return; }

  const user = DB.getUsers().find(u => u.email === email && u.mdp === btoa(mdp));
  if (!user) { toast('Email ou mot de passe incorrect', 'error'); return; }

  DB.saveSession(user);
  toast(`Bienvenue ${user.prenom} !`, 'success');
  setTimeout(() => window.location.href = 'dashboard.html', 900);
});

/* ══════════════════
   INSCRIPTION
   ══════════════════ */
document.getElementById('form-inscription')?.addEventListener('submit', e => {
  e.preventDefault();

  const prenom  = document.getElementById('reg-prenom').value.trim();
  const nom     = document.getElementById('reg-nom').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const tel     = document.getElementById('reg-tel').value.trim();
  const mdp     = document.getElementById('reg-mdp').value;
  const role    = document.querySelector('input[name="role"]:checked')?.value;
  const cgu     = document.getElementById('reg-cgu').checked;

  // Champs chauffeur (optionnels sauf si rôle = chauffeur)
  const vtc     = document.getElementById('reg-vtc')?.value.trim();
  const vehicule= document.getElementById('reg-vehicule')?.value.trim();

  /* Validation */
  if (!prenom || !nom || !email || !tel || !mdp || !role) {
    toast('Veuillez remplir tous les champs obligatoires', 'error'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Adresse email invalide', 'error'); return;
  }
  if (!/^(\+33|0)[0-9]{9}$/.test(tel.replace(/\s/g, ''))) {
    toast('Numéro de téléphone invalide (format : 06 XX XX XX XX)', 'error'); return;
  }
  if (mdp.length < 8) {
    toast('Mot de passe trop court (8 caractères minimum)', 'error'); return;
  }
  if (role === 'chauffeur' && (!vtc || !vehicule)) {
    toast('Les champs chauffeur (carte VTC et véhicule) sont requis', 'error'); return;
  }
  if (!cgu) { toast('Acceptez les CGU pour continuer', 'error'); return; }

  const users = DB.getUsers();
  if (users.find(u => u.email === email)) {
    toast('Cet email est déjà utilisé', 'error'); return;
  }

  const newUser = {
    id: DB.uid(), prenom, nom, email,
    tel: tel.replace(/\s/g, ''),
    mdp: btoa(mdp), role,
    vehicule: vehicule || null,
    carte_vtc: vtc || null,
    note: 5.0,
    courses_total: 0,
    revenus_total: 0,
    en_ligne: false,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  DB.saveUsers(users);
  DB.saveSession(newUser);

  toast(`Compte créé ! Bienvenue ${prenom} 🎉`, 'success');
  setTimeout(() => window.location.href = 'dashboard.html', 900);
});

/* Onglet depuis URL (#inscription) */
if (location.hash === '#inscription') changerOnglet('inscription');
