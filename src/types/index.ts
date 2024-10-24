export interface BuildingSystems {
  hvacSystem: {
    type: string;
    age: number;
    efficiency: number;
    refrigerantType: string;
    maintenanceSchedule: string;
  };
  lightingSystem: {
    types: string[];
    controlSystems: string[];
    operatingSchedule: string;
  };
  buildingEnvelope: {
    wallConstruction: string;
    roofType: string;
    windowTypes: string[];
    insulationRValues: {
      walls: number;
      roof: number;
      foundation: number;
    };
  };
}

export interface VerificationInfo {
  verifierName: string;
  verifierCredentials: string;
  verifierLicenseNumber: string;
  verificationDate: string;
  verifierSignature: File;
}

export interface Report {
  id: string;
  title: string;
  date: string;
  content: string;
  analysisResult: string;
  buildingData: any;
}
