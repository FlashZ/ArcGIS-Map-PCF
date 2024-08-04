/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    appId: ComponentFramework.PropertyTypes.StringProperty;
    portalUrl: ComponentFramework.PropertyTypes.StringProperty;
    webMapId: ComponentFramework.PropertyTypes.StringProperty;
    visibleLayers: ComponentFramework.PropertyTypes.StringProperty;
    readOnly: ComponentFramework.PropertyTypes.EnumProperty<"true" | "false">;
    lookupField: ComponentFramework.PropertyTypes.StringProperty;
    lookupLayerId: ComponentFramework.PropertyTypes.StringProperty;
    addressMode: ComponentFramework.PropertyTypes.EnumProperty<"none" | "latLong" | "address">;
    latitudeField: ComponentFramework.PropertyTypes.StringProperty;
    longitudeField: ComponentFramework.PropertyTypes.StringProperty;
    addressField: ComponentFramework.PropertyTypes.StringProperty;
    showIdentifyTool: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    showMeasurementTool: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    showLocateTool: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    showSearchTool: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    localization: ComponentFramework.PropertyTypes.StringProperty;
    theme: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    lookupField?: string;
    latitudeField?: string;
    longitudeField?: string;
    addressField?: string;
}
