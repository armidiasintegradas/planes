/**
 * ProjectSwitcherSheet Component
 * Renders the bottom sheet for switching active engineering project
 */
export function ProjectSwitcherSheet({ projectsList, selectedProjectId, isOpen }) {
  if (!isOpen) return '';
  return `
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end" onclick="toggleMobileProjectSwitcher()">
      <div class="bg-white rounded-t-[26px] p-5 space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <strong class="text-sm font-black text-slate-950">Selecione o Empreendimento</strong>
          <button onclick="toggleMobileProjectSwitcher()" class="p-1 rounded-full text-slate-400">✕</button>
        </div>
        <div class="space-y-2">
          ${projectsList.map(p => `
            <div onclick="openProject('${p.id}'); toggleMobileProjectSwitcher();" class="p-3.5 rounded-[16px] border flex items-center justify-between ${selectedProjectId === p.id ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}">
              <div>
                <strong class="text-xs font-bold block">${p.title}</strong>
                <span class="text-[10.5px] opacity-75">${p.location} · ${p.progress}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
