"use strict";

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import esriConfig from "@arcgis/core/config";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import IdentityManager from "@arcgis/core/identity/IdentityManager";
import LayerList from "@arcgis/core/widgets/LayerList";
import Home from "@arcgis/core/widgets/Home";
import Zoom from "@arcgis/core/widgets/Zoom";
import Expand from "@arcgis/core/widgets/Expand";
import '@arcgis/core/assets/esri/themes/light/main.css';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";

/**
 * MapComponent class implementing the PCF StandardControl interface using OAuth2.
 */
export class MapComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement;
  private _mapViewContainer: HTMLDivElement;
  private _mapView: MapView | null = null;
  private _context: ComponentFramework.Context<IInputs>;
  private _notifyOutputChanged: () => void;

  // OAuth Credentials
  //private clientId: string = 'REvdjVLPtORmWelH'; // Replace with your actual OAuth App Client ID
  //private portalUrl: string = 'https://ultrafast.maps.arcgis.com/sharing';

  /**
   * Initializes the control instance.
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
  
    // Fetch input values dynamically
    const clientId = context.parameters.clientId.raw || ""; // Default to an empty string if not provided
    const portalUrl = context.parameters.portalUrl.raw || "https://www.arcgis.com/sharing"; // Default ArcGIS Online URL
  
    // Validate inputs
    if (!clientId) {
      console.error("Client ID is required for OAuth.");
      return;
    }
  
    // Create and style the map view container
    this._mapViewContainer = document.createElement('div');
    this._mapViewContainer.style.width = '500px';
    this._mapViewContainer.style.height = '500px';
    this._mapViewContainer.classList.add("ArcGISMap_Container");
    this._container.appendChild(this._mapViewContainer);
  
    // Configure OAuth
    const oauthInfo = new OAuthInfo({
      appId: clientId,
      popup: true, // Use popup: true if redirection causes issues
      portalUrl: portalUrl, // Use the dynamic portal URL
    });
    IdentityManager.registerOAuthInfos([oauthInfo]);
  
    // Check sign-in status
    try {
      await IdentityManager.checkSignInStatus(portalUrl);
      console.log("User is already signed in.");
      await this.initializeMap(context.parameters.webMapId.raw || "");
    } catch {
      console.log("User is not signed in.");
      this.renderSignInButton(portalUrl);
    }
  }

  /**
   * Renders a sign-in button for the user.
   */
  private renderSignInButton(portalUrl: string): void {
    const signInButton = document.createElement("button");
    signInButton.innerText = "Sign In to View the Map";
    signInButton.style.padding = "10px";
    signInButton.style.fontSize = "16px";
    signInButton.style.cursor = "pointer";
    this._container.appendChild(signInButton);
  
    signInButton.addEventListener("click", async () => {
      try {
        // Use popup-based sign-in
        await IdentityManager.getCredential(`${portalUrl}/sharing`);
        this._container.removeChild(signInButton);
        await this.initializeMap(this._context.parameters.webMapId.raw || "");
      } catch (error) {
        console.error("Error during popup-based sign-in:", error);
        this.showMessage("Sign-in failed. Please try again.");
      }
    });
  }

  /**
   * Initializes the WebMap and MapView.
   */
  private async initializeMap(webMapId: string): Promise<void> {
    if (!webMapId) {
      console.error("WebMap ID is required.");
      return;
    }
  
    const webMap = new WebMap({
      portalItem: {
        id: webMapId,
      },
    });
  
    try {
      // Wait for the WebMap to load
      await webMap.load();
  
      this._mapView = new MapView({
        container: this._mapViewContainer,
        map: webMap,
        ui: {
          components: ["attribution"], // Only show attribution by default
        },
      });
  
      // Wait for the MapView to fully load
      await this._mapView.when();
  
      console.log("WebMap and MapView are fully loaded.");
  
      // Wait for all layers to load
      await Promise.all(
        webMap.layers.map(layer => layer.load())
      );
  
      console.log("All layers are fully loaded.");
  
      // Fetch parameters and perform layer lookup if available
      const lookupLayerId = this._context.parameters.lookupLayerId.raw || "";
      const lookupFieldName = this._context.parameters.lookupFieldName.raw || "";
      const lookupFieldValue = this._context.parameters.lookupFieldValue.raw || "";
      const projectionType = this._context.parameters.projectionType.raw || 4326;
  
      if (lookupLayerId && lookupFieldName && lookupFieldValue) {
        await this.performLayerLookup(webMap, lookupLayerId, lookupFieldName, lookupFieldValue, projectionType);
      } else {
        console.warn("Lookup parameters are incomplete. Skipping layer lookup.");
      }
  
      // Add widgets to the view
      this.addWidgets();
    } catch (error) {
      console.error("Error initializing the map:", error);
    }
  }
  

  /**
   * Adds widgets to the map view.
   */
  private addWidgets(): void {
    if (!this._mapView) return;

    const layerList = new LayerList({ view: this._mapView });
    const expand = new Expand({
      view: this._mapView,
      content: layerList,
    });
    this._mapView.ui.add(expand, "top-right");

    const homeWidget = new Home({ view: this._mapView });
    this._mapView.ui.add(homeWidget, "top-left");

    const zoomWidget = new Zoom({ view: this._mapView });
    this._mapView.ui.add(zoomWidget, "top-left");
  }

  private showMessage(message: string): void {
    const messageDiv = document.createElement("div");
    messageDiv.innerText = message;
    messageDiv.style.position = "absolute";
    messageDiv.style.top = "10px";
    messageDiv.style.left = "50%";
    messageDiv.style.transform = "translateX(-50%)";
    messageDiv.style.backgroundColor = "#fff";
    messageDiv.style.padding = "10px";
    messageDiv.style.border = "1px solid #ccc";
    messageDiv.style.borderRadius = "4px";
    messageDiv.style.zIndex = "1000";
  
    this._container.appendChild(messageDiv);
  
    setTimeout(() => {
      this._container.removeChild(messageDiv);
    }, 3000); // Message disappears after 3 seconds
  }

  private async performLayerLookup(
    webMap: WebMap,
    lookupLayerTitle: string,
    lookupFieldName: string,
    lookupFieldValue: string,
    projectionType: number
  ): Promise<void> {
    // Find the layer in the WebMap by title
    const lookupLayer = webMap.layers.find(layer => layer.title === lookupLayerTitle) as FeatureLayer;
    if (!lookupLayer) {
      console.error(`Lookup layer with title "${lookupLayerTitle}" not found`);
      return;
    }
  
    try {
      // Ensure the layer is fully loaded
      await lookupLayer.load();
  
      // Create a query to find features with the specified field value
      const query = lookupLayer.createQuery();
      query.where = `${lookupFieldName} = '${lookupFieldValue}'`;
      query.returnGeometry = true;
      query.outSpatialReference = SpatialReference.fromJSON({ wkid: projectionType });
  
      // Execute the query and handle results
      const results = await lookupLayer.queryFeatures(query);
      if (results.features.length > 0) {
        const feature = results.features[0];
        // Zoom to the feature's geometry
        await this._mapView?.goTo(feature.geometry);
        console.log("Feature found and zoomed to its location.");
      } else {
        console.warn("No matching features found.");
      }
    } catch (error) {
      console.error("Error during layer lookup:", error);
    }
  }
  


  /**
   * Updates the view when the context changes.
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._context = context;
  
    // Update container dimensions
    this._container.style.width = `${context.mode.allocatedWidth}px`;
    this._container.style.height = `${context.mode.allocatedHeight}px`;
  
    if (this._mapView) {
      this._mapView.container.dispatchEvent(new Event("resize"));
  
      // Check if lookupFieldValue has changed and re-run the lookup
      const lookupFieldValue = this._context.parameters.lookupFieldValue.raw || "";
      if (lookupFieldValue) {
        const lookupLayerId = this._context.parameters.lookupLayerId.raw || "";
        const lookupFieldName = this._context.parameters.lookupFieldName.raw || "";
        const projectionType = this._context.parameters.projectionType.raw || 4326;
  
        this.performLayerLookup(
          this._mapView.map as WebMap,
          lookupLayerId,
          lookupFieldName,
          lookupFieldValue,
          projectionType
        );
      }
    }
  }

  /**
   * Gets the outputs of the control.
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
