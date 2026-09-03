/**
 * MobileAppShell Component
 * Manages the layout container for devices < 1024px
 * Integrates MobileTopBar, MobileScreenContainer, MobileBottomNav, ProjectSwitcherSheet, MoreSheet
 */
export function MobileAppShell({ selectedProject, projectsList, selectedProjectId, contentHtml, mobileCurrentTab, activeNav }) {
  return `
    <div class="block lg:hidden w-full min-h-screen pb-24 bg-slate-100/60 font-sans">
      ${renderMobileTopBar(selectedProject)}
      <main class="w-full">
        ${contentHtml}
      </main>
      ${renderMobileBottomNav(mobileCurrentTab, activeNav)}
      ${renderMobileProjectSwitcherSheet(projectsList, selectedProjectId)}
      ${renderMobileMoreSheet()}
    </div>
  `;
}
