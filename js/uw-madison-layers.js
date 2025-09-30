// UW-Madison Layer Discovery and Integration
// This module handles adding layers from UW-Madison ArcGIS services

class UWMadisonLayerManager {
    constructor(map) {
        this.map = map;
        this.itemIds = [
            '16a040a49b1b46bba29922a712e32ebb', // Original item
            '18855e2cb43a4c7aa6212f1692b35d7d'  // New layer from map viewer
        ];
        this.baseUrl = 'https://uw-mad.maps.arcgis.com';
        this.serviceUrls = [];
        this.layers = [];
    }

    async discoverServiceUrls() {
        console.log('🔍 Testing multiple UW-Madison layer IDs...');
        
        // First, check if manual configurations are available
        await this.checkManualConfigurations();
        
        // Then try automatic discovery
        for (const itemId of this.itemIds) {
            console.log(`\n📍 Testing Item ID: ${itemId}`);
            await this.testServicePatternsForItem(itemId);
        }

        if (this.serviceUrls.length === 0) {
            console.warn('⚠️ No UW-Madison services found with standard URL patterns');
            this.tryFallbackApproach();
        }
    }

    async checkManualConfigurations() {
        if (typeof UWMadisonManualConfig !== 'undefined') {
            console.log('🔧 Checking manual configurations...');
            const manualConfigs = UWMadisonManualConfig.createLayerConfigs();
            
            if (manualConfigs.length > 0) {
                console.log(`Found ${manualConfigs.length} manually configured services`);
                
                for (const config of manualConfigs) {
                    try {
                        console.log(`Testing manual service: ${config.serviceUrl}`);
                        const url = config.authToken ? 
                            `${config.serviceUrl}?f=json&token=${config.authToken}` : 
                            `${config.serviceUrl}?f=json`;
                            
                        const response = await fetch(url);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.layers && data.layers.length > 0) {
                                console.log(`✅ Manual service working: ${config.name}`);
                                this.serviceUrls.push(config.serviceUrl);
                                await this.processService(config.serviceUrl, data, config.itemId);
                            }
                        }
                    } catch (error) {
                        console.warn(`❌ Manual service failed: ${config.name} - ${error.message}`);
                    }
                }
            } else {
                console.log('No enabled manual configurations found');
            }
        }
    }

    async testServicePatternsForItem(itemId) {
        // Extended UW-Madison ArcGIS service URL patterns for each item
        const possibleUrls = [
            // Standard ArcGIS Online patterns with different org IDs
            `https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/service_${itemId}/FeatureServer`,
            `https://services.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/service_${itemId}/FeatureServer`,
            `https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/${itemId}/FeatureServer`,
            `https://services.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/${itemId}/FeatureServer`,
            
            // Try different organization IDs that might be associated with UW-Madison
            `https://services1.arcgis.com/bDAhvQYMwHYFLNLX/arcgis/rest/services/${itemId}/FeatureServer`,
            `https://services.arcgis.com/bDAhvQYMwHYFLNLX/arcgis/rest/services/${itemId}/FeatureServer`,
            `https://services1.arcgis.com/bDAhvQYMwHYFLNLX/arcgis/rest/services/service_${itemId}/FeatureServer`,
            `https://services.arcgis.com/bDAhvQYMwHYFLNLX/arcgis/rest/services/service_${itemId}/FeatureServer`,
            
            // Try alternative organization patterns
            `https://services1.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/${itemId}/FeatureServer`,
            `https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/${itemId}/FeatureServer`,
            
            // UW-Madison specific patterns
            `https://gis.wisc.edu/arcgis/rest/services/service_${itemId}/FeatureServer`,
            `https://gis.wisc.edu/arcgis/rest/services/${itemId}/FeatureServer`,
            `https://uwmadison.maps.arcgis.com/arcgis/rest/services/service_${itemId}/FeatureServer`,
            `https://uwmadison.maps.arcgis.com/arcgis/rest/services/${itemId}/FeatureServer`,
            
            // Alternative UW patterns
            `https://maps.wisc.edu/arcgis/rest/services/service_${itemId}/FeatureServer`,
            `https://maps.wisc.edu/arcgis/rest/services/${itemId}/FeatureServer`,
            `https://geodata.wisc.edu/arcgis/rest/services/service_${itemId}/FeatureServer`,
            `https://geodata.wisc.edu/arcgis/rest/services/${itemId}/FeatureServer`,
            
            // Try as hosted feature layer with different patterns
            `https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Hosted_${itemId}/FeatureServer`,
            `https://services.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Hosted_${itemId}/FeatureServer`,
            
            // Try public/world services pattern
            `https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/${itemId}/FeatureServer`,
            `https://services1.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/${itemId}/FeatureServer`
        ];

        console.log('Attempting to discover UW-Madison service URLs...');

        for (const url of possibleUrls) {
            try {
                console.log(`Testing service URL: ${url}`);
                const response = await fetch(`${url}?f=json`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Check for authentication errors
                    if (data.error) {
                        if (data.error.code === 403 || data.error.message.includes('permissions')) {
                            console.warn(`Service requires authentication: ${url}`);
                            console.warn(`Error: ${data.error.message}`);
                            continue;
                        } else if (data.error.code === 400) {
                            console.log(`Invalid service URL: ${url}`);
                            continue;
                        }
                    }
                    
                    // Check if this is a valid feature service
                    if (data.layers && data.layers.length > 0) {
                        console.log(`✓ Found valid service at: ${url}`);
                        console.log(`  Service name: ${data.serviceDescription || 'No description'}`);
                        console.log(`  Number of layers: ${data.layers.length}`);
                        console.log(`  Item ID: ${itemId}`);
                        this.serviceUrls.push(url);
                        await this.processService(url, data, itemId);
                    } else if (data.serviceDescription) {
                        console.log(`Found service but no layers: ${url}`);
                    }
                } else {
                    console.log(`HTTP ${response.status}: ${url}`);
                }
            } catch (error) {
                console.log(`Network error for ${url}: ${error.message}`);
            }
        }

        if (this.serviceUrls.length === 0) {
            console.warn('No UW-Madison services found with standard URL patterns');
            this.tryFallbackApproach();
        }
    }

    async processService(serviceUrl, serviceData, itemId) {
        console.log(`Processing service: ${serviceUrl}`);
        console.log('Available layers:', serviceData.layers);
        console.log(`Source Item ID: ${itemId}`);

        // Create layer configurations for each layer in the service
        serviceData.layers.forEach(layerInfo => {
            const layerConfig = {
                id: `uwmadison_${itemId}_${layerInfo.id}`,
                name: `UW-Madison: ${layerInfo.name} (${itemId.substring(0,8)}...)`,
                url: `${serviceUrl}/${layerInfo.id}`,
                type: 'featureLayer',
                visible: false, // Start hidden, user can enable
                style: this.getDefaultStyle(layerInfo.geometryType),
                popupTemplate: {
                    title: `{${this.guessDisplayField(layerInfo)}}`,
                    content: `
                        <div style="padding: 10px;">
                            <h4>🏛️ UW-Madison Data</h4>
                            <p><strong>Layer:</strong> ${layerInfo.name}</p>
                            <p><strong>Source:</strong> ${itemId}</p>
                            <p><strong>Geometry:</strong> ${layerInfo.geometryType || 'Unknown'}</p>
                            <hr>
                            <p>Click for feature details...</p>
                        </div>
                    `
                },
                layerInfo: layerInfo,
                sourceItemId: itemId
            };

            this.layers.push(layerConfig);
        });
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

    guessDisplayField(layerInfo) {
        // Try to guess the best field for display
        const commonNameFields = ['NAME', 'TITLE', 'LABEL', 'ID', 'OBJECTID'];
        
        if (layerInfo.displayField) {
            return layerInfo.displayField;
        }

        // Return first common field name that might exist
        return commonNameFields[0];
    }

    tryFallbackApproach() {
        console.log('🔄 Trying fallback approach - adding manual layer configurations');
        
        // Print the access guide
        if (typeof UWMadisonServiceGuide !== 'undefined') {
            console.log(UWMadisonServiceGuide.getInstructions());
        }
        
        // Add placeholder configurations that users can modify
        const accessNotice = UWMadisonServiceGuide ? UWMadisonServiceGuide.createAccessNotice() : {
            title: 'UW-Madison Service Access Required',
            content: '<p>Contact UW-Madison for service access.</p>'
        };
        
        const fallbackLayers = [];
        
        // Create placeholder for each item ID
        this.itemIds.forEach((itemId, index) => {
            const layerName = index === 0 ? 
                '🏛️ UW-Madison Service 1 (Access Required)' : 
                '🏛️ UW-Madison Service 2 (Access Required)';
                
            fallbackLayers.push({
                id: `uwmadison_placeholder_${itemId}`,
                name: layerName,
                url: 'placeholder', // Will not load
                type: 'featureLayer',
                visible: false,
                style: {
                    color: '#c5050c', // UW-Madison red
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.3
                },
                popupTemplate: {
                    title: 'UW-Madison Data Service',
                    content: `
                        <div style="padding: 15px; font-family: Arial, sans-serif;">
                            <h4 style="color: #c5050c; margin-top: 0;">🏛️ UW-Madison GIS Service</h4>
                            <p><strong>Item ID:</strong> ${itemId}</p>
                            <p><strong>Status:</strong> 🔒 Access Required</p>
                            
                            <hr style="margin: 15px 0;">
                            
                            <h5>📞 Contact Information:</h5>
                            <p><strong>Email:</strong> gis@geography.wisc.edu</p>
                            <p><strong>Department:</strong> UW-Madison Geography</p>
                            
                            <h5>📋 Next Steps:</h5>
                            <ol style="padding-left: 20px; font-size: 14px;">
                                <li>Contact UW-Madison GIS team</li>
                                <li>Request service endpoint URL</li>
                                <li>Update configuration file</li>
                            </ol>
                        </div>
                    `
                },
                isPlaceholder: true,
                sourceItemId: itemId
            });
        });

        this.layers = fallbackLayers;
    }

    addLayersToMap() {
        console.log(`Adding ${this.layers.length} UW-Madison layers to map`);

        this.layers.forEach(layerConfig => {
            try {
                // Skip placeholder layers that don't have real URLs
                if (layerConfig.isPlaceholder || layerConfig.url === 'placeholder') {
                    console.log(`Skipping placeholder layer: ${layerConfig.name}`);
                    // Create a dummy layer for control panel
                    layerConfig.leafletLayer = L.layerGroup();
                    return;
                }

                const layer = L.esri.featureLayer({
                    url: layerConfig.url,
                    style: layerConfig.style
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
                }

                console.log(`✓ Added layer: ${layerConfig.name}`);
            } catch (error) {
                console.error(`✗ Failed to add layer ${layerConfig.name}:`, error);
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

    async initialize() {
        console.log('🏛️ Initializing UW-Madison Layer Manager...');
        console.log(`📍 Target Item IDs:`);
        this.itemIds.forEach((itemId, index) => {
            console.log(`   ${index + 1}. ${itemId}`);
        });
        console.log(`🔗 Base URL: ${this.baseUrl}`);
        
        await this.discoverServiceUrls();
        this.addLayersToMap();
        
        // Create summary
        const summary = this.createSummary();
        console.log(summary);
        
        return this.layers;
    }

    createSummary() {
        const totalLayers = this.layers.length;
        const activeLayers = this.layers.filter(l => !l.isPlaceholder).length;
        const placeholderLayers = this.layers.filter(l => l.isPlaceholder).length;
        
        let summary = `\n📊 UW-Madison Layer Integration Summary:\n`;
        summary += `   • Total configurations: ${totalLayers}\n`;
        summary += `   • Active layers: ${activeLayers}\n`;
        summary += `   • Placeholder layers: ${placeholderLayers}\n`;
        
        if (this.serviceUrls.length > 0) {
            summary += `   • Services found: ${this.serviceUrls.length}\n`;
            summary += `   ✅ Integration successful!\n`;
        } else {
            summary += `   ⚠️  No accessible services found\n`;
            summary += `   📞 Contact UW-Madison for service access\n`;
        }
        
        return summary;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UWMadisonLayerManager;
}