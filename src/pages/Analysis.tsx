import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { analyzeEnergyData } from '../utils/geminiApi';
import { deleteReportFromFirebase } from '../services/firebase/database';  // Add this import
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useReports } from '../contexts/ReportContext';
import { Activity, FileText } from 'lucide-react';
import { BuildingSystems, VerificationInfo, Report } from '../types';
import { useAuth } from '../contexts/AuthContext';


// Mock data for charts (replace with actual data in production)
const energyConsumptionData = [
  { month: 'Jan', consumption: 200 },
  { month: 'Feb', consumption: 180 },
  { month: 'Mar', consumption: 220 },
  { month: 'Apr', consumption: 190 },
  { month: 'May', consumption: 210 },
  { month: 'Jun', consumption: 240 },
];

const energyUsageByAreaData = [
  { area: 'Lighting', usage: 30 },
  { area: 'HVAC', usage: 45 },
  { area: 'Equipment', usage: 25 },
  { area: 'Other', usage: 10 },
];

// Add these interfaces at the top of the file
interface CSVRowData {
  [key: string]: string | number;
}

interface TimeSeriesData {
  month: string;
  electricity: number;
  gas: number;
  water: number;
  hvac: number;
  lighting: number;
  equipment: number;
  peakDemand: number;
  occupancy: number;
  temperature: number;
  humidity: number;
  renewableEnergy: number;
  energyCost: number;
}

const Analysis: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<string | null>(() => {
    // Initialize from localStorage if available
    return localStorage.getItem('analysisResult');
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const navigate = useNavigate();
  const { reports, addReport, deleteReport } = useReports();
  const [energyData, setEnergyData] = useState<TimeSeriesData[]>([]);
  const [usageByArea, setUsageByArea] = useState<any[]>([]);
  const [buildingSystems, setBuildingSystems] = useState<BuildingSystems | null>(null);
  const [utilityBillsData, setUtilityBillsData] = useState<string[]>([]);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(null);
  const [systemPerformanceData, setSystemPerformanceData] = useState<any[]>([]);
  const [systemAnalysisData, setSystemAnalysisData] = useState<any[]>([]);
  // Add new state for unit selection
  const [selectedUnit, setSelectedUnit] = useState<'electricity' | 'gas' | 'water'>('electricity');
  const [buildingData, setBuildingData] = useState<any>(null); // Add this state
  const { user } = useAuth();

  useEffect(() => {
    // Load previous analysis result if it exists
    const savedAnalysis = localStorage.getItem('analysisResult');
    if (savedAnalysis) {
      setAnalysisResult(savedAnalysis);
    }
  }, []);

  useEffect(() => {
    // Load and parse CSV data when component mounts or when CSV content changes
    const csvContent = localStorage.getItem('csvContent');
    if (csvContent) {
      // Clear previous analysis when new CSV is loaded
      setAnalysisResult(null);
      localStorage.removeItem('analysisResult');
      parseCSVData(csvContent);
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    // Load all saved data when component mounts
    const buildingSystemsData = localStorage.getItem('buildingSystems');
    const verificationData = localStorage.getItem('verificationInfo');
    
    if (buildingSystemsData) {
      setBuildingSystems(JSON.parse(buildingSystemsData));
    }
    if (verificationData) {
      setVerificationInfo(JSON.parse(verificationData));
    }
  }, []);

  // Add this useEffect to load building data
  useEffect(() => {
    const loadBuildingData = () => {
      const storedBuildingData = localStorage.getItem('buildingData');
      if (storedBuildingData) {
        try {
          const parsed = JSON.parse(storedBuildingData);
          setBuildingData(parsed);
          console.log('Loaded building data:', parsed); // Debug log
        } catch (error) {
          console.error('Error parsing building data:', error);
        }
      }
    };

    loadBuildingData();
  }, []);

  // Update useEffect to populate system performance and analysis data
  useEffect(() => {
    const loadAllData = () => {
      const buildingSystemsData = localStorage.getItem('buildingSystems');
      const csvContent = localStorage.getItem('csvContent');
      
      if (buildingSystemsData) {
        const systems = JSON.parse(buildingSystemsData);
        setBuildingSystems(systems);
        
        // Generate system analysis data
        const analysisData = [
          {
            system: 'HVAC System',
            efficiency: systems.hvacSystem.efficiency,
            age: systems.hvacSystem.age,
            type: systems.hvacSystem.type,
            schedule: systems.hvacSystem.maintenanceSchedule
          },
          {
            system: 'Lighting System',
            efficiency: 0.9, // Default value if not available
            type: systems.lightingSystem.types.join(', '),
            schedule: systems.lightingSystem.operatingSchedule
          },
          {
            system: 'Building Envelope',
            efficiency: 0.85, // Default value if not available
            type: `${systems.buildingEnvelope.wallConstruction}, ${systems.buildingEnvelope.roofType}`,
            insulation: `Walls: R-${systems.buildingEnvelope.insulationRValues.walls}, Roof: R-${systems.buildingEnvelope.insulationRValues.roof}`
          }
        ];
        setSystemAnalysisData(analysisData);

        // Generate performance data from CSV if available
        if (csvContent) {
          const csvLines = csvContent.trim().split('\n');
          const headers = csvLines[0].split(',');
          const performanceData = csvLines.slice(1).map(line => {
            const values = line.split(',');
            return {
              month: values[0], // Assuming first column is date/month
              hvacEfficiency: systems.hvacSystem.efficiency,
              actualUsage: parseFloat(values[headers.indexOf('HVAC')]) || 0
            };
          });
          setSystemPerformanceData(performanceData);
        }
      }
    };

    loadAllData();
  }, []);

  const parseCSVData = (csvContent: string) => {
    try {
      console.log('Starting CSV parsing with content:', csvContent.substring(0, 100));
      
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file must contain headers and at least one row of data');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      console.log('CSV headers:', headers);

      // Make header matching more flexible
      const getHeaderIndex = (searchTerms: string[]): number => {
        return headers.findIndex(h => 
          searchTerms.some(term => h.includes(term.toLowerCase()))
        );
      };

      // Map header positions
      const headerMap = {
        date: getHeaderIndex(['date']),
        electricity: getHeaderIndex(['electricity', 'electric']),
        gas: getHeaderIndex(['gas', 'natural gas']),
        water: getHeaderIndex(['water']),
        hvac: getHeaderIndex(['hvac']),
        lighting: getHeaderIndex(['lighting']),
        equipment: getHeaderIndex(['equipment']),
        peakDemand: getHeaderIndex(['peak demand', 'demand']),
        occupancy: getHeaderIndex(['occupancy']),
        temperature: getHeaderIndex(['temperature', 'temp']),
        humidity: getHeaderIndex(['humidity']),
        renewableEnergy: getHeaderIndex(['renewable']),
        energyCost: getHeaderIndex(['cost', 'energy cost'])
      };

      // Validate that all required headers were found
      const missingHeaders = Object.entries(headerMap)
        .filter(([key, index]) => index === -1)
        .map(([key]) => key);

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Process the data rows
      const timeSeriesData: TimeSeriesData[] = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        
        // Parse the values with error checking
        const parseNumber = (index: number, fieldName: string): number => {
          if (index === -1) return 0;
          const value = values[index];
          const num = parseFloat(value);
          if (isNaN(num)) {
            console.warn(`Invalid number for ${fieldName} in row ${index + 2}: ${value}, using 0`);
            return 0;
          }
          return num;
        };

        return {
          month: values[headerMap.date] || `Row ${index + 2}`,
          electricity: parseNumber(headerMap.electricity, 'electricity'),
          gas: parseNumber(headerMap.gas, 'gas'),
          water: parseNumber(headerMap.water, 'water'),
          hvac: parseNumber(headerMap.hvac, 'hvac'),
          lighting: parseNumber(headerMap.lighting, 'lighting'),
          equipment: parseNumber(headerMap.equipment, 'equipment'),
          peakDemand: parseNumber(headerMap.peakDemand, 'peak demand'),
          occupancy: parseNumber(headerMap.occupancy, 'occupancy'),
          temperature: parseNumber(headerMap.temperature, 'temperature'),
          humidity: parseNumber(headerMap.humidity, 'humidity'),
          renewableEnergy: parseNumber(headerMap.renewableEnergy, 'renewable energy'),
          energyCost: parseNumber(headerMap.energyCost, 'energy cost')
        };
      });

      console.log('Successfully parsed time series data:', timeSeriesData);
      setEnergyData(timeSeriesData);

      // Calculate and set usage by area
      const usageData = [
        { area: 'HVAC', usage: Math.round(average(timeSeriesData.map(d => d.hvac))) },
        { area: 'Lighting', usage: Math.round(average(timeSeriesData.map(d => d.lighting))) },
        { area: 'Equipment', usage: Math.round(average(timeSeriesData.map(d => d.equipment))) }
      ];

      setUsageByArea(usageData);
      return timeSeriesData;

    } catch (error) {
      console.error('Error parsing CSV data:', error);
      setError(error instanceof Error ? error.message : 'Error parsing CSV data. Please check the format.');
      throw error;
    }
  };

  // Helper function to calculate average
  const average = (numbers: number[]): number => {
    return numbers.length === 0 ? 0 : numbers.reduce((a, b) => a + b, 0) / numbers.length;
  };

  const calculateAverage = (data: CSVRowData[], fields: string[]) => {
    const values = data.flatMap(row => 
      fields.map(field => {
        const value = row[field];
        return typeof value === 'string' ? parseFloat(value) : value;
      }).filter(val => !isNaN(val) && val > 0)
    );
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  // Update the button text based on whether this is the first analysis
  const getAnalysisButtonText = () => {
    if (analysisResult) {
      return 'Regenerate Analysis';
    }
    return 'Generate Analysis';
  };

  // Modify the runAnalysis function to pass both required arguments
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const buildingDataStr = localStorage.getItem('buildingData');
      const csvContent = localStorage.getItem('csvContent');
      
      if (!buildingDataStr || !csvContent) {
        throw new Error('Required data is missing. Please ensure all data is entered.');
      }

      const parsedBuildingData = JSON.parse(buildingDataStr);
      const parsedTimeSeriesData = parseCSVData(csvContent);

      const analysisData = {
        building: parsedBuildingData,
        energyData: parsedTimeSeriesData,
        timestamp: new Date().toISOString()
      };

      const prompt = createAnalysisPrompt(parsedBuildingData, parsedTimeSeriesData);
      const result = await analyzeEnergyData(analysisData, prompt);
      
      setAnalysisResult(result);
      localStorage.setItem('analysisResult', result);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const createAnalysisPrompt = (buildingData: any, timeSeriesData: TimeSeriesData[]) => {
    const averages = calculateAverages(timeSeriesData);
    
    return `
      Analyze the energy consumption patterns for building ${buildingData.name}, a comprehensive energy audit analysis:

      Building Information:
      - Name: ${buildingData.name}
      - Type: ${buildingData.type || 'N/A'}
      - Size: ${buildingData.size || 'N/A'} sq ft
      - Location: ${buildingData.location || 'N/A'}
      - Year Built: ${buildingData.yearBuilt || 'N/A'}
      - Number of Floors: ${buildingData.numberOfFloors || 'N/A'}
      - Occupancy: ${buildingData.occupancyPercentage || 'N/A'}%

      Energy Consumption Averages:
      - Average Electricity Usage: ${averages.electricity.toFixed(2)} kWh
      - Average Gas Usage: ${averages.gas.toFixed(2)} therms
      - Average Water Usage: ${averages.water.toFixed(2)} gallons
      - Average Peak Demand: ${averages.peakDemand.toFixed(2)} kW
      - Average Occupancy: ${averages.occupancy.toFixed(2)}%
      - Average Energy Cost: $${averages.energyCost.toFixed(2)}
      - Renewable Energy Generation: ${averages.renewableEnergy.toFixed(2)} kWh

      System-Specific Usage:
      - HVAC: ${averages.hvac.toFixed(2)} kWh
      - Lighting: ${averages.lighting.toFixed(2)} kWh
      - Equipment: ${averages.equipment.toFixed(2)} kWh

      Environmental Conditions:
      - Average Temperature: ${averages.temperature.toFixed(2)}°F
      - Average Humidity: ${averages.humidity.toFixed(2)}%

      Please provide a detailed analysis including:
      1. Energy consumption patterns and trends
      2. Peak demand analysis
      3. System performance evaluation
      4. Cost analysis and potential savings
      5. Environmental impact assessment
      6. Recommendations for optimization
    `;
  };

  const calculateAverages = (data: TimeSeriesData[]) => {
    const sum = data.reduce((acc, curr) => ({
      electricity: acc.electricity + curr.electricity,
      gas: acc.gas + curr.gas,
      water: acc.water + curr.water,
      hvac: acc.hvac + curr.hvac,
      lighting: acc.lighting + curr.lighting,
      equipment: acc.equipment + curr.equipment,
      peakDemand: acc.peakDemand + curr.peakDemand,
      occupancy: acc.occupancy + curr.occupancy,
      temperature: acc.temperature + curr.temperature,
      humidity: acc.humidity + curr.humidity,
      renewableEnergy: acc.renewableEnergy + curr.renewableEnergy,
      energyCost: acc.energyCost + curr.energyCost
    }), {
      electricity: 0, gas: 0, water: 0, hvac: 0, lighting: 0, equipment: 0,
      peakDemand: 0, occupancy: 0, temperature: 0, humidity: 0,
      renewableEnergy: 0, energyCost: 0
    });

    const count = data.length;
    return Object.keys(sum).reduce((acc: any, key) => {
      acc[key] = sum[key as keyof typeof sum] / count;
      return acc;
    }, {});
  };

  // Update the generateReport function
  const generateReport = () => {
    if (!analysisResult) {
      setError('No analysis data available. Please run the analysis first.');
      return;
    }
    
    setGeneratingReport(true);

    try {
      const buildingData = localStorage.getItem('buildingData');
      const csvContent = localStorage.getItem('csvContent');
      const buildingSystems = localStorage.getItem('buildingSystems');

      if (!buildingData || !csvContent) {
        throw new Error('Required data is missing');
      }

      // Create PDF with larger page size for more content
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add header with logo placeholder
      doc.setFillColor(65, 70, 238); // Indigo color
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Energy Audit Report", 15, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString(), 160, 15);

      // Reset text color for body
      doc.setTextColor(0, 0, 0);

      // Executive Summary
      let yPos = 35;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Executive Summary", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const buildingInfo = JSON.parse(buildingData);
      const summaryText = `This report presents a comprehensive energy audit analysis for ${buildingInfo.name}, 
      a ${buildingInfo.size} sq ft ${buildingInfo.type} building located in ${buildingInfo.location}. 
      The analysis includes detailed evaluation of energy consumption patterns, building systems performance, 
      and recommendations for energy efficiency improvements.`;
      const splitSummary = doc.splitTextToSize(summaryText, 180);
      doc.text(splitSummary, 15, yPos);
      yPos += splitSummary.length * 7;

      // Building Information Section
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Building Information", 15, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      const buildingDetails = [
        `Building Name: ${buildingInfo.name}`,
        `Type: ${buildingInfo.type}`,
        `Size: ${buildingInfo.size} sq ft`,
        `Location: ${buildingInfo.location}`,
        `Year Built: ${buildingInfo.yearBuilt}`,
        `Number of Floors: ${buildingInfo.numberOfFloors}`,
        `Occupancy: ${buildingInfo.occupancyPercentage}%`,
        `Operating Hours: Weekday ${buildingInfo.operatingHours?.weekday || 'N/A'}, Weekend ${buildingInfo.operatingHours?.weekend || 'N/A'}`,
        `Last Retrofit: ${buildingInfo.lastRetrofit || 'N/A'}`,
        `Energy Star Score: ${buildingInfo.energyStarScore || 'N/A'}`
      ];

      buildingDetails.forEach(detail => {
        doc.text(detail, 15, yPos);
        yPos += 7;
      });

      // Building Systems Section
      if (buildingSystems) {
        yPos += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Building Systems", 15, yPos);
        yPos += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);

        const systems = JSON.parse(buildingSystems);
        const systemsText = formatBuildingSystems(systems);
        systemsText.forEach(line => {
          if (yPos > 270) { // Check if we need a new page
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 15, yPos);
          yPos += 7;
        });
      }

      // Analysis Results Section
      doc.addPage();
      yPos = 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Energy Analysis Results", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      // Format analysis result with proper sections
      const formattedAnalysis = formatAnalysisResult(analysisResult);
      formattedAnalysis.forEach(section => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        if (section.isHeader) {
          doc.setFont("helvetica", "bold");
          yPos += 5;
        } else {
          doc.setFont("helvetica", "normal");
        }
        const splitText = doc.splitTextToSize(section.text, 180);
        doc.text(splitText, 15, yPos);
        yPos += splitText.length * 7;
      });

      // Add charts and graphs page
      doc.addPage();
      // ... Add visualization code here ...

      // Save the PDF
      const reportId = Date.now().toString();
      doc.save(`energy_audit_report_${reportId}.pdf`);

      // Create and save report object
      const newReport: Report = {
        id: reportId,
        title: `Energy Audit Report - ${buildingInfo.name}`,
        date: new Date().toLocaleDateString(),
        content: csvContent,
        analysisResult: analysisResult,
        buildingData: buildingInfo,
        buildingSystems: buildingSystems ? JSON.parse(buildingSystems) : null
      };

      addReport(newReport);
      
      // Update localStorage
      const existingReports = JSON.parse(localStorage.getItem('reports') || '[]');
      localStorage.setItem('reports', JSON.stringify([...existingReports, newReport]));

    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Helper function to format building systems data
  const formatBuildingSystems = (systems: BuildingSystems): string[] => {
    const lines: string[] = [];
    
    // HVAC System
    lines.push('HVAC System:');
    lines.push(`  • Type: ${systems.hvacSystem.type}`);
    lines.push(`  • Age: ${systems.hvacSystem.age} years`);
    lines.push(`  • Efficiency: ${systems.hvacSystem.efficiency}`);
    lines.push(`  • Refrigerant: ${systems.hvacSystem.refrigerantType}`);
    lines.push(`  • Maintenance Schedule: ${systems.hvacSystem.maintenanceSchedule}`);
    lines.push('');
    
    // Lighting System
    lines.push('Lighting System:');
    lines.push(`  • Types: ${systems.lightingSystem.types.join(', ')}`);
    lines.push(`  • Control Systems: ${systems.lightingSystem.controlSystems.join(', ')}`);
    lines.push(`  • Operating Schedule: ${systems.lightingSystem.operatingSchedule}`);
    lines.push('');
    
    // Building Envelope
    lines.push('Building Envelope:');
    lines.push(`  • Wall Construction: ${systems.buildingEnvelope.wallConstruction}`);
    lines.push(`  • Roof Type: ${systems.buildingEnvelope.roofType}`);
    lines.push(`  • Window Types: ${systems.buildingEnvelope.windowTypes.join(', ')}`);
    lines.push('  • Insulation R-Values:');
    lines.push(`    - Walls: ${systems.buildingEnvelope.insulationRValues.walls}`);
    lines.push(`    - Roof: ${systems.buildingEnvelope.insulationRValues.roof}`);
    lines.push(`    - Foundation: ${systems.buildingEnvelope.insulationRValues.foundation}`);
    
    return lines;
  };

  // Helper function to format analysis result
  const formatAnalysisResult = (result: string): Array<{text: string, isHeader: boolean}> => {
    const sections = result.split('\n\n');
    const formatted: Array<{text: string, isHeader: boolean}> = [];
    
    sections.forEach(section => {
      if (section.includes('**')) {
        // Handle headers
        const headerText = section.replace(/\*\*/g, '').trim();
        formatted.push({ text: headerText, isHeader: true });
      } else {
        // Handle regular content
        formatted.push({ text: section.trim(), isHeader: false });
      }
    });
    
    return formatted;
  };

  const viewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const closeReport = () => {
    setSelectedReport(null);
  };

  const handleDeleteReport = (id: string) => {
    deleteReport(id);
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(null);
    }
  };

  const downloadReport = (report: Report) => {
    const doc = new jsPDF();
    
    // Add content to the PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(report.title, 20, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Generated on: " + report.date, 20, 30);

    // Add Building Data Section
    doc.setFontSize(16);
    doc.text("Building Information", 20, 45);
    doc.setFontSize(12);
    const buildingInfo = JSON.stringify(report.buildingData, null, 2)
      .split('\n')
      .slice(1, -1)
      .join('\n')
      .replace(/["{},]/g, '');
    doc.text(buildingInfo, 20, 55);

    // Add Analysis Results Section
    doc.setFontSize(16);
    doc.text("Analysis Results", 20, 120);
    doc.setFontSize(12);
    const splitAnalysis = doc.splitTextToSize(report.analysisResult, 170);
    doc.text(splitAnalysis, 20, 130);

    // Add Raw Data Section
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Raw Data", 20, 20);
    doc.setFontSize(10);
    const splitContent = doc.splitTextToSize(report.content, 170);
    doc.text(splitContent, 20, 30);

    // Save the PDF
    doc.save(`energy_audit_report_${report.id}.pdf`);
  };

  // Add useEffect to load reports from localStorage on mount
  useEffect(() => {
    const savedReports = localStorage.getItem('reports');
    if (savedReports) {
      const parsedReports = JSON.parse(savedReports);
      // Update the reports context with saved reports
      parsedReports.forEach((report: Report) => {
        addReport(report);
      });
    }
  }, [addReport]);

  // Add these functions before the return statement

  const handleDownload = (report: Report) => {
    try {
      const doc = new jsPDF();
      
      // Add content to the PDF
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(report.title, 20, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text("Generated on: " + report.date, 20, 30);

      // Add Building Data Section
      doc.setFontSize(16);
      doc.text("Building Information", 20, 45);
      doc.setFontSize(12);
      const buildingInfo = JSON.stringify(report.buildingData, null, 2)
        .split('\n')
        .slice(1, -1)
        .join('\n')
        .replace(/["{},]/g, '');
      doc.text(buildingInfo, 20, 55);

      // Add Analysis Results Section
      doc.setFontSize(16);
      doc.text("Analysis Results", 20, 120);
      doc.setFontSize(12);
      const splitAnalysis = doc.splitTextToSize(report.analysisResult, 170);
      doc.text(splitAnalysis, 20, 130);

      // Save the PDF
      doc.save(`energy_audit_report_${report.id}.pdf`);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report');
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Delete from Firebase first
      await deleteReportFromFirebase(user.uid, reportId);
      
      // Then delete from local state using context
      deleteReport(reportId);
      
      // Close modal if the deleted report was being viewed
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      setError('Failed to delete report');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-3">Energy Analysis</h1>
        <p className="opacity-90">
          {buildingData ? `Analysis for ${buildingData.name}` : 'Comprehensive analysis of your building\'s energy consumption.'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => navigate('/data-input')}
                className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Return to Data Input
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Energy Consumption Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Energy Consumption Over Time</h2>
            <select 
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value as 'electricity' | 'gas' | 'water')}
            >
              <option value="electricity">Electricity</option>
              <option value="gas">Gas</option>
              <option value="water">Water</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={selectedUnit}
                stroke="#4f46e5" 
                name={selectedUnit.charAt(0).toUpperCase() + selectedUnit.slice(1)}
                strokeWidth={2} 
                dot={{ r: 4 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Energy Usage by Area</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageByArea}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="area" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="usage" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gemini Analysis Section */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Gemini-Powered Analysis</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3">Analyzing data...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={runAnalysis}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Activity className="mr-2 h-5 w-5" />
                {getAnalysisButtonText()}
              </button>

              {analysisResult && (
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  {generatingReport ? 'Generating Report...' : 'Generate Report'}
                </button>
              )}
            </div>

            {/* Analysis Result Display */}
            {analysisResult && (
              <div className="mt-6">
                <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50 p-6 rounded-lg shadow-lg border border-indigo-100">
                  <div className="prose max-w-none">
                    {/* Split analysis into paragraphs and render with proper formatting */}
                    {analysisResult.split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="mb-4 text-gray-700 last:mb-0">
                          {paragraph}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Analysis Section */}
      {buildingSystems && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">System Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Performance Chart */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">System Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={systemPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="hvacEfficiency" 
                    stroke="#82ca9d" 
                    name="HVAC Efficiency"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actualUsage" 
                    stroke="#8884d8" 
                    name="Actual Usage"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Systems Details */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Systems Details</h3>
              <div className="space-y-4">
                {systemAnalysisData.map((system) => (
                  <div key={system.system} className="p-4 bg-white border rounded-lg">
                    <h4 className="font-semibold text-indigo-600">{system.system}</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Efficiency: {(system.efficiency * 100).toFixed(1)}%</p>
                      {system.age && <p>Age: {system.age} years</p>}
                      {system.type && <p>Type: {system.type}</p>}
                      {system.schedule && <p>Schedule: {system.schedule}</p>}
                      {system.insulation && <p>Insulation: {system.insulation}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Section */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6">Generated Reports</h2>
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <h3 className="font-medium">{report.title}</h3>
                  <p className="text-sm text-gray-500">{report.date}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(report)}
                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{selectedReport.title}</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap">{selectedReport.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
