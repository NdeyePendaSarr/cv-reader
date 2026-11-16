/**
 * Métadonnées de la page (titre, description, aperçu de partage), utilisées par app/layout.tsx.
 * À part du layout, qui charge les polices par next/font : on peut ainsi les tester sans compiler Next.js.
 */
import type { Metadata } from "next";

const DESCRIPTION =
  "Extrait les informations d'un CV en PDF, les fait valider par un humain, puis les compare aux critères d'une offre.";

const TITRE_PARTAGE = "CV Reader : lecteur de CV avec validation humaine";

/**
 * Adresse de base des liens absolus de l'aperçu (image de partage) : le domaine de production,
 * fourni par Vercel à la compilation (VERCEL_PROJECT_PRODUCTION_URL, sans « https:// ») ; en local, localhost.
 */
export function adresseDeBase(domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL): URL {
  return new URL(domaine ? `https://${domaine}` : "http://localhost:3000");
}

export const METADONNEES: Metadata = {
  metadataBase: adresseDeBase(),
  title: "CV Reader",
  description: DESCRIPTION,
  // Aperçu de partage : l'image vient de app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "CV Reader",
    title: TITRE_PARTAGE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITRE_PARTAGE,
    description: DESCRIPTION,
  },
};
