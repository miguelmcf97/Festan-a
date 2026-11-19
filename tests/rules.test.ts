import { describe, expect, it } from "vitest";
import { isValidCNPJ, isValidCPF } from "@/lib/br-docs";
import { haversineKm } from "@/lib/geo";
import { assertTransition, QUOTE_TRANSITIONS } from "@/lib/quote-rules";
import { formatBRL, reaisToCents } from "@/lib/format";
import { extractEventInfo, matchLocation, parseDate } from "@/server/ai/extract";

describe("máquina de estados da solicitação", () => {
  it("não permite pular de solicitação direto para contratação confirmada", () => {
    expect(() => assertTransition("NEW", "BOOKED")).toThrow();
    expect(() => assertTransition("QUOTED", "BOOKED")).toThrow();
  });
  it("contratação só nasce de proposta aceita", () => {
    const into = Object.entries(QUOTE_TRANSITIONS).filter(([, to]) => to.includes("BOOKED")).map(([from]) => from);
    expect(into).toEqual(["PROPOSAL_ACCEPTED"]);
  });
  it("estados finais não têm saída", () => {
    for (const s of ["COMPLETED", "CANCELLED", "DECLINED"] as const) expect(QUOTE_TRANSITIONS[s]).toHaveLength(0);
  });
  it("concluída só a partir de contratação confirmada", () => {
    const into = Object.entries(QUOTE_TRANSITIONS).filter(([, to]) => to.includes("COMPLETED")).map(([from]) => from);
    expect(into).toEqual(["BOOKED"]);
  });
});

describe("documentos", () => {
  it("valida CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("529.982.247-24")).toBe(false);
  });
  it("valida CNPJ", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11.222.333/0001-80")).toBe(false);
    expect(isValidCNPJ("00000000000000")).toBe(false);
  });
});

describe("dinheiro", () => {
  it("converte reais em centavos no formato brasileiro", () => {
    expect(reaisToCents("1.500")).toBe(150000);
    expect(reaisToCents("1.500,50")).toBe(150050);
    expect(reaisToCents("850")).toBe(85000);
    expect(reaisToCents("")).toBeNull();
  });
  it("formata BRL", () => expect(formatBRL(800000)).toMatch(/R\$\s?8\.000/));
});

describe("extração do pedido (modo demonstração da IA)", () => {
  const today = new Date("2026-11-19T12:00:00");
  it("entende o exemplo do briefing", () => {
    const e = extractEventInfo("Quero fazer uma festa de aniversário infantil para 80 pessoas, no Rio de Janeiro, com orçamento de R$ 8.000. Quero brinquedos para crianças, churrasco, decoração e música.", today);
    expect(e.type).toBe("ANIVERSARIO_INFANTIL");
    expect(e.guests).toBe(80);
    expect(e.budgetCents).toBe(800000);
    expect(e.serviceKeywords).toEqual(expect.arrayContaining(["churrasco", "decoracao", "brinquedos-inflaveis", "dj"]));
  });
  it("entende 15 anos com 'mil'", () => {
    const e = extractEventInfo("Quero fazer uma festa de 15 anos para 100 pessoas, mas só tenho R$ 12 mil.", today);
    expect(e.type).toBe("QUINZE_ANOS");
    expect(e.guests).toBe(100);
    expect(e.budgetCents).toBe(1200000);
  });
  it("identifica remoção de serviço", () => {
    const e = extractEventInfo("pode tirar a fotografia", today);
    expect(e.removeKeywords).toContain("fotografia");
  });
  it("entende que a pessoa não tem local", () => {
    expect(extractEventInfo("ainda não tenho local", today).hasVenue).toBe(false);
    expect(extractEventInfo("vai ser na minha casa", today).hasVenue).toBe(true);
  });
  it("datas futuras", () => {
    expect(parseDate("dia 20/12", today)).toBe("2026-12-20");
    expect(parseDate("10 de marco", today)).toBe("2027-03-10");
  });
});

describe("localização", () => {
  const locs = [
    { id: "1", name: "Centro", city: "Rio de Janeiro" },
    { id: "2", name: "Jacarepaguá", city: "Rio de Janeiro" },
    { id: "3", name: "Icaraí", city: "Niterói" },
    { id: "4", name: "Centro", city: "Niterói" },
  ];
  it("pede bairro quando só informa a cidade do Rio", () => {
    const m = matchLocation("Rio de Janeiro", locs);
    expect(m?.needsNeighborhood).toBe(true);
  });
  it("aceita município menor como referência", () => {
    expect(matchLocation("Niterói", locs)?.loc.id).toBe("4");
  });
  it("encontra bairro sem acento", () => {
    expect(matchLocation("jacarepagua", locs)?.loc.id).toBe("2");
  });
  it("distância Barra–Tijuca ≈ 15 km", () => {
    const d = haversineKm({ lat: -23.0004, lng: -43.3659 }, { lat: -22.925, lng: -43.233 });
    expect(d).toBeGreaterThan(12);
    expect(d).toBeLessThan(18);
  });
});
