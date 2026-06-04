document.addEventListener('DOMContentLoaded', function () {

    // Chart.js global defaults for dark theme
    Chart.defaults.color = '#8a91a8';
    Chart.defaults.borderColor = '#2a2f3d';
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

            // Parse & sort
            const parsedDates = dateStrings.map(str => {
                const [day, month, year] = str.split('/');
                return new Date(+year, +month - 1, +day);
            }).sort((a, b) => a - b);

            updateKeyStats(parsedDates);        // 1, 2, 3
            generateWeekdayPie(parsedDates);    // 4
            generateYearChart(parsedDates);     // 5
            generateMonthYearChart(parsedDates);// 6
            generateTopMonths(parsedDates);     // 7

        } catch (err) {
            console.error(err);
            document.querySelector('main').innerHTML =
                `<div class="card" style="grid-column:span 3;color:#e05c7a;">
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

    /* ── 4  Weekday Pie Chart ─────────────────────────────────────── */
    function generateWeekdayPie(dates) {
        const ctx    = document.getElementById('weekday-pie').getContext('2d');
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = Array(7).fill(0);
        dates.forEach(d => counts[d.getDay()]++);

        const palette = [
            '#e8c547', '#5b8dee', '#e05c7a',
            '#56cfb2', '#a78bfa', '#fb923c', '#34d399'
        ];

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: palette,
                    borderColor: '#161920',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '58%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            padding: 10,
                            color: '#8a91a8'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${ctx.parsed} commits`
                        }
                    }
                }
            }
        });
    }

    /* ── 5  Activity by Year ──────────────────────────────────────── */
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
                    backgroundColor: ctx2 => {
                        const gradient = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 260);
                        gradient.addColorStop(0,   'rgba(232,197,71,0.85)');
                        gradient.addColorStop(1,   'rgba(232,197,71,0.15)');
                        return gradient;
                    },
                    borderColor: '#e8c547',
                    borderWidth: 1,
                    borderRadius: 5,
                    borderSkipped: false
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
                        grid: { color: '#1e232e' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    /* ── 6  Activity by Month ─────────────────────────────────────── */
    function generateMonthYearChart(dates) {
        const canvas  = document.getElementById('month-year-chart');
        const ctx     = canvas.getContext('2d');
        const counts  = {};

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

        // Widen canvas for many months
        const barWidth = 36;
        canvas.style.width  = Math.max(600, labels.length * barWidth) + 'px';
        canvas.style.height = '220px';

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Commits',
                    data,
                    backgroundColor: ctx2 => {
                        const gradient = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 200);
                        gradient.addColorStop(0,   'rgba(91,141,238,0.9)');
                        gradient.addColorStop(1,   'rgba(91,141,238,0.1)');
                        return gradient;
                    },
                    borderColor: '#5b8dee',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
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
                        grid: { color: '#1e232e' }
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
            // Key by calendar month name only (aggregate across years)
            const key = d.toLocaleString('en-US', { month: 'long' });
            counts[key] = (counts[key] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top3   = sorted.slice(0, 3);
        const max    = top3[0][1];
        const medals = ['gold', 'silver', 'bronze'];
        const ranks  = ['1', '2', '3'];

        top3.forEach(([month, count], i) => {
            const pct  = Math.round((count / max) * 100);
            const item = document.createElement('div');
            item.className = 'top-month-item';
            item.innerHTML = `
                <div class="top-month-rank ${medals[i]}">${ranks[i]}</div>
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
