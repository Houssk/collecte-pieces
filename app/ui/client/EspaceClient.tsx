"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { avancement, messageErreur, SELECT_DOSSIER, supabase, trierPieces, type Dossier } from "../../../lib/supabase";
import DossierClient from "./DossierClient";

export default function EspaceClient({ session }: { session: Session }) {
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [agences, setAgences] = useState<Record<string, string>>({});
  const [ouvert, setOuvert] = useState<string>("");
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("dossiers").select(SELECT_DOSSIER).eq("statut", "en_cours").order("created_at", { ascending: false });
    if (error) return setErreur(messageErreur(error));
    const liste = ((data ?? []) as unknown as Dossier[]).map(trierPieces);
    setDossiers(liste);
    const ids = [...new Set(liste.map((d) => d.agence_id))];
    if (ids.length) {
      const { data: ag } = await supabase.from("agences").select("id, nom").in("id", ids);
      setAgences(Object.fromEntries((ag ?? []).map((a) => [a.id, a.nom])));
    }
    if (liste.length === 1) setOuvert(liste[0].id);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const d = dossiers?.find((x) => x.id === ouvert);
  const entete = (
    <header className="entete">
      <div className="entete-int">
        <span className="marque" style={{ flex: 1 }}>{d ? agences[d.agence_id] ?? "" : "Mes dossiers"}</span>
        <button className="lien petit" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </div>
    </header>
  );

  if (erreur) return <>{entete}<main className="conteneur"><p className="message message-ko">{erreur}</p></main></>;
  if (!dossiers) return <>{entete}<main className="conteneur"><p className="gris">Chargement…</p></main></>;
  if (d) return <>{entete}<DossierClient dossier={d} prenom={d.contacts?.interlocuteur ?? ""} recharger={charger} retour={dossiers.length > 1 ? () => setOuvert("") : undefined} /></>;

  return (
    <>
      {entete}
      <main className="conteneur etroit">
        <h1>Vos demandes de documents</h1>
        <p className="gris">Connecté avec {session.user.email}</p>
        <div className="pile" style={{ gap: 12 }}>
          {dossiers.map((x) => {
            const a = avancement(x);
            return (
              <button key={x.id} className="carte pile" style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }} onClick={() => setOuvert(x.id)}>
                <strong>{x.titre}</strong>
                <span className="gris petit">{agences[x.agence_id]} · {a.recues} sur {a.total} documents reçus</span>
                <span className="barre" style={{ flex: "none" }}><span style={{ width: a.pct + "%" }} /></span>
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}
