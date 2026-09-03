/**
 * MoreSheet Component
 * Bottom sheet with secondary modules (Curva S, Suprimentos, Sienge, Relatórios, etc.)
 */
export function MoreSheet({ isOpen }) {
  if (!isOpen) return '';
  return `
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end" onclick="toggleMobileMoreSheet()">
      <div class="bg-white rounded-t-[26px] p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <strong class="text-sm font-black text-slate-950">Mais Módulos</strong>
          <button onclick="toggleMobileMoreSheet()" class="p-1 rounded-full text-slate-400">✕</button>
        </div>
      </div>
    </div>
  `;
}
