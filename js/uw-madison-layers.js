// Delta County Layer Discovery and Integration
// This module handles adding layers from your Delta County ArcGIS service

class DeltaCountyLayerManager {
    constructor(map) {
        this.map = map;
        this.serviceUrl = 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer';
        this.itemId = '18855e2cb43a4c7aa6212f1692b35d7d';
        this.layers = [];
    }

    async loadDeltaCountyService() {
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
                
                await this.processService(serviceData);
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

    async processService(serviceData) {
        console.log('🔧 Processing Delta County service layers...');

        // Create layer configurations for each layer in the service
        serviceData.layers.forEach(layerInfo => {
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
            'Road_Centerlines_Delta_County': '🛣️ Roads',
            'parcels': '📐 Parcels',
            'Townships': '🏘️ Townships'
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
                radius: 5,
                fillColor: '#3F612D',
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            },
            'Road_Centerlines_Delta_County': {
                color: '#231F20',
                weight: 2,
                opacity: 0.8
            }
        };
        
        return styles[layerInfo.name] || this.getDefaultStyle(layerInfo.geometryType);
    }

    createPopupTemplate(layerInfo) {
        // Create appropriate popup templates for each layer
        const templates = {
            'Townships': {
                title: '🏘️ {NAME}',
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
                title: '📐 Parcel {PARCEL_ID}',
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
                title: '🏠 {FULL_ADDRESS}',
                content: `
                    <div style="padding: 10px; font-family: Arial, sans-serif;">
                        <h4 style="margin-top: 0; color: #3F612D;">Address Information</h4>
                        <p><strong>Address:</strong> {FULL_ADDRESS}</p>
                        <p><strong>City:</strong> {CITY}</p>
                        <p><strong>State:</strong> {STATE}</p>
                        <p><strong>ZIP:</strong> {ZIP}</p>
                    </div>
                `
            },
            'Road_Centerlines_Delta_County': {
                title: '🛣️ {ROAD_NAME}',
                content: `
                    <div style="padding: 10px; font-family: Arial, sans-serif;">
                        <h4 style="margin-top: 0; color: #231F20;">Road Information</h4>
                        <p><strong>Road Name:</strong> {ROAD_NAME}</p>
                        <p><strong>Type:</strong> {ROAD_TYPE}</p>
                        <p><strong>Surface:</strong> {SURFACE}</p>
                    </div>
                `
            }
        };
        
        return templates[layerInfo.name] || {
            title: layerInfo.name,
            content: 'Click for feature details...'
        };
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
        console.log('🏛️ Initializing Delta County Layer Manager...');
        console.log(`📍 Service: Delta County GIS`);
        console.log(`🔗 URL: ${this.serviceUrl}`);
        
        const success = await this.loadDeltaCountyService();
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