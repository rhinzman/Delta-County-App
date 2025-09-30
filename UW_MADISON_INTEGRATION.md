# UW-Madison Layers Integration

This document describes how the UW-Madison ArcGIS layers have been integrated into the Delta County GIS Application.

## What was added:

### 1. New UW-Madison Layer Manager (`js/uw-madison-layers.js`)
- Automatically discovers and loads layers from UW-Madison ArcGIS services
- Attempts multiple common URL patterns for UW-Madison services
- Provides fallback configurations if automatic discovery fails
- Handles different geometry types (points, lines, polygons) with appropriate styling

### 2. Integration with Main Application
- Modified `js/main.js` to initialize the UW-Madison layer manager
- Added UW-Madison layers to the layer control panel
- Layers are loaded asynchronously and added to the map

### 3. Service URL Patterns Tested
The system attempts to find the service at these URLs:
- `https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/service_16a040a49b1b46bba29922a712e32ebb/FeatureServer`
- `https://services.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/service_16a040a49b1b46bba29922a712e32ebb/FeatureServer`
- `https://gis.wisc.edu/arcgis/rest/services/service_16a040a49b1b46bba29922a712e32ebb/FeatureServer`
- `https://uwmadison.maps.arcgis.com/arcgis/rest/services/service_16a040a49b1b46bba29922a712e32ebb/FeatureServer`

## How to Test:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application in your browser** (should open automatically at http://localhost:8080)

3. **Check the browser console** for messages about UW-Madison layer discovery:
   - Look for "Initializing UW-Madison Layer Manager..."
   - If layers are found: "Found valid service at: [URL]"
   - If no layers found: "No UW-Madison services found with standard URL patterns"

4. **Check the layer control panel** (top-right) for any UW-Madison layers that were successfully added

## Troubleshooting:

### If no UW-Madison layers appear:

1. **Check the browser console** for error messages
2. **Verify the service URL** - you may need to:
   - Contact UW-Madison to get the exact service URL
   - Update the URL patterns in `js/uw-madison-layers.js`
   - Check if the service requires authentication

3. **Manual configuration** - if automatic discovery fails:
   - Edit `js/uw-madison-layers.js`
   - Update the `tryFallbackApproach()` method with the correct service URLs
   - Modify the layer configurations as needed

### Common issues:
- **CORS errors**: The service may not allow cross-origin requests
- **Authentication**: The service may require API keys or authentication
- **Service URL**: The actual service URL may be different from the patterns tested

## Customization:

### To modify layer styling:
Edit the `getDefaultStyle()` method in `js/uw-madison-layers.js`

### To add more service URL patterns:
Add URLs to the `possibleUrls` array in the `discoverServiceUrls()` method

### To customize popup content:
Modify the `layerConfig.popupTemplate` in the `processService()` method

## Next Steps:

1. **Get the correct service URL** from UW-Madison
2. **Test with the actual service** to ensure compatibility
3. **Customize styling and popups** based on the actual data fields
4. **Add any required authentication** if the service is secured

The system is designed to be flexible and will gracefully handle cases where the UW-Madison service is not available or requires different configuration.