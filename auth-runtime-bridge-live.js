(() => {
  'use strict';

  let attempts = 0;

  function applyPlanesAuthBridge() {
    attempts += 1;

    if (window.__PLANES_AUTH_HYDRATED__) return true;

    const bridge = window.__PLANES_AUTH_BRIDGE_PAYLOAD__;
    if (!bridge || !bridge.user) {
      if (attempts < 300) window.setTimeout(applyPlanesAuthBridge, 100);
      return false;
    }

    try {
      if (typeof currentUser === 'undefined' ||
          typeof currentScreen === 'undefined' ||
          typeof render !== 'function') {
        if (attempts < 300) window.setTimeout(applyPlanesAuthBridge, 100);
        return false;
      }

      currentUser = bridge.user;

      if (typeof accessLevel !== 'undefined') {
        accessLevel = bridge.user.level || bridge.user.role || 'campo';
      }

      let savedUiState = null;
      try {
        const raw = localStorage.getItem('planes_active_session');
        const parsed = raw ? JSON.parse(raw) : null;
        savedUiState = parsed && typeof parsed === 'object' ? parsed : null;
      } catch {}

      if (savedUiState?.activeNav && typeof activeNav !== 'undefined') {
        activeNav = savedUiState.activeNav;
      }

      if (currentScreen === 'login' ||
          currentScreen === 'access_rejected' ||
          currentScreen === 'access_suspended') {
        const requestedScreen = savedUiState?.currentScreen;
        currentScreen = requestedScreen === 'dashboard' || requestedScreen === 'projects'
          ? requestedScreen
          : 'projects';
      }

      if (savedUiState?.selectedProjectId && typeof selectedProjectId !== 'undefined') {
        const desiredProjectId = savedUiState.selectedProjectId;
        selectedProjectId = desiredProjectId;

        let projectAttempts = 0;
        const restoreProject = () => {
          projectAttempts += 1;
          try {
            if (typeof projectsList === 'undefined' ||
                !Array.isArray(projectsList) ||
                typeof selectedProject === 'undefined') {
              if (projectAttempts < 120) window.setTimeout(restoreProject, 100);
              return;
            }

            const restored = projectsList.find(project =>
              project.id === desiredProjectId || project.cloudId === desiredProjectId
            );

            if (restored) {
              selectedProjectId = restored.id || desiredProjectId;
              selectedProject = restored;
              if (typeof operationalProjectIdCache !== 'undefined') {
                operationalProjectIdCache = restored.cloudId || null;
              }
              if (typeof render === 'function') render();
              return;
            }

            if (projectAttempts < 120) window.setTimeout(restoreProject, 100);
          } catch {
            if (projectAttempts < 120) window.setTimeout(restoreProject, 100);
          }
        };
        restoreProject();
      }

      if (typeof setupRealtimeSubscriptions === 'function') {
        try { setupRealtimeSubscriptions(); } catch (error) {
          console.warn('Realtime hydrate warning:', error);
        }
      }
      if (typeof updateUserPresence === 'function') {
        try { updateUserPresence(); } catch {}
      }
      if (typeof broadcastPresenceHeartbeat === 'function') {
        try { broadcastPresenceHeartbeat(); } catch {}
      }

      render();

      window.__PLANES_AUTH_HYDRATED__ = true;
      window.dispatchEvent(new CustomEvent('planes-auth-legacy-hydrated', {
        detail: bridge
      }));

      return true;
    } catch (error) {
      console.warn('Planes bottom auth bridge retry:', error);
      if (attempts < 300) window.setTimeout(applyPlanesAuthBridge, 100);
      return false;
    }
  }

  applyPlanesAuthBridge();
})();
