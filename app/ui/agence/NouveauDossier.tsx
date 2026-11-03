"use client";

import { useEffect, useMemo, useState } from "react";
import { envoyerLien, messageErreur, supabase, type Contact } from "../../../lib/supabase";
import { MODELES, type PieceModele } from "../../../lib/modeles";

export default function NouveauDossier({ agenceId, retour, cree }: { agenceId: string; retour: () => void; cree: (id: string) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [mode, setMode] = useState<"nouveau" | "existant">("nouveau");
  const [contactId, setContactId] = useState("");
  const [client, setClient] = useState({ nom: "", interlocuteur: "", email: "", telephone: "" });
  const [titre, setTitre] = useState("");
  const [echeance, setEcheance] = useState("");
  const [modeleId, setModeleId] = useState(MODELES[0].id);
  const [pieces, setPieces] = useState<(PieceModele & { coche: boolean })[]>([]);
  const [autre, setAutre] = useState("");
  const [relances, setRelances] = useState(true);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    supabase.from("contacts").select("id, nom, interlocuteur, email, telephone").eq("agence_id", agenceId).order("nom")
      .then(({ data }) => setContacts((data ?? []) as Contact[]));
  }, [agenceId]);

  useEffect(() => {
    const m = MODELES.find((x) => x.id === modeleId) ?? MODELES[0];
    setPieces(m.pieces.map((p) => ({ ...p, coche: m.cochees.includes(p.nom) })));
    setTitre((t) => t || m.nom);
  }, [modeleId]);

  const choisi = contacts.find((c) => c.id === contactId);
  const nomAffiche = mode === "existant" ? choisi?.interlocuteur || choisi?.nom : client.interlocuteur || client.nom;
  useEffect(() => {
    setMessage(`Bonjour${nomAffiche ? " " + nomAffiche : ""},\n\nPour préparer votre dossier, merci de déposer les documents demandés en cliquant sur le lien reçu par e-mail. Cela prend environ 10 minutes.\n\nMerci,`);
  }, [nomAffiche]);

  const nbCoches = useMemo(() => pieces.filter((p) => p.coche).length, [pieces]);

  async function creer() {
    setErreur("");
    if (mode === "nouveau" && (!client.nom.trim() || !client.email.trim())) return setErreur("Nom et e-mail du client obligatoires");
    if (mode === "existant" && !contactId) return setErreur("Choisissez un client");
    if (nbCoches === 0) return setErreur("Cochez au moins une pièce");
    setEnvoi(true);
    try {
      let idContact = contactId;
      let email = choisi?.email ?? "";
      if (mode === "nouveau") {
        const { data, error } = await supabase.from("contacts").insert({
          agence_id: agenceId, nom: client.nom.trim(), interlocuteur: client.interlocuteur.trim() || null,
          email: client.email.trim().toLowerCase(), telephone: client.telephone.trim() || null,
        }).select("id").single();
        if (error) throw error;
        idContact = data.id;
        email = client.email.trim();
      }
      const { data: id, error } = await supabase.rpc("creer_dossier", {
        contact: idContact, titre, echeance: echeance || null, message, relances_auto: relances,
        pieces_demandees: pieces.filter((p) => p.coche).map(({ nom, aide }) => ({ nom, aide })),
      });
      if (error) throw error;
      const lien = await envoyerLien(email);
      if (lien.error) setErreur(`Dossier créé, mais l'e-mail n'est pas parti : ${messageErreur(lien.error)}. Utilisez « Relancer » dans le dossier.`);
      cree(String(id));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  const champ = (id: keyof typeof client, label: string, type = "text") => (
    <div className="pile">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={client[id]} onChange={(e) => setClient({ ...client, [id]: e.target.value })} />
    </div>
  );

  return (
    <main className="conteneur">
      <button className="lien" style={{ alignSelf: "flex-start" }} onClick={retour}>← Retour aux dossiers</button>
      <h1>Nouveau dossier</h1>
      <div className="deux-colonnes">
        <div className="principal">
          <section className="carte pile" style={{ gap: 16 }}>
            <h2><span className="gris">1 ·</span> Le client</h2>
            <div className="rangee">
              <button className={mode === "nouveau" ? "pastille active" : "pastille"} onClick={() => setMode("nouveau")}>Nouveau client</button>
              <button className={mode === "existant" ? "pastille active" : "pastille"} onClick={() => setMode("existant")} disabled={contacts.length === 0}>Client existant</button>
            </div>
            {mode === "nouveau" ? (
              <div className="grille">
                {champ("nom", "Nom du client ou société")}
                {champ("interlocuteur", "Personne à contacter")}
                {champ("email", "E-mail", "email")}
                {champ("telephone", "Téléphone (facultatif)", "tel")}
              </div>
            ) : (
              <select aria-label="Client existant" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">Choisir un client…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.nom} · {c.email}</option>)}
              </select>
            )}
          </section>

          <section className="carte pile" style={{ gap: 16 }}>
            <h2><span className="gris">2 ·</span> Le dossier</h2>
            <div className="grille">
              <div className="pile"><label htmlFor="titre">Intitulé</label><input id="titre" type="text" value={titre} onChange={(e) => setTitre(e.target.value)} /></div>
              <div className="pile"><label htmlFor="echeance">À fournir avant le</label><input id="echeance" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} /></div>
            </div>
          </section>

          <section className="carte pile" style={{ gap: 12 }}>
            <div className="entre" style={{ alignItems: "center" }}>
              <h2><span className="gris">3 ·</span> Les pièces à demander</h2>
              <select aria-label="Modèle" value={modeleId} onChange={(e) => setModeleId(e.target.value)} style={{ width: "auto", height: 40 }}>
                {MODELES.map((m) => <option key={m.id} value={m.id}>Modèle : {m.nom}</option>)}
              </select>
            </div>
            <p className="gris petit">Cochez uniquement ce dont vous avez besoin. Le client ne verra que ces pièces.</p>
            <div>
              {pieces.map((p, i) => (
                <label key={p.nom + i} className="rangee" style={{ flexWrap: "nowrap", alignItems: "flex-start", gap: 14, padding: "12px 2px", borderTop: "1px solid #F2F2F2", cursor: "pointer", fontWeight: 400 }}>
                  <input type="checkbox" checked={p.coche} onChange={() => setPieces(pieces.map((x, j) => (j === i ? { ...x, coche: !x.coche } : x)))} style={{ marginTop: 2 }} />
                  <span className="pile" style={{ gap: 2 }}><span style={{ fontWeight: 500 }}>{p.nom}</span>{p.aide && <span className="gris petit">{p.aide}</span>}</span>
                </label>
              ))}
            </div>
            <div className="rangee">
              <input type="text" aria-label="Autre pièce" placeholder="Ajouter une autre pièce…" value={autre} onChange={(e) => setAutre(e.target.value)} style={{ flex: "1 1 240px", width: "auto", borderStyle: "dashed" }} />
              <button className="btn btn-second" onClick={() => { if (autre.trim()) { setPieces([...pieces, { nom: autre.trim(), aide: "", coche: true }]); setAutre(""); } }}>Ajouter</button>
            </div>
          </section>

          <section className="carte pile" style={{ gap: 12 }}>
            <h2><span className="gris">4 ·</span> Le message au client</h2>
            <textarea aria-label="Message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
            <label className="rangee" style={{ flexWrap: "nowrap", fontWeight: 400, cursor: "pointer" }}>
              <input type="checkbox" checked={relances} onChange={() => setRelances(!relances)} />
              Relancer automatiquement s'il manque des pièces (bientôt disponible)
            </label>
          </section>
        </div>

        <aside className="lateral">
          <div className="carte pile" style={{ gap: 16 }}>
            <h2>Récapitulatif</h2>
            <div className="pile" style={{ gap: 2 }}><span className="gris petit">Client</span><strong>{(mode === "existant" ? choisi?.nom : client.nom) || "…"}</strong></div>
            <div className="pile" style={{ gap: 2 }}><span className="gris petit">Pièces demandées</span><span className="chiffre">{nbCoches}</span></div>
            {erreur && <p className="message message-ko">{erreur}</p>}
            <button className="btn btn-large" onClick={creer} disabled={envoi}>{envoi ? "Création…" : "Créer et envoyer le lien"}</button>
            <p className="gris petit">Le client reçoit un e-mail avec un bouton. Il n'a ni compte ni mot de passe à créer.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
