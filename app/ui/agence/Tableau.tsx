"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { avancement, dateCourte, envoyerLien, messageErreur, SELECT_DOSSIER, supabase, trierPieces, type Dossier } from "../../../lib/supabase";

type Filtre = "tous" | "attente" | "partiel" | "verifier" | "complet";
const FILTRES: [Filtre, string][] = [["tous", "Tous"], ["attente", "En attente"], ["partiel", "Partiels"], ["verifier", "À vérifier"], ["complet", "Complets"]];

export default function Tableau({ agenceId, archives, ouvrir, nouveau }: { agenceId: string; archives: boolean; ouvrir: (id: string) => void; nouveau: () => void }) {
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [q, setQ] = useState("");
  const [info, setInfo] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("dossiers").select(SELECT_DOSSIER)
      .eq("agence_id", agenceId).eq("statut", archives ? "archive" : "en_cours").order("created_at", { ascending: false });
    if (error) return setInfo({ ok: false, texte: messageErreur(error) });
    setDossiers(((data ?? []) as unknown as Dossier[]).map(trierPieces));
  }, [agenceId, archives]);

  useEffect(() => { charger(); }, [charger]);

  const lignes = useMemo(() => (dossiers ?? [])
    .map((d) => ({ d, a: avancement(d) }))
    .filter(({ a }) => filtre === "tous" || a.etat.cle === filtre)
    .filter(({ d }) => {
      const t = q.trim().toLowerCase();
      return !t || [d.titre, d.contacts?.nom, d.contacts?.interlocuteur, d.contacts?.email].some((x) => (x ?? "").toLowerCase().includes(t));
    }), [dossiers, filtre, q]);

  const compte = (cle: Filtre) => (dossiers ?? []).filter((d) => avancement(d).etat.cle === cle).length;

  async function relancer(d: Dossier) {
    if (!d.contacts) return;
    const { error } = await envoyerLien(d.contacts.email);
    if (error) return setInfo({ ok: false, texte: messageErreur(error) });
    await supabase.rpc("noter_relance", { d: d.id });
    setInfo({ ok: true, texte: `Relance envoyée à ${d.contacts.email}.` });
    charger();
  }

  return (
    <main className="conteneur">
      <div className="entre">
        <div className="pile">
          <h1>{archives ? "Dossiers archivés" : "Dossiers en cours"}</h1>
          <p className="gris">{archives ? "Dossiers complets et clôturés." : "Suivez en un coup d'œil ce que chaque client a envoyé."}</p>
        </div>
        {!archives && <button className="btn" onClick={nouveau}>+ Nouveau dossier</button>}
      </div>

      {!archives && (
        <div className="grille">
          <div className="carte pile"><span className="gris petit">Dossiers en cours</span><span className="chiffre">{dossiers?.length ?? "…"}</span></div>
          <div className="carte pile"><span className="gris petit">En attente du client</span><span className="chiffre">{dossiers ? compte("attente") + compte("partiel") : "…"}</span></div>
          <div className="carte pile"><span className="gris petit">À vérifier</span><span className="chiffre">{dossiers ? compte("verifier") : "…"}</span></div>
          <div className="carte pile"><span className="gris petit">Complets</span><span className="chiffre">{dossiers ? compte("complet") : "…"}</span></div>
        </div>
      )}

      <div className="rangee">
        <input type="search" aria-label="Rechercher" placeholder="Rechercher un client ou un dossier" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 260px", width: "auto" }} />
        {!archives && FILTRES.map(([id, label]) => <button key={id} className={filtre === id ? "pastille active" : "pastille"} onClick={() => setFiltre(id)}>{label}</button>)}
      </div>

      {info && <p className={`message ${info.ok ? "message-ok" : "message-ko"}`} onClick={() => setInfo(null)}>{info.texte}</p>}
      {dossiers && lignes.length === 0 && <p className="gris">Aucun dossier.</p>}

      {lignes.length > 0 && (
        <>
          <div className="carte-liste defile masque-mobile">
            <table className="tableau">
              <thead><tr><th>Client</th><th>Dossier</th><th style={{ width: 200 }}>Pièces reçues</th><th>Statut</th><th>Dernière relance</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {lignes.map(({ d, a }) => (
                  <tr key={d.id}>
                    <td><button className="lien" style={{ color: "var(--encre)", textDecoration: "none", fontWeight: 500 }} onClick={() => ouvrir(d.id)}>{d.contacts?.nom}</button><div className="gris tres-petit">{d.contacts?.interlocuteur || d.contacts?.email}</div></td>
                    <td>{d.titre}</td>
                    <td><span className="rangee" style={{ flexWrap: "nowrap" }}><span className="barre"><span style={{ width: a.pct + "%" }} /></span><span className="gris petit">{a.recues}/{a.total}</span></span></td>
                    <td><span className={`badge ${archives ? "badge-ok" : a.etat.classe}`}>{archives ? "Archivé" : a.etat.libelle}</span></td>
                    <td className="gris petit">{d.derniere_relance ? dateCourte(d.derniere_relance) : "Aucune"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {!archives && a.etat.cle !== "complet" && <button className="btn btn-second btn-petit" onClick={() => relancer(d)}>Relancer</button>}{" "}
                      <button className="btn btn-second btn-petit" onClick={() => ouvrir(d.id)}>Ouvrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="seulement-mobile pile" style={{ gap: 12 }}>
            {lignes.map(({ d, a }) => (
              <button key={d.id} className="carte pile" style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", padding: 16 }} onClick={() => ouvrir(d.id)}>
                <span className="entre" style={{ alignItems: "flex-start" }}>
                  <span className="pile" style={{ gap: 2 }}><strong>{d.contacts?.nom}</strong><span className="gris petit">{d.titre}</span></span>
                  <span className={`badge ${a.etat.classe}`}>{a.etat.libelle}</span>
                </span>
                <span className="rangee" style={{ flexWrap: "nowrap" }}><span className="barre"><span style={{ width: a.pct + "%" }} /></span><span className="gris petit">{a.recues}/{a.total}</span></span>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
