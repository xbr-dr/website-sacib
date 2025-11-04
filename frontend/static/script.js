// Initialize map
let map = L.map('map').setView([34.22947024039823, 74.71906692726527], 10);

// --- Base layers: OpenStreetMap + Satellite ---
const baseLayers = {
    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '©OSM | <a href="https://github.com/xbr-dr" target="_blank" rel="noopener noreferrer">XbrDr</a>'
    }).addTo(map),

    "Satellite (Esri)": L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri | <a href="https://github.com/xbr-dr" target="_blank" rel="noopener noreferrer">XbrDr</a>' }
    )
};

// Layer control (top-right)
L.control.layers(baseLayers).addTo(map);

// --- Lakes data ---
const lakes = [
    { name: "Dal Lake", coords: [34.115820567793925, 74.87038724125391], desc: "Dal Lake is a famous urban lake in Srinagar." },
    { name: "Wular Lake", coords: [34.34842187394441, 74.55284157368692], desc: "Wular Lake is one of the largest freshwater lakes in Asia.", Image: "wular.jpg" }
];

// --- Long description for each lake ---
const lakeInfo = {
    "Dal Lake": `
        <div style="display:flex;flex-direction:column;align-items:center;">
            <img src="static/dal.jpg" alt="Dal Lake" style="width:100%;max-width:2160px;height:auto;margin-top:10px;border-radius:20px;display:block;">
            <span style="margin-top:8px;font-size:1em;color:#555;text-align:center;">©  imad Clicks</span>
        </div>
        Dal (Urdu pronunciation: [ɖəl]; Kashmiri pronunciation: [ɖal]) is a freshwater lake in Srinagar,
        the summer capital of Jammu and Kashmir in Indian-administered Kashmir. It is an urban lake, the 
        second largest lake in Jammu and Kashmir, and the most visited place in Srinagar by tourists and 
        locals. It is integral to tourism and recreation in the Kashmir Valley and is variously known as 
        the "Lake of Flowers", "Jewel in the crown of Kashmir" or "Srinagar's Jewel". The lake is also an 
        important source for commercial operations in fishing and water plant harvesting.
        <a href="https://en.wikipedia.org/wiki/Dal_Lake" target="_blank" rel="noopener noreferrer">Read more on Wikipedia</a><br>
    `,
    "Wular Lake": `
        <div style="display:flex;flex-direction:column;align-items:center;">
            <img src="static/wular.jpg" alt="Wular Lake" style="width:100%;max-width:2160px;height:auto;margin-top:10px;border-radius:20px;display:block;">
            <span style="margin-top:8px;font-size:1em;color:#555;text-align:center;">© baramulla.nic.in </span>
        </div>
        Wular Lake, located in the Bandipora district of Jammu and Kashmir, is one of the largest freshwater 
        lakes in Asia. It plays a crucial role in controlling floods in the Jhelum River basin and supports 
        rich biodiversity, including migratory birds and aquatic vegetation. The lake is a key resource for 
        local communities who depend on it for fishing, water transport, and agriculture.
        <a href="https://en.wikipedia.org/wiki/Wular_Lake" target="_blank" rel="noopener noreferrer">Read more on Wikipedia</a><br>
    `
};

let chartInstances = {}; // store multiple charts
let lakeData = [];
let currentLake = null; // Store current lake info

// --- Water Quality Standards (BIS & WHO) ---
const waterQualityStandards = {
    temperature: {
        safe: { min: 10, max: 25 },      // Optimal range for aquatic life
        caution: { min: 5, max: 30 },    // Acceptable range
        // Outside this = unsafe
    },
    dissolvedOxygen: {
        safe: { min: 6, max: 14 },       // BIS: >6 mg/L is good
        caution: { min: 4, max: 6 },     // 4-6 mg/L moderate
        // <4 mg/L = unsafe
    },
    pH: {
        safe: { min: 6.5, max: 8.5 },    // BIS & WHO: 6.5-8.5
        caution: { min: 6.0, max: 9.0 }, // Slightly outside
        // Outside this = unsafe
    },
    conductivity: {
        safe: { min: 0, max: 300 },      // <300 μS/cm excellent
        caution: { min: 300, max: 500 }, // 300-500 acceptable
        // >500 = unsafe (high pollution)
    },
    bod: {
        safe: { min: 0, max: 3 },        // BIS: <3 mg/L clean water
        caution: { min: 3, max: 6 },     // 3-6 mg/L moderate pollution
        // >6 mg/L = unsafe (high pollution)
    }
};

// --- Function to get color based on parameter value ---
function getColorClass(parameter, value) {
    const standards = waterQualityStandards[parameter];
    if (!standards) return '';

    const numValue = parseFloat(value);

    // Check if safe
    if (numValue >= standards.safe.min && numValue <= standards.safe.max) {
        return 'safe';
    }
    // Check if caution
    else if (numValue >= standards.caution.min && numValue <= standards.caution.max) {
        return 'caution';
    }
    // Otherwise unsafe
    else {
        return 'unsafe';
    }
}


// --- Handle Alert Form Submission ---
document.addEventListener('DOMContentLoaded', function () {
    const alertForm = document.getElementById('alert-form');
    if (alertForm) {
        alertForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const message = document.getElementById('alert-message').value;
            const location = document.getElementById('alert-location').value;

            // Authority email - UPDATE THIS WITH ACTUAL AUTHORITY EMAIL
            const authorityEmail = 'saqibnabi01@gmail.com';

            // Get current lake info
            const lakeName = currentLake ? currentLake.name : 'Unknown Lake';

            // Get latest water quality data for the current lake
            let latestData = '';
            if (currentLake) {
                const lakeNameKey = "Name of Lake";
                const lakeRows = lakeData.filter(d => d[lakeNameKey].toLowerCase() === currentLake.name.toLowerCase());
                if (lakeRows.length > 0) {
                    const latest = lakeRows[lakeRows.length - 1];
                    latestData = `
Latest Water Quality Data (${latest['Year']} - ${latest['Source']}):
- Temperature: ${parseFloat(latest['Min Temperature']).toFixed(2)}°C to ${parseFloat(latest['Max Temperature']).toFixed(2)}°C
- Dissolved Oxygen: ${parseFloat(latest['Min Dissolved Oxygen']).toFixed(2)} to ${parseFloat(latest['Max Dissolved Oxygen']).toFixed(2)} mg/L
- pH: ${parseFloat(latest['Min pH']).toFixed(2)} to ${parseFloat(latest['Max pH']).toFixed(2)}
- Conductivity: ${parseFloat(latest['Min Conductivity']).toFixed(2)} to ${parseFloat(latest['Max Conductivity']).toFixed(2)} μS/cm
- BOD: ${parseFloat(latest['Min BOD']).toFixed(2)} to ${parseFloat(latest['Max BOD']).toFixed(2)} mg/L
`;
                }
            }

            // Create email subject
            const subject = `Water Quality Alert - ${lakeName}`;

            // Create email body
            const body = `Dear Water Quality Authority,

I am reporting a water quality concern for ${lakeName} in Kashmir.

ISSUE DESCRIPTION:
${message}

${location ? `SPECIFIC LOCATION:\n${location}\n\n` : ''}DATE & TIME:
${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

${latestData}
This alert was generated using GeoPredict - Water Quality Alert System
Developed by Saqib Nabi under the supervision of Dr. Khursheed Ahmad Dar at Department of IT, Sri Pratap College Srinagar.

Please investigate this matter at your earliest convenience.

Thank you.`;

            // Create mailto link
            const mailtoLink = `mailto:${authorityEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            // Open email client
            window.location.href = mailtoLink;

            // Optional: Reset form after opening email
            setTimeout(() => {
                alertForm.reset();
            }, 500);
        });
    }
});


// --- Fetch data from backend ---
fetch('/api/data')
    .then(response => response.json())
    .then(data => {
        console.log("Fetched data:", data);
        lakeData = data;

        // Add markers for both lakes
        lakes.forEach(lake => {
            let marker = L.marker(lake.coords).addTo(map).bindPopup(lake.name);
            marker.on('click', () => {
                map.setView(lake.coords, 12, { animate: true });
                marker.openPopup();
                showLakeDetails(lake);
            });
        });

        // Show default lake
        showLakeDetails(lakes[0]);
    })
    .catch(err => console.error(err));

// --- Show details function ---
function showLakeDetails(lake) {
    currentLake = lake; // Store current lake for alert system

    document.getElementById('lake-name').innerText = lake.name;
    document.getElementById('lake-desc').innerText = lake.desc;

    // Update long description
    const infoElement = document.getElementById('lake-info') || document.querySelector('#details h5');
    if (infoElement) {
        infoElement.innerHTML = lakeInfo[lake.name] || lake.desc;
    }

    // Correct key for lake name in JSON
    const lakeNameKey = "Name of Lake";
    const lakeRows = lakeData.filter(d => d[lakeNameKey].toLowerCase() === lake.name.toLowerCase());

    if (lakeRows.length === 0) {
        document.querySelector("#lake-table tbody").innerHTML = `<tr><td colspan="13">No data found for ${lake.name}</td></tr>`;
        Object.values(chartInstances).forEach(chart => chart.destroy());
        chartInstances = {};
        return;
    }

    // Generate summary cards
    createSummaryCards(lakeRows);

    // Generate radar chart for latest year
    createRadarChart(lakeRows);

    // Generate bar chart for year comparison
    createBarChart(lakeRows);

    // Generate heatmap
    createHeatmap(lakeRows);

    // Populate table
    populateTable(lakeRows);

    // Generate line charts
    createLineCharts(lakeRows);
}

// --- Create Summary Cards ---
function createSummaryCards(lakeRows) {
    const latestData = lakeRows[lakeRows.length - 1];
    const container = document.getElementById('summary-cards');
    container.innerHTML = '';

    const metrics = [
        { label: 'Temperature', min: latestData['Min Temperature'], max: latestData['Max Temperature'], unit: '°C', class: 'temperature' },
        { label: 'Dissolved Oxygen', min: latestData['Min Dissolved Oxygen'], max: latestData['Max Dissolved Oxygen'], unit: 'mg/L', class: 'oxygen' },
        { label: 'pH', min: latestData['Min pH'], max: latestData['Max pH'], unit: '', class: 'ph' },
        { label: 'Conductivity', min: latestData['Min Conductivity'], max: latestData['Max Conductivity'], unit: 'μS/cm', class: 'conductivity' },
        { label: 'BOD', min: latestData['Min BOD'], max: latestData['Max BOD'], unit: 'mg/L', class: 'bod' }
    ];

    metrics.forEach(metric => {
        const card = document.createElement('div');
        card.className = `summary-card ${metric.class}`;

        const avg = ((parseFloat(metric.min) + parseFloat(metric.max)) / 2).toFixed(2);

        card.innerHTML = `
            <h3>${metric.label}</h3>
            <div class="value">${avg} ${metric.unit}</div>
            <div class="trend">Range: ${parseFloat(metric.min).toFixed(2)} - ${parseFloat(metric.max).toFixed(2)}</div>
        `;
        container.appendChild(card);
    });
}

// --- Create Radar Chart ---
function createRadarChart(lakeRows) {
    const latestData = lakeRows[lakeRows.length - 1];

    if (chartInstances['radarChart']) {
        chartInstances['radarChart'].destroy();
    }

    const ctx = document.getElementById('radarChart').getContext('2d');
    chartInstances['radarChart'] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Temperature', 'Dissolved Oxygen', 'pH', 'Conductivity', 'BOD'],
            datasets: [{
                label: 'Max Values',
                data: [
                    latestData['Max Temperature'],
                    latestData['Max Dissolved Oxygen'] * 3, // Scale for visibility
                    latestData['Max pH'] * 10,
                    latestData['Max Conductivity'] / 10,
                    latestData['Max BOD'] * 5
                ],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                pointBackgroundColor: 'rgb(75, 192, 192)',
            }, {
                label: 'Min Values',
                data: [
                    latestData['Min Temperature'],
                    latestData['Min Dissolved Oxygen'] * 3,
                    latestData['Min pH'] * 10,
                    latestData['Min Conductivity'] / 10,
                    latestData['Min BOD'] * 5
                ],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgb(255, 99, 132)',
                pointBackgroundColor: 'rgb(255, 99, 132)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Water Quality Parameters - ${latestData['Year']} (${latestData['Source']})`
                }
            },
            scales: {
                r: {
                    beginAtZero: true
                }
            }
        }
    });
}

// --- Create Bar Chart ---
function createBarChart(lakeRows) {
    if (chartInstances['barChart']) {
        chartInstances['barChart'].destroy();
    }

    const years = lakeRows.map(d => d['Year']);
    const avgTemp = lakeRows.map(d => (parseFloat(d['Min Temperature']) + parseFloat(d['Max Temperature'])) / 2);
    const avgDO = lakeRows.map(d => (parseFloat(d['Min Dissolved Oxygen']) + parseFloat(d['Max Dissolved Oxygen'])) / 2);
    const avgpH = lakeRows.map(d => (parseFloat(d['Min pH']) + parseFloat(d['Max pH'])) / 2);

    const ctx = document.getElementById('barChart').getContext('2d');
    chartInstances['barChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Avg Temperature (°C)',
                    data: avgTemp,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Dissolved Oxygen (mg/L)',
                    data: avgDO,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    yAxisID: 'y1'
                },
                {
                    label: 'Avg pH',
                    data: avgpH,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Average Water Quality Parameters by Year'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Temperature (°C)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'DO (mg/L)' },
                    grid: { drawOnChartArea: false }
                },
                y2: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'pH' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// --- Create Heatmap ---
function createHeatmap(lakeRows) {
    if (chartInstances['heatmapChart']) {
        chartInstances['heatmapChart'].destroy();
    }

    const years = lakeRows.map(d => d['Year']);
    const parameters = ['Temperature', 'DO', 'pH', 'Conductivity', 'BOD'];

    const datasets = parameters.map((param, idx) => {
        let data;
        switch (param) {
            case 'Temperature':
                data = lakeRows.map(d => (parseFloat(d['Min Temperature']) + parseFloat(d['Max Temperature'])) / 2);
                break;
            case 'DO':
                data = lakeRows.map(d => (parseFloat(d['Min Dissolved Oxygen']) + parseFloat(d['Max Dissolved Oxygen'])) / 2);
                break;
            case 'pH':
                data = lakeRows.map(d => (parseFloat(d['Min pH']) + parseFloat(d['Max pH'])) / 2);
                break;
            case 'Conductivity':
                data = lakeRows.map(d => (parseFloat(d['Min Conductivity']) + parseFloat(d['Max Conductivity'])) / 2);
                break;
            case 'BOD':
                data = lakeRows.map(d => (parseFloat(d['Min BOD']) + parseFloat(d['Max BOD'])) / 2);
                break;
        }

        const colors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(153, 102, 255, 0.8)'
        ];

        return {
            label: param,
            data: data,
            backgroundColor: colors[idx],
            borderColor: colors[idx].replace('0.8', '1'),
            borderWidth: 1
        };
    });

    const ctx = document.getElementById('heatmapChart').getContext('2d');
    chartInstances['heatmapChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Average Parameter Values by Year'
                }
            },
            scales: {
                x: { stacked: false },
                y: { stacked: false, title: { display: true, text: 'Average Values (Normalized)' } }
            }
        }
    });
}

// --- Populate Table ---
function populateTable(lakeRows) {
    const tbody = document.querySelector("#lake-table tbody");
    tbody.innerHTML = '';

    lakeRows.forEach(row => {
        const tr = document.createElement('tr');

        const tdLake = document.createElement('td');
        tdLake.textContent = row['Name of Lake'];
        tr.appendChild(tdLake);

        const tdYear = document.createElement('td');
        tdYear.textContent = row['Year'];
        tr.appendChild(tdYear);

        const tdSource = document.createElement('td');
        tdSource.textContent = row['Source'];
        tdSource.className = row['Source'].toLowerCase() === 'actual' ? 'source-actual' : 'source-forecast';
        tr.appendChild(tdSource);

        // Temperature Min & Max with color coding
        const tdTempMin = document.createElement('td');
        const tempMinVal = parseFloat(row['Min Temperature']);
        tdTempMin.textContent = tempMinVal.toFixed(2);
        tdTempMin.classList.add(getColorClass('temperature', tempMinVal));
        tr.appendChild(tdTempMin);

        const tdTempMax = document.createElement('td');
        const tempMaxVal = parseFloat(row['Max Temperature']);
        tdTempMax.textContent = tempMaxVal.toFixed(2);
        tdTempMax.classList.add(getColorClass('temperature', tempMaxVal));
        tr.appendChild(tdTempMax);

        // Dissolved Oxygen Min & Max with color coding
        const tdDOMin = document.createElement('td');
        const doMinVal = parseFloat(row['Min Dissolved Oxygen']);
        tdDOMin.textContent = doMinVal.toFixed(2);
        tdDOMin.classList.add(getColorClass('dissolvedOxygen', doMinVal));
        tr.appendChild(tdDOMin);

        const tdDOMax = document.createElement('td');
        const doMaxVal = parseFloat(row['Max Dissolved Oxygen']);
        tdDOMax.textContent = doMaxVal.toFixed(2);
        tdDOMax.classList.add(getColorClass('dissolvedOxygen', doMaxVal));
        tr.appendChild(tdDOMax);

        // pH Min & Max with color coding
        const tdpHMin = document.createElement('td');
        const phMinVal = parseFloat(row['Min pH']);
        tdpHMin.textContent = phMinVal.toFixed(2);
        tdpHMin.classList.add(getColorClass('pH', phMinVal));
        tr.appendChild(tdpHMin);

        const tdpHMax = document.createElement('td');
        const phMaxVal = parseFloat(row['Max pH']);
        tdpHMax.textContent = phMaxVal.toFixed(2);
        tdpHMax.classList.add(getColorClass('pH', phMaxVal));
        tr.appendChild(tdpHMax);

        // Conductivity Min & Max with color coding
        const tdCondMin = document.createElement('td');
        const condMinVal = parseFloat(row['Min Conductivity']);
        tdCondMin.textContent = condMinVal.toFixed(2);
        tdCondMin.classList.add(getColorClass('conductivity', condMinVal));
        tr.appendChild(tdCondMin);

        const tdCondMax = document.createElement('td');
        const condMaxVal = parseFloat(row['Max Conductivity']);
        tdCondMax.textContent = condMaxVal.toFixed(2);
        tdCondMax.classList.add(getColorClass('conductivity', condMaxVal));
        tr.appendChild(tdCondMax);

        // BOD Min & Max with color coding
        const tdBODMin = document.createElement('td');
        const bodMinVal = parseFloat(row['Min BOD']);
        tdBODMin.textContent = bodMinVal.toFixed(2);
        tdBODMin.classList.add(getColorClass('bod', bodMinVal));
        tr.appendChild(tdBODMin);

        const tdBODMax = document.createElement('td');
        const bodMaxVal = parseFloat(row['Max BOD']);
        tdBODMax.textContent = bodMaxVal.toFixed(2);
        tdBODMax.classList.add(getColorClass('bod', bodMaxVal));
        tr.appendChild(tdBODMax);

        tbody.appendChild(tr);
    });
}

// --- Create Line Charts ---
function createLineCharts(lakeRows) {
    const container = document.getElementById('plots');
    container.innerHTML = '';

    const features = [
        { keyMin: 'Min Dissolved Oxygen', keyMax: 'Max Dissolved Oxygen', label: 'Dissolved Oxygen' },
        { keyMin: 'Min Temperature', keyMax: 'Max Temperature', label: 'Temperature (°C)' },
        { keyMin: 'Min pH', keyMax: 'Max pH', label: 'pH' },
        { keyMin: 'Min Conductivity', keyMax: 'Max Conductivity', label: 'Conductivity' },
        { keyMin: 'Min BOD', keyMax: 'Max BOD', label: 'BOD' }
    ];

    features.forEach(feature => {
        const years = lakeRows.map(d => d['Year']);
        const minVals = lakeRows.map(d => d[feature.keyMin]);
        const maxVals = lakeRows.map(d => d[feature.keyMax]);

        const canvasId = feature.keyMin.replace(/\s+/g, '') + '_chart';

        let canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.style.marginBottom = '30px';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: `Max ${feature.label}`,
                        data: maxVals,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: `Min ${feature.label}`,
                        data: minVals,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `${feature.label} Trends Over Time` }
                }
            }
        });
    });
}