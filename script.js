function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (currentField || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                currentField = '';
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [];
            }
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n after \r
            }
        } else {
            currentField += char;
        }
    }
    
    // Add last field and row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
    }
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    
    return rows;
}

async function loadDashboard() {
    try {
        console.log('Attempting to fetch data.csv...');
        const response = await fetch('data.csv');
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('CSV loaded, length:', csvText.length);
        const rows = parseCSV(csvText);
        console.log('Parsed rows:', rows.length);
        
        // Helper function to parse DD.MM.YYYY date format
        function parseDate(dateStr) {
            if (!dateStr) return null;
            const parts = dateStr.trim().split('.');
            if (parts.length !== 3) return null;
            // Create date in MM/DD/YYYY format (JavaScript Date expects this)
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }

        // Skip header row
        const data = rows.slice(1).map(row => {
            return {
                country: row[1]?.trim(),
                platform: row[3]?.trim().toLowerCase(),
                nights: parseInt(row[6]?.trim()) || 0,
                checkIn: row[4]?.trim(),
                checkOut: row[5]?.trim()
            };
        });

        console.log('Data rows:', data.length);

        // Calculate statistics
        // Find min check-in date and max check-out date
        const checkInDates = data
            .map(row => parseDate(row.checkIn))
            .filter(date => date !== null);
        const checkOutDates = data
            .map(row => parseDate(row.checkOut))
            .filter(date => date !== null);
        
        const minCheckIn = checkInDates.length > 0 ? new Date(Math.min(...checkInDates)) : null;
        const maxCheckOut = checkOutDates.length > 0 ? new Date(Math.max(...checkOutDates)) : null;
        
        // Calculate days difference (add 1 to include both check-in and check-out days)
        const totalDays = (minCheckIn && maxCheckOut)
            ? Math.ceil((maxCheckOut - minCheckIn) / (1000 * 60 * 60 * 24)) + 1
            : 0;
        const uniqueCountries = new Set(data.filter(row => row.country).map(row => row.country));
        const workawayProjects = data.filter(row => row.platform === 'workaway').length;

        console.log('Statistics calculated:', { totalDays, countries: uniqueCountries.size, workawayProjects });

        // Store countries globally so it can be accessed by countries.js
        window.visitedCountries = uniqueCountries;

        // Display statistics
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Days on the Road</div>
                    <div class="stat-value">${totalDays}<span class="stat-unit"> days</span></div>
                </div>
                <div class="stat-card clickable" id="countries-card" onclick="showCountriesList(window.visitedCountries)">
                    <div class="stat-label">Countries Visited</div>
                    <div class="stat-value">${uniqueCountries.size}<span class="stat-unit"> countries</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Workaway Projects</div>
                    <div class="stat-value">${workawayProjects}<span class="stat-unit"> projects</span></div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('dashboard').innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${error.message}<br><br>
                <strong>Solution:</strong> You need to run a local server. Open a terminal in this folder and run:<br>
                <code style="background: rgba(0,0,0,0.2); padding: 5px; border-radius: 5px; display: inline-block; margin-top: 10px;">
                    python -m http.server 8000
                </code><br><br>
                Then open <code style="background: rgba(0,0,0,0.2); padding: 5px; border-radius: 5px;">http://localhost:8000/dashboard.html</code> in your browser.
            </div>
        `;
    }
}

// Load dashboard when page loads
loadDashboard();

