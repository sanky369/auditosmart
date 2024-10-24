import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Report {
  id: string;
  title: string;
  date: string;
  content: string;
  analysisResult: string;
  buildingData: any;
}

interface ReportContextType {
  reports: Report[];
  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  getReport: (id: string) => Report | undefined;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<Report[]>(() => {
    const savedReports = localStorage.getItem('reports');
    return savedReports ? JSON.parse(savedReports) : [];
  });

  useEffect(() => {
    localStorage.setItem('reports', JSON.stringify(reports));
  }, [reports]);

  const addReport = (report: Report) => {
    setReports(prevReports => [report, ...prevReports]);
  };

  const deleteReport = (id: string) => {
    setReports(prevReports => prevReports.filter(report => report.id !== id));
  };

  const getReport = (id: string) => {
    return reports.find(report => report.id === id);
  };

  return (
    <ReportContext.Provider value={{ reports, addReport, deleteReport, getReport }}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReports = () => {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportProvider');
  }
  return context;
};
