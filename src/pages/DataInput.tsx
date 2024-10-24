import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle } from 'lucide-react';

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

  const onSubmit = async (data: BuildingForm) => {
    if (!csvFile) {
      alert('Please upload a CSV file with energy consumption data.');
      return;
    }

    const formData = new FormData();
    formData.append('buildingData', JSON.stringify(data));
    formData.append('buildingSystems', JSON.stringify(buildingSystems));
    formData.append('csvFile', csvFile);
    
    // Append new files and data
    utilityBills.forEach((file, index) => {
      formData.append(`utilityBills[${index}]`, file);
    });
    
    if (buildingSystemsInventory) {
      formData.append('buildingSystemsInventory', buildingSystemsInventory);
    }
    
    maintenanceRecords.forEach((file, index) => {
      formData.append(`maintenanceRecords[${index}]`, file);
    });
    
    if (energyAuditHistory) {
      formData.append('energyAuditHistory', energyAuditHistory);
    }
    
    if (verificationInfo) {
      formData.append('verificationInfo', JSON.stringify(verificationInfo));
    }

    if (floorPlanImage) {
      formData.append('floorPlanImage', floorPlanImage);
    }

    // Store the data in localStorage
    localStorage.setItem('buildingData', JSON.stringify(data));
    localStorage.setItem('csvFileName', csvFile.name);

    // Read the CSV file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      localStorage.setItem('csvContent', csvContent);
      // Remove any existing analysis result so user can generate a new one
      localStorage.removeItem('analysisResult');
      navigate('/dashboard/analysis');
    };
    reader.readAsText(csvFile);
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
    const csvContent = `Date,Electricity (kWh),Gas (therms),Water (gallons),HVAC (kWh),Lighting (kWh),Equipment (kWh),Peak Demand (kW),Occupancy (%),Outside Temperature (F),Humidity (%),Renewable Energy Generated (kWh),Energy Cost ($)
2023-01-01,1000,50,5000,400,300,300,150,85,72,45,0,125.50
2023-01-02,950,48,4800,380,290,280,140,80,70,40,0,120.00
2023-01-03,1100,52,5200,420,330,350,160,90,75,50,0,130.00
2023-01-04,980,49,4900,390,295,295,145,85,70,45,0,125.00
2023-01-05,1050,51,5100,410,315,325,155,95,80,55,0,135.00
2023-01-06,900,47,4700,360,270,270,135,75,65,40,0,115.00
2023-01-07,850,45,4500,340,255,255,125,65,60,35,0,105.00`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'energy_consumption_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up the URL object
    }
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
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.hvacSystem.type}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        hvacSystem: { ...buildingSystems.hvacSystem, type: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">System Age (years)</label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.hvacSystem.age}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        hvacSystem: { ...buildingSystems.hvacSystem, age: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Building Envelope */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700">Building Envelope</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Wall Construction</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.buildingEnvelope.wallConstruction}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        buildingEnvelope: { 
                          ...buildingSystems.buildingEnvelope, 
                          wallConstruction: e.target.value 
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Roof Type</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={buildingSystems.buildingEnvelope.roofType}
                      onChange={(e) => setBuildingSystems({
                        ...buildingSystems,
                        buildingEnvelope: { 
                          ...buildingSystems.buildingEnvelope, 
                          roofType: e.target.value 
                        }
                      })}
                    />
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
