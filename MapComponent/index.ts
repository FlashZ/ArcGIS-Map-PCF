"use strict"; // Enforce strict mode for better error checking and avoiding unsafe actions

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import esriConfig from "@arcgis/core/config";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import IdentityManager from "@arcgis/core/identity/IdentityManager";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import LayerList from "@arcgis/core/widgets/LayerList";
import Home from "@arcgis/core/widgets/Home";
import Zoom from "@arcgis/core/widgets/Zoom";
import Expand from "@arcgis/core/widgets/Expand";

/**
 * MapComponent class implementing the PCF StandardControl interface.
 * This component integrates ArcGIS maps into a PowerApps component.
 */
export class MapComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement; // The main container for the component
  private _mapViewContainer: HTMLDivElement; // Container specifically for the map view
  private _mapView: MapView | null = null; // The MapView instance
  private _context: ComponentFramework.Context<IInputs>; // The context provided by the PowerApps framework
  private _notifyOutputChanged: () => void; // Callback function to notify the framework of output changes

  /**
   * Initializes the control instance.
   * @param context The context for the control.
   * @param notifyOutputChanged A function to notify the framework that the control has new outputs.
   * @param state The control state.
   * @param container The HTML element to render the control in.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    // Save context and callback
    this._context = context;
    this._container = container;
    this._notifyOutputChanged = notifyOutputChanged;

    // Create a container for the map view and append it to the main container
    this._mapViewContainer = document.createElement('div');
    this._mapViewContainer.style.width = '100%';
    this._mapViewContainer.style.height = '100%';
    this._container.appendChild(this._mapViewContainer);

    // Initialize the map with the provided parameters
    this.initializeMap(context.parameters);

    // Track container resize events to adjust the map view accordingly
    context.mode.trackContainerResize(true);
  }

  /**
   * Initializes the ArcGIS map with given parameters.
   * @param parameters The input parameters for the map.
   */
  private async initializeMap(parameters: IInputs): Promise<void> {
    const portalUrl = parameters.portalUrl.raw || "https://www.arcgis.com";
    const clientId = parameters.clientId.raw || "";
    const webMapId = parameters.webMapId.raw || "";
    const projectionType = parameters.projectionType.raw || 4326;
    const lookupLayerTitle = parameters.lookupLayerId?.raw || ""; // Changed to use title
    const lookupFieldName = parameters.lookupFieldName?.raw || "";
    const lookupFieldValue = parameters.lookupFieldValue?.raw || "";

    // Ensure required parameters are provided
    if (!clientId || !webMapId) {
      console.error("Client ID and Web Map ID are required.");
      return;
    }

    // Configure the ArcGIS portal URL and assets path
    esriConfig.portalUrl = portalUrl;
    esriConfig.assetsPath = "https://js.arcgis.com/4.26/@arcgis/core/assets";

    // Set up OAuth for ArcGIS
    const info = new OAuthInfo({
      appId: clientId,
      portalUrl: portalUrl,
      popup: false
    });

    IdentityManager.registerOAuthInfos([info]);

    try {
      // Authenticate with ArcGIS
      await IdentityManager.getCredential(`${portalUrl}/sharing`);
      // Create and configure the WebMap
      await this.createWebMap(webMapId, lookupLayerTitle, lookupFieldName, lookupFieldValue, projectionType);
    } catch (error) {
      console.error("Authentication or map creation failed:", error);
    }
  }

  /**
   * Creates and configures the WebMap.
   * @param webMapId The ID of the WebMap.
   * @param lookupLayerTitle The title of the layer to lookup.
   * @param lookupFieldName The field name to lookup.
   * @param lookupFieldValue The value to lookup in the field.
   * @param projectionType The projection type (spatial reference).
   */
  private async createWebMap(webMapId: string, lookupLayerTitle: string, lookupFieldName: string, lookupFieldValue: string, projectionType: number): Promise<void> {
    // Initialize the WebMap with the provided ID
    const webMap = new WebMap({
      portalItem: {
        id: webMapId
      }
    });

    try {
      // Wait for the WebMap to load
      await webMap.load();

      // Log the layers to debug the lookup issue
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
      this._mapViewContainer.addEventListener('wheel', () => {}, { passive: true });

      // Wait for the MapView to be ready
      await this._mapView.when();
      console.log("WebMap and View are ready");

      // Add widgets to the MapView
      this.addWidgets();

      // Perform layer lookup if parameters are provided
      if (lookupLayerTitle && lookupFieldName && lookupFieldValue) {
        await this.performLayerLookup(webMap, lookupLayerTitle, lookupFieldName, lookupFieldValue, projectionType);
      }
    } catch (error) {
      console.error("Error in map creation or initialization:", error);
    }
  }

  /**
   * Adds various widgets to the map view.
   */
  private addWidgets(): void {
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
    const expand = new Expand({
      view: this._mapView,
      content: layerList
    });

    // Add the Expand widget to the top-right corner of the view
    this._mapView.ui.add(expand, "top-right");

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
  }

  /**
   * Performs a lookup on a specified layer and zooms to the feature if found.
   * @param webMap The WebMap instance.
   * @param lookupLayerTitle The title of the layer to lookup.
   * @param lookupFieldName The field name to lookup.
   * @param lookupFieldValue The value to lookup in the field.
   * @param projectionType The projection type (spatial reference).
   */
  private async performLayerLookup(webMap: WebMap, lookupLayerTitle: string, lookupFieldName: string, lookupFieldValue: string, projectionType: number): Promise<void> {
    // Log available layers
    console.log("Performing layer lookup. Available layers:", webMap.layers.toArray().map(layer => ({
      id: layer.id,
      title: layer.title,
      type: layer.type
    })));

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
