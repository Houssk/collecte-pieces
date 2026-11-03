import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Clé publique uniquement : la sécurité repose sur les règles RLS (supabase/migrations).
export const configOk = Boolean(url && key);
export const supabase = createClient(url || "http://localhost", key || "absente");

export type StatutPiece = "manquante" | "recue" | "validee" | "refusee";
export type Agence = { id: string; nom: string; role: "admin" | "agent" };
export type Contact = { id: string; nom: string; interlocuteur: string | null; email: string; telephone: string | null };
export type Fichier = { id: string; chemin: string; nom_fichier: string; taille: number | null; created_at: string };
export type Piece = { id: string; nom: string; aide: string | null; ordre: number; statut: StatutPiece; motif: string | null; fichiers: Fichier[] };
export type Dossier = {
  id: string; agence_id: string; titre: string; echeance: string | null; message: string | null;
  statut: "en_cours" | "archive"; relances_auto: boolean; nb_relances: number; derniere_relance: string | null;
  created_at: string; contacts: Contact | null; pieces: Piece[];
};

export const STATUT: Record<StatutPiece, { agence: string; client: string; classe: string }> = {
  manquante: { agence: "À fournir", client: "À ajouter", classe: "badge-attente" },
  recue: { agence: "Reçue · à vérifier", client: "Reçu", classe: "badge-info" },
  validee: { agence: "Validée", client: "Validé", classe: "badge-ok" },
  refusee: { agence: "Refusée", client: "À refaire", classe: "badge-ko" },
};

export const SELECT_DOSSIER =
  "id, agence_id, titre, echeance, message, statut, relances_auto, nb_relances, derniere_relance, created_at, contacts(id, nom, interlocuteur, email, telephone), pieces(id, nom, aide, ordre, statut, motif, fichiers(id, chemin, nom_fichier, taille, created_at))";

export function trierPieces(d: Dossier): Dossier {
  return { ...d, pieces: [...(d.pieces ?? [])].sort((a, b) => a.ordre - b.ordre) };
}

export function avancement(d: Dossier) {
  const total = d.pieces.length;
  const recues = d.pieces.filter((p) => p.statut === "recue" || p.statut === "validee").length;
  const validees = d.pieces.filter((p) => p.statut === "validee").length;
  const aVerifier = d.pieces.some((p) => p.statut === "recue");
  let etat: { libelle: string; classe: string; cle: "attente" | "partiel" | "verifier" | "complet" };
  if (total > 0 && validees === total) etat = { libelle: "Complet", classe: "badge-ok", cle: "complet" };
  else if (aVerifier) etat = { libelle: "À vérifier", classe: "badge-info", cle: "verifier" };
  else if (recues > 0) etat = { libelle: "Envoi partiel", classe: "badge-attente", cle: "partiel" };
  else etat = { libelle: "En attente du client", classe: "badge-attente", cle: "attente" };
  return { total, recues, validees, pct: total ? Math.round((recues / total) * 100) : 0, etat };
}

// Envoie au client (ou à l'agent) un e-mail avec un lien de connexion sans mot de passe.
export async function envoyerLien(email: string) {
  return supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
  });
}

export function messageErreur(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erreur inconnue";
}

export const dateCourte = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";
export const dateHeure = (s: string) =>
  new Date(s).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
