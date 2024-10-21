import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { analyzeEnergyData } from '../utils/geminiApi';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  useEffect(() => {
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
      } catch (err) {
        console.error('Error running analysis:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while running the analysis.');
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, []);

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
    </div>
  );
};

export default Analysis;