import express, { Router } from "express";
import metricsService from "./metrics.service";

const router = express.Router();

router.get("/", async (_, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>node/monitor · production</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<link rel="preconnect" href="https://fonts.googleapis.com"/>

<link
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Geist:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

:root{
  --bg0:#080C10;
  --bg1:#0D1117;
  --bg2:#161B22;
  --bg3:#1C2430;

  --bd:#21262D;

  --t1:#E6EDF3;
  --t2:#8B949E;
  --t3:#484F58;

  --g:#3FB950;
  --b:#58A6FF;
  --o:#D29922;
  --r:#F85149;
  --p:#BC8CFF;
}

html,
body{
  height:100%;
  overflow:hidden;
  background:var(--bg0);
  color:var(--t1);
  font-family:'Geist',sans-serif;
}

.root{
  display:grid;
  grid-template-rows:42px 1fr 32px;
  height:100vh;
  padding:8px;
  gap:6px;
}

.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;

  padding:0 14px;

  background:var(--bg1);

  border:1px solid var(--bd);

  border-radius:8px;
}

.tl{
  display:flex;
  align-items:center;
  gap:10px;
}

.logo{
  font-family:'IBM Plex Mono',monospace;
  font-weight:600;
  font-size:14px;
  color:var(--g);
}

.logo em{
  color:var(--t2);
  font-style:normal;
}

.sep{
  color:var(--t3);
}

.chip{
  font-size:11px;
  color:var(--t2);
  font-family:'IBM Plex Mono',monospace;
}

.live-pill{
  display:flex;
  align-items:center;
  gap:6px;

  background:rgba(63,185,80,.08);

  border:1px solid rgba(63,185,80,.25);

  border-radius:20px;

  padding:3px 10px;

  font-size:11px;

  color:var(--g);

  font-weight:600;
}

.dot{
  width:6px;
  height:6px;
  border-radius:50%;
  background:var(--g);

  animation:blink 1.2s ease infinite;
}

@keyframes blink{
  0%,100%{
    opacity:1;
  }

  50%{
    opacity:.3;
  }
}

.body{
  display:grid;
  grid-template-columns:290px 1fr;
  gap:6px;
  min-height:0;
}

.sidebar{
  display:grid;
  grid-template-columns:1fr 1fr;
  grid-template-rows:repeat(3,1fr);
  gap:5px;
}

.panel{
  background:var(--bg1);

  border:1px solid var(--bd);

  border-radius:8px;

  padding:9px 10px;

  display:flex;
  flex-direction:column;

  overflow:hidden;
}

.panel-wide{
  grid-column:1/-1;
}

.ph{
  display:flex;
  align-items:center;
  justify-content:space-between;

  margin-bottom:4px;
}

.pt{
  font-size:9px;
  font-weight:700;
  color:var(--t3);

  text-transform:uppercase;

  letter-spacing:.9px;
}

.bdg{
  font-size:10px;

  font-family:'IBM Plex Mono',monospace;

  padding:2px 7px;

  border-radius:4px;

  font-weight:600;
}

.ok{
  background:rgba(63,185,80,.14);
  color:var(--g);
}

.warn{
  background:rgba(210,153,34,.14);
  color:var(--o);
}

.crit{
  background:rgba(248,81,73,.14);
  color:var(--r);
}

.info{
  background:rgba(88,166,255,.10);
  color:var(--b);
}

.mnum{
  font-size:18px;

  font-weight:700;

  font-family:'IBM Plex Mono',monospace;
}

.utime{
  font-family:'IBM Plex Mono',monospace;
  font-size:17px;
  color:var(--g);
}

.bt{
  height:2px;
  background:var(--bg3);
  border-radius:2px;
  margin:4px 0;
}

.bf{
  height:100%;
  border-radius:2px;
}

.fg{
  background:var(--g);
}

.fb{
  background:var(--b);
}

.fo{
  background:var(--o);
}

.fr{
  background:var(--r);
}

.content{
  display:grid;
  grid-template-rows:minmax(0,1fr) 130px;
  gap:6px;
  min-height:0;
}

.cpanel{
  background:var(--bg1);

  border:1px solid var(--bd);

  border-radius:8px;

  padding:10px 12px;

  display:grid;
  grid-template-rows:26px 1fr;
}

.cwrap{
  position:relative;
  height:100%;
  min-height:400px;
}

canvas{
  width:100%!important;
  height:100%!important;
}

.bstrip{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:5px;
}

.bcard{
  background:var(--bg1);

  border:1px solid var(--bd);

  border-radius:8px;

  padding:10px 12px;
}

.bk{
  font-size:9px;
  font-weight:700;
  color:var(--t3);

  text-transform:uppercase;
}

.bv{
  font-family:'IBM Plex Mono',monospace;
  font-size:16px;
  margin-top:8px;
}

.footer{
  display:flex;
  align-items:center;
  justify-content:space-between;

  padding:0 12px;

  background:var(--bg1);

  border:1px solid var(--bd);

  border-radius:7px;
}

.fi{
  font-size:10px;
  color:var(--t3);
  font-family:'IBM Plex Mono',monospace;
}

#advanced-panel::-webkit-scrollbar{
  width:6px;
}

#advanced-panel::-webkit-scrollbar-thumb{
  background:#30363D;
  border-radius:10px;
}
</style>
</head>

<body>

<div class="root">

  <!-- TOPBAR -->
  <div class="topbar">
    <div class="tl">

      <div class="logo">
        node<em>/</em>monitor
      </div>

      <span class="chip" id="h-host">—</span>

      <span class="sep">·</span>

      <span class="chip" id="h-node">—</span>

    </div>

    <div class="live-pill">
      <div class="dot"></div>
      LIVE
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- SIDEBAR -->
    <div class="sidebar">

      <!-- UPTIME -->
      <div class="panel">
        <div class="ph">
          <span class="pt">UPTIME</span>
          <span class="bdg ok">STABLE</span>
        </div>

        <div class="utime" id="up-val">
          —
        </div>
      </div>

      <!-- CPU -->
      <div class="panel">

        <div class="ph">
          <span class="pt">CPU</span>
          <span class="bdg ok" id="cpu-badge">OK</span>
        </div>

        <div class="mnum" id="cpu-val">
          —
        </div>

        <div class="bt">
          <div
            class="bf fg"
            id="cpu-bar"
            style="width:0%"
          ></div>
        </div>

      </div>

      <!-- HEAP -->
      <div class="panel">

        <div class="ph">
          <span class="pt">HEAP</span>
        </div>

        <div class="mnum" id="heap-val">
          —
        </div>

        <div class="bt">
          <div
            class="bf fb"
            id="heap-bar"
            style="width:0%"
          ></div>
        </div>

      </div>

      <!-- DB -->
      <div class="panel">

        <div class="ph">
          <span class="pt">DB LATENCY</span>
          <span class="bdg ok" id="db-badge">OK</span>
        </div>

        <div class="mnum" id="db-val">
          —
        </div>

        <div class="bt">
          <div
            class="bf fg"
            id="db-bar"
            style="width:0%"
          ></div>
        </div>

      </div>

      <!-- SYSTEM -->
      <div class="panel panel-wide">

        <div class="ph">
          <span class="pt">SYSTEM MEMORY</span>
        </div>

        <div class="mnum" id="sys-val">
          —
        </div>

        <div class="bt">
          <div
            class="bf fb"
            id="sys-bar"
            style="width:0%"
          ></div>
        </div>

      </div>

    </div>

    <!-- CONTENT -->
    <div class="content">

      <!-- CHART -->
      <div class="cpanel">

        <div class="ph">
          <span class="pt">
            PERFORMANCE TIMELINE
          </span>
        </div>

        <div class="cwrap">
          <canvas id="mainChart"></canvas>
        </div>

      </div>

      <!-- BOTTOM -->
      <div class="bstrip">

        <div class="bcard">
          <div class="bk">Platform</div>
          <div class="bv" id="b-platform">—</div>
        </div>

        <div class="bcard">
          <div class="bk">Cores</div>
          <div class="bv" id="b-core">—</div>
        </div>

        <div class="bcard">
          <div class="bk">Node</div>
          <div class="bv" id="b-node">—</div>
        </div>

        <div class="bcard">
          <div class="bk">DB Health</div>
          <div class="bv" id="b-db">—</div>
        </div>

        <div class="bcard">
          <div class="bk">Hostname</div>
          <div class="bv" id="b-host">—</div>
        </div>

        <div class="bcard">
          <div class="bk">SSE Clients</div>
          <div class="bv" id="b-sse">—</div>
        </div>

      </div>
    </div>
  </div>

  <!-- ADVANCED -->
  <div
    style="
      position:fixed;
      right:12px;
      bottom:42px;
      z-index:9999;
    "
  >

    <button
      id="toggle-advanced"
      style="
        background:#161B22;
        color:#E6EDF3;
        border:1px solid #30363D;
        border-radius:8px;
        padding:10px 14px;
        cursor:pointer;
      "
    >
      Advanced Metrics
    </button>

    <div
      id="advanced-panel"
      style="
        display:none;
        margin-top:10px;
        width:340px;
        max-height:70vh;
        overflow:auto;
        background:#0D1117;
        border:1px solid #21262D;
        border-radius:10px;
        padding:14px;
        font-family:'IBM Plex Mono',monospace;
      "
    >

      <div style="margin-bottom:10px;color:#58A6FF;">
        Runtime Metrics
      </div>

      <div>Event Loop: <span id="adv-loop">-</span></div>

      <div>PID: <span id="adv-pid">-</span></div>

      <div>CPU: <span id="adv-cpu">-</span></div>

      <div>Process Memory: <span id="adv-pmem">-</span></div>

      <div>SSE Clients: <span id="adv-sse">-</span></div>

      <div>Requests: <span id="adv-req">-</span></div>

      <div>Errors: <span id="adv-err">-</span></div>

      <hr style="margin:14px 0;border-color:#21262D;" />

      <div style="margin-bottom:10px;color:#3FB950;">
        MongoDB Metrics
      </div>

      <div>Collections: <span id="adv-col">-</span></div>

      <div>Documents: <span id="adv-docs">-</span></div>

      <div>Indexes: <span id="adv-index">-</span></div>

      <div>Data Size: <span id="adv-data">-</span></div>

      <div>Storage Size: <span id="adv-storage">-</span></div>

    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">

    <div class="fi">
      realtime monitoring
    </div>

    <div class="fi">
      mongodb + nodejs
    </div>

  </div>

</div>

<script>
const labels = [];

const memD = [];

const dbD = [];

const cpuD = [];

const chart = new Chart(
  document.getElementById("mainChart"),
  {
    type:"line",

    data:{
      labels,

      datasets:[
        {
          label:"Heap",

          data:memD,

          borderColor:"#58A6FF",

          tension:.4,

          borderWidth:1.5,

          pointRadius:0,
        },

        {
          label:"DB",

          data:dbD,

          borderColor:"#3FB950",

          tension:.4,

          borderWidth:1.5,

          pointRadius:0,
        },

        {
          label:"CPU",

          data:cpuD,

          borderColor:"#D29922",

          tension:.4,

          borderWidth:1.5,

          pointRadius:0,
        },
      ],
    },

    options:{
      responsive:true,

      maintainAspectRatio:false,

      plugins:{
        legend:{
          display:false,
        },
      },

      scales:{
        x:{
          ticks:{
            color:"#8B949E",
          },

          grid:{
            color:"rgba(255,255,255,.03)",
          },
        },

        y:{
          ticks:{
            color:"#8B949E",
          },

          grid:{
            color:"rgba(255,255,255,.03)",
          },
        },
      },
    },
  },
);

function set(id,v){
  const el = document.getElementById(id);

  if(el){
    el.textContent = v;
  }
}

function toggle(el){
  el.style.display =
    el.style.display === "none"
      ? "block"
      : "none";
}

document
  .getElementById("toggle-advanced")
  .addEventListener("click", () => {
    toggle(
      document.getElementById("advanced-panel")
    );
  });

const src = new EventSource("/api/v1/health/stream");

src.onmessage = (e) => {

  const d = JSON.parse(e.data);

  set(
    "up-val",
    d.runtime?.uptime
  );

  /**
   * CPU
   */
  set(
    "cpu-val",
    d.cpu?.usage + "%"
  );

  document.getElementById(
    "cpu-bar"
  ).style.width =
    d.cpu?.usage + "%";

  /**
   * HEAP
   */
  set(
    "heap-val",
    d.memory?.heapUsed + " MB"
  );

  const hp =
    Math.round(
      d.memory.heapUsed /
      d.memory.heapTotal *
      100
    );

  document.getElementById(
    "heap-bar"
  ).style.width = hp + "%";

  /**
   * DB
   */
  set(
    "db-val",
    d.dbLatency + " ms"
  );

  document.getElementById(
    "db-bar"
  ).style.width =
    Math.min(d.dbLatency,100) + "%";

  /**
   * SYS
   */
  set(
    "sys-val",
    d.memory.usedPercent + "%"
  );

  document.getElementById(
    "sys-bar"
  ).style.width =
    d.memory.usedPercent + "%";

  /**
   * BOTTOM
   */
  set(
    "b-platform",
    d.system.platform
  );

  set(
    "b-core",
    d.system.cpuCores
  );

  set(
    "b-node",
    d.nodeVersion
  );

  set(
    "b-db",
    d.dbLatency < 50
      ? "Healthy"
      : "Slow"
  );

  set(
    "b-host",
    d.system.hostname
  );

  set(
    "b-sse",
    d.sseClients
  );

  /**
   * ADVANCED
   */
  set(
    "adv-loop",
    d.runtime?.eventLoopLag + " ms"
  );

  set(
    "adv-pid",
    d.runtime?.pid
  );

  set(
    "adv-cpu",
    d.cpu?.usage + "%"
  );

  set(
    "adv-pmem",
    d.memory?.processMemoryMB + " MB"
  );

  set(
    "adv-sse",
    d.sseClients
  );

  set(
    "adv-req",
    d.requests
  );

  set(
    "adv-err",
    d.errors
  );

  if(d.database){

    set(
      "adv-col",
      d.database.collections
    );

    set(
      "adv-docs",
      d.database.documents
    );

    set(
      "adv-index",
      d.database.indexes
    );

    set(
      "adv-data",
      d.database.dataSizeMB + " MB"
    );

    set(
      "adv-storage",
      d.database.storageSizeMB + " MB"
    );
  }

  /**
   * CHART
   */
  labels.push(
    new Date(d.timestamp)
      .toLocaleTimeString()
  );

  memD.push(
    d.memory.heapUsed
  );

  dbD.push(
    d.dbLatency
  );

  cpuD.push(
    d.cpu.usage
  );

  if(labels.length > 60){
    labels.shift();

    memD.shift();

    dbD.shift();

    cpuD.shift();
  }

  chart.update("none");
};

src.onopen = () => {
  console.log("SSE connected");
};

src.onerror = () => {
  console.error("SSE disconnected");
};
</script>

</body>
</html>`);
});

router.get("/stream", (_, res) => {
  metricsService.addSSEClient();

  res.setHeader("Content-Type", "text/event-stream");

  res.setHeader("Cache-Control", "no-cache");

  res.setHeader("Connection", "keep-alive");

  res.flushHeaders?.();

  /**
   * SEND INITIAL DATA
   */
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
