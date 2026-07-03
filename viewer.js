/* =====================================================================
   WC2026 — READ-ONLY VIEWER
   Loads data.json from the same repo (GitHub Pages), shows the dashboard.
   Hidden for the family-facing view: "Goles por Ronda" chart only.
   Reordered: "Clasificación por partido" appears before "por rondas".
   Includes: "Descargar gráficos" button that fresh-renders 3 specific
   charts at wide dimensions (so long names on Y-axis don't get clipped)
   and composites them into a single PNG for sharing on WhatsApp.
   No editing. Auto-refreshes every 3 min and on tab refocus.
   Reuses globals from the main script: state, charts, makeInitialState,
   renderDashboard, updateHeader, and the global Chart.js constructor.
   ===================================================================== */
(function(){
  "use strict";

  const DOWNLOAD_CHART_IDS = [
    'chart-leaderboard-matches',
    'chart-team-goals',
    'chart-cumulative-goals'
  ];

  const CHART_ID_TO_KEY = {
    'chart-leaderboard-rounds':  'leaderboardRounds',
    'chart-leaderboard-matches': 'leaderboardMatches',
    'chart-goals-round':         'goalsRound',
    'chart-cumulative-goals':    'cumulativeGoals',
    'chart-accuracy':            'accuracy',
    'chart-team-goals':          'teamGoals'
  };

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

  async function renderChartAtSize(sourceChart, W, H){
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText =
      'position:absolute;left:-99999px;top:0;' +
      'width:' + W + 'px;height:' + H + 'px';
    document.body.appendChild(canvas);

    const originalOpts = sourceChart.config.options || {};
    const overrideOpts = Object.assign({}, originalOpts, {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      devicePixelRatio: 1
    });

    const tempChart = new Chart(canvas.getContext('2d'), {
      type: sourceChart.config.type,
      data: sourceChart.config.data,
      options: overrideOpts
    });

    await new Promise(r => setTimeout(r, 200));

    const captured = document.createElement('canvas');
    captured.width = W;
    captured.height = H;
    captured.getContext('2d').drawImage(canvas, 0, 0);

    tempChart.destroy();
    document.body.removeChild(canvas);
    return captured;
  }

  async function downloadAllCharts(){
    if(typeof charts !== 'object' || !charts){
      alert('Los gráficos aún no están listos. Espera unos segundos y vuelve a intentarlo.');
      return;
    }

    const btn = document.getElementById('roDownloadAll');
    const originalHtml = btn ? btn.innerHTML : '';
    if(btn){ btn.disabled = true; btn.innerHTML = '⏳ generando…'; }

    try{
      if(document.fonts && document.fonts.ready) await document.fonts.ready;

      const CHART_W = 1400;
      const CHART_H = 700;
      const items = [];

      for(const id of DOWNLOAD_CHART_IDS){
        const key = CHART_ID_TO_KEY[id];
        const sourceChart = charts[key];
        if(!sourceChart) continue;

        const freshCanvas = await renderChartAtSize(sourceChart, CHART_W, CHART_H);

        const originalCanvas = document.getElementById(id);
        const card = originalCanvas ? originalCanvas.closest('.chart-card') : null;
        const titleEl = card ? card.querySelector('.card-title') : null;
        const title = titleEl
          ? titleEl.textContent.trim().replace(/\s+/g,' ')
          : id;

        items.push({ canvas: freshCanvas, title });
      }

      if(items.length === 0){ alert('No hay gráficos disponibles / No charts available'); return; }

      // ============ Composite canvas ============
      const W = 1300;
      const padding = 32;
      const titleH = 104;   // was 82 — room for 44px chart title
      const headerH = 190;  // was 150 — room for larger header text
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

      const grad = ctx.createLinearGradient(0, 0, 0, totalH);
      grad.addColorStop(0, '#0A0E1A');
      grad.addColorStop(1, '#131826');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, totalH);

      ctx.fillStyle = '#E5A847';
      ctx.fillRect(0, 0, 6, totalH);

      // Header — all sizes bumped
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#E5A847';
      ctx.font = '500 28px Manrope, sans-serif';   // was 20px — eyebrow
      ctx.fillText('COPA DEL MUNDO FIFA 2026 · POOL FAMILIAR · VALIENTE', padding, padding);
      ctx.fillStyle = '#F2EFE9';
      ctx.font = '700 72px Antonio, sans-serif';   // was 56px — main title
      ctx.fillText('CLASIFICACIÓN Y ESTADÍSTICAS', padding, padding + 40);
      ctx.fillStyle = '#8B9099';
      ctx.font = '400 30px Manrope, sans-serif';   // was 22px — date line
      const dateStr = new Date().toLocaleString('es-ES', {day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
      ctx.fillText(`Actualizado ${dateStr}`, padding, padding + 130);

      // Charts — title above each graph bumped
      let y = padding + headerH;
      items.forEach(it => {
        ctx.fillStyle = '#E5A847';
        ctx.font = '600 44px Antonio, sans-serif';  // was 32px — per-chart title
        ctx.fillText(it.title.toUpperCase(), padding, y);
        y += titleH;
        ctx.drawImage(it.canvas, padding, y, it.renderW, it.renderH);
        y += it.renderH + padding;
      });

      // Footer
      ctx.fillStyle = '#5A6172';
      ctx.font = '400 18px Manrope, sans-serif';
      ctx.fillText('fervaldies.github.io/wc2026-valiente-data', padding, totalH - 44);

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
