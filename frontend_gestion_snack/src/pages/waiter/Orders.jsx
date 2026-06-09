import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Search, Utensils, CheckCircle, Clock, Printer, User, Package, CalendarDays, Filter } from 'lucide-react';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, ORDER_STATUS } from '../../utils/constants';
import { wsManager } from '../../lib/wsManager';

const STATUS_TABS = [
  { key: 'ALL',    label: 'Toutes',     active: 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105' },
  { key: 'CLOSED', label: 'À servir',   active: 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105' },
  { key: 'SERVED', label: 'Déjà servies', active: 'bg-green-600 text-white shadow-lg shadow-green-100 scale-105' },
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

const WaiterOrdersPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    return wsManager.onEvent(() => queryClient.invalidateQueries({ queryKey: ['orders'] }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterByDate, setFilterByDate] = useState(true);

  const { data: rawOrders = [], isLoading } = useQuery({
    queryKey: ['orders', 'waiter', statusFilter, filterByDate ? selectedDate : null],
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
    staleTime: Infinity,
  });

  // Vue serveur : CLOSED (à servir) + SERVED (déjà servies)
  const orders = rawOrders.filter(
    o => o.status === ORDER_STATUS.CLOSED || o.status === ORDER_STATUS.SERVED
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

  const handleServe = async (orderId) => {
    try {
      await api.post(API_ENDPOINTS.ORDERS.SERVE(orderId));
      toast.success(`Commande #${orderId} servie ! ✅`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch {
      toast.error('Erreur lors du service de la commande');
    }
  };

  const groups = groupByDate(sortedOrders);
  const toServeCount = orders.filter(o => o.status === ORDER_STATUS.CLOSED).length;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <Utensils className="h-16 w-16 text-blue-600 animate-bounce" />
          <p className="text-gray-500 font-black animate-pulse uppercase tracking-tighter">Synchronisation service...</p>
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
              Service Salle
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            </h1>
            <p className="text-gray-500 font-medium mt-1 uppercase text-xs tracking-widest">
              {toServeCount > 0 ? `${toServeCount} commande${toServeCount > 1 ? 's' : ''} à servir` : 'Suivi des livraisons client'}
            </p>
          </div>

          {/* Status filter tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-gray-100 gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  statusFilter === tab.key ? tab.active : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.key === 'CLOSED' && toServeCount > 0 && (
                  <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {toServeCount}
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
              placeholder="Rechercher par ID ou nom de client..."
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
            <Package className="h-20 w-20 text-gray-200 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-gray-400">Rien à afficher</h3>
            <p className="text-gray-400 mt-2">Aucune commande ne correspond aux filtres actuels.</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key} className="mb-12">
              <div className="flex items-center gap-4 mb-6">
                <CalendarDays className="h-5 w-5 text-green-500 flex-shrink-0" />
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
                    className={`group bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border overflow-hidden
                      ${order.status === ORDER_STATUS.CLOSED ? 'border-blue-100 hover:-translate-y-2' : 'border-green-100 opacity-80'}`}
                  >
                    <div className={`p-6 flex justify-between items-center ${order.status === ORDER_STATUS.CLOSED ? 'bg-blue-50/50' : 'bg-green-50/50'}`}>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 leading-none mb-1">#{order.orderId}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {LABELS.ORDER_TYPE[order.orderType]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.status === ORDER_STATUS.CLOSED ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {LABELS.ORDER_STATUS[order.status] || order.status}
                        </span>
                        <button
                          onClick={() => generateOrderPDF(order)}
                          className="p-2 bg-white rounded-xl shadow-sm hover:text-blue-600 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black shadow-sm">
                          <User className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">
                            {order.customer ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Client Comptoir' : 'Client Comptoir'}
                          </p>
                          <p className="text-xs font-bold text-gray-500 italic">
                            {order.tableId ? `Table #${order.tableId}` : 'À Emporter'}
                          </p>
                          <p className="text-xs text-gray-400">
                            <Clock className="inline h-3 w-3 mr-0.5" />
                            {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.orderItems?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">{item.productName}</span>
                            <span className="font-black text-gray-900">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {order.status === ORDER_STATUS.CLOSED && (
                        <button
                          onClick={() => handleServe(order.orderId)}
                          className="w-full flex items-center justify-center gap-3 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 transition-all active:scale-95"
                        >
                          <CheckCircle className="h-5 w-5" />
                          MARQUER COMME SERVIE
                        </button>
                      )}

                      {order.status === ORDER_STATUS.SERVED && (
                        <div className="text-center py-2 flex items-center justify-center gap-2 text-green-600 font-black text-sm uppercase tracking-widest">
                          <CheckCircle className="h-4 w-4" />
                          Servie avec succès
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

export default WaiterOrdersPage;
