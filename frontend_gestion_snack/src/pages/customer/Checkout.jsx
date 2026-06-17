import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import {
  ShoppingCart, CreditCard, ArrowLeft, Plus, Minus,
  CheckCircle, Clock, Trash2, ShoppingBag, Receipt,
  Users, Tag, ChevronRight, Utensils, AlertTriangle, Lock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { PAYMENT_METHOD, ORDER_TYPE, LABELS, DOCUMENT_TYPE } from '../../utils/constants';
import StripePaymentForm from '../../components/StripePaymentForm';

const CheckoutPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false); // verrou dur contre la double-soumission
  const [freeTables, setFreeTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  // État Stripe : clientSecret reçu du backend, null = pas encore en mode paiement carte
  const [stripeClientSecret, setStripeClientSecret] = useState(null);

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [formData, setFormData] = useState({
    orderType: ORDER_TYPE.TAKEAWAY,
    paymentMethod: PAYMENT_METHOD.CARD,
    documentType: DOCUMENT_TYPE.TICKET,
    pickupTime: '',
    tableId: null,
    guestCount: 1,
  });

  // Sync cart changes back to localStorage so navigating back to menu preserves items
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Redirect if cart empty on mount only
  useEffect(() => {
    if (cart.length === 0) navigate('/customer/menu');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch free tables for on-site orders (fetch all, filter FREE client-side)
  useEffect(() => {
    const fetchTables = async () => {
      setTablesLoading(true);
      try {
        const res = await api.get(API_ENDPOINTS.TABLES.BASE);
        const all = res.data || [];
        setFreeTables(all.filter(t => t.status === 'FREE'));
      } catch {
        setFreeTables([]);
      } finally {
        setTablesLoading(false);
      }
    };
    fetchTables();
  }, []);

  const updateQuantity = (cartKey, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => (item.cartKey || item.productId) !== cartKey));
    } else {
      setCart(prev =>
        prev.map(item =>
          (item.cartKey || item.productId) === cartKey ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeItem = (cartKey) => {
    setCart(prev => prev.filter(item => (item.cartKey || item.productId) !== cartKey));
  };

  const getSubtotal = () => cart.reduce((total, item) => total + (item.basePrice || item.unitPrice) * item.quantity, 0);
  const getExtrasTotal = () => cart.reduce((total, item) => {
    const extras = (item.unitPrice - (item.basePrice || item.unitPrice));
    return total + Math.max(extras, 0) * item.quantity;
  }, 0);
  const getTotal = () => cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  const buildOrderPayload = () => ({
    customerId: user.ownerId,
    tableId: formData.orderType === ORDER_TYPE.ON_SITE ? formData.tableId : null,
    orderType: formData.orderType,
    paymentMethod: formData.paymentMethod,
    pickupTime: formData.pickupTime || null,
    orderItems: cart.map(item => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
    guestCount: formData.orderType === ORDER_TYPE.ON_SITE ? (parseInt(formData.guestCount, 10) || 1) : null,
    createdBy: user.username,
  });

  const validateBeforeSubmit = () => {
    if (cart.length === 0) { toast.warning(t('checkout.empty')); return false; }
    const invalid = cart.filter(item => !item.productId || !item.quantity || item.quantity < 1);
    if (invalid.length > 0) { toast.error('Panier invalide - veuillez vider le panier et recommencer.'); return false; }
    if (formData.orderType === ORDER_TYPE.ON_SITE && !formData.tableId) {
      toast.error('Veuillez sélectionner une table avant de commander.');
      return false;
    }
    return true;
  };

  const submitOrder = async (extraPayload = {}) => {
    const payload = { ...buildOrderPayload(), ...extraPayload };
    const endpoint = extraPayload.stripePaymentIntentId
      ? API_ENDPOINTS.STRIPE.CONFIRM_ORDER
      : API_ENDPOINTS.ORDERS.BASE;

    const response = await api.post(endpoint, payload);

    if (response.data) {
      if (formData.orderType === ORDER_TYPE.ON_SITE && formData.tableId) {
        await api.put(
          API_ENDPOINTS.TABLES.UPDATE_STATUS(formData.tableId),
          null,
          { params: { status: 'OCCUPIED' } }
        ).catch(() => {});
      }
      localStorage.removeItem('cart');
      toast.success(
        formData.orderType === ORDER_TYPE.ON_SITE
          ? t('checkout.successOnSite')
          : t('checkout.successTakeaway')
      );
      navigate('/customer/orders');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (!validateBeforeSubmit()) { submittingRef.current = false; return; }

    // Paiement par carte (TAKEAWAY) → initialiser Stripe avant de créer la commande
    if (formData.paymentMethod === PAYMENT_METHOD.CARD && formData.orderType === ORDER_TYPE.TAKEAWAY) {
      setLoading(true);
      try {
        const totalCents = Math.round(getTotal() * 100);
        const { data } = await api.post(API_ENDPOINTS.STRIPE.CREATE_PAYMENT_INTENT, {
          amountInCents: totalCents,
          currency: 'eur',
        });
        setStripeClientSecret(data.clientSecret);
      } catch (error) {
        const msg = error.response?.data?.message || 'Impossible d\'initialiser le paiement par carte.';
        toast.error(msg);
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
      return;
    }

    // Paiement espèces / commande sur place → flux existant
    setLoading(true);
    try {
      await submitOrder();
    } catch (error) {
      const backendMsg = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;
      const detail = validationErrors
        ? Object.values(validationErrors).join(' | ')
        : backendMsg || t('checkout.errorOrder');
      console.error('[Checkout] Erreur commande:', error.response?.data || error.message);
      toast.error(detail);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Appelé par StripePaymentForm après confirmation Stripe réussie
  const handleStripeSuccess = async (paymentIntentId) => {
    setLoading(true);
    try {
      await submitOrder({ stripePaymentIntentId: paymentIntentId });
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur lors de la finalisation de la commande.';
      toast.error(msg);
      setLoading(false);
    }
  };

  const isOnSite = formData.orderType === ORDER_TYPE.ON_SITE;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/customer/menu')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 rounded-xl shadow-sm transition-all font-medium text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('checkout.backToMenu')}
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
              {t('checkout.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{cart.length} article{cart.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne Gauche: Articles */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">{t('checkout.ordersSection')}</h2>
              </div>

              <div className="divide-y divide-gray-50">
                {cart.map(item => {
                  const itemKey = item.cartKey || item.productId;
                  return (
                    <div key={itemKey} className="p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                      {/* Info produit */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm">{item.productName}</h3>
                        {item.extras && (
                          <div className="flex items-center gap-1 mt-1">
                            <Tag className="h-3 w-3 text-blue-500" />
                            <p className="text-xs text-blue-600 font-medium truncate">{item.extras}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{item.unitPrice?.toFixed(2)} € / unité</p>
                      </div>

                      {/* Quantité */}
                      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1">
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          className="p-1 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-bold text-gray-900 text-sm w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          className="p-1 hover:bg-green-100 hover:text-green-600 rounded-lg transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Prix total item */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-gray-900">{(item.unitPrice * item.quantity).toFixed(2)} €</p>
                        <button
                          onClick={() => removeItem(itemKey)}
                          className="text-red-400 hover:text-red-600 mt-1 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {cart.length === 0 && (
                <div className="py-16 text-center">
                  <ShoppingCart className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">{t('checkout.empty')}</p>
                  <button
                    onClick={() => navigate('/customer/menu')}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                  >
                    {t('checkout.backToMenu')}
                  </button>
                </div>
              )}
            </div>

            {/* Options de commande */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-purple-600" />
                {t('checkout.orderOptions')}
              </h2>

              <form id="checkout-form" onSubmit={handlePayment} className="space-y-5">
                {/* Type de commande */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {t('checkout.orderType')} *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, orderType: ORDER_TYPE.ON_SITE, tableId: null }))}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        formData.orderType === ORDER_TYPE.ON_SITE
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Utensils className="h-4 w-4" />
                      Sur place
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, orderType: ORDER_TYPE.TAKEAWAY, tableId: null }))}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        formData.orderType === ORDER_TYPE.TAKEAWAY
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      À emporter
                    </button>
                  </div>
                </div>

                {/* Sélection de table (sur place uniquement) */}
                {formData.orderType === ORDER_TYPE.ON_SITE && (
                  <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                    <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
                      <Utensils className="inline h-3.5 w-3.5 mr-1" />
                      Table où vous allez manger *
                    </label>
                    {tablesLoading ? (
                      <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <span className="text-sm text-gray-500">Chargement des tables libres...</span>
                      </div>
                    ) : freeTables.length === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                        <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-sm text-orange-700 font-medium">
                          Aucune table libre pour le moment - veuillez patienter ou contacter le personnel
                        </span>
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.tableId ?? ''}
                        onChange={e => setFormData(prev => ({ ...prev, tableId: parseInt(e.target.value) || null }))}
                        className="block w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-semibold text-gray-900"
                      >
                        <option value="">- Sélectionnez votre table -</option>
                        {[...freeTables].sort((a, b) => a.tableNumber - b.tableNumber).map(tbl => (
                          <option key={tbl.tableId} value={tbl.tableId}>
                            Table #{tbl.tableNumber} - {tbl.capacity} place{tbl.capacity > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Nombre de couverts (sur place) */}
                {formData.orderType === ORDER_TYPE.ON_SITE && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      <Users className="inline h-3.5 w-3.5 mr-1" />
                      {t('checkout.guestCount')} *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.guestCount}
                      onChange={e => setFormData(prev => ({ ...prev, guestCount: e.target.value }))}
                      className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('checkout.guestHint')}</p>
                  </div>
                )}

                {/* Méthode de paiement (emporter) */}
                {formData.orderType === ORDER_TYPE.TAKEAWAY && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      <CreditCard className="inline h-3.5 w-3.5 mr-1" />
                      {t('checkout.paymentMethod')} *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(LABELS.PAYMENT_METHOD).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                          className={`px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-all ${
                            formData.paymentMethod === value
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Type de document */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {t('checkout.documentType')}
                  </label>
                  <div className="flex gap-4">
                    {Object.entries(LABELS.DOCUMENT_TYPE).map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer group">
                        <div
                          onClick={() => setFormData({ ...formData, documentType: value })}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                            formData.documentType === value
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300 group-hover:border-blue-400'
                          }`}
                        >
                          {formData.documentType === value && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Heure de retrait (emporter) */}
                {!isOnSite && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      <Clock className="inline h-3.5 w-3.5 mr-1" />
                      {t('checkout.pickupTime')}
                    </label>
                    <input
                      type="time"
                      value={formData.pickupTime}
                      onChange={e => setFormData(prev => ({ ...prev, pickupTime: e.target.value }))}
                      className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('checkout.pickupHint')}</p>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Colonne Droite: Récapitulatif ou Formulaire Stripe */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">

              {stripeClientSecret ? (
                /* ── Mode paiement Stripe ── */
                <>
                  <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" />
                    Paiement par carte
                  </h2>
                  <p className="text-xs text-gray-400 mb-5">
                    Total : <span className="font-black text-blue-600 text-base">{getTotal().toFixed(2)} €</span>
                  </p>
                  {loading ? (
                    <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                      Finalisation de la commande...
                    </div>
                  ) : (
                    <StripePaymentForm
                      clientSecret={stripeClientSecret}
                      amount={getTotal()}
                      onSuccess={handleStripeSuccess}
                      onCancel={() => setStripeClientSecret(null)}
                    />
                  )}
                </>
              ) : (
                /* ── Mode récapitulatif normal ── */
                <>
                  <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    {t('checkout.summary')}
                  </h2>

                  {/* Détail des prix */}
                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('checkout.base')}</span>
                      <span className="font-semibold text-gray-900">{getSubtotal().toFixed(2)} €</span>
                    </div>
                    {getExtrasTotal() > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('checkout.extras')}</span>
                        <span className="font-semibold text-blue-600">+{getExtrasTotal().toFixed(2)} €</span>
                      </div>
                    )}
                    <div className="h-px bg-gray-100" />
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900">{t('checkout.total')}</span>
                      <span className="text-2xl font-black text-blue-600">{getTotal().toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Résumé commande */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>{t('checkout.typeLabel')}</span>
                      <span className="font-semibold">{LABELS.ORDER_TYPE[formData.orderType]}</span>
                    </div>
                    {isOnSite && formData.tableId && (
                      <div className="flex justify-between text-gray-600">
                        <span>Table</span>
                        <span className="font-semibold text-blue-600">
                          #{freeTables.find(tb => tb.tableId === formData.tableId)?.tableNumber ?? formData.tableId}
                          {freeTables.find(tb => tb.tableId === formData.tableId)?.capacity
                            ? ` · ${freeTables.find(tb => tb.tableId === formData.tableId).capacity} pl.`
                            : ''}
                        </span>
                      </div>
                    )}
                    {!isOnSite && (
                      <div className="flex justify-between text-gray-600">
                        <span>{t('checkout.paymentLabel')}</span>
                        <span className="font-semibold">{LABELS.PAYMENT_METHOD[formData.paymentMethod]}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>{t('checkout.documentLabel')}</span>
                      <span className="font-semibold">{LABELS.DOCUMENT_TYPE[formData.documentType]}</span>
                    </div>
                    {formData.pickupTime && (
                      <div className="flex justify-between text-gray-600">
                        <span>{t('checkout.retrievalLabel')}</span>
                        <span className="font-semibold">{formData.pickupTime}</span>
                      </div>
                    )}
                  </div>

                  {/* Bouton Commander */}
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={loading || cart.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-black text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        <span>{t('checkout.processing')}</span>
                      </>
                    ) : isOnSite ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>{t('checkout.order')}</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    ) : formData.paymentMethod === PAYMENT_METHOD.CARD ? (
                      <>
                        <Lock className="h-5 w-5" />
                        <span>Payer {getTotal().toFixed(2)} € par carte</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        <span>{t('checkout.pay')} {getTotal().toFixed(2)} €</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-3">
                    {t('checkout.securePayment')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
