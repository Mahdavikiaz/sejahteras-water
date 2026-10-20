import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-3" />
      <p className="text-sm font-medium text-slate-600">Memuat data operasional...</p>
    </div>
  );
}
