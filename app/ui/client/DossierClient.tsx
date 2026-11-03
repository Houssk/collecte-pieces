"use client";

import { useState, type DragEvent } from "react";
import { avancement, dateCourte, messageErreur, STATUT, supabase, type Dossier, type Piece } from "../../../lib/supabase";

const MAX = 20 * 1024 * 1024;

function extension(f: File) {
  const e = (f.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return e || (f.type === "application/pdf" ? "pdf" : "jpg");
}

function CartePiece({ dossier, piece, recharger }: { dossier: Dossier; piece: Piece; recharger: () => void }) {
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const st = STATUT[piece.statut];
  const aDeposer = piece.statut === "manquante" || piece.statut === "refusee";

  async function deposer(liste: FileList | File[]) {
    const fichiers = Array.from(liste);
    if (!fichiers.length) return;
    setErreur("");
    const trop = fichiers.find((f) => f.size > MAX);
    if (trop) return setErreur(`« ${trop.name} » dépasse 20 Mo. Essayez une photo plus légère.`);
    const mauvais = fichiers.find((f) => !(f.type.startsWith("image/") || f.type === "application/pdf"));
    if (mauvais) return setErreur(`« ${mauvais.name} » n'est ni une photo ni un PDF.`);
    setEnvoi(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      for (const f of fichiers) {
        const chemin = `${dossier.id}/${piece.id}/${crypto.randomUUID()}.${extension(f)}`;
        const up = await supabase.storage.from("pieces").upload(chemin, f, { contentType: f.type || undefined });
        if (up.error) throw up.error;
        const { error } = await supabase.from("fichiers").insert({
          piece_id: piece.id, dossier_id: dossier.id, agence_id: dossier.agence_id, chemin,
          nom_fichier: f.name, type_mime: f.type, taille: f.size, depose_par: u.user?.id,
        });
        if (error) throw error;
      }
      const { error } = await supabase.rpc("signaler_depot", { piece: piece.id });
      if (error) throw error;
      recharger();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  const surDepot = (e: DragEvent) => { e.preventDefault(); setSurvol(false); deposer(e.dataTransfer.files); };

  return (
    <section className="carte pile" style={{ gap: 12, padding: 20, borderColor: piece.statut === "refusee" ? "#F7C6C2" : undefined }}
      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)} onDrop={surDepot}>
      <div className="entre" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <div className="pile" style={{ gap: 4 }}>
          <h2 style={{ fontSize: 17 }}>{piece.nom}</h2>
          {piece.aide && <span className="gris petit">{piece.aide}</span>}
        </div>
        <span className={`badge ${st.classe}`}>{st.client}</span>
      </div>
      {piece.statut === "refusee" && piece.motif && <p className="message message-ko">Votre conseiller : {piece.motif}</p>}
      {piece.fichiers.length > 0 && piece.statut !== "refusee" && (
        <p className="petit" style={{ background: "var(--fond)", padding: "10px 12px", borderRadius: 10 }}>
          ✓ {piece.fichiers.map((f) => f.nom_fichier).join(", ")} · envoyé le {dateCourte(piece.fichiers[piece.fichiers.length - 1].created_at)}
        </p>
      )}
      {piece.statut !== "validee" && (
        aDeposer ? (
          <label className={survol ? "depot survol" : "depot"}>
            <input type="file" accept="image/*,application/pdf" multiple onChange={(e) => e.target.files && deposer(e.target.files)} disabled={envoi} />
            <span>{envoi ? "Envoi en cours…" : piece.statut === "refusee" ? "Envoyer un nouveau document" : "Ajouter le document"}</span>
            <span className="petit" style={{ fontWeight: 400 }}>Touchez pour prendre une photo ou choisir un fichier, ou glissez-le ici</span>
          </label>
        ) : (
          <label className="lien" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
            <input type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }} onChange={(e) => e.target.files && deposer(e.target.files)} disabled={envoi} />
            {envoi ? "Envoi en cours…" : "Ajouter un autre fichier"}
          </label>
        )
      )}
      {erreur && <p className="message message-ko">{erreur}</p>}
    </section>
  );
}

export default function DossierClient({ dossier, prenom, recharger, retour }: { dossier: Dossier; prenom: string; recharger: () => void; retour?: () => void }) {
  const a = avancement(dossier);
  const complet = a.total > 0 && a.recues === a.total;
  return (
    <main className="conteneur etroit">
      {retour && <button className="lien" style={{ alignSelf: "flex-start" }} onClick={retour}>← Mes dossiers</button>}
      <div className="entre" style={{ alignItems: "flex-end" }}>
        <div className="pile" style={{ flex: "1 1 380px" }}>
          <h1>Bonjour{prenom ? " " + prenom : ""}</h1>
          <p className="gris" style={{ fontSize: 17 }}>Pour votre dossier « {dossier.titre} », votre conseiller a besoin des {a.total} documents ci-dessous. Tout ce que vous ajoutez est enregistré, vous pouvez revenir plus tard.</p>
        </div>
        <div className="pile" style={{ flex: "0 1 280px" }}>
          <strong>{a.recues} sur {a.total} reçus</strong>
          <span className="barre" style={{ flex: "none", height: 10 }}><span style={{ width: a.pct + "%" }} /></span>
          {dossier.echeance && <span className="gris petit">À envoyer avant le {dateCourte(dossier.echeance)}</span>}
        </div>
      </div>
      {complet && <p className="message message-ok">Merci, tout est arrivé. Votre conseiller vérifie vos documents et revient vers vous si besoin.</p>}
      {dossier.pieces.map((p) => <CartePiece key={p.id} dossier={dossier} piece={p} recharger={recharger} />)}
      <p className="gris petit" style={{ textAlign: "center" }}>Formats acceptés : photos et PDF, 20 Mo maximum par fichier. Vos documents sont transmis de façon sécurisée.</p>
    </main>
  );
}
