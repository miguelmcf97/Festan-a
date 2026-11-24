import { describe, expect, it } from "vitest";
import { CATEGORY_EN, categoryName, makeT, parseLang } from "../src/lib/i18n";
import { msg } from "../src/lib/messages-en";
import { eventTypeLabel, formatDate, formatRange, quoteStatusLabel } from "../src/lib/format";

describe("idioma", () => {
  it("português é o padrão; só 'en' muda", () => {
    expect(parseLang(undefined)).toBe("pt");
    expect(parseLang("fr")).toBe("pt");
    expect(parseLang("en")).toBe("en");
  });
  it("t escolhe o texto do idioma", () => {
    expect(makeT("pt")("Olá", "Hi")).toBe("Olá");
    expect(makeT("en")("Olá", "Hi")).toBe("Hi");
  });
  it("todas as categorias do seed têm nome em inglês", () => {
    const seed = ["espaco-de-festas", "sitios-e-chacaras", "mesas-e-cadeiras", "tendas-e-estruturas", "buffet", "churrasco", "food-trucks", "doces-e-bolos", "cascata-de-chocolate", "pipoca-e-algodao-doce", "brinquedos-inflaveis", "personagens", "recreacao", "musica-ao-vivo", "dj", "fotografia", "filmagem", "decoracao", "cerimonial", "iluminacao", "sonorizacao"];
    for (const s of seed) expect(CATEGORY_EN[s], s).toBeTruthy();
    expect(categoryName({ slug: "buffet", name: "Buffet" }, "en")).toBe("Buffet");
    expect(categoryName({ slug: "nova", name: "Categoria nova" }, "en")).toBe("Categoria nova"); // sem tradução: mantém o nome
  });
  it("rótulos e datas seguem o idioma; dinheiro sempre em reais", () => {
    expect(eventTypeLabel("CASAMENTO", "en")).toBe("Wedding");
    expect(quoteStatusLabel("BOOKED", "pt")).toBe("Contratação confirmada");
    expect(formatDate("2026-12-05", "en")).toContain("December");
    expect(formatDate("2026-12-05", "pt")).toContain("dezembro");
    expect(formatRange(150000, null, "en")).toMatch(/^from R\$/);
  });
  it("mensagens de retorno traduzidas; desconhecidas ficam como estão", () => {
    expect(msg("Data liberada.", "en")).toBe("Date freed up.");
    expect(msg("Data liberada.", "pt")).toBe("Data liberada.");
    expect(msg("3 datas bloqueadas.", "en")).toBe("3 dates blocked.");
    expect(msg("Texto qualquer", "en")).toBe("Texto qualquer");
  });
});
