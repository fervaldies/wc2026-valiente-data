/* =====================================================================
   WC2026 — READ-ONLY VIEWER
   Loads data.json from the same repo (GitHub Pages), shows the dashboard.
   Hidden for the family-facing view: "Goles por Ronda" chart only.
   Reordered: "Clasificación por partido" appears before "por rondas".
   Includes: "Descargar gráficos" button that composites 3 specific charts
   (as they appear on the dashboard) into a single PNG for WhatsApp.
   No editing. Auto-refreshes every 3 min and on tab refocus.
   Reuses globals from the main script: state, makeInitialState,
   renderDashboard, updateHeader.
   ===================================================================== */
(function(){
  "use strict";

  // Charts to include in the PNG export, in this exact display order.
  const DOWNLOAD_CHART_IDS = [
    'chart-leaderboard-matches',   // Clasificación · por partido
    'chart-team-goals',            // Goles por equipo
    'chart-cumulative-goals'       // Goles acumulados del torneo
  ];

  try{ if(typeof saveState==='function') saveState = function(){}; }catch(e){}

  function injectHideStyles(){
    if(document.getElementById('viewerHideStyles')) return;
    const style = document.createElement('style');
    style.id = 'viewerHideStyles';
    style.textContent =
      '.chart-card:has(#chart-goals-round) { display: none !important; }' +
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
     Grabs the 3 target chart canvases straight from the dashboard (no
     re-render) so internal chart text stays proportionally large when
     scaled up into the composite. Big golden titles + header on top.
     ===================================================================== */
  async function downloadAllCharts(){
    const btn = document.getElementById('roDownloadAll');
    const originalHtml = btn ? btn.innerHTML : '';
    if(btn){ btn.disabled = true; btn.innerHTML = '⏳ generando…'; }

    try{
      if(document.fonts && document.fonts.ready) await document.fonts.ready;

      // Look up each dashboard canvas by ID, in order
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

      // ============ Composite canvas ============
      const W = 1300;
      const padding = 32;
      const titleH = 115;   // room for 64px chart title
      const headerH = 240;  // room for larger header text
      const footerH = 60;

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

      // Header (big golden text)
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#E5A847';
      ctx.font = '500 36px Manrope, sans-serif';   // was 28px — eyebrow
      ctx.fillText('COPA DEL MUNDO FIFA 2026 · POOL FAMILIAR · VALIENTE', padding, padding);
      ctx.fillStyle = '#F2EFE9';
      ctx.font = '700 92px Antonio, sans-serif';   // was 72px — main title
      ctx.fillText('CLASIFICACIÓN Y ESTADÍSTICAS', padding, padding + 50);
      ctx.fillStyle = '#8B9099';
      ctx.font = '400 38px Manrope, sans-serif';   // was 30px — date line
      const dateStr = new Date().toLocaleString('es-ES', {day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
      ctx.fillText(`Actualizado ${dateStr}`, padding, padding + 165);

      // Charts with big golden titles above each
      let y = padding + headerH;
      items.forEach(it => {
        ctx.fillStyle = '#E5A847';
        ctx.font = '600 64px Antonio, sans-serif';  // was 44px — per-chart title
        ctx.fillText(it.title.toUpperCase(), padding, y);
        y += titleH;
        ctx.drawImage(it.canvas, padding, y, it.renderW, it.renderH);
        y += it.renderH + padding;
      });

      // Footer
      ctx.fillStyle = '#5A6172';
      ctx.font = '400 18px Manrope, sans-serif';
      ctx.fillText('fervaldies.github.io/wc2026-valiente-data', padding, totalH - 44);

      // Download via toBlob (mobile-friendly)
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
      console.error(e);
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
      if(typeof updateHeader==='function') updateHeader();
      const st=document.getElementById('roStamp');
      if(st) st.textContent='actualizado '+new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    }catch(e){
      const st=document.getElementById('roStamp');
      if(st) st.textContent='aún no hay datos ('+e.message+')';
    }
  }

  setTimeout(function(){
    lockdown();
    loadData();
    setInterval(loadData, 180000);
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) loadData(); });
  }, 50);
})();