export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-teal-600/10 flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 rounded-full border-3 border-teal-600 border-t-transparent animate-spin" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Loading DentiFlow...</h3>
          <p className="text-xs text-slate-500 mt-1">Please wait while we prepare clinical records.</p>
        </div>
      </div>
    </div>
  );
}
