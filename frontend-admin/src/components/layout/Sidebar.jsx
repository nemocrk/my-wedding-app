import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Home, Settings, LogOut, MessageCircle } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/invitations', label: 'Inviti', icon: Users },
        { path: '/accommodations', label: 'Alloggi', icon: Home },
        { path: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
        { path: '/config', label: 'Configurazione', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col fixed left-0 top-0 z-30">
            <div className="h-16 flex items-center px-6 border-b border-gray-200">
                <span className="text-xl font-bold text-gray-800">Wedding<span className="text-pink-600">Admin</span></span>
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

            <div className="p-4 border-t border-gray-200">
                <button className="flex items-center gap-3 text-gray-600 hover:text-red-600 transition-colors w-full px-3 py-2">
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
