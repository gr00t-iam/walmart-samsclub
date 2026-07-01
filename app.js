let siteData = [];

// Initialize
window.onload = () => {
  loadData();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
  }
};

document.getElementById('csvFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    parseAndSaveData(event.target.result);
  };
  reader.readAsText(file);
});

function parseAndSaveData(text) {
  // Aggressively strip carriage returns and split by line
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines.length < 3) return alert("Invalid CSV format. Are you sure this is the Master Route?");
  
  // Clean headers: remove BOM (\uFEFF), quotes, and whitespace
  const rawHeaders = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => 
    h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim()
  );
  
  const parsedData = [];
  
  // Data starts at line 3 (index 2)
  for (let i = 2; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;
    
    const row = rawLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => 
      cell ? cell.replace(/^"|"$/g, '').trim() : ''
    );
    
    const obj = {};
    rawHeaders.forEach((h, index) => { 
      // Force map our critical keys so we ignore minor header typos/spaces
      let cleanKey = h;
      const lowerH = h.toLowerCase();
      if (lowerH.includes('store number')) cleanKey = 'Store Number';
      if (lowerH.includes('city')) cleanKey = 'City';
      if (lowerH.includes('route')) cleanKey = 'Route';
      
      obj[cleanKey] = row[index] || ''; 
    });
    
    // Explicitly clean the Store Number value
    if (obj['Store Number']) {
      // Remove any ".0" Excel artifacts and make it a strict string
      obj['Store Number'] = obj['Store Number'].toString().replace(/\.0$/, '').trim();
      parsedData.push(obj);
    }
  }
  
  siteData = parsedData;
  localStorage.setItem('siteData', JSON.stringify(siteData));
  
  // LOG TO CONSOLE FOR DEBUGGING
  console.log("✅ CSV Parsed Successfully!");
  console.log(`Loaded ${siteData.length} stores.`);
  console.log("First 3 records to verify structure:", siteData.slice(0, 3));
  
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('searchSection').style.display = 'block';
  renderList(siteData);
}

function loadData() {
  const saved = localStorage.getItem('siteData');
  if (saved) {
    siteData = JSON.parse(saved);
    console.log("✅ Loaded data from Local Storage. Total records:", siteData.length);
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'block';
    renderList(siteData);
  }
}

function clearData() {
  localStorage.removeItem('siteData');
  siteData = [];
  document.getElementById('uploadSection').style.display = 'block';
  document.getElementById('searchSection').style.display = 'none';
  document.getElementById('resultsContainer').innerHTML = '';
  document.getElementById('csvFileInput').value = '';
  console.log("🗑️ Data cleared.");
}

// STRICT SEARCH LOGIC
document.getElementById('searchInput').addEventListener('input', function(e) {
  const term = e.target.value.toLowerCase().trim();
  
  if (!term) {
    renderList(siteData);
    return;
  }

  // 1. ABSOLUTE EXACT MATCH
  const exactStoreMatch = siteData.filter(site => {
    return site['Store Number'] && site['Store Number'].toLowerCase() === term;
  });

  // If exact match found, isolate it and stop searching
  if (exactStoreMatch.length > 0) {
    console.log(`🎯 Exact match found for Store: ${term}`, exactStoreMatch);
    renderList(exactStoreMatch);
    return; 
  }

  // 2. EXPLICIT ROUTE SEARCH (e.g., "route 4" or "r 4")
  if (term.startsWith('route ') || term.startsWith('r ')) {
    const routeNum = term.replace('route ', '').replace('r ', '').trim();
    const routeMatches = siteData.filter(site => {
        return site['Route'] && site['Route'].toString().toLowerCase() === routeNum;
    });
    
    if (routeMatches.length > 0) {
      renderList(routeMatches);
      return;
    }
  }

  // 3. FALLBACK PARTIAL MATCH
  const matches = siteData.filter(site => {
    const sNum = site['Store Number'] ? site['Store Number'].toLowerCase() : '';
    const sCity = site['City'] ? site['City'].toLowerCase() : '';
    const sRoute = site['Route'] ? site['Route'].toLowerCase() : '';
    
    return sNum.includes(term) || sCity.includes(term) || sRoute === term;
  });

  renderList(matches);
});

function renderList(data) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';
  
  const limit = Math.min(data.length, 50); 
  
  for (let i = 0; i < limit; i++) {
    const site = data[i];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>Store ${site['Store Number']} - ${site['Store type']}</h3>
      <div class="route-badge">Route ${site['Route']} | Stop ${site['Stop Number']}</div>
      <p><strong>Address:</strong> ${site['Address']}, ${site['City']}, ${site['State']}</p>
      <p><strong>Tentative Date:</strong> ${site['Tentative Date'] || 'TBD'}</p>
      <p style="font-size: 0.9em; color: #666;"><strong>Drive to Next:</strong> ${site['Distance to Next Stop (miles)']} mi (${site['Drive Time to Next Stop ']})</p>
      
      <div class="hw-grid">
        <div class="hw-box"><strong>Total PCs:</strong><br>${site['Total PCs'] || 0}</div>
        <div class="hw-box"><strong>Total TCs:</strong><br>${site['Total Thin Clients'] || 0}</div>
      </div>
      
      <details>
        <summary>View Printer Details</summary>
        <ul>
            <li>MS826: ${site['MS826'] || 0}</li>
            <li>MS632: ${site['MS632'] || 0}</li>
            <li>MX722: ${site['MX722'] || 0}</li>
            <li>MX632: ${site['MX632'] || 0}</li>
            <li>CX632: ${site['CX632'] || 0}</li>
            <li>CX735: ${site['CX735'] || 0}</li>
            <li>CS531: ${site['CS531'] || 0}</li>
        </ul>
      </details>
    `;
    container.appendChild(card);
  }
  
  if (data.length > 50) {
    const more = document.createElement('p');
    more.style.textAlign = 'center';
    more.style.color = '#666';
    more.innerText = `...and ${data.length - 50} more. Keep typing to filter!`;
    container.appendChild(more);
  }
}
