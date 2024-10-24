import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { analyzeEnergyData } from '../utils/geminiApi';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useReports, Report } from '../contexts/ReportContext';

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
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const navigate = useNavigate();
  const { reports, addReport, deleteReport } = useReports();

  useEffect(() => {
    // Load previous analysis result if it exists
    const savedAnalysis = localStorage.getItem('analysisResult');
    if (savedAnalysis) {
      setAnalysisResult(savedAnalysis);
    }
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const buildingData = localStorage.getItem('buildingData');
      const csvContent = localStorage.getItem('csvContent');

      if (!buildingData || !csvContent) {
        throw new Error('Building data or CSV content is missing. Please go back to the Data Input page and submit the required information.');
      }

      const parsedBuildingData = JSON.parse(buildingData);
      const result = await analyzeEnergyData(parsedBuildingData, csvContent);
      setAnalysisResult(result);
      localStorage.setItem('analysisResult', result);
    } catch (err) {
      console.error('Error running analysis:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while running the analysis.');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (!analysisResult) return;
    
    setGeneratingReport(true);

    // Simulate report generation delay
    setTimeout(() => {
      const buildingData = JSON.parse(localStorage.getItem('buildingData') || '{}');
      const csvContent = localStorage.getItem('csvContent') || '';

      // Create PDF
      const doc = new jsPDF();
      // ... existing PDF generation code ...

      // Add the new report to the global context
      const newReport: Report = {
        id: Date.now().toString(),
        title: `Energy Audit Report ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleDateString(),
        content: csvContent,
        analysisResult: analysisResult,
        buildingData: buildingData
      };
      addReport(newReport);

      // Save the PDF
      doc.save(`energy_audit_report_${newReport.id}.pdf`);
      setGeneratingReport(false);
    }, 2000);
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Energy Analysis</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Energy Consumption Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={energyConsumptionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="consumption" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Energy Usage by Area</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={energyUsageByAreaData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="area" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="usage" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">AI-Powered Analysis</h2>
        {!analysisResult && !loading && !error && (
          <button
            onClick={runAnalysis}
            className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Run Analysis
          </button>
        )}
        
        {analysisResult && !loading && !error && (
          <div className="mb-4">
            <button
              onClick={runAnalysis}
              className="mr-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Regenerate Analysis
            </button>
            <button
              onClick={generateReport}
              disabled={generatingReport}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {generatingReport ? 'Generating Report...' : 'Generate Report'}
            </button>
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

      {/* Reports Section */}
      {reports.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Generated Reports</h2>
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.id} className="py-4 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                  <p className="text-sm text-gray-500">{report.date}</p>
                </div>
                <div className="ml-4 flex-shrink-0 space-x-4">
                  <button
                    onClick={() => viewReport(report)}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View
                  </button>
                  <button
                    onClick={() => downloadReport(report)}
                    className="font-medium text-green-600 hover:text-green-500"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="font-medium text-red-600 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
