import express, { Router } from "express";
import metricsService from "./metrics.service";

const router = express.Router();

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>node/monitor · production</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg0:#080C10;--bg1:#0D1117;--bg2:#161B22;--bg3:#1C2430;
  --bd:#21262D;
  --t1:#E6EDF3;--t2:#8B949E;--t3:#484F58;
  --g:#3FB950;--b:#58A6FF;--o:#D29922;--r:#F85149;--p:#BC8CFF;
}
html,body{
  height:100%;overflow:hidden;
  background:var(--bg0);color:var(--t1);
  font-family:'Geist',sans-serif;
}
.root{
  display:grid;
  grid-template-rows:42px 1fr 32px;
  height:100vh;
  padding:8px;gap:6px;
}
.topbar{
  display:flex;align-items:center;justify-content:space-between;
  padding:0 14px;background:var(--bg1);
  border:1px solid var(--bd);border-radius:8px;
}
.tl{display:flex;align-items:center;gap:10px;}
.logo{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:14px;color:var(--g);letter-spacing:-.5px;}
.logo em{color:var(--t2);font-style:normal;font-weight:400;}
.chip{font-size:11px;color:var(--t2);font-family:'IBM Plex Mono',monospace;}
.sep{color:var(--t3);font-size:12px;}
.live-pill{display:flex;align-items:center;gap:6px;background:rgba(63,185,80,.08);border:1px solid rgba(63,185,80,.25);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--g);font-weight:600;}
.dot{width:6px;height:6px;border-radius:50%;background:var(--g);animation:blink 1.2s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1;box-shadow:0 0 6px var(--g);}50%{opacity:.3;box-shadow:none;}}
.mts{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--t3);}
.bdg{font-size:10px;font-family:'IBM Plex Mono',monospace;padding:2px 7px;border-radius:4px;font-weight:600;white-space:nowrap;line-height:1.6;}
.ok  {background:rgba(63,185,80,.14);color:var(--g); border:1px solid rgba(63,185,80,.28);}
.warn{background:rgba(210,153,34,.14);color:var(--o);border:1px solid rgba(210,153,34,.28);}
.crit{background:rgba(248,81,73,.14);color:var(--r); border:1px solid rgba(248,81,73,.28);}
.info{background:rgba(88,166,255,.10);color:var(--b);border:1px solid rgba(88,166,255,.22);}
.env {background:rgba(63,185,80,.15);color:var(--g); border:1px solid rgba(63,185,80,.30);}
.mdb {background:rgba(0,237,100,.10);color:#00ED64;  border:1px solid rgba(0,237,100,.28);}
.body{display:grid;grid-template-columns:290px 1fr;gap:6px;min-height:0;}
.sidebar{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:5px;min-height:0;}
.content{display:grid;grid-template-rows:1fr 130px;gap:6px;min-height:0;}
.panel{background:var(--bg1);border:1px solid var(--bd);border-radius:8px;padding:9px 10px;display:flex;flex-direction:column;min-height:0;overflow:hidden;}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-shrink:0;}
.pt{font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.9px;}
.mnum{font-size:18px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:var(--t1);letter-spacing:-1px;line-height:1;flex-shrink:0;}
.msub{font-size:9px;color:var(--t3);font-family:'IBM Plex Mono',monospace;margin-top:2px;flex-shrink:0;}
.mdl{font-size:10px;font-family:'IBM Plex Mono',monospace;margin-top:2px;flex-shrink:0;}
.dup{color:var(--r);}.ddn{color:var(--g);}.dne{color:var(--t3);}
.bt{height:2px;background:var(--bg3);border-radius:2px;margin:4px 0 3px;flex-shrink:0;overflow:hidden;}
.bf{height:100%;border-radius:2px;transition:width .4s ease;}
.fg{background:var(--g);}.fb{background:var(--b);}.fo{background:var(--o);}.fr{background:var(--r);}
.segs{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0;}
.seg{display:flex;align-items:center;justify-content:space-between;}
.slb{font-size:10px;color:var(--t2);display:flex;align-items:center;gap:4px;}
.sv{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:var(--t1);}
.cg{width:4px;height:4px;border-radius:50%;background:var(--g);flex-shrink:0;}
.cb{width:4px;height:4px;border-radius:50%;background:var(--b);flex-shrink:0;}
.co{width:4px;height:4px;border-radius:50%;background:var(--o);flex-shrink:0;}
.cp{width:4px;height:4px;border-radius:50%;background:var(--p);flex-shrink:0;}
.cm{width:4px;height:4px;border-radius:50%;background:#00ED64;flex-shrink:0;}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:4px;flex-shrink:0;}
.sgi{background:var(--bg3);border-radius:4px;padding:3px 6px;}
.sgk{font-size:9px;color:var(--t3);}
.sgv{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--t1);margin-top:1px;}
.utime{font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;color:var(--g);letter-spacing:-.5px;line-height:1;}
.panel-wide{grid-column:1/-1;}
.cpanel{background:var(--bg1);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;display:grid;grid-template-rows:26px 1fr;gap:5px;min-height:0;}
.chd{display:flex;align-items:center;justify-content:space-between;}
.leg{display:flex;gap:12px;}
.li{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--t2);}
.ll{width:14px;height:2px;border-radius:1px;display:inline-block;}
.cwrap{position:relative;min-height:0;}
canvas{width:100%!important;height:100%!important;}
.bstrip{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;min-height:0;}
.bcard{background:var(--bg1);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between;min-height:0;overflow:hidden;}
.bk{font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;}
.bv{font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;color:var(--t1);line-height:1;}
.bu{font-size:10px;color:var(--t2);font-family:'IBM Plex Mono',monospace;margin-top:3px;}
.footer{display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:var(--bg1);border:1px solid var(--bd);border-radius:7px;}
.fl{display:flex;gap:18px;}
.fi{font-size:10px;color:var(--t3);font-family:'IBM Plex Mono',monospace;}
.fi span{color:var(--t2);}
.sses{display:flex;align-items:center;gap:6px;font-size:10px;font-family:'IBM Plex Mono',monospace;}
.mbars{display:flex;gap:2px;align-items:flex-end;height:13px;}
.mbar{width:3px;background:var(--g);border-radius:1px;transition:height .25s;}
</style>
</head>
<body>
<div class="root">

  <div class="topbar">
    <div class="tl">
      <div class="logo">node<em>/</em>monitor</div>
      <span class="bdg env">production</span>
      <span class="sep">·</span>
      <span class="chip" id="h-host">—</span>
      <span class="sep">·</span>
      <span class="chip" id="h-arch">—</span>
      <span class="sep">·</span>
      <span class="chip" id="h-node">node —</span>
      <span class="sep">·</span>
      <span class="bdg mdb">MongoDB</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <span class="mts" id="cur-time">--:--:--</span>
      <div class="live-pill"><div class="dot"></div>LIVE · 1s</div>
    </div>
  </div>

  <div class="body">
    <div class="sidebar">

      <div class="panel">
        <div class="ph"><span class="pt">Uptime</span><span class="bdg ok" id="up-badge">STABLE</span></div>
        <div class="utime" id="up-val">0h 0m 0s</div>
        <div class="msub">process.uptime()</div>
      </div>

      <div class="panel">
        <div class="ph"><span class="pt">CPU Usage</span><span class="bdg ok" id="cpu-badge">OK</span></div>
        <div class="mnum" id="cpu-val">—</div>
        <div class="mdl dne" id="cpu-delta">— baseline</div>
        <div class="bt"><div class="bf fg" id="cpu-bar" style="width:0%"></div></div>
        <div class="segs">
          <div class="seg"><span class="slb"><span class="cg"></span>usage</span><span class="sv" id="cpu-usage">—</span></div>
          <div class="seg"><span class="slb"><span class="co"></span>loop lag</span><span class="sv" id="ev-loop">—</span></div>
          <div class="seg"><span class="slb"><span class="cp"></span>pid</span><span class="sv" id="proc-pid">—</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="ph"><span class="pt">Heap</span><span class="bdg ok" id="heap-badge">OK</span></div>
        <div class="mnum" id="heap-val">—</div>
        <div class="mdl dne" id="heap-delta">— baseline</div>
        <div class="bt"><div class="bf fb" id="heap-bar" style="width:0%"></div></div>
        <div class="sgrid">
          <div class="sgi"><div class="sgk">RSS</div><div class="sgv" id="rss-val">—</div></div>
          <div class="sgi"><div class="sgk">Process</div><div class="sgv" id="pmem-val">—</div></div>
          <div class="sgi"><div class="sgk">Total</div><div class="sgv" id="htotal-val">—</div></div>
          <div class="sgi"><div class="sgk">Ratio</div><div class="sgv" id="hratio-val">—</div></div>
        </div>
      </div>

      <div class="panel">
        <div class="ph"><span class="pt">DB Latency</span><span class="bdg ok" id="db-badge">OK</span></div>
        <div class="mnum" id="db-val">—</div>
        <div class="mdl dne" id="db-delta">— baseline</div>
        <div class="bt"><div class="bf fg" id="db-bar" style="width:0%"></div></div>
        <div class="segs">
          <div class="seg"><span class="slb"><span class="cg"></span>p50</span><span class="sv" id="db-p50">—</span></div>
          <div class="seg"><span class="slb"><span class="co"></span>p95</span><span class="sv" id="db-p95">—</span></div>
          <div class="seg"><span class="slb"><span class="cb"></span>avg</span><span class="sv" id="db-avg">—</span></div>
        </div>
      </div>

      <div class="panel panel-wide">
        <div class="ph"><span class="pt">MongoDB</span><span class="bdg mdb" id="mongo-badge">CONNECTED</span></div>
        <div class="segs" style="flex-direction:row;align-items:center;gap:10px;">
          <div style="flex:1">
            <div class="seg"><span class="slb"><span class="cm"></span>Collections</span><span class="sv" id="mongo-col">—</span></div>
            <div class="seg" style="margin-top:4px;"><span class="slb"><span class="cg"></span>Documents</span><span class="sv" id="mongo-docs">—</span></div>
            <div class="seg" style="margin-top:4px;"><span class="slb"><span class="cb"></span>Indexes</span><span class="sv" id="mongo-idx">—</span></div>
          </div>
          <div style="flex:1">
            <div class="seg"><span class="slb"><span class="co"></span>Data</span><span class="sv" id="mongo-data">—</span></div>
            <div class="seg" style="margin-top:4px;"><span class="slb"><span class="cp"></span>Storage</span><span class="sv" id="mongo-store">—</span></div>
            <div class="seg" style="margin-top:4px;"><span class="slb"><span class="cg"></span>SSE Clients</span><span class="sv" id="mongo-sse">—</span></div>
          </div>
        </div>
      </div>

    </div>

    <div class="content">

      <div class="cpanel">
        <div class="chd">
          <div style="display:flex;align-items:center;gap:14px;">
            <span class="pt">Performance Timeline</span>
            <div class="leg">
              <div class="li"><span class="ll" style="background:var(--b);"></span>Heap MB</div>
              <div class="li"><span class="ll" style="background:var(--g);"></span>DB ms</div>
              <div class="li"><span class="ll" style="background:var(--o);"></span>CPU %</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="bdg info">60s window</span>
            <span class="mts" id="tick-lbl">tick: 0</span>
          </div>
        </div>
        <div class="cwrap">
          <canvas id="mainChart" role="img" aria-label="Realtime heap MB, DB latency ms, CPU usage over 60 seconds">No data yet.</canvas>
        </div>
      </div>

      <div class="bstrip">
        <div class="bcard">
          <div><div class="bk">Platform</div><div class="bv" id="b-platform">—</div></div>
          <div class="bu" id="b-arch">—</div>
        </div>
        <div class="bcard">
          <div><div class="bk">CPU Cores</div><div class="bv" id="b-cores">—</div></div>
          <div class="bu">logical CPUs</div>
        </div>
        <div class="bcard">
          <div><div class="bk">Node.js</div><div class="bv" id="b-node" style="font-size:14px;">—</div></div>
          <div class="bu">runtime</div>
        </div>
        <div class="bcard">
          <div><div class="bk">DB Health</div><div class="bv" id="b-dbhealth" style="font-size:14px;color:var(--g);">—</div></div>
          <div class="bu" id="b-dbsub">avg latency</div>
        </div>
        <div class="bcard">
          <div><div class="bk">Requests</div><div class="bv" id="b-requests" style="font-size:14px;">—</div></div>
          <div class="bu" id="b-errors">— errors</div>
        </div>
        <div class="bcard">
          <div><div class="bk">Avg Tick</div><div class="bv" id="b-avgtick" style="font-size:14px;">—</div></div>
          <div class="bu">ms interval</div>
        </div>
      </div>

    </div>
  </div>

  <div class="footer">
    <div class="fl">
      <div class="fi">ticks: <span id="f-ticks">0</span></div>
      <div class="fi">db checks: <span id="f-db">0</span></div>
      <div class="fi">stored: <span id="f-stored">0</span>/3600</div>
      <div class="fi">avg tick: <span id="f-tick">—</span></div>
    </div>
    <div class="sses">
      <span style="color:var(--t2);">SSE</span>
      <div class="mbars" id="sse-bars">
        <div class="mbar" style="height:4px;"></div>
        <div class="mbar" style="height:9px;"></div>
        <div class="mbar" style="height:5px;"></div>
        <div class="mbar" style="height:11px;"></div>
        <div class="mbar" style="height:6px;"></div>
      </div>
      <span id="sse-lbl" style="color:var(--g);font-weight:600;">connected</span>
    </div>
  </div>

</div>

<script>
const labels=[],memD=[],dbD=[],cpuD=[];
let ticks=0,prevH=null,prevD=null,prevC=null;
let dbHist=[],tickTs=[];

const chart=new Chart(document.getElementById('mainChart'),{
  type:'line',
  data:{labels,datasets:[
    {label:'Heap',data:memD,borderColor:'#58A6FF',backgroundColor:'rgba(88,166,255,.08)',fill:true,tension:.4,borderWidth:1.5,pointRadius:0},
    {label:'DB',  data:dbD, borderColor:'#3FB950',backgroundColor:'rgba(63,185,80,.08)', fill:true,tension:.4,borderWidth:1.5,pointRadius:0},
    {label:'CPU', data:cpuD,borderColor:'#D29922',backgroundColor:'rgba(210,153,34,.08)',fill:true,tension:.4,borderWidth:1.5,pointRadius:0}
  ]},
  options:{
    responsive:true,maintainAspectRatio:false,animation:{duration:180},
    interaction:{intersect:false,mode:'index'},
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:'#161B22',borderColor:'#30363D',borderWidth:1,
        titleColor:'#8B949E',bodyColor:'#E6EDF3',
        titleFont:{family:"'IBM Plex Mono',monospace",size:10},
        bodyFont:{family:"'IBM Plex Mono',monospace",size:11},
        padding:8,
        callbacks:{label:c=>'  '+c.dataset.label+': '+c.parsed.y.toFixed(2)}
      }
    },
    scales:{
      x:{ticks:{color:'#484F58',font:{family:"'IBM Plex Mono',monospace",size:9},maxTicksLimit:8},grid:{color:'rgba(255,255,255,.025)'},border:{color:'#21262D'}},
      y:{ticks:{color:'#484F58',font:{family:"'IBM Plex Mono',monospace",size:9}},grid:{color:'rgba(255,255,255,.025)'},border:{color:'#21262D'}}
    }
  }
});

function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function badge(id,text,cls){const e=document.getElementById(id);e.textContent=text;e.className='bdg '+cls;}
function delta(cur,prev,id,lowerGood){
  const el=document.getElementById(id);
  if(prev===null){el.textContent='— baseline';el.className='mdl dne';return;}
  const d=(cur-prev).toFixed(2);
  if(Math.abs(d)<0.01){el.textContent='— stable';el.className='mdl dne';return;}
  const up=parseFloat(d)>0,bad=lowerGood?up:!up;
  el.textContent=(up?'↑ +':'↓ -')+Math.abs(d);
  el.className='mdl '+(bad?'dup':'ddn');
}

const src=new EventSource('/api/v1/health/stream');
src.onmessage=(e)=>{
  const d=JSON.parse(e.data);
  ticks++;tickTs.push(Date.now());

  set('h-host',d.system.hostname);
  set('h-arch',d.system.platform+' · '+d.system.arch);
  set('h-node','node '+d.nodeVersion);
  set('cur-time',new Date().toLocaleTimeString());

  set('up-val',d.runtime?.uptime??'—');

  const cpuPct=parseFloat(d.cpu?.usage??0);
  set('cpu-val',cpuPct+'%');
  set('cpu-usage',cpuPct+'%');
  set('ev-loop',(d.runtime?.eventLoopLag??'—')+' ms');
  set('proc-pid',d.runtime?.pid??'—');
  const cbar=document.getElementById('cpu-bar');
  cbar.style.width=Math.min(cpuPct,100)+'%';
  cbar.className='bf '+(cpuPct>80?'fr':cpuPct>50?'fo':'fg');
  badge('cpu-badge',cpuPct>80?'CRIT':cpuPct>50?'HIGH':'OK',cpuPct>80?'crit':cpuPct>50?'warn':'ok');
  delta(cpuPct,prevC,'cpu-delta',true);
  prevC=cpuPct;

  set('heap-val',d.memory.heapUsed+' MB');
  set('rss-val',(d.memory.rss??'—')+' MB');
  set('pmem-val',(d.memory.processMemoryMB??'—')+' MB');
  set('htotal-val',d.memory.heapTotal+' MB');
  const hp=Math.round(d.memory.heapUsed/d.memory.heapTotal*100);
  set('hratio-val',hp+'%');
  const hbar=document.getElementById('heap-bar');
  hbar.style.width=hp+'%';
  hbar.className='bf '+(hp>80?'fr':hp>60?'fo':'fb');
  badge('heap-badge',hp>80?'CRIT':hp>60?'HIGH':'OK',hp>80?'crit':hp>60?'warn':'ok');
  delta(d.memory.heapUsed,prevH,'heap-delta',true);
  prevH=d.memory.heapUsed;

  set('db-val',d.dbLatency+' ms');
  dbHist.push(d.dbLatency);if(dbHist.length>60)dbHist.shift();
  const s=[...dbHist].sort((a,b)=>a-b);
  const p50=s[Math.floor(s.length*.5)]||0;
  const p95=s[Math.floor(s.length*.95)]||0;
  const avg=dbHist.reduce((a,b)=>a+b,0)/dbHist.length;
  set('db-p50',p50.toFixed(1)+' ms');
  set('db-p95',p95.toFixed(1)+' ms');
  set('db-avg',avg.toFixed(1)+' ms');
  document.getElementById('db-bar').style.width=Math.min(d.dbLatency,100)+'%';
  const ds=d.dbLatency<10?['OK','ok']:d.dbLatency<50?['WARN','warn']:['SLOW','crit'];
  badge('db-badge',ds[0],ds[1]);
  delta(d.dbLatency,prevD,'db-delta',true);
  prevD=d.dbLatency;
  set('b-dbhealth',d.dbLatency<50?'Healthy':'Degraded');
  document.getElementById('b-dbhealth').style.color=d.dbLatency<10?'#3FB950':d.dbLatency<50?'#D29922':'#F85149';
  set('b-dbsub','avg '+avg.toFixed(1)+' ms');

  if(d.database){
    set('mongo-col',d.database.collections??'—');
    set('mongo-docs',d.database.documents??'—');
    set('mongo-idx',d.database.indexes??'—');
    set('mongo-data',(d.database.dataSizeMB??'—')+' MB');
    set('mongo-store',(d.database.storageSizeMB??'—')+' MB');
  }
  set('mongo-sse',d.sseClients??'—');
  set('b-requests',d.requests??'—');
  set('b-errors',(d.errors??'0')+' errors');
  set('b-platform',d.system.platform);
  set('b-arch',d.system.arch);
  set('b-cores',d.system.cpuCores);
  set('b-node',d.nodeVersion);

  if(tickTs.length>2){
    const diffs=[];
    for(let i=1;i<tickTs.length;i++)diffs.push(tickTs[i]-tickTs[i-1]);
    const at=Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);
    set('b-avgtick',at+'ms');
    set('f-tick',at+'ms');
  }

  set('f-ticks',ticks);set('f-db',ticks);set('f-stored',Math.min(ticks,3600));
  set('tick-lbl','tick: '+ticks);

  const t=new Date(d.timestamp).toLocaleTimeString([],{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  labels.push(t);memD.push(d.memory.heapUsed);dbD.push(d.dbLatency);cpuD.push(cpuPct);
  if(labels.length>60){labels.shift();memD.shift();dbD.shift();cpuD.shift();}
  chart.update('active');

  const bars=document.getElementById('sse-bars').children;
  for(let i=0;i<bars.length;i++)bars[i].style.height=(3+Math.random()*10)+'px';
};

src.onerror=()=>{
  const p=document.querySelector('.live-pill');
  p.innerHTML='<span style="width:6px;height:6px;border-radius:50%;background:#F85149;display:inline-block;"></span> DISCONNECTED';
  p.style.cssText='display:flex;align-items:center;gap:6px;background:rgba(248,81,73,.08);border:1px solid rgba(248,81,73,.25);border-radius:20px;padding:3px 10px;font-size:11px;color:#F85149;font-weight:600;';
  set('sse-lbl','disconnected');
  document.getElementById('sse-lbl').style.color='#F85149';
};

setInterval(()=>set('cur-time',new Date().toLocaleTimeString()),1000);
<\/script>
</body>
</html>`;

router.get("/", async (_, res) => {
  res.send(DASHBOARD_HTML);
});

router.get("/stream", (_, res) => {
  metricsService.addSSEClient();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const first = metricsService.getLatestMetric();
  if (first) {
    res.write(`data: ${JSON.stringify(first)}\n\n`);
  }

  const interval = setInterval(() => {
    try {
      const metric = metricsService.getLatestMetric();
      if (!metric) return;
      res.write(`data: ${JSON.stringify(metric)}\n\n`);
    } catch (error) {
      console.error("SSE Stream Error:", error);
    }
  }, 1000);

  res.on("close", () => {
    clearInterval(interval);
    metricsService.removeSSEClient();
    res.end();
  });
});

export const health_router: Router = router;
