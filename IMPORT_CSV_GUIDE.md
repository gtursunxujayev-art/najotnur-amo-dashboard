# 📥 Import OnlinePBX Calls from CSV

## Your Situation
- ✅ You have CSV file with 2871 calls (Jan 1 - today)
- ✅ Webhook is configured and working (2 test calls captured)
- ✅ Now you need to import historical data

---

## Step 1: Prepare Your CSV File

Your CSV should have these columns (in any order):
```
call_id, date, direction, duration, phone, user
```

Example:
```
pbx-001,2025-01-01 08:15:30,in,120,+998901234567,Diyorbek
pbx-002,2025-01-01 09:45:15,out,45,+998902345678,Shaxnoza
pbx-003,2025-01-02 10:30:00,in,180,+998903456789,Abdulla
```

---

## Step 2: Import the CSV

### **Option A: Using cURL (Easiest)**

```bash
curl -X POST "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/import" \
  -H "Content-Type: text/csv" \
  --data-binary @calls.csv
```

Replace `calls.csv` with your actual filename.

### **Option B: Using PowerShell (Windows)**

```powershell
$csvPath = "C:\Users\YourName\calls.csv"
$url = "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/import"

$fileContent = [System.IO.File]::ReadAllBytes($csvPath)
$request = [System.Net.HttpWebRequest]::Create($url)
$request.Method = "POST"
$request.ContentType = "text/csv"
$request.ContentLength = $fileContent.Length

$requestStream = $request.GetRequestStream()
$requestStream.Write($fileContent, 0, $fileContent.Length)
$requestStream.Close()

$response = $request.GetResponse()
$responseStream = $response.GetResponseStream()
$streamReader = New-Object System.IO.StreamReader($responseStream)
$streamReader.ReadToEnd()
```

### **Option C: Using Postman**

1. Open Postman
2. Create POST request to: `https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/import`
3. Go to **Body** tab
4. Select **binary**
5. Click **Select File** and choose your CSV
6. Send

---

## Step 3: Check Import Status

After import, run this to see total calls:

```bash
curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls?limit=1000"
```

Expected response after import:
```json
{
  "success": true,
  "data": {
    "totalCalls": 2873,  // Was 2, now 2873 (2871 from CSV + 2 test)
    "filteredCount": 2873,
    "recentCalls": [
      // Your 2871 calls will appear here
    ]
  }
}
```

---

## Step 4: Verify in Dashboard

1. Go to: `https://najotnur-amo-dashboard-gtursunxujayev.replit.app/dashboard`
2. Click **"Bu oy"** (This Month)
3. Scroll to **"Qo'ng'iroqlar bo'yicha menejerlar"**
4. You should see:
   - All managers from your CSV
   - Total call counts per manager
   - Call statistics

---

## Step 5: Test Real Webhook Call

Once you verify CSV imported successfully:

1. **Make a REAL call** through OnlinePBX (not a test call)
   - Call in from your customer
   - Or dial out from OnlinePBX system
   - Real transaction through panel

2. **Check immediately after:**
   ```bash
   curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls?limit=5"
   ```

3. **You should see:**
   - Your real call at the TOP
   - Marked with `"source": "webhook"`
   - New timestamp (current time)

---

## 📊 Expected Results After Import

| Metric | Before | After Import | After Real Call |
|--------|--------|--------------|-----------------|
| Total Calls | 2 | 2,873 | 2,874 |
| Managers | 1 | ~5-10 | ~5-10 |
| Dashboard Shows | Test calls only | All historical calls | Historical + new |

---

## 🔍 Troubleshooting Import

### Error: "Invalid CSV format"
- Check CSV has correct columns: `call_id, date, direction, duration, phone, user`
- Verify dates are in format: `YYYY-MM-DD HH:MM:SS` or `2025-01-01T08:15:30Z`
- Make sure no empty rows

### Error: "File too large"
- Limit is ~50MB
- If your CSV is larger, split it into chunks and import separately

### Import succeeded but don't see calls
```bash
# Check database directly
curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls?from=2025-01-01&to=2025-01-31"
```

---

## ✨ Next: Test Real Call

After CSV import:

1. **Trigger real call** through OnlinePBX
2. **Wait 5 seconds** for webhook delivery
3. **Check endpoint:**
   ```bash
   curl "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/onlinepbx/calls?limit=3"
   ```
4. **You should see:**
   - Your real call in response
   - `"source": "webhook"` (not "test")
   - Current timestamp

That's it! Your webhook is working! 🎉

---

## Full Flow Summary

```
CSV File (2871 calls)
       ↓
   Import API
       ↓
PostgreSQL Database
       ↓
Dashboard Display
       ↓
✅ Shows all historical calls + new webhook calls
```
