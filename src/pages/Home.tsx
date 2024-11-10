import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReports } from '../contexts/ReportContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FileText, Zap, AlertCircle, BarChart2 } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useAuth();
  const { reports } = useReports();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending tasks when component mounts
  useEffect(() => {
    const loadPendingTasks = () => {
      // Check localStorage for any incomplete building data
      const buildingData = localStorage.getItem('buildingData');
      const buildingSystems = localStorage.getItem('buildingSystems');
      const csvContent = localStorage.getItem('csvContent');
      
      let count = 0;
      
      // If any required data is missing, increment pending count
      if (!buildingData || !buildingSystems || !csvContent) {
        count++;
      }
      
      setPendingCount(count);
    };

    loadPendingTasks();
  }, []);

  const recentReports = reports.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-8 mb-8 text-white">
        <h1 className="text-4xl font-bold mb-3">
          Welcome, {user?.displayName || 'User'}!
        </h1>
        <p className="text-lg opacity-90">
          Your Energy Audit Assistant dashboard. Here's your overview:
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DashboardCard 
          title="Recent Audits"
          icon={<FileText className="h-6 w-6 text-indigo-600" />}
          content={`You have ${recentReports.length} recent audits.`}
          onClick={() => navigate('/dashboard/analysis')}
        >
          {recentReports.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100">
              {recentReports.map(report => (
                <li key={report.id} className="flex justify-between items-center py-3">
                  <span className="font-medium">{report.title}</span>
                  <span className="text-gray-500 text-sm">{report.date}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard 
          title="Energy Savings"
          icon={<Zap className="h-6 w-6 text-green-600" />}
          content="Your latest audit shows potential savings of 15%."
          onClick={() => navigate('/dashboard/analysis')}
          className="bg-gradient-to-br from-green-50 to-white"
        />

        <DashboardCard 
          title="Pending Tasks"
          icon={<AlertCircle className="h-6 w-6 text-amber-600" />}
          content={pendingCount > 0 
            ? `${pendingCount} building${pendingCount === 1 ? '' : 's'} need${pendingCount === 1 ? 's' : ''} data input.`
            : "No pending tasks."
          }
          onClick={() => navigate('/dashboard/data-input')}
          className="bg-gradient-to-br from-amber-50 to-white"
        />

        <DashboardCard 
          title="Reports"
          icon={<BarChart2 className="h-6 w-6 text-indigo-600" />}
          content={`${reports.length} reports available.`}
          onClick={() => navigate('/dashboard/analysis')}
        >
          {reports.length > 0 && (
            <div className="mt-4">
              <button className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                View all reports <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{ 
  title: string;
  icon: React.ReactNode;
  content: string;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}> = ({ title, icon, content, onClick, children, className }) => (
  <div 
    className={`bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${className || ''}`}
    onClick={onClick}
  >
    <div className="flex items-center mb-4">
      {icon}
      <h2 className="text-xl font-semibold ml-3">{title}</h2>
    </div>
    <p className="text-gray-600">{content}</p>
    {children}
  </div>
);

export default Home;
