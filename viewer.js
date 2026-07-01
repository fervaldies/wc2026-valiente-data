/* =====================================================================
   WC2026 — READ-ONLY VIEWER
   Loads data.json from the same repo (GitHub Pages), shows the dashboard.
   Hidden for the family-facing view: "Goles por Ronda" chart only.
   Reordered: "Clasificación por partido" appears before "por rondas".
   No editing. Auto-refreshes every 3 min and on tab refocus.
   Reuses globals from the main script: state, makeInitialState,
   renderDashboard, updateHeader.
   ===================================================================== */
(function(){
  "use strict";

  // hard read-only: nothing writes back
  try{ if(typeof saveState==='function') saveState = function(){}; }catch(e){}

  // Hide one chart + reorder cards. Uses CSS :has() and grid `order`, both
  // survive any re-render of the dashboard by the main script.
  function injectHideStyles(){
    if(document.getElementById('viewerHideStyles')) return;
    const style = document.createElement('style');
    style.id = 'viewerHideStyles';
    style.textContent =
      /* Hide "Goles por ronda" (redundant with the bracket viz above) */
      '.chart-card:has(#chart-goals-round) { display: none !important; }' +
      /* Promote "Clasificación por partido" to appear FIRST in the grid */
      '.chart-card:has(#chart-leaderboard-matches) { order: -1; }';
    document.head.appendChild(style);
  }

  function lockdown(){
    const nav=document.querySelector('nav.tabs'); if(nav) nav.style.display='none';
    document.querySelectorAll('.tab-content').forEach(s=>s.classList.toggle('active', s.id==='tab-dashboard'));
    document.querySelectorAll('.danger-btn').forEach(b=>b.style.display='none');
    document.querySelectorAll('input,select,textarea').forEach(el=>{ el.disabled=true; });
    injectHideStyles();
    if(!document.getElementById('roBanner')){
      const h=document.querySelector('header')||document.body;
      const b=document.createElement('div'); b.id='roBanner';
      b.style.cssText='margin-top:10px;font-size:12px;color:var(--text-muted);font-family:Manrope,system-ui,sans-serif';
      b.innerHTML='👁 Solo lectura · <span style="opacity:.7">Read-only</span> · <span id="roStamp">cargando…</span>';
      h.appendChild(b);
    }
  }

  async function loadData(){
    try{
      const res=await fetch('./data.json?t='+Date.now(), {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      const init=(typeof makeInitialState==='function')?makeInitialState():{};
      state = Object.assign(init, data);
      if(typeof renderDashboard==='function') renderDashboard();
      // Refresh the header counters (Active Round, Matches Done) — without
      // this they stay frozen at "0 / 31" from the initial empty state.
      if(typeof updateHeader==='function') updateHeader();
      const st=document.getElementById('roStamp');
      if(st) st.textContent='actualizado '+new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    }catch(e){
      const st=document.getElementById('roStamp');
      if(st) st.textContent='aún no hay datos ('+e.message+')';
    }
  }

  // boot (after the main script's own load)
  setTimeout(function(){
    lockdown();
    loadData();
    setInterval(loadData, 180000); // every 3 min
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) loadData(); });
  }, 50);
})();
