"use client";

import { useState, type FormEvent } from "react";
import { envoyerLien, messageErreur } from "../../lib/supabase";
import Logo from "./Logo";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setEtat(null);
    const { error } = await envoyerLien(email);
    setEnvoi(false);
    setEtat(error ? { ok: false, texte: messageErreur(error) } : { ok: true, texte: "C'est envoyé. Ouvrez l'e-mail « Votre lien de connexion » sur cet appareil et touchez le bouton." });
  }

  return (
    <div className="centre">
      <header className="entete-int" style={{ maxWidth: 1120, width: "100%" }}>
        <Logo /><span className="marque">Pièces</span>
      </header>
      <main>
        <div className="boite">
          <div className="pile">
            <h1>Bonjour</h1>
            <p className="gris" style={{ fontSize: 17 }}>Saisissez votre adresse e-mail : nous vous envoyons un lien pour vous connecter, sans mot de passe.</p>
          </div>
          <form onSubmit={envoyer} className="carte pile" style={{ gap: 16 }}>
            <div className="pile">
              <label htmlFor="email">Adresse e-mail</label>
              <input id="email" type="email" required autoComplete="email" placeholder="vous@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 54, fontSize: 17 }} />
            </div>
            <button className="btn btn-large" type="submit" disabled={envoi}>{envoi ? "Envoi…" : "Recevoir mon lien de connexion"}</button>
            <p className="gris petit">Pensez à regarder dans les courriers indésirables.</p>
          </form>
          {etat && <p className={`message ${etat.ok ? "message-ok" : "message-ko"}`}>{etat.texte}</p>}
        </div>
      </main>
      <footer className="entete-int gris tres-petit" style={{ maxWidth: 1120, width: "100%", justifyContent: "space-between" }}>
        <span>Documents transmis de façon sécurisée</span>
      </footer>
    </div>
  );
}
