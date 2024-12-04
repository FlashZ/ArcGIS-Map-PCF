# ArcGIS Map Component for PowerApps

Integrate interactive ArcGIS WebMaps into your PowerApps applications using this custom PCF (PowerApps Component Framework) control.

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [License](#license)
- [Author](#author)
- [Acknowledgements](#acknowledgements)
- [Screenshots](#screenshots)
- [Known Issues](#known-issues)
- [Contributing](#contributing)
- [Version History](#version-history)

## Description

This project provides a custom PCF control that embeds ArcGIS WebMaps into PowerApps. It allows for dynamic map integration, including authentication with ArcGIS, displaying specified WebMaps, performing layer lookups, and customizing map widgets and logos.

## Features

- **ArcGIS Authentication**: Supports OAuth authentication with ArcGIS using a client ID.
- **WebMap Integration**: Loads and displays an ArcGIS WebMap by its ID.
- **Layer Lookup**: Searches for features within a specified layer based on field values and zooms to them.
- **Customizable Widgets**: Adds default widgets like LayerList, Home, and Zoom controls.
- **Custom Logo**: Allows adding a custom logo to the map view.
- **Projection Support**: Supports setting the spatial reference projection type.

## Prerequisites

- **PowerApps environment** with access to import custom solutions.
- **ArcGIS account** with access to desired WebMaps.
- **ArcGIS application client ID** for OAuth authentication.

## Installation

1. **Download the compiled solution**:

   - Obtain the `solution.zip` file from the [Releases](https://github.com/flashz/arcgis-map-component-powerapps/releases) section of this repository.

2. **Import the solution into your PowerApps environment**:

   - Log in to your PowerApps environment.
   - Navigate to **Solutions** in the left-hand menu.
   - Click on **Import** in the top menu.
   - Select the downloaded `solution.zip` file.
   - Follow the prompts to complete the import process.

3. **Verify the solution components**:

   - After import, the solution should appear in your list of solutions.
   - Expand the solution to see the included components, which should include the ArcGIS Map Component control.

## Usage

1. **Add the control to your PowerApps app**:

   - Open the app where you want to use the control.
   - In the app editor, select **Insert** > **Custom** > **ArcGIS Map Component**.
   - Place the control on your canvas or add it to your model-driven app form.

2. **Configure the control properties**:

   - Select the control to view its properties.
   - Set the following properties:

     - **portalUrl**: (Optional) The ArcGIS portal URL (default: `https://www.arcgis.com`).
     - **clientId**: Your ArcGIS application client ID (**Required**).
     - **webMapId**: The ID of the WebMap to display (**Required**).
     - **lookupLayerTitle**: (Optional) The title of the layer to perform a lookup on.
     - **lookupFieldName**: (Optional) The field name to search within the lookup layer.
     - **lookupFieldValue**: (Optional) The value to search for in the lookup field.
     - **logoUrl**: (Optional) URL of a custom logo to display on the map.
     - **projectionType**: (Optional) The spatial reference WKID (default: `4326`).

3. **Run the app**:

   - Save and publish your app.
   - Test the control to ensure it loads the map correctly and responds to the configured parameters.

## Configuration

### Required Parameters

- **clientId**: Obtain this from your ArcGIS application credentials.
- **webMapId**: The ID of the WebMap you wish to display.

### Optional Parameters

- **portalUrl**: Customize if using a portal other than the default ArcGIS Online.
- **lookupLayerTitle**, **lookupFieldName**, **lookupFieldValue**: Set these to perform automatic zooming to a specific feature.
- **projectionType**: Change if a different spatial reference is needed.

## Dependencies

- **ArcGIS Account**: Required for accessing secured WebMaps and services.
- **PowerApps Component Framework**: For integrating custom controls into PowerApps.

## License

This project is licensed under the [MIT License](LICENSE).

## Author

- **[Nick Kerr-Bell](mailto:nick@Lanflat.net)**
- **[FlashZ](https://github.com/FlashZ)**

## Acknowledgements

- **Esri** for the ArcGIS JavaScript API.
- **Microsoft** for the PowerApps Component Framework.

## Known Issues

- **NOT WORKING IN POWERAPPS**: Authentication doesn't seem to work correctly, in the Powerapps Test Harness the PCF will display and pull data according to the permissions to your auth however will fail within a Powerapps environment, mostl likely due to callback url issues. Theoritically stripping all Auth in the code would all public data layers to work fine.


## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Version History

- **v1.0.0**: Initial release.

---
