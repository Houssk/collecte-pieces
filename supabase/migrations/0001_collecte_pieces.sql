-- Collecte de pièces justificatives : agences, clients (contacts), dossiers, pièces, fichiers, journal.
-- Appliqué par Claude via le connecteur Supabase (apply_migration, nom : collecte_pieces).
-- Accès : les agents voient tout ce qui concerne leur agence ; un client (connecté par lien magique)
-- ne voit que les dossiers en cours rattachés à SON adresse e-mail.

create table public.agences (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz not null default now()
);

create table public.agents (
  agence_id uuid not null references public.agences(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'agent' check (role in ('admin','agent')),
  created_at timestamptz not null default now(),
  primary key (agence_id, user_id)
);
create index on public.agents(user_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  nom text not null,
  interlocuteur text,
  email text not null,
  telephone text,
  created_at timestamptz not null default now()
);
create index on public.contacts(agence_id);
create index on public.contacts(lower(email));

create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  titre text not null,
  echeance date,
  message text,
  statut text not null default 'en_cours' check (statut in ('en_cours','archive')),
  relances_auto boolean not null default true,
  nb_relances int not null default 0,
  derniere_relance timestamptz,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index on public.dossiers(agence_id);
create index on public.dossiers(contact_id);

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  agence_id uuid not null references public.agences(id) on delete cascade,
  nom text not null,
  aide text,
  ordre int not null default 0,
  statut text not null default 'manquante' check (statut in ('manquante','recue','validee','refusee')),
  motif text,
  updated_at timestamptz not null default now()
);
create index on public.pieces(dossier_id);

create table public.fichiers (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  agence_id uuid not null references public.agences(id) on delete cascade,
  chemin text not null unique,
  nom_fichier text not null,
  type_mime text,
  taille bigint,
  depose_par uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.fichiers(piece_id);
create index on public.fichiers(dossier_id);

create table public.journal (
  id bigint generated always as identity primary key,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  agence_id uuid not null references public.agences(id) on delete cascade,
  texte text not null,
  par uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.journal(dossier_id);

-- Fonctions d'accès (security definer : évite la récursion des règles RLS)
create or replace function public.email_courant() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.est_agent(a uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agents g where g.agence_id = a and g.user_id = auth.uid());
$$;

create or replace function public.est_admin_agence(a uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agents g where g.agence_id = a and g.user_id = auth.uid() and g.role = 'admin');
$$;

create or replace function public.est_client_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dossiers x join public.contacts c on c.id = x.contact_id
    where x.id = d and x.statut = 'en_cours' and public.email_courant() <> '' and lower(c.email) = public.email_courant()
  );
$$;

create or replace function public.agence_du_dossier(d uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select x.agence_id from public.dossiers x where x.id = d;
$$;

-- Premier dossier d'un chemin de stockage = dossier_id (null si invalide)
create or replace function public.dossier_du_chemin(chemin text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return (string_to_array(chemin, '/'))[1]::uuid;
exception when others then
  return null;
end;
$$;

-- Règles d'accès
alter table public.agences enable row level security;
alter table public.agents enable row level security;
alter table public.contacts enable row level security;
alter table public.dossiers enable row level security;
alter table public.pieces enable row level security;
alter table public.fichiers enable row level security;
alter table public.journal enable row level security;

create policy agences_lecture on public.agences for select to authenticated
  using (public.est_agent(id) or exists (select 1 from public.dossiers x where x.agence_id = agences.id and public.est_client_dossier(x.id)));
create policy agences_maj on public.agences for update to authenticated
  using (public.est_admin_agence(id)) with check (public.est_admin_agence(id));

create policy agents_lecture on public.agents for select to authenticated
  using (user_id = (select auth.uid()) or public.est_agent(agence_id));
create policy agents_suppr on public.agents for delete to authenticated
  using (public.est_admin_agence(agence_id) and user_id <> (select auth.uid()));

create policy contacts_agents on public.contacts for all to authenticated
  using (public.est_agent(agence_id)) with check (public.est_agent(agence_id));
create policy contacts_client on public.contacts for select to authenticated
  using (public.email_courant() <> '' and lower(email) = public.email_courant());

create policy dossiers_agents_lecture on public.dossiers for select to authenticated
  using (public.est_agent(agence_id) or public.est_client_dossier(id));
create policy dossiers_agents_maj on public.dossiers for update to authenticated
  using (public.est_agent(agence_id)) with check (public.est_agent(agence_id));
create policy dossiers_agents_suppr on public.dossiers for delete to authenticated
  using (public.est_admin_agence(agence_id));

create policy pieces_lecture on public.pieces for select to authenticated
  using (public.est_agent(agence_id) or public.est_client_dossier(dossier_id));
create policy pieces_agents_ajout on public.pieces for insert to authenticated
  with check (public.est_agent(agence_id) and public.agence_du_dossier(dossier_id) = agence_id);
create policy pieces_agents_maj on public.pieces for update to authenticated
  using (public.est_agent(agence_id)) with check (public.est_agent(agence_id));
create policy pieces_agents_suppr on public.pieces for delete to authenticated
  using (public.est_agent(agence_id));

create policy fichiers_lecture on public.fichiers for select to authenticated
  using (public.est_agent(agence_id) or public.est_client_dossier(dossier_id));
create policy fichiers_ajout on public.fichiers for insert to authenticated
  with check (
    depose_par = (select auth.uid())
    and public.dossier_du_chemin(chemin) = dossier_id
    and public.agence_du_dossier(dossier_id) = agence_id
    and exists (select 1 from public.pieces p where p.id = piece_id and p.dossier_id = fichiers.dossier_id)
    and (public.est_agent(agence_id) or public.est_client_dossier(dossier_id))
  );
create policy fichiers_suppr on public.fichiers for delete to authenticated
  using (public.est_agent(agence_id));

create policy journal_lecture on public.journal for select to authenticated
  using (public.est_agent(agence_id));

-- Actions métier (RPC)
create or replace function public.creer_agence(nom text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  nouvel_id uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if coalesce(trim(nom), '') = '' then raise exception 'Nom obligatoire'; end if;
  insert into public.agences (nom) values (trim(nom)) returning id into nouvel_id;
  insert into public.agents (agence_id, user_id, email, role) values (nouvel_id, auth.uid(), public.email_courant(), 'admin');
  return nouvel_id;
end;
$$;

create or replace function public.ajouter_agent(a uuid, adresse text, role_agent text default 'agent') returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  if not public.est_admin_agence(a) then raise exception 'Réservé aux administrateurs de l''agence'; end if;
  if role_agent not in ('admin','agent') then raise exception 'Rôle invalide'; end if;
  select u.id into uid from auth.users u where lower(u.email) = lower(trim(adresse));
  if uid is null then raise exception 'Cette personne doit d''abord se connecter une fois à l''application'; end if;
  insert into public.agents (agence_id, user_id, email, role) values (a, uid, lower(trim(adresse)), role_agent)
  on conflict (agence_id, user_id) do update set role = excluded.role;
end;
$$;

-- pieces_demandees : [{"nom": "...", "aide": "..."}, ...]
create or replace function public.creer_dossier(contact uuid, titre text, echeance date, message text, relances_auto boolean, pieces_demandees jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  ag uuid;
  nouvel_id uuid;
  p jsonb;
  i int := 0;
begin
  select c.agence_id into ag from public.contacts c where c.id = contact;
  if ag is null or not public.est_agent(ag) then raise exception 'Client introuvable'; end if;
  if coalesce(trim(titre), '') = '' then raise exception 'Intitulé obligatoire'; end if;
  if jsonb_typeof(pieces_demandees) <> 'array' or jsonb_array_length(pieces_demandees) = 0 then raise exception 'Choisissez au moins une pièce'; end if;
  insert into public.dossiers (agence_id, contact_id, titre, echeance, message, relances_auto)
  values (ag, contact, trim(titre), echeance, message, coalesce(relances_auto, true)) returning id into nouvel_id;
  for p in select * from jsonb_array_elements(pieces_demandees) loop
    i := i + 1;
    insert into public.pieces (dossier_id, agence_id, nom, aide, ordre)
    values (nouvel_id, ag, trim(p ->> 'nom'), nullif(trim(coalesce(p ->> 'aide', '')), ''), i);
  end loop;
  insert into public.journal (dossier_id, agence_id, texte, par) values (nouvel_id, ag, 'Dossier créé (' || i || ' pièces demandées)', auth.uid());
  return nouvel_id;
end;
$$;

-- Appelé après le dépôt d'un fichier (client ou agent)
create or replace function public.signaler_depot(piece uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.pieces;
begin
  select * into p from public.pieces where id = piece for update;
  if not found then raise exception 'Pièce introuvable'; end if;
  if not (public.est_client_dossier(p.dossier_id) or public.est_agent(p.agence_id)) then raise exception 'Action non autorisée'; end if;
  if not exists (select 1 from public.fichiers f where f.piece_id = piece) then raise exception 'Aucun fichier déposé'; end if;
  if p.statut = 'validee' then return; end if;
  update public.pieces set statut = 'recue', motif = null, updated_at = now() where id = piece;
  insert into public.journal (dossier_id, agence_id, texte, par) values (p.dossier_id, p.agence_id, 'Pièce déposée : ' || p.nom, auth.uid());
end;
$$;

create or replace function public.decider_piece(piece uuid, decision text, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.pieces;
begin
  select * into p from public.pieces where id = piece for update;
  if not found then raise exception 'Pièce introuvable'; end if;
  if not public.est_agent(p.agence_id) then raise exception 'Réservé à l''agence'; end if;
  if decision not in ('validee','refusee','manquante') then raise exception 'Décision invalide'; end if;
  update public.pieces set statut = decision, motif = case when decision = 'refusee' then nullif(trim(note), '') else null end, updated_at = now() where id = piece;
  insert into public.journal (dossier_id, agence_id, texte, par)
  values (p.dossier_id, p.agence_id,
    case decision when 'validee' then 'Pièce validée : ' when 'refusee' then 'Pièce refusée : ' else 'Pièce redemandée : ' end || p.nom
    || coalesce(' (' || nullif(trim(note), '') || ')', ''), auth.uid());
end;
$$;

create or replace function public.noter_relance(d uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ag uuid := public.agence_du_dossier(d);
begin
  if ag is null or not public.est_agent(ag) then raise exception 'Réservé à l''agence'; end if;
  update public.dossiers set nb_relances = nb_relances + 1, derniere_relance = now() where id = d;
  insert into public.journal (dossier_id, agence_id, texte, par) values (d, ag, 'Relance envoyée au client', auth.uid());
end;
$$;

create or replace function public.archiver_dossier(d uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ag uuid := public.agence_du_dossier(d);
begin
  if ag is null or not public.est_agent(ag) then raise exception 'Réservé à l''agence'; end if;
  if exists (select 1 from public.pieces p where p.dossier_id = d and p.statut <> 'validee') then
    raise exception 'Toutes les pièces doivent être validées avant l''archivage';
  end if;
  update public.dossiers set statut = 'archive', archived_at = now() where id = d;
  insert into public.journal (dossier_id, agence_id, texte, par) values (d, ag, 'Dossier archivé', auth.uid());
end;
$$;

-- Droits d'exécution : jamais pour les visiteurs non connectés
revoke execute on function public.email_courant() from public, anon;
revoke execute on function public.est_agent(uuid) from public, anon;
revoke execute on function public.est_admin_agence(uuid) from public, anon;
revoke execute on function public.est_client_dossier(uuid) from public, anon;
revoke execute on function public.agence_du_dossier(uuid) from public, anon;
revoke execute on function public.creer_agence(text) from public, anon;
revoke execute on function public.ajouter_agent(uuid, text, text) from public, anon;
revoke execute on function public.creer_dossier(uuid, text, date, text, boolean, jsonb) from public, anon;
revoke execute on function public.signaler_depot(uuid) from public, anon;
revoke execute on function public.decider_piece(uuid, text, text) from public, anon;
revoke execute on function public.noter_relance(uuid) from public, anon;
revoke execute on function public.archiver_dossier(uuid) from public, anon;
grant execute on function public.email_courant() to authenticated;
grant execute on function public.est_agent(uuid) to authenticated;
grant execute on function public.est_admin_agence(uuid) to authenticated;
grant execute on function public.est_client_dossier(uuid) to authenticated;
grant execute on function public.agence_du_dossier(uuid) to authenticated;
grant execute on function public.creer_agence(text) to authenticated;
grant execute on function public.ajouter_agent(uuid, text, text) to authenticated;
grant execute on function public.creer_dossier(uuid, text, date, text, boolean, jsonb) to authenticated;
grant execute on function public.signaler_depot(uuid) to authenticated;
grant execute on function public.decider_piece(uuid, text, text) to authenticated;
grant execute on function public.noter_relance(uuid) to authenticated;
grant execute on function public.archiver_dossier(uuid) to authenticated;

-- Stockage : bucket privé, chemin <dossier_id>/<piece_id>/<fichier>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pieces', 'pieces', false, 20971520, array['image/*','application/pdf']);

create policy pieces_stockage_lecture on storage.objects for select to authenticated
  using (bucket_id = 'pieces' and (
    public.est_agent(public.agence_du_dossier(public.dossier_du_chemin(name)))
    or public.est_client_dossier(public.dossier_du_chemin(name))
  ));
create policy pieces_stockage_ajout on storage.objects for insert to authenticated
  with check (bucket_id = 'pieces' and (
    public.est_agent(public.agence_du_dossier(public.dossier_du_chemin(name)))
    or public.est_client_dossier(public.dossier_du_chemin(name))
  ));
create policy pieces_stockage_suppr on storage.objects for delete to authenticated
  using (bucket_id = 'pieces' and public.est_agent(public.agence_du_dossier(public.dossier_du_chemin(name))));
