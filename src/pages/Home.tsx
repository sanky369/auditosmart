import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReports } from '../contexts/ReportContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useAuth();
  const { reports } = useReports();
  const navigate = useNavigate();

  const recentReports = reports.slice(0, 3);
  const pendingCount = 2; // This would come from your backend in a real app

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user}!</h1>
      <p className="text-lg mb-4">
        This is your Energy Audit Assistant dashboard. Here's a quick overview of your recent activities:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard 
          title="Recent Audits" 
          content={`You have ${recentReports.length} recent audits.`}
          onClick={() => navigate('/analysis')}
        >
          {recentReports.length > 0 && (
            <ul className="mt-2 text-sm">
              {recentReports.map(report => (
                <li key={report.id} className="flex justify-between items-center py-1">
                  <span>{report.title}</span>
                  <span className="text-gray-500">{report.date}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard 
          title="Energy Savings" 
          content="Your latest audit shows potential savings of 15%."
          onClick={() => navigate('/analysis')}
        />

        <DashboardCard 
          title="Pending Tasks" 
          content={`${pendingCount} buildings need data input.`}
          onClick={() => navigate('/data-input')}
        />

        <DashboardCard 
          title="Reports" 
          content={`${reports.length} reports available.`}
          onClick={() => navigate('/analysis')}
        >
          {reports.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer flex items-center">
                View all reports <ArrowRight size={16} className="ml-1" />
              </p>
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{ 
  title: string; 
  content: string;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ title, content, onClick, children }) => (
  <div 
    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p>{content}</p>
    {children}
  </div>
);

export default Home;
