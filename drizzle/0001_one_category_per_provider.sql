-- Regra nova: cada fornecedor atua em UMA categoria.
-- 1) Fornecedores com mais de uma categoria ficam com a que tem mais serviços ativos (empate: a primeira do catálogo).
WITH ranked AS (
  SELECT pc.provider_id, pc.category_id,
    row_number() OVER (
      PARTITION BY pc.provider_id
      ORDER BY (SELECT count(*) FROM "services" s WHERE s.provider_id = pc.provider_id AND s.category_id = pc.category_id AND s.active) DESC, c.sort_order ASC
    ) AS rn
  FROM "provider_categories" pc
  JOIN "categories" c ON c.id = pc.category_id
)
DELETE FROM "provider_categories" pc USING ranked r
WHERE pc.provider_id = r.provider_id AND pc.category_id = r.category_id AND r.rn > 1;--> statement-breakpoint
-- 2) Serviços de outras categorias são desativados (não apagados).
UPDATE "services" s SET "active" = false
WHERE s.active AND NOT EXISTS (SELECT 1 FROM "provider_categories" pc WHERE pc.provider_id = s.provider_id AND pc.category_id = s.category_id);--> statement-breakpoint
CREATE UNIQUE INDEX "provider_categories_provider_uq" ON "provider_categories" USING btree ("provider_id");
