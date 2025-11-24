# 🔌 OnlinePBX Webhook Verification Guide

## How to Know if Your Webhook is Working

### **Webhook Endpoint URL**
```
https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/webhook
```

---

## ✅ Method 1: Check Recent Calls (Real-time)

### Step 1: Query Recent Calls
```bash
curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls"
```

### Step 2: Response Shows Webhook Status
**If webhook is working**, you'll see:
```json
{
  "success": true,
  "data": {
    "totalCalls": 5,
    "filteredCount": 5,
    "recentCalls": [
      {
        "id": "pbx-call-12345",
        "date": "2025-11-24T10:30:45.000Z",
        "direction": "in",
        "duration": 120,
        "phone": "+998901234567",
        "user": "Diyorbek",
        "source": "webhook"
      }
    ]
  }
}
```

**If webhook is NOT working yet**, you'll see:
```json
{
  "success": true,
  "data": {
    "totalCalls": 0,
    "filteredCount": 0,
    "recentCalls": []
  }
}
```

---

## ✅ Method 2: Query by Date Range

### Check This Month's Calls
```bash
curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls?from=2025-11-01&to=2025-11-30"
```

### Check Last 7 Days
```bash
curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls?from=2025-11-17&to=2025-11-24"
```

---

## ✅ Method 3: Dashboard Display

### Check the Dashboard Calls Section
1. Go to: `https://najotnur-amo-dashboard-gtursunxujayev.replit.app/dashboard`
2. Click **"Bu oy"** (This Month)
3. Scroll down to **"Qo'ng'iroqlar bo'yicha menejerlar (amoCRM)"**
4. If webhook is working, you'll see:
   - Manager names
   - Total calls per manager
   - Outbound call counts

---

## 🔧 How to Configure Webhook in OnlinePBX

### Step 1: Log into OnlinePBX Panel
- Domain: `pbx13532.onlinepbx.ru` (or your panel)
- Go to Settings → Webhooks (or Integration settings)

### Step 2: Add New Webhook
- **Webhook URL**: `https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/webhook`
- **Event Type**: `call_end` (or all call events)
- **Protocol**: HTTP POST
- **Format**: JSON (or Form-encoded)

### Step 3: Save and Test
1. Click **Save**
2. Make a test call from your OnlinePBX system
3. Check back here using Method 1 or 2 above

---

## ⏱️ Testing Workflow

### Timeline for Verification

| Step | Action | Expected Result | Time |
|---|---|---|---|
| 1 | Configure webhook URL | Saved in OnlinePBX settings | 1 min |
| 2 | Make test call | Outbound/inbound call on system | 1-2 min |
| 3 | Wait for webhook | System sends call data | Immediate |
| 4 | Check API endpoint | See call in response | 5-10 sec |
| 5 | Refresh dashboard | See call in month view | 10-30 sec |

---

## 🎯 Real Calls vs Test Calls

### What Gets Captured
✅ **Real calls** made through OnlinePBX system  
✅ **Answered calls** (inbound and outbound)  
✅ **Missed calls** (if configured in webhook)  
✅ **Transfers** (if configured)

### What Doesn't Get Captured
❌ **Old historical calls** (before webhook setup)  
❌ **Calls from other systems** (unless also connected)  
❌ **Manual test calls** (if not through real OnlinePBX line)

---

## 📊 Current Status

### Total Calls Captured So Far
```bash
# Check total calls in database
curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls?limit=1000" \
  | grep -o '"filteredCount":[0-9]*' 
```

### Example Response Indicates:
- `filteredCount: 0` → Webhook not yet receiving calls
- `filteredCount: 10` → Webhook working! 10 calls captured
- `filteredCount: 2871` → After importing historical data or after many real calls

---

## 🚀 To Get Your 2871 Calls

### Option A: Import Historical Data (Recommended)
```bash
# Export CSV from OnlinePBX, then import:
curl -X POST "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/import" \
  -H "Content-Type: text/csv" \
  --data-binary @calls.csv
```

### Option B: Let Webhook Accumulate
- Real calls come in automatically
- Over time: 5 → 50 → 500 → 2871 calls
- Dashboard updates in real-time

---

## 🔍 Troubleshooting

### Webhook Not Receiving Calls?

**Check 1: Verify Webhook URL**
```bash
# Is the endpoint alive?
curl -X POST "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Check 2: Verify OnlinePBX Settings**
1. Log into OnlinePBX panel
2. Go to Settings → Webhooks
3. Check if URL is correct
4. Verify webhook is **Enabled**
5. Check event types are selected

**Check 3: Verify Network**
- Can OnlinePBX panel reach your domain?
- Is there a firewall blocking webhooks?
- Try test webhook send from panel

**Check 4: Monitor Live**
```bash
# Watch for new calls in real-time (every 5 seconds)
while true; do
  curl -s "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls" \
    | grep -o '"filteredCount":[0-9]*'
  sleep 5
done
```

---

## ✨ Next Steps

1. **Configure webhook** in OnlinePBX panel (5 min)
2. **Make test call** through OnlinePBX (1 min)
3. **Check API endpoint** using Method 1 above (1 min)
4. **Refresh dashboard** to see data (1 min)
5. **Import historical data** if you have CSV export (5 min)

That's it! Your webhook is now collecting real-time call data. 🎉
