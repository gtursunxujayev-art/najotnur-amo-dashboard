# amoCRM Integration Setup Guide
## Using the Admin Panel Constructor (Recommended Method)

### Why Use the Constructor?
✅ **Visual Interface** - No code editing required  
✅ **Real-time Data** - Fetches actual pipelines and statuses from your amoCRM  
✅ **Error Prevention** - Dropdowns prevent invalid IDs  
✅ **Easy Updates** - One-click save to update configuration

---

## Step-by-Step Configuration

### 1. Access Admin Panel
Visit: `https://your-replit-url/admin`  
Click on the **"KONSTRUKTOR"** tab

### 2. Load amoCRM Metadata
Click **"Meta yuklamoq"** (Load Meta) button  
This fetches all your pipelines, statuses, loss reasons, and custom fields from amoCRM.

---

## Configuration Sections

### A. 📊 **Pipeline Selection**
**What it does:** Defines which sales pipelines to track in the dashboard

**How to configure:**
- You'll see a list of all your pipelines (e.g., "Filtr", "Sales", etc.)
- Check the boxes for pipelines you want to track
- **Recommendation:** Select your main active sales pipeline

**Example from your amoCRM:**
- ✅ Filtr (ID: 8384726) - This is your main pipeline

---

### B. ✅ **Status Configuration**
**What it does:** Tells the dashboard which statuses mean "qualified", "won", and "lost"

**Three categories to configure:**

#### 1. **Malakali (Qualified) Statuses**
These are statuses where the lead is serious and engaged:
- Example: "Aloqaga chiqdik", "Qiziqish bildirdi", "Taklif yuborildi"
- **Impact:** Calculates qualified lead count and conversion rate

#### 2. **Yutilgan (Won) Statuses**  
These are statuses where the deal was successfully closed:
- Example: "To'lov qildi", "Ro'yxatdan o'tdi", "Shartnoma imzolandi"
- **Impact:** Calculates revenue, won deals, conversion rate

#### 3. **Yo'qotilgan (Lost) Statuses**
These are statuses where the lead was lost/rejected:
- Example: "Rad etdi", "Javob bermadi", "Boshqa joy tanladi"
- **Impact:** Tracks lost opportunities

---

### C. ❌ **Loss Reasons (E'tiroz sababi)**
**What it does:** Separates "qualified objections" from "not qualified leads"

**Two categories:**

#### 1. **Malakali e'tirozlar (Qualified Loss Reasons)**
Leads who were serious but had valid objections:
- Example: "Narx baland", "Vaqt mos kelmadi", "Boshqa kurs tanladi"
- **Impact:** These count as "qualified" leads in your conversion metrics

#### 2. **Malakasiz (Not Qualified Reasons)**
Leads who were never serious prospects:
- Example: "Telefon o'chiq", "Noto'g'ri raqam", "Test lead", "Spam"
- **Impact:** These are excluded from quality metrics

**Note:** The system already knows about custom field ID 1121759 for "E'tiroz sababi"

---

### D. 🎯 **Lead Source Tracking** (Optional)
**What it does:** Shows where your leads come from

**How to configure:**
1. Select the custom field that tracks lead source (e.g., "Lead Source", "Manba", "utm_source")
2. The dashboard will show breakdown by source (Instagram, Facebook, Website, etc.)

---

### E. 📚 **Course Type Tracking** (Optional)
**What it does:** Separates online vs offline course sales

**How to configure:**
1. Select the custom field for course type
2. Mark which enum values = "Online" courses
3. Mark which enum values = "Offline" courses
4. **Impact:** Dashboard shows "Online summasi" vs "Offline summasi"

---

### F. 📞 **Call History Configuration**

**Two options available:**

#### Option 1: **amoCRM Qo'ng'iroqlar (amoCRM Calls)**
- Check "amoCRM qo'ng'iroqlaridan foydalanish"
- **Source:** Call notes from amoCRM
- **Shows:** Total calls, duration per manager
- **Best for:** If managers log all calls in amoCRM

#### Option 2: **Google Sheets Qo'ng'iroqlar**
- Check "Google Sheets qo'ng'iroqlaridan foydalanish"
- **Source:** Google Sheets with call data
- **Shows:** Successful calls, duration, manager performance
- **Best for:** If you track calls in a separate spreadsheet

#### Option 3: **Both**
- Enable both checkboxes
- **Result:** amoCRM calls + Google Sheets successful calls combined
- **Best for:** Complete call tracking

**Note:** For Google Sheets calls, you need:
- Environment variable: `SHEETS_SPREADSHEET_ID` (already set ✅)
- Environment variable: `SHEETS_CALLS_RANGE` (default: "Calls!A:D")
- Sheet format: Column A=datetime, B=manager, C=duration(sec), D=result

---

### 3. Save Configuration
Click **"Saqlash"** (Save) button at the bottom  
The system will:
1. Save your configuration to `config/dashboardConfig.ts`
2. Optionally sync to GitHub (if configured)
3. Dashboard will immediately use the new settings

---

## After Configuration

### Test the Dashboard
1. Go to `/dashboard`
2. You should now see:
   - ✅ Lead counts (total, qualified, non-qualified)
   - ✅ Conversion rates (qualified → won)
   - ✅ Revenue data
   - ✅ Manager performance
   - ✅ Lead sources breakdown
   - ✅ Call statistics (if enabled)
   - ✅ Loss reasons (objections)

### Common Issues

**Problem:** Dashboard still shows 0  
**Solution:**
- Check that you selected at least one pipeline
- Check that you marked at least one "Won" status
- Verify date filter (switch between week/month/custom range)

**Problem:** "Meta yuklashda xatolik" error  
**Solution:**
- Check that `AMO_BASE_URL` and `AMO_LONG_LIVED_TOKEN` environment variables are set
- Verify amoCRM API token is still valid

**Problem:** Revenue shows 0  
**Solution:**
- Configure "Tushum" tab separately
- Verify Google Sheets has data for the selected date range
- Check column mappings are correct

---

## Environment Variables Reference

Already configured ✅:
- `AMO_BASE_URL` = https://najotnur01.amocrm.ru
- `AMO_LONG_LIVED_TOKEN` = (secret)
- `SHEETS_SPREADSHEET_ID` = 1WmYVOW6surq2eG03WBE8mJGn2CnTaB-cgeQTrsqJnZo

Optional:
- `SHEETS_CALLS_RANGE` = "Calls!A:D" (default, change if your call data is in a different sheet)

---

## Summary

**RECOMMENDED APPROACH:** Use the Constructor (Admin Panel)

1. Visit `/admin` → **KONSTRUKTOR** tab
2. Click **"Meta yuklamoq"** to load amoCRM data
3. Configure pipelines, statuses, loss reasons
4. Optionally configure lead source and course type
5. Enable call history (amoCRM, Google Sheets, or both)
6. Click **"Saqlash"** to save
7. Test the dashboard at `/dashboard`

**This approach requires ZERO code editing** and provides a user-friendly interface for configuration.

---

## Need Help?

If you encounter issues or need to check configuration:
- Current config file: `config/dashboardConfig.ts`
- View environment variables in Replit Secrets panel
- Check server logs in the Console tab
