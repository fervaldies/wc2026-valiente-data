/* =====================================================================
   WC2026 — READ-ONLY VIEWER
   Loads data.json from the same repo (GitHub Pages), shows the dashboard,
   group standings, bracket and charts. No editing. Auto-refreshes.
   Reuses globals from the main script: state, makeInitialState,
   renderDashboard, flagFromCode, escapeHtml.
   ===================================================================== */
(function(){
  "use strict";

  // hard read-only: nothing writes back
  try{ if(typeof saveState==='function') saveState = function(){}; }catch(e){}

  const GROUPS = {
    A:[{code:'MX',name:'México (Mexico)'},{code:'ZA',name:'Sudáfrica (South Africa)'},{code:'KR',name:'Corea del Sur (South Korea)'},{code:'CZ',name:'Chequia (Czechia)'}],
    B:[{code:'CA',name:'Canadá (Canada)'},{code:'BA',name:'Bosnia y H. (Bosnia & H.)'},{code:'QA',name:'Catar (Qatar)'},{code:'CH',name:'Suiza (Switzerland)'}],
    C:[{code:'BR',name:'Brasil (Brazil)'},{code:'MA',name:'Marruecos (Morocco)'},{code:'HT',name:'Haití (Haiti)'},{code:'GB',name:'Escocia (Scotland)',altFlag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'}],
    D:[{code:'US',name:'EE. UU. (USA)'},{code:'PY',name:'Paraguay'},{code:'AU',name:'Australia'},{code:'TR',name:'Turquía (Türkiye)'}],
    E:[{code:'DE',name:'Alemania (Germany)'},{code:'CW',name:'Curazao (Curaçao)'},{code:'CI',name:'C. de Marfil (Côte d\u2019Ivoire)'},{code:'EC',name:'Ecuador'}],
    F:[{code:'NL',name:'P. Bajos (Netherlands)'},{code:'JP',name:'Japón (Japan)'},{code:'SE',name:'Suecia (Sweden)'},{code:'TN',name:'Túnez (Tunisia)'}],
    G:[{code:'BE',name:'Bélgica (Belgium)'},{code:'EG',name:'Egipto (Egypt)'},{code:'IR',name:'Irán (Iran)'},{code:'NZ',name:'N. Zelanda (New Zealand)'}],
    H:[{code:'ES',name:'España (Spain)'},{code:'CV',name:'Cabo Verde'},{code:'SA',name:'A. Saudí (Saudi Arabia)'},{code:'UY',name:'Uruguay'}],
    I:[{code:'FR',name:'Francia (France)'},{code:'SN',name:'Senegal'},{code:'IQ',name:'Irak (Iraq)'},{code:'NO',name:'Noruega (Norway)'}],
    J:[{code:'AR',name:'Argentina'},{code:'DZ',name:'Argelia (Algeria)'},{code:'AT',name:'Austria'},{code:'JO',name:'Jordania (Jordan)'}],
    K:[{code:'PT',name:'Portugal'},{code:'CD',name:'RD Congo (DR Congo)'},{code:'UZ',name:'Uzbekistán (Uzbekistan)'},{code:'CO',name:'Colombia'}],
    L:[{code:'GB',name:'Inglaterra (England)',altFlag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},{code:'HR',name:'Croacia (Croatia)'},{code:'GH',name:'Ghana'},{code:'PA',name:'Panamá (Panama)'}]
  };
  const GKEYS = Object.keys(GROUPS);
  const PAIRS = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  const esc = s => (window.escapeHtml ? window.escapeHtml(s) : String(s));
  const flag = (c,a) => (window.flagFromCode ? window.flagFromCode(c,a) : '');

  function standings(teams, results){
    const t = teams.map(tm=>({name:tm.name,code:tm.code,altFlag:tm.altFlag,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0}));
    PAIRS.forEach((pr,i)=>{ const r=results[i]; if(!r||r.h==null||r.a==null) return;
      const A=t[pr[0]],B=t[pr[1]]; A.P++;B.P++; A.GF+=r.h;A.GA+=r.a; B.GF+=r.a;B.GA+=r.h;
      if(r.h>r.a){A.W++;B.L++;A.Pts+=3;} else if(r.h<r.a){B.W++;A.L++;B.Pts+=3;} else {A.D++;B.D++;A.Pts++;B.Pts++;}
    });
    t.forEach(x=>x.GD=x.GF-x.GA);
    return t.slice().sort((a,b)=>b.Pts-a.Pts||b.GD-a.GD||b.GF-a.GF||a.name.localeCompare(b.name));
  }

  function lockdown(){
    const nav=document.querySelector('nav.tabs'); if(nav) nav.style.display='none';
    document.querySelectorAll('.tab-content').forEach(s=>s.classList.toggle('active', s.id==='tab-dashboard'));
    document.querySelectorAll('.danger-btn').forEach(b=>b.style.display='none');
    document.querySelectorAll('input,select,textarea').forEach(el=>{ el.disabled=true; });
    if(!document.getElementById('roBanner')){
      const h=document.querySelector('header')||document.body;
      const b=document.createElement('div'); b.id='roBanner';
      b.style.cssText='margin-top:10px;font-size:12px;color:var(--text-muted);font-family:Manrope,system-ui,sans-serif';
      b.innerHTML='👁 Solo lectura · <span style="opacity:.7">Read-only</span> · <span id="roStamp">cargando…</span>';
      h.appendChild(b);
    }
  }

  function renderGroupStandings(){
    const dash=document.getElementById('tab-dashboard'); if(!dash) return;
    let host=document.getElementById('viewerGroups');
    if(!host){ host=document.createElement('div'); host.id='viewerGroups'; dash.insertBefore(host, dash.firstChild); }
    const gr=state.groupResults||{};
    let html='<h2 style="font-family:Antonio,sans-serif;letter-spacing:.04em;margin:0 0 12px;text-transform:uppercase">Fase de grupos <span style="color:var(--text-muted);font-size:.6em">Group stage</span></h2>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-bottom:28px">';
    GKEYS.forEach(g=>{
      const tbl=standings(GROUPS[g], gr[g]||new Array(6).fill(null));
      html+='<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px">'
        +'<div style="font-family:Antonio,sans-serif;color:var(--accent);font-size:15px;margin-bottom:8px">Grupo '+g+'</div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="color:var(--text-muted)">'
        +'<th style="text-align:left;font-weight:600">Equipo</th><th>PJ</th><th>DG</th><th>Pts</th></tr></thead><tbody>';
      tbl.forEach((row,i)=>{
        const bg=i<2?'background:rgba(91,166,143,.12)':(i===2?'background:rgba(229,168,71,.10)':'');
        html+='<tr style="'+bg+'"><td style="text-align:left;padding:3px 2px">'+flag(row.code,row.altFlag)+' '+esc(row.name)+'</td>'
          +'<td style="text-align:center">'+row.P+'</td><td style="text-align:center">'+(row.GD>0?'+':'')+row.GD+'</td>'
          +'<td style="text-align:center;font-weight:800">'+row.Pts+'</td></tr>';
      });
      html+='</tbody></table></div>';
    });
    html+='</div>';
    host.innerHTML=html;
  }

  async function loadData(){
    try{
      const res=await fetch('./data.json?t='+Date.now(), {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      const init=(typeof makeInitialState==='function')?makeInitialState():{};
      state = Object.assign(init, data);
      if(!state.groupResults) state.groupResults={};
      if(typeof renderDashboard==='function') renderDashboard();
      renderGroupStandings();
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
