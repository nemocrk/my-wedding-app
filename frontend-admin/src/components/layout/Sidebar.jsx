import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Hotel, Settings, LogOut, MessageCircle, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';

const Sidebar = () => {
  const { t } = useTranslation();

  const navItems = [
        { path: '/dashboard', label: t('admin.sidebar.nav.dashboard'), icon: LayoutDashboard },
        { path: '/invitations', label: t('admin.sidebar.nav.invitations'), icon: Users },
        { path: '/accommodations', label: t('admin.sidebar.nav.accommodations'), icon: Hotel },
        { path: '/whatsapp', label: t('admin.sidebar.nav.whatsapp'), icon: MessageCircle },
        { path: '/labels', icon: Tag, label: t('admin.sidebar.nav.labels') }, 
        { path: '/config', label: t('admin.sidebar.nav.configuration'), icon: Settings },
  ];

  return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col fixed left-0 top-0 z-30">
            <div className="h-16 flex items-center px-6 border-b border-gray-200">
                <span className="text-xl font-bold text-gray-800">
                    {t('admin.sidebar.app_title')}
                    <span className="text-pink-600">{t('admin.sidebar.app_title_accent')}</span>
                </span>
          </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
            {navItems.map((item) => (
                        <li key={item.path}>
              <NavLink
                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                        isActive
                                            ? 'bg-pink-50 text-pink-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`
                                }
              >
                                <item.icon size={20} />
                {item.label}
              </NavLink>
                        </li>
            ))}
                </ul>
          </nav>

            {/* Footer Section: Language Switcher + Logout */}
            <div className="border-t border-gray-200">
                {/* Language Switcher */}
                <div className="p-4 border-b border-gray-100">
                    <LanguageSwitcher />
                </div>
                
                {/* Logout Button */}
                <div className="p-4">
                    <button className="flex items-center gap-3 text-gray-600 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-md hover:bg-red-50">
                        <LogOut size={20} />
                        {t('admin.sidebar.logout')}
            </button>
          </div>
        </div>
        </aside>
  );
};

export default Sidebar;
