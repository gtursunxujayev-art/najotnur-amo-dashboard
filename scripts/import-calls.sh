#!/bin/bash

# OnlinePBX Calls CSV Import Script
# Usage: ./import-calls.sh your_calls.csv

if [ $# -eq 0 ]; then
    echo "❌ Usage: ./import-calls.sh <csv-file>"
    echo ""
    echo "Example:"
    echo "  ./import-calls.sh calls.csv"
    echo "  ./import-calls.sh /path/to/calls.csv"
    exit 1
fi

CSV_FILE="$1"
API_URL="https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/import"

# Check if file exists
if [ ! -f "$CSV_FILE" ]; then
    echo "❌ File not found: $CSV_FILE"
    exit 1
fi

echo "📥 Importing calls from: $CSV_FILE"
echo "🔗 Target: $API_URL"
echo ""

# Import
echo "⏳ Uploading... (this may take a minute for large files)"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: text/csv" \
  --data-binary "@$CSV_FILE")

echo ""
echo "📋 Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Extract success status
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ Import completed!"
    echo ""
    echo "Checking total calls..."
    CALLS=$(curl -s "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls" | grep -o '"totalCalls":[0-9]*' | cut -d':' -f2)
    echo "📊 Total calls in system: $CALLS"
else
    echo ""
    echo "❌ Import failed. Check the response above."
    exit 1
fi
