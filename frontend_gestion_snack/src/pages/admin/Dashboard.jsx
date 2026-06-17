import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Users, ShoppingBag, ClipboardList, TrendingUp, AlertTriangle, Utensils,
  Truck, UserCheck, Package, FileText, Star, Calendar, BarChart2,
  ArrowUpRight, RefreshCw, Award, ShoppingCart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { useLanguage } from '../../context/LanguageContext';
import StarRating from '../../components/StarRating';
import { wsManager } from '../../lib/wsManager';

/* ─────────────────────── Animated Counter ─────────────────────── */
const AnimatedCounter = ({ target, suffix = '', decimals = 0 }) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);
  return <>{decimals > 0 ? value.toFixed(decimals) : Math.floor(value)}{suffix}</>;
};

/* ─────────────────────── Donut Chart (conic-gradient) ─────────── */
const DonutChart = ({ segments, size = 120 }) => {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const parts = [];
  let acc = 0;
  segments.forEach(s => {
    const pct = (s.value / total) * 100;
    parts.push(`${s.color} ${acc.toFixed(1)}% ${(acc + pct).toFixed(1)}%`);
    acc += pct;
  });
  const gradient = `conic-gradient(${parts.join(', ')})`;
  const hole = size * 0.62;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full transition-all duration-700"
        style={{ background: gradient }}
      />
      <div
        className="absolute bg-white rounded-full flex flex-col items-center justify-center shadow-inner"
        style={{ width: hole, height: hole, top: (size - hole) / 2, left: (size - hole) / 2 }}
      >
        <span className="text-xl font-black text-gray-800">{total}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">total</span>
      </div>
    </div>
  );
};

/* ─────────────────────── Animated Bar ─────────────────────── */
const AnimatedBar = ({ pct, color, delay = 0 }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full`}
        style={{ width: `${width}%`, transition: `width 900ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms` }}
      />
    </div>
  );
};

/* ─────────────────────── SVG Line/Area Chart ─────────────────── */
const SparkLineChart = ({ data, color = '#3b82f6', fillColor = 'rgba(59,130,246,0.12)', height = 64, noDataLabel = '–' }) => {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 200); return () => clearTimeout(t); }, []);

  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-16 text-gray-300 text-xs">{noDataLabel}</div>
  );
  const W = 280, H = height;
  const maxV = Math.max(...data.map(d => d.value)) || 1;
  const minV = Math.min(...data.map(d => d.value));
  const range = maxV - minV || 1;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 8 - ((d.value - minV) / range) * (H - 16),
  }));

  const pathLine = pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, '');
  const pathArea = `${pathLine} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="spark-clip">
          <rect x="0" y="0" width={drawn ? W : 0} height={H} style={{ transition: 'width 1.2s ease-in-out' }} />
        </clipPath>
      </defs>
      <path d={pathArea} fill={fillColor} clipPath="url(#spark-clip)" />
      <path
        d={pathLine}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath="url(#spark-clip)"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} clipPath="url(#spark-clip)" />
      ))}
    </svg>
  );
};

/* ─────────────────────── Radial Progress ─────────────────────── */
const RadialBar = ({ pct, color, label, value }) => {
  const r = 28, circ = 2 * Math.PI * r;
  const [dash, setDash] = useState(0);
  useEffect(() => { const t = setTimeout(() => setDash((pct / 100) * circ), 300); return () => clearTimeout(t); }, [pct, circ]);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
          <circle
            cx="36" cy="36" r={r}
            fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={circ - dash}
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.34,1.56,0.64,1) 400ms' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-gray-800">{value}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
};

/* ─────────────────────── Main Dashboard ─────────────────────── */
const AdminDashboard = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    usersCount: 0, productsCount: 0, ordersCount: 0, revenue: 0,
    lowStockCount: 0, employeesCount: 0, providersCount: 0,
    tablesCount: 0, supplyOrdersCount: 0,
  });
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchStats(true);
    const interval = setInterval(() => fetchStats(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Refresh immédiat sur chaque événement WebSocket (commandes, tables, réservations)
  useEffect(() => {
    return wsManager.onEvent(() => fetchStats(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [users, prods, ords, alerts, employees, providers, tables, supplies, revs, reservs] = await Promise.allSettled([
        api.get(API_ENDPOINTS.USERS.BASE),
        api.get(API_ENDPOINTS.PRODUCTS.BASE),
        api.get(API_ENDPOINTS.ORDERS.BASE),
        api.get(API_ENDPOINTS.STOCK_ALERTS.UNRESOLVED),
        api.get(API_ENDPOINTS.EMPLOYEES.BASE),
        api.get(API_ENDPOINTS.PROVIDERS.BASE),
        api.get(API_ENDPOINTS.TABLES.BASE),
        api.get('/providers/supplies'),
        api.get(API_ENDPOINTS.REVIEWS.BASE),
        api.get(API_ENDPOINTS.RESERVATIONS.BASE),
      ]);
      const ordersData = ords.status === 'fulfilled' ? (ords.value.data || []) : [];
      const prodsData = prods.status === 'fulfilled' ? (prods.value.data || []) : [];
      const revsData = revs.status === 'fulfilled' ? (revs.value.data || []) : [];
      const reservsData = reservs.status === 'fulfilled' ? (reservs.value.data || []) : [];

      let revenue = 0;
      try {
        const rd = await api.get(API_ENDPOINTS.REVENUE.TOTAL);
        revenue = Number(rd.data.totalRevenue || 0);
      } catch {
        revenue = ordersData.filter(o => o.status !== 'CANCELLED').reduce((a, o) => a + Number(o.totalAmount || 0), 0);
      }

      setStats({
        usersCount: users.status === 'fulfilled' ? users.value.data.length : 0,
        productsCount: prodsData.length,
        ordersCount: ordersData.length,
        revenue,
        lowStockCount: alerts.status === 'fulfilled' ? alerts.value.data.length : 0,
        employeesCount: employees.status === 'fulfilled' ? employees.value.data.length : 0,
        providersCount: providers.status === 'fulfilled' ? providers.value.data.length : 0,
        tablesCount: tables.status === 'fulfilled' ? tables.value.data.length : 0,
        supplyOrdersCount: supplies.status === 'fulfilled' ? supplies.value.data.length : 0,
      });
      setOrders(ordersData);
      setProducts(prodsData);
      setReviews(revsData);
      setReservations(reservsData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  /* ── Computed data ── */
  const orderStatusStats = {
    ACTIVE: orders.filter(o => o.status === 'ACTIVE').length,
    CLOSED: orders.filter(o => o.status === 'CLOSED').length,
    SERVED: orders.filter(o => o.status === 'SERVED').length,
    CANCELLED: orders.filter(o => o.status === 'CANCELLED').length,
  };
  const reservationStats = {
    BOOKED: reservations.filter(r => r.status === 'BOOKED').length,
    COMPLETED: reservations.filter(r => r.status === 'COMPLETED').length,
    CANCELLED: reservations.filter(r => r.status === 'CANCELLED').length,
  };
  const topProducts = [...products]
    .filter(p => (p.averageRating || 0) > 0 || (p.reviewCount || 0) > 0)
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 5);

  const today = new Date().toISOString().split('T')[0];
  const todayRevenue = orders
    .filter(o => o.orderDate === today && o.status !== 'CANCELLED')
    .reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
  const avgOrderValue = orders.filter(o => o.status !== 'CANCELLED').length > 0
    ? orders.filter(o => o.status !== 'CANCELLED').reduce((a, o) => a + Number(o.totalAmount || 0), 0)
      / orders.filter(o => o.status !== 'CANCELLED').length
    : 0;
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentReviews = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  // Weekly orders chart (last 7 days)
  const weeklyData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const value = orders.filter(o => o.orderDate === key && o.status !== 'CANCELLED').length;
      days.push({ label, value });
    }
    return days;
  })();

  const weeklyRevenue = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const value = orders.filter(o => o.orderDate === key && o.status !== 'CANCELLED').reduce((a, o) => a + Number(o.totalAmount || 0), 0);
      days.push({ label, value });
    }
    return days;
  })();

  const colorMap = {
    blue:    { bg: 'bg-blue-50',    icon: 'bg-blue-500',    text: 'text-blue-600',    border: 'border-blue-100'    },
    green:   { bg: 'bg-green-50',   icon: 'bg-green-600',   text: 'text-green-600',   border: 'border-green-100'   },
    purple:  { bg: 'bg-purple-50',  icon: 'bg-purple-500',  text: 'text-purple-600',  border: 'border-purple-100'  },
    indigo:  { bg: 'bg-indigo-50',  icon: 'bg-indigo-500',  text: 'text-indigo-600',  border: 'border-indigo-100'  },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-100' },
    violet:  { bg: 'bg-violet-50',  icon: 'bg-violet-600',  text: 'text-violet-600',  border: 'border-violet-100'  },
    amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-500',   text: 'text-amber-600',   border: 'border-amber-100'   },
    red:     { bg: 'bg-red-50',     icon: 'bg-red-500',     text: 'text-red-600',     border: 'border-red-100'     },
    yellow:  { bg: 'bg-yellow-50',  icon: 'bg-yellow-600',  text: 'text-yellow-600',  border: 'border-yellow-100'  },
    teal:    { bg: 'bg-teal-50',    icon: 'bg-teal-500',    text: 'text-teal-600',    border: 'border-teal-100'    },
  };

  const kpiCards = [
    { title: t('dashboard.users'),          value: stats.usersCount,          icon: Users,       color: 'blue',    link: '/admin/users' },
    { title: t('dashboard.employees'),      value: stats.employeesCount,      icon: UserCheck,   color: 'green',   link: '/admin/employees' },
    { title: t('dashboard.providers'),      value: stats.providersCount,      icon: Truck,       color: 'purple',  link: '/admin/providers' },
    { title: t('dashboard.products'),       value: stats.productsCount,       icon: ShoppingBag, color: 'indigo',  link: '/admin/products' },
    { title: t('dashboard.clientOrders'),   value: stats.ordersCount,         icon: ClipboardList,color:'emerald', link: '/admin/orders' },
    { title: t('dashboard.supplierOrders'), value: stats.supplyOrdersCount,   icon: Package,     color: 'violet',  link: '/admin/supplies' },
    { title: t('dashboard.tables'),         value: stats.tablesCount,         icon: Utensils,    color: 'amber',   link: '/admin/tables' },
    { title: t('dashboard.stockAlerts'),    value: stats.lowStockCount,       icon: AlertTriangle,color:'red',     link: '/admin/stock-alerts' },
    { title: t('dashboard.revenue'),        value: stats.revenue,             icon: TrendingUp,  color: 'yellow',  link: '/admin/orders', isCurrency: true },
    { title: t('dashboard.tickets'),        value: stats.ordersCount,         icon: FileText,    color: 'teal',    link: '/admin/tickets' },
  ];

  if (loading) return (
    <Layout>
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-100 border-t-blue-600" />
          <BarChart2 className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
        </div>
        <p className="text-gray-500 font-semibold animate-pulse">{t('dashboard.loading')}</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('dashboard.refreshEvery')} · {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold text-sm transition-all hover:shadow-sm active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            {t('dashboard.refresh')}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map((card, idx) => {
            const colors = colorMap[card.color];
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                to={card.link}
                className={`${colors.bg} border ${colors.border} rounded-2xl p-4 hover:shadow-lg transition-all group hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 ${colors.icon} rounded-xl shadow-sm`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <ArrowUpRight className={`h-4 w-4 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
                <p className="text-2xl font-black text-gray-900">
                  {card.isCurrency
                    ? <><AnimatedCounter target={card.value} decimals={2} />{' €'}</>
                    : <AnimatedCounter target={card.value} />
                  }
                </p>
                <p className={`text-xs font-bold ${colors.text} mt-1`}>{card.title}</p>
              </Link>
            );
          })}
        </div>

        {/* Revenue Row with sparklines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute bottom-0 left-0 right-0 opacity-20">
              <SparkLineChart data={weeklyRevenue} color="white" fillColor="rgba(255,255,255,0.15)" height={56} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-blue-200" />
                <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">{t('dashboard.totalRevenue')}</span>
              </div>
              <p className="text-4xl font-black">
                <AnimatedCounter target={stats.revenue} decimals={2} /> €
              </p>
              <p className="text-blue-200 text-xs mt-1">{stats.ordersCount} {t('dashboard.ordersCount')}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute bottom-0 left-0 right-0 opacity-20">
              <SparkLineChart data={weeklyData} color="white" fillColor="rgba(255,255,255,0.15)" height={56} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <BarChart2 className="h-5 w-5 text-emerald-200" />
                <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">{t('dashboard.todayRevenue')}</span>
              </div>
              <p className="text-4xl font-black">
                <AnimatedCounter target={todayRevenue} decimals={2} /> €
              </p>
              <p className="text-emerald-200 text-xs mt-1">{t('dashboard.today')}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute bottom-0 left-0 right-0 opacity-20">
              <SparkLineChart data={weeklyRevenue} color="white" fillColor="rgba(255,255,255,0.15)" height={56} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-5 w-5 text-purple-200" />
                <span className="text-[10px] text-purple-200 font-bold uppercase tracking-widest">{t('dashboard.avgOrderValue')}</span>
              </div>
              <p className="text-4xl font-black">
                <AnimatedCounter target={avgOrderValue} decimals={2} /> €
              </p>
              <p className="text-purple-200 text-xs mt-1">{t('dashboard.perOrder')}</p>
            </div>
          </div>
        </div>

        {/* Weekly Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commandes / semaine */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                {t('dashboard.weeklyOrders')}
              </h2>
              <span className="text-xs text-gray-400 font-semibold bg-gray-50 px-3 py-1 rounded-full">
                {t('dashboard.totalLabel')} {weeklyData.reduce((a, d) => a + d.value, 0)}
              </span>
            </div>
            <SparkLineChart data={weeklyData} color="#3b82f6" fillColor="rgba(59,130,246,0.1)" height={80} noDataLabel={t('dashboard.noData')} />
            <div className="flex justify-between mt-2">
              {weeklyData.map((d, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-xs font-black text-gray-700">{d.value}</span>
                  <span className="text-[9px] text-gray-400 font-medium">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chiffre d'affaires / semaine */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                {t('dashboard.weeklyRevenue')}
              </h2>
              <span className="text-xs text-gray-400 font-semibold bg-gray-50 px-3 py-1 rounded-full">
                {weeklyRevenue.reduce((a, d) => a + d.value, 0).toFixed(2)} €
              </span>
            </div>
            <SparkLineChart data={weeklyRevenue} color="#10b981" fillColor="rgba(16,185,129,0.1)" height={80} noDataLabel={t('dashboard.noData')} />
            <div className="flex justify-between mt-2">
              {weeklyRevenue.map((d, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-xs font-black text-gray-700">{d.value.toFixed(0)}€</span>
                  <span className="text-[9px] text-gray-400 font-medium">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Row: Donut + Reservations + Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Commandes par statut - Donut */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-blue-500" />
              {t('dashboard.ordersByStatus')}
            </h2>
            <div className="flex items-center gap-6">
              <DonutChart
                segments={[
                  { value: orderStatusStats.ACTIVE,    color: '#3b82f6' },
                  { value: orderStatusStats.CLOSED,    color: '#f97316' },
                  { value: orderStatusStats.SERVED,    color: '#22c55e' },
                  { value: orderStatusStats.CANCELLED, color: '#ef4444' },
                ]}
              />
              <div className="flex-1 space-y-2.5">
                {[
                  { label: t('dashboard.ordersActive'),    value: orderStatusStats.ACTIVE,    color: 'bg-blue-500',   pct: orders.length ? (orderStatusStats.ACTIVE / orders.length) * 100 : 0 },
                  { label: t('dashboard.ordersClosed'),    value: orderStatusStats.CLOSED,    color: 'bg-orange-500', pct: orders.length ? (orderStatusStats.CLOSED / orders.length) * 100 : 0 },
                  { label: t('dashboard.ordersServed'),    value: orderStatusStats.SERVED,    color: 'bg-green-500',  pct: orders.length ? (orderStatusStats.SERVED / orders.length) * 100 : 0 },
                  { label: t('dashboard.ordersCancelled'), value: orderStatusStats.CANCELLED, color: 'bg-red-500',    pct: orders.length ? (orderStatusStats.CANCELLED / orders.length) * 100 : 0 },
                ].map((item, i) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-gray-600">{item.label}</span>
                      </div>
                      <span className="font-black text-gray-800">{item.value}</span>
                    </div>
                    <AnimatedBar pct={item.pct} color={item.color} delay={i * 120} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Réservations - Radial bars */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              {t('dashboard.reservationStats')}
            </h2>
            <div className="flex justify-around items-end py-2">
              <RadialBar
                pct={reservations.length ? (reservationStats.BOOKED / reservations.length) * 100 : 0}
                color="#3b82f6"
                label={t('dashboard.booked')}
                value={reservationStats.BOOKED}
              />
              <RadialBar
                pct={reservations.length ? (reservationStats.COMPLETED / reservations.length) * 100 : 0}
                color="#22c55e"
                label={t('dashboard.completed')}
                value={reservationStats.COMPLETED}
              />
              <RadialBar
                pct={reservations.length ? (reservationStats.CANCELLED / reservations.length) * 100 : 0}
                color="#ef4444"
                label={t('dashboard.cancelled')}
                value={reservationStats.CANCELLED}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
              <div className="text-center">
                <p className="text-3xl font-black text-gray-900">
                  <AnimatedCounter target={reservations.length} />
                </p>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('dashboard.totalReservations')}</p>
              </div>
            </div>
          </div>

          {/* Top Produits */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              {t('dashboard.topProducts')}
            </h2>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((prod, idx) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const pct = topProducts[0].reviewCount ? (prod.reviewCount / topProducts[0].reviewCount) * 100 : 0;
                  return (
                    <div key={prod.productId}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="flex-shrink-0 text-sm w-5 text-center">
                          {medals[idx] || `${idx + 1}.`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{prod.productName}</p>
                          <div className="flex items-center gap-1">
                            <StarRating value={prod.averageRating || 0} readOnly size="sm" />
                            <span className="text-xs text-gray-400">({prod.reviewCount || 0})</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-600 flex-shrink-0">{prod.unitPrice?.toFixed(2)} €</span>
                      </div>
                      <AnimatedBar pct={pct} color="bg-amber-400" delay={idx * 100} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                <Award className="h-10 w-10 mb-2" />
                <p className="text-sm text-gray-400">{t('dashboard.noReviews')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Commandes récentes + Derniers avis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commandes récentes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-green-500" />
                {t('dashboard.recentOrders')}
              </h2>
              <Link to="/admin/orders" className="text-xs text-blue-600 hover:underline font-semibold">{t('dashboard.viewAll')}</Link>
            </div>
            {recentOrders.length > 0 ? (
              <div className="space-y-2">
                {recentOrders.map((order, i) => (
                  <div
                    key={order.orderId}
                    className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">#{order.orderId}</p>
                      <p className="text-xs text-gray-400">{order.orderType === 'ON_SITE' ? t('dashboard.onSite') : t('dashboard.takeaway')} · {order.orderDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{Number(order.totalAmount).toFixed(2)} €</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'ACTIVE'    ? 'bg-blue-100 text-blue-700' :
                        order.status === 'CLOSED'    ? 'bg-orange-100 text-orange-700' :
                        order.status === 'SERVED'    ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                <ClipboardList className="h-10 w-10 mb-2" />
                <p className="text-sm text-gray-400">{t('dashboard.noOrders')}</p>
              </div>
            )}
          </div>

          {/* Derniers avis */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {t('dashboard.recentReviews')}
              </h2>
              <span className="text-xs bg-gray-50 text-gray-400 font-semibold px-3 py-1 rounded-full">{t('dashboard.last5')}</span>
            </div>
            {recentReviews.length > 0 ? (
              <div className="space-y-3">
                {recentReviews.map(review => (
                  <div key={review.reviewId} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{review.customerName || 'Client'}</p>
                        <StarRating value={review.star || 0} readOnly size="sm" />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-gray-500 italic line-clamp-2 mt-1">"{review.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                <Star className="h-10 w-10 mb-2" />
                <p className="text-sm text-gray-400">{t('dashboard.noReviews')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Utensils className="h-5 w-5 text-gray-400" />
            {t('dashboard.quickActions')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { path: '/admin/products',    icon: ShoppingBag,  label: t('dashboard.newProduct'),   color: 'indigo' },
              { path: '/admin/employees',   icon: UserCheck,    label: t('dashboard.newEmployee'),   color: 'green'  },
              { path: '/admin/providers',   icon: Truck,        label: t('dashboard.newProvider'),   color: 'purple' },
              { path: '/admin/supplies/new',icon: Package,      label: t('dashboard.orderStock'),    color: 'violet' },
              { path: '/admin/tables',      icon: Utensils,     label: t('dashboard.newTable'),      color: 'amber'  },
              { path: '/admin/tickets',     icon: FileText,     label: t('dashboard.manageTickets'), color: 'teal'   },
            ].map(action => {
              const colors = colorMap[action.color];
              const Icon = action.icon;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className={`flex flex-col items-center gap-2 p-4 ${colors.bg} border ${colors.border} rounded-2xl hover:shadow-md transition-all group hover:-translate-y-1 active:scale-95`}
                >
                  <div className={`p-3 ${colors.icon} rounded-xl group-hover:scale-110 transition-transform shadow-sm`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`text-xs font-bold text-center ${colors.text} leading-tight`}>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
