/**
 * Image d'aperçu affichée quand on partage le lien de la démo (LinkedIn, messageries) : 1200 × 630.
 * Produite à la compilation par next/og, avec Geist, la police du site ; reprend les couleurs de la page
 * (fond zinc clair, indigo pour l'action, ambre pour l'avertissement de démo).
 */
import { ImageResponse } from "next/og";

export const alt = "CV Reader : lecteur de CV avec validation humaine, démo sur CV fictifs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagePartage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#fafafa",
          color: "#18181b",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#71717a" }}>LECTEUR DE CV</div>
          <div style={{ display: "flex", fontSize: 112, fontWeight: 600, letterSpacing: -3 }}>CV Reader</div>
          <div style={{ display: "flex", fontSize: 40, lineHeight: 1.35, color: "#52525b", maxWidth: 960 }}>
            Extraction d&apos;un CV en PDF, vérification humaine de chaque champ, comparaison critère par critère.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#ffffff",
              backgroundColor: "#4f46e5",
              borderRadius: 999,
              padding: "16px 36px",
            }}
          >
            Aucun score : la décision reste humaine
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#78350f",
              backgroundColor: "#fef3c7",
              border: "2px solid #fcd34d",
              borderRadius: 16,
              padding: "12px 24px",
            }}
          >
            Démo sur CV fictifs
          </div>
        </div>
      </div>
    ),
    size,
  );
}
