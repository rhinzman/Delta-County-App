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
        if (baseMaps['Dark Theme']) {
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
        const header = this.infoPanel.querySelector('.panel-header h3');
        
        header.textContent = `${layerConfig.name} Details`;
        
        let html = '<div class="feature-details">';
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
                uwLayers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer) {
                        this.layerControl.addOverlay(
                            layerConfig.leafletLayer, 
                            `🏛️ ${layerConfig.name}`
                        );
                    }
                });
                console.log(`📋 Added ${uwLayers.length} UW-Madison layers to layer control`);
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
                deltaLayers.forEach(layerConfig => {
                    if (layerConfig.leafletLayer) {
                        this.layerControl.addOverlay(layerConfig.leafletLayer, layerConfig.name);
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
        
        // Setup township selector
        if (DeltaCountyConfig.ui.showTownshipSelector) {
            this.addTownshipSelector();
        }
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
    }
    
    addLegend() {
        const legend = L.control({ position: 'bottomleft' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = '<h4>Legend</h4>';
            
            DeltaCountyConfig.layers.forEach(layerConfig => {
                if (layerConfig.visible) {
                    const color = layerConfig.style.color || '#85929E';
                    div.innerHTML += `<i style="background: ${color}"></i><span>${layerConfig.name}</span><br>`;
                }
            });
            
            return div;
        };
        
        legend.addTo(this.map);
    }
    
    addTownshipSelector() {
        const TownshipControl = L.Control.extend({
            onAdd: (map) => {
                const div = L.DomUtil.create('div', 'query-control');
                const select = L.DomUtil.create('select', 'whereClauseSelect', div);
                
                DeltaCountyConfig.townships.forEach(township => {
                    const option = L.DomUtil.create('option', '', select);
                    option.value = township;
                    option.innerHTML = township;
                });
                
                L.DomEvent.addListener(select, 'change', (e) => {
                    this.onTownshipChange(e.target.value);
                });
                
                return div;
            }
        });
        
        new TownshipControl({ position: 'bottomright' }).addTo(this.map);
    }
    
    onTownshipChange(selectedTownship) {
        if (selectedTownship === "Choose a Township") {
            this.resetView();
            return;
        }
        
        const townshipLayer = this.layers.townships;
        if (!townshipLayer) {
            console.warn('Township layer not found');
            return;
        }
        
        // Query and zoom to selected township
        townshipLayer.layer.query()
            .where(`NAME = '${selectedTownship}'`)
            .run((error, featureCollection) => {
                if (error) {
                    console.error('Township query error:', error);
                    return;
                }
                
                if (featureCollection.features.length > 0) {
                    const bounds = L.geoJson(featureCollection).getBounds();
                    this.map.fitBounds(bounds, { padding: [20, 20] });
                    
                    // Highlight selected township
                    this.highlightTownship(featureCollection.features[0]);
                }
            });
    }
    
    highlightTownship(feature) {
        // Reset all layer styles first
        Object.keys(this.layers).forEach(layerId => {
            const layerData = this.layers[layerId];
            layerData.layer.setStyle(layerData.config.style);
        });
        
        // Highlight the selected township
        const townshipLayer = this.layers.townships;
        if (townshipLayer) {
            townshipLayer.layer.eachLayer(layer => {
                if (layer.feature && layer.feature.properties.NAME === feature.properties.NAME) {
                    layer.setStyle(DeltaCountyConfig.interaction.selectedStyle);
                }
            });
        }
    }
    
    resetView() {
        // Reset to default view
        this.map.setView(DeltaCountyConfig.map.center, DeltaCountyConfig.map.zoom);
        
        // Reset all layer styles
        Object.keys(this.layers).forEach(layerId => {
            const layerData = this.layers[layerId];
            layerData.layer.setStyle(layerData.config.style);
        });
        
        // Reset selection
        this.selectedFeature = null;
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