// Page des commandes du client
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Search, ShoppingCart, X, CheckCircle, Printer, Package, Clock, CreditCard, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, ORDER_STATUS, ORDER_TYPE } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import OrderStatusBar from '../../components/OrderStatusBar';
import { wsManager } from '../../lib/wsManager';

const OrdersPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    return wsManager.onEvent(() => queryClient.invalidateQueries({ queryKey: ['orders'] }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeTab, setActiveTab] = useState('active');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterByDate, setFilterByDate] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', 'customer', user?.ownerId, filterByDate ? selectedDate : null],
    queryFn: async () => {
      if (!user?.ownerId) return [];
      let response;
      if (filterByDate && selectedDate) {
        response = await api.get(API_ENDPOINTS.ORDERS.BY_CUSTOMER_AND_DATE(user.ownerId, selectedDate));
      } else {
        response = await api.get(API_ENDPOINTS.ORDERS.BY_CUSTOMER(user.ownerId));
      }
      return response.data || [];
    },
    enabled: !!user?.ownerId,
    staleTime: Infinity,
  });

  const filteredOrders = orders
    .filter(o => {
      if (searchTerm && !o.orderId?.toString().includes(searchTerm.toLowerCase())) return false;
      if (activeTab === 'active') {
        if (o.status === ORDER_STATUS.CANCELLED) return false;
        // Terminée = payée ET livrée (sur place: SERVED, à emporter: CLOSED ou SERVED)
        const fullyDone = o.paymentCompleted && (
          o.status === ORDER_STATUS.SERVED ||
          (o.orderType === ORDER_TYPE.TAKEAWAY && o.status === ORDER_STATUS.CLOSED)
        );
        return !fullyDone && [ORDER_STATUS.ACTIVE, ORDER_STATUS.CLOSED, ORDER_STATUS.SERVED].includes(o.status);
      }
      if (activeTab === 'finished') {
        return o.paymentCompleted === true && (
          o.status === ORDER_STATUS.SERVED ||
          (o.orderType === ORDER_TYPE.TAKEAWAY && (o.status === ORDER_STATUS.CLOSED || o.status === ORDER_STATUS.SERVED))
        );
      }
      return o.status === ORDER_STATUS.CANCELLED;
    })
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

  const handleFinishMeal = async (order) => {
    if (!window.confirm('Avez-vous terminé votre repas ? Le paiement sera enregistré.')) return;
    try {
      await api.post(API_ENDPOINTS.ORDERS.PAY(order.orderId), {
        paymentMethod: order.paymentMethod,
        createdBy: user?.username || 'CUSTOMER',
      });
      toast.success('Merci de votre visite !');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du paiement');
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Voulez-vous annuler cette commande ?')) return;
    try {
      await api.post(API_ENDPOINTS.ORDERS.CANCEL(orderId));
      toast.success('Commande annulée');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <Sparkles className="h-16 w-16 text-blue-600 animate-pulse" />
          <p className="text-gray-500 font-black animate-pulse">Récupération de vos délices...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Suivi de mes Délices</h1>
            <p className="text-gray-500 font-medium mt-1 uppercase text-xs tracking-widest italic">Suivez vos commandes en temps réel</p>
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black transition-all duration-300 whitespace-nowrap ${
                activeTab === 'active' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-500'
              }`}
            >
              EN COURS
            </button>
            <button
              onClick={() => setActiveTab('finished')}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black transition-all duration-300 whitespace-nowrap ${
                activeTab === 'finished' ? 'bg-white text-green-600 shadow-md scale-105' : 'text-gray-500'
              }`}
            >
              TERMINÉES
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black transition-all duration-300 whitespace-nowrap ${
                activeTab === 'history' ? 'bg-white text-red-600 shadow-md scale-105' : 'text-gray-500'
              }`}
            >
              ANNULÉES
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-10 relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-300" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par numéro de commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-14 pr-6 py-4 bg-white border-2 border-gray-50 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all font-bold shadow-sm"
          />
        </div>

        {/* Liste des commandes */}
        <div className="space-y-8">
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
              <ShoppingCart className="h-20 w-20 text-gray-100 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-gray-300">Aucune commande ici</h3>
              <p className="text-gray-400 mt-2">Votre estomac vous remerciera plus tard !</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.orderId}
                className="group bg-white rounded-[3rem] shadow-xl border border-gray-50 overflow-hidden transition-all duration-500 hover:shadow-2xl"
              >
                <div className="flex flex-col lg:flex-row">
                   <div className="p-8 lg:w-1/3 bg-gray-50 border-r border-gray-100">
                      <div className="flex items-center justify-between mb-6">
                         <span className="px-4 py-1 bg-gray-900 text-white text-xs font-black rounded-full">#{order.orderId}</span>
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{new Date(order.orderDate).toLocaleDateString()}</span>
                      </div>
                      <div className="mb-8">
                         <p className="text-3xl font-black text-gray-900 leading-none mb-2">{order.totalAmount.toFixed(2)} €</p>
                         <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                            <CreditCard className="h-3 w-3" />
                            {LABELS.PAYMENT_METHOD[order.paymentMethod]} • {LABELS.ORDER_TYPE[order.orderType]}
                         </div>
                      </div>
                      <div className="space-y-3">
                         {order.orderItems?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                               <span className="text-xs font-black text-gray-700">{item.productName}</span>
                               <span className="h-6 w-6 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">x{item.quantity}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="p-8 lg:w-2/3 flex flex-col justify-between">
                      <div>
                         <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-8 text-center lg:text-left">Progression de la préparation</h3>
                         <div className="flex justify-center lg:justify-start">
                            <OrderStatusBar status={order.status} />
                         </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-12">
                         {order.status === ORDER_STATUS.ACTIVE && (
                            <button
                               onClick={() => handleCancel(order.orderId)}
                               className="px-8 py-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-black rounded-2xl transition-all flex items-center gap-2 active:scale-95"
                            >
                               <X className="h-5 w-5" /> ANNULER
                            </button>
                         )}

                         {!order.paymentCompleted &&
                           ((order.status === ORDER_STATUS.SERVED && order.orderType === ORDER_TYPE.ON_SITE) ||
                             (order.status === ORDER_STATUS.CLOSED && order.orderType === ORDER_TYPE.TAKEAWAY)) && (
                            <button
                               onClick={() => handleFinishMeal(order)}
                               className="flex-1 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                               <CheckCircle className="h-5 w-5" />
                               {order.orderType === ORDER_TYPE.TAKEAWAY ? 'PAYER MA COMMANDE' : "J'AI TERMINÉ MON REPAS"}
                            </button>
                         )}

                         <button
                            onClick={() => generateOrderPDF(order)}
                            className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-2xl transition-all flex items-center gap-2 active:scale-95"
                         >
                            <Printer className="h-5 w-5" />
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OrdersPage;
