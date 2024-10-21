import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user}!</h1>
      <p className="text-lg mb-4">
        This is your Energy Audit Assistant dashboard. Here's a quick overview of your recent activities:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Recent Audits" content="You have 3 ongoing audits." />
        <DashboardCard title="Energy Savings" content="Your latest audit shows potential savings of 15%." />
        <DashboardCard title="Pending Tasks" content="2 buildings need data input." />
        <DashboardCard title="Reports" content="1 new report is ready for review." />
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p>{content}</p>
  </div>
);

export default Home;