/**
 * MobileTopBar Component
 * Renders the top navigation header on mobile devices (< 1024px)
 * Displays Planes Logo, Project Title selector trigger, notifications, and profile
 */
export function MobileTopBar({ selectedProject }) {
  return `
    <header class="sticky top-0 z-30 w-full ios-blur-header border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
      <div class="flex items-center gap-2.5 min-w-0">
        <button type="button" onclick="handleLogoClick()" class="cursor-pointer shrink-0" title="Home">
          <div class="w-8 h-8 rounded-lg bg-[#0b2535] text-white flex items-center justify-center font-black text-sm shadow-xs">
            P
          </div>
        </button>
        <button type="button" onclick="toggleMobileProjectSwitcher()" class="flex items-center gap-1.5 text-left truncate min-w-0 cursor-pointer">
          <div class="truncate">
            <span class="text-[9.5px] font-mono font-bold text-slate-500 uppercase tracking-wider block">PROJETO ATIVO</span>
            <strong class="text-xs font-black text-slate-950 truncate block leading-tight">${selectedProject ? selectedProject.title : 'Selecionar'}</strong>
          </div>
          <span class="text-slate-400 text-xs">▼</span>
        </button>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>Ao Vivo</span>
        </span>
      </div>
    </header>
  `;
}
