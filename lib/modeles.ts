// Modèles de listes de pièces. Pour en ajouter ou en modifier, demander à Claude
// (« ajoute un modèle de pièces pour <type de dossier> »).
export type PieceModele = { nom: string; aide: string };
export type Modele = { id: string; nom: string; pieces: PieceModele[]; cochees: string[] };

const P = {
  kbis: { nom: "Extrait Kbis", aide: "De moins de 3 mois, gratuit sur infogreffe.fr" },
  ri: { nom: "Relevé d'information de l'assureur actuel", aide: "Historique des sinistres sur 5 ans, à demander à votre assureur" },
  id: { nom: "Pièce d'identité du dirigeant", aide: "Carte d'identité ou passeport, recto et verso" },
  rib: { nom: "RIB", aide: "Au nom de la société ou du titulaire du contrat" },
  elec: { nom: "Attestation de contrôle électrique", aide: "Rapport de vérification de moins d'un an" },
  ext: { nom: "Attestation de vérification des extincteurs", aide: "De moins d'un an" },
  photos: { nom: "Photos des locaux", aide: "Façade, intérieur, réserve" },
  statuts: { nom: "Statuts de la société", aide: "Dernière version signée" },
  bilan: { nom: "Dernier bilan comptable", aide: "Ou liasse fiscale de l'année précédente" },
  bail: { nom: "Bail commercial", aide: "Pages signées" },
  titre: { nom: "Titre de propriété ou acte d'achat", aide: "Première page et page des signatures" },
  diag: { nom: "Diagnostics immobiliers", aide: "Dossier de diagnostic technique" },
  attRC: { nom: "Attestation d'assurance actuelle", aide: "Responsabilité civile en cours" },
  ca: { nom: "Chiffre d'affaires de l'année passée", aide: "Attestation de l'expert-comptable ou bilan" },
};

export const MODELES: Modele[] = [
  {
    id: "mrp", nom: "Multirisque professionnelle",
    pieces: [P.kbis, P.ri, P.id, P.rib, P.elec, P.ext, P.photos, P.statuts, P.bilan, P.bail],
    cochees: [P.kbis.nom, P.ri.nom, P.id.nom, P.rib.nom, P.elec.nom, P.ext.nom, P.photos.nom],
  },
  {
    id: "pno", nom: "Propriétaire non occupant",
    pieces: [P.titre, P.id, P.rib, P.diag, P.ri, P.bail],
    cochees: [P.titre.nom, P.id.nom, P.rib.nom, P.ri.nom],
  },
  {
    id: "rcpro", nom: "Responsabilité civile professionnelle",
    pieces: [P.kbis, P.id, P.rib, P.attRC, P.ca, P.ri],
    cochees: [P.kbis.nom, P.id.nom, P.rib.nom, P.ca.nom],
  },
];
