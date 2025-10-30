// Delta County GIS Application - Main JavaScript
// Enhanced version of the parcel viewer with modern features

class DeltaCountyApp {
    constructor() {
        this.map = null;
        this.layers = {};
        this.selectedFeature = null;
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.infoPanel = document.getElementById('info-panel');
        this.layersLoaded = 0;
        this.totalLayers = 0; // Will be set when services load
        this.deltaCountyServiceManager = null;
        this.uwMadisonServiceManager = null;
        
        // Service initialization flags to prevent duplicates
        this.deltaCountyServiceInitialized = false;
        this.uwMadisonServiceInitialized = false;
        
        this.init();
    }
    
    init() {
        this.createMap();
        this.setupEventListeners();
        this.loadLayers();
        this.initializeDeltaCountyService();
        this.initializeUWMadisonService();
        this.setupControls();
    }
    
    createMap() {
        // Initialize the map
        this.map = L.map('map', {
            center: DeltaCountyConfig.map.center,
            zoom: DeltaCountyConfig.map.zoom,
            minZoom: DeltaCountyConfig.map.minZoom,
            maxZoom: DeltaCountyConfig.map.maxZoom,
            zoomControl: false
        });
        
        // Add zoom control to top-left
        L.control.zoom({ position: 'topleft' }).addTo(this.map);
        
        // Add default base layer
        this.addBaseLayers();
        
        console.log('Map initialized for Delta County GIS App');
        
        // Make app accessible globally for query functions
        window.app = this;
    }
    
    addBaseLayers() {
        const baseMaps = {};
        
        // Create base layer objects
        Object.keys(DeltaCountyConfig.baseMaps).forEach(name => {
            const config = DeltaCountyConfig.baseMaps[name];
            
            if (config.layer) {
                // Using leaflet-providers
                baseMaps[name] = L.tileLayer.provider(config.layer);
            } else if (config.url) {
                // Custom tile layer
                baseMaps[name] = L.tileLayer(config.url, {
                    attribution: config.attribution
                });
            }
        });
        
        // Add default base layer
        if (baseMaps['Street Map']) {
            baseMaps['Street Map'].addTo(this.map);
        } else if (baseMaps['Dark Theme']) {
            baseMaps['Dark Theme'].addTo(this.map);
        }
        
        // Store for layer control
        this.baseMaps = baseMaps;
    }
    
    loadLayers() {
        // Skip loading config layers since we're using Delta County Service Manager
        console.log('Config layers skipped - using Delta County Service Manager instead');
        
        // If there are any legacy layers in config, load them
        if (DeltaCountyConfig.layers && DeltaCountyConfig.layers.length > 0) {
            this.showLoading();
            this.totalLayers = DeltaCountyConfig.layers.length;
            
            DeltaCountyConfig.layers.forEach(layerConfig => {
                this.addLayer(layerConfig);
            });
        } else {
            // No config layers to load - hide loading immediately
            this.hideLoading();
        }
    }
    
    addLayer(layerConfig) {
        try {
            // Skip layers that require Esri Leaflet if it's not available
            if (typeof L.esri === 'undefined') {
                console.log(`Skipping ${layerConfig.name} - Esri Leaflet not available`);
                this.onLayerLoaded(); // Count as loaded
                return;
            }
            
            const layerOptions = {
                url: layerConfig.url,
                style: layerConfig.style
            };
            
            // Add feature interaction if enabled
            if (DeltaCountyConfig.interaction.enablePopups || DeltaCountyConfig.interaction.enableSelection) {
                layerOptions.onEachFeature = (feature, layer) => {
                    this.setupFeatureInteraction(feature, layer, layerConfig);
                };
            }
            
            const layer = L.esri.featureLayer(layerOptions);
            
            // Setup layer event handlers
            this.setupLayerEvents(layer, layerConfig);
            
            // Add to map if visible by default
            if (layerConfig.visible) {
                layer.addTo(this.map);
                console.log(`✅ Layer added to map: ${layerConfig.name} (visible by default)`);
            } else {
                console.log(`⏸️ Layer NOT added to map: ${layerConfig.name} (not visible by default)`);
            }
            
            // Store layer reference
            this.layers[layerConfig.id] = {
                layer: layer,
                config: layerConfig
            };
            
        } catch (error) {
            console.error(`Failed to create layer ${layerConfig.name}:`, error);
            this.onLayerLoaded(); // Still count as "loaded" even if failed
        }
    }
    
    setupLayerEvents(layer, layerConfig) {
        layer.on('loading', () => {
            console.log(`Loading ${layerConfig.name}...`);
        });
        
        layer.on('load', () => {
            console.log(`${layerConfig.name} loaded successfully`);
            this.onLayerLoaded();
        });
        
        layer.on('error', (error) => {
            console.error(`Error loading ${layerConfig.name}:`, error);
            this.showLayerError(layerConfig.name, error);
            this.onLayerLoaded();
        });
    }
    
    setupFeatureInteraction(feature, layer, layerConfig) {
        // Setup popup if enabled
        if (DeltaCountyConfig.interaction.enablePopups && layerConfig.popupTemplate) {
            const popupContent = this.formatPopupContent(feature.properties, layerConfig.popupTemplate);
            layer.bindPopup(popupContent);
            console.log(`🔗 Popup bound for feature in ${layerConfig.name}`);
        }
        
        // Setup click interaction for selection
        if (DeltaCountyConfig.interaction.enableSelection) {
            layer.on('click', (e) => {
                console.log(`🖱️ Feature clicked in ${layerConfig.name}:`, feature.properties);
                this.selectFeature(e.target, layerConfig);
                this.showFeatureInfo(feature.properties, layerConfig);
                L.DomEvent.stopPropagation(e);
            });
        }
        
        // Setup hover effects
        if (DeltaCountyConfig.interaction.highlightOnHover) {
            layer.on('mouseover', (e) => {
                const layer = e.target;
                layer.setStyle({
                    weight: (layerConfig.style.weight || 1) + 1,
                    opacity: 1,
                    fillOpacity: (layerConfig.style.fillOpacity || 0.2) + 0.1
                });
            });
            
            layer.on('mouseout', (e) => {
                if (this.selectedFeature !== e.target) {
                    this.resetLayerStyle(e.target, layerConfig);
                }
            });
        }
    }
    
    selectFeature(layer, layerConfig) {
        // Reset previous selection
        if (this.selectedFeature) {
            this.resetLayerStyle(this.selectedFeature, this.selectedFeature._layerConfig);
        }
        
        // Apply selection style
        layer.setStyle(DeltaCountyConfig.interaction.selectedStyle);
        this.selectedFeature = layer;
        this.selectedFeature._layerConfig = layerConfig;
    }
    
    resetLayerStyle(layer, layerConfig) {
        layer.setStyle(layerConfig.style);
    }
    
    formatPopupContent(properties, template) {
        let content = template.content;
        
        // Replace property placeholders
        Object.keys(properties).forEach(key => {
            const placeholder = `{${key}}`;
            const value = properties[key] || 'N/A';
            content = content.replace(new RegExp(placeholder, 'g'), value);
        });
        
        return content;
    }
    
    showFeatureInfo(properties, layerConfig) {
        if (!DeltaCountyConfig.ui.showInfoPanel) return;
        
        const content = this.infoPanel.querySelector('.panel-content');
        
        let html = '<div class="feature-details">';
        html += `<h4>${layerConfig.name} Details</h4>`;
        Object.keys(properties).forEach(key => {
            if (properties[key] !== null && properties[key] !== '') {
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                html += `<p><strong>${displayKey}:</strong> ${properties[key]}</p>`;
            }
        });
        html += '</div>';
        
        content.innerHTML = html;
        this.infoPanel.classList.add('active');
    }
    
    async initializeDeltaCountyService() {
        // Prevent multiple initializations
        if (this.deltaCountyServiceInitialized) {
            console.log('🔄 Delta County service already initialized, skipping...');
            return;
        }
        
        console.log('Initializing Delta County Service...');
        this.showLoading();
        
        // Check if Esri Leaflet is available
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library is not loaded!');
            this.hideLoading();
            return;
        }
        
        if (typeof L.esri === 'undefined') {
            console.error('❌ Esri Leaflet library is not loaded!');
            console.log('🔧 Waiting 2 seconds and retrying...');
            
            // Wait a bit and try again in case the library is still loading
            setTimeout(() => {
                this.retryDeltaCountyService();
            }, 2000);
            return;
        }
        
        try {
            this.deltaCountyServiceManager = new DeltaCountyServiceManager(this.map);
            const deltaLayers = await this.deltaCountyServiceManager.initialize();
            
            // Add a global function to manually try loading roads
            window.forceLoadRoads = () => {
                console.log('🛣️ FORCING ROAD LAYER LOAD...');
                
                if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
                    const roadLayer = this.deltaCountyServiceManager.layers.find(layer => 
                        layer.name.toLowerCase().includes('road') || layer.name.toLowerCase().includes('centerline'));
                    
                    if (roadLayer) {
                        console.log(`Found road layer: ${roadLayer.name}`);
                        
                        if (!roadLayer.leafletLayer || !this.map.hasLayer(roadLayer.leafletLayer)) {
                            console.log('Creating/adding road layer manually...');
                            
                            try {
                                // Create new Esri feature layer
                                const layer = L.esri.featureLayer({
                                    url: roadLayer.url,
                                    style: roadLayer.style
                                });
                                
                                layer.on('load', () => {
                                    console.log('✅ Road layer loaded successfully!');
                                });
                                
                                layer.on('error', (error) => {
                                    console.error('❌ Road layer failed to load:', error);
                                });
                                
                                roadLayer.leafletLayer = layer;
                                layer.addTo(this.map);
                                
                                // Add to layer control if not already there
                                if (!this.allowedLayers.roads) {
                                    this.addLayerToCustomControl(layer, roadLayer.name, 'roads');
                                }
                                
                                console.log('Road layer manually added to map');
                            } catch (error) {
                                console.error('Error creating road layer:', error);
                            }
                        } else {
                            console.log('Road layer already exists and is on map');
                        }
                    } else {
                        console.error('No road layer found in service');
                    }
                } else {
                    console.error('No Delta County service available');
                }
            };

            console.log(`Successfully integrated ${deltaLayers.length} Delta County layers`);
            console.log('📊 Layer Summary:');
            deltaLayers.forEach(layer => {
                console.log(`   • ${layer.name}: visible=${layer.visible}, hasLeafletLayer=${!!layer.leafletLayer}`);
            });
            
            // Update layer control to include Delta County layers
            if (deltaLayers.length > 0) {
                this.updateLayerControlWithDeltaLayers(deltaLayers);
                // Update legend to include new layers
                this.updateLegend();
            }
            
            // Mark as initialized
            this.deltaCountyServiceInitialized = true;
            
            // Now that layers are loaded, add the township selector if it should be shown
            if (DeltaCountyConfig.ui.showTownshipSelector && !this.townshipControl) {
                console.log('🏞️ Adding township selector after service initialization');
                this.addTownshipSelector();
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize Delta County Service:', error);
            this.hideLoading();
        }
    }
    
    async initializeUWMadisonService() {
        // Prevent multiple initializations
        if (this.uwMadisonServiceInitialized) {
            console.log('🔄 UW-Madison service already initialized, skipping...');
            return;
        }
        
        console.log('🏛️ Initializing UW-Madison Service...');
        
        // Check if Esri Leaflet is available
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library is not loaded!');
            return;
        }
        
        if (typeof L.esri === 'undefined') {
            console.error('❌ Esri Leaflet library is not loaded!');
            console.log('🔧 Will retry UW-Madison service after Esri loads...');
            
            // Wait for Esri to load and try again
            setTimeout(() => {
                this.retryUWMadisonService();
            }, 3000);
            return;
        }
        
        try {
            // Check if UWMadisonServiceManager is available
            if (typeof UWMadisonServiceManager === 'undefined') {
                console.error('❌ UWMadisonServiceManager not loaded!');
                return;
            }
            
            this.uwMadisonServiceManager = new UWMadisonServiceManager(this.map);
            const uwLayers = await this.uwMadisonServiceManager.initialize();
            
            console.log(`✅ Successfully integrated ${uwLayers.length} UW-Madison layers`);
            
            // Update layer control to include UW-Madison layers
            if (uwLayers.length > 0) {
                this.updateLayerControlWithUWLayers(uwLayers);
                // Update legend to include new layers
                this.updateLegend();
            }
            
            // Mark as initialized
            this.uwMadisonServiceInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize UW-Madison Service:', error);
        }
    }
    
    async retryUWMadisonService() {
        console.log('🔄 Retrying UW-Madison Service initialization...');
        
        if (this.uwMadisonServiceInitialized) {
            console.log('✅ UW-Madison service already initialized, skipping retry');
            return;
        }
        
        if (typeof L.esri !== 'undefined') {
            console.log('✅ Esri Leaflet now available, proceeding with UW-Madison initialization');
            this.initializeUWMadisonService();
        } else {
            console.error('❌ Esri Leaflet still not available for UW-Madison service');
        }
    }
    
    updateLayerControlWithUWLayers(uwLayers) {
        // Add only the 4 allowed layers to the custom control
        setTimeout(() => {
            if (this.layerControl) {
                uwLayers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer) {
                        const layerType = this.isAllowedLayer(layerConfig.name);
                        
                        if (layerType) {
                            this.addLayerToCustomControl(layerConfig.leafletLayer, layerConfig.name, layerType);
                        } else {
                            console.log(`⏭️ Skipping non-allowed UW layer: ${layerConfig.name}`);
                        }
                    }
                });
                console.log(`📋 Processed ${uwLayers.length} UW-Madison layers for custom control`);
            }
        }, 1500); // Delay to ensure layer control is ready
    }

    async retryDeltaCountyService() {
        console.log('🔄 Retrying Delta County Service initialization...');
        
        if (this.deltaCountyServiceInitialized) {
            console.log('✅ Delta County service already initialized, skipping retry');
            return;
        }
        
        if (typeof L.esri !== 'undefined') {
            console.log('✅ Esri Leaflet now available, proceeding with initialization');
            this.initializeDeltaCountyService();
        } else {
            console.error('❌ Esri Leaflet still not available after retry');
            console.log('🔄 Switching to fallback GeoJSON service...');
            
            // Try fallback service
            if (typeof DeltaCountyFallbackService !== 'undefined') {
                try {
                    this.deltaCountyServiceManager = new DeltaCountyFallbackService(this.map);
                    const deltaLayers = await this.deltaCountyServiceManager.initialize();
                    
                    console.log(`✅ Fallback service loaded ${deltaLayers.length} layers`);
                    
                    if (deltaLayers.length > 0) {
                        this.updateLayerControlWithDeltaLayers(deltaLayers);
                    }
                } catch (error) {
                    console.error('❌ Fallback service also failed:', error);
                }
            } else {
                console.log('📋 Troubleshooting steps:');
                console.log('   1. Check internet connection');
                console.log('   2. Verify CDN availability');
                console.log('   3. Check browser console for network errors');
            }
        }
    }
    
    updateLayerControlWithDeltaLayers(deltaLayers) {
        console.log(`🎛️ Updating layer control with ${deltaLayers.length} Delta County layers`);
        
        // Add only the 4 allowed layers to the custom control
        setTimeout(() => {
            if (this.layerControl) {
                deltaLayers.forEach(layerConfig => {
                    console.log(`🔍 Processing layer for control: ${layerConfig.name}`);
                    
                    if (layerConfig.leafletLayer) {
                        const layerType = this.isAllowedLayer(layerConfig.name);
                        
                        if (layerType) {
                            console.log(`✅ Adding to layer control: ${layerConfig.name} (type: ${layerType})`);
                            this.addLayerToCustomControl(layerConfig.leafletLayer, layerConfig.name, layerType);
                            
                            // Special logging for roads
                            if (layerType === 'roads') {
                                console.log(`🛣️ ROAD LAYER DEBUG:`, {
                                    name: layerConfig.name,
                                    visible: layerConfig.visible,
                                    onMap: this.map.hasLayer(layerConfig.leafletLayer),
                                    style: layerConfig.style
                                });
                            }
                        } else {
                            console.log(`⏭️ Skipping non-allowed layer: ${layerConfig.name}`);
                        }
                    } else {
                        console.error(`❌ No leaflet layer for: ${layerConfig.name}`);
                    }
                });
            }
        }, 1000); // Small delay to ensure layer control is ready
    }
    
    setupControls() {
        // Setup layer control
        if (DeltaCountyConfig.ui.showLayerControl) {
            this.addLayerControl();
        }
        
        // Setup legend
        if (DeltaCountyConfig.ui.showLegend) {
            this.addLegend();
        }
        
        // Debug: Add a global function to check road layer status
        window.debugRoadLayers = () => {
            console.log('🛣️ ROAD LAYER DEBUG REPORT:');
            
            // Check Delta County service
            if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
                console.log('📋 Delta County Service Layers:');
                this.deltaCountyServiceManager.layers.forEach(layer => {
                    if (layer.name.toLowerCase().includes('road') || layer.name.toLowerCase().includes('centerline')) {
                        console.log(`   🛣️ Found road layer: ${layer.name}`);
                        console.log(`      - Visible: ${layer.visible}`);
                        console.log(`      - Has Leaflet Layer: ${!!layer.leafletLayer}`);
                        console.log(`      - On Map: ${layer.leafletLayer ? this.map.hasLayer(layer.leafletLayer) : 'N/A'}`);
                        console.log(`      - Style:`, layer.style);
                        console.log(`      - URL: ${layer.url}`);
                    }
                });
            }
            
            // Check layer control
            console.log('🎛️ Layer Control Status:');
            console.log(`   Roads in allowedLayers: ${!!this.allowedLayers.roads}`);
            if (this.allowedLayers.roads) {
                console.log(`   Roads on map: ${this.map.hasLayer(this.allowedLayers.roads)}`);
            }
            
            // Check all map layers
            console.log('🗺️ All layers on map:');
            let layerCount = 0;
            this.map.eachLayer(layer => {
                layerCount++;
                console.log(`   ${layerCount}: ${layer.constructor.name}`);
            });
        };
        
        // Add manual roads layer creation function
        window.createRoadsLayerManually = () => {
            console.log('🛣️ MANUALLY CREATING ROADS LAYER...');
            
            // Try multiple potential URLs
            const potentialUrls = [
                'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer/2',
                'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer/1',
                'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer/3'
            ];
            
            potentialUrls.forEach((url, index) => {
                console.log(`🛣️ Trying URL ${index + 1}: ${url}`);
                
                try {
                    const roadsLayer = L.esri.featureLayer({
                        url: url,
                        style: {
                            color: index === 0 ? '#ff0000' : index === 1 ? '#00ff00' : '#0000ff', // Different colors for testing
                            weight: 5, // Very thick for visibility
                            opacity: 1
                        }
                    });
                    
                    roadsLayer.on('loading', () => {
                        console.log(`🛣️ Manual roads layer ${index + 1}: Loading...`);
                    });
                    
                    roadsLayer.on('load', () => {
                        console.log(`🛣️ Manual roads layer ${index + 1}: Loaded successfully!`);
                        
                        // Check if it has features
                        setTimeout(() => {
                            let hasFeatures = false;
                            try {
                                if (roadsLayer.getLayers && roadsLayer.getLayers().length > 0) {
                                    hasFeatures = true;
                                    console.log(`✅ URL ${index + 1} HAS FEATURES: ${roadsLayer.getLayers().length} features`);
                                } else {
                                    console.log(`⚠️ URL ${index + 1} has no features`);
                                }
                            } catch (e) {
                                console.log(`⚠️ Could not check features for URL ${index + 1}`);
                            }
                        }, 3000);
                    });
                    
                    roadsLayer.on('error', (error) => {
                        console.error(`🛣️ Manual roads layer ${index + 1}: Error!`, error);
                    });
                    
                    roadsLayer.addTo(this.map);
                    console.log(`🛣️ Manual roads layer ${index + 1} added to map`);
                    
                    // Store reference
                    window[`manualRoadsLayer${index + 1}`] = roadsLayer;
                    
                } catch (error) {
                    console.error(`🛣️ Error creating manual roads layer ${index + 1}:`, error);
                }
            });
        };
        
        // Add specific function to test roads layer URL
        window.testRoadsUrl = () => {
            const roadsUrl = 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer/2';
            console.log('🛣️ Testing roads layer URL...');
            
            fetch(`${roadsUrl}?f=json`)
                .then(response => response.json())
                .then(data => {
                    console.log('🛣️ Roads layer service info:', data);
                    if (data.error) {
                        console.error('🛣️ Service error:', data.error);
                    } else {
                        console.log(`🛣️ Service is valid: ${data.name}`);
                        console.log(`🛣️ Geometry type: ${data.geometryType}`);
                        console.log(`🛣️ Feature count: ${data.count || 'Unknown'}`);
                    }
                })
                .catch(error => {
                    console.error('🛣️ Failed to fetch roads service info:', error);
                });
        };
        
        // Add function to discover all service layers and find roads
        window.discoverAllLayers = () => {
            const serviceUrl = 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer';
            console.log('🔍 Discovering all layers in service...');
            
            fetch(`${serviceUrl}?f=json`)
                .then(response => response.json())
                .then(data => {
                    console.log('📊 Service metadata:', data);
                    if (data.layers) {
                        console.log(`📋 Found ${data.layers.length} layers:`);
                        data.layers.forEach(layer => {
                            console.log(`   • ID: ${layer.id}, Name: "${layer.name}", Type: ${layer.geometryType}`);
                            
                            // Check if this might be the roads layer
                            if (layer.name.toLowerCase().includes('road') || 
                                layer.name.toLowerCase().includes('centerline') ||
                                layer.geometryType === 'esriGeometryPolyline') {
                                console.log(`     🛣️ POTENTIAL ROADS LAYER: ${layer.name} (ID: ${layer.id})`);
                                
                                // Test this specific layer
                                const layerUrl = `${serviceUrl}/${layer.id}`;
                                fetch(`${layerUrl}?f=json`)
                                    .then(response => response.json())
                                    .then(layerData => {
                                        console.log(`     🔍 Layer ${layer.id} details:`, {
                                            name: layerData.name,
                                            geometryType: layerData.geometryType,
                                            hasFeatures: layerData.hasStaticData !== false,
                                            capabilities: layerData.capabilities
                                        });
                                        
                                        // Try to create this layer
                                        if (layer.geometryType === 'esriGeometryPolyline') {
                                            console.log(`     🛣️ Attempting to create layer ${layer.id}...`);
                                            window.tryCreateSpecificRoadLayer(layer.id, layer.name);
                                        }
                                    })
                                    .catch(err => console.error(`     ❌ Failed to get details for layer ${layer.id}:`, err));
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error('❌ Failed to discover service layers:', error);
                });
        };
        
        // Add function to try creating a specific road layer by ID
        window.tryCreateSpecificRoadLayer = (layerId, layerName) => {
            const serviceUrl = 'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Delta_County_view/FeatureServer';
            const layerUrl = `${serviceUrl}/${layerId}`;
            
            console.log(`🛣️ Attempting to create road layer: ${layerName} (ID: ${layerId})`);
            console.log(`🛣️ URL: ${layerUrl}`);
            
            try {
                const roadLayer = L.esri.featureLayer({
                    url: layerUrl,
                    style: {
                        color: '#ff0000', // Use red for testing visibility
                        weight: 4,
                        opacity: 1
                    }
                });
                
                roadLayer.on('loading', () => {
                    console.log(`🛣️ Layer ${layerId}: Loading...`);
                });
                
                roadLayer.on('load', () => {
                    console.log(`🛣️ Layer ${layerId}: Loaded successfully!`);
                    
                    // Check feature count
                    setTimeout(() => {
                        let featureCount = 0;
                        if (roadLayer.getLayers) {
                            featureCount = roadLayer.getLayers().length;
                        }
                        console.log(`🛣️ Layer ${layerId} has ${featureCount} features`);
                        
                        if (featureCount > 0) {
                            console.log(`✅ FOUND WORKING ROADS LAYER: ${layerName} (ID: ${layerId})`);
                        }
                    }, 2000);
                });
                
                roadLayer.on('error', (error) => {
                    console.error(`🛣️ Layer ${layerId}: Error!`, error);
                });
                
                roadLayer.addTo(this.map);
                
                // Store reference with layer ID
                window[`roadLayer_${layerId}`] = roadLayer;
                
            } catch (error) {
                console.error(`🛣️ Error creating layer ${layerId}:`, error);
            }
        };
        
        // Add a simple test to create a basic test line to verify line rendering works
        window.createTestLine = () => {
            console.log('🧪 Creating test line to verify line rendering...');
            
            // Create a simple test line across Delta County
            const testLine = L.polyline([
                [45.7, -87.0],
                [45.8, -86.8],
                [45.6, -86.6]
            ], {
                color: '#ff0000',
                weight: 10,
                opacity: 1
            });
            
            testLine.addTo(this.map);
            console.log('🧪 Test line added to map - if you can see a red line, line rendering works');
            
            window.testLine = testLine;
            
            // Also create a simple GeoJSON line
            const geoJsonLine = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [-87.1, 45.7],
                        [-86.9, 45.7],
                        [-86.7, 45.9]
                    ]
                }
            };
            
            const geoLayer = L.geoJSON(geoJsonLine, {
                style: {
                    color: '#00ff00',
                    weight: 8,
                    opacity: 1
                }
            });
            
            geoLayer.addTo(this.map);
            console.log('🧪 GeoJSON test line added - if you can see a green line, GeoJSON rendering works');
            
            window.testGeoLine = geoLayer;
        };
        
        // Add specific layer control debugging function
        window.debugLayerControl = () => {
            console.log('🎛️ LAYER CONTROL DEBUG REPORT:');
            
            console.log('📋 Allowed Layers Status:');
            Object.keys(this.allowedLayers).forEach(layerType => {
                const layer = this.allowedLayers[layerType];
                console.log(`   ${layerType}:`);
                console.log(`     - Has layer: ${!!layer}`);
                console.log(`     - On map: ${layer ? this.map.hasLayer(layer) : 'N/A'}`);
                console.log(`     - Layer type: ${layer ? layer.constructor.name : 'N/A'}`);
            });
            
            console.log('🎛️ Layer Control Status:');
            console.log(`   - Control exists: ${!!this.layerControl}`);
            console.log(`   - Control on map: ${this.layerControl ? this.map.hasControl ? this.map.hasControl(this.layerControl) : 'Unknown' : 'N/A'}`);
            
            // Try to manually toggle roads layer
            if (this.allowedLayers.roads) {
                console.log('🛣️ Manual Roads Layer Test:');
                const isOnMap = this.map.hasLayer(this.allowedLayers.roads);
                console.log(`   Currently on map: ${isOnMap}`);
                
                if (isOnMap) {
                    console.log('   Trying to remove...');
                    this.map.removeLayer(this.allowedLayers.roads);
                    console.log(`   After removal: ${this.map.hasLayer(this.allowedLayers.roads)}`);
                    
                    // Add it back after 2 seconds
                    setTimeout(() => {
                        console.log('   Adding back...');
                        this.allowedLayers.roads.addTo(this.map);
                        console.log(`   After adding: ${this.map.hasLayer(this.allowedLayers.roads)}`);
                    }, 2000);
                } else {
                    console.log('   Trying to add...');
                    this.allowedLayers.roads.addTo(this.map);
                    console.log(`   After adding: ${this.map.hasLayer(this.allowedLayers.roads)}`);
                }
            }
        };
        
        // Auto-run debug after 5 seconds
        setTimeout(() => {
            window.debugRoadLayers();
            window.debugLayerControl();
            window.testRoadsUrl();
            window.discoverAllLayers();
            window.createTestLine();
        }, 5000);

        console.log('📋 Basic controls setup complete, township selector will be added after service initialization');
    }
    
    addLayerControl() {
        // Create custom layer control with only 4 specific layers
        const overlayMaps = {};
        
        // Initialize with empty overlay maps - will be populated by services
        this.layerControl = L.control.layers(this.baseMaps, overlayMaps, {
            position: 'topright',
            collapsed: false
        }).addTo(this.map);
        
        // Add event listeners to update legend when layers are toggled
        this.map.on('overlayadd overlayremove', (e) => {
            console.log(`🎛️ Layer control event: ${e.type} for layer: ${e.name}`);
            
            // Handle roads layer specifically
            if (e.name === '🛣️ Road Centerlines') {
                console.log(`🛣️ Roads layer ${e.type === 'overlayadd' ? 'added' : 'removed'}`);
                
                // Ensure the roads layer reference is correct
                if (e.type === 'overlayadd' && this.allowedLayers.roads && !this.map.hasLayer(this.allowedLayers.roads)) {
                    console.log('🔧 Forcing roads layer to be added to map');
                    this.allowedLayers.roads.addTo(this.map);
                } else if (e.type === 'overlayremove' && this.allowedLayers.roads && this.map.hasLayer(this.allowedLayers.roads)) {
                    console.log('🔧 Forcing roads layer to be removed from map');
                    this.map.removeLayer(this.allowedLayers.roads);
                }
            }
            
            // Small delay to ensure the layer state has updated
            setTimeout(() => this.updateLegend(), 100);
        });
        
        // Initialize layer names tracker for preventing duplicates
        this.addedLayerNames = new Set();
        
        // Store references to the 4 allowed layers
        this.allowedLayers = {
            'townships': null,
            'parcels': null,
            'roads': null,
            'address_points': null
        };
    }
    
    isAllowedLayer(layerName) {
        // Check if this layer is one of our 4 allowed layers
        const normalizedName = layerName.toLowerCase().replace(/[🏠🏞️🛣️📄🏛️]/g, '').trim();
        
        console.log(`🔍 Checking layer: "${layerName}" -> normalized: "${normalizedName}"`);
        
        if (normalizedName.includes('township')) return 'townships';
        if (normalizedName.includes('parcel')) return 'parcels';
        if (normalizedName.includes('road') || normalizedName.includes('centerline')) return 'roads';
        if (normalizedName.includes('address')) return 'address_points';
        
        console.log(`❌ Layer "${layerName}" not recognized as allowed layer`);
        return null;
    }
    
    addLayerToCustomControl(layer, layerName, layerType) {
        console.log(`🎯 Attempting to add layer to control: "${layerName}" as type "${layerType}"`);
        
        // Only add if we don't already have this layer type
        if (!this.allowedLayers[layerType]) {
            this.allowedLayers[layerType] = layer;
            
            // Create display name with emoji
            let displayName;
            switch(layerType) {
                case 'townships': displayName = '🏞️ Townships'; break;
                case 'parcels': displayName = '📄 Parcels'; break;
                case 'roads': displayName = '🛣️ Road Centerlines'; break;
                case 'address_points': displayName = '🏠 Address Points'; break;
                default: displayName = layerName;
            }
            
            this.layerControl.addOverlay(layer, displayName);
            console.log(`✅ Added to custom control: ${displayName}`);
            
            // Special debugging for roads layer
            if (layerType === 'roads') {
                console.log(`🛣️ ROADS LAYER DEBUG:`);
                console.log(`   Layer object:`, layer);
                console.log(`   Layer constructor:`, layer.constructor.name);
                console.log(`   Is on map:`, this.map.hasLayer(layer));
                console.log(`   Stored in allowedLayers:`, !!this.allowedLayers.roads);
                
                // Ensure the layer is properly added to the map initially
                if (!this.map.hasLayer(layer)) {
                    console.log(`🔧 Adding roads layer to map as it wasn't already there`);
                    layer.addTo(this.map);
                }
            }
            
            // Update legend when new layer is added
            this.updateLegend();
        } else {
            console.log(`⏭️ Skipping duplicate layer type: ${layerType} (already have: ${this.allowedLayers[layerType] ? 'yes' : 'no'})`);
        }
    }
    
    addLegend() {
        const legend = L.control({ position: 'bottomleft' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = '<h4>Map Layers</h4>';
            
            // Define the 4 main layer types with their styling
            const layerTypes = [
                {
                    name: '🏞️ Townships',
                    type: 'line',
                    color: '#2E86AB',
                    layer: this.allowedLayers.townships
                },
                {
                    name: '📄 Parcels',
                    type: 'polygon', 
                    color: '#F18F01',
                    fillColor: '#C73E1D',
                    layer: this.allowedLayers.parcels
                },
                {
                    name: '🛣️ Road Centerlines',
                    type: 'line',
                    color: '#000000',
                    layer: this.allowedLayers.roads
                },
                {
                    name: '🏠 Address Points',
                    type: 'point',
                    color: '#3498db',
                    layer: this.allowedLayers.address_points
                }
            ];
            
            // Add each layer type to legend if it exists and is on the map
            layerTypes.forEach(layerDef => {
                if (layerDef.layer && this.map.hasLayer(layerDef.layer)) {
                    let symbolHtml = '';
                    
                    switch(layerDef.type) {
                        case 'polygon':
                            symbolHtml = `<i style="background: ${layerDef.fillColor}; border: 2px solid ${layerDef.color}; opacity: 0.7;"></i>`;
                            break;
                        case 'line':
                            symbolHtml = `<i style="background: ${layerDef.color}; border: none; height: 3px; margin-top: 7px; width: 18px; display: inline-block;"></i>`;
                            break;
                        case 'point':
                            symbolHtml = `<i style="background: ${layerDef.color}; border: none; border-radius: 50%; width: 12px; height: 12px; margin-top: 3px;"></i>`;
                            break;
                    }
                    
                    div.innerHTML += `${symbolHtml}<span>${layerDef.name}</span><br>`;
                }
            });
            
            // If no layers are visible, show a message
            const visibleLayers = layerTypes.filter(l => l.layer && this.map.hasLayer(l.layer));
            if (visibleLayers.length === 0) {
                div.innerHTML += '<span style="color: #666; font-style: italic;">No layers currently visible</span>';
            }
            
            return div;
        };
        
        legend.addTo(this.map);
        
        // Store legend reference for updates
        this.legend = legend;
    }
    
    updateLegend() {
        // Remove existing legend
        if (this.legend) {
            this.map.removeControl(this.legend);
        }
        
        // Re-add legend with current layers
        this.addLegend();
    }
    
    addTownshipSelector() {
        const self = this; // Capture the correct context
        
        const TownshipControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'township-control');
                div.style.cssText = `
                    background: white;
                    padding: 8px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    font-family: Arial, sans-serif;
                `;
                
                const label = L.DomUtil.create('label', '', div);
                label.innerHTML = '🏞️ Select Township:';
                label.style.cssText = `
                    display: block;
                    font-weight: bold;
                    margin-bottom: 5px;
                    font-size: 12px;
                    color: #333;
                `;
                
                const select = L.DomUtil.create('select', 'whereClauseSelect', div);
                select.style.cssText = `
                    width: 150px;
                    padding: 4px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    font-size: 12px;
                `;
                
                DeltaCountyConfig.townships.forEach(township => {
                    const option = L.DomUtil.create('option', '', select);
                    option.value = township;
                    option.innerHTML = township;
                });
                
                L.DomEvent.addListener(select, 'change', function(e) {
                    console.log('🏞️ Township selector changed:', e.target.value);
                    self.onTownshipChange(e.target.value);
                });
                
                // Prevent map events when interacting with the control
                L.DomEvent.disableClickPropagation(div);
                L.DomEvent.disableScrollPropagation(div);
                
                return div;
            }
        });
        
        this.townshipControl = new TownshipControl({ position: 'bottomright' }).addTo(this.map);
        console.log('✅ Township selector added to map');
    }
    
    onTownshipChange(selectedTownship) {
        console.log(`🏞️ Township selected: ${selectedTownship}`);
        
        if (selectedTownship === "Choose a Township" || !selectedTownship) {
            console.log('🔄 Resetting township filter');
            this.resetTownshipFilter();
            this.resetAddressPointFilter();
            return;
        }
        
        try {
            // Find township layer from Delta County service
            const townshipLayer = this.findTownshipLayer();
            if (!townshipLayer) {
                console.warn('❌ Township layer not found in any service');
                this.showTownshipNotFoundMessage();
                return;
            }
            
            console.log(`� Using township layer: ${townshipLayer.name}`);
            
            // Ensure the layer has a Leaflet layer
            if (!townshipLayer.leafletLayer) {
                console.error('❌ Township layer missing Leaflet layer');
                this.showTownshipError(selectedTownship, 'Layer data not properly loaded');
                return;
            }
            
            console.log(`�🔍 Filtering township layer for: ${selectedTownship}`);
            
            // Hide all other layers first
            this.hideNonTownshipLayers();
            
            // Show only the township layer
            if (!this.map.hasLayer(townshipLayer.leafletLayer)) {
                console.log('📍 Adding township layer to map');
                townshipLayer.leafletLayer.addTo(this.map);
            }
            
            // Filter and zoom to selected township
            this.filterAndZoomToTownship(townshipLayer, selectedTownship);
            
            // Filter address points within the selected township
            this.filterAddressPointsByTownship(selectedTownship);
            
        } catch (error) {
            console.error('❌ Error in onTownshipChange:', error);
            this.showTownshipError(selectedTownship, error.message);
        }
    }
    
    findTownshipLayer() {
        console.log('🔍 Searching for township layer...');
        
        // Search in Delta County service manager
        if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
            console.log(`   Checking ${this.deltaCountyServiceManager.layers.length} Delta County layers`);
            
            for (let i = 0; i < this.deltaCountyServiceManager.layers.length; i++) {
                const layer = this.deltaCountyServiceManager.layers[i];
                console.log(`   Layer ${i}: ${layer.name} (ID: ${layer.id})`);
                
                if (layer.name && layer.name.toLowerCase().includes('township')) {
                    console.log(`✅ Found Delta County township layer: ${layer.name}`);
                    console.log(`   Has leafletLayer: ${!!layer.leafletLayer}`);
                    console.log(`   Visible: ${layer.visible}`);
                    
                    if (layer.leafletLayer) {
                        console.log(`   Layer type: ${layer.leafletLayer.constructor.name}`);
                        console.log(`   Has eachLayer: ${typeof layer.leafletLayer.eachLayer === 'function'}`);
                        console.log(`   Has getLayers: ${typeof layer.leafletLayer.getLayers === 'function'}`);
                        console.log(`   Has _layers: ${!!layer.leafletLayer._layers}`);
                    }
                    
                    return layer;
                }
            }
        } else {
            console.log('   ❌ Delta County service manager not available');
        }
        
        // Search in UW-Madison service manager if needed
        if (this.uwMadisonServiceManager && this.uwMadisonServiceManager.layers) {
            console.log(`   Checking ${this.uwMadisonServiceManager.layers.length} UW-Madison layers`);
            
            for (let i = 0; i < this.uwMadisonServiceManager.layers.length; i++) {
                const layer = this.uwMadisonServiceManager.layers[i];
                console.log(`   UW Layer ${i}: ${layer.name} (ID: ${layer.id})`);
                
                if (layer.name && layer.name.toLowerCase().includes('township')) {
                    console.log(`✅ Found UW-Madison township layer: ${layer.name}`);
                    
                    if (layer.leafletLayer) {
                        console.log(`   Layer type: ${layer.leafletLayer.constructor.name}`);
                        console.log(`   Has eachLayer: ${typeof layer.leafletLayer.eachLayer === 'function'}`);
                        console.log(`   Has getLayers: ${typeof layer.leafletLayer.getLayers === 'function'}`);
                        console.log(`   Has _layers: ${!!layer.leafletLayer._layers}`);
                    }
                    
                    return layer;
                }
            }
        } else {
            console.log('   ❌ UW-Madison service manager not available');
        }
        
        console.log('❌ No township layer found in any service');
        return null;
    }
    
    hideNonTownshipLayers() {
        console.log('🔒 Hiding non-township layers');
        
        // Hide Delta County layers except townships
        if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
            this.deltaCountyServiceManager.layers.forEach(layer => {
                if (layer.leafletLayer && !layer.name.toLowerCase().includes('township')) {
                    this.map.removeLayer(layer.leafletLayer);
                }
            });
        }
        
        // Hide UW-Madison layers except townships
        if (this.uwMadisonServiceManager && this.uwMadisonServiceManager.layers) {
            this.uwMadisonServiceManager.layers.forEach(layer => {
                if (layer.leafletLayer && !layer.name.toLowerCase().includes('township')) {
                    this.map.removeLayer(layer.leafletLayer);
                }
            });
        }
    }
    
    filterAndZoomToTownship(townshipLayer, selectedTownship) {
        if (!townshipLayer.leafletLayer) {
            console.error('❌ Township layer does not have a Leaflet layer');
            return;
        }
        
        try {
            // Clear any existing filters
            this.clearTownshipHighlights();
            
            // Use Esri Leaflet query if available
            if (typeof L.esri !== 'undefined' && townshipLayer.leafletLayer.query) {
                console.log(`🔍 Querying township: ${selectedTownship}`);
                
                townshipLayer.leafletLayer.query()
                    .where(`NAME = '${selectedTownship}' OR TOWN = '${selectedTownship}' OR TOWNSHIP = '${selectedTownship}'`)
                    .run((error, featureCollection) => {
                        if (error) {
                            console.error('❌ Township query error:', error);
                            this.fallbackTownshipSearch(townshipLayer, selectedTownship);
                            return;
                        }
                        
                        if (featureCollection && featureCollection.features && featureCollection.features.length > 0) {
                            console.log(`✅ Found ${featureCollection.features.length} township features`);
                            this.zoomToTownshipFeatures(featureCollection.features);
                            this.highlightTownshipFeatures(featureCollection.features);
                        } else {
                            console.warn(`⚠️ No features found for township: ${selectedTownship}`);
                            this.fallbackTownshipSearch(townshipLayer, selectedTownship);
                        }
                    });
            } else {
                // Fallback: search through all features
                this.fallbackTownshipSearch(townshipLayer, selectedTownship);
            }
        } catch (error) {
            console.error('❌ Error filtering township:', error);
            this.showTownshipError(selectedTownship, error.message);
        }
    }
    
    fallbackTownshipSearch(townshipLayer, selectedTownship) {
        console.log(`🔄 Using fallback search for township: ${selectedTownship}`);
        
        const matchingFeatures = [];
        let totalFeatures = 0;
        
        try {
            if (townshipLayer.leafletLayer && typeof townshipLayer.leafletLayer.eachLayer === 'function') {
                // Standard Leaflet layer with eachLayer method
                townshipLayer.leafletLayer.eachLayer(layer => {
                    totalFeatures++;
                    if (layer.feature && layer.feature.properties) {
                        const props = layer.feature.properties;
                        const townshipName = props.NAME || props.TOWN || props.TOWNSHIP || '';
                        
                        if (townshipName.toLowerCase().includes(selectedTownship.toLowerCase())) {
                            matchingFeatures.push(layer.feature);
                        }
                    }
                });
            } else if (townshipLayer.leafletLayer && townshipLayer.leafletLayer._layers) {
                // Layer Group - iterate through _layers
                console.log('🔍 Township layer is a LayerGroup, searching _layers');
                Object.values(townshipLayer.leafletLayer._layers).forEach(layer => {
                    totalFeatures++;
                    if (layer.feature && layer.feature.properties) {
                        const props = layer.feature.properties;
                        const townshipName = props.NAME || props.TOWN || props.TOWNSHIP || '';
                        
                        if (townshipName.toLowerCase().includes(selectedTownship.toLowerCase())) {
                            matchingFeatures.push(layer.feature);
                        }
                    }
                });
            } else if (townshipLayer.leafletLayer && townshipLayer.leafletLayer.getLayers) {
                // FeatureGroup or LayerGroup with getLayers method
                console.log('🔍 Township layer has getLayers method');
                const layers = townshipLayer.leafletLayer.getLayers();
                layers.forEach(layer => {
                    totalFeatures++;
                    if (layer.feature && layer.feature.properties) {
                        const props = layer.feature.properties;
                        const townshipName = props.NAME || props.TOWN || props.TOWNSHIP || '';
                        
                        if (townshipName.toLowerCase().includes(selectedTownship.toLowerCase())) {
                            matchingFeatures.push(layer.feature);
                        }
                    }
                });
            } else {
                console.error('❌ Township layer type not recognized:', typeof townshipLayer.leafletLayer);
                console.log('Available methods:', Object.getOwnPropertyNames(townshipLayer.leafletLayer));
                this.showTownshipError(selectedTownship, 'Township layer type not supported for filtering');
                return;
            }
        } catch (error) {
            console.error('❌ Error in fallback search:', error);
            this.showTownshipError(selectedTownship, `Search error: ${error.message}`);
            return;
        }
        
        console.log(`Searched ${totalFeatures} total features`);
        
        if (matchingFeatures.length > 0) {
            console.log(`✅ Fallback search found ${matchingFeatures.length} features`);
            this.zoomToTownshipFeatures(matchingFeatures);
            this.highlightTownshipFeatures(matchingFeatures);
        } else {
            console.warn(`⚠️ Fallback search found no features for: ${selectedTownship}`);
            this.showTownshipNotFoundMessage();
        }
    }
    
    zoomToTownshipFeatures(features) {
        try {
            const group = L.featureGroup(features.map(feature => L.geoJSON(feature)));
            const bounds = group.getBounds();
            
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { 
                    padding: [20, 20],
                    maxZoom: 12
                });
                console.log('✅ Zoomed to township bounds');
            } else {
                console.warn('⚠️ Invalid bounds for township features');
            }
        } catch (error) {
            console.error('❌ Error zooming to township:', error);
        }
    }
    
    highlightTownshipFeatures(features) {
        try {
            features.forEach(feature => {
                // Find the corresponding Leaflet layer and highlight it
                const townshipLayer = this.findTownshipLayer();
                if (townshipLayer && townshipLayer.leafletLayer) {
                    
                    if (typeof townshipLayer.leafletLayer.eachLayer === 'function') {
                        // Standard layer with eachLayer method
                        townshipLayer.leafletLayer.eachLayer(layer => {
                            if (layer.feature && 
                                layer.feature.properties && 
                                feature.properties &&
                                this.featuresMatch(layer.feature.properties, feature.properties)) {
                                
                                if (typeof layer.setStyle === 'function') {
                                    layer.setStyle({
                                        color: '#00FFFB',
                                        weight: 4,
                                        fillOpacity: 0.6,
                                        opacity: 1
                                    });
                                }
                            }
                        });
                    } else if (townshipLayer.leafletLayer._layers) {
                        // Layer Group - iterate through _layers
                        Object.values(townshipLayer.leafletLayer._layers).forEach(layer => {
                            if (layer.feature && 
                                layer.feature.properties && 
                                feature.properties &&
                                this.featuresMatch(layer.feature.properties, feature.properties)) {
                                
                                if (typeof layer.setStyle === 'function') {
                                    layer.setStyle({
                                        color: '#00FFFB',
                                        weight: 4,
                                        fillOpacity: 0.6,
                                        opacity: 1
                                    });
                                }
                            }
                        });
                    } else if (townshipLayer.leafletLayer.getLayers) {
                        // FeatureGroup or LayerGroup with getLayers method
                        const layers = townshipLayer.leafletLayer.getLayers();
                        layers.forEach(layer => {
                            if (layer.feature && 
                                layer.feature.properties && 
                                feature.properties &&
                                this.featuresMatch(layer.feature.properties, feature.properties)) {
                                
                                if (typeof layer.setStyle === 'function') {
                                    layer.setStyle({
                                        color: '#00FFFB',
                                        weight: 4,
                                        fillOpacity: 0.6,
                                        opacity: 1
                                    });
                                }
                            }
                        });
                    }
                }
            });
            console.log(`✅ Highlighted ${features.length} township features`);
        } catch (error) {
            console.error('❌ Error highlighting township features:', error);
        }
    }
    
    featuresMatch(props1, props2) {
        // Check if two feature property objects represent the same feature
        const id1 = props1.OBJECTID || props1.FID || props1.ID;
        const id2 = props2.OBJECTID || props2.FID || props2.ID;
        
        if (id1 && id2) {
            return id1 === id2;
        }
        
        // Fallback: compare names
        const name1 = props1.NAME || props1.TOWN || props1.TOWNSHIP || '';
        const name2 = props2.NAME || props2.TOWN || props2.TOWNSHIP || '';
        
        return name1.toLowerCase() === name2.toLowerCase();
    }
    
    clearTownshipHighlights() {
        try {
            const townshipLayer = this.findTownshipLayer();
            if (townshipLayer && townshipLayer.leafletLayer && townshipLayer.style) {
                
                if (typeof townshipLayer.leafletLayer.eachLayer === 'function') {
                    // Standard layer with eachLayer method
                    townshipLayer.leafletLayer.eachLayer(layer => {
                        if (typeof layer.setStyle === 'function') {
                            layer.setStyle(townshipLayer.style);
                        }
                    });
                } else if (townshipLayer.leafletLayer._layers) {
                    // Layer Group - iterate through _layers
                    Object.values(townshipLayer.leafletLayer._layers).forEach(layer => {
                        if (typeof layer.setStyle === 'function') {
                            layer.setStyle(townshipLayer.style);
                        }
                    });
                } else if (townshipLayer.leafletLayer.getLayers) {
                    // FeatureGroup or LayerGroup with getLayers method
                    const layers = townshipLayer.leafletLayer.getLayers();
                    layers.forEach(layer => {
                        if (typeof layer.setStyle === 'function') {
                            layer.setStyle(townshipLayer.style);
                        }
                    });
                }
                
                console.log('✅ Township highlights cleared');
            }
        } catch (error) {
            console.error('❌ Error clearing township highlights:', error);
        }
    }
    
    showTownshipNotFoundMessage() {
        console.warn('⚠️ Township not found');
        // You could add a user notification here
        if (typeof L.popup !== 'undefined') {
            L.popup()
                .setLatLng(this.map.getCenter())
                .setContent('<b>Township Not Found</b><br>The selected township could not be located.')
                .openOn(this.map);
        }
    }
    
    showTownshipError(townshipName, errorMessage) {
        console.error(`❌ Township error for ${townshipName}: ${errorMessage}`);
        if (typeof L.popup !== 'undefined') {
            L.popup()
                .setLatLng(this.map.getCenter())
                .setContent(`<b>Error Loading Township</b><br>${errorMessage}`)
                .openOn(this.map);
        }
    }
    
    resetTownshipFilter() {
        console.log('🔄 Resetting township filter');
        
        // Show all layers again
        if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
            this.deltaCountyServiceManager.layers.forEach(layer => {
                if (layer.visible && layer.leafletLayer && !this.map.hasLayer(layer.leafletLayer)) {
                    layer.leafletLayer.addTo(this.map);
                }
            });
        }
        
        if (this.uwMadisonServiceManager && this.uwMadisonServiceManager.layers) {
            this.uwMadisonServiceManager.layers.forEach(layer => {
                if (layer.visible && layer.leafletLayer && !this.map.hasLayer(layer.leafletLayer)) {
                    layer.leafletLayer.addTo(this.map);
                }
            });
        }
        
        // Clear highlights
        this.clearTownshipHighlights();
        
        // Reset to default view
        this.map.setView(DeltaCountyConfig.map.center, DeltaCountyConfig.map.zoom);
        
        console.log('✅ Township filter reset complete');
    }
    
    filterAddressPointsByTownship(selectedTownship) {
        console.log(`🏠 Filtering address points for township: ${selectedTownship}`);
        
        try {
            // Find address point layers from all services
            const addressPointLayers = this.findAddressPointLayers();
            
            if (addressPointLayers.length === 0) {
                console.warn('⚠️ No address point layers found');
                return;
            }
            
            console.log(`📍 Found ${addressPointLayers.length} address point layers to filter`);
            
            addressPointLayers.forEach(layer => {
                this.filterLayerByTownship(layer, selectedTownship);
            });
            
        } catch (error) {
            console.error('❌ Error filtering address points:', error);
        }
    }
    
    findAddressPointLayers() {
        const addressPointLayers = [];
        
        // Search Delta County service
        if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
            this.deltaCountyServiceManager.layers.forEach(layer => {
                if (layer.name && layer.name.toLowerCase().includes('address')) {
                    console.log(`📍 Found Delta County address layer: ${layer.name}`);
                    addressPointLayers.push(layer);
                }
            });
        }
        
        // Search UW-Madison service
        if (this.uwMadisonServiceManager && this.uwMadisonServiceManager.layers) {
            this.uwMadisonServiceManager.layers.forEach(layer => {
                if (layer.name && layer.name.toLowerCase().includes('address')) {
                    console.log(`📍 Found UW-Madison address layer: ${layer.name}`);
                    addressPointLayers.push(layer);
                }
            });
        }
        
        return addressPointLayers;
    }
    
    filterLayerByTownship(layer, selectedTownship) {
        if (!layer.leafletLayer) {
            console.warn(`⚠️ Layer ${layer.name} has no Leaflet layer`);
            return;
        }
        
        try {
            // Use Esri Leaflet definitionExpression if available (most efficient)
            if (typeof L.esri !== 'undefined' && layer.leafletLayer.setDefinitionExpression) {
                console.log(`🔍 Using definition expression for ${layer.name}`);
                
                // Try different possible township field names
                const whereClause = `TOWNSHIP = '${selectedTownship}' OR TOWN = '${selectedTownship}' OR TOWNSHIPNAME = '${selectedTownship}' OR TOWNSHIP_NAME = '${selectedTownship}'`;
                layer.leafletLayer.setDefinitionExpression(whereClause);
                
                console.log(`✅ Applied definition expression to ${layer.name}: ${whereClause}`);
            } else {
                console.log(`🔍 Using client-side filtering for ${layer.name}`);
                this.clientSideFilterAddressPoints(layer, selectedTownship);
            }
            
        } catch (error) {
            console.error(`❌ Error filtering ${layer.name}:`, error);
        }
    }
    
    clientSideFilterAddressPoints(layer, selectedTownship) {
        // Store original layer for restoration
        if (!layer.originalLeafletLayer) {
            layer.originalLeafletLayer = layer.leafletLayer;
        }
        
        // Remove current layer from map
        if (this.map.hasLayer(layer.leafletLayer)) {
            this.map.removeLayer(layer.leafletLayer);
        }
        
        // Create filtered layer
        const filteredFeatures = [];
        
        try {
            if (typeof layer.leafletLayer.eachLayer === 'function') {
                layer.leafletLayer.eachLayer(pointLayer => {
                    if (pointLayer.feature && pointLayer.feature.properties) {
                        const props = pointLayer.feature.properties;
                        const township = props.TOWNSHIP || props.TOWN || props.TOWNSHIPNAME || props.TOWNSHIP_NAME || '';
                        
                        if (township.toLowerCase().includes(selectedTownship.toLowerCase())) {
                            filteredFeatures.push(pointLayer.feature);
                        }
                    }
                });
            }
            
            if (filteredFeatures.length > 0) {
                // Create new layer with filtered features
                const filteredLayer = L.geoJSON(filteredFeatures, {
                    pointToLayer: (feature, latlng) => {
                        return L.circleMarker(latlng, layer.style || {
                            radius: 3,
                            fillColor: '#3498db',
                            color: '#3498db', // Match fill color to remove shadow
                            weight: 0, // Remove border weight
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, pointLayer) => {
                        if (layer.popupTemplate) {
                            const popupContent = this.formatPopupContent(feature.properties, layer.popupTemplate);
                            pointLayer.bindPopup(popupContent);
                        }
                    }
                });
                
                // Replace layer reference and add to map
                layer.leafletLayer = filteredLayer;
                filteredLayer.addTo(this.map);
                
                console.log(`✅ Filtered ${layer.name}: showing ${filteredFeatures.length} address points in ${selectedTownship}`);
            } else {
                console.log(`⚠️ No address points found in ${selectedTownship} for ${layer.name}`);
            }
            
        } catch (error) {
            console.error(`❌ Error in client-side filtering for ${layer.name}:`, error);
        }
    }
    
    resetAddressPointFilter() {
        console.log('🔄 Resetting address point filter');
        
        try {
            const addressPointLayers = this.findAddressPointLayers();
            
            addressPointLayers.forEach(layer => {
                // Clear definition expression if available
                if (layer.leafletLayer && layer.leafletLayer.setDefinitionExpression) {
                    layer.leafletLayer.setDefinitionExpression('');
                    console.log(`✅ Cleared definition expression for ${layer.name}`);
                }
                
                // Restore original layer if we did client-side filtering
                if (layer.originalLeafletLayer) {
                    if (this.map.hasLayer(layer.leafletLayer)) {
                        this.map.removeLayer(layer.leafletLayer);
                    }
                    
                    layer.leafletLayer = layer.originalLeafletLayer;
                    delete layer.originalLeafletLayer;
                    
                    if (layer.visible) {
                        layer.leafletLayer.addTo(this.map);
                    }
                    
                    console.log(`✅ Restored original layer for ${layer.name}`);
                }
            });
            
            console.log('✅ Address point filter reset complete');
            
        } catch (error) {
            console.error('❌ Error resetting address point filter:', error);
        }
    }
    
    // Query button township filtering methods
    filterByTownship(townshipName) {
        console.log(`🔍 Query filter: Filtering all layers by township: ${townshipName}`);
        
        try {
            // Store the current query filter
            this.currentQueryFilter = townshipName;
            
            // Filter all applicable layers using proper Esri query
            this.filterAllLayersByTownshipEsri(townshipName);
            
            // Update the township selector to match
            if (this.townshipControl) {
                const select = this.townshipControl.getContainer().querySelector('select');
                if (select) {
                    select.value = townshipName;
                }
            }
            
            // Show notification
            this.showQueryNotification(`Filtering by ${townshipName} township...`, 'info');
            
        } catch (error) {
            console.error('❌ Error applying township query filter:', error);
            this.showQueryNotification('Error applying filter', 'error');
        }
    }
    
    resetTownshipFilter() {
        console.log('🔄 Query filter: Resetting township filter');
        
        try {
            // Clear the current filter
            this.currentQueryFilter = null;
            
            // Reset all layers using proper Esri methods
            this.resetAllLayerFiltersEsri();
            
            // Reset the township selector
            if (this.townshipControl) {
                const select = this.townshipControl.getContainer().querySelector('select');
                if (select) {
                    select.value = 'Choose a Township';
                }
            }
            
            // Show notification
            this.showQueryNotification('Filter reset - showing all features', 'info');
            
        } catch (error) {
            console.error('❌ Error resetting township query filter:', error);
            this.showQueryNotification('Error resetting filter', 'error');
        }
    }
    
    filterAllLayersByTownship(townshipName) {
        console.log(`🌍 Filtering all layers by township: ${townshipName}`);
        
        // Filter address points (reuse existing method)
        this.filterAddressPointsByTownship(townshipName);
        
        // Filter other layers that have township information
        if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
            this.deltaCountyServiceManager.layers.forEach(layerConfig => {
                if (layerConfig.leafletLayer && layerConfig.name.toLowerCase().includes('parcel')) {
                    this.filterLayerByTownship(layerConfig, townshipName);
                }
            });
        }
    }
    
    // New Esri-based filtering methods for proper ArcGIS service querying
    filterAllLayersByTownshipEsri(townshipName) {
        console.log(`🌍 Filtering all layers by township using Esri queries: ${townshipName}`);
        
        let layersProcessed = 0;
        let layersWithData = 0;
        
        // Process all Delta County layers
        if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
            this.deltaCountyServiceManager.layers.forEach(layerConfig => {
                if (layerConfig.leafletLayer && typeof L.esri !== 'undefined') {
                    this.filterEsriLayerByTownship(layerConfig, townshipName, (hasData) => {
                        layersProcessed++;
                        if (hasData) layersWithData++;
                        
                        // Show final notification when all layers are processed
                        if (layersProcessed === this.deltaCountyServiceManager.layers.length) {
                            if (layersWithData > 0) {
                                this.showQueryNotification(`Found data in ${layersWithData} layers for ${townshipName}`, 'success');
                            } else {
                                this.showQueryNotification(`No data found in ${townshipName} township`, 'warning');
                            }
                        }
                    });
                }
            });
        }
        
        // Also process UW Madison layers if available
        if (this.uwMadisonServiceManager && this.uwMadisonServiceManager.layers) {
            this.uwMadisonServiceManager.layers.forEach(layerConfig => {
                if (layerConfig.leafletLayer && typeof L.esri !== 'undefined') {
                    this.filterEsriLayerByTownship(layerConfig, townshipName, () => {});
                }
            });
        }
    }
    
    filterEsriLayerByTownship(layerConfig, townshipName, callback) {
        console.log(`🔍 Filtering ${layerConfig.name} by township: ${townshipName}`);
        
        try {
            // Check if this is an Esri feature layer with query capability
            if (layerConfig.leafletLayer && layerConfig.leafletLayer.setDefinitionExpression) {
                console.log(`✅ Using setDefinitionExpression for ${layerConfig.name}`);
                
                // Build where clause for township filtering
                // Try multiple possible field names for township
                const whereClause = this.buildTownshipWhereClause(townshipName);
                
                console.log(`📝 Setting definition expression: ${whereClause}`);
                layerConfig.leafletLayer.setDefinitionExpression(whereClause);
                
                // Store the original definition for reset
                if (!layerConfig.originalDefinitionExpression) {
                    layerConfig.originalDefinitionExpression = '';
                }
                
                callback(true);
                
            } else if (layerConfig.leafletLayer && layerConfig.leafletLayer.query) {
                console.log(`✅ Using query method for ${layerConfig.name}`);
                
                // Use query to filter features
                const whereClause = this.buildTownshipWhereClause(townshipName);
                
                layerConfig.leafletLayer.query()
                    .where(whereClause)
                    .run((error, featureCollection) => {
                        if (error) {
                            console.error(`❌ Query error for ${layerConfig.name}:`, error);
                            callback(false);
                            return;
                        }
                        
                        if (featureCollection && featureCollection.features && featureCollection.features.length > 0) {
                            console.log(`✅ Found ${featureCollection.features.length} features in ${layerConfig.name} for ${townshipName}`);
                            callback(true);
                        } else {
                            console.log(`⚠️ No features found in ${layerConfig.name} for ${townshipName}`);
                            callback(false);
                        }
                    });
                    
            } else {
                console.log(`⚠️ ${layerConfig.name} does not support Esri queries, skipping`);
                callback(false);
            }
            
        } catch (error) {
            console.error(`❌ Error filtering ${layerConfig.name}:`, error);
            callback(false);
        }
    }
    
    buildTownshipWhereClause(townshipName) {
        // Use the 'Name' field specifically for township filtering
        // This provides exact matching for township names
        console.log(`🏷️ Building where clause for township: ${townshipName} using 'Name' field`);
        
        // Primary condition using exact match on Name field
        const exactMatch = `UPPER(Name) = UPPER('${townshipName}')`;
        
        // Fallback condition using partial match for flexibility
        const partialMatch = `UPPER(Name) LIKE UPPER('%${townshipName}%')`;
        
        // Try exact match first, then partial match
        const whereClause = `${exactMatch} OR ${partialMatch}`;
        
        console.log(`📝 Generated where clause: ${whereClause}`);
        return whereClause;
    }
    
    resetAllLayerFiltersEsri() {
        console.log('🔄 Resetting all layer filters using Esri methods');
        
        try {
            // Reset Delta County layers
            if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
                this.deltaCountyServiceManager.layers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer && layerConfig.leafletLayer.setDefinitionExpression) {
                        console.log(`🔄 Resetting definition expression for ${layerConfig.name}`);
                        layerConfig.leafletLayer.setDefinitionExpression(layerConfig.originalDefinitionExpression || '');
                    }
                });
            }
            
            // Reset UW Madison layers
            if (this.uwMadisonServiceManager && this.uwMadisonServiceManager.layers) {
                this.uwMadisonServiceManager.layers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer && layerConfig.leafletLayer.setDefinitionExpression) {
                        console.log(`🔄 Resetting definition expression for ${layerConfig.name}`);
                        layerConfig.leafletLayer.setDefinitionExpression(layerConfig.originalDefinitionExpression || '');
                    }
                });
            }
            
            console.log('✅ All layer filters reset');
            
        } catch (error) {
            console.error('❌ Error resetting layer filters:', error);
        }
    }
    
    filterLayerByTownship(layerConfig, townshipName) {
        console.log(`🔍 Filtering ${layerConfig.name} by township: ${townshipName}`);
        
        try {
            if (!layerConfig.leafletLayer || typeof layerConfig.leafletLayer.eachLayer !== 'function') {
                console.log(`⚠️ Cannot filter ${layerConfig.name} - not a feature layer`);
                return;
            }
            
            // Store original layer if not already stored
            if (!layerConfig.originalLeafletLayer) {
                layerConfig.originalLeafletLayer = layerConfig.leafletLayer;
            }
            
            // Remove current layer from map
            if (this.map.hasLayer(layerConfig.leafletLayer)) {
                this.map.removeLayer(layerConfig.leafletLayer);
            }
            
            // Create filtered features array
            const filteredFeatures = [];
            
            layerConfig.leafletLayer.eachLayer(feature => {
                if (feature.feature && feature.feature.properties) {
                    const props = feature.feature.properties;
                    const township = props.TOWNSHIP || props.TOWN || props.TOWNSHIPNAME || props.TOWNSHIP_NAME || '';
                    
                    if (township.toLowerCase().includes(townshipName.toLowerCase())) {
                        filteredFeatures.push(feature.feature);
                    }
                }
            });
            
            if (filteredFeatures.length > 0) {
                // Create new filtered layer
                const filteredLayer = L.geoJSON(filteredFeatures, {
                    style: layerConfig.style,
                    onEachFeature: (feature, layer) => {
                        if (layerConfig.popupTemplate) {
                            const popupContent = this.formatPopupContent(feature.properties, layerConfig.popupTemplate);
                            layer.bindPopup(popupContent);
                        }
                    }
                });
                
                // Replace layer reference and add to map
                layerConfig.leafletLayer = filteredLayer;
                filteredLayer.addTo(this.map);
                
                console.log(`✅ Filtered ${layerConfig.name}: showing ${filteredFeatures.length} features in ${townshipName}`);
            } else {
                console.log(`⚠️ No features found in ${townshipName} for ${layerConfig.name}`);
            }
            
        } catch (error) {
            console.error(`❌ Error filtering ${layerConfig.name} by township:`, error);
        }
    }
    
    resetAllLayerFilters() {
        console.log('🔄 Resetting all layer filters');
        
        try {
            // Reset address points
            this.resetAddressPointFilter();
            
            // Reset other layers
            if (this.deltaCountyServiceManager && this.deltaCountyServiceManager.layers) {
                this.deltaCountyServiceManager.layers.forEach(layerConfig => {
                    if (layerConfig.originalLeafletLayer && layerConfig.leafletLayer !== layerConfig.originalLeafletLayer) {
                        // Remove filtered layer
                        if (this.map.hasLayer(layerConfig.leafletLayer)) {
                            this.map.removeLayer(layerConfig.leafletLayer);
                        }
                        
                        // Restore original layer
                        layerConfig.leafletLayer = layerConfig.originalLeafletLayer;
                        
                        // Add back to map if it was visible
                        if (layerConfig.visible) {
                            layerConfig.leafletLayer.addTo(this.map);
                        }
                        
                        console.log(`✅ Restored original layer: ${layerConfig.name}`);
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error resetting layer filters:', error);
        }
    }
    
    showQueryNotification(message, type = 'info') {
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c', 
            'warning': '#f39c12',
            'info': '#3498db'
        };
        
        const notification = $(`
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${colors[type] || colors.info};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 2001;
                font-weight: 500;
                max-width: 400px;
                text-align: center;
            ">
                ${message}
            </div>
        `);
        
        $('body').append(notification);
        
        // Auto-remove after 4 seconds for warnings, 3 seconds for others
        const delay = type === 'warning' ? 4000 : 3000;
        setTimeout(() => {
            notification.fadeOut(() => notification.remove());
        }, delay);
    }
    
    resetView() {
        // Reset to default view using the new township filter reset
        this.resetTownshipFilter();
    }
    
    setupEventListeners() {
        // Close info panel
        const closeBtn = document.getElementById('close-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.infoPanel.classList.remove('active');
            });
        }
        
        // Map click to clear selection
        this.map.on('click', () => {
            if (this.selectedFeature) {
                this.resetLayerStyle(this.selectedFeature, this.selectedFeature._layerConfig);
                this.selectedFeature = null;
            }
            this.infoPanel.classList.remove('active');
        });
    }
    
    onLayerLoaded() {
        this.layersLoaded++;
        
        if (this.layersLoaded >= this.totalLayers) {
            this.hideLoading();
        }
    }
    
    showLoading() {
        if (DeltaCountyConfig.ui.showLoadingSpinner && this.loadingIndicator) {
            this.loadingIndicator.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        if (this.loadingIndicator) {
            setTimeout(() => {
                this.loadingIndicator.classList.add('hidden');
            }, 500);
        }
    }
    
    showLayerError(layerName, error) {
        console.error(`Error with layer ${layerName}:`, error);
        // You could show a user-friendly notification here
    }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Starting Delta County App');
    
    // Check if required libraries are loaded
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet library not loaded');
        return;
    } else {
        console.log('✅ Leaflet library loaded');
    }
    
    if (typeof DeltaCountyConfig === 'undefined') {
        console.error('❌ Configuration not loaded');
        return;
    } else {
        console.log('✅ DeltaCountyConfig loaded');
    }
    
    console.log('✅ All dependencies loaded, initializing app...');
    
    // Initialize the application (Esri Leaflet check moved to layer loading)
    window.deltaCountyApp = new DeltaCountyApp();
    
    console.log('✅ DeltaCountyApp instance created');
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeltaCountyApp;
}