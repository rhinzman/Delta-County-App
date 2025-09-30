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
        this.totalLayers = DeltaCountyConfig.layers.length;
        this.deltaCountyServiceManager = null;
        
        this.init();
    }
    
    init() {
        this.createMap();
        this.setupEventListeners();
        this.loadLayers();
        this.initializeDeltaCountyService();
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
        this.showLoading();
        
        DeltaCountyConfig.layers.forEach(layerConfig => {
            this.addLayer(layerConfig);
        });
    }
    
    addLayer(layerConfig) {
        try {
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
        
        try {
            this.deltaCountyServiceManager = new DeltaCountyServiceManager(this.map);
            const deltaLayers = await this.deltaCountyServiceManager.initialize();
            
            console.log(`Successfully integrated ${deltaLayers.length} Delta County layers`);
            
            // Update layer control to include Delta County layers
            if (deltaLayers.length > 0) {
                this.updateLayerControlWithDeltaLayers(deltaLayers);
            }
        } catch (error) {
            console.error('Failed to initialize Delta County Service:', error);
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
    // Check if required libraries are loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        return;
    }
    
    if (typeof L.esri === 'undefined') {
        console.error('Esri Leaflet library not loaded');
        return;
    }
    
    if (typeof DeltaCountyConfig === 'undefined') {
        console.error('Configuration not loaded');
        return;
    }
    
    // Initialize the application
    window.deltaCountyApp = new DeltaCountyApp();
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeltaCountyApp;
}