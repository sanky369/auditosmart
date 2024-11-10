import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, FileInput, BarChart, LogOut } from 'lucide-react';

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
          <h1 className="text-2xl font-bold text-gray-800">Auditosmart</h1>
        </div>
        <ul className="mt-6">
          <NavItem to="/" icon={<Home size={20} />} text="Home" />
          <NavItem to="/data-input" icon={<FileInput size={20} />} text="Start Here" />
          <NavItem to="/analysis" icon={<BarChart size={20} />} text="Analysis" />
          <li className="border-t border-gray-200 mt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            >
              <LogOut size={20} />
              <span className="ml-2">Sign Out</span>
            </button>
          </li>
        </ul>
      </nav>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; text: string }> = ({ to, text, icon }) => (
  <li>
    <Link
      to={`/dashboard${to}`}
      className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
    >
      {icon}
      <span className="ml-2">{text}</span>
    </Link>
  </li>
);

export default Layout;
