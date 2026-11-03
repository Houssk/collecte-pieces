"use client";

import { useCallback, useEffect, useState } from "react";
import JSZip from "jszip";
import { avancement, dateCourte, dateHeure, envoyerLien, messageErreur, SELECT_DOSSIER, STATUT, supabase, trierPieces, type Dossier } from "../../../lib/supabase";

type Ligne = { id: number; texte: string; created_at: string };

export default function DossierAgence({ id, retour }: { id: string; retour: () => void }) {
  const [d, setD] = useState<Dossier | null>(null);
  const [journal, setJournal] = useState<Ligne[]>([]);
  const [info, setInfo] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      supabase.from("dossiers").select(SELECT_DOSSIER).eq("id", id).single(),
      supabase.from("journal").select("id, texte, created_at").eq("dossier_id", id).order("id", { ascending: false }).limit(50),
    ]);
    if (r1.error) return setInfo({ ok: false, texte: messageErreur(r1.error) });
    setD(trierPieces(r1.data as unknown as Dossier));
    setJournal((r2.data ?? []) as Ligne[]);
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  async function action(f: () => Promise<{ error: unknown }>, ok?: string) {
    setOccupe(true);
    const { error } = await f();
    setOccupe(false);
    if (error) return setInfo({ ok: false, texte: messageErreur(error) });
    if (ok) setInfo({ ok: true, texte: ok });
    charger();
  }

  async function voir(chemin: string) {
    const { data, error } = await supabase.storage.from("pieces").createSignedUrl(chemin, 600);
    if (error) return setInfo({ ok: false, texte: messageErreur(error) });
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function relancer() {
    if (!d?.contacts) return;
    const { error } = await envoyerLien(d.contacts.email);
    if (error) return setInfo({ ok: false, texte: messageErreur(error) });
    action(async () => supabase.rpc("noter_relance", { d: d.id }), `Relance envoyée à ${d.contacts.email}.`);
  }

  async function toutTelecharger() {
    if (!d) return;
    setOccupe(true);
    try {
      const zip = new JSZip();
      for (const p of d.pieces) {
        for (const f of p.fichiers) {
          const { data, error } = await supabase.storage.from("pieces").download(f.chemin);
          if (error) throw error;
          zip.folder(p.nom.replace(/[\\/:*?"<>|]/g, "-"))?.file(f.nom_fichier, data);
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(d.contacts?.nom ?? "dossier").replace(/\s+/g, "-")}-${d.titre.replace(/\s+/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setInfo({ ok: false, texte: messageErreur(e) });
    } finally {
      setOccupe(false);
    }
  }

  if (!d) return <main className="conteneur">{info ? <p className="message message-ko">{info.texte}</p> : <p className="gris">Chargement…</p>}</main>;
  const a = avancement(d);
  const archive = d.statut === "archive";
  const nbFichiers = d.pieces.reduce((n, p) => n + p.fichiers.length, 0);

  return (
    <main className="conteneur">
      <button className="lien" style={{ alignSelf: "flex-start" }} onClick={retour}>← Retour aux dossiers</button>
      <div className="entre" style={{ alignItems: "flex-start" }}>
        <div className="pile">
          <h1>{d.contacts?.nom}</h1>
          <p className="gris">{d.titre} · {d.contacts?.interlocuteur ? d.contacts.interlocuteur + " · " : ""}{d.contacts?.email}{d.echeance ? " · avant le " + dateCourte(d.echeance) : ""}</p>
        </div>
        <div className="rangee">
          {!archive && <button className="btn btn-contour" onClick={relancer} disabled={occupe || a.etat.cle === "complet"}>Relancer le client</button>}
          <button className="btn btn-second" onClick={toutTelecharger} disabled={occupe || nbFichiers === 0}>Tout télécharger (.zip)</button>
          {!archive && <button className="btn btn-noir" disabled={occupe || a.etat.cle !== "complet"} onClick={() => action(async () => supabase.rpc("archiver_dossier", { d: d.id }), "Dossier archivé.")}>Archiver le dossier</button>}
        </div>
      </div>
      {info && <p className={`message ${info.ok ? "message-ok" : "message-ko"}`} onClick={() => setInfo(null)}>{info.texte}</p>}

      <div className="deux-colonnes">
        <section className="carte-liste principal" style={{ gap: 0 }}>
          <div className="pile" style={{ padding: "20px 24px", borderBottom: "1px solid #F2F2F2" }}>
            <div className="entre" style={{ alignItems: "center" }}><h2>Pièces demandées</h2><span className="gris">{a.recues} reçues sur {a.total} · {a.validees} validée(s)</span></div>
            <span className="barre" style={{ flex: "none" }}><span style={{ width: a.pct + "%" }} /></span>
          </div>
          {d.pieces.map((p) => (
            <div key={p.id} className="ligne">
              <div className="pile" style={{ flex: "1 1 240px", minWidth: 0, gap: 3 }}>
                <span style={{ fontWeight: 500 }}>{p.nom}</span>
                <span className="gris petit">
                  {p.statut === "refusee" && p.motif ? "Refusée : " + p.motif
                    : p.fichiers.length ? p.fichiers.map((f) => f.nom_fichier).join(", ") + " · reçu le " + dateCourte(p.fichiers[p.fichiers.length - 1].created_at)
                    : "Pas encore envoyé"}
                </span>
              </div>
              <span className={`badge ${STATUT[p.statut].classe}`}>{STATUT[p.statut].agence}</span>
              <div className="rangee" style={{ flex: "none" }}>
                {p.fichiers.map((f, i) => <button key={f.id} className="btn btn-second btn-petit" onClick={() => voir(f.chemin)}>Voir{p.fichiers.length > 1 ? " " + (i + 1) : ""}</button>)}
                {!archive && p.statut === "recue" && <>
                  <button className="btn btn-petit" disabled={occupe} onClick={() => action(async () => supabase.rpc("decider_piece", { piece: p.id, decision: "validee" }))}>Valider</button>
                  <button className="btn btn-danger btn-petit" disabled={occupe} onClick={() => {
                    const note = window.prompt("Motif du refus, visible par le client (ex. : document de plus de 3 mois)");
                    if (note !== null) action(async () => supabase.rpc("decider_piece", { piece: p.id, decision: "refusee", note }));
                  }}>Refuser</button>
                </>}
              </div>
            </div>
          ))}
        </section>

        <aside className="lateral">
          <div className="carte pile" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 16 }}>Accès du client</h2>
            <p className="petit">Le client se connecte avec <strong>{d.contacts?.email}</strong> sur :</p>
            <div className="rangee" style={{ flexWrap: "nowrap" }}>
              <span className="petit gris" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "var(--fond)", padding: "10px 12px", borderRadius: 10 }}>{typeof window !== "undefined" ? window.location.origin : ""}</span>
              <button className="btn btn-second btn-petit" onClick={() => navigator.clipboard.writeText(window.location.origin)}>Copier</button>
            </div>
            <p className="gris tres-petit">{d.nb_relances} relance(s){d.derniere_relance ? " · dernière le " + dateCourte(d.derniere_relance) : ""}</p>
          </div>
          <div className="carte pile" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 16 }}>Historique</h2>
            {journal.map((j) => (
              <div key={j.id} className="rangee" style={{ flexWrap: "nowrap", alignItems: "flex-start", gap: 12 }}>
                <span style={{ width: 8, height: 8, marginTop: 7, borderRadius: "50%", background: "var(--bleu)", flex: "none" }} />
                <span className="pile" style={{ gap: 1 }}><span className="petit">{j.texte}</span><span className="gris tres-petit">{dateHeure(j.created_at)}</span></span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
