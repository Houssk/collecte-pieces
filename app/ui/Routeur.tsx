"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { messageErreur, supabase, type Agence } from "../../lib/supabase";
import EspaceAgence from "./agence/EspaceAgence";
import EspaceClient from "./client/EspaceClient";
import Logo from "./Logo";

// Après connexion : agent d'une agence → espace agence ; sinon → dossiers du client.
export default function Routeur({ session }: { session: Session }) {
  const [agences, setAgences] = useState<Agence[] | null>(null);
  const [nbDossiersClient, setNbDossiersClient] = useState<number | null>(null);
  const [creation, setCreation] = useState(false);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("agents").select("role, agences(id, nom)").eq("user_id", session.user.id);
    if (error) return setErreur(messageErreur(error));
    const liste = (data ?? []).flatMap((m) => {
      const a = m.agences as unknown as { id: string; nom: string } | null;
      return a ? [{ id: a.id, nom: a.nom, role: m.role as Agence["role"] }] : [];
    });
    setAgences(liste);
    if (liste.length === 0) {
      const { count } = await supabase.from("dossiers").select("id", { count: "exact", head: true });
      setNbDossiersClient(count ?? 0);
    }
  }, [session.user.id]);

  useEffect(() => { charger(); }, [charger]);

  async function creerAgence(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nom = String(new FormData(e.currentTarget).get("nom") ?? "");
    const { error } = await supabase.rpc("creer_agence", { nom });
    if (error) return setErreur(messageErreur(error));
    charger();
  }

  if (erreur) return <div className="conteneur"><p className="message message-ko">{erreur}</p></div>;
  if (!agences) return <div className="conteneur"><p className="gris">Chargement…</p></div>;
  if (agences.length > 0) return <EspaceAgence session={session} agences={agences} />;
  if (nbDossiersClient === null) return <div className="conteneur"><p className="gris">Chargement…</p></div>;
  if (nbDossiersClient > 0) return <EspaceClient session={session} />;

  return (
    <div className="centre">
      <header className="entete-int" style={{ maxWidth: 1120, width: "100%" }}><Logo /><span className="marque">Pièces</span></header>
      <main>
        <div className="boite">
          <div className="pile">
            <h1>Aucun dossier en cours</h1>
            <p className="gris">Connecté avec {session.user.email}. Si vous attendiez une demande de documents, vérifiez que c'est bien l'adresse communiquée à votre conseiller.</p>
          </div>
          {!creation && <button className="lien" style={{ alignSelf: "flex-start" }} onClick={() => setCreation(true)}>Vous êtes une agence ? Créer votre espace</button>}
          {creation && (
            <form onSubmit={creerAgence} className="carte pile" style={{ gap: 14 }}>
              <label htmlFor="nom">Nom de l'agence ou du cabinet</label>
              <input id="nom" name="nom" type="text" required />
              <button className="btn" type="submit">Créer l'espace agence</button>
            </form>
          )}
          <button className="lien" style={{ alignSelf: "flex-start" }} onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </div>
      </main>
    </div>
  );
}
