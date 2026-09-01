export function calculateKpis(state) {
  const activities = state.activities || [];
  const physicalProgress = activities.length
    ? Math.round(activities.reduce((sum, a) => sum + Number(a.progress || 0), 0) / activities.length)
    : 0;
  const committed = state.weeklyPlan || [];
  const completed = committed.filter(item => activities.find(a => a.id === item.activityId)?.status === 'Concluída').length;
  const weeklyAdherence = committed.length ? Math.round((completed / committed.length) * 100) : 0;
  const delayed = activities.filter(a => a.status === 'Em atraso').length;
  const inProgress = activities.filter(a => a.status === 'Em andamento').length;
  const completedCount = activities.filter(a => a.status === 'Concluída').length;
  const openRestrictions = (state.restrictions || []).filter(r => r.status === 'Aberta').length;
  return { physicalProgress, weeklyAdherence, delayed, inProgress, completed: completedCount, openRestrictions };
}

export function updateProgress(state, activityId, progress, actor = 'Campo') {
  const value = Math.max(0, Math.min(100, Number(progress)));
  const activities = state.activities.map(activity => {
    if (activity.id !== activityId) return activity;
    const status = value >= 100 ? 'Concluída' : value > 0 ? 'Em andamento' : 'Planejada';
    return { ...activity, progress: value, status, updatedAt: new Date().toISOString() };
  });
  return {
    ...state,
    activities,
    history: [...(state.history || []), { id:`h-${Date.now()}`, type:'production', activityId, progress:value, actor, at:new Date().toISOString() }]
  };
}

export function addRestriction(state, input) {
  const restriction = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    status: 'Aberta',
    createdAt: new Date().toISOString(),
    ...input
  };
  return { ...state, restrictions: [...(state.restrictions || []), restriction] };
}

export function closeRestriction(state, restrictionId) {
  return {
    ...state,
    restrictions: (state.restrictions || []).map(r => r.id === restrictionId ? { ...r, status:'Encerrada', closedAt:new Date().toISOString() } : r)
  };
}
