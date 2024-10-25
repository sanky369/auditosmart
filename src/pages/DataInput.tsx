import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  saveBuildingData, 
  saveBuildingSystems, 
  uploadFile,
  updateBuildingData,
  saveVerificationInfo  // Add this import
} from '../services/firebase/database';

interface BuildingForm {
  name: string;
  type: string;
  size: number;
  location: string;
  yearBuilt: number;
  numberOfFloors: number;
  occupancyPercentage: number;
  operatingHours: {
    weekday: string;
    weekend: string;
  };
  primaryHVACSystem: string;
  lastRetrofit?: string;
  energyStarScore?: number;
}

interface VerificationInfo {
  verifierName: string;
  verifierCredentials: string;
  verifierLicenseNumber: string;
  verificationDate: string;
  verifierSignature: File;
}

interface BuildingSystems {
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

// Add this helper type at the top with other interfaces
interface InfoGuide {
  title: string;
  description: string;
  howToFind?: string;
  importance?: string;
}

// Add this constant before the DataInput component
const dataGuide: Record<string, InfoGuide> = {
  buildingInfo: {
    title: "Building Information",
    description: "Basic details about your building that provide context for energy analysis.",
    importance: "Helps establish baseline energy usage patterns and identify comparable buildings."
  },
  energyData: {
    title: "Energy Consumption Data (CSV)",
    description: "Monthly or daily energy usage data including electricity, gas, and water consumption.",
    howToFind: "Gather from utility bills or building management system exports.",
    importance: "Core data for analyzing consumption patterns and identifying inefficiencies."
  },
  csvFields: {
    title: "CSV Data Fields Guide",
    description: "Required columns in your energy consumption data:",
    howToFind: `
• Electricity (kWh): Monthly electrical consumption
• Gas (therms): Natural gas usage
• Water (gallons): Water consumption
• HVAC (kWh): Energy used by heating/cooling
• Lighting (kWh): Energy used by lighting systems
• Equipment (kWh): Energy used by other equipment
• Peak Demand (kW): Highest power demand
• Occupancy (%): Building occupancy rate
• Temperature (F): Outside temperature
• Humidity (%): Outside humidity
• Renewable Energy (kWh): On-site generation
• Energy Cost ($): Total utility costs`
  },
  buildingSystems: {
    title: "Building Systems Information",
    description: "Technical details about your building's major systems.",
    howToFind: "Consult building documentation, maintenance records, or facility manager.",
    importance: "Critical for identifying upgrade opportunities and system inefficiencies."
  },
  documentation: {
    title: "Supporting Documentation",
    description: "Additional files that provide context and verification.",
    howToFind: "Gather from building management, previous audits, and maintenance records.",
    importance: "Validates data and provides historical context for recommendations."
  }
};

// Add these constants at the top of the file, after the interfaces
const HVAC_SYSTEM_TYPES = [
  "Split System",
  "Packaged Unit",
  "Variable Refrigerant Flow (VRF)",
  "Chiller System",
  "Heat Pump",
  "Rooftop Unit (RTU)",
  "Variable Air Volume (VAV)",
  "Constant Air Volume (CAV)",
  "Ductless Mini-Split",
  "Other"
];

const REFRIGERANT_TYPES = [
  "R-410A",
  "R-32",
  "R-134a",
  "R-407C",
  "R-22 (Legacy)",
  "Other"
];

const WALL_CONSTRUCTION_TYPES = [
  "Brick Veneer",
  "Concrete Block",
  "Metal Panel",
  "Precast Concrete",
  "Steel Frame with EIFS",
  "Wood Frame",
  "Glass Curtain Wall",
  "Stone Veneer",
  "Other"
];

const ROOF_TYPES = [
  "Built-up Roofing (BUR)",
  "Modified Bitumen",
  "Single-ply Membrane (TPO/PVC)",
  "Metal Roof",
  "Green Roof",
  "Shingle Roof",
  "EPDM Rubber",
  "Spray Foam",
  "Other"
];

const WINDOW_TYPES = [
  "Single-pane",
  "Double-pane",
  "Triple-pane",
  "Low-E Coated",
  "Tinted",
  "Reflective",
  "Gas-filled",
  "Dynamic Glass",
  "Other"
];

// Add these tooltip descriptions after the existing constants
const SYSTEM_DESCRIPTIONS = {
  hvac: {
    "Split System": "Indoor and outdoor units working together. Common in residential and small commercial buildings.",
    "Packaged Unit": "All-in-one system typically installed on roofs. Good for buildings with limited indoor space.",
    "Variable Refrigerant Flow (VRF)": "Advanced system allowing multiple indoor units. Highly efficient for large buildings.",
    "Chiller System": "Uses water or coolant for cooling. Ideal for large commercial buildings.",
    "Heat Pump": "Can both heat and cool. Energy efficient alternative to traditional systems.",
    "Rooftop Unit (RTU)": "Self-contained system installed on roof. Common in commercial buildings.",
    "Variable Air Volume (VAV)": "Adjusts airflow for different zones. Good for buildings with varying occupancy.",
    "Constant Air Volume (CAV)": "Provides steady airflow. Simple and reliable for consistent loads.",
    "Ductless Mini-Split": "No ductwork required. Perfect for room additions or spot cooling.",
  },
  refrigerant: {
    "R-410A": "Common modern refrigerant. Better for environment than R-22.",
    "R-32": "Lower global warming potential. Becoming more common in new systems.",
    "R-134a": "Common in automotive and some commercial systems.",
    "R-407C": "Blend refrigerant. Often used to replace R-22 in existing systems.",
    "R-22 (Legacy)": "Phased out due to environmental concerns. Found in older systems.",
  },
  wall: {
    "Brick Veneer": "Durable exterior with good insulation properties.",
    "Concrete Block": "Strong and durable. Common in commercial construction.",
    "Metal Panel": "Lightweight and quick to install. Good for industrial buildings.",
    "Precast Concrete": "Factory-made panels. Excellent durability and insulation.",
    "Steel Frame with EIFS": "Exterior insulation finish system. Good thermal performance.",
    "Wood Frame": "Traditional construction. Cost-effective but needs maintenance.",
    "Glass Curtain Wall": "Modern appearance. Requires special consideration for solar gain.",
    "Stone Veneer": "Attractive natural appearance with good durability.",
  },
  roof: {
    "Built-up Roofing (BUR)": "Multiple layers of bitumen and reinforcing fabrics.",
    "Modified Bitumen": "Enhanced durability over traditional built-up roofing.",
    "Single-ply Membrane (TPO/PVC)": "Lightweight and reflective. Good energy efficiency.",
    "Metal Roof": "Long-lasting and low maintenance. Good for solar panel installation.",
    "Green Roof": "Vegetation cover. Excellent insulation and environmental benefits.",
    "Shingle Roof": "Traditional and cost-effective. Various styles available.",
    "EPDM Rubber": "Durable synthetic rubber membrane. Good weather resistance.",
    "Spray Foam": "Excellent insulation and seamless coverage.",
  },
  window: {
    "Single-pane": "Basic window type. Limited insulation properties.",
    "Double-pane": "Two glass layers with air gap. Better insulation than single-pane.",
    "Triple-pane": "Maximum insulation with three glass layers.",
    "Low-E Coated": "Special coating to reflect heat while allowing light.",
    "Tinted": "Reduces solar gain and glare. Good for warm climates.",
    "Reflective": "Mirrors outside light. Best for hot climates.",
    "Gas-filled": "Insulating gas between panes. Superior thermal performance.",
    "Dynamic Glass": "Can change tint automatically. Maximum control over solar gain.",
  }
};

// Add this function to validate CSV content before saving
const validateAndParseCSV = (content: string): boolean => {
  try {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one row of data');
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredHeaders = [
      'date', 'electricity (kwh)', 'gas (therms)', 'water (gallons)',
      'hvac (kwh)', 'lighting (kwh)', 'equipment (kwh)', 'peak demand (kw)',
      'occupancy (%)', 'outside temperature (f)', 'humidity (%)',
      'renewable energy (kwh)', 'energy cost ($)'
    ];

    const missingHeaders = requiredHeaders.filter(
      required => !headers.some(h => h.includes(required.toLowerCase()))
    );

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Validate each row
    lines.slice(1).forEach((line, index) => {
      const values = line.split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        throw new Error(`Row ${index + 2} has incorrect number of columns`);
      }

      // Validate that all numeric fields contain valid numbers
      values.forEach((value, colIndex) => {
        if (colIndex > 0) { // Skip date column
          if (isNaN(parseFloat(value))) {
            throw new Error(`Invalid number in row ${index + 2}, column ${headers[colIndex]}: ${value}`);
          }
        }
      });
    });

    return true;
  } catch (error) {
    console.error('CSV validation error:', error);
    throw error;
  }
};

const DataInput: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<BuildingForm>();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [floorPlanImage, setFloorPlanImage] = useState<File | null>(null);
  const [utilityBills, setUtilityBills] = useState<File[]>([]);
  const [buildingSystemsInventory, setBuildingSystemsInventory] = useState<File | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<File[]>([]);
  const [energyAuditHistory, setEnergyAuditHistory] = useState<File | null>(null);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(null);
  const navigate = useNavigate();
  const [buildingSystems, setBuildingSystems] = useState<BuildingSystems>({
    hvacSystem: {
      type: '',
      age: 0,
      efficiency: 0,
      refrigerantType: '',
      maintenanceSchedule: ''
    },
    lightingSystem: {
      types: [],
      controlSystems: [],
      operatingSchedule: ''
    },
    buildingEnvelope: {
      wallConstruction: '',
      roofType: '',
      windowTypes: [],
      insulationRValues: {
        walls: 0,
        roof: 0,
        foundation: 0
      }
    }
  });
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: BuildingForm) => {
    if (!user) {
      setError('Please sign in to submit data');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting data submission...', data);

      // Clear previous analysis results
      localStorage.removeItem('analysisResult');

      // Prepare building data
      const buildingDataToSave = {
        ...data,
        yearBuilt: Number(data.yearBuilt),
        numberOfFloors: Number(data.numberOfFloors),
        occupancyPercentage: Number(data.occupancyPercentage),
        size: Number(data.size),
        updatedAt: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('buildingData', JSON.stringify(buildingDataToSave));
      localStorage.setItem('buildingSystems', JSON.stringify(buildingSystems));
      if (verificationInfo) {
        localStorage.setItem('verificationInfo', JSON.stringify(verificationInfo));
      }

      // Handle CSV file and parse data
      let csvContent = '';
      let parsedCsvData = null;
      let uploadedFiles: { [key: string]: string } = {};
      
      if (csvFile) {
        const reader = new FileReader();
        csvContent = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(csvFile);
        });

        // Validate and save CSV content
        try {
          validateAndParseCSV(csvContent);
          localStorage.setItem('csvContent', csvContent);

          // Parse CSV for Firebase
          const lines = csvContent.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          parsedCsvData = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj: any, header, index) => {
              obj[header] = values[index]?.trim() || '';
              return obj;
            }, {});
          });
        } catch (error) {
          throw new Error(`Invalid CSV format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Please upload a CSV file with energy consumption data');
      }

      // Create a safe reference to user.uid
      const userId = user.uid;

      // Upload files first if they exist
      if (floorPlanImage) {
        const floorPlanUrl = await uploadFile(
          userId,
          'floorPlans',
          floorPlanImage
        );
        uploadedFiles.floorPlanUrl = floorPlanUrl;
      }

      // Prepare complete building data for Firebase
      const completeData = {
        ...buildingDataToSave,
        userId,
        buildingSystems,
        energyData: parsedCsvData,
        floorPlanUrl: uploadedFiles.floorPlanUrl || null,
        files: uploadedFiles,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save building data to Firebase first to get the ID
      const buildingId = await saveBuildingData(userId, completeData);
      console.log('Building data saved to Firebase with ID:', buildingId);

      // Now that we have buildingId, handle verification info
      if (verificationInfo?.verifierSignature) {
        const signatureUrl = await uploadFile(
          userId,
          'signatures',
          verificationInfo.verifierSignature
        );

        await saveVerificationInfo(userId, buildingId, {
          verifierName: verificationInfo.verifierName,
          verifierCredentials: verificationInfo.verifierCredentials,
          verifierLicenseNumber: verificationInfo.verifierLicenseNumber,
          verificationDate: verificationInfo.verificationDate,
          signatureUrl: signatureUrl
        });

        // Add signature URL to uploaded files
        uploadedFiles.verifierSignatureUrl = signatureUrl;
      }

      // Save building systems to Firebase
      await saveBuildingSystems(userId, buildingId, buildingSystems);

      // Update the building record with all file URLs
      if (Object.keys(uploadedFiles).length > 0) {
        await updateBuildingData(userId, buildingId, {
          files: uploadedFiles
        });
      }

      console.log('All data successfully saved to both localStorage and Firebase');
      navigate('/dashboard/analysis');

    } catch (err) {
      console.error('Error submitting data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while submitting data');
    } finally {
      setLoading(false);
    }
  };

  const onCsvDrop = (acceptedFiles: File[]) => {
    setCsvFile(acceptedFiles[0]);
  };

  const onImageDrop = (acceptedFiles: File[]) => {
    setFloorPlanImage(acceptedFiles[0]);
  };

  const { getRootProps: getCsvRootProps, getInputProps: getCsvInputProps, open: openFileDialog } = useDropzone({
    onDrop: onCsvDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    noClick: true, // Disable click on the entire dropzone
    noKeyboard: true,
    preventDropOnDocument: true,
    onDropAccepted: (files) => {
      setCsvFile(files[0]);
    },
    onDropRejected: () => {
      alert('Please upload a valid CSV file.');
    }
  });

  const downloadCsvTemplate = () => {
    const csvContent = `Date,Electricity (kWh),Gas (therms),Water (gallons),HVAC (kWh),Lighting (kWh),Equipment (kWh),Peak Demand (kW),Occupancy (%),Outside Temperature (F),Humidity (%),Renewable Energy (kWh),Energy Cost ($)
2024-01-01,1000,50,5000,400,300,300,150,85,72,45,0,125.50
2024-01-02,950,48,4800,380,290,280,140,80,70,40,0,120.00
2024-01-03,1100,52,5200,420,330,350,160,90,75,50,0,130.00
2024-01-04,980,49,4900,390,295,295,145,85,70,45,0,125.00
2024-01-05,1050,51,5100,410,315,325,155,95,80,55,0,135.00
2024-01-06,900,47,4700,360,270,270,135,75,65,40,0,115.00
2024-01-07,850,45,4500,340,255,255,125,65,60,35,0,105.00`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'energy_consumption_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add these dropzone hooks after the existing CSV dropzone
  const { getRootProps: getUtilityBillsRootProps, getInputProps: getUtilityBillsInputProps } = useDropzone({
    onDrop: (acceptedFiles) => setUtilityBills(prev => [...prev, ...acceptedFiles]),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  const { getRootProps: getBuildingSystemsRootProps, getInputProps: getBuildingSystemsInputProps } = useDropzone({
    onDrop: (acceptedFiles) => setBuildingSystemsInventory(acceptedFiles[0]),
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const { getRootProps: getMaintenanceRootProps, getInputProps: getMaintenanceInputProps } = useDropzone({
    onDrop: (acceptedFiles) => setMaintenanceRecords(prev => [...prev, ...acceptedFiles]),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  const { getRootProps: getAuditHistoryRootProps, getInputProps: getAuditHistoryInputProps } = useDropzone({
    onDrop: (acceptedFiles) => setEnergyAuditHistory(acceptedFiles[0]),
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf']
    }
  });

  // Add this effect to log localStorage contents after saving
  useEffect(() => {
    const logStorageContents = () => {
      const buildingData = localStorage.getItem('buildingData');
      const csvContent = localStorage.getItem('csvContent');
      const buildingSystems = localStorage.getItem('buildingSystems');
      const verificationInfo = localStorage.getItem('verificationInfo');

      console.log('localStorage contents:', {
        buildingData: buildingData ? JSON.parse(buildingData) : null,
        csvContentExists: !!csvContent,
        buildingSystems: buildingSystems ? JSON.parse(buildingSystems) : null,
        verificationInfo: verificationInfo ? JSON.parse(verificationInfo) : null
      });
    };

    // Log contents whenever component mounts or updates
    logStorageContents();
  }, []);

  return (
    <div className="flex">
      {/* Main content - wrap existing content */}
      <div className="flex-1 max-w-4xl">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-3">Data Input</h1>
          <p className="opacity-90">Enter your building information and upload energy consumption data.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Building Name</label>
                <input
                  type="text"
                  id="name"
                  {...register('name', { required: 'Building name is required' })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">Building Type</label>
                <select
                  id="type"
                  {...register('type', { required: 'Building type is required' })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a type</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
                {errors.type && <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">Building Size (sq ft)</label>
              <input
                type="number"
                id="size"
                {...register('size', { required: 'Building size is required', min: { value: 1, message: 'Size must be greater than 0' } })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.size && <p className="mt-2 text-sm text-red-600">{errors.size.message}</p>}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                id="location"
                {...register('location', { required: 'Location is required' })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.location && <p className="mt-2 text-sm text-red-600">{errors.location.message}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Energy Consumption Data (CSV)</label>
                <div className="flex items-center mb-4">
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center px-4 py-2 border border-indigo-600 rounded-lg text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Download size={16} className="mr-2" />
                    Download Template
                  </button>
                </div>
                <div 
                  {...getCsvRootProps()} 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    csvFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-indigo-500'
                  }`}
                >
                  <div className="space-y-1 text-center">
                    {csvFile ? (
                      <>
                        <div className="flex items-center justify-center text-green-600">
                          <CheckCircle className="h-12 w-12" />
                        </div>
                        <p className="text-sm font-medium text-green-600">
                          File uploaded: {csvFile.name}
                        </p>
                        <p className="text-xs text-green-500">
                          Click or drag to replace the file
                        </p>
                      </>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <button
                            type="button"
                            onClick={openFileDialog}
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            Upload a file
                          </button>
                          <input {...getCsvInputProps()} />
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">CSV up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Documentation & Verification</h3>
              
              {/* Utility Bills */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Utility Bills (Last 12 Months)
                </label>
                <div {...getUtilityBillsRootProps()} 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors">
                  <input {...getUtilityBillsInputProps()} />
                  <p className="text-sm text-gray-600">Drop utility bills or click to upload</p>
                  {utilityBills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-green-600">{utilityBills.length} files uploaded</p>
                      <ul className="text-xs text-gray-500">
                        {utilityBills.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Building Systems Inventory */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Building Systems Inventory
                </label>
                <div {...getBuildingSystemsRootProps()} 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors">
                  <input {...getBuildingSystemsInputProps()} />
                  <p className="text-sm text-gray-600">Upload building systems inventory document</p>
                  {buildingSystemsInventory && (
                    <p className="text-sm text-green-600 mt-2">{buildingSystemsInventory.name}</p>
                  )}
                </div>
              </div>

              {/* Maintenance Records */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Maintenance Records
                </label>
                <div {...getMaintenanceRootProps()} 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors">
                  <input {...getMaintenanceInputProps()} />
                  <p className="text-sm text-gray-600">Upload maintenance records</p>
                  {maintenanceRecords.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-green-600">{maintenanceRecords.length} files uploaded</p>
                      <ul className="text-xs text-gray-500">
                        {maintenanceRecords.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous Energy Audit History */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Previous Energy Audit History
                </label>
                <div {...getAuditHistoryRootProps()} 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors">
                  <input {...getAuditHistoryInputProps()} />
                  <p className="text-sm text-gray-600">Upload previous energy audit report</p>
                  {energyAuditHistory && (
                    <p className="text-sm text-green-600 mt-2">{energyAuditHistory.name}</p>
                  )}
                </div>
              </div>

              {/* Verification Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700">Professional Verification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verifier Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => setVerificationInfo(prev => ({
                        ...prev,
                        verifierName: e.target.value
                      } as VerificationInfo))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Credentials</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => setVerificationInfo(prev => ({
                        ...prev,
                        verifierCredentials: e.target.value
                      } as VerificationInfo))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => setVerificationInfo(prev => ({
                        ...prev,
                        verifierLicenseNumber: e.target.value
                      } as VerificationInfo))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verification Date</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => setVerificationInfo(prev => ({
                        ...prev,
                        verificationDate: e.target.value
                      } as VerificationInfo))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Building Systems Information</h3>
              
              {/* HVAC System */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700">HVAC System</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">System Type</label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.hvacSystem.type}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        hvacSystem: { ...buildingSystems.hvacSystem, type: e.target.value }
                      })}
                    >
                      <option value="">Select HVAC Type</option>
                      {HVAC_SYSTEM_TYPES.map((type) => (
                        <option 
                          key={type} 
                          value={type}
                          title={type !== 'Other' ? SYSTEM_DESCRIPTIONS.hvac[type as keyof typeof SYSTEM_DESCRIPTIONS.hvac] : 'Custom system type'}
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                    {buildingSystems.hvacSystem.type && buildingSystems.hvacSystem.type !== 'Other' && (
                      <p className="mt-1 text-sm text-gray-500">
                        {SYSTEM_DESCRIPTIONS.hvac[buildingSystems.hvacSystem.type as keyof typeof SYSTEM_DESCRIPTIONS.hvac]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">System Age (years)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.hvacSystem.age}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        hvacSystem: { ...buildingSystems.hvacSystem, age: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Refrigerant Type</label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.hvacSystem.refrigerantType}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        hvacSystem: { ...buildingSystems.hvacSystem, refrigerantType: e.target.value }
                      })}
                    >
                      <option value="">Select Refrigerant Type</option>
                      {REFRIGERANT_TYPES.map((type) => (
                        <option 
                          key={type} 
                          value={type}
                          title={type !== 'Other' && type in SYSTEM_DESCRIPTIONS.refrigerant 
                            ? SYSTEM_DESCRIPTIONS.refrigerant[type as keyof typeof SYSTEM_DESCRIPTIONS.refrigerant] 
                            : 'Custom refrigerant type'}
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                    {buildingSystems.hvacSystem.refrigerantType && buildingSystems.hvacSystem.refrigerantType !== 'Other' && (
                      <p className="mt-1 text-sm text-gray-500">
                        {SYSTEM_DESCRIPTIONS.refrigerant[buildingSystems.hvacSystem.refrigerantType as keyof typeof SYSTEM_DESCRIPTIONS.refrigerant]}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Building Envelope */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700">Building Envelope</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Wall Construction</label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.buildingEnvelope.wallConstruction}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        buildingEnvelope: { 
                          ...buildingSystems.buildingEnvelope, 
                          wallConstruction: e.target.value 
                        }
                      })}
                    >
                      <option value="">Select Wall Construction</option>
                      {WALL_CONSTRUCTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Roof Type</label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.buildingEnvelope.roofType}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        buildingEnvelope: { 
                          ...buildingSystems.buildingEnvelope, 
                          roofType: e.target.value 
                        }
                      })}
                    >
                      <option value="">Select Roof Type</option>
                      {ROOF_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Window Types</label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.buildingEnvelope.windowTypes[0] || ''}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        buildingEnvelope: { 
                          ...buildingSystems.buildingEnvelope, 
                          windowTypes: [e.target.value] 
                        }
                      })}
                    >
                      <option value="">Select Window Type</option>
                      {WINDOW_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lighting System */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700">Lighting System</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Operating Schedule</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 8AM-6PM Weekdays"
                    value={buildingSystems.lightingSystem.operatingSchedule}
                    onChange={(e) => setBuildingSystems({
                      ...buildingSystems,
                      lightingSystem: { 
                        ...buildingSystems.lightingSystem, 
                        operatingSchedule: e.target.value 
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Operating Hours (Weekday)</label>
                <input
                  type="text"
                  {...register('operatingHours.weekday', { required: 'Weekday operating hours are required' })}
                  placeholder="e.g., 8AM-6PM"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.operatingHours?.weekday && (
                  <p className="mt-2 text-sm text-red-600">{errors.operatingHours.weekday.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operating Hours (Weekend)</label>
                <input
                  type="text"
                  {...register('operatingHours.weekend', { required: 'Weekend operating hours are required' })}
                  placeholder="e.g., 10AM-4PM"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.operatingHours?.weekend && (
                  <p className="mt-2 text-sm text-red-600">{errors.operatingHours.weekend.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
              >
                Submit Data
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Info Sidebar */}
      <div className="w-96 ml-8 hidden xl:block">
        <div className="sticky top-8 bg-white rounded-xl shadow-sm p-6 space-y-8">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Data Input Guide</h2>
            <p className="mt-2 text-sm text-gray-600">Understanding the required information for your energy audit.</p>
          </div>

          {Object.entries(dataGuide).map(([key, guide]) => (
            <div key={key} className="space-y-3">
              <h3 className="text-md font-medium text-indigo-700">{guide.title}</h3>
              <p className="text-sm text-gray-600">{guide.description}</p>
              
              {guide.howToFind && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">How to find this data:</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{guide.howToFind}</p>
                </div>
              )}
              
              {guide.importance && (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-indigo-700 mb-1">Why it's important:</h4>
                  <p className="text-sm text-indigo-600/80">{guide.importance}</p>
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              Need help? Contact our support team for assistance with data collection and input.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataInput;
