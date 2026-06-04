// charts.js — Dashboard logic & Chart.js rendering
// Reads dates dynamically from dates.csv in the same root folder

/* ──────────────────────────────────────────────
   LOAD CHART.JS FROM CDN, THEN FETCH CSV
   ────────────────────────────────────────────── */
(function () {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
  script.onload = loadCSV;
  document.head.appendChild(script);
})();

/* ──────────────────────────────────────────────
   FETCH & PARSE dates.csv
   ────────────────────────────────────────────── */
function loadCSV() {
  fetch("dates.csv")
    .then(res => {
      if (!res.ok) throw new Error(`Could not load dates.csv (HTTP ${res.status})`);
      return res.text();
    })
    .then(text => {
      const lines     = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const firstLower = lines[0].toLowerCase();
      const dataLines  = firstLower.includes("date") ? lines.slice(1) : lines;

      const DATES = dataLines.reduce((acc, str) => {
        const parts = str.split("/");
        if (parts.length === 3) {
          const [d, m, y] = parts.map(Number);
          if (d && m && y) {
            const date = new Date(y, m - 1, d);
            if (!isNaN(date)) acc.push(date);
          }
        }
        return acc;
      }, []);

      if (DATES.length === 0) {
        showError("No valid dates found in dates.csv. Expected format: DD/MM/YYYY");
        return;
      }

      init(DATES);
    })
    .catch(err => showError(err.message));
}

function showError(msg) {
  document.querySelector(".dashboard").innerHTML = `
    <div style="text-align:center;padding:4rem 2rem;color:#a8432a;">
      <div style="font-size:2.5rem;margin-bottom:1rem;">⚠️</div>
      <strong style="font-family:'Playfair Display',serif;font-size:1.2rem;">Could not load data</strong>
      <p style="margin-top:.5rem;font-size:.9rem;color:#8a7d72;">${msg}</p>
      <p style="margin-top:.3rem;font-size:.8rem;color:#8a7d72;">
        Make sure <code>dates.csv</code> is in the same folder as <code>index.html</code>.
      </p>
    </div>`;
}

/* ──────────────────────────────────────────────
   PALETTE
   ────────────────────────────────────────────── */
const WEEKDAY_COLORS = [
  "#c8714a", "#4a6fa5", "#6b8f71", "#7c5c8a",
  "#c9a84c", "#3d8b8b", "#a8432a",
];

// One distinct colour per year (extendable)
const YEAR_PALETTE = ["#4a6fa5","#c8714a","#6b8f71","#7c5c8a","#c9a84c","#3d8b8b"];

const MONTH_HOVER = "#c8714a";
const YEAR_COLOR  = "#6b8f71";
const YEAR_HOVER  = "#3d8b8b";

/* ──────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────── */
const MONTHS_LONG  = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS     = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmt(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function countBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

/* ──────────────────────────────────────────────
   COMPUTE STATS
   ────────────────────────────────────────────── */
function computeStats(DATES) {
  const sorted   = [...DATES].sort((a, b) => a - b);
  const earliest = sorted[0];
  const latest   = sorted[sorted.length - 1];
  const total    = DATES.length;

  // Weekday counts
  const wdCounts = new Array(7).fill(0);
  DATES.forEach(d => wdCounts[d.getDay()]++);

  // Year counts
  const yrMap  = countBy(DATES, d => d.getFullYear());
  const years  = Object.keys(yrMap).sort();

  // Per-year monthly breakdown: { "2023": [0,0,...12 values], ... }
  const yrMonthMap = {};
  years.forEach(y => { yrMonthMap[y] = new Array(12).fill(0); });
  DATES.forEach(d => {
    const y = String(d.getFullYear());
    yrMonthMap[y][d.getMonth()]++;
  });

  // Month totals aggregated across ALL years (for top-3)
  const moCounts = new Array(12).fill(0);
  DATES.forEach(d => moCounts[d.getMonth()]++);

  // Top 3 by month name (aggregated across years)
  const top3 = MONTHS_SHORT
    .map((name, i) => [name, moCounts[i]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return { total, earliest, latest, wdCounts, yrMap, years, yrMonthMap, moCounts, top3 };
}

/* ──────────────────────────────────────────────
   RENDER STATS CARDS
   ────────────────────────────────────────────── */
function renderStats({ total, earliest, latest }) {
  document.getElementById("stat-total").textContent    = total;
  document.getElementById("stat-earliest").textContent = fmt(earliest);
  document.getElementById("stat-latest").textContent   = fmt(latest);
  document.getElementById("total-badge").textContent   = total;
}

/* ──────────────────────────────────────────────
   DONUT CHART
   ────────────────────────────────────────────── */
function renderDonut({ wdCounts }) {
  const total = wdCounts.reduce((a, b) => a + b, 0);
  const ctx   = document.getElementById("donutChart").getContext("2d");

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: WEEKDAYS,
      datasets: [{
        data: wdCounts,
        backgroundColor: WEEKDAY_COLORS,
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      cutout: "62%",
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed} entries (${((ctx.parsed / total) * 100).toFixed(1)}%)`
          }
        }
      },
      animation: { animateRotate: true, duration: 900, easing: "easeInOutQuart" }
    }
  });

  const legendEl = document.getElementById("donut-legend");
  WEEKDAYS.forEach((day, i) => {
    const pct  = total ? ((wdCounts[i] / total) * 100).toFixed(1) : "0.0";
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-dot" style="background:${WEEKDAY_COLORS[i]}"></span>
      <span class="legend-name">${day}</span>
      <span class="legend-count">${wdCounts[i]}</span>
      <span class="legend-pct">${pct}%</span>
    `;
    legendEl.appendChild(item);
  });
}

/* ──────────────────────────────────────────────
   YEAR BAR CHART
   ────────────────────────────────────────────── */
function renderYearChart({ years, yrMap }) {
  const ctx = document.getElementById("yearChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [{
        label: "Entries",
        data: years.map(y => yrMap[y]),
        backgroundColor: years.map((_, i) => YEAR_PALETTE[i % YEAR_PALETTE.length] + "cc"),
        hoverBackgroundColor: YEAR_HOVER,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} entries` } }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'DM Sans'", size: 11 }, color: "#8a7d72" }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#e4ddd1", drawTicks: false },
          ticks: { font: { family: "'DM Sans'", size: 11 }, color: "#8a7d72", precision: 0, padding: 8 },
          border: { display: false }
        }
      },
      animation: { duration: 900, easing: "easeOutQuart" }
    }
  });
}

/* ──────────────────────────────────────────────
   MONTHLY CHARTS — one per year
   ────────────────────────────────────────────── */
function renderMonthCharts({ years, yrMonthMap }) {
  const container = document.getElementById("month-charts-container");
  container.innerHTML = ""; // clear placeholder

  years.forEach((year, yi) => {
    const color   = YEAR_PALETTE[yi % YEAR_PALETTE.length];
    const counts  = yrMonthMap[year];
    const maxVal  = Math.max(...counts);
    const bgColors = counts.map(v => v === maxVal && maxVal > 0 ? MONTH_HOVER : color + "bb");

    // Wrapper card
    const card = document.createElement("div");
    card.className = "chart-card month-year-card";
    card.style.animationDelay = `${0.1 * yi}s`;
    card.innerHTML = `
      <h2 class="chart-title">${year}</h2>
      <p class="chart-sub">${counts.reduce((a,b)=>a+b,0)} entries across ${counts.filter(v=>v>0).length} months</p>
      <div class="bar-wrapper" style="height:180px;">
        <canvas id="monthChart-${year}"></canvas>
      </div>
    `;
    container.appendChild(card);

    const ctx = card.querySelector(`#monthChart-${year}`).getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: MONTHS_SHORT,
        datasets: [{
          label: "Entries",
          data: counts,
          backgroundColor: bgColors,
          hoverBackgroundColor: MONTH_HOVER,
          borderRadius: 5,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => MONTHS_LONG[ctx[0].dataIndex] + " " + year,
              label: ctx => ` ${ctx.parsed.y} entries`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'DM Sans'", size: 10 }, color: "#8a7d72" }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#e4ddd1", drawTicks: false },
            ticks: {
              font: { family: "'DM Sans'", size: 10 },
              color: "#8a7d72",
              precision: 0,
              padding: 6,
              stepSize: 1,
            },
            border: { display: false }
          }
        },
        animation: { duration: 800, easing: "easeOutQuart" }
      }
    });
  });
}

/* ──────────────────────────────────────────────
   TOP 3 MONTHS  (aggregated across all years)
   ────────────────────────────────────────────── */
function renderTop3({ top3, total }) {
  const maxCount = top3[0][1];
  const listEl   = document.getElementById("top3-list");
  const medals   = ["🥇", "🥈", "🥉"];

  top3.forEach(([monthName, count], i) => {
    const pct      = ((count / maxCount) * 100).toFixed(0);
    const totalPct = ((count / total) * 100).toFixed(1);
    const item     = document.createElement("div");
    item.className = "top3-item";
    item.innerHTML = `
      <div class="top3-rank">${medals[i]}</div>
      <div class="top3-info">
        <div class="top3-month">${MONTHS_LONG[MONTHS_SHORT.indexOf(monthName)]}</div>
        <div class="top3-count">${count} entries &nbsp;·&nbsp; ${totalPct}% of total</div>
        <div class="top3-bar-track">
          <div class="top3-bar-fill" style="width:0%" data-target="${pct}%"></div>
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });

  setTimeout(() => {
    document.querySelectorAll(".top3-bar-fill").forEach(bar => {
      bar.style.width = bar.dataset.target;
    });
  }, 300);
}

/* ──────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────── */
function init(DATES) {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color       = "#8a7d72";

  const stats = computeStats(DATES);

  renderStats(stats);
  renderDonut(stats);
  renderYearChart(stats);
  renderMonthCharts(stats);
  renderTop3(stats);
}
