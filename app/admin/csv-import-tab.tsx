// This content should be inserted in admin page before the info tab

export const CSVImportTab = ({ csvFile, setCsvFile, csvUploading, setCsvUploading, csvResult, setCsvResult, setMsg, setErr }: any) => {
  return (
    <div className="rounded-xl bg-slate-900/60 p-6">
      <h2 className="text-xl font-bold mb-4">📥 OnlinePBX CSV Import</h2>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setCsvFile(e.target.files?.[0] || null);
              setCsvResult(null);
            }}
            className="hidden"
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer">
            <div className="text-slate-100">{csvFile ? csvFile.name : "Select CSV file"}</div>
            <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
          </label>
        </div>

        {csvFile && (
          <div className="p-3 bg-slate-800 rounded text-sm">
            <p className="text-slate-300">
              File: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(2)} KB)
            </p>
          </div>
        )}

        <button
          onClick={async () => {
            if (!csvFile) {
              setErr("Please select a CSV file");
              return;
            }
            setCsvUploading(true);
            setMsg(null);
            setErr(null);
            try {
              const response = await fetch("/api/onlinepbx/import", {
                method: "POST",
                body: csvFile,
                headers: { "Content-Type": "text/csv" },
              });
              const data = await response.json();
              if (data.success) {
                setMsg(`✅ Imported ${data.data?.imported || 0} calls successfully`);
                setCsvResult(data.data);
                setCsvFile(null);
              } else {
                setErr(data.error || "Upload failed");
              }
            } catch (e: any) {
              setErr(e.message);
            } finally {
              setCsvUploading(false);
            }
          }}
          disabled={!csvFile || csvUploading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white py-2 rounded font-semibold"
        >
          {csvUploading ? "Uploading..." : "Upload CSV"}
        </button>

        {csvResult && (
          <div className="p-3 bg-emerald-900/30 border border-emerald-600 rounded text-sm">
            <p className="text-emerald-100">✅ Imported: {csvResult.imported}</p>
            <p className="text-emerald-100">⏭️ Skipped: {csvResult.skipped}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-400">
          <p className="font-semibold text-slate-200 mb-2">CSV Format:</p>
          <code className="bg-slate-800 p-2 block rounded overflow-x-auto text-slate-300">
            call_id,date,direction,duration,phone,user
          </code>
        </div>
      </div>
    </div>
  );
};
