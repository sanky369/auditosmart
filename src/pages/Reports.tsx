import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

interface Report {
  id: string;
  title: string;
  date: string;
  content: string;
}

const initialReports: Report[] = [
  { id: '1', title: "Q1 2023 Energy Audit", date: "March 31, 2023", content: "This is the content of Q1 2023 Energy Audit report." },
  { id: '2', title: "2022 Annual Energy Report", date: "December 15, 2022", content: "This is the content of 2022 Annual Energy Report." },
  { id: '3', title: "Summer 2022 HVAC Efficiency Analysis", date: "September 1, 2022", content: "This is the content of Summer 2022 HVAC Efficiency Analysis report." },
];

const Reports: React.FC = () => {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const generateReport = () => {
    setGeneratingReport(true);

    // Simulate report generation delay
    setTimeout(() => {
      const doc = new jsPDF();

      // Add content to the PDF
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Energy Audit Report", 20, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text("Generated on: " + new Date().toLocaleDateString(), 20, 30);

      doc.setFontSize(16);
      doc.text("1. Executive Summary", 20, 40);
      doc.setFontSize(12);
      doc.text("This report provides an overview of the energy consumption...", 20, 50);

      doc.setFontSize(16);
      doc.text("2. Energy Consumption Analysis", 20, 70);
      doc.setFontSize(12);
      doc.text("Based on the data provided, we observed the following trends...", 20, 80);

      doc.setFontSize(16);
      doc.text("3. Recommendations", 20, 100);
      doc.setFontSize(12);
      doc.text("1. Implement LED lighting throughout the building", 20, 110);
      doc.text("2. Optimize HVAC schedules", 20, 120);
      doc.text("3. Install occupancy sensors in less frequently used areas", 20, 130);

      // Save the PDF
      doc.save("energy_audit_report.pdf");

      // Add the new report to the list
      const newReport: Report = {
        id: (reports.length + 1).toString(),
        title: `Energy Audit Report ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleDateString(),
        content: "This is the content of the newly generated report."
      };
      setReports([newReport, ...reports]);

      setGeneratingReport(false);
    }, 2000);
  };

  const viewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const closeReport = () => {
    setSelectedReport(null);
  };

  const deleteReport = (id: string) => {
    setReports(reports.filter(report => report.id !== id));
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Energy Audit Report</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Generate a comprehensive report of your energy audit findings.</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Report type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">Full Energy Audit</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date range</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">Last 12 months</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Included analysis</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ul className="list-disc pl-5">
                  <li>Energy consumption trends</li>
                  <li>Cost analysis</li>
                  <li>Efficiency recommendations</li>
                  <li>ROI projections</li>
                </ul>
              </dd>
            </div>
          </dl>
        </div>
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <button
            onClick={generateReport}
            disabled={generatingReport}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {generatingReport ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {generatingReport && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">Generating report, please wait...</p>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Previous Reports</h2>
        <ul className="divide-y divide-gray-200">
          {reports.map((report) => (
            <li key={report.id} className="py-4 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                <p className="text-sm text-gray-500">{report.date}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => viewReport(report)}
                  className="font-medium text-indigo-600 hover:text-indigo-500 mr-4"
                >
                  View
                </button>
                <button
                  onClick={() => deleteReport(report.id)}
                  className="font-medium text-red-600 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedReport.title}</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {selectedReport.content}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  id="ok-btn"
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

export default Reports;