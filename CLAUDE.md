# CLAUDE.md : collecte de pièces justificatives

L'utilisateur n'est pas développeur. Réponds en français, phrases courtes, sans jargon (un terme technique inévitable = une ligne d'explication). Fais toi-même tout ce que les connecteurs permettent ; pour une action manuelle : étapes numérotées, clic par clic, lien direct. Ne demande jamais de coller une clé secrète dans le chat.

## Règles fixes
- **Aucune clé secrète** (`service_role`, `sb_secret_`) dans le code, Vercel ou le chat. L'app n'utilise que la clé publique ; la sécurité repose sur les règles RLS de `supabase/migrations/`.
- **Connecteur Vercel : ne jamais passer `teamId` ni `slug`** (provoque un 403 sur un compte Hobby). Laisser l'équipe par défaut.
- Toute évolution de la base = nouveau fichier `supabase/migrations/NNNN_nom.sql` (jamais modifier un fichier déjà appliqué), appliqué avec `apply_migration`, puis `get_advisors` (security), puis `supabase/tests/isolation.sql` complété pour couvrir l'évolution.
- Avant toute action irréversible (suppression de projet, table, données, fichiers) : expliquer et attendre l'accord.
- Avant chaque push : `npm run build` doit passer.

## Mise en place (quand on te demande « mets en place le projet <nom> »)
Tableau OK / KO à chaque étape ; au premier KO bloquant, dis exactement quoi cliquer et arrête-toi.
1. Vérifie : push possible sur ce dépôt ; connecteurs Supabase (`list_organizations`) et Vercel (`list_projects` sans `teamId`) répondent ; `npm ci` puis `npm run build` passent.
2. Supabase : `create_project` nom `<nom>`, région `eu-west-3` (Paris), dans l'organisation de l'utilisateur (s'il y en a plusieurs, demande laquelle ; annonce le coût éventuel avant de créer). Attends `ACTIVE_HEALTHY`.
3. Applique `supabase/migrations/*.sql` dans l'ordre (`apply_migration`, nom = nom du fichier sans numéro ni extension). Puis `get_advisors` security : seuls sont acceptables les avertissements « Signed-In Users Can Execute SECURITY DEFINER Function » sur `email_courant`, `est_agent`, `est_admin_agence`, `est_client_dossier`, `agence_du_dossier`, `creer_agence`, `ajouter_agent`, `creer_dossier`, `signaler_depot`, `decider_piece`, `noter_relance`, `archiver_dossier` (voulus). Puis `execute_sql` avec le contenu de `supabase/tests/isolation.sql` : le message RESULTAT doit correspondre exactement à la ligne « Attendu » du fichier.
4. `get_publishable_keys` : clé `sb_publishable_…` non désactivée ; URL `https://<ref>.supabase.co`.
5. Vercel : `create_project` (sans `teamId`) nom `<nom>`, framework `nextjs`, `gitRepository` = ce dépôt (`type: github`), variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (type plain, production + preview + development). Si `repo_not_found` : faire passer l'App GitHub Vercel en « All repositories » (README, étape 2), puis réessayer.
6. `create_deployment` target `production` depuis `main` ; suivre avec `get_deployment` jusqu'à `READY`. Si le nom est pris, l'URL réelle est dans `alias` : utilise celle-là.
7. Donne le seul réglage manuel, lien `https://supabase.com/dashboard/project/<ref>/auth/url-configuration` : Site URL = l'URL Vercel ; Redirect URLs += `<URL Vercel>/**`. Facultatif (recommandé) : Authentication > Emails > Magic Link, objet « Votre lien pour accéder à votre dossier ».
8. Remplis `SETUP.md` (ref Supabase, URL Vercel, date), commit, push. Termine par la recette de `docs/TESTS.md` (partie « Recette sur téléphone ») et un retour d'expérience court.

## Déroulé de toute évolution : design → spec → test → livraison
Attends le « OK » de l'utilisateur à la fin de chaque étape avant de passer à la suivante. Une évolution à la fois.
1. **Design** : reformule le besoin en une phrase, puis montre ce qui change à l'écran. Si l'outil Artifact est disponible, mets à jour ou crée une maquette ; sinon décris chaque écran touché (titre, éléments, textes exacts des boutons). Respecte `docs/MAQUETTE.md` (couleurs, boutons pilule, textes simples pour des clients peu à l'aise avec l'informatique).
2. **Spec** : ajoute une section à `docs/SPEC.md` : objectif, qui l'utilise, règles métier, ce que voit le client, ce que voit l'agence, critères « c'est fini quand… » (vérifiables). Signale tout impact sécurité ou données personnelles.
3. **Test** : écris d'abord les vérifications : ligne(s) ajoutée(s) dans `supabase/tests/isolation.sql` (avec la ligne « Attendu » mise à jour) si la base change, et cas ajoutés à `docs/TESTS.md` (recette sur téléphone). Puis code. Puis fais passer : `npm run build`, migration appliquée, advisors, test d'isolation. Montre les résultats réels, pas un résumé.
4. **Livraison** : commit (message clair en français) et push sur `main` ; suis le déploiement Vercel jusqu'à `READY` (`list_deployments`, `get_deployment`) ; ajoute une ligne datée dans `CHANGELOG.md` ; donne à l'utilisateur la liste exacte des vérifications à faire sur son téléphone. En cas d'échec de build Vercel : lis les logs, corrige, recommence.

## Architecture (à respecter)
- `lib/supabase.ts` : client (clé publique), types, libellés de statut, `envoyerLien` (lien de connexion par e-mail, sert aussi de relance). `lib/modeles.ts` : modèles de listes de pièces.
- `app/ui/Routeur.tsx` : après connexion, agent d'une agence → `agence/EspaceAgence` ; sinon → `client/EspaceClient` (dossiers en cours rattachés à son e-mail).
- Données : `agences`, `agents` (admin/agent), `contacts` (le client final, identifié par son e-mail), `dossiers` (en_cours/archive), `pieces` (manquante → recue → validee/refusee), `fichiers`, `journal`.
- Fichiers : bucket privé `pieces`, chemin `<dossier_id>/<piece_id>/<fichier>`, lecture par URL signée.
- Changements d'état uniquement via les fonctions SQL : `creer_dossier`, `signaler_depot`, `decider_piece`, `noter_relance`, `archiver_dossier` (toutes journalisées).
- Relances automatiques et e-mails personnalisés : future Edge Function Supabase + fournisseur d'e-mail (seule clé secrète du projet, stockée dans les secrets Supabase, jamais dans le dépôt).
