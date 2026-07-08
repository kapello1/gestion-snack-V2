import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLES, LABELS } from '../../utils/constants';
import {
  Home, User, LogOut, Menu as MenuIcon, ShoppingCart, Utensils,
  CreditCard, ChefHat, Truck, Shield, Globe, ChevronDown,
  CalendarDays, Star, ShoppingBag, Info, BookOpen, Activity, Plus,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import NotificationBell from '../NotificationBell';

const LANGUAGES = [
  { code: 'fr', label: 'Français', short: 'FR', countryCode: 'fr' },
  { code: 'nl', label: 'Nederlands', short: 'NL', countryCode: 'nl' },
  { code: 'de', label: 'Deutsch', short: 'DE', countryCode: 'de' },
];

const Flag = ({ countryCode }) => (
  <img
    src={`https://flagcdn.com/20x15/${countryCode}.png`}
    srcSet={`https://flagcdn.com/40x30/${countryCode}.png 2x`}
    width="20" height="15"
    alt={countryCode.toUpperCase()}
    className="rounded-sm inline-block flex-shrink-0"
  />
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setIsLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const getRoleLinks = () => {
    if (!user) return [];
    switch (user.roleName) {
      case ROLES.ADMIN:
        return [
          { path: '/admin/dashboard',  label: t('nav.dashboard'),          icon: Home },
          { path: '/admin/users',       label: t('nav.users'),              icon: User },
          { path: '/admin/products',    label: t('nav.products'),           icon: Utensils },
          { path: '/admin/orders',      label: t('nav.orders'),             icon: ShoppingCart },
          { path: '/admin/logs',          label: 'Activité',                    icon: Activity    },
          { path: '/admin/transactions', label: 'Transactions',                icon: CreditCard  },
          { path: '/admin/settings',    label: t('nav.restaurantSettings'),   icon: Shield      },
        ];
      case ROLES.CUSTOMER:
        return [
          { path: '/customer/menu',         label: t('nav.menu'),             navLabel: 'Menu',         icon: Utensils },
          { path: '/customer/orders',        label: t('nav.myOrders'),         navLabel: 'Commandes',    icon: ShoppingBag },
          { path: '/customer/reservations',  label: t('nav.myReservations'),   navLabel: 'Réservations', icon: CalendarDays },
          { path: '/customer/reviews',       label: t('nav.myReviews'),        navLabel: 'Avis',         icon: Star },
          { path: '/customer/about',         label: t('nav.about'),            navLabel: 'À propos',     icon: Info },
        ];
      case ROLES.CASHIER:
        return [
          { path: '/cashier/payments', label: t('nav.payments'), icon: CreditCard },
          { path: '/cashier/orders',   label: t('nav.orders'),   icon: ShoppingCart },
        ];
      case ROLES.WAITER:
        return [
          { path: '/waiter/new-order', label: 'Nouvelle commande',         icon: Plus         },
          { path: '/waiter/orders',    label: t('nav.ordersToServe'),      icon: ShoppingCart },
          { path: '/waiter/tables',    label: t('nav.tableManagement'),    icon: MenuIcon     },
        ];
      case ROLES.COOK:
        return [
          { path: '/cook/orders', label: t('nav.ordersToPrep'), icon: ChefHat },
        ];
      case ROLES.PROVIDER:
        return [
          { path: '/provider/orders',   label: t('nav.supplyOrders'), icon: ShoppingCart },
          { path: '/provider/supplies', label: t('nav.mySupplies'),   icon: Truck },
        ];
      default:
        return [];
    }
  };

  if (!user) return null;

  const roleLinks = getRoleLinks();
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const isCustomer = user.roleName === ROLES.CUSTOMER;

  return (
    <nav className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <Utensils className="h-6 w-6 flex-shrink-0" />
            <span className="font-bold text-base leading-tight hidden sm:block">
              {isCustomer ? 'Snack Tiegni' : 'Gestion Snack'}
            </span>
          </Link>

          {/* ── Nav links desktop ── */}
          <div className="hidden md:flex items-center gap-0.5 mx-2 flex-1 justify-center">
            {roleLinks.map((link) => {
              const Icon = link.icon;
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-blue-800 text-white' : 'hover:bg-blue-700 text-blue-100 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{link.navLabel || link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── Droite ── */}
          <div className="flex items-center gap-1.5 flex-shrink-0">

            {/* Notifications */}
            <NotificationBell />

            {/* Langue - flag + code court */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                aria-label="Changer de langue"
              >
                <Flag countryCode={currentLang.countryCode} />
                <span className="hidden lg:inline text-xs font-bold">{currentLang.short}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl py-1 z-50 border border-gray-100 overflow-hidden">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { changeLanguage(lang.code); setIsLangOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        language === lang.code ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Flag countryCode={lang.countryCode} />
                      <span>{lang.label}</span>
                      {language === lang.code && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Utilisateur - nom seulement */}
            <span className="hidden lg:block text-xs font-semibold text-blue-100 max-w-[100px] truncate">
              {user.username}
            </span>

            {/* Profil dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setIsProfileOpen(o => !o); setIsMobileOpen(false); }}
                className="flex items-center p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                title={user.username}
              >
                <User className="h-5 w-5" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl py-1 z-50 border border-gray-100 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-bold text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-500">{LABELS.ROLES[user.roleName]}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    {t('nav.profile')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 text-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>

            {/* Burger mobile */}
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => { setIsMobileOpen(o => !o); setIsProfileOpen(false); setIsLangOpen(false); }}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Menu mobile ── */}
        {isMobileOpen && (
          <div className="md:hidden py-3 border-t border-blue-500">
            {roleLinks.map(link => {
              const Icon = link.icon;
              const active = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => { setIsMobileOpen(false); navigate(link.path); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mx-0 text-sm font-medium transition-colors text-left ${
                    active ? 'bg-blue-800 text-white' : 'hover:bg-blue-700 text-blue-100'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </button>
              );
            })}
            <div className="border-t border-blue-500 mt-2 pt-2">
              <div className="px-4 py-1.5 text-xs text-blue-300 font-semibold">
                {user.username} · {LABELS.ROLES[user.roleName]}
              </div>
              <button
                onClick={() => { setIsMobileOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-700 rounded-lg text-sm font-medium text-blue-100 text-left"
              >
                <User className="h-4 w-4 flex-shrink-0" />
                {t('nav.profile')}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-700/50 rounded-lg text-sm font-medium text-red-300 text-left"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {t('nav.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
