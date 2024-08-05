import { IInputs, IOutputs } from "./generated/ManifestTypes";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import esriConfig from "@arcgis/core/config";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import IdentityManager from "@arcgis/core/identity/IdentityManager";
import Query from "@arcgis/core/rest/support/Query";
import * as projection from "@arcgis/core/geometry/projection";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import "./styles.css"; // Import the CSS file

const isLocalTesting = process.env.NODE_ENV === 'development';

interface TestConfig {
  portalUrl?: string;
  clientId?: string;
  clientSecret?: string;
  webMapId?: string;
  visibleLayers?: string;
  readOnly?: string;
  featureLayerUrl?: string;
  projectionType?: number;
  projectId?: string;
}

interface LocalizationData {
  errors: {
    mapLoading: string;
    authentication: string;
  };
  labels: {
    appId: string;
    portalUrl: string;
    featureLayerUrl: string;
  };
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

function getNumberProperty(value: number | ComponentFramework.PropertyTypes.NumberProperty | undefined): number {
  if (typeof value === "number") {
    return value;
  } else if (value && value.raw !== null) {
    return value.raw;
  }
  return NaN;
}

export class MapComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement;
  private _mapView: MapView | null = null;

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
    const portalUrl = getStringProperty(config["portalUrl"]) || (config as TestConfig).portalUrl || "https://www.arcgis.com";
    console.log("Using portal URL:", portalUrl);
    esriConfig.portalUrl = portalUrl;

    const clientId = getStringProperty(config["clientId"]) || (config as TestConfig).clientId || "";
    if (!clientId) {
      console.error("Client ID is required for OAuth configuration.");
      return;
    }
    console.log("Using client ID:", clientId);

    const info = new OAuthInfo({
      appId: clientId,
      portalUrl,
      popup: false
    });
    IdentityManager.registerOAuthInfos([info]);

    IdentityManager.checkSignInStatus(info.portalUrl + "/sharing")
      .then(() => {
        console.log("User is signed in");
        this.loadMap(config);
      })
      .catch((error) => {
        console.error("Sign-in status check failed:", error);
        IdentityManager.getCredential(info.portalUrl + "/sharing")
          .then(() => {
            console.log("Credential acquired");
            this.loadMap(config);
          })
          .catch((error) => {
            console.error("Failed to acquire credential:", error);
            this.showErrorMessage("Authentication failed. Please check your credentials.");
          });
      });
  }

  private loadMap(config: ContextType["parameters"] | TestConfig): void {
    const featureLayerUrl = getStringProperty(config["featureLayerUrl"]) || (config as TestConfig).featureLayerUrl || "";
    const projectionType = getNumberProperty(config["projectionType"]) || (config as TestConfig).projectionType || 4326;
    const projectId = getStringProperty(config["projectId"]) || (config as TestConfig).projectId || "";

    if (!featureLayerUrl) {
      console.error("Feature layer URL is required.");
      return;
    }

    const featureLayer = new FeatureLayer({
      url: featureLayerUrl
    });

    featureLayer.load().then(() => {
      const map = new Map({
        basemap: "streets-navigation-vector",
        layers: [featureLayer]
      });

      this._mapView = new MapView({
        container: this._container,
        map: map
      });

      this._mapView.when(() => {
        console.log("Map and View are ready");
        this.filterAndZoomToProject(featureLayer, projectId, projectionType);
      }).catch((error: Error) => {
        console.error("Map loading error:", error);
        this.showErrorMessage("Map loading error: " + error.message);
      });

      this.projectLayer(featureLayer, projectionType);
    }).catch((error: Error) => {
      console.error("Feature layer loading error:", error);
      this.showErrorMessage("Feature layer loading error: " + error.message);
    });
  }

  private filterAndZoomToProject(featureLayer: FeatureLayer, projectId: string, projectionType: number): void {
    if (!projectId) return;

    const query = featureLayer.createQuery();
    query.where = `project_id = '${projectId}'`;
    query.returnGeometry = true;
    query.outSpatialReference = new SpatialReference({ wkid: projectionType });

    featureLayer.queryFeatures(query).then((results) => {
      if (results.features.length > 0) {
        this._mapView?.goTo(results.features).catch((error: Error) => {
          console.error("Zoom error:", error);
          this.showErrorMessage("Zoom error: " + error.message);
        });
      } else {
        console.warn("No features found for project ID:", projectId);
        this.showErrorMessage("No features found for the provided project ID.");
      }
    }).catch((error: Error) => {
      console.error("Query error:", error);
      this.showErrorMessage("Query error: " + error.message);
    });
  }

  private projectLayer(featureLayer: FeatureLayer, projectionType: number): void {
    projection.load().then(() => {
      const spatialReference = new SpatialReference({ wkid: projectionType });
      featureLayer.queryFeatures().then((featureSet) => {
        featureSet.features.forEach((feature) => {
          const projectedGeometry = projection.project(feature.geometry, spatialReference);
          console.log("Projected Geometry:", projectedGeometry);
        });
      }).catch((error: Error) => {
        console.error("Error querying features:", error);
        this.showErrorMessage("Error querying features: " + error.message);
      });
    }).catch((error: Error) => {
      console.error("Projection error:", error);
      this.showErrorMessage("Projection error: " + error.message);
    });
  }

  private showErrorMessage(message: string): void {
    this._container.innerHTML = `<div class="error-message">${message}</div>`;
  }

  public updateView(context: ContextType): void {}

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    if (this._mapView) {
      this._mapView.destroy();
    }
  }
}

// Add fallback for localization
const defaultLocalization: LocalizationData = {
  "errors": {
    "mapLoading": "An error occurred while loading the map.",
    "authentication": "Authentication failed. Please check your credentials."
  },
  "labels": {
    "appId": "App ID",
    "portalUrl": "Portal URL",
    "featureLayerUrl": "Feature Layer URL"
  }
};

function loadLocalization(): void {
  const defaultLocale = "en-nz";
  const localeFile = `loc/${defaultLocale}/diagnosticMessages.localized.json`;

  fetch(localeFile)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Localization file not found");
      }
      return response.json();
    })
    .then((data: LocalizationData) => {
      // Apply localization settings
      console.log("Localization loaded:", data);
    })
    .catch((error) => {
      console.error("Failed to load localization, using default:", error);
      // Load default localization settings
      applyLocalization(defaultLocalization);
    });
}

function applyLocalization(localization: LocalizationData): void {
  console.log("Applying localization settings:", localization);
  // Apply the localization settings as needed
}

loadLocalization();