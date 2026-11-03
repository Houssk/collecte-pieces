"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { messageErreur, supabase } from "../../../lib/supabase";

type Membre = { user_id: string; email: string | null; role: string };

export default function Equipe({ agenceId }: { agenceId: string }) {
  const [liste, setListe] = useState<Membre[]>([]);
  const [info, setInfo] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("agents").select("user_id, email, role").eq("agence_id", agenceId).order("created_at");
    if (error) return setInfo({ ok: false, texte: messageErreur(error) });
    setListe(data ?? []);
  }, [agenceId]);
  useEffect(() => { charger(); }, [charger]);

  async function ajouter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { error } = await supabase.rpc("ajouter_agent", { a: agenceId, adresse: String(fd.get("email")), role_agent: String(fd.get("role")) });
    if (error) return setInfo({ ok: false, texte: messageErreur(error) });
    setInfo({ ok: true, texte: "Collègue ajouté." });
    form.reset();
    charger();
  }

  return (
    <main className="conteneur etroit">
      <h1>Équipe de l'agence</h1>
      <div className="carte-liste">
        {liste.map((m) => <div key={m.user_id} className="ligne"><span style={{ flex: 1 }}>{m.email}</span><span className="badge badge-info">{m.role === "admin" ? "Administrateur" : "Agent"}</span></div>)}
      </div>
      <form onSubmit={ajouter} className="carte pile" style={{ gap: 14 }}>
        <p className="gris petit">Le collègue doit s'être connecté une fois à l'application avant d'être ajouté.</p>
        <div className="grille">
          <div className="pile"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required /></div>
          <div className="pile"><label htmlFor="role">Rôle</label><select id="role" name="role" defaultValue="agent"><option value="agent">Agent</option><option value="admin">Administrateur</option></select></div>
        </div>
        <button className="btn" type="submit" style={{ alignSelf: "flex-start" }}>Ajouter</button>
      </form>
      {info && <p className={`message ${info.ok ? "message-ok" : "message-ko"}`}>{info.texte}</p>}
    </main>
  );
}
