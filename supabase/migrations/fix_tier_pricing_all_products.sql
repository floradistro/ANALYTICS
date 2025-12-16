-- Update inventory market value function to handle tiered pricing for ALL products
CREATE OR REPLACE FUNCTION update_inventory_market_value_by_category()
RETURNS void AS $$
BEGIN
  WITH category_averages AS (
    SELECT
      cat.id as category_id,
      cat.name as category_name,
      CASE
        WHEN cat.name = 'Flower' THEN
          -- Flower: use $/gram
          SUM(oi.line_subtotal) / NULLIF(SUM(oi.quantity_grams), 0)
        ELSE
          -- All other categories: calculate per-unit price accounting for tiers
          -- Detect pack size from price ranges and calculate true per-unit average
          SUM(oi.line_subtotal) / NULLIF(
            SUM(
              CASE
                -- $20-35 range = 1 unit
                WHEN oi.line_subtotal BETWEEN 20 AND 35 THEN 1
                -- $40-55 range = 2 units
                WHEN oi.line_subtotal BETWEEN 40 AND 55 THEN 2
                -- $60-75 range = 3 units
                WHEN oi.line_subtotal BETWEEN 60 AND 75 THEN 3
                -- $80-95 range = 4 units
                WHEN oi.line_subtotal BETWEEN 80 AND 95 THEN 4
                -- $100-115 range = 5 units
                WHEN oi.line_subtotal BETWEEN 100 AND 115 THEN 5
                -- Otherwise use actual quantity
                ELSE oi.quantity
              END
            ),
            0
          )
      END as avg_price
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    JOIN categories cat ON cat.id = p.primary_category_id
    WHERE o.payment_status = 'paid'
      AND o.status != 'cancelled'
      AND o.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY cat.id, cat.name
  )
  UPDATE inventory i
  SET
    nrv_per_unit = COALESCE(ca.avg_price, 0),
    lcm_value = COALESCE(ca.avg_price, 0),
    last_nrv_update = NOW()
  FROM products p
  LEFT JOIN category_averages ca ON ca.category_id = p.primary_category_id
  WHERE i.product_id = p.id
    AND i.quantity > 0;
END;
$$ LANGUAGE plpgsql;

-- Run the update immediately
SELECT update_inventory_market_value_by_category();
