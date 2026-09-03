/**
 * MobileBottomNav Component
 * Renders the 4 core destinations: Início, Planejar, Canteiro, Mais
 */
export function MobileBottomNav({ mobileCurrentTab, activeNav }) {
  return `
    <div class="fixed bottom-0 left-0 right-0 z-40 block lg:hidden ios-blur-tabbar">
      <nav class="flex items-center justify-around px-2 py-1 max-w-md mx-auto">
        <!-- 1. Início -->
        <button type="button" onclick="setMobileTab('inicio')" class="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px]">
          <span class="text-[10px] font-bold ${mobileCurrentTab === 'inicio' ? 'text-slate-950 font-black' : 'text-slate-500'}">Início</span>
        </button>
        <!-- 2. Planejar -->
        <button type="button" onclick="setMobileTab('planejar')" class="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px]">
          <span class="text-[10px] font-bold ${mobileCurrentTab === 'planejar' ? 'text-slate-950 font-black' : 'text-slate-500'}">Planejar</span>
        </button>
        <!-- 3. Canteiro -->
        <button type="button" onclick="setMobileTab('campo')" class="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px]">
          <span class="text-[10px] font-bold ${mobileCurrentTab === 'campo' ? 'text-slate-950 font-black' : 'text-slate-500'}">Canteiro</span>
        </button>
        <!-- 4. Mais -->
        <button type="button" onclick="toggleMobileMoreSheet()" class="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px]">
          <span class="text-[10px] font-bold ${mobileCurrentTab === 'mais' || mobileCurrentTab === 'modulo' ? 'text-slate-950 font-black' : 'text-slate-500'}">Mais</span>
        </button>
      </nav>
    </div>
  `;
}
