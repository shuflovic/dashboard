// Function to show the list of visited countries
function showCountriesList(countries) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'countries-overlay';
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            closeCountriesList();
        }
    };

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'countries-modal';

    // Create header
    const header = document.createElement('div');
    header.className = 'countries-header';
    header.innerHTML = `
        <h2>Visited Countries</h2>
        <button class="close-btn" onclick="closeCountriesList()">&times;</button>
    `;

    // Create countries list
    const list = document.createElement('div');
    list.className = 'countries-list';
    
    // Sort countries alphabetically
    const sortedCountries = Array.from(countries).sort();
    
    sortedCountries.forEach((country, index) => {
        const item = document.createElement('div');
        item.className = 'country-item';
        item.innerHTML = `
            <span class="country-index">${index + 1}.</span>
            <span class="country-name">${country}</span>
        `;
        list.appendChild(item);
    });

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(list);
    overlay.appendChild(modal);

    // Add to body
    document.body.appendChild(overlay);
}

// Function to close the countries list
function closeCountriesList() {
    const overlay = document.querySelector('.countries-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Close on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCountriesList();
    }
});

