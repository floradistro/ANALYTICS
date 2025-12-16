#!/bin/bash

# Helper script to run SQL via Edge Function
# Usage: ./run-sql.sh "function_name" '{"param1": "value1"}'

FUNCTION_NAME=$1
PARAMS=${2:-"{}"}

curl -X POST \
  "https://uaednwpxursknmwdeejn.supabase.co/functions/v1/run-sql" \
  -H "Content-Type: application/json" \
  -d "{\"function_name\": \"$FUNCTION_NAME\", \"params\": $PARAMS}" | jq '.'
