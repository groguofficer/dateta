document.addEventListener('DOMContentLoaded', function () {
    
    // Main function to fetch and process data from the CSV file
    async function loadDashboardData() {
        try {
            const response = await fetch('dates.csv');
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const csvData = await response.text();
            
            // Parse the CSV data into an array of date strings
            // .split('\n') -> splits the text into an array of lines
            // .slice(1) -> removes the header row ("Date")
            // .map(row => row.trim()) -> removes any leading/trailing whitespace from each line
            // .filter(row => row) -> removes any empty lines
            const dateStrings = csvData.split('\n').slice(1).map(row => row.trim()).filter(row => row);

            if (dateStrings.length === 0) {
                throw new Error("CSV file is empty or contains no valid date rows.");
            }

            // 1. Parse and sort dates
            const parsedDates = dateStrings.map(str => {
                const [day, month, year] = str.split('/');
                return new Date(year, month - 1, day);
            }).sort((a, b) => a - b);

            // 2. Update Key Stats
            updateKeyStats(parsedDates);

            // 3. Generate Weekday Heatmap
            generateWeekdayHeatmap(parsedDates);

            // 4. Generate Year Chart
            generateYearChart(parsedDates);

            // 5. Generate Month-Year Chart
            generateMonthYearChart(parsedDates);

        } catch (error) {
            console.error("Error loading or processing dashboard data:", error);
            document.querySelector('main').innerHTML = `<div class="card" style="background-color: #fff5f5; color: #c53030;"><h2>Error</h2><p>Could not load data from dates.csv. Please ensure the file exists in the same folder and you are running this from a web server. Check the console for more details.</p></div>`;
        }
    }

    // Run the main function to initialize the dashboard
    loadDashboardData();

    // --- FUNCTION DEFINITIONS (These are the same as before) ---

    function updateKeyStats(dates) {
        document.getElementById('total-count').textContent = dates.length;
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        document.getElementById('earliest-date').textContent = dates[0].toLocaleDateString('en-US', options);
        document.getElementById('latest-date').textContent = dates[dates.length - 1].toLocaleDateString('en-US', options);
    }

    function generateWeekdayHeatmap(dates) {
        const container = document.getElementById('heatmap-container');
        const counts = Array(7).fill(0); // 0:Sun, 1:Mon, ..., 6:Sat
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        dates.forEach(date => {
            counts[date.getDay()]++;
        });

        const maxCount = Math.max(...counts);

        days.forEach((day, index) => {
            const count = counts[index];
            const heightPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

            const col = document.createElement('div');
            col.className = 'heatmap-col';
            col.innerHTML = `
                <div class="heatmap-bar" style="height: ${heightPercentage}%;" title="${day}: ${count} commits"></div>
                <div class="heatmap-label">${day}</div>
            `;
            container.appendChild(col);
        });
    }

    function generateYearChart(dates) {
        const ctx = document.getElementById('year-chart').getContext('2d');
        const counts = {};

        dates.forEach(date => {
            const year = date.getFullYear();
            counts[year] = (counts[year] || 0) + 1;
        });

        const labels = Object.keys(counts).sort();
        const data = labels.map(label => counts[label]);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Commits',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    function generateMonthYearChart(dates) {
        const ctx = document.getElementById('month-year-chart').getContext('2d');
        const counts = {};

        dates.forEach(date => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const key = `${year}-${month}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        const sortedKeys = Object.keys(counts).sort();
        const labels = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        });
        const data = sortedKeys.map(key => counts[key]);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Commits',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { legend: { display: false } }
            }
        });
    }
});
