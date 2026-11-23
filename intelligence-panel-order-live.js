/* Planes OS — invert Memory of Decisions and Copilot Chat positions.
 * Visual-only DOM reordering, no data mutation, no auth changes.
 * Works across the legacy application's repeated render() cycles.
 */
(() => {
  'use strict';
  const NORMALIZE = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();

  function findMemory() {
    for (const title of document.querySelectorAll('p')) {
      if (NORMALIZE(title.textContent) !== 'memoria de decisoes') continue;
      const container=title.closest('section');
      if (container && NORMALIZE(container.textContent).includes('seu historico nesta obra')) return container;
    }
    return null;
  }

  function findChat() {
    for (const title of document.querySelectorAll('strong')) {
      if (NORMALIZE(title.textContent) !== 'painel de respostas & diagnosticos de engenharia') continue;
      const container=title.closest('.white-bento-card');
      if (container && container.querySelector('[data-intelligence-input="true"]')) return container;
    }
    return null;
  }

  function swapPanels() {
    const memory=findMemory(), chat=findChat();
    if (!memory || !chat || memory===chat) return false;
    // Already moved on this render: no additional work or observer loops.
    if (memory.classList.contains('lg:col-span-8') &&
        !chat.classList.contains('lg:col-span-8')) return true;

    const memoryParent=memory.parentNode, chatParent=chat.parentNode;
    if (!memoryParent || !chatParent || memoryParent===chatParent) return false;
    // Only swap the original full-width section and grid-right chat panel.
    if (!chatParent.classList?.contains('grid') ||
        !chatParent.classList?.contains('lg:grid-cols-12')) return false;
    if (!chat.classList.contains('lg:col-span-8')) return false;

    // Moving an existing node keeps all button handlers, input values,
    // chat scroll state and accessibility attributes intact.
    const chatNext=chat.nextSibling;
    memoryParent.replaceChild(chat,memory);
    chatParent.insertBefore(memory,chatNext);
    chat.classList.remove('lg:col-span-8');
    chat.classList.add('w-full');
    memory.classList.add('lg:col-span-8');
    memory.classList.add('self-start');
    chat.dataset.planesChatPriority='first';
    memory.dataset.planesMemoryPriority='after-chat';
    return true;
  }

  window.__PLANES_INTELLIGENCE_LAYOUT_SWAP__={
    version:'1.0.0',
    apply:swapPanels
  };

  let scheduled=false;
  function queueSwap() {
    if (scheduled) return;
    scheduled=true;
    window.requestAnimationFrame(()=>{
      scheduled=false;
      swapPanels();
    });
  }
  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',queueSwap,{once:true});
  } else {
    queueSwap();
  }
  // The legacy app redraws entire module sections on every chat response.
  // Observe child changes, not attributes, and disconnect no listeners.
  const observer=new MutationObserver(mutations=>{
    if (mutations.some(m=>m.type==='childList')) queueSwap();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
