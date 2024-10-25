import React, { createContext, useContext, useState, useCallback } from 'react';
import { Report } from '../types';

interface ReportContextType {
  reports: Report[];
  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<Report[]>(() => {
    // Initialize from localStorage if available
    const savedReports = localStorage.getItem('reports');
    return savedReports ? JSON.parse(savedReports) : [];
  });

  const addReport = useCallback((report: Report) => {
    setReports(prevReports => {
      const newReports = [...prevReports, report];
      // Save to localStorage
      localStorage.setItem('reports', JSON.stringify(newReports));
      return newReports;
    });
  }, []);

  const deleteReport = useCallback((id: string) => {
    setReports(prevReports => {
      const newReports = prevReports.filter(report => report.id !== id);
      // Save to localStorage
      localStorage.setItem('reports', JSON.stringify(newReports));
      return newReports;
    });
  }, []);

  return (
    <ReportContext.Provider value={{ reports, addReport, deleteReport }}>
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
