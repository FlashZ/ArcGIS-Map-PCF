/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    clientId: ComponentFramework.PropertyTypes.StringProperty;
    clientSecret: ComponentFramework.PropertyTypes.StringProperty;
    portalUrl: ComponentFramework.PropertyTypes.StringProperty;
    webMapId: ComponentFramework.PropertyTypes.StringProperty;
    projectionType: ComponentFramework.PropertyTypes.WholeNumberProperty;
    lookupLayerId: ComponentFramework.PropertyTypes.StringProperty;
    lookupFieldName: ComponentFramework.PropertyTypes.StringProperty;
    lookupFieldValue: ComponentFramework.PropertyTypes.StringProperty;
    logoUrl: ComponentFramework.PropertyTypes.StringProperty;
    redirectUri: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    lookupFieldValue?: string;
}
