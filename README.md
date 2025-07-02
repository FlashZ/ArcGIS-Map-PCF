# ArcGIS Map Component for PowerApps (PCF)

An easy-to-use custom PowerApps component that embeds interactive ArcGIS WebMaps into your applications using the PowerApps Component Framework.

## Quick Start

1. **Upload oauth-callback.html** as a webresource
   - Get the resource url and update in index.ts
  
2. **Build the Solution**  
   - use pac cli and npm to build the solution.

3. **Import to PowerApps**  
   - Log in to PowerApps and navigate to **Solutions**.
   - Click **Import**, select the downloaded `solution.zip`, and follow the prompts.

3. **Add the Control**  
   - Open your app in PowerApps.
   - Go to **Insert** > **Custom** > **ArcGIS Map Component**.
   - Place the control on your canvas and configure its properties.

## Description

This PCF control provides seamless integration of ArcGIS WebMaps into PowerApps. It simplifies map embedding by handling ArcGIS authentication, enabling dynamic map loading, and supporting customizable widgets—all within PowerApps.

## Features

- **Integrated ArcGIS Authentication:** Easily configure OAuth authentication using your ArcGIS client ID.
- **Dynamic WebMap Loading:** Display specific WebMaps by setting the WebMap ID.
- **Lookup and Zoom:** Automatically search for features and zoom to particular map areas.
- **Customizable Widgets:** Supports built-in controls like LayerList, Home, and Zoom.
- **Logo and Styling Options:** Add a custom logo and configure visual aspects.
- **Flexible Projection Settings:** Set your desired spatial reference (default is WKID 4326).

## Configuration

### Required Parameters
- **clientId:** Your ArcGIS application client ID.
- **webMapId:** The ID of the ArcGIS WebMap to display.

### Optional Parameters
- **portalUrl:** (Default: `https://www.arcgis.com`) URL for alternative ArcGIS portals.
- **lookupLayerTitle / lookupFieldName / lookupFieldValue:** Parameters to enable feature lookup.
- **logoUrl:** URL for a custom logo.
- **projectionType:** Spatial reference WKID (default: `4326`).

## Usage

1. Add the control to your PowerApps app.
2. Configure properties in the properties panel:
   ```plaintext
   portalUrl: "https://www.arcgis.com"
   clientId: "<Your ArcGIS Client ID>"
   webMapId: "<Your WebMap ID>"
   ```
3. Save, publish, and test your app.

## Troubleshooting

- **Authentication Issues:** If authentication fails, verify your clientId and ensure your ArcGIS account has the appropriate permissions. See our [FAQ](#) for common fixes.
- **Display Problems:** Ensure that the WebMap ID is correct. Check network console for errors regarding map loading.
- **Environment Issues:** Tested with AGOL, currently doesn't support Enterprise.
