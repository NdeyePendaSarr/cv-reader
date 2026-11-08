/**
 * Schéma JSON de l'outil `enregistrer_fiche`, dérivé de FicheCVSchema.
 *
 * L'outil n'est pas en mode strict (voir docs/SPEC.md, « Appel au modèle ») : le schéma Zod
 * complet est donc envoyé tel quel (`minLength`, format et motif de l'e-mail compris), pour guider
 * le modèle au plus près. Seul `$schema` est retiré, inutile dans `input_schema`.
 *
 * Ce schéma guide seulement le modèle : Zod (FicheCVSchema.safeParse) reste seul juge à l'arrivée.
 */
import { z } from "zod";
import { FicheCVSchema } from "@/lib/schemas";

/** Forme attendue par le champ `input_schema` d'un outil. */
export interface SchemaOutil {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
  [cle: string]: unknown;
}

/** Schéma de la fiche envoyé au modèle comme `input_schema` de l'outil. */
export function schemaPourModele(): SchemaOutil {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `$schema` est volontairement écarté.
  const { $schema, ...schema } = z.toJSONSchema(FicheCVSchema) as Record<string, unknown>;
  return schema as SchemaOutil;
}
