// Fallback Delta County Service (without Esri Leaflet dependency)
// This provides basic GeoJSON loading as a fallback when Esri Leaflet isn't available

class DeltaCountyFallbackService {
    constructor(map) {
        this.map = map;
        this.serviceUrl = 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer';
        this.layers = [];
    }

    async loadService() {
        console.log('🔄 Loading Delta County service with fallback method...');
        console.log('⚠️ Using GeoJSON fallback (Esri Leaflet not available)');
        
        try {
            // Try to load layers as GeoJSON instead of using Esri FeatureLayer
            const layerIds = [7, 0, 1, 2]; // Townships, Address Points, Roads, Parcels
            const layerNames = ['Townships', 'Address Points', 'Roads', 'Parcels'];
            
            for (let i = 0; i < layerIds.length; i++) {
                const layerId = layerIds[i];
                const layerName = layerNames[i];
                
                try {
                    const geoJsonUrl = `${this.serviceUrl}/${layerId}/query?where=1%3D1&outFields=*&f=geojson`;
                    console.log(`📥 Loading ${layerName} as GeoJSON...`);
                    
                    const response = await fetch(geoJsonUrl);
                    if (response.ok) {
                        const geoJsonData = await response.json();
                        
                        if (geoJsonData.features && geoJsonData.features.length > 0) {
                            this.createGeoJsonLayer(layerId, layerName, geoJsonData);
                            console.log(`✅ Loaded ${layerName}: ${geoJsonData.features.length} features`);
                        } else {
                            console.log(`⚠️ ${layerName} has no features`);
                        }
                    } else {
                        console.warn(`❌ Failed to load ${layerName}: HTTP ${response.status}`);
                    }
                } catch (error) {
                    console.warn(`❌ Error loading ${layerName}:`, error.message);
                }
            }
            
            return this.layers.length > 0;
        } catch (error) {
            console.error('❌ Fallback service failed:', error);
            return false;
        }
    }

    createGeoJsonLayer(layerId, layerName, geoJsonData) {
        const style = this.getStyleForLayer(layerName);
        
        const layer = L.geoJSON(geoJsonData, {
            style: style,
            pointToLayer: (feature, latlng) => {
                if (style.radius) {
                    return L.circleMarker(latlng, style);
                }
                return L.marker(latlng);
            },
            onEachFeature: (feature, layer) => {
                const popup = this.createPopupContent(layerName, feature.properties);
                layer.bindPopup(popup);
            }
        });

        const layerConfig = {
            id: `delta_fallback_${layerId}`,
            name: `📄 ${layerName} (GeoJSON)`,
            leafletLayer: layer,
            visible: layerName === 'Townships' || layerName === 'Parcels',
            type: 'geoJSON',
            fallback: true
        };

        this.layers.push(layerConfig);

        // Add to map if visible by default
        if (layerConfig.visible) {
            layer.addTo(this.map);
        }
    }

    getStyleForLayer(layerName) {
        const styles = {
            'Townships': {
                color: '#2E86AB',
                weight: 2,
                fillColor: '#A23B72',
                fillOpacity: 0.1,
                opacity: 0.8
            },
            'Parcels': {
                color: '#F18F01',
                weight: 1,
                fillColor: '#C73E1D',
                fillOpacity: 0.2,
                opacity: 0.7
            },
            'Address Points': {
                radius: 5,
                fillColor: '#3F612D',
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            },
            'Roads': {
                color: '#231F20',
                weight: 2,
                opacity: 0.8
            }
        };
        
        return styles[layerName] || {
            color: '#3388ff',
            weight: 2,
            opacity: 0.8
        };
    }

    createPopupContent(layerName, properties) {
        let content = `<div style="padding: 10px; font-family: Arial, sans-serif;">`;
        content += `<h4 style="margin-top: 0;">${layerName}</h4>`;
        
        // Show first few properties
        const keys = Object.keys(properties).slice(0, 5);
        keys.forEach(key => {
            if (properties[key] !== null && properties[key] !== '') {
                content += `<p><strong>${key}:</strong> ${properties[key]}</p>`;
            }
        });
        
        content += `<p style="font-size: 12px; color: #666; margin-top: 10px;">`;
        content += `⚠️ Loaded via GeoJSON fallback</p>`;
        content += `</div>`;
        
        return content;
    }

    getLayers() {
        return this.layers;
    }

    async initialize() {
        console.log('🔄 Initializing Delta County Fallback Service...');
        const success = await this.loadService();
        
        if (success) {
            console.log(`✅ Fallback service loaded ${this.layers.length} layers`);
        } else {
            console.log('❌ Fallback service failed to load any layers');
        }
        
        return this.layers;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeltaCountyFallbackService;
}