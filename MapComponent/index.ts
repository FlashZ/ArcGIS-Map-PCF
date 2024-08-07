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

export class MapComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement;
  private _mapViewContainer: HTMLDivElement;
  private _mapView: MapView | null = null;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this._container = container;

    // Create a separate container for the map view
    this._mapViewContainer = document.createElement('div');
    this._mapViewContainer.style.width = '100%';
    this._mapViewContainer.style.height = '100%';
    this._container.appendChild(this._mapViewContainer);

    // Initialize the map
    this.initializeMap(context.parameters);

    // Track container resize
    context.mode.trackContainerResize(true);
  }

  private async initializeMap(parameters: IInputs): Promise<void> {
    const portalUrl = parameters.portalUrl.raw || "https://www.arcgis.com";
    const clientId = parameters.clientId.raw || "";
    const webMapId = parameters.webMapId.raw || "";
    const projectionType = parameters.projectionType.raw || 4326;
    const lookupLayerId = parameters.lookupLayerId?.raw || "";
    const lookupFieldName = parameters.lookupFieldName?.raw || "";
    const lookupFieldValue = parameters.lookupFieldValue?.raw || "";

    if (!clientId || !webMapId) {
      console.error("Client ID and Web Map ID are required.");
      return;
    }

    esriConfig.portalUrl = portalUrl;
    
    // Set assetsPath to fix potential loading issues
    esriConfig.assetsPath = "https://js.arcgis.com/4.26/@arcgis/core/assets";

    const info = new OAuthInfo({
      appId: clientId,
      portalUrl: portalUrl,
      popup: false
    });

    IdentityManager.registerOAuthInfos([info]);

    try {
      await IdentityManager.getCredential(`${portalUrl}/sharing`);
      await this.createWebMap(webMapId, lookupLayerId, lookupFieldName, lookupFieldValue, projectionType);
    } catch (error) {
      console.error("Authentication or map creation failed:", error);
    }
  }

  private async createWebMap(webMapId: string, lookupLayerId: string, lookupFieldName: string, lookupFieldValue: string, projectionType: number): Promise<void> {
    const webMap = new WebMap({
      portalItem: {
        id: webMapId
      }
    });

    try {
      await webMap.load();

      this._mapView = new MapView({
        container: this._mapViewContainer,
        map: webMap,
        ui: {
          components: ["attribution"]
        }
      });

      // Add passive event listener for wheel events
      this._mapViewContainer.addEventListener('wheel', () => {}, { passive: true });

      await this._mapView.when();
      console.log("WebMap and View are ready");
      this.addWidgets();
      if (lookupLayerId && lookupFieldName && lookupFieldValue) {
        await this.performLayerLookup(webMap, lookupLayerId, lookupFieldName, lookupFieldValue, projectionType);
      }
    } catch (error) {
      console.error("Error in map creation or initialization:", error);
    }
  }

  private addWidgets(): void {
    if (!this._mapView) return;

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

    const expand = new Expand({
      view: this._mapView,
      content: layerList,
      expanded: false // Ensure the Expand widget is collapsed by default
    });

    this._mapView.ui.add(expand, "top-right");

    const homeWidget = new Home({
      view: this._mapView
    });
    this._mapView.ui.add(homeWidget, "top-left");

    const zoomWidget = new Zoom({
      view: this._mapView
    });
    this._mapView.ui.add(zoomWidget, "top-left");
  }

  private async performLayerLookup(webMap: WebMap, lookupLayerId: string, lookupFieldName: string, lookupFieldValue: string, projectionType: number): Promise<void> {
    const lookupLayer = webMap.layers.find(layer => layer.id === lookupLayerId) as FeatureLayer;
    if (!lookupLayer) {
      console.error("Lookup layer not found");
      return;
    }

    const query = lookupLayer.createQuery();
    query.where = `${lookupFieldName} = '${lookupFieldValue}'`;
    query.returnGeometry = true;
    query.outSpatialReference = SpatialReference.fromJSON({ wkid: projectionType });

    try {
      const results = await lookupLayer.queryFeatures(query);
      if (results.features.length > 0) {
        const feature = results.features[0];
        await this._mapView?.goTo(feature.geometry);
      } else {
        console.warn("No features found for the given lookup value in the lookup layer");
      }
    } catch (error) {
      console.error("Lookup query error:", error);
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    
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

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    if (this._mapView) {
      this._mapView.destroy();
    }
  }
}
