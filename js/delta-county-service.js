// Delta County GIS Layer Manager
// This module handles loading your Delta County ArcGIS service layers

class DeltaCountyServiceManager {
    constructor(map) {
        this.map = map;
        this.serviceUrl = 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer';
        this.itemId = '18855e2cb43a4c7aa6212f1692b35d7d';
        this.layers = [];
    }

    async loadService() {
        console.log('🏛️ Loading Delta County GIS Service...');
        console.log(`📍 Service URL: ${this.serviceUrl}`);
        
        try {
            const response = await fetch(`${this.serviceUrl}?f=json`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const serviceData = await response.json();
            
            if (serviceData.error) {
                throw new Error(`Service Error: ${serviceData.error.message}`);
            }
            
            if (serviceData.layers && serviceData.layers.length > 0) {
                console.log(`✅ Successfully connected to Delta County service`);
                console.log(`📊 Found ${serviceData.layers.length} layers:`);
                serviceData.layers.forEach(layer => {
                    console.log(`   • ${layer.name} (ID: ${layer.id}, Type: ${layer.geometryType})`);
                });
                
                this.processLayers(serviceData.layers);
                return true;
            } else {
                throw new Error('No layers found in service');
            }
        } catch (error) {
            console.error('❌ Failed to load Delta County service:', error.message);
            this.createFallbackLayer();
            return false;
        }
    }

    processLayers(layers) {
        console.log('🔧 Processing Delta County service layers...');

        layers.forEach(layerInfo => {
            // Skip Road_Centerlines_Delta_County layer
            if (layerInfo.name === 'Road_Centerlines_Delta_County') {
                console.log(`⏭️ Skipping layer: ${layerInfo.name}`);
                return;
            }
            
            const layerConfig = {
                id: `delta_county_${layerInfo.id}`,
                name: this.formatLayerName(layerInfo.name),
                url: `${this.serviceUrl}/${layerInfo.id}`,
                type: 'featureLayer',
                visible: this.shouldBeVisibleByDefault(layerInfo),
                style: this.getStyleForLayer(layerInfo),
                popupTemplate: this.createPopupTemplate(layerInfo),
                layerInfo: layerInfo,
                sourceService: 'Delta County GIS'
            };

            this.layers.push(layerConfig);
            console.log(`📋 Configured layer: ${layerConfig.name}`);
        });
    }

    formatLayerName(name) {
        // Clean up layer names for better display
        const nameMap = {
            'Site_Structure_Address_Points_Delta_County': '🏠 Address Points',
            'parcels': '📄 Parcels',
            'Townships': '🏞️ Townships'
        };
        
        return nameMap[name] || `📍 ${name.replace(/_/g, ' ')}`;
    }

    shouldBeVisibleByDefault(layerInfo) {
        // Show some layers by default
        const defaultVisible = ['Townships', 'parcels'];
        return defaultVisible.includes(layerInfo.name);
    }

    getStyleForLayer(layerInfo) {
        // Custom styles for each layer type
        const styles = {
            'Townships': {
                color: '#2E86AB',
                weight: 2,
                fillColor: '#A23B72',
                fillOpacity: 0.1,
                opacity: 0.8
            },
            'parcels': {
                color: '#F18F01',
                weight: 1,
                fillColor: '#C73E1D',
                fillOpacity: 0.2,
                opacity: 0.7
            },
            'Site_Structure_Address_Points_Delta_County': {
                // Simple blue dot for address points
                radius: 1,
                fillColor: '#3498db',
                color: '#2980b9',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }
        };
        
        return styles[layerInfo.name] || this.getDefaultStyle(layerInfo.geometryType);
    }

    getDefaultStyle(geometryType) {
        switch (geometryType) {
            case 'esriGeometryPoint':
                return {
                    radius: 6,
                    fillColor: '#ff7800',
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                };
            case 'esriGeometryPolyline':
                return {
                    color: '#3388ff',
                    weight: 3,
                    opacity: 0.8
                };
            case 'esriGeometryPolygon':
                return {
                    fillColor: '#fe57a1',
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.3
                };
            default:
                return {
                    color: '#3388ff',
                    weight: 2,
                    opacity: 0.8
                };
        }
    }

    createPopupTemplate(layerInfo) {
        // Create appropriate popup templates for each layer
        const templates = {
            'Townships': {
                title: '🏞️ Township: {NAME}',
                content: `
                    <div style="padding: 10px; font-family: Arial, sans-serif;">
                        <h4 style="margin-top: 0; color: #2E86AB;">Township Information</h4>
                        <p><strong>Name:</strong> {NAME}</p>
                        <p><strong>Type:</strong> {TYPE}</p>
                        <p><strong>County:</strong> Delta County, Michigan</p>
                    </div>
                `
            },
            'parcels': {
                title: '📄 Parcel: {PARCEL_ID}',
                content: `
                    <div style="padding: 10px; font-family: Arial, sans-serif;">
                        <h4 style="margin-top: 0; color: #F18F01;">Property Information</h4>
                        <p><strong>Parcel ID:</strong> {PARCEL_ID}</p>
                        <p><strong>Owner:</strong> {OWNER_NAME}</p>
                        <p><strong>Address:</strong> {SITE_ADDR}</p>
                        <p><strong>Township:</strong> {TOWNSHIP}</p>
                        <p><strong>Acreage:</strong> {ACRES}</p>
                    </div>
                `
            },
            'Site_Structure_Address_Points_Delta_County': {
                title: '🏠 Address: {FULL_ADDRESS}',
                content: `
                    <div style="padding: 10px; font-family: Arial, sans-serif;">
                        <h4 style="margin-top: 0; color: #3F612D;">Address Information</h4>
                        <p><strong>Address:</strong> {FULL_ADDRESS}</p>
                        <p><strong>City:</strong> {CITY}</p>
                        <p><strong>State:</strong> {STATE}</p>
                        <p><strong>ZIP:</strong> {ZIP}</p>
                    </div>
                `
            }
        };
        
        return templates[layerInfo.name] || {
            title: layerInfo.name,
            content: 'Click for feature details...'
        };
    }

    createFallbackLayer() {
        console.log('🔄 Creating fallback layer...');
        
        const fallbackLayer = {
            id: 'delta_county_fallback',
            name: '⚠️ Delta County Service (Connection Failed)',
            url: 'placeholder',
            type: 'featureLayer',
            visible: false,
            style: {
                color: '#dc3545',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3
            },
            popupTemplate: {
                title: 'Delta County GIS Service',
                content: `
                    <div style="padding: 15px; font-family: Arial, sans-serif;">
                        <h4 style="color: #dc3545; margin-top: 0;">⚠️ Service Connection Failed</h4>
                        <p><strong>Service URL:</strong> ${this.serviceUrl}</p>
                        <p><strong>Status:</strong> Unable to connect</p>
                        
                        <hr style="margin: 15px 0;">
                        
                        <h5>🔧 Troubleshooting:</h5>
                        <ul style="padding-left: 20px; font-size: 14px;">
                            <li>Check your internet connection</li>
                            <li>Verify service URL is correct</li>
                            <li>Ensure service is publicly accessible</li>
                        </ul>
                    </div>
                `
            },
            isPlaceholder: true
        };

        this.layers = [fallbackLayer];
    }

    addLayersToMap() {
        console.log(`Adding ${this.layers.length} Delta County layers to map`);

        // Check if Esri Leaflet is available
        if (typeof L === 'undefined' || typeof L.esri === 'undefined') {
            console.error('❌ Esri Leaflet library is not available!');
            console.log('🔧 Please ensure Esri Leaflet is properly loaded before initializing layers');
            
            // Create error notification layers
            this.layers.forEach(layerConfig => {
                layerConfig.leafletLayer = L.layerGroup();
                layerConfig.error = 'Esri Leaflet library not loaded';
            });
            return;
        }

        this.layers.forEach(layerConfig => {
            try {
                // Skip placeholder layers that don't have real URLs
                if (layerConfig.isPlaceholder || layerConfig.url === 'placeholder') {
                    console.log(`Skipping placeholder layer: ${layerConfig.name}`);
                    layerConfig.leafletLayer = L.layerGroup();
                    return;
                }

                console.log(`🔧 Creating Esri feature layer for: ${layerConfig.name}`);
                console.log(`   URL: ${layerConfig.url}`);

                const layer = L.esri.featureLayer({
                    url: layerConfig.url,
                    style: layerConfig.style,
                    pointToLayer: (feature, latlng) => {
                        // Create simple blue dots for address points
                        if (layerConfig.name.includes('Address Points') && layerConfig.style && layerConfig.style.radius) {
                            return L.circleMarker(latlng, layerConfig.style);
                        }
                        return L.marker(latlng);
                    }
                });

                // Add error handling for layer loading
                layer.on('error', function(error) {
                    console.error(`❌ Failed to load layer ${layerConfig.name}:`, error);
                });

                layer.on('load', function() {
                    console.log(`✅ Successfully loaded layer: ${layerConfig.name}`);
                });

                // Add popup functionality
                layer.bindPopup((layer) => {
                    return L.Util.template(layerConfig.popupTemplate.content, layer.feature.properties);
                });

                // Store layer reference
                layerConfig.leafletLayer = layer;

                // Add to map if visible
                if (layerConfig.visible) {
                    layer.addTo(this.map);
                    console.log(`🗺️ Added visible layer to map: ${layerConfig.name}`);
                }

                console.log(`✓ Configured layer: ${layerConfig.name}`);
            } catch (error) {
                console.error(`✗ Failed to add layer ${layerConfig.name}:`, error);
                
                // Create a fallback layer group
                layerConfig.leafletLayer = L.layerGroup();
                layerConfig.error = error.message;
            }
        });
    }

    getLayers() {
        return this.layers;
    }

    toggleLayer(layerId, visible) {
        const layerConfig = this.layers.find(l => l.id === layerId);
        if (layerConfig && layerConfig.leafletLayer) {
            if (visible) {
                layerConfig.leafletLayer.addTo(this.map);
            } else {
                this.map.removeLayer(layerConfig.leafletLayer);
            }
            layerConfig.visible = visible;
        }
    }

    createSummary() {
        const totalLayers = this.layers.length;
        const activeLayers = this.layers.filter(l => !l.isPlaceholder).length;
        const visibleLayers = this.layers.filter(l => l.visible).length;
        
        let summary = `\n📊 Delta County Service Integration Summary:\n`;
        summary += `   • Total layers: ${totalLayers}\n`;
        summary += `   • Active layers: ${activeLayers}\n`;
        summary += `   • Visible layers: ${visibleLayers}\n`;
        summary += `   • Service URL: ${this.serviceUrl}\n`;
        
        if (activeLayers > 0) {
            summary += `   ✅ Integration successful!\n`;
            summary += `   🗺️ Layers ready for use\n`;
        } else {
            summary += `   ⚠️  Service connection failed\n`;
            summary += `   🔧 Check service availability\n`;
        }
        
        return summary;
    }

    async initialize() {
        console.log('🏛️ Initializing Delta County Service Manager...');
        console.log(`📍 Service: Delta County GIS`);
        console.log(`🔗 URL: ${this.serviceUrl}`);
        
        const success = await this.loadService();
        this.addLayersToMap();
        
        // Create summary
        const summary = this.createSummary();
        console.log(summary);
        
        return this.layers;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeltaCountyServiceManager;
}