import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Search, ChefHat, CheckCircle, Clock, AlertCircle, CalendarDays, Filter } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, ORDER_STATUS } from '../../utils/constants';
import { useNotifications } from '../../context/NotificationContext';

const STATUS_TABS = [
  { key: 'ALL',    label: 'Toutes',       color: 'text-gray-700',   active: 'bg-white text-gray-900 shadow-md' },
  { key: 'ACTIVE', label: 'À préparer',   color: 'text-orange-600', active: 'bg-white text-orange-600 shadow-md scale-105' },
  { key: 'CLOSED', label: 'Prêtes',       color: 'text-green-600',  active: 'bg-white text-green-600 shadow-md scale-105' },
];

const groupByDate = (orders) => {
  const map = {};
  orders.forEach(o => {
    const d = new Date(o.orderDate);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!map[key]) map[key] = { key, label, orders: [] };
    map[key].orders.push(o);
  });
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
};

const CookOrdersPage = () => {
  const { sendToUser } = useNotifications();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterByDate, setFilterByDate] = useState(true);

  // Clé de requête dépendant des filtres — React Query refetch automatiquement
  // quand la clé change, et invalide quand le WebSocket reçoit un événement /topic/orders
  const queryKey = ['orders', 'cook', statusFilter, filterByDate ? selectedDate : null];

  const { data: rawOrders = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let response;
      if (statusFilter === 'ALL') {
        response = filterByDate && selectedDate
          ? await api.get(API_ENDPOINTS.ORDERS.BY_DATE(selectedDate))
          : await api.get(API_ENDPOINTS.ORDERS.BASE);
      } else {
        response = filterByDate && selectedDate
          ? await api.get(API_ENDPOINTS.ORDERS.BY_STATUS_AND_DATE(statusFilter, selectedDate))
          : await api.get(API_ENDPOINTS.ORDERS.BY_STATUS(statusFilter));
      }
      return response.data || [];
    },
    staleTime: Infinity, // Jamais périmé automatiquement — WS invalide le cache
  });

  // Vue cuisine : ACTIVE (à préparer) + CLOSED (prêtes)
  const orders = rawOrders.filter(
    o => o.status === ORDER_STATUS.ACTIVE || o.status === ORDER_STATUS.CLOSED
  );

  const filteredOrders = searchTerm
    ? orders.filter(o => {
        const lower = searchTerm.toLowerCase();
        return (
          o.orderId?.toString().includes(lower) ||
          (o.customer && `${o.customer.firstName ?? ''} ${o.customer.lastName ?? ''}`.toLowerCase().includes(lower))
        );
      })
    : orders;

  const sortedOrders = [...filteredOrders].sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));

  const handlePrepare = async (orderId) => {
    const order = orders.find(o => o.orderId === orderId);
    try {
      await api.post(API_ENDPOINTS.ORDERS.CLOSE(orderId));
      toast.success(`Commande #${orderId} prête ! 🍽️`);

      // Notification client (le WS mettra aussi à jour l'UI automatiquement)
      const customerId = order?.customerId || order?.customer?.customerId || order?.customer?.userId;
      if (customerId) {
        const items = (order?.orderItems || []).map(i => `${i.quantity}× ${i.productName}`).join(', ');
        sendToUser(customerId, {
          type: 'order_status',
          title: '✅ Votre commande est prête !',
          message: `Commande #${orderId} est prête à être servie${items ? ` : ${items}` : ''}.`,
        });
      }

      // Invalide toutes les queries ['orders', ...] → re-fetch immédiat
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch {
      toast.error('Erreur lors de la validation de la préparation');
    }
  };

  const groups = groupByDate(sortedOrders);
  const activeCount = orders.filter(o => o.status === ORDER_STATUS.ACTIVE).length;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <ChefHat className="h-16 w-16 text-blue-600 animate-bounce" />
          <p className="text-gray-500 font-black animate-pulse">Synchronisation cuisine...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Cuisine en Direct
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
              </span>
            </h1>
            <p className="text-gray-500 font-medium mt-1 uppercase text-xs tracking-widest italic">
              {activeCount > 0 ? `${activeCount} commande${activeCount > 1 ? 's' : ''} en attente de préparation` : 'Ne faites pas attendre les gourmands'}
            </p>
          </div>

          {/* Status filter tabs */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${statusFilter === tab.key ? tab.active : `${tab.color} hover:bg-white/50`}`}
              >
                {tab.label}
                {tab.key === 'ACTIVE' && activeCount > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {activeCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-10 border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une commande ou un client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                disabled={!filterByDate}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer disabled:opacity-40"
              />
            </div>
            <button
              onClick={() => setFilterByDate(f => !f)}
              className={`p-4 rounded-2xl transition-all flex-shrink-0 ${filterByDate ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
              title={filterByDate ? 'Désactiver le filtre date' : 'Activer le filtre date'}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Orders grouped by date */}
        {groups.length === 0 ? (
          <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
            <ChefHat className="h-20 w-20 text-gray-200 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-gray-400">Silence en cuisine...</h3>
            <p className="text-gray-400 mt-2">Aucune commande ne correspond aux filtres actuels.</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key} className="mb-12">
              {/* Date header */}
              <div className="flex items-center gap-4 mb-6">
                <CalendarDays className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest capitalize">{group.label}</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {group.orders.length} commande{group.orders.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {group.orders.map(order => (
                  <div
                    key={order.orderId}
                    className={`group relative bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border overflow-hidden
                      ${order.status === ORDER_STATUS.ACTIVE ? 'border-orange-100 hover:-translate-y-2' : 'border-green-100 opacity-80'}`}
                  >
                    <div className={`p-6 flex justify-between items-start ${order.status === ORDER_STATUS.ACTIVE ? 'bg-orange-50/50' : 'bg-green-50/50'}`}>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Bon de Commande</span>
                        <h3 className="text-2xl font-black text-gray-900 leading-none">#{order.orderId}</h3>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs font-black text-gray-500 flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3 text-blue-500" />
                          {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.orderType === 'TAKEAWAY' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {LABELS.ORDER_TYPE[order.orderType]}
                        </span>
                        <span className={`block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.status === ORDER_STATUS.ACTIVE ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {LABELS.ORDER_STATUS[order.status] || order.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        {order.orderItems?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center font-black text-orange-600 shadow-sm border border-gray-100 text-sm">
                              {item.quantity}
                            </div>
                            <p className="text-sm font-black text-gray-800 uppercase tracking-tight flex-1">{item.productName}</p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-dashed border-gray-200 flex items-center justify-between text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Client :</span>
                        <span className="text-blue-600">
                          {order.customer ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Client Direct' : 'Client Direct'}
                        </span>
                      </div>

                      {order.tableId && (
                        <p className="text-xs text-gray-500 font-bold">🪑 Table #{order.tableId}</p>
                      )}

                      {order.status === ORDER_STATUS.ACTIVE && (
                        <button
                          onClick={() => handlePrepare(order.orderId)}
                          className="w-full mt-2 flex items-center justify-center gap-3 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-100 transition-all active:scale-95"
                        >
                          <CheckCircle className="h-5 w-5" />
                          TERMINER LA PRÉPARATION
                        </button>
                      )}

                      {order.status === ORDER_STATUS.CLOSED && (
                        <div className="flex items-center justify-center gap-2 py-4 text-green-600 font-black text-sm">
                          <CheckCircle className="h-5 w-5" />
                          COMMANDE PRÊTE
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
};

export default CookOrdersPage;
