// frontend-admin/src/components/layout/Header.jsx
import React, { useState } from 'react';
import { Menu, X, Home, Users, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { title: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { title: 'Inviti', icon: <Users size={20} />, path: '/invitations' },
    { title: 'Impostazioni', icon: <Settings size={20} />, path: '/config' }, // Corrected route
  ];

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="text-xl font-bold text-gray-800">
          Wedding<span className="text-pink-600">Admin</span>
        </div>

        {/* Desktop Navigation (Visible only if Sidebar is hidden/not used, kept for robustness) */}
        <nav className="hidden md:flex space-x-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center text-gray-600 hover:text-pink-600 transition-colors"
            >
              {item.icon}
              <span className="ml-2">{item.title}</span>
            </Link>
          ))}
        </nav>

        {/* Mobile Burger Menu */}
        <button
          className="md:hidden text-gray-600 focus:outline-none"
          onClick={toggleMenu}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden bg-white border-t">
          <nav className="flex flex-col p-4 space-y-3">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center text-gray-600 hover:text-pink-600 p-2 rounded-lg hover:bg-pink-50"
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
