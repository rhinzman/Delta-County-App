// Manual UW-Madison Service Configuration
// Use this file to manually configure UW-Madison services once you have the correct URLs

const UWMadisonManualConfig = {
    // Service configurations - update these with actual service URLs
    services: [
        {
            itemId: '16a040a49b1b46bba29922a712e32ebb',
            name: 'UW-Madison Service 1',
            // Replace with actual service URL from UW-Madison
            serviceUrl: null, // Example: 'https://gis.wisc.edu/arcgis/rest/services/YourService/FeatureServer'
            enabled: false,
            description: 'Original UW-Madison item',
            contactInfo: {
                email: 'gis@geography.wisc.edu',
                department: 'UW-Madison Geography'
            }
        },
        {
            itemId: '18855e2cb43a4c7aa6212f1692b35d7d',
            name: 'UW-Madison Service 2',
            // Replace with actual service URL from UW-Madison
            serviceUrl: null, // Example: 'https://gis.wisc.edu/arcgis/rest/services/YourService2/FeatureServer'
            enabled: false,
            description: 'Layer from map viewer',
            contactInfo: {
                email: 'gis@geography.wisc.edu',
                department: 'UW-Madison Geography'
            }
        }
    ],

    // Instructions for manual configuration
    instructions: `
🔧 Manual Configuration Instructions:

1. Contact UW-Madison GIS Team:
   📧 Email: gis@geography.wisc.edu
   🏢 Department: UW-Madison Geography Department

2. Request the following information:
   • REST service endpoint URLs for item IDs:
     - 16a040a49b1b46bba29922a712e32ebb
     - 18855e2cb43a4c7aa6212f1692b35d7d
   • Authentication requirements (if any)
   • Available layers and field information

3. Update this configuration:
   • Set serviceUrl for each service
   • Set enabled: true for services you want to load
   • Add authentication tokens if required

4. Example configuration:
   {
     itemId: '16a040a49b1b46bba29922a712e32ebb',
     serviceUrl: 'https://gis.wisc.edu/arcgis/rest/services/YourActualService/FeatureServer',
     enabled: true,
     authToken: 'your_token_here' // if required
   }
    `,

    // Get enabled services for loading
    getEnabledServices() {
        return this.services.filter(service => service.enabled && service.serviceUrl);
    },

    // Validate service configuration
    validateService(service) {
        if (!service.serviceUrl) {
            console.warn(`Service ${service.name} has no serviceUrl configured`);
            return false;
        }
        if (!service.serviceUrl.includes('FeatureServer')) {
            console.warn(`Service ${service.name} URL should point to a FeatureServer`);
            return false;
        }
        return true;
    },

    // Create layer configurations from manual config
    createLayerConfigs() {
        const enabledServices = this.getEnabledServices();
        const layerConfigs = [];

        enabledServices.forEach(service => {
            if (this.validateService(service)) {
                // Create a basic layer config that can be enhanced once the service is tested
                layerConfigs.push({
                    id: `manual_${service.itemId}`,
                    name: service.name,
                    serviceUrl: service.serviceUrl,
                    itemId: service.itemId,
                    authToken: service.authToken || null,
                    description: service.description,
                    contactInfo: service.contactInfo
                });
            }
        });

        return layerConfigs;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UWMadisonManualConfig;
}