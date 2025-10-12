let map = L.map('map').setView([34.11582, 74.87038], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const lakes = [
    {name: "Dal lake", coords: [34.115820567793925, 74.87038724125391], desc: "Dal Lake is a famous urban lake in Srinagar."},
    {name: "Wular lake", coords: [34.34842187394441, 74.55284157368692], desc: "Wular Lake is one of the largest freshwater lakes in Asia."}
];

let chartInstances = {}; // store multiple charts
let lakeData = [];

// Fetch data from backend
fetch('/api/data')
    .then(response => response.json())
    .then(data => {
        console.log("Fetched data:", data);
        lakeData = data;

        // Add map markers
        lakes.forEach(lake => {
            let marker = L.marker(lake.coords).addTo(map).bindPopup(lake.name);
            marker.on('click', () => showLakeDetails(lake));
        });

        // Show default lake
        showLakeDetails(lakes[0]);
    })
    .catch(err => console.error(err));

function showLakeDetails(lake) {
    document.getElementById('lake-name').innerText = lake.name;
    document.getElementById('lake-desc').innerText = lake.desc;

    // Correct key for lake name in JSON
    const lakeNameKey = "Name of Lake";
    const lakeRows = lakeData.filter(d => d[lakeNameKey].toLowerCase() === lake.name.toLowerCase());

    const tbody = document.querySelector("#lake-table tbody");
    tbody.innerHTML = '';

    if(lakeRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13">No data found for ${lake.name}</td></tr>`;
        // Clear plots
        Object.values(chartInstances).forEach(chart => chart.destroy());
        chartInstances = {};
        return;
    }

    // Populate table dynamically
    lakeRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = Object.keys(row).map(k => {
            let val = row[k];
            if(typeof val === "number") val = val.toFixed(2);
            return `<td>${val}</td>`;
        }).join('');
        tbody.appendChild(tr);
    });

    // Numeric features to plot
    const features = [
        {keyMin: 'Min Dissolved Oxygen', keyMax: 'Max Dissolved Oxygen', label: 'Dissolved Oxygen'},
        {keyMin: 'Min Temperature', keyMax: 'Max Temperature', label: 'Temperature (°C)'},
        {keyMin: 'Min pH', keyMax: 'Max pH', label: 'pH'},
        {keyMin: 'Min Conductivity', keyMax: 'Max Conductivity', label: 'Conductivity'},
        {keyMin: 'Min BOD', keyMax: 'Max BOD', label: 'BOD'}
    ];

    features.forEach(feature => {
        const years = lakeRows.map(d => d['Year']);
        const minVals = lakeRows.map(d => d[feature.keyMin]);
        const maxVals = lakeRows.map(d => d[feature.keyMax]);

        const canvasId = feature.keyMin.replace(/\s+/g, '') + '_chart';
        const container = document.getElementById('plots');

        // Create canvas if not exists
        let canvas = document.getElementById(canvasId);
        if(!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = canvasId;
            canvas.style.marginBottom = '30px';
            container.appendChild(canvas);
        }

        if(chartInstances[canvasId]) chartInstances[canvasId].destroy();

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
                        tension: 0.3
                    },
                    {
                        label: `Min ${feature.label}`,
                        data: minVals,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `${feature.label} Trends` }
                }
            }
        });
    });
}
