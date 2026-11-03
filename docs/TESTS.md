# Tests

## 1. Automatique : sécurité de la base (Claude)
`supabase/tests/isolation.sql`, lancé avec `execute_sql`. Crée des utilisateurs fictifs, vérifie qu'une agence ne voit pas les dossiers d'une autre, qu'un client ne voit que les siens, ne peut ni valider ni lire l'historique, qu'un inconnu ne peut rien déposer, et que l'archivage exige toutes les pièces validées. Tout est annulé à la fin. Le résultat doit être exactement la ligne « Attendu ».

## 2. Automatique : l'application se construit (Claude)
`npm run build` sans erreur avant chaque push, puis déploiement Vercel `READY`.

## 3. Recette sur téléphone (Karim, environ 10 min)
Prévoir deux adresses e-mail : A (agence) et B (client test).

1. Sur l'ordinateur, ouvrir l'URL, se connecter avec A, créer l'espace agence.
2. Nouveau dossier : client test avec l'adresse B, modèle « Multirisque professionnelle », garder 3 pièces cochées, Créer et envoyer.
3. Sur le téléphone, ouvrir l'e-mail reçu sur B, toucher le bouton : le dossier s'ouvre avec les 3 pièces, « 0 sur 3 reçus ».
4. Pièce 1 : prendre une photo. Elle passe « Reçu », compteur « 1 sur 3 ».
5. Sur l'ordinateur (A) : le dossier passe « À vérifier ». Ouvrir, Voir la photo, Refuser avec le motif « photo floue ».
6. Sur le téléphone : recharger, la pièce 1 affiche « À refaire » et le motif. Renvoyer une photo.
7. Sur le téléphone, déposer les pièces 2 et 3 (dont un PDF). Message « Merci, tout est arrivé ».
8. Sur l'ordinateur : valider les 3 pièces, Tout télécharger (le zip contient un dossier par pièce), Archiver.
9. Sur le téléphone : recharger, le dossier n'apparaît plus.
10. Sur l'ordinateur, glisser-déposer un PDF sur une pièce d'un nouveau dossier test : il arrive.

Chaque évolution ajoute ses cas ici.
