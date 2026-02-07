// frontend-admin/src/components/layout/Header.jsx
import { Box, Home, LayoutDashboard, Menu, MessageCircle, Settings, Tag, Truck, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { path: '/dashboard', title: t('admin.sidebar.nav.dashboard'), icon: <LayoutDashboard size={20} /> },
    { path: '/invitations', title: t('admin.sidebar.nav.invitations'), icon: <Users size={20} /> },
    { path: '/accommodations', title: t('admin.sidebar.nav.accommodations'), icon: <Home size={20} /> },
    { path: '/whatsapp', title: t('admin.sidebar.nav.whatsapp'), icon: <MessageCircle size={20} /> },
    { path: '/labels', title: t('admin.sidebar.nav.labels'), icon: <Tag size={20} /> },
    { path: '/config', title: t('admin.sidebar.nav.configuration'), icon: <Settings size={20} /> },
    { path: '/supplier-types', icon: <Box size={20} />, title: t('admin.sidebar.nav.supplierTypes') },
    { path: '/suppliers', icon: <Truck size={20} />, title: t('admin.sidebar.nav.suppliers') },
  ];

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="text-xl font-bold text-gray-800">
          {t('admin.header.title_main')}<span className="text-pink-600">{t('admin.header.title_accent')}</span>
        </div>

        {/* Desktop Navigation (Visible only if Sidebar is hidden/not used, kept for robustness) */}
        <nav className="hidden xl:flex space-x-6">
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

        {/* Right Section: Language Switcher + Mobile Burger */}
        <div className="flex items-center gap-4">
          {/* Language Switcher - Always visible */}
          <LanguageSwitcher />

          {/* Mobile Burger Menu - Visible until XL */}
          <button
            className="xl:hidden text-gray-600 focus:outline-none"
            onClick={toggleMenu}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="xl:hidden bg-white border-t">
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
