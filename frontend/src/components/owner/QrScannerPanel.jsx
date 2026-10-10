import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';

const QrScannerPanel = ({
  qrTokenInput,
  setQrTokenInput,
  isVerifyingQr,
  verifyResult,
  handleVerifyQr
}) => {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-3">
        <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <QrCode size={22} />
        </div>
        <div>
          <h4 className="text-base font-black text-emerald-950 dark:text-emerald-300 tracking-tight">
            Counter Verification Scanner
          </h4>
          <p className="text-sm font-normal text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
            Paste or scan the student's 15-minute Meal Pass Token to confirm eligibility and mark meal served.
          </p>
        </div>
      </div>

      <form onSubmit={handleVerifyQr} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Meal Pass Token Payload
          </label>
          <textarea
            rows={4}
            value={qrTokenInput}
            onChange={(e) => setQrTokenInput(e.target.value)}
            placeholder="Paste student QR pass token string here..."
            required
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-base font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
          />
        </div>

        {verifyResult && (
          <div
            className={`p-4 rounded-xl border text-base font-medium flex items-start gap-3 transition-all ${
              verifyResult.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
            }`}
          >
            {verifyResult.type === 'success' ? (
              <CheckCircle2 size={22} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle size={22} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{verifyResult.message}</p>
              {verifyResult.studentName && (
                <p className="text-sm font-normal mt-1 opacity-90">
                  Student: <strong className="font-semibold">{verifyResult.studentName}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isVerifyingQr || !qrTokenInput.trim()}
          className="w-full h-12 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-base"
        >
          {isVerifyingQr ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          <span>Verify & Claim Meal</span>
        </button>
      </form>
    </div>
  );
};

export default QrScannerPanel;
