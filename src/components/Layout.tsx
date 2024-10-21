import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, FileInput, BarChart, FileText, LogOut } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <nav className="w-64 bg-white shadow-lg">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-800">Energy Audit Assistant</h1>
        </div>
        <ul className="mt-6">
          <NavItem to="/" icon={<Home size={20} />} text="Home" />
          <NavItem to="/data-input" icon={<FileInput size={20} />} text="Data Input" />
          <NavItem to="/analysis" icon={<BarChart size={20} />} text="Analysis" />
          <NavItem to="/reports" icon={<FileText size={20} />} text="Reports" />
        </ul>
        <div className="absolute bottom-0 w-64 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <LogOut className="mr-2" size={20} />
            Logout
          </button>
        </div>
      </nav>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; text: string }> = ({ to, icon, text }) => (
  <li>
    <Link
      to={to}
      className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
    >
      {icon}
      <span className="ml-2">{text}</span>
    </Link>
  </li>
);

export default Layout;