import { IInputs, IOutputs } from "./generated/ManifestTypes";
import MapView from "@arcgis/core/views/MapView";
import WebMap from "@arcgis/core/WebMap";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Measurement from "@arcgis/core/widgets/Measurement";
import Locate from "@arcgis/core/widgets/Locate";
import Search from "@arcgis/core/widgets/Search";
import { addressToLocations } from "@arcgis/core/rest/locator";
import esriConfig from "@arcgis/core/config";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import esriId from "@arcgis/core/identity/IdentityManager";
import "./styles.css"; // Import the CSS file

// For local testing
const isLocalTesting = process.env.NODE_ENV === 'development';
interface TestConfig {
  portalUrl?: string;
  appId?: string;
  webMapId?: string;
  readOnly?: string;
  showMeasurementTool?: boolean;
  showLocateTool?: boolean;
  showSearchTool?: boolean;
  visibleLayers?: string;
  lookupField?: string;
  lookupLayerId?: string;
  addressMode?: string;
  latitudeField?: string;
  longitudeField?: string;
  addressField?: string;
  theme?: string;
  localization?: string;
}

let testConfig: TestConfig = {};
if (isLocalTesting) {
  try {
    testConfig = require('./testconfig.json');
  } catch (error) {
    console.error('Could not load test config:', error);
  }
}

type ContextType = ComponentFramework.Context<IInputs>;

function getStringProperty(value: string | ComponentFramework.PropertyTypes.StringProperty | undefined): string {
  if (typeof value === "string") {
    return value;
  } else if (value && value.raw) {
    return value.raw;
  }
  return "";
}

function getEnumProperty<T>(value: string | ComponentFramework.PropertyTypes.EnumProperty<T> | undefined): string {
  if (typeof value === "string") {
    return value;
  } else if (value && value.raw) {
    return value.raw as unknown as string;
  }
  return "";
}

function getBooleanProperty(value: boolean | ComponentFramework.PropertyTypes.TwoOptionsProperty | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  } else if (value && value.raw !== undefined) {
    return value.raw;
  }
  return false;
}

interface UIComponent {
  container?: HTMLElement;
}

export class MapComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement;
  private _mapView: MapView | null = null;
  private _layers: { [key: string]: FeatureLayer } = {};

  constructor() {}

  public init(
    context: ContextType,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this._container = document.createElement("div");
    this._container.className = "map-container"; // Add class name for styling
    container.appendChild(this._container);

    if (isLocalTesting) {
      this.configureEsri(testConfig);
    } else {
      this.configureEsri(context.parameters);
    }
  }

  private configureEsri(config: ContextType["parameters"] | TestConfig): void {
    const portalUrl = getStringProperty((config as ContextType["parameters"]).portalUrl) || (config as TestConfig).portalUrl || "https://www.arcgis.com";
    esriConfig.portalUrl = portalUrl;

    const appId = getStringProperty((config as ContextType["parameters"]).appId) || (config as TestConfig).appId || "";
    if (!appId) {
      this.showErrorMessage("App ID is required for OAuth configuration.");
      console.error("App ID is required for OAuth configuration.");
      return;
    }

    const info = new OAuthInfo({
      appId,
      popup: false
    });
    esriId.registerOAuthInfos([info]);

    esriId.checkSignInStatus(info.portalUrl + "/sharing").then(() => {
      console.log("User is signed in");
      this.loadMap(config); // Load map only after successful sign-in
    }).catch(() => {
      esriId.getCredential(info.portalUrl + "/sharing").then(() => {
        this.loadMap(config); // Load map after getting credentials
      }).catch((error) => {
        this.showErrorMessage("Failed to authenticate. Please check your configuration.");
        console.error("Authentication error:", error);
      });
    });
  }

  private loadMap(config: ContextType["parameters"] | TestConfig): void {
    const webmap = new WebMap({
      portalItem: {
        id: getStringProperty((config as ContextType["parameters"]).webMapId) || (config as TestConfig).webMapId || ""
      }
    });

    this._mapView = new MapView({
      container: this._container,
      map: webmap
    });

    if (getEnumProperty((config as ContextType["parameters"]).readOnly) === "true" || (config as TestConfig).readOnly === "true") {
      this._mapView.ui.components = []; // Disable all user interactions
    }

    this._mapView.when(() => {
      this.initializeLayers(config);
      if (getBooleanProperty((config as ContextType["parameters"]).showMeasurementTool) || (config as TestConfig).showMeasurementTool === true) {
        this.initializeMeasurementTool();
      }
      if (getBooleanProperty((config as ContextType["parameters"]).showLocateTool) || (config as TestConfig).showLocateTool === true) {
        this.initializeLocateTool();
      }
      if (getBooleanProperty((config as ContextType["parameters"]).showSearchTool) || (config as TestConfig).showSearchTool === true) {
        this.initializeSearchTool();
      }
      this.applyTheme(config);
      this.applyLocalization(config);
      this.handleFieldFocus(config);
    }).catch((error: Error) => {
      console.error("Map loading error:", error);
      this.showErrorMessage("Map loading error: " + error.message);
    });
  }

  private showErrorMessage(message: string): void {
    this._container.innerHTML = `<div class="error-message">${message}</div>`;
  }

  private initializeLayers(config: ContextType["parameters"] | TestConfig): void {
    const layersConfig = getStringProperty((config as ContextType["parameters"]).visibleLayers) || (config as TestConfig).visibleLayers || "";
    if (layersConfig) {
      try {
        const layers = layersConfig.split(",");
        layers.forEach((layerId: string) => {
          const layer = new FeatureLayer({ portalItem: { id: layerId.trim() } });
          this._mapView?.map.add(layer);
          this._layers[layerId.trim()] = layer;
        });
        this.createLayerControlUI(layers);
      } catch (error) {
        console.error("Error parsing layer configuration:", error);
      }
    }
  }

  private createLayerControlUI(layers: string[]): void {
    const controlContainer = document.createElement("div");
    controlContainer.className = "layer-control"; // Add class name for styling

    layers.forEach((layerId: string) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = layerId;
      checkbox.checked = this._layers[layerId].visible;
      checkbox.addEventListener("change", () => this.toggleLayerVisibility(layerId, checkbox.checked));

      const label = document.createElement("label");
      label.htmlFor = layerId;
      label.innerText = layerId;

      controlContainer.appendChild(checkbox);
      controlContainer.appendChild(label);
      controlContainer.appendChild(document.createElement("br"));
    });

    this._container.appendChild(controlContainer);
  }

  private toggleLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this._layers[layerId];
    if (layer) {
      layer.visible = visible;
    }
  }

  private handleFieldFocus(config: ContextType["parameters"] | TestConfig): void {
    const lookupField = getStringProperty((config as ContextType["parameters"]).lookupField) || (config as TestConfig).lookupField || "";
    const lookupLayerId = getStringProperty((config as ContextType["parameters"]).lookupLayerId) || (config as TestConfig).lookupLayerId || "";
    const addressMode = getEnumProperty((config as ContextType["parameters"]).addressMode) || (config as TestConfig).addressMode || "";
    const latitudeField = getStringProperty((config as ContextType["parameters"]).latitudeField) || (config as TestConfig).latitudeField || "";
    const longitudeField = getStringProperty((config as ContextType["parameters"]).longitudeField) || (config as TestConfig).longitudeField || "";
    const addressField = getStringProperty((config as ContextType["parameters"]).addressField) || (config as TestConfig).addressField || "";

    if (lookupField && lookupLayerId) {
      const layer = this._layers[lookupLayerId];
      if (layer) {
        layer.queryFeatures({ where: `ID = '${lookupField}'` })
          .then(result => {
            if (result.features.length > 0) {
              this._mapView?.goTo(result.features[0].geometry);
            }
          }).catch(error => console.error("Feature focus error:", error));
      }
    } else if (addressMode === "latLong" && latitudeField && longitudeField) {
      const latitude = parseFloat(latitudeField);
      const longitude = parseFloat(longitudeField);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        this._mapView?.goTo({ center: [longitude, latitude], zoom: 15 });
      }
    } else if (addressMode === "address" && addressField) {
      addressToLocations("https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer", { address: { SingleLine: addressField } })
        .then((results) => {
          if (results.length > 0) {
            this._mapView?.goTo(results[0].location);
          }
        }).catch((error) => console.error("Address lookup error:", error));
    }
  }

  private initializeMeasurementTool(): void {
    if (!this._mapView) return;

    const measurement = new Measurement({
      view: this._mapView
    });

    this._mapView.ui.add(measurement, "top-right");
  }

  private initializeLocateTool(): void {
    if (!this._mapView) return;

    const locate = new Locate({
      view: this._mapView,
      goToOverride: (view, options) => {
        options.target.scale = 1500;
        return view.goTo(options.target);
      }
    });

    this._mapView.ui.add(locate, "top-left");
  }

  private initializeSearchTool(): void {
    if (!this._mapView) return;

    const search = new Search({
      view: this._mapView
    });

    this._mapView.ui.add(search, "top-right");
  }

  private applyTheme(config: ContextType["parameters"] | TestConfig): void {
    const themeRaw = getStringProperty((config as ContextType["parameters"]).theme) || (config as TestConfig).theme || "{}";
    try {
      const theme = JSON.parse(themeRaw);
      if (theme.backgroundColor) {
        this._container.style.backgroundColor = theme.backgroundColor;
      }
      if (theme.textColor && this._mapView) {
        (this._mapView.ui.components as UIComponent[]).forEach((component) => {
          if (component.container) {
            component.container.style.color = theme.textColor;
          }
        });
      }
    } catch (error) {
      console.error("Error parsing theme:", error);
    }
  }

  private applyLocalization(config: ContextType["parameters"] | TestConfig): void {
    const localizationRaw = getStringProperty((config as ContextType["parameters"]).localization) || (config as TestConfig).localization || "{}";
    try {
      const localization = JSON.parse(localizationRaw);
      if (this._mapView) {
        const zoomInButton = this._mapView.ui.find("zoom-in");
        if (zoomInButton instanceof HTMLElement && localization.zoomIn) {
          zoomInButton.title = localization.zoomIn;
        }
      }
    } catch (error) {
      console.error("Error parsing localization:", error);
    }
  }

  public updateView(context: ContextType): void {
    this.handleFieldFocus(context.parameters);
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
