import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Search, Filter, Eye, XCircle, Clock, Printer, Package, User, Calendar, CreditCard } from 'lucide-react';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, ORDER_STATUS } from '../../utils/constants';
import OrderStatusBar from '../../components/OrderStatusBar';

const OrdersPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterByDate, setFilterByDate] = useState(true);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', 'admin', statusFilter, filterByDate ? selectedDate : null],
    queryFn: async () => {
      let response;
      if (filterByDate && selectedDate) {
        response = statusFilter !== 'ALL'
          ? await api.get(API_ENDPOINTS.ORDERS.BY_STATUS_AND_DATE(statusFilter, selectedDate))
          : await api.get(API_ENDPOINTS.ORDERS.BY_DATE(selectedDate));
      } else {
        response = statusFilter !== 'ALL'
          ? await api.get(API_ENDPOINTS.ORDERS.BY_STATUS(statusFilter))
          : await api.get(API_ENDPOINTS.ORDERS.BASE);
      }
      return response.data || [];
    },
    staleTime: Infinity,
  });

  const filteredOrders = orders
    .filter(order => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const lowerTerm = searchTerm.toLowerCase();
      return (
        order.orderId.toString().includes(lowerTerm) ||
        (order.customer && `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase().includes(lowerTerm))
      );
    })
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setShowModal(true);
    if (!order.orderItems) {
      try {
        const res = await api.get(`${API_ENDPOINTS.ORDERS.BASE}/${order.orderId}`);
        setSelectedOrder(res.data);
      } catch (e) {
        console.error('Could not fetch order details', e);
      }
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      let endpoint;
      switch (newStatus) {
        case 'CLOSED':   endpoint = API_ENDPOINTS.ORDERS.CLOSE(orderId);  break;
        case 'SERVED':   endpoint = API_ENDPOINTS.ORDERS.SERVE(orderId);  break;
        case 'CANCELLED': endpoint = API_ENDPOINTS.ORDERS.CANCEL(orderId); break;
        default: toast.error('Statut inconnu'); return;
      }
      await api.post(endpoint);
      toast.success('Statut mis à jour !');
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      if (selectedOrder && selectedOrder.orderId === orderId) {
        const res = await api.get(`${API_ENDPOINTS.ORDERS.BASE}/${orderId}`);
        setSelectedOrder(res.data);
      }
    } catch {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <p className="text-gray-500 font-bold animate-pulse text-lg uppercase tracking-widest">Synchronisation temps réel...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Flux de Commandes
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </h1>
            <p className="text-gray-500 font-medium mt-1 uppercase text-xs tracking-widest">Dashboard de supervision en direct</p>
          </div>

          <div className="flex items-center gap-4 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
            <div className="text-right">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Total du jour</p>
              <p className="text-xl font-black text-blue-700">{orders.length} Commandes</p>
            </div>
            <div className="h-8 w-px bg-blue-200"></div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par ID ou nom du client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold appearance-none cursor-pointer"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Filter className="h-6 w-6 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                {Object.entries(LABELS.ORDER_STATUS).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Commande</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Informations Client</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant Total</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Progression</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <Clock className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-xl font-bold text-gray-400 italic">Aucune commande active</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.orderId} className="group hover:bg-blue-50/30 transition-all duration-300">
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center justify-center px-4 py-1 bg-gray-900 text-white text-sm font-black rounded-full shadow-sm">
                        #{order.orderId}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                          {order.customer ? order.customer.firstName[0] : '?'}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 leading-none mb-1">
                            {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Client de passage'}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-black text-gray-900">{order.totalAmount.toFixed(2)} €</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {LABELS.PAYMENT_METHOD[order.paymentMethod] || 'Cash'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <OrderStatusBar status={order.status} compact={true} />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => generateOrderPDF(order)}
                          className="p-3 bg-white text-gray-600 hover:text-blue-600 rounded-xl shadow-sm border border-gray-100 hover:border-blue-100 transition-all"
                          title="Imprimer le ticket"
                        >
                          <Printer className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="px-5 py-3 bg-blue-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                        >
                          Détails
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Détails */}
        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="relative h-32 bg-blue-600 p-8 flex items-end justify-between overflow-hidden">
                 <div className="absolute top-0 right-0 opacity-10 -mt-8 -mr-8">
                    <Package className="h-48 w-48 text-white rotate-12" />
                 </div>
                 <div className="relative z-10">
                    <span className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1 block">Fiche Commande</span>
                    <h2 className="text-3xl font-black text-white leading-none">Numéro #{selectedOrder.orderId}</h2>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors relative z-20">
                    <XCircle className="h-6 w-6" />
                 </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-10">
                <div className="bg-gray-50 rounded-[2rem] p-8 flex justify-center border border-gray-100">
                  <OrderStatusBar status={selectedOrder.status} />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Destinataire</h3>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{selectedOrder.customer ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName}` : 'Anonyme'}</p>
                        <p className="text-xs font-medium text-gray-500 italic">Commandé via {LABELS.ORDER_TYPE[selectedOrder.orderType]}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-right">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Récapitulatif financier</h3>
                    <div>
                      <p className="text-4xl font-black text-gray-900">{selectedOrder.totalAmount.toFixed(2)} €</p>
                      <p className="text-xs font-bold text-green-600 flex items-center justify-end gap-1 uppercase">
                         <span className="h-2 w-2 rounded-full bg-green-500"></span>
                         {LABELS.PAYMENT_METHOD[selectedOrder.paymentMethod] || 'Paiement Espèces'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Articles commandés</h3>
                  <div className="space-y-3">
                    {selectedOrder.orderItems?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-xs font-black shadow-sm text-blue-600 border border-gray-100">
                             x{item.quantity}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{item.productName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.unitPrice.toFixed(2)} € / unité</p>
                          </div>
                        </div>
                        <p className="font-black text-gray-900">{(item.unitPrice * item.quantity).toFixed(2)} €</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                   {selectedOrder.status === 'ACTIVE' && (
                     <button
                       onClick={() => handleUpdateStatus(selectedOrder.orderId, 'CLOSED')}
                       className="flex-1 py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-orange-100 transition-all active:scale-95"
                     >
                       Marquer comme Prête
                     </button>
                   )}
                   {selectedOrder.status === 'CLOSED' && (
                     <button
                       onClick={() => handleUpdateStatus(selectedOrder.orderId, 'SERVED')}
                       className="flex-1 py-5 bg-green-500 hover:bg-green-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-green-100 transition-all active:scale-95"
                     >
                       Confirmer la Livraison
                     </button>
                   )}
                   {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'SERVED' && (
                     <button
                       onClick={() => handleUpdateStatus(selectedOrder.orderId, 'CANCELLED')}
                       className="px-8 py-5 bg-red-50 text-red-500 hover:bg-red-100 font-bold rounded-[1.5rem] transition-all"
                     >
                       Annuler
                     </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrdersPage;
