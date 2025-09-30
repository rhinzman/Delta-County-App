// Configuration file for Delta County GIS App
// Update these URLs with the actual feature service URLs from your web map

const DeltaCountyConfig = {
    // Map settings
    map: {
        center: [45.87, -87.0], // Delta County, Michigan coordinates
        zoom: 9,
        minZoom: 8,
        maxZoom: 18
    },
    
    // Base map configurations
    baseMaps: {
        'Dark Theme': {
            layer: 'CartoDB.DarkMatter',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
        'Terrain': {
            layer: 'OpenTopoMap',
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        },
        'Street Map': {
            layer: 'OpenStreetMap.Mapnik',
            attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        },
        'Satellite': {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }
    },
    
    // Layer configurations for Delta County
    // Note: These placeholder layers have been disabled to prevent Esri Leaflet errors
    // The real Delta County layers are now loaded via delta-county-service.js
    layers: [
        // All layers moved to delta-county-service.js for better error handling
    ],
    
    // Township list for dropdown
    townships: [
        "Choose a Township",
        "Baldwin",
        "Ford River", 
        "Garden",
        "Maple Ridge",
        "Masonville",
        "Nahma",
        "Rapid River",
        "Wells",
        "Bark River",
        "Escanaba",
        "Gladstone",
        "Bay De Noc",
        "Fairbanks",
        "Ensign",
        "Brampton",
        "Cornell"
    ],
    
    // UI settings
    ui: {
        showLoadingSpinner: true,
        showLayerControl: true,
        showLegend: true,
        showTownshipSelector: true,
        showInfoPanel: true
    },
    
    // Feature interaction settings
    interaction: {
        enablePopups: true,
        enableSelection: true,
        highlightOnHover: true,
        selectedStyle: {
            color: '#00FFFB',
            weight: 3,
            fillOpacity: 0.5
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeltaCountyConfig;
}