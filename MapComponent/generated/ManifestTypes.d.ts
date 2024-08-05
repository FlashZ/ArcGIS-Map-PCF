/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    clientId: ComponentFramework.PropertyTypes.StringProperty;
    clientSecret: ComponentFramework.PropertyTypes.StringProperty;
    portalUrl: ComponentFramework.PropertyTypes.StringProperty;
    webMapId: ComponentFramework.PropertyTypes.StringProperty;
    featureLayerUrl: ComponentFramework.PropertyTypes.StringProperty;
    projectionType: ComponentFramework.PropertyTypes.WholeNumberProperty;
    projectId: ComponentFramework.PropertyTypes.StringProperty;
    visibleLayers: ComponentFramework.PropertyTypes.StringProperty;
    readOnly: ComponentFramework.PropertyTypes.EnumProperty<"true" | "false">;
    localization: ComponentFramework.PropertyTypes.StringProperty;
    theme: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    featureLayerUrl?: string;
    projectId?: string;
}
