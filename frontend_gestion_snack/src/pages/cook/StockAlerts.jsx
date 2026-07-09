import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import {
  AlertTriangle, Plus, CheckCircle, Package, Clock, Filter,
  RotateCcw, X,
} from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}) : '-';

const TRIGGERED_BY_LABEL = { SYSTEM: 'Automatique', COOK: 'Cuisinier' };
const TRIGGERED_BY_COLOR = {
  SYSTEM: 'bg-blue-100 text-blue-700',
  COOK:   'bg-orange-100 text-orange-700',
};

// ── Page ───────────────────────────────────────────────────────────────────────
const CookStockAlertsPage = () => {
  const { user } = useAuth();

  const [alerts,      setAlerts]      = useState([]);
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('UNRESOLVED'); // ALL | UNRESOLVED
  const [showForm,    setShowForm]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  const [form, setForm] = useState({
    productId:         '',
    requestedQuantity: '',
    message:           '',
  });

  useEffect(() => { loadAlerts(); loadProducts(); }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const url = filter === 'UNRESOLVED'
        ? API_ENDPOINTS.STOCK_ALERTS.UNRESOLVED
        : API_ENDPOINTS.STOCK_ALERTS.BASE;
      const res = await api.get(url);
      setAlerts(res.data || []);
    } catch { toast.error('Impossible de charger les alertes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAlerts(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.PRODUCTS.BASE);
      setProducts(res.data || []);
    } catch { /* silently fail */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId) { toast.warning('Sélectionnez un produit'); return; }
    const qty = parseInt(form.requestedQuantity, 10);
    if (!qty || qty <= 0) { toast.warning('La quantité souhaitée doit être supérieure à 0'); return; }

    setSubmitting(true);
    try {
      await api.post(API_ENDPOINTS.STOCK_ALERTS.CREATE, {
        productId:         Number(form.productId),
        requestedQuantity: qty,
        message:           form.message.trim() || null,
        triggeredBy:       user?.username || 'COOK',
      });
      toast.success('Alerte envoyée à l\'administrateur');
      setForm({ productId: '', requestedQuantity: '', message: '' });
      setShowForm(false);
      loadAlerts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la création de l\'alerte');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => String(p.productId) === String(form.productId));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Alertes de stock
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Consultez les alertes existantes ou signalez un besoin en approvisionnement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAlerts}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500"
              title="Actualiser"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-100 transition-all"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Annuler' : 'Nouvelle alerte'}
            </button>
          </div>
        </div>

        {/* ── Formulaire alerte manuelle ── */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-orange-50 border border-orange-200 rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-bold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Signaler un besoin en stock
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Produit */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Produit *
                </label>
                <select
                  value={form.productId}
                  onChange={e => setForm(p => ({ ...p, productId: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Choisir un produit…</option>
                  {products.map(p => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} - stock actuel : {p.quantityAvailable}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className={`text-xs mt-1 font-semibold ${selectedProduct.quantityAvailable <= 5 ? 'text-red-600' : 'text-gray-500'}`}>
                    Stock actuel : {selectedProduct.quantityAvailable} unité(s)
                    {selectedProduct.quantityAvailable <= 5 && ' - CRITIQUE'}
                  </p>
                )}
              </div>

              {/* Quantité souhaitée */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Quantité souhaitée *
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.requestedQuantity}
                  onChange={e => setForm(p => ({ ...p, requestedQuantity: e.target.value }))}
                  required
                  placeholder="ex. 50"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Quantité dont vous avez besoin pour la période à venir
                </p>
              </div>
            </div>

            {/* Message optionnel */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                Message (optionnel)
              </label>
              <textarea
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                rows={2}
                placeholder="Expliquez la raison du besoin (grande affluence prévue, événement, rupture imminente…)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm shadow-md disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Envoyer l\'alerte à l\'administrateur'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ productId: '', requestedQuantity: '', message: '' }); }}
                className="px-5 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* ── Filtre ── */}
        <div className="flex gap-2">
          {[
            { key: 'UNRESOLVED', label: 'Non résolues', icon: AlertTriangle },
            { key: 'ALL',        label: 'Toutes',        icon: Filter       },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all
                ${filter === key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Liste des alertes ── */}
        {loading ? (
          <p className="text-center text-gray-400 py-16">Chargement…</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
            <p className="font-bold text-gray-500">Aucune alerte{filter === 'UNRESOLVED' ? ' non résolue' : ''}</p>
            <p className="text-sm text-gray-400 mt-1">Tout est en ordre !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.alertId}
                className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row gap-4 transition-all
                  ${alert.resolved ? 'border-gray-100 opacity-60' : 'border-orange-200 shadow-sm'}`}
              >
                {/* Icône */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                  ${alert.resolved ? 'bg-green-50' : 'bg-orange-50'}`}>
                  {alert.resolved
                    ? <CheckCircle className="h-5 w-5 text-green-500" />
                    : <AlertTriangle className="h-5 w-5 text-orange-500" />}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-black text-gray-900">{alert.productName}</span>

                    {/* Badge origine */}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${TRIGGERED_BY_COLOR[alert.triggeredBy] || 'bg-gray-100 text-gray-600'}`}>
                      {TRIGGERED_BY_LABEL[alert.triggeredBy] || alert.triggeredBy}
                    </span>

                    {/* Badge résolu */}
                    {alert.resolved && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Résolu
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{alert.message}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {alert.currentStock !== undefined && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        Stock actuel : <strong className={alert.currentStock <= 5 ? 'text-red-600' : 'text-gray-700'}>
                          {alert.currentStock} unité(s)
                        </strong>
                      </span>
                    )}
                    {alert.requestedQuantity && (
                      <span className="flex items-center gap-1 text-orange-600 font-semibold">
                        → Besoin : {alert.requestedQuantity} unité(s)
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtDate(alert.alertDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CookStockAlertsPage;
