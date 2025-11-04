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
    {name: "Dal Lake", coords: [34.115820567793925, 74.87038724125391], desc: "Dal Lake is a famous urban lake in Srinagar."},
    {name: "Wular Lake", coords: [34.34842187394441, 74.55284157368692], desc: "Wular Lake is one of the largest freshwater lakes in Asia.", Image: "wular.jpg"}
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
    document.getElementById('lake-name').innerText = lake.name;
    document.getElementById('lake-desc').innerText = lake.desc;

    // Update long description (h5 or #lake-info)
    const infoElement = document.getElementById('lake-info') || document.querySelector('#details h5');
    if (infoElement) {
        infoElement.innerHTML = lakeInfo[lake.name] || lake.desc;
    }

    // Correct key for lake name in JSON
    const lakeNameKey = "Name of Lake";
    const lakeRows = lakeData.filter(d => d[lakeNameKey].toLowerCase() === lake.name.toLowerCase());

    const tbody = document.querySelector("#lake-table tbody");
    tbody.innerHTML = '';

    if (lakeRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13">No data found for ${lake.name}</td></tr>`;
        // Clear plots
        Object.values(chartInstances).forEach(chart => chart.destroy());
        chartInstances = {};
        return;
    }

    // Populate table with proper column order
    lakeRows.forEach(row => {
        const tr = document.createElement('tr');
        
        // Lake Name
        const tdLake = document.createElement('td');
        tdLake.textContent = row['Name of Lake'];
        tr.appendChild(tdLake);
        
        // Year
        const tdYear = document.createElement('td');
        tdYear.textContent = row['Year'];
        tr.appendChild(tdYear);
        
        // Source with styling
        const tdSource = document.createElement('td');
        tdSource.textContent = row['Source'];
        tdSource.className = row['Source'].toLowerCase() === 'actual' ? 'source-actual' : 'source-forecast';
        tr.appendChild(tdSource);
        
        // Temperature Min & Max
        const tdTempMin = document.createElement('td');
        tdTempMin.textContent = parseFloat(row['Min Temperature']).toFixed(2);
        tr.appendChild(tdTempMin);
        
        const tdTempMax = document.createElement('td');
        tdTempMax.textContent = parseFloat(row['Max Temperature']).toFixed(2);
        tr.appendChild(tdTempMax);
        
        // Dissolved Oxygen Min & Max
        const tdDOMin = document.createElement('td');
        tdDOMin.textContent = parseFloat(row['Min Dissolved Oxygen']).toFixed(2);
        tr.appendChild(tdDOMin);
        
        const tdDOMax = document.createElement('td');
        tdDOMax.textContent = parseFloat(row['Max Dissolved Oxygen']).toFixed(2);
        tr.appendChild(tdDOMax);
        
        // pH Min & Max
        const tdpHMin = document.createElement('td');
        tdpHMin.textContent = parseFloat(row['Min pH']).toFixed(2);
        tr.appendChild(tdpHMin);
        
        const tdpHMax = document.createElement('td');
        tdpHMax.textContent = parseFloat(row['Max pH']).toFixed(2);
        tr.appendChild(tdpHMax);
        
        // Conductivity Min & Max
        const tdCondMin = document.createElement('td');
        tdCondMin.textContent = parseFloat(row['Min Conductivity']).toFixed(2);
        tr.appendChild(tdCondMin);
        
        const tdCondMax = document.createElement('td');
        tdCondMax.textContent = parseFloat(row['Max Conductivity']).toFixed(2);
        tr.appendChild(tdCondMax);
        
        // BOD Min & Max
        const tdBODMin = document.createElement('td');
        tdBODMin.textContent = parseFloat(row['Min BOD']).toFixed(2);
        tr.appendChild(tdBODMin);
        
        const tdBODMax = document.createElement('td');
        tdBODMax.textContent = parseFloat(row['Max BOD']).toFixed(2);
        tr.appendChild(tdBODMax);
        
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
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = canvasId;
            canvas.style.marginBottom = '30px';
            container.appendChild(canvas);
        }

        if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

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