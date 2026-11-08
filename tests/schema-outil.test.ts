import { z } from "zod";
import { describe, expect, it } from "vitest";
import { schemaPourModele } from "@/lib/schema-outil";
import { FicheCVSchema } from "@/lib/schemas";

describe("schemaPourModele", () => {
  const schema = schemaPourModele();

  it("ne retire que $schema : le reste est le schéma Zod complet", () => {
    expect(schema).not.toHaveProperty("$schema");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema, ...attendu } = z.toJSONSchema(FicheCVSchema) as Record<string, unknown>;
    expect(schema).toEqual(attendu);
  });

  it("garde les contraintes qui guident le modèle : chaînes non vides, e-mail", () => {
    const texte = JSON.stringify(schema);
    expect(texte).toContain('"minLength":1');
    expect(texte).toContain('"format":"email"');
  });

  it("garde les champs nullables sous forme anyOf avec null", () => {
    const ville = (schema.properties.identite as { properties: Record<string, unknown> }).properties.ville;
    expect(ville).toEqual({ anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] });
  });

  it("est un objet fermé dont tous les champs sont obligatoires", () => {
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(schema.properties));
  });
});
