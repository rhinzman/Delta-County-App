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
            layer: 'Stadia.AlidadeSmoothDark',
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        },
        'Terrain': {
            layer: 'Stadia.StamenTerrain',
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://stamen.com">Stamen Design</a>, &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
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
    // TODO: Replace these placeholder URLs with actual feature service URLs from your web map
    layers: [
        {
            id: 'counties',
            name: 'County Boundaries',
            url: 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/YourDeltaCountyService/FeatureServer/0', // UPDATE THIS URL
            type: 'featureLayer',
            visible: true,
            style: {
                color: '#FFFFFF',
                weight: 3,
                fillOpacity: 0.1,
                opacity: 1
            },
            popupTemplate: {
                title: 'County: {NAME}',
                content: '<p><strong>County:</strong> {NAME}</p><p><strong>State:</strong> {STATE_NAME}</p>'
            }
        },
        {
            id: 'townships',
            name: 'Township Boundaries',
            url: 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/YourDeltaCountyService/FeatureServer/1', // UPDATE THIS URL
            type: 'featureLayer',
            visible: true,
            style: {
                color: '#4C0073',
                weight: 2,
                fillOpacity: 0.2,
                opacity: 0.8
            },
            popupTemplate: {
                title: 'Township: {NAME}',
                content: '<p><strong>Township:</strong> {NAME}</p><p><strong>Type:</strong> {TYPE}</p>'
            }
        },
        {
            id: 'parcels',
            name: 'Property Parcels',
            url: 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/YourDeltaCountyService/FeatureServer/2', // UPDATE THIS URL
            type: 'featureLayer',
            visible: true,
            style: {
                color: '#85929E',
                weight: 1,
                fillOpacity: 0.3,
                opacity: 0.7
            },
            popupTemplate: {
                title: 'Parcel: {PARCEL_ID}',
                content: `
                    <div class="popup-content">
                        <p><strong>Parcel ID:</strong> {PARCEL_ID}</p>
                        <p><strong>Owner:</strong> {OWNER_NAME}</p>
                        <p><strong>Address:</strong> {SITE_ADDR}</p>
                        <p><strong>Township:</strong> {TOWNSHIP}</p>
                        <p><strong>Zip Code:</strong> {ZIP_CODE}</p>
                        <p><strong>Acreage:</strong> {ACRES}</p>
                    </div>
                `
            }
        },
        {
            id: 'roads',
            name: 'Roads',
            url: 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/YourDeltaCountyService/FeatureServer/3', // UPDATE THIS URL
            type: 'featureLayer',
            visible: false,
            style: {
                color: '#FFD700',
                weight: 2,
                opacity: 0.8
            },
            popupTemplate: {
                title: 'Road: {ROAD_NAME}',
                content: '<p><strong>Road Name:</strong> {ROAD_NAME}</p><p><strong>Type:</strong> {ROAD_TYPE}</p>'
            }
        },
        {
            id: 'waterFeatures',
            name: 'Water Features',
            url: 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/YourDeltaCountyService/FeatureServer/4', // UPDATE THIS URL
            type: 'featureLayer',
            visible: false,
            style: {
                color: '#0077BE',
                weight: 2,
                fillColor: '#87CEEB',
                fillOpacity: 0.5,
                opacity: 0.8
            },
            popupTemplate: {
                title: 'Water Feature: {NAME}',
                content: '<p><strong>Name:</strong> {NAME}</p><p><strong>Type:</strong> {FEATURE_TYPE}</p>'
            }
        },
        {
            id: 'zoning',
            name: 'Zoning Districts',
            url: 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/YourDeltaCountyService/FeatureServer/5', // UPDATE THIS URL
            type: 'featureLayer',
            visible: false,
            style: {
                color: '#FF6B6B',
                weight: 1,
                fillOpacity: 0.4,
                opacity: 0.7
            },
            popupTemplate: {
                title: 'Zoning: {ZONE_TYPE}',
                content: '<p><strong>Zone Type:</strong> {ZONE_TYPE}</p><p><strong>Description:</strong> {ZONE_DESC}</p>'
            }
        }
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