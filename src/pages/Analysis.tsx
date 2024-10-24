import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { analyzeEnergyData } from '../utils/geminiApi';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useReports } from '../contexts/ReportContext'; // Remove Report from this import
import { Activity, FileText } from 'lucide-react';
import { BuildingSystems, VerificationInfo, Report } from '../types';


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
  const [energyData, setEnergyData] = useState<any[]>([]);
  const [usageByArea, setUsageByArea] = useState<any[]>([]);
  const [buildingSystems, setBuildingSystems] = useState<BuildingSystems | null>(null);
  const [utilityBillsData, setUtilityBillsData] = useState<string[]>([]);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(null);

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

  const parseCSVData = (csvContent: string) => {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Parse data for line chart (consumption over time)
    const timeSeriesData = lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        month: new Date(values[0]).toLocaleString('default', { month: 'short' }),
        electricity: parseFloat(values[1]),
        gas: parseFloat(values[2]),
        water: parseFloat(values[3]),
        peakDemand: parseFloat(values[7]),
        occupancy: parseFloat(values[8]),
        temperature: parseFloat(values[9]),
        humidity: parseFloat(values[10]),
        renewable: parseFloat(values[11]),
        cost: parseFloat(values[12])
      };
    });
    setEnergyData(timeSeriesData);
    
    // Calculate averages for bar chart (usage by area)
    const totalRows = lines.length - 1;
    const avgHVAC = lines.slice(1).reduce((sum, line) => sum + parseFloat(line.split(',')[4]), 0) / totalRows;
    const avgLighting = lines.slice(1).reduce((sum, line) => sum + parseFloat(line.split(',')[5]), 0) / totalRows;
    const avgEquipment = lines.slice(1).reduce((sum, line) => sum + parseFloat(line.split(',')[6]), 0) / totalRows;
    const avgOther = lines.slice(1).reduce((sum, line) => {
      const values = line.split(',');
      return sum + (parseFloat(values[1]) - (parseFloat(values[4]) + parseFloat(values[5]) + parseFloat(values[6])));
    }, 0) / totalRows;

    setUsageByArea([
      { area: 'HVAC', usage: avgHVAC },
      { area: 'Lighting', usage: avgLighting },
      { area: 'Equipment', usage: avgEquipment },
      { area: 'Other', usage: Math.max(0, avgOther) } // Ensure non-negative
    ]);
  };

  // Update the button text based on whether this is the first analysis
  const getAnalysisButtonText = () => {
    if (analysisResult) {
      return 'Regenerate Analysis';
    }
    return 'Generate Analysis';
  };

  // Modify the runAnalysis function to parse CSV data for charts
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const buildingData = localStorage.getItem('buildingData');
      const csvContent = localStorage.getItem('csvContent');
      const buildingSystems = localStorage.getItem('buildingSystems');
      const verificationInfo = localStorage.getItem('verificationInfo');

      if (!buildingData || !csvContent) {
        throw new Error('Required data is missing');
      }

      // Combine all data for analysis
      const analysisData = {
        building: JSON.parse(buildingData),
        systems: buildingSystems ? JSON.parse(buildingSystems) : null,
        verification: verificationInfo ? JSON.parse(verificationInfo) : null,
        energyData: csvContent
      };

      // Update the prompt to include new data points
      const analysisPrompt = `
        Analyze the energy consumption patterns for ${analysisData.building.name}, 
        a ${analysisData.building.type} building of ${analysisData.building.size} sq ft.
        
        Building Systems Information:
        - HVAC: ${analysisData.systems?.hvacSystem.type || 'N/A'} (Age: ${analysisData.systems?.hvacSystem.age || 'N/A'} years)
        - Building Envelope: ${analysisData.systems?.buildingEnvelope.wallConstruction || 'N/A'}
        - Lighting Schedule: ${analysisData.systems?.lightingSystem.operatingSchedule || 'N/A'}
        
        Consider:
        1. Energy consumption patterns and peak demand
        2. Impact of occupancy and weather conditions
        3. System efficiency based on age and type
        4. Potential for renewable energy integration
        5. Cost optimization opportunities
        
        Provide specific recommendations for:
        1. Immediate efficiency improvements
        2. Long-term system upgrades
        3. Operational schedule optimization
        4. Cost reduction strategies
      `;

      // Call your AI analysis function with the enhanced prompt
      const result = await analyzeEnergyData(analysisData, analysisPrompt);
      setAnalysisResult(result);
      localStorage.setItem('analysisResult', result);
    } catch (err) {
      console.error('Error running analysis:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (!analysisResult) {
      setError('No analysis data available. Please run the analysis first.');
      return;
    }
    
    setGeneratingReport(true);

    try {
      // Get building data and CSV content from localStorage
      const buildingData = localStorage.getItem('buildingData');
      const csvContent = localStorage.getItem('csvContent');

      if (!buildingData || !csvContent) {
        throw new Error('Required data is missing. Please ensure you have input building data.');
      }

      // Create PDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      const reportTitle = `Energy Audit Report - ${new Date().toLocaleDateString()}`;
      doc.text(reportTitle, 20, 20);

      // Add building information
      doc.setFontSize(16);
      doc.text("Building Information", 20, 40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const buildingInfo = JSON.parse(buildingData);
      Object.entries(buildingInfo).forEach(([key, value], index) => {
        doc.text(`${key}: ${value}`, 20, 50 + (index * 10));
      });

      // Add analysis results
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Analysis Results", 20, 100);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const splitAnalysis = doc.splitTextToSize(analysisResult, 170);
      doc.text(splitAnalysis, 20, 110);

      // Add the new report to the global context
      const newReport: Report = {
        id: Date.now().toString(),
        title: reportTitle,
        date: new Date().toLocaleDateString(),
        content: csvContent,
        analysisResult: analysisResult,
        buildingData: JSON.parse(buildingData)
      };
      
      addReport(newReport);

      // Save the PDF
      doc.save(`energy_audit_report_${newReport.id}.pdf`);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-3">Energy Analysis</h1>
        <p className="opacity-90">Comprehensive analysis of your building's energy consumption.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Energy Consumption Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="consumption" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
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

      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Gemini-Powered Analysis</h2>
        
        {!loading && !error && (
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
        )}

        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
            <p className="font-bold">Running analysis, please wait...</p>
            <p className="text-sm">This may take a few moments.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button
              className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => navigate('/data-input')}
            >
              Return to Data Input
            </button>
          </div>
        )}

        {analysisResult && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Analysis Result:</h3>
            <p className="whitespace-pre-wrap">{analysisResult}</p>
          </div>
        )}
      </div>

      {reports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-xl font-semibold mb-6">Generated Reports</h2>
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-500">{report.date}</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => viewReport(report)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => downloadReport(report)}
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="text-red-600 hover:text-red-800 font-medium"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{selectedReport.title}</h3>
              <div className="mt-2 px-7 py-3">
                <h4 className="font-medium mb-2">Analysis Result:</h4>
                <p className="text-sm text-gray-500 mb-4 whitespace-pre-wrap">
                  {selectedReport.analysisResult}
                </p>
                <h4 className="font-medium mb-2">Raw Data:</h4>
                <pre className="text-sm text-gray-500 overflow-x-auto">
                  {selectedReport.content}
                </pre>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  onClick={closeReport}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
