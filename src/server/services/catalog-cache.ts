import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { categories, locations } from "../db/schema";

/**
 * Cache em memória (por instância) de dados que mudam pouco: categorias e localidades.
 * Evita várias consultas ao banco por mensagem da IA — relevante quando o banco está
 * em outra região que as funções (ex.: Netlify em Ohio). TTL curto: mudanças do admin
 * aparecem em até 60 s; o admin também invalida ao salvar.
 */
const TTL_MS = 60_000;
type Entry<T> = { at: number; value: Promise<T> };
let cats: Entry<(typeof categories.$inferSelect)[]> | null = null;
let locs: Entry<(typeof locations.$inferSelect)[]> | null = null;

export function getActiveCategories() {
  if (!cats || Date.now() - cats.at > TTL_MS) {
    const value = db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder), asc(categories.name));
    cats = { at: Date.now(), value };
    value.catch(() => (cats = null));
  }
  return cats.value;
}

export function getActiveLocations() {
  if (!locs || Date.now() - locs.at > TTL_MS) {
    const value = db.select().from(locations).where(eq(locations.active, true)).orderBy(asc(locations.city), asc(locations.name));
    locs = { at: Date.now(), value };
    value.catch(() => (locs = null));
  }
  return locs.value;
}

export function invalidateCatalogCache() {
  cats = null;
  locs = null;
}
