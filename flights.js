/**
 * Flights data fetcher and display handler
 * Fetches flight data from SQL Server via the Python backend API
 */

async function loadFlights() {
    // Show loading indicator
    showLoadingIndicator();
    
    try {
        console.log('Fetching flights data from API...');
        const response = await fetch('/api/flights');
        
        // Check content type
        const contentType = response.headers.get('content-type') || '';
        console.log('Response status:', response.status, response.statusText);
        console.log('Content-Type:', contentType);
        
        // Get response as text first to handle both JSON and HTML errors
        const responseText = await response.text();
        console.log('Response text preview:', responseText.substring(0, 200));
        
        if (!response.ok) {
            // Try to parse as JSON if it's JSON, otherwise use text
            let errorMsg = `Failed to fetch flights: ${response.status} ${response.statusText}`;
            try {
                if (contentType.includes('application/json')) {
                    const errorData = JSON.parse(responseText);
                    errorMsg = errorData.error || errorMsg;
                } else {
                    // It's HTML or plain text error
                    console.error('Non-JSON error response:', responseText.substring(0, 500));
                    // Try to extract useful error info from HTML
                    const match = responseText.match(/<title>(.*?)<\/title>/i) || 
                                 responseText.match(/Error[:\s]+(.*?)(?:\n|<)/i);
                    if (match) {
                        errorMsg = `Server error: ${match[1]}`;
                    } else {
                        errorMsg = `Server error (${response.status}). Check server console for details.`;
                    }
                }
            } catch (e) {
                console.error('Error parsing error response:', e);
                errorMsg = `Server error (${response.status}). Check server console for details.`;
            }
            console.error('Error loading flights:', errorMsg);
            displayError(errorMsg);
            return null;
        }
        
        // Check if response is JSON
        if (!contentType.includes('application/json')) {
            console.error('Non-JSON response received:', responseText.substring(0, 500));
            displayError(`Server returned non-JSON response. Check server console for errors.`);
            return null;
        }
        
        // Parse JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            console.error('Response text:', responseText.substring(0, 500));
            displayError('Server returned invalid JSON. Check server console for errors.');
            return null;
        }
        
        // Check if response is an error object
        if (data.error) {
            console.error('Error from server:', data.error);
            displayError(data.error);
            return null;
        }
        
        console.log('Flights loaded:', Array.isArray(data) ? data.length : 'Not an array', data);
        
        // Process and display flights
        displayFlights(data);
        
        return data;
    } catch (error) {
        console.error('Error loading flights:', error);
        displayError(`Failed to load flights: ${error.message}. Check server console for details.`);
        return null;
    }
}

function showLoadingIndicator() {
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        // Remove existing loading/error indicators
        const existing = dashboard.querySelector('.flights-loading, .flights-error');
        if (existing) existing.remove();
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'flights-loading';
        loadingDiv.innerHTML = `
            <div style="color: white; text-align: center; margin: 20px 0; padding: 20px;">
                <div class="loading">Loading flights...</div>
            </div>
        `;
        dashboard.appendChild(loadingDiv);
    }
}

function displayError(errorMessage) {
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        // Remove loading indicator
        const loadingDiv = dashboard.querySelector('.flights-loading');
        if (loadingDiv) loadingDiv.remove();
        
        // Check if error already displayed
        let errorDiv = dashboard.querySelector('.flights-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'flights-error';
            dashboard.appendChild(errorDiv);
        }
        errorDiv.innerHTML = `
            <div class="error" style="margin-top: 20px;">
                <strong>Flights Error:</strong> ${errorMessage}
            </div>
        `;
    }
}

function displayFlights(flights) {
    // Display flights data in the console and optionally in the UI
    
    // Remove any existing error/loading messages
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        const errorDiv = dashboard.querySelector('.flights-error');
        if (errorDiv) {
            errorDiv.remove();
        }
        const loadingDiv = dashboard.querySelector('.flights-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    if (!flights || !Array.isArray(flights)) {
        console.log('No flights data available or invalid format:', flights);
        displayError('No flights data available or invalid response format');
        return;
    }
    
    if (flights.length === 0) {
        console.log('No flights found in database');
        displayError('No flights found in database');
        return;
    }
    
    // Log flights to console for debugging
    console.table(flights);
    
    // Display flights in the dashboard
    // dashboard was already declared above, just check if it exists
    if (!dashboard) {
        console.error('Dashboard element not found!');
        return;
    }
    
    // Remove existing flights section if it exists
    const existingFlightsSection = dashboard.querySelector('.flights-section');
    if (existingFlightsSection) {
        existingFlightsSection.remove();
    }
    
    // Get existing stats grid
    const statsGrid = dashboard.querySelector('.stats-grid');
    
    if (!statsGrid) {
        console.error('Stats grid not found! Dashboard may not be loaded yet.');
        displayError('Dashboard not ready. Please refresh the page.');
        return;
    }
    
    // Calculate total price
    let totalPrice = 0;
    flights.forEach(flight => {
        if (flight.price !== null && flight.price !== undefined && typeof flight.price === 'number') {
            totalPrice += flight.price;
        }
    });
    
    // Create flights section
    const flightsSection = document.createElement('div');
    flightsSection.className = 'flights-section';
    flightsSection.innerHTML = `
        <h2 style="color: white; margin: 40px 0 20px 0; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">✈️ Flights</h2>
        <div class="flights-table-container">
            <table class="flights-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${flights.map((flight, index) => {
                        // Format price
                        let price = 0;
                        let priceStr = 'N/A';
                        if (flight.price !== null && flight.price !== undefined) {
                            if (typeof flight.price === 'number') {
                                price = flight.price;
                                priceStr = `$${flight.price.toFixed(2)}`;
                            } else {
                                price = parseFloat(flight.price) || 0;
                                priceStr = `$${price.toFixed(2)}`;
                            }
                        }
                        
                        return `
                            <tr>
                                <td class="flight-order">${index + 1}</td>
                                <td class="flight-from">${flight.from || 'N/A'}</td>
                                <td class="flight-to">${flight.to || 'N/A'}</td>
                                <td class="flight-price">${priceStr}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="flights-summary">
                        <td colspan="3"><strong>Total</strong></td>
                        <td class="flight-price-total"><strong>$${totalPrice.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    // Append flights section after stats grid
    dashboard.appendChild(flightsSection);
    console.log('Flights section added to dashboard');
}

// Function to wait for dashboard to be ready
function waitForDashboard() {
    return new Promise((resolve) => {
        const checkDashboard = () => {
            const dashboard = document.getElementById('dashboard');
            const statsGrid = dashboard?.querySelector('.stats-grid');
            if (statsGrid) {
                resolve();
            } else {
                setTimeout(checkDashboard, 100);
            }
        };
        checkDashboard();
    });
}

// Auto-load flights when the page loads
// Wait for the dashboard to load first
async function initFlights() {
    try {
        // Wait for dashboard to be ready
        await waitForDashboard();
        console.log('Dashboard ready, loading flights...');
        // Small delay to ensure DOM is fully rendered
        setTimeout(loadFlights, 200);
    } catch (error) {
        console.error('Error initializing flights:', error);
    }
}

// Start loading flights
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlights);
} else {
    initFlights();
}
