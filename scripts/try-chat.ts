import { chat } from "../src/server/ai/agent";
const msgs = process.argv.slice(2);
(async () => {
  let conv: string | null = null;
  for (const m of msgs) {
    const r = await chat({ message: m, conversationId: conv, userId: null, anonKey: "test-anon" });
    conv = r.conversationId;
    console.log("\n👤", m, "\n🤖", r.reply);
    if (r.ui.plan) console.log("   PLANO v" + r.ui.plan.version, r.ui.plan.lines.map(l => `${l.slug}:${l.priority[0]}:${l.estMin/100}-${l.estMax/100}→${l.allocated/100}`).join(" | "), "reserva", r.ui.plan.reserve/100, r.ui.plan.warnings);
    for (const rec of r.ui.recommendations ?? []) console.log("   ", rec.categorySlug, "→", rec.providers.map(p => `${p.tradeName}(${p.distanceKm}km, ${p.score})`).join(", "), JSON.stringify(rec.excluded));
  }
  process.exit(0);
})();
