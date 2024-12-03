"use strict"; // Enforce strict mode for better error checking and avoiding unsafe actions

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import esriConfig from "@arcgis/core/config";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import LayerList from "@arcgis/core/widgets/LayerList";
import Home from "@arcgis/core/widgets/Home";
import Zoom from "@arcgis/core/widgets/Zoom";
import Expand from "@arcgis/core/widgets/Expand";
import esriId from "@arcgis/core/identity/IdentityManager";

/**
 * MapComponent class implementing the PCF StandardControl interface.
 * This component integrates ArcGIS maps into a PowerApps component.
 */
export class MapComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement; // The main container for the component
  private _mapViewContainer: HTMLDivElement; // Container specifically for the map view
  private _mapView: MapView | null = null; // The MapView instance
  private _controlViewRendered: boolean;
  private _context: ComponentFramework.Context<IInputs>; // The context provided by the PowerApps framework
  private _notifyOutputChanged: () => void; // Callback function to notify the framework of output changes

  // Replace with your actual Client ID and Secret securely
  private clientId: string = '5JN2FgmAIUUdXZq7'; // Replace with your real Client ID
  private clientSecret: string = '7f0cf8002ea446048c962d2a6414695c'; // Replace with your real Client Secret
  private tokenExpiry: number = 0; // To track token expiry
  private accessToken: string = ''; // To store the current access token
  private logoUrl: string = ''; // Optional: URL for the logo

  /**
   * Initializes the control instance.
   * @param context The context for the control.
   * @param notifyOutputChanged A function to notify the framework that the control has new outputs.
   * @param state The control state.
   * @param container The HTML element to render the control in.
   */
  public async init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): Promise<void> {
    this._context = context;
    this._notifyOutputChanged = notifyOutputChanged;
    this._container = container;
  
    // Set container dimensions
    this._container.style.width = '800px';
    this._container.style.height = '600px';
  
    // Create and style the map view container
    this._mapViewContainer = document.createElement('div');
    this._mapViewContainer.style.width = '100%';
    this._mapViewContainer.style.height = '100%';
    this._container.appendChild(this._mapViewContainer);
  
    // Set the portal URL
    esriConfig.portalUrl = "https://ultrafast.maps.arcgis.com";
  
    try {
      // Obtain and register the access token
      this.accessToken = await this.getAccessToken(this.clientId, this.clientSecret);
      esriId.registerToken({
        server: "https://ultrafast.maps.arcgis.com",
        token: this.accessToken,
        expires: this.tokenExpiry
      });
  
      // Initialize the map
      await this.initializeMap(context.parameters.webMapId.raw || "");
    } catch (error) {
      console.error("Initialization failed:", error);
      this._mapViewContainer.innerText = "Failed to load the map. Please try again later.";
    }
  
    // Track container resize events
    context.mode.trackContainerResize(true);
  }
  /**
   * Registers tokens for all servers used by the WebMap.
   * @param accessToken The access token obtained via client credentials.
   * @param webMap The loaded WebMap instance.
   */
  private registerTokenForServers(accessToken: string, webMap: WebMap): void {
    const servers = new Set<string>();

    webMap.allLayers.forEach(layer => {
      const url = (layer as any).url;
      if (url) {
        const server = `${url.split("/arcgis/rest/services")[0]}`;
        console.log(`Extracted server URL: ${server}`);
        servers.add(server);
      }
    });

    servers.forEach(server => {
      esriId.registerToken({
        server: server,
        token: accessToken,
        expires: this.tokenExpiry // Ensure correct expiry
      });
      console.log(`Token registered for server: ${server}`);
    });
  }

  /**
   * Obtains an access token using the Client Credentials Flow.
   * @param clientId The client ID of your ArcGIS application.
   * @param clientSecret The client secret of your ArcGIS application.
   * @returns The access token as a string.
   */
  private async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('f', 'json');

    try {
      const response = await fetch('https://ultrafast.maps.arcgis.com/sharing/rest/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      console.log('Access token response:', data); // Debug log

      if (data.access_token) {
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        return data.access_token;
      } else {
        throw new Error(`Failed to obtain access token: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error obtaining access token:', error);
      throw error;
    }
  }

  /**
   * Verifies the token by fetching portal details.
   * @param accessToken The access token to verify.
   */
  private async verifyToken(accessToken: string): Promise<void> {
    const portalSelfUrl = `https://ultrafast.maps.arcgis.com/sharing/rest/portals/self?f=json&token=${accessToken}`;
    
    try {
      const response = await fetch(portalSelfUrl);
      const data = await response.json();

      if (data.error) {
        console.error("Token verification failed:", data.error);
        throw new Error(`Token verification failed: ${data.error.message}`);
      } else {
        console.log("Token is valid. Portal details:", data);
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      throw error;
    }
  }

  /**
   * Ensures that the current token is valid. If it's about to expire, renews it.
   * @returns The valid access token.
   */
  private async ensureValidToken(): Promise<string> {
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (Date.now() > (this.tokenExpiry - bufferTime)) {
      // Token is about to expire or has expired, renew it
      this.accessToken = await this.getAccessToken(this.clientId, this.clientSecret);
      console.log('Access token renewed:', this.accessToken); // Debug log

      // Verify the new token
      await this.verifyToken(this.accessToken);

      // Re-register tokens for all servers
      if (this._mapView && this._mapView.map) {
        this.registerTokenForServers(this.accessToken, this._mapView.map as WebMap);
      }
    }
    return this.accessToken;
  }

  /**
   * Initializes the WebMap and MapView.
   * @param webMapId The ID of the WebMap.
   */
  private async initializeMap(webMapId: string): Promise<void> {
    // Ensure the token is valid
    const validToken = await this.ensureValidToken();

    const webMap = new WebMap({
      portalItem: {
        id: webMapId
      }
    });

    try {
      // Wait for the WebMap to load
      await webMap.load();
      console.log("Loaded WebMap layers:", webMap.layers);

      // Initialize the MapView with the WebMap
      this._mapView = new MapView({
        container: this._mapViewContainer,
        map: webMap,
        ui: {
          components: ["attribution"] // Only show the attribution component by default
        }
      });

      // Add a passive event listener for wheel events to improve performance
      this._mapViewContainer.addEventListener('wheel', () => { }, { passive: true });

      // Wait for the MapView to be ready
      await this._mapView.when();
      console.log("WebMap and View are ready");

      this.addWidgets(this.logoUrl);

      // Perform layer lookup if parameters are provided
      const { lookupLayerId, lookupFieldName, lookupFieldValue, projectionType } = this._context.parameters;
      if (lookupLayerId?.raw && lookupFieldName?.raw && lookupFieldValue?.raw) {
        await this.performLayerLookup(
          webMap,
          lookupLayerId.raw,
          lookupFieldName.raw,
          lookupFieldValue.raw,
          projectionType.raw || 4326
        );
      }
    } catch (error) {
      console.error("Error in map creation or initialization:", error);
      this._mapViewContainer.innerText = "Failed to load the map. Please try again later.";
    }
  }

  /**
   * Adds various widgets to the map view.
   * @param logoUrl The URL of the logo image to display.
   */
  private addWidgets(logoUrl: string): void {
    if (!this._mapView) return;

    // Create and configure the LayerList widget
    const layerList = new LayerList({
      view: this._mapView,
      listItemCreatedFunction: (event) => {
        const item = event.item;
        if (item.layer.type !== "group") {
          item.panel = {
            content: "legend",
            open: false // Ensure the panel is collapsed by default
          };
        }
      }
    });

    // Wrap the LayerList widget in an Expand widget
    const expandLayerList = new Expand({
      view: this._mapView,
      content: layerList
    });

    // Add the Expand widget to the top-right corner of the view
    this._mapView.ui.add(expandLayerList, "top-right");

    // Add the Home widget to the top-left corner of the view
    const homeWidget = new Home({
      view: this._mapView
    });
    this._mapView.ui.add(homeWidget, "top-left");

    // Add the Zoom widget to the top-left corner of the view
    const zoomWidget = new Zoom({
      view: this._mapView
    });
    this._mapView.ui.add(zoomWidget, "top-left");

    // Add a logo image to the bottom-right corner of the view
    if (logoUrl) {
      const logoDiv = document.createElement("div");
      logoDiv.style.position = "absolute";
      logoDiv.style.bottom = "10px";
      logoDiv.style.right = "10px";
      logoDiv.style.width = "150px"; // Adjust the width as needed
      logoDiv.style.height = "auto"; // Maintain aspect ratio
      logoDiv.innerHTML = `<img src="${logoUrl}" style="width: 100%; height: auto;">`;
      this._mapView.ui.add(logoDiv, "manual");
    }
  }

  /**
   * Performs a lookup on a specified layer and zooms to the feature if found.
   * @param webMap The WebMap instance.
   * @param lookupLayerTitle The title of the layer to lookup.
   * @param lookupFieldName The field name to lookup.
   * @param lookupFieldValue The value to lookup in the field.
   * @param projectionType The projection type (spatial reference).
   */
  private async performLayerLookup(
    webMap: WebMap,
    lookupLayerTitle: string,
    lookupFieldName: string,
    lookupFieldValue: string,
    projectionType: number
  ): Promise<void> {
    // Log available layers
    console.log(
      "Performing layer lookup. Available layers:",
      webMap.layers.toArray().map(layer => ({
        id: layer.id,
        title: layer.title,
        type: layer.type
      }))
    );

    // Find the layer in the WebMap by title
    const lookupLayer = webMap.layers.find(layer => layer.title === lookupLayerTitle) as FeatureLayer;
    if (!lookupLayer) {
      console.error("Lookup layer not found");
      return;
    }

    // Create a query to find features with the specified field value
    const query = lookupLayer.createQuery();
    query.where = `${lookupFieldName} = '${lookupFieldValue}'`;
    query.returnGeometry = true;
    query.outSpatialReference = SpatialReference.fromJSON({ wkid: projectionType });

    try {
      // Execute the query and get the results
      const results = await lookupLayer.queryFeatures(query);
      if (results.features.length > 0) {
        const feature = results.features[0];
        // Zoom to the feature's geometry
        await this._mapView?.goTo(feature.geometry);
        console.log("Feature found and zoomed to:", feature);
      } else {
        console.warn("No features found for the given lookup value in the lookup layer");
      }
    } catch (error) {
      console.error("Lookup query error:", error);
    }
  }

  /**
   * Updates the view when the context changes.
   * @param context The context for the control.
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._context = context;

    // Update container size
    this._container.style.width = `${context.mode.allocatedWidth}px`;
    this._container.style.height = `${context.mode.allocatedHeight}px`;

    // Trigger a manual resize event
    if (this._mapView) {
      window.setTimeout(() => {
        if (this._mapView) {
          this._mapView.container.dispatchEvent(new Event('resize'));
        }
      }, 0);
    }
  }

  /**
   * Gets the outputs of the control.
   * @returns The outputs of the control.
   */
  public getOutputs(): IOutputs {
    return {};
  }

  /**
   * Destroys the control and releases resources.
   */
  public destroy(): void {
    if (this._mapView) {
      this._mapView.destroy();
    }
  }
}
