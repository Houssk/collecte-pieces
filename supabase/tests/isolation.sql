-- Test d'isolation. À lancer avec execute_sql (connecteur Supabase) APRÈS la migration.
-- Tout est annulé à la fin : la requête « échoue » volontairement avec le message RESULTAT.
-- Attendu : A dossiers=1 | B dossiers=0 | client dossiers=1 | client pieces=2 | client maj directe lignes=0 | client depot OK | client decide: refuse(OK) | client journal=0 | intrus dossiers=0 | intrus depot: refuse(OK) | intrus fichier: refuse(OK) | archive incomplet: refuse(OK) | A valide puis archive OK | client apres archive dossiers=0
do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ui uuid := gen_random_uuid();
  aa uuid; ab uuid; ct uuid; d uuid; p1 uuid; p2 uuid; n int; r text := '';
begin
  insert into auth.users (id, email, aud, role) values
    (ua, 'agent-a@test.local', 'authenticated', 'authenticated'),
    (ub, 'agent-b@test.local', 'authenticated', 'authenticated'),
    (uc, 'client@test.local', 'authenticated', 'authenticated'),
    (ui, 'intrus@test.local', 'authenticated', 'authenticated');
  execute 'set local role authenticated';

  -- Agent A crée son agence, un client et un dossier de 2 pièces
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated', 'email', 'agent-a@test.local')::text, true);
  aa := public.creer_agence('Agence A');
  insert into public.contacts (agence_id, nom, email) values (aa, 'Client test', 'Client@Test.local') returning id into ct;
  d := public.creer_dossier(ct, 'Dossier test', null, null, true, '[{"nom":"Kbis"},{"nom":"RIB"}]'::jsonb);
  select id into p1 from public.pieces where dossier_id = d and nom = 'Kbis';
  select id into p2 from public.pieces where dossier_id = d and nom = 'RIB';
  select count(*) into n from public.dossiers; r := r || 'A dossiers=' || n;

  -- Agent B (autre agence) ne voit rien
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated', 'email', 'agent-b@test.local')::text, true);
  ab := public.creer_agence('Agence B');
  select count(*) into n from public.dossiers; r := r || ' | B dossiers=' || n;

  -- Le client voit son dossier, dépose, ne peut ni modifier ni décider
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated', 'email', 'client@test.local')::text, true);
  select count(*) into n from public.dossiers; r := r || ' | client dossiers=' || n;
  select count(*) into n from public.pieces; r := r || ' | client pieces=' || n;
  update public.pieces set statut = 'validee' where id = p1;
  get diagnostics n = row_count; r := r || ' | client maj directe lignes=' || n;
  insert into public.fichiers (piece_id, dossier_id, agence_id, chemin, nom_fichier) values (p1, d, aa, d || '/' || p1 || '/kbis.pdf', 'kbis.pdf');
  perform public.signaler_depot(p1);
  r := r || ' | client depot OK';
  begin
    perform public.decider_piece(p1, 'validee');
    r := r || ' | client decide: ACCEPTE(KO)';
  exception when others then r := r || ' | client decide: refuse(OK)'; end;
  select count(*) into n from public.journal; r := r || ' | client journal=' || n;

  -- Un autre utilisateur connecté ne voit rien et ne peut rien déposer
  perform set_config('request.jwt.claims', json_build_object('sub', ui, 'role', 'authenticated', 'email', 'intrus@test.local')::text, true);
  select count(*) into n from public.dossiers; r := r || ' | intrus dossiers=' || n;
  begin
    perform public.signaler_depot(p1);
    r := r || ' | intrus depot: ACCEPTE(KO)';
  exception when others then r := r || ' | intrus depot: refuse(OK)'; end;
  begin
    insert into public.fichiers (piece_id, dossier_id, agence_id, chemin, nom_fichier) values (p2, d, aa, d || '/' || p2 || '/x.pdf', 'x.pdf');
    r := r || ' | intrus fichier: ACCEPTE(KO)';
  exception when others then r := r || ' | intrus fichier: refuse(OK)'; end;

  -- Agent A : archivage refusé tant que tout n'est pas validé, puis accepté
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated', 'email', 'agent-a@test.local')::text, true);
  begin
    perform public.archiver_dossier(d);
    r := r || ' | archive incomplet: ACCEPTE(KO)';
  exception when others then r := r || ' | archive incomplet: refuse(OK)'; end;
  perform public.decider_piece(p1, 'validee');
  perform public.decider_piece(p2, 'validee');
  perform public.archiver_dossier(d);
  r := r || ' | A valide puis archive OK';

  -- Dossier archivé : le client ne le voit plus
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated', 'email', 'client@test.local')::text, true);
  select count(*) into n from public.dossiers; r := r || ' | client apres archive dossiers=' || n;

  raise exception 'RESULTAT: %', r;
end $$;
