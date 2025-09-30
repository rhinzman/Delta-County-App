// UW-Madison GIS Service Manager
// This module handles loading UW-Madison ArcGIS service layers

class UWMadisonServiceManager {
    constructor(map) {
        this.map = map;
        this.itemId = '18855e2cb43a4c7aa6212f1692b35d7d';
        this.layers = [];
        
        // Common UW-Madison ArcGIS server patterns
        this.possibleServers = [
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services',
            'https://uwmadison.maps.arcgis.com/arcgis/rest/services',
            'https://gis.wisc.edu/arcgis/rest/services',
            'https://services1.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services'
        ];
    }

    async discoverService() {
        console.log('🔍 Discovering UW-Madison service endpoints...');
        console.log(`📍 Item ID: ${this.itemId}`);
        
        // Try ArcGIS Online item endpoint first
        const itemUrl = `https://uw-mad.maps.arcgis.com/sharing/rest/content/items/${this.itemId}?f=json`;
        
        try {
            console.log(`🌐 Checking item details: ${itemUrl}`);
            const response = await fetch(itemUrl);
            
            if (response.ok) {
                const itemData = await response.json();
                console.log('📊 Item data received:', itemData);
                
                if (itemData.url) {
                    console.log(`✅ Found service URL: ${itemData.url}`);
                    return await this.testServiceUrl(itemData.url);
                }
            }
        } catch (error) {
            console.log(`❌ Item endpoint failed: ${error.message}`);
        }
        
        // Try common service name patterns
        const commonNames = [
            'Delta_County_view',
            'Delta_County',
            'DeltaCounty',
            'Delta_County_GIS',
            'Wisconsin_Counties'
        ];
        
        for (const server of this.possibleServers) {
            for (const name of commonNames) {
                const serviceUrl = `${server}/${name}/FeatureServer`;
                const result = await this.testServiceUrl(serviceUrl);
                if (result) return result;
            }
        }
        
        console.log('❌ Could not discover UW-Madison service endpoint');
        return null;
    }
    
    async testServiceUrl(serviceUrl) {
        try {
            console.log(`🧪 Testing: ${serviceUrl}`);
            const response = await fetch(`${serviceUrl}?f=json`);
            
            if (!response.ok) {
                console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
                return null;
            }
            
            const serviceData = await response.json();
            
            if (serviceData.error) {
                console.log(`   ❌ Service Error: ${serviceData.error.message}`);
                return null;
            }
            
            if (serviceData.layers && serviceData.layers.length > 0) {
                console.log(`   ✅ Service found with ${serviceData.layers.length} layers`);
                serviceData.layers.forEach((layer, index) => {
                    console.log(`      ${index}: ${layer.name} (${layer.geometryType})`);
                });
                
                this.serviceUrl = serviceUrl;
                return serviceData;
            } else {
                console.log(`   ❌ No layers found in service`);
                return null;
            }
        } catch (error) {
            console.log(`   ❌ Connection failed: ${error.message}`);
            return null;
        }
    }

    async initialize() {
        console.log('🏛️ Initializing UW-Madison Service Manager...');
        
        const serviceData = await this.discoverService();
        
        if (!serviceData) {
            console.log('🔄 Falling back to manual configuration...');
            return this.createManualLayers();
        }
        
        return this.processLayers(serviceData.layers);
    }
    
    processLayers(layers) {
        console.log('🔧 Processing UW-Madison service layers...');
        
        layers.forEach((layerInfo, index) => {
            const layerConfig = this.createLayerConfig(layerInfo, index);
            
            if (layerConfig) {
                try {
                    // Check if Esri Leaflet is available
                    if (typeof L.esri !== 'undefined') {
                        const leafletLayer = L.esri.featureLayer({
                            url: `${this.serviceUrl}/${layerInfo.id}`,
                            style: layerConfig.style,
                            onEachFeature: (feature, layer) => {
                                this.setupFeatureInteraction(feature, layer, layerConfig);
                            }
                        });
                        
                        // Add to map if visible by default
                        if (layerConfig.visible) {
                            leafletLayer.addTo(this.map);
                        }
                        
                        layerConfig.leafletLayer = leafletLayer;
                        this.layers.push(layerConfig);
                        
                        console.log(`✅ Added layer: ${layerConfig.name}`);
                    } else {
                        console.log(`⚠️ Skipping ${layerConfig.name} - Esri Leaflet not available`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to create layer ${layerConfig.name}:`, error);
                }
            }
        });
        
        return this.layers;
    }
    
    createLayerConfig(layerInfo, index) {
        // Default styling based on geometry type
        const styles = {
            'esriGeometryPolygon': {
                color: this.getColorForIndex(index),
                weight: 2,
                fillOpacity: 0.3,
                opacity: 0.8
            },
            'esriGeometryPolyline': {
                color: this.getColorForIndex(index),
                weight: 3,
                opacity: 0.8
            },
            'esriGeometryPoint': {
                color: this.getColorForIndex(index),
                weight: 2,
                fillOpacity: 0.8,
                radius: 6
            }
        };
        
        return {
            id: `uw_madison_${layerInfo.id}`,
            name: layerInfo.name,
            url: `${this.serviceUrl}/${layerInfo.id}`,
            type: 'featureLayer',
            visible: index < 3, // Make first 3 layers visible by default
            geometryType: layerInfo.geometryType,
            style: styles[layerInfo.geometryType] || styles['esriGeometryPolygon'],
            popupTemplate: {
                title: `${layerInfo.name}: {OBJECTID}`,
                content: this.generatePopupContent(layerInfo)
            }
        };
    }
    
    getColorForIndex(index) {
        const colors = [
            '#e74c3c', // Red
            '#3498db', // Blue  
            '#2ecc71', // Green
            '#f39c12', // Orange
            '#9b59b6', // Purple
            '#1abc9c', // Turquoise
            '#34495e', // Dark Gray
            '#e67e22'  // Dark Orange
        ];
        return colors[index % colors.length];
    }
    
    generatePopupContent(layerInfo) {
        // Generic popup content - will be improved when we discover actual fields
        return `
            <div class="popup-content">
                <p><strong>Layer:</strong> ${layerInfo.name}</p>
                <p><strong>Object ID:</strong> {OBJECTID}</p>
                <p><strong>Geometry:</strong> ${layerInfo.geometryType}</p>
            </div>
        `;
    }
    
    setupFeatureInteraction(feature, layer, layerConfig) {
        // Setup popup
        if (layerConfig.popupTemplate) {
            let popupContent = layerConfig.popupTemplate.content;
            
            // Replace property placeholders
            Object.keys(feature.properties).forEach(key => {
                const placeholder = `{${key}}`;
                const value = feature.properties[key] || 'N/A';
                popupContent = popupContent.replace(new RegExp(placeholder, 'g'), value);
            });
            
            layer.bindPopup(popupContent);
        }
        
        // Add click interaction
        layer.on('click', (e) => {
            console.log(`Clicked ${layerConfig.name}:`, feature.properties);
            L.DomEvent.stopPropagation(e);
        });
    }
    
    createManualLayers() {
        console.log('📋 Creating manual UW-Madison layer configuration...');
        console.log('ℹ️ This is a fallback when automatic service discovery fails');
        
        // Manual configuration for common UW-Madison/Wisconsin layers
        const manualLayers = [
            {
                id: 'uw_wisconsin_counties',
                name: 'Wisconsin Counties',
                url: 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Wisconsin_Counties/FeatureServer/0',
                type: 'featureLayer',
                visible: true,
                style: {
                    color: '#2c3e50',
                    weight: 2,
                    fillOpacity: 0.1,
                    opacity: 0.8
                },
                popupTemplate: {
                    title: 'County: {NAME}',
                    content: '<p><strong>County:</strong> {NAME}</p><p><strong>FIPS:</strong> {FIPS}</p>'
                }
            }
        ];
        
        console.log(`📦 Created ${manualLayers.length} manual layer configurations`);
        return manualLayers;
    }
    
    createSummary() {
        return `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                           🏛️ UW-MADISON GIS SERVICE SUMMARY                              ║
╠══════════════════════════════════════════════════════════════════════════════════════════╣
║ Service URL: ${this.serviceUrl || 'Not discovered'}                                      ║
║ Item ID: ${this.itemId}                                                                  ║
║ Layers Loaded: ${this.layers.length}                                                     ║
╠══════════════════════════════════════════════════════════════════════════════════════════╣
${this.layers.map((layer, i) => 
`║ ${(i + 1).toString().padStart(2)}: ${layer.name.padEnd(50)} ${layer.visible ? '👁️  Visible' : '🔒 Hidden'} ║`
).join('\n')}
╚══════════════════════════════════════════════════════════════════════════════════════════╝`;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UWMadisonServiceManager;
}