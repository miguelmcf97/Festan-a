"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";

export async function setLangAction(fd: FormData) {
  const lang = parseLang(String(fd.get("lang") ?? ""));
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false, secure: process.env.NODE_ENV === "production" });
  revalidatePath("/", "layout");
}
