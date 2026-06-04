document.addEventListener('DOMContentLoaded', function () {

    // Chart.js global defaults — light theme
    Chart.defaults.color = '#4a5168';
    Chart.defaults.borderColor = '#dde1ea';
    Chart.defaults.font.family = "'DM Mono', monospace";
    Chart.defaults.font.size = 11;

    async function loadDashboardData() {
        try {
            const response = await fetch('dates.csv');
            if (!response.ok) throw new Error(`Could not load dates.csv: ${response.statusText}`);
            const csvData = await response.text();

            const dateStrings = csvData
                .split('\n')
                .slice(1)
                .map(r => r.trim())
                .filter(r => r);

            if (!dateStrings.length) throw new Error('CSV has no data rows.');

            const parsedDates = dateStrings.map(str => {
                const [day, month, year] = str.split('/');
                return new Date(+year, +month - 1, +day);
            }).sort((a, b) => a - b);

            updateKeyStats(parsedDates);
            generateWeekdayDonut(parsedDates);
            generateYearChart(parsedDates);
            generateMonthYearChart(parsedDates);
            generateTopMonths(parsedDates);

        } catch (err) {
            console.error(err);
            document.querySelector('main').innerHTML =
                `<div class="card" style="grid-column:span 3;color:#c0314e;">
                    <div class="card-label">Error</div>
                    <p style="margin-top:8px;font-size:.9rem;">${err.message}<br>
                    Make sure dates.csv is in the same folder and you are serving via a web server.</p>
                 </div>`;
        }
    }

    loadDashboardData();

    /* ── 1/2/3  Key Stats ─────────────────────────────────────────── */
    function updateKeyStats(dates) {
        const opts = { year: 'numeric', month: 'short', day: 'numeric' };
        document.getElementById('total-count').textContent   = dates.length;
        document.getElementById('earliest-date').textContent = dates[0].toLocaleDateString('en-GB', opts);
        document.getElementById('latest-date').textContent   = dates[dates.length - 1].toLocaleDateString('en-GB', opts);
    }

    /* ── 4  Weekday Donut with leader-line labels ─────────────────── */
    function generateWeekdayDonut(dates) {
        const ctx    = document.getElementById('weekday-pie').getContext('2d');
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = Array(7).fill(0);
        dates.forEach(d => counts[d.getDay()]++);
        const total  = counts.reduce((s, v) => s + v, 0);

        const palette = [
            '#f59e0b', '#3b82f6', '#ef4444',
            '#10b981', '#8b5cf6', '#f97316', '#06b6d4'
        ];

        // Custom plugin to draw leader lines + labels outside the donut
        const leaderLabelPlugin = {
            id: 'leaderLabels',
            afterDraw(chart) {
                const { ctx: c, chartArea } = chart;
                const meta = chart.getDatasetMeta(0);
                const cx   = (chartArea.left + chartArea.right)  / 2;
                const cy   = (chartArea.top  + chartArea.bottom) / 2;

                meta.data.forEach((arc, i) => {
                    if (counts[i] === 0) return;

                    const angle      = (arc.startAngle + arc.endAngle) / 2;
                    const outerR     = arc.outerRadius;
                    const elbow1R    = outerR + 12;   // end of radial segment
                    const elbow2R    = outerR + 22;   // start of horizontal segment

                    const x1 = cx + Math.cos(angle) * outerR;
                    const y1 = cy + Math.sin(angle) * outerR;
                    const x2 = cx + Math.cos(angle) * elbow1R;
                    const y2 = cy + Math.sin(angle) * elbow1R;
                    const x3 = cx + Math.cos(angle) * elbow2R;
                    const y3 = cy + Math.sin(angle) * elbow2R;

                    const isRight  = x3 >= cx;
                    const lineEndX = x3 + (isRight ? 18 : -18);
                    const pct      = ((counts[i] / total) * 100).toFixed(0);
                    const text     = `${labels[i]} ${pct}%`;

                    c.save();
                    c.strokeStyle = palette[i];
                    c.lineWidth   = 1.2;
                    c.beginPath();
                    c.moveTo(x1, y1);
                    c.lineTo(x2, y2);
                    c.lineTo(x3, y3);
                    c.lineTo(lineEndX, y3);
                    c.stroke();

                    c.fillStyle  = '#1a1f2e';
                    c.font       = "bold 10px 'DM Mono', monospace";
                    c.textAlign  = isRight ? 'left' : 'right';
                    c.textBaseline = 'middle';
                    c.fillText(text, lineEndX + (isRight ? 3 : -3), y3);
                    c.restore();
                });
            }
        };

        new Chart(ctx, {
            type: 'doughnut',
            plugins: [leaderLabelPlugin],
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: palette,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '55%',
                layout: {
                    // Extra padding so leader lines don't get clipped
                    padding: { top: 30, bottom: 30, left: 55, right: 55 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => ` ${c.label}: ${c.parsed} (${((c.parsed / total) * 100).toFixed(1)}%)`
                        }
                    }
                }
            }
        });
    }

    /* ── 5  Activity by Year (column chart, compact) ─────────────── */
    function generateYearChart(dates) {
        const ctx    = document.getElementById('year-chart').getContext('2d');
        const counts = {};
        dates.forEach(d => {
            const y = d.getFullYear();
            counts[y] = (counts[y] || 0) + 1;
        });
        const labels = Object.keys(counts).sort();
        const data   = labels.map(l => counts[l]);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Commits',
                    data,
                    backgroundColor: 'rgba(47, 111, 212, 0.75)',
                    borderColor: '#2f6fd4',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 48
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: '#eef0f5' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    /* ── 6  Activity by Month (column chart, compact, scrollable) ── */
    function generateMonthYearChart(dates) {
        const canvas = document.getElementById('month-year-chart');
        const ctx    = canvas.getContext('2d');
        const counts = {};

        dates.forEach(d => {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        const sortedKeys = Object.keys(counts).sort();
        const labels     = sortedKeys.map(key => {
            const [y, m] = key.split('-');
            return new Date(+y, +m - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        });
        const data = sortedKeys.map(k => counts[k]);

        canvas.style.width  = Math.max(560, labels.length * 32) + 'px';
        canvas.style.height = '170px';

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Commits',
                    data,
                    backgroundColor: 'rgba(16, 185, 129, 0.72)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 3,
                    borderSkipped: false,
                    maxBarThickness: 30
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxRotation: 45, minRotation: 30 }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: '#eef0f5' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    /* ── 7  Top 3 Most Popular Months ────────────────────────────── */
    function generateTopMonths(dates) {
        const container = document.getElementById('top-months-list');
        const counts    = {};

        dates.forEach(d => {
            const key = d.toLocaleString('en-US', { month: 'long' });
            counts[key] = (counts[key] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top3   = sorted.slice(0, 3);
        const max    = top3[0][1];
        const medals = ['gold', 'silver', 'bronze'];

        top3.forEach(([month, count], i) => {
            const pct  = Math.round((count / max) * 100);
            const item = document.createElement('div');
            item.className = 'top-month-item';
            item.innerHTML = `
                <div class="top-month-rank ${medals[i]}">${i + 1}</div>
                <div class="top-month-info">
                    <div class="top-month-name">${month}</div>
                    <div class="top-month-bar-wrap">
                        <div class="top-month-bar" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="top-month-count">${count}</div>
            `;
            container.appendChild(item);
        });
    }

});
