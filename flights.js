async function loadFlights() {
    const response = await fetch('/api/flights');
    const flights = await response.json();
    displayFlights(flights);
}

function displayFlights(flights) {
    const dashboard = document.getElementById('dashboard');
    const existingFlightsSection = dashboard.querySelector('.flights-section');
    if (existingFlightsSection) existingFlightsSection.remove();
    
    let totalPrice = 0;
    flights.forEach(flight => {
        if (flight.price) totalPrice += flight.price;
    });
    
    const flightsSection = document.createElement('div');
    flightsSection.className = 'flights-section';
    flightsSection.innerHTML = `
        <h2 style="color: white; margin: 40px 0 20px 0; text-align: center;">✈️ Flights</h2>
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
                    ${flights.map((flight, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${flight.from}</td>
                            <td>${flight.to}</td>
                            <td>$${flight.price.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>Total</strong></td>
                        <td><strong>$${totalPrice.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    dashboard.appendChild(flightsSection);
}

async function initFlights() {
    await new Promise(resolve => {
        const check = () => {
            if (document.getElementById('dashboard')?.querySelector('.stats-grid')) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
    setTimeout(loadFlights, 200);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlights);
} else {
    initFlights();
}