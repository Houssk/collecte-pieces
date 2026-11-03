"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Agence } from "../../../lib/supabase";
import Logo from "../Logo";
import Tableau from "./Tableau";
import NouveauDossier from "./NouveauDossier";
import DossierAgence from "./DossierAgence";
import Equipe from "./Equipe";

type Vue = { nom: "tableau"; archives: boolean } | { nom: "nouveau" } | { nom: "dossier"; id: string } | { nom: "equipe" };

export default function EspaceAgence({ session, agences }: { session: Session; agences: Agence[] }) {
  const [agenceId, setAgenceId] = useState(agences[0].id);
  const [vue, setVue] = useState<Vue>({ nom: "tableau", archives: false });
  const agence = agences.find((a) => a.id === agenceId) ?? agences[0];
  const onglet = (actif: boolean) => (actif ? "pastille active" : "pastille");

  return (
    <>
      <header className="entete">
        <div className="entete-int">
          <span className="rangee" style={{ flex: "1 1 auto" }}>
            <Logo /><span className="marque">Pièces</span>
            {agences.length > 1 ? (
              <select aria-label="Agence" value={agenceId} onChange={(e) => { setAgenceId(e.target.value); setVue({ nom: "tableau", archives: false }); }} style={{ width: "auto", height: 38 }}>
                {agences.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            ) : <span className="gris">· {agence.nom}</span>}
          </span>
          <nav className="rangee">
            <button className={onglet(vue.nom === "tableau" && !vue.archives)} onClick={() => setVue({ nom: "tableau", archives: false })}>Dossiers</button>
            <button className={onglet(vue.nom === "tableau" && vue.archives)} onClick={() => setVue({ nom: "tableau", archives: true })}>Archives</button>
            {agence.role === "admin" && <button className={onglet(vue.nom === "equipe")} onClick={() => setVue({ nom: "equipe" })}>Équipe</button>}
          </nav>
          <button className="lien petit" onClick={() => supabase.auth.signOut()} title={session.user.email ?? ""}>Se déconnecter</button>
        </div>
      </header>

      {vue.nom === "tableau" && (
        <Tableau key={agence.id + vue.archives} agenceId={agence.id} archives={vue.archives}
          ouvrir={(id) => setVue({ nom: "dossier", id })} nouveau={() => setVue({ nom: "nouveau" })} />
      )}
      {vue.nom === "nouveau" && <NouveauDossier agenceId={agence.id} retour={() => setVue({ nom: "tableau", archives: false })} cree={(id) => setVue({ nom: "dossier", id })} />}
      {vue.nom === "dossier" && <DossierAgence id={vue.id} retour={() => setVue({ nom: "tableau", archives: false })} />}
      {vue.nom === "equipe" && <Equipe agenceId={agence.id} />}
    </>
  );
}
