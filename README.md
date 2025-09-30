# Delta County GIS Application

A modern, interactive web mapping application for Delta County, Michigan, built with Leaflet and Esri Leaflet.

## Features

- **Interactive Map**: Pan, zoom, and explore Delta County with multiple base map options
- **Layer Management**: Toggle visibility of different GIS layers (parcels, townships, roads, etc.)
- **Township Selector**: Quick navigation to specific townships
- **Feature Selection**: Click on map features to view detailed information
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface with loading indicators and smooth animations

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Web server (for local development) or hosting platform
- Access to the Delta County GIS feature services

### Installation

1. **Clone or download** this repository to your local machine
2. **Update layer URLs** in `js/config.js` with actual feature service URLs
3. **Serve the files** using a web server (see deployment options below)

### Configuration

#### Step 1: Update Layer URLs

Edit `js/config.js` and replace the placeholder URLs with actual feature service URLs from your Delta County web map:

```javascript
// Find this section in config.js
layers: [
    {
        id: 'counties',
        name: 'County Boundaries',
        url: 'YOUR_ACTUAL_COUNTY_SERVICE_URL', // Replace this
        // ... rest of configuration
    },
    // ... more layers
]
```

#### Step 2: Get Feature Service URLs

To find the correct URLs for your web map (https://uw-mad.maps.arcgis.com/apps/mapviewer/index.html?webmap=beb65786ab294905a231f5ae19f03069):

**Method 1: Browser Developer Tools**
1. Open the web map in your browser
2. Open Developer Tools (F12)
3. Go to Network tab
4. Reload the page
5. Filter by "FeatureServer" or "MapServer"
6. Copy the URLs and update config.js

**Method 2: Contact Data Provider**
- Contact Delta County GIS department
- Request feature service URLs for the layers you need

**Method 3: ArcGIS REST Services Directory**
- Look for a REST services directory URL
- Browse available services and copy URLs

## Deployment

### Local Development

**Option 1: Python HTTP Server**
```bash
# Navigate to the project directory
cd Delta-County-App

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Open browser to http://localhost:8000
```

**Option 2: Node.js HTTP Server**
```bash
# Install http-server globally
npm install -g http-server

# Navigate to project directory
cd Delta-County-App

# Start server
http-server

# Open browser to displayed URL (usually http://localhost:8080)
```

**Option 3: Live Server (VS Code)**
- Install Live Server extension in VS Code
- Right-click on index.html
- Select "Open with Live Server"

### Production Deployment

**GitHub Pages**
1. Create a GitHub repository
2. Upload your files
3. Enable GitHub Pages in repository settings
4. Access via `https://yourusername.github.io/repository-name`

**Netlify**
1. Create account at netlify.com
2. Drag and drop your project folder
3. Get instant URL

**Web Hosting Provider**
- Upload files to any web hosting provider
- Ensure HTTPS is enabled for secure map tile loading

## File Structure

```
Delta-County-App/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # Styles and responsive design
├── js/
│   ├── config.js          # Configuration and layer definitions
│   └── main.js            # Main application logic
├── data/                  # Optional: Local data files
├── img/                   # Images and icons
├── lib/                   # Optional: Local JavaScript libraries
└── README.md              # This file
```

## Customization

### Adding New Layers

1. Add layer configuration to `DeltaCountyConfig.layers` in `config.js`:

```javascript
{
    id: 'newLayer',
    name: 'My New Layer',
    url: 'https://your-service-url/FeatureServer/0',
    type: 'featureLayer',
    visible: true,
    style: {
        color: '#FF0000',
        weight: 2,
        fillOpacity: 0.3
    },
    popupTemplate: {
        title: 'Feature: {FIELD_NAME}',
        content: '<p><strong>Details:</strong> {FIELD_NAME}</p>'
    }
}
```

### Modifying Styles

Edit the `style` object in each layer configuration:

```javascript
style: {
    color: '#FF0000',        // Border color
    weight: 2,               // Border width
    fillColor: '#00FF00',    // Fill color
    fillOpacity: 0.5,        // Fill transparency
    opacity: 1               // Border transparency
}
```

### Changing Base Maps

Modify `DeltaCountyConfig.baseMaps` in `config.js`:

```javascript
baseMaps: {
    'Custom Map': {
        url: 'https://your-tile-server/{z}/{x}/{y}.png',
        attribution: 'Your attribution'
    }
}
```

## Troubleshooting

### Common Issues

**Layers not loading**
- Check browser console for error messages
- Verify feature service URLs are correct and accessible
- Ensure services support CORS (cross-origin requests)

**Map not displaying**
- Check internet connection
- Verify Leaflet and Esri Leaflet libraries are loading
- Check browser console for JavaScript errors

**Slow performance**
- Reduce number of visible layers
- Consider using map services instead of feature services for large datasets
- Implement layer visibility based on zoom level

### Browser Console

Open browser developer tools (F12) and check the Console tab for error messages. Common errors:

- `404 Not Found`: Service URL is incorrect
- `CORS error`: Service doesn't allow cross-origin requests
- `403 Forbidden`: Service requires authentication

## Support

For technical support:
1. Check browser console for errors
2. Verify all URLs in config.js are correct
3. Test layer URLs directly in browser
4. Contact your GIS administrator for service access

## License

This project is open source. Modify and distribute as needed.

## Credits

- Built with [Leaflet](https://leafletjs.com/)
- GIS services via [Esri Leaflet](https://esri.github.io/esri-leaflet/)
- Base maps from [Stadia Maps](https://stadiamaps.com/) and [OpenStreetMap](https://openstreetmap.org/)
- Data provided by Delta County, Michigan