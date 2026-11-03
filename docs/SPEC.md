# Spécification fonctionnelle

Chaque évolution ajoute une section en bas (déroulé de CLAUDE.md, étape 2).

## 1. Version de départ

**Problème** : la liste de documents part par mail, le client ne répond pas ou renvoie des fichiers inutiles ; personne ne sait ce qui manque.

**Utilisateurs** : l'agence (agents, un administrateur) ; le client final (souvent peu à l'aise avec l'informatique).

### Agence
- Se connecte par lien e-mail. La première connexion propose de créer l'espace agence (la personne devient administrateur).
- **Tableau de bord** : dossiers en cours avec client, intitulé, pièces reçues / demandées, statut (En attente du client, Envoi partiel, À vérifier, Complet), dernière relance ; recherche ; filtres ; onglet Archives.
- **Nouveau dossier** : client nouveau ou existant (nom, interlocuteur, e-mail, téléphone) ; intitulé ; date limite ; pièces cochées à partir d'un modèle (`lib/modeles.ts`) + pièces libres ; message. « Créer et envoyer le lien » crée le dossier et envoie au client un e-mail de connexion.
- **Suivi d'un dossier** : chaque pièce avec son statut et ses fichiers ; Voir (lien temporaire 10 min) ; Valider ; Refuser avec motif visible par le client ; Relancer (renvoie un lien) ; Tout télécharger (.zip, un dossier par pièce) ; Archiver (seulement quand toutes les pièces sont validées) ; historique daté.
- **Équipe** (administrateur) : ajouter un collègue déjà connecté une fois, comme agent ou administrateur.

### Client
- Reçoit un e-mail, touche le bouton, arrive directement sur son dossier (s'il en a plusieurs, il choisit).
- Voit : qui demande, combien de documents sont reçus, la date limite, et une carte par pièce (nom, aide, statut).
- Dépose : une zone par pièce, glisser-déposer sur ordinateur, « prendre une photo ou choisir un fichier » sur téléphone ; plusieurs fichiers possibles ; photos et PDF, 20 Mo max.
- Pièce refusée : le motif s'affiche, il renvoie un document.
- Quand tout est reçu : message de remerciement.
- Ne voit jamais les dossiers d'un autre client ni l'historique interne de l'agence. Un dossier archivé disparaît de son espace.

### Règles
- Statuts d'une pièce : manquante → recue (au dépôt) → validee ou refusee (par l'agence) ; une pièce refusée repasse en recue au nouveau dépôt.
- Un client est reconnu par son adresse e-mail : il voit les dossiers en cours dont le client a cette adresse.
- Données hébergées en France (Supabase eu-west-3).

### C'est fini quand…
- Le test `supabase/tests/isolation.sql` donne exactement la ligne « Attendu ».
- La recette de `docs/TESTS.md` passe entièrement sur un téléphone et un ordinateur.

### Hors périmètre (prévu ensuite)
- Relances automatiques (Edge Function planifiée + fournisseur d'e-mail).
- Durée de conservation et suppression automatique après archivage.
- Envoi direct à la compagnie.
