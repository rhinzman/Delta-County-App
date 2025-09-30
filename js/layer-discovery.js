// Layer URL Discovery Helper for Delta County App
// This script helps you find the correct feature service URLs from your web map

class LayerDiscovery {
    constructor() {
        this.webmapId = 'beb65786ab294905a231f5ae19f03069';
        this.webmapUrl = `https://uw-mad.maps.arcgis.com/apps/mapviewer/index.html?webmap=${this.webmapId}`;
    }
    
    // Method 1: Monitor network requests (run this in browser console on the web map page)
    monitorNetworkRequests() {
        console.log('🔍 Monitoring network requests for feature services...');
        console.log('1. Open the web map in another tab');
        console.log('2. Open Developer Tools (F12)');
        console.log('3. Go to Network tab');
        console.log('4. Reload the page');
        console.log('5. Filter by "FeatureServer" or "MapServer"');
        console.log('6. Copy the URLs you find');
        
        // If running in console on the web map page, this might help intercept requests
        if (typeof window !== 'undefined' && window.location.href.includes('arcgis.com')) {
            this.interceptRequests();
        }
    }
    
    interceptRequests() {
        const originalFetch = window.fetch;
        const discoveredUrls = new Set();
        
        window.fetch = function(...args) {
            const url = args[0];
            
            if (typeof url === 'string' && (url.includes('FeatureServer') || url.includes('MapServer'))) {
                discoveredUrls.add(url.split('?')[0]); // Remove query parameters
                console.log('🎯 Found service URL:', url.split('?')[0]);
            }
            
            return originalFetch.apply(this, args);
        };
        
        // Store discovered URLs
        window.discoveredLayerUrls = discoveredUrls;
        
        console.log('✅ Request interceptor activated. Discovered URLs will be logged above.');
        console.log('💡 Access discovered URLs with: window.discoveredLayerUrls');
    }
    
    // Method 2: Try to access web map data (requires proper authentication)
    async tryWebMapData() {
        const webmapDataUrl = `https://www.arcgis.com/sharing/rest/content/items/${this.webmapId}/data?f=json`;
        
        try {
            console.log('🔄 Attempting to fetch web map data...');
            const response = await fetch(webmapDataUrl);
            const data = await response.json();
            
            if (data.error) {
                console.log('❌ Cannot access web map data:', data.error.message);
                console.log('💡 This web map may be private or require authentication');
                return null;
            }
            
            console.log('✅ Web map data retrieved successfully!');
            this.parseWebMapData(data);
            return data;
            
        } catch (error) {
            console.log('❌ Error fetching web map data:', error.message);
            console.log('💡 Try the network monitoring method instead');
            return null;
        }
    }
    
    parseWebMapData(data) {
        console.log('📊 Parsing web map data...');
        
        if (data.operationalLayers) {
            console.log(`\n🗂️  Found ${data.operationalLayers.length} operational layers:`);
            
            data.operationalLayers.forEach((layer, index) => {
                console.log(`\n📍 Layer ${index + 1}:`);
                console.log(`   Title: ${layer.title}`);
                console.log(`   URL: ${layer.url}`);
                console.log(`   Type: ${layer.layerType || 'Unknown'}`);
                console.log(`   Visible: ${layer.visibility !== false}`);
                
                if (layer.popupInfo) {
                    console.log(`   Has Popup: Yes`);
                }
            });
            
            // Generate config code
            this.generateConfigCode(data.operationalLayers);
        }
        
        if (data.baseMap) {
            console.log(`\n🗺️  Base Map: ${data.baseMap.title}`);
        }
    }
    
    generateConfigCode(layers) {
        console.log('\n📝 Generated configuration code for config.js:');
        console.log('// Copy and paste this into your config.js file\n');
        
        const configCode = layers.map((layer, index) => {
            const layerId = layer.title.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            
            return `    {
        id: '${layerId}',
        name: '${layer.title}',
        url: '${layer.url}',
        type: 'featureLayer',
        visible: ${layer.visibility !== false},
        style: {
            color: '#${Math.floor(Math.random()*16777215).toString(16)}',
            weight: 2,
            fillOpacity: 0.3,
            opacity: 0.8
        },
        popupTemplate: {
            title: '${layer.title}: {OBJECTID}',
            content: '<p><strong>Feature ID:</strong> {OBJECTID}</p>' // Update with actual field names
        }
    }`;
        }).join(',\n');
        
        console.log(`layers: [\n${configCode}\n]`);
    }
    
    // Method 3: Common Delta County service patterns
    suggestCommonUrls() {
        console.log('\n🎯 Common Delta County GIS service URL patterns:');
        console.log('Try these base URLs and explore their REST endpoints:\n');
        
        const commonBases = [
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/',
            'https://gis.deltacountymi.gov/arcgis/rest/services/',
            'https://services1.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/',
            'https://maps.deltacountymi.gov/arcgis/rest/services/'
        ];
        
        const commonServices = [
            'Delta_County_Parcels/FeatureServer/',
            'Delta_County_Townships/FeatureServer/',
            'Delta_County_Roads/FeatureServer/',
            'Delta_County_Boundaries/FeatureServer/',
            'Delta_County_Zoning/FeatureServer/',
            'Emergency_Services/FeatureServer/',
            'Public_Works/FeatureServer/'
        ];
        
        commonBases.forEach(base => {
            console.log(`\n📍 Base URL: ${base}`);
            commonServices.forEach(service => {
                console.log(`   Try: ${base}${service}0`);
            });
        });
        
        console.log('\n💡 Visit these URLs in your browser to see if they exist');
        console.log('💡 Look for "/rest/services" directories to browse available services');
    }
    
    // Method 4: Generate test URLs to try
    generateTestUrls() {
        const testUrls = [
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_Viewer_WFL1/FeatureServer/0',
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_Viewer_WFL1/FeatureServer/1',
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_Viewer_WFL1/FeatureServer/2',
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_Viewer_WFL1/FeatureServer/3',
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_Viewer_WFL1/FeatureServer/4',
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_Viewer_WFL1/FeatureServer/5',
            'https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_Viewer_WFL1/FeatureServer/6'
        ];
        
        console.log('\n🧪 Test these URLs to see which ones work:');
        testUrls.forEach((url, index) => {
            console.log(`${index + 1}. ${url}`);
        });
        
        return testUrls;
    }
    
    // Run all discovery methods
    async runAllMethods() {
        console.log('🚀 Starting layer URL discovery for Delta County App\n');
        
        console.log('📍 Target Web Map:', this.webmapUrl);
        console.log('📍 Web Map ID:', this.webmapId);
        
        // Method 1: Network monitoring instructions
        this.monitorNetworkRequests();
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        // Method 2: Try web map data
        await this.tryWebMapData();
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        // Method 3: Common patterns
        this.suggestCommonUrls();
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        // Method 4: Test URLs
        this.generateTestUrls();
        
        console.log('\n✅ Discovery complete! Use any of the methods above to find your layer URLs.');
    }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    const discovery = new LayerDiscovery();
    discovery.runAllMethods();
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayerDiscovery;
}