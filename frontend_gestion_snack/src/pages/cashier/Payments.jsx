import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Search, CreditCard, DollarSign, CheckCircle, History, Clock, User, CalendarDays, Filter, Receipt, Package } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD } from '../../utils/constants';

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

const isPayable = (order) => {
  if (order.paymentCompleted) return false;
  if (order.status === ORDER_STATUS.CANCELLED) return false;
  if (order.orderType === ORDER_TYPE.TAKEAWAY) return order.status === ORDER_STATUS.CLOSED || order.status === ORDER_STATUS.SERVED;
  return order.status === ORDER_STATUS.SERVED;
};

const PaymentsPage = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState('topay');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterByDate, setFilterByDate] = useState(false);

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['orders', 'cashier', view, filterByDate && view === 'history' ? selectedDate : null],
    queryFn: async () => {
      let response;
      if (view === 'history' && filterByDate && selectedDate) {
        response = await api.get(API_ENDPOINTS.ORDERS.BY_DATE(selectedDate));
      } else {
        response = await api.get(API_ENDPOINTS.ORDERS.BASE);
      }
      return response.data || [];
    },
    staleTime: Infinity,
  });

  const handlePayment = async (orderId, paymentMethod) => {
    try {
      await api.post(API_ENDPOINTS.ORDERS.PAY(orderId), { paymentMethod, createdBy: 'CASHIER' });
      toast.success('Paiement enregistré avec succès ✅');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du paiement');
    }
  };

  const q = searchTerm.toLowerCase();
  const matchesSearch = (order) =>
    !q ||
    order.orderId?.toString().includes(q) ||
    order.tableId?.toString().includes(q) ||
    (order.customer && `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.toLowerCase().includes(q));

  const payableOrders = allOrders.filter(o => isPayable(o) && matchesSearch(o));
  const historyOrders = allOrders.filter(o => matchesSearch(o));
  const payableCount = allOrders.filter(isPayable).length;
  const historyGroups = groupByDate(historyOrders);

  const statusBadge = (order) => {
    const colors = {
      [ORDER_STATUS.ACTIVE]:    'bg-blue-100 text-blue-700',
      [ORDER_STATUS.CLOSED]:    'bg-orange-100 text-orange-700',
      [ORDER_STATUS.SERVED]:    'bg-green-100 text-green-700',
      [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${colors[order.status] || 'bg-gray-100 text-gray-600'}`}>
        {LABELS.ORDER_STATUS[order.status] || order.status}
        {order.paymentCompleted && ' • Payée'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CreditCard className="h-7 w-7 text-blue-600" />
              Caisse
            </h1>
            <p className="text-gray-500 mt-1">
              {payableCount > 0
                ? <span className="font-semibold text-orange-600">{payableCount} commande{payableCount > 1 ? 's' : ''} en attente de paiement</span>
                : 'Aucune commande en attente de paiement'}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex bg-gray-100 p-1 rounded-2xl shadow-inner gap-1">
            <button
              onClick={() => setView('topay')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${view === 'topay' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <DollarSign className="h-4 w-4" />
              À payer
              {payableCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{payableCount}</span>
              )}
            </button>
            <button
              onClick={() => setView('history')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${view === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="h-4 w-4" />
              Historique
            </button>
          </div>
        </div>

        {/* Search + date filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher commande, table, client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-900"
            />
          </div>
          {view === 'history' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  disabled={!filterByDate}
                  className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-40 text-gray-900"
                />
              </div>
              <button
                onClick={() => setFilterByDate(f => !f)}
                className={`p-2.5 rounded-xl transition-all ${filterByDate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                title={filterByDate ? 'Désactiver le filtre date' : 'Filtrer par date'}
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* ─── VIEW: À PAYER ─── */}
        {view === 'topay' && (
          payableOrders.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <CheckCircle className="h-14 w-14 text-green-300 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-400">Aucune commande à encaisser</h3>
              <p className="text-gray-400 mt-1 text-sm">Toutes les commandes sont à jour !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {payableOrders.map(order => (
                <div key={order.orderId} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden">
                  <div className="p-5 bg-orange-50 border-b border-orange-100 flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Commande</p>
                      <h3 className="text-xl font-black text-gray-900">#{order.orderId}</h3>
                    </div>
                    <div className="text-right space-y-1">
                      {statusBadge(order)}
                      <p className="text-[10px] text-gray-400 font-bold">{LABELS.ORDER_TYPE[order.orderType]}</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                      <User className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {order.customer ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Client' : 'Client'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.tableId ? `Table #${order.tableId}` : 'À emporter'} · {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {order.orderItems && order.orderItems.length > 0 && (
                      <div className="space-y-1">
                        {order.orderItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.productName}</span>
                            <span className="font-bold text-gray-900">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="font-bold text-gray-700">Total</span>
                      <span className="text-2xl font-black text-blue-600">{order.totalAmount?.toFixed(2)} €</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handlePayment(order.orderId, PAYMENT_METHOD.CASH)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-sm"
                      >
                        <DollarSign className="h-4 w-4" />
                        Espèces
                      </button>
                      <button
                        onClick={() => handlePayment(order.orderId, PAYMENT_METHOD.CARD)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold text-sm"
                      >
                        <CreditCard className="h-4 w-4" />
                        Carte
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ─── VIEW: HISTORIQUE ─── */}
        {view === 'history' && (
          historyGroups.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Package className="h-14 w-14 text-gray-300 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-400">Aucune commande trouvée</h3>
              <p className="text-gray-400 mt-1 text-sm">Essayez de modifier les filtres</p>
            </div>
          ) : (
            historyGroups.map(group => (
              <div key={group.key} className="mb-10">
                <div className="flex items-center gap-4 mb-5">
                  <CalendarDays className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest capitalize">{group.label}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {group.orders.length} commande{group.orders.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {group.orders.map(order => (
                    <div key={order.orderId} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="w-14 text-center">
                        <p className="text-xs text-gray-400 font-bold">#</p>
                        <p className="font-black text-gray-900">{order.orderId}</p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">
                            {order.customer ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Client' : 'Client'}
                          </span>
                          {statusBadge(order)}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.tableId ? `Table #${order.tableId}` : 'À emporter'} ·
                          {LABELS.ORDER_TYPE[order.orderType]} ·
                          {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {order.orderItems && order.orderItems.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {order.orderItems.map(i => `${i.quantity}× ${i.productName}`).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-gray-900">{order.totalAmount?.toFixed(2)} €</p>
                        {order.paymentCompleted && (
                          <p className="text-xs text-green-600 font-bold flex items-center gap-1 justify-end">
                            <CheckCircle className="h-3 w-3" />
                            Payée
                          </p>
                        )}
                        {isPayable(order) && (
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => handlePayment(order.orderId, PAYMENT_METHOD.CASH)}
                              className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-[10px] font-black transition-colors"
                            >
                              Espèces
                            </button>
                            <button
                              onClick={() => handlePayment(order.orderId, PAYMENT_METHOD.CARD)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-[10px] font-black transition-colors"
                            >
                              Carte
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </Layout>
  );
};

export default PaymentsPage;
