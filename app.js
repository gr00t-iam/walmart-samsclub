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
  const lines = text.split('\n');
  if (lines.length < 3) return alert("Invalid CSV format. Are you sure this is the Master Route?");
  
  // Extract headers from the 1st row (index 0)
  const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));
  const parsedData = [];
  
  // Data starts at line 3 (index 2)
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell ? cell.trim().replace(/^"|"$/g, '') : '');
    const obj = {};
    headers.forEach((h, index) => { obj[h] = row[index] || ''; });
    
    if (obj['Store Number']) parsedData.push(obj);
  }
  
  siteData = parsedData;
  localStorage.setItem('siteData', JSON.stringify(siteData));
  
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('searchSection').style.display = 'block';
  renderList(siteData);
}

function loadData() {
  const saved = localStorage.getItem('siteData');
  if (saved) {
    siteData = JSON.parse(saved);
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
}

document.getElementById('searchInput').addEventListener('input', function(e) {
  const term = e.target.value.toLowerCase();
  const filtered = siteData.filter(site => {
    return (site['Store Number'] && site['Store Number'].toLowerCase().includes(term)) ||
           (site['City'] && site['City'].toLowerCase().includes(term)) ||
           (site['Route'] && site['Route'].toLowerCase() === term);
  });
  renderList(filtered);
});

function renderList(data) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';
  
  const limit = Math.min(data.length, 50); // Cap display for performance
  
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