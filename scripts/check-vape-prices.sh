#!/bin/bash

# Check Disposable Vape inventory prices
curl -X POST \
  "https://uaednwpxursknmwdeejn.supabase.co/functions/v1/update-inventory" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

echo ""
echo "✅ Inventory market values updated!"
echo ""
echo "To check vape prices in Supabase SQL Editor, run:"
echo ""
echo "SELECT"
echo "  p.name,"
echo "  i.nrv_per_unit,"
echo "  i.lcm_value"
echo "FROM inventory i"
echo "JOIN products p ON p.id = i.product_id"
echo "JOIN categories cat ON cat.id = p.primary_category_id"
echo "WHERE cat.name = 'Disposable Vape'"
echo "  AND i.quantity > 0"
echo "LIMIT 5;"
