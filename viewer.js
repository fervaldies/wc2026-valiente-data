/* =====================================================================
   WC2026 — READ-ONLY VIEWER
   Loads data.json from the same repo (GitHub Pages), shows the dashboard.
   Hidden for the family-facing view: "Goles por Ronda" chart only.
   Reordered: "Clasificación por partido" appears before "por rondas".
   Includes: "Descargar gráficos" button that composites 3 specific
   charts (Clasificación por partido → Goles por equipo → Goles acumulados)
   into a single PNG for sharing on WhatsApp.
   No editing. Auto-refreshes every 3 min and on tab refocus.
   Reuses globals from the main script: state, makeInitialState,
   renderDashboard, updateHeader.
   ===================================================================== */
(function(){
  "use strict";

  // Charts to include in the PNG export, in this exact display order.
  // Change this list to reorder or swap charts in the summary image.
  const DOWNLOAD_CHART_IDS = [
    'chart-leaderboard-matches',   // Clasificación · por partido
    'chart-team-goals',            // Goles por equipo
    'chart-cumulative-goals'       // Goles acumulados del torneo
  ];

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
      b.style.cssText='margin-top:10px;font-size:12px;color:var(--text-muted);font-family:Manrope,system-ui,sans-serif;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
      b.innerHTML =
        '<span>👁 Solo lectura · <span style="opacity:.7">Read-only</span> · <span id="roStamp">cargando…</span></span>' +
        '<button id="roDownloadAll" ' +
          'style="padding:6px 12px;background:transparent;border:1px solid var(--accent);' +
          'color:var(--accent);border-radius:2px;font-family:Manrope,sans-serif;' +
          'font-size:12px;cursor:pointer;transition:all 0.2s">' +
          '📷 Descargar gráficos <span style="opacity:.7">/ Download charts</span>' +
        '</button>';
      h.appendChild(b);
      const btn = document.getElementById('roDownloadAll');
      btn.addEventListener('mouseenter', ()=>{ btn.style.background='var(--accent)'; btn.style.color='#0A0E1A'; });
      btn.addEventListener('mouseleave', ()=>{ btn.style.background='transparent'; btn.style.color='var(--accent)'; });
      btn.addEventListener('click', downloadAllCharts);
    }
  }

  /* =====================================================================
     COMPOSITE PNG DOWNLOAD
     Stacks the 3 chosen chart canvases (see DOWNLOAD_CHART_IDS above)
     into a single vertical PNG with a branded header. Uses toBlob for
     better support on mobile (iOS Safari has a data-URL size limit).
     ===================================================================== */
  async function downloadAllCharts(){
    // Look up the 3 specific canvases by ID, in the order specified
    const items = DOWNLOAD_CHART_IDS.map(id => {
      const canvas = document.getElementById(id);
      if(!canvas) return null;
      const card = canvas.closest('.chart-card');
      const titleEl = card ? card.querySelector('.card-title') : null;
      const title = titleEl
        ? titleEl.textContent.trim().replace(/\s+/g,' ')
        : id;
      return { canvas, title };
    }).filter(x => x !== null);

    if(items.length === 0){ alert('Aún no hay gráficos / No charts yet'); return; }

    const btn = document.getElementById('roDownloadAll');
    const originalHtml = btn ? btn.innerHTML : '';
    if(btn){ btn.disabled = true; btn.innerHTML = '⏳ generando…'; }

    try{
      const W = 1080;
      const padding = 32;
      const titleH = 56;   // was 44 — more room for a bigger title
      const headerH = 110;
      const footerH = 44;

      // Precompute heights
      let totalH = headerH + padding;
      items.forEach(it => {
        const ratio = it.canvas.width / it.canvas.height;
        it.renderW = W - padding*2;
        it.renderH = it.renderW / ratio;
        totalH += titleH + it.renderH + padding;
      });
      totalH += footerH;

      const out = document.createElement('canvas');
      out.width = W;
      out.height = Math.ceil(totalH);
      const ctx = out.getContext('2d');

      // Background gradient (matches app theme)
      const grad = ctx.createLinearGradient(0, 0, 0, totalH);
      grad.addColorStop(0, '#0A0E1A');
      grad.addColorStop(1, '#131826');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, totalH);

      // Left accent stripe
      ctx.fillStyle = '#E5A847';
      ctx.fillRect(0, 0, 6, totalH);

      // Header
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#E5A847';
      ctx.font = '500 11px Manrope, sans-serif';
      ctx.fillText('COPA DEL MUNDO FIFA 2026 · POOL FAMILIAR · VALIENTE', padding, padding);
      ctx.fillStyle = '#F2EFE9';
      ctx.font = '700 32px Antonio, sans-serif';
      ctx.fillText('CLASIFICACIÓN Y ESTADÍSTICAS', padding, padding + 18);
      ctx.fillStyle = '#8B9099';
      ctx.font = '400 12px Manrope, sans-serif';
      const dateStr = new Date().toLocaleString('es-ES', {day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
      ctx.fillText(`Actualizado ${dateStr}`, padding, padding + 60);

      // Charts, in the fixed order
      let y = padding + headerH;
      items.forEach(it => {
        ctx.fillStyle = '#E5A847';
        ctx.font = '600 20px Antonio, sans-serif';  // was 13px, now 20px
        ctx.fillText(it.title.toUpperCase(), padding, y);
        y += titleH;
        ctx.drawImage(it.canvas, padding, y, it.renderW, it.renderH);
        y += it.renderH + padding;
      });

      // Footer
      ctx.fillStyle = '#5A6172';
      ctx.font = '400 10px Manrope, sans-serif';
      ctx.fillText('fervaldies.github.io/wc2026-valiente-data', padding, totalH - 32);

      // toBlob path (mobile-friendly)
      await new Promise((resolve, reject) => {
        out.toBlob(blob => {
          if(!blob) return reject(new Error('toBlob returned null'));
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `wc2026_clasificacion_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          resolve();
        }, 'image/png', 0.95);
      });
    } catch(e){
      alert('Descarga falló / Download failed: ' + e.message);
    } finally {
      if(btn){ btn.disabled = false; btn.innerHTML = originalHtml; }
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
