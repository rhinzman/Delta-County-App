// UW-Madison Service Access Guide
// This file provides guidance for accessing UW-Madison GIS services

const UWMadisonServiceGuide = {
    itemId: '16a040a49b1b46bba29922a712e32ebb',
    
    // Common access patterns for UW-Madison services
    accessMethods: {
        public: {
            description: 'Publicly accessible services',
            examples: [
                'https://geodata.wisc.edu/arcgis/rest/services/',
                'https://maps.wisc.edu/arcgis/rest/services/'
            ]
        },
        campus: {
            description: 'Campus network restricted',
            note: 'May require VPN or campus network access'
        },
        authenticated: {
            description: 'Requires UW-Madison credentials',
            note: 'Contact UW-Madison GIS team for access'
        }
    },
    
    // Contact information
    contacts: {
        gisTeam: {
            department: 'UW-Madison Geography Department',
            email: 'gis@geography.wisc.edu',
            website: 'https://geography.wisc.edu/gis/'
        },
        helpDesk: {
            department: 'UW-Madison IT Services',
            website: 'https://it.wisc.edu/'
        }
    },
    
    // Instructions for getting service access
    getInstructions() {
        return `
🏛️ UW-Madison GIS Service Access Guide

📍 Item ID: ${this.itemId}
🔗 Item URL: https://uw-mad.maps.arcgis.com/home/item.html?id=${this.itemId}

🔓 To access this service:

1. 📞 Contact UW-Madison GIS Team:
   • Email: ${this.contacts.gisTeam.email}
   • Website: ${this.contacts.gisTeam.website}

2. 📝 Request Information:
   • REST service endpoint URL
   • Access requirements (public/campus/authenticated)
   • Any required API keys or tokens

3. 🌐 Common UW-Madison Service Patterns:
   • Public: ${this.accessMethods.public.examples.join(', ')}
   • Campus: Requires VPN or campus network
   • Private: Requires authentication

4. ⚙️ Update Configuration:
   • Edit js/uw-madison-layers.js
   • Add the correct service URL
   • Configure authentication if needed

📋 Service Details Needed:
   • Full REST endpoint URL
   • Layer information and field names
   • Styling preferences
   • Access permissions

⚠️ Note: This item appears to be private or requires special access.
        `;
    },
    
    // Create a visual indicator in the map
    createAccessNotice() {
        return {
            title: '🏛️ UW-Madison Service Access Required',
            content: `
                <div style="max-width: 300px; padding: 15px; font-family: Arial, sans-serif;">
                    <h4 style="color: #c5050c; margin-top: 0;">UW-Madison GIS Data</h4>
                    <p><strong>Item ID:</strong> ${this.itemId}</p>
                    <p><strong>Status:</strong> 🔒 Access Required</p>
                    
                    <hr style="margin: 15px 0;">
                    
                    <h5>📞 Next Steps:</h5>
                    <ol style="padding-left: 20px; font-size: 14px;">
                        <li>Contact UW-Madison GIS team</li>
                        <li>Request service endpoint URL</li>
                        <li>Update configuration file</li>
                    </ol>
                    
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 15px;">
                        <strong>Contact:</strong><br>
                        📧 ${this.contacts.gisTeam.email}<br>
                        🌐 <a href="${this.contacts.gisTeam.website}" target="_blank">GIS Resources</a>
                    </div>
                </div>
            `
        };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UWMadisonServiceGuide;
}