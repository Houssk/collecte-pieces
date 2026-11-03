# Collecte de pièces justificatives

Un espace en ligne pour demander des documents à un client et suivre ce qu'il a envoyé, sans échanges de mails interminables.

- **L'agence** crée un dossier, coche les pièces à demander, envoie un lien. Elle voit en temps réel ce qui est arrivé, valide ou refuse chaque pièce (avec un motif), relance, télécharge tout en un zip, archive.
- **Le client** reçoit un e-mail, touche le bouton, et dépose chaque document (photo ou PDF, glisser-déposer ou appareil photo). Il voit ce qui manque et pourquoi une pièce est refusée. Ni compte ni mot de passe.

Maquette, spec et tests : dossier [`docs/`](docs/).

---

## Démarrer (Karim) : ce qu'il faut avant la première session

À faire **une seule fois** (environ 15 min, à deux avec Houssam la première fois) :

1. **Comptes** : GitHub, Supabase (supabase.com), Vercel (vercel.com, « Continue with GitHub »).
2. **Vercel ↔ GitHub** : github.com > Settings > Applications > Vercel > Configure > **« All repositories »** > Save. Sans ça, Vercel ne voit pas les nouveaux dépôts.
3. **Connecteurs Claude** : sur claude.ai > Paramètres > Connecteurs, connecter **Supabase** et **Vercel** (accepter tous les droits proposés).
4. **Ton dépôt** : sur la page GitHub de ce modèle, bouton **« Use this template »** > nom du projet (ex. `pieces-cabinet-karim`) > Private > Create. (Si le bouton n'apparaît pas : demander à Houssam de t'ajouter comme collaborateur du modèle.)

## Démarrer : la première session Claude Code

Ouvre une session Claude Code (cloud) **sur ton nouveau dépôt** et colle :

```
Mets en place le projet <nom-du-projet> en suivant la section « Mise en place » de CLAUDE.md.
Enchaîne sans t'arrêter tant que tout est OK. Au premier blocage, dis-moi exactement
quoi cliquer (avec le lien) et arrête-toi. À la fin, donne-moi l'URL, le seul réglage
manuel à faire, et comment tester sur mon téléphone.
```

Claude crée la base Supabase (région Paris), applique le schéma et ses règles de sécurité, vérifie l'isolation, crée le projet Vercel, déploie, et te donne l'URL. Il restera **un seul réglage de 30 secondes** dans Supabase (adresse du site pour les liens de connexion) : Claude te donne le lien direct.

Premier test : ouvre l'URL, connecte-toi avec ton e-mail, crée ton espace agence, puis un dossier test avec **une autre adresse e-mail à toi** comme client.

## Faire évoluer l'outil : le déroulé en 4 étapes

Chaque évolution suit le même chemin : **design → spec → test → livraison**. Claude ne passe à l'étape suivante qu'après ton « OK ». Prompt à coller :

```
Nouvelle évolution : <décris le besoin en une ou deux phrases, avec un exemple concret>.
Suis le déroulé design → spec → test → livraison de CLAUDE.md, et attends mon OK à chaque étape.
```

| Étape | Ce que fait Claude | Ce que tu fais |
|---|---|---|
| 1. Design | Montre l'écran modifié (maquette ou description écran par écran) | Tu valides ou tu corriges |
| 2. Spec | Ajoute l'évolution à `docs/SPEC.md` : qui, quoi, règles, critères « c'est fini quand… » | Tu relis, tu valides |
| 3. Test | Écrit les tests (sécurité de la base + liste de vérifications sur téléphone dans `docs/TESTS.md`), code, et fait passer les tests | Rien, ou tu réponds à ses questions |
| 4. Livraison | Pousse sur `main`, vérifie le déploiement Vercel, note l'évolution dans `CHANGELOG.md`, te donne la liste de vérifications | Tu testes sur ton téléphone, tu dis OK ou ce qui cloche |

Exemples d'évolutions : « ajouter un modèle de pièces pour les flottes automobiles », « afficher le numéro de contrat sur le dossier », « pouvoir commenter une pièce sans la refuser ».

## Prompts utiles

```
Ça ne marche pas : <ce que je fais, ce que je vois, ce que j'attendais>. Trouve la cause,
explique-la en une phrase, corrige, et dis-moi comment vérifier.
```
```
Fais une revue de sécurité avant que je partage l'outil à des clients : règles d'accès
de la base, fichiers, variables Vercel. Liste ce qui est OK et ce qui ne l'est pas.
```
```
Fin de session : résume ce qui a été fait, ce qui reste, et ce que je dois vérifier.
```

## Limites connues (version de départ)

- **E-mails** : envoyés par le service intégré de Supabase, limité à quelques e-mails par heure. Pour un vrai usage, brancher un serveur d'envoi (Supabase > Authentication > Emails > SMTP). C'est aussi ce qui permettra les **relances automatiques** (prévues, pas encore actives) ; la relance manuelle fonctionne.
- **Conservation** : les documents restent tant que le dossier existe. Définir une durée (ex. suppression 3 mois après archivage) avant la mise en production.
