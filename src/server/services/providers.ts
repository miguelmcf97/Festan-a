import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { providers } from "../db/schema";

export async function myProvider(userId: string) {
  return db.query.providers.findFirst({ where: eq(providers.ownerId, userId), with: { categories: { with: { category: true } }, location: true } });
}
