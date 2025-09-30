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
        }
        
        // Setup click interaction for selection
        if (DeltaCountyConfig.interaction.enableSelection) {
            layer.on('click', (e) => {
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
            
            console.log(`Successfully integrated ${deltaLayers.length} Delta County layers`);
            
            // Update layer control to include Delta County layers
            if (deltaLayers.length > 0) {
                this.updateLayerControlWithDeltaLayers(deltaLayers);
                // Update legend to include new layers
                this.updateLegend();
            }
            
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
            
        } catch (error) {
            console.error('❌ Failed to initialize UW-Madison Service:', error);
        }
    }
    
    async retryUWMadisonService() {
        console.log('🔄 Retrying UW-Madison Service initialization...');
        
        if (typeof L.esri !== 'undefined') {
            console.log('✅ Esri Leaflet now available, proceeding with UW-Madison initialization');
            this.initializeUWMadisonService();
        } else {
            console.error('❌ Esri Leaflet still not available for UW-Madison service');
        }
    }
    
    updateLayerControlWithUWLayers(uwLayers) {
        // Add UW-Madison layers to the existing layer control
        setTimeout(() => {
            if (this.layerControl) {
                // Initialize layer names tracker if not exists
                if (!this.addedLayerNames) {
                    this.addedLayerNames = new Set();
                }
                
                uwLayers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer) {
                        // Normalize layer name for comparison (remove emojis and extra spaces)
                        const normalizedName = layerConfig.name.replace(/[🏠🏞️🛣️📄🏛️]/g, '').trim().toLowerCase();
                        
                        // Check if we already have a layer with this name (ignoring case and emojis)
                        let isDuplicate = false;
                        for (const existingName of this.addedLayerNames) {
                            if (existingName.includes('address points') && normalizedName.includes('address points')) {
                                isDuplicate = true;
                                console.log(`🚫 Skipping duplicate UW-Madison address points layer: ${layerConfig.name}`);
                                break;
                            }
                        }
                        
                        if (!isDuplicate) {
                            this.layerControl.addOverlay(
                                layerConfig.leafletLayer, 
                                `🏛️ ${layerConfig.name}`
                            );
                            this.addedLayerNames.add(normalizedName);
                            console.log(`✅ Added UW-Madison layer: ${layerConfig.name}`);
                        }
                    }
                });
                console.log(`📋 Processed ${uwLayers.length} UW-Madison layers`);
            }
        }, 1500); // Delay to ensure layer control is ready
    }

    async retryDeltaCountyService() {
        console.log('🔄 Retrying Delta County Service initialization...');
        
        if (typeof L.esri !== 'undefined') {
            console.log('✅ Esri Leaflet now available, proceeding with initialization');
            this.initializeDeltaCountyService();
        } else {
            console.error('❌ Esri Leaflet still not available after retry');
            console.log('� Switching to fallback GeoJSON service...');
            
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
        // This will be called after the regular layer control is set up
        // We'll add the Delta County layers to the existing control
        setTimeout(() => {
            if (this.layerControl) {
                // Track added layer names to prevent duplicates
                if (!this.addedLayerNames) {
                    this.addedLayerNames = new Set();
                }
                
                deltaLayers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer) {
                        // Normalize layer name for comparison (remove emojis and extra spaces)
                        const normalizedName = layerConfig.name.replace(/[🏠🏞️🛣️📄🏛️]/g, '').trim().toLowerCase();
                        
                        // Check if we already have a layer with this name (ignoring case and emojis)
                        let isDuplicate = false;
                        for (const existingName of this.addedLayerNames) {
                            if (existingName.includes('address points') && normalizedName.includes('address points')) {
                                isDuplicate = true;
                                console.log(`🚫 Skipping duplicate address points layer: ${layerConfig.name}`);
                                break;
                            }
                        }
                        
                        if (!isDuplicate) {
                            this.layerControl.addOverlay(layerConfig.leafletLayer, layerConfig.name);
                            this.addedLayerNames.add(normalizedName);
                            console.log(`✅ Added Delta County layer: ${layerConfig.name}`);
                        }
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
        
        // Township selector will be added after Delta County service loads
        // to ensure the township layer is available
        console.log('📋 Basic controls setup complete, township selector will be added after service initialization');
    }
    
    addLayerControl() {
        const overlayMaps = {};
        
        Object.keys(this.layers).forEach(layerId => {
            const layerData = this.layers[layerId];
            overlayMaps[layerData.config.name] = layerData.layer;
        });
        
        this.layerControl = L.control.layers(this.baseMaps, overlayMaps, {
            position: 'topright',
            collapsed: false
        }).addTo(this.map);
        
        // Initialize layer names tracker for preventing duplicates
        this.addedLayerNames = new Set();
    }
    
    addLegend() {
        const legend = L.control({ position: 'bottomleft' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = '<h4>Map Layers</h4>';
            
            // Add Delta County layers
            if (this.deltaCountyService && this.deltaCountyService.layers) {
                this.deltaCountyService.layers.forEach(layerConfig => {
                    if (layerConfig.visible && layerConfig.leafletLayer) {
                        const color = layerConfig.style?.color || layerConfig.style?.fillColor || '#2E86AB';
                        div.innerHTML += `<i style="background: ${color}; border: 1px solid #333;"></i><span>${layerConfig.name}</span><br>`;
                    }
                });
            }
            
            // Add UW-Madison layers
            if (this.uwMadisonService && this.uwMadisonService.layers) {
                this.uwMadisonService.layers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer) {
                        const color = layerConfig.style?.color || layerConfig.style?.fillColor || '#A23B72';
                        div.innerHTML += `<i style="background: ${color}; border: 1px solid #333;"></i><span>🏛️ ${layerConfig.name}</span><br>`;
                    }
                });
            }
            
            // Add any manual layers from UW service
            if (this.uwMadisonService && this.uwMadisonService.manualLayers) {
                this.uwMadisonService.manualLayers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer) {
                        const color = layerConfig.style?.color || layerConfig.style?.fillColor || '#F18F01';
                        div.innerHTML += `<i style="background: ${color}; border: 1px solid #333;"></i><span>🏛️ ${layerConfig.name}</span><br>`;
                    }
                });
            }
            
            // Add any other layers from the original config
            DeltaCountyConfig.layers.forEach(layerConfig => {
                if (layerConfig.visible) {
                    const color = layerConfig.style?.color || '#85929E';
                    div.innerHTML += `<i style="background: ${color}; border: 1px solid #333;"></i><span>${layerConfig.name}</span><br>`;
                }
            });
            
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