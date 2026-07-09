import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import {
  AlertTriangle, CheckCircle, RefreshCw, Package, ShoppingCart,
  Filter, Clock, User, Tag, TrendingDown, Truck,
} from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { wsManager } from '../../lib/wsManager';

const fmtDate = (d) => d
  ? new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  : '-';

const PRODUCT_TYPE_LABEL = { FOOD: 'Plat', DRINK: 'Boisson', INGREDIENT: 'Ingredient' };
const PRODUCT_TYPE_COLOR = {
  FOOD:       'bg-orange-100 text-orange-700',
  DRINK:      'bg-blue-100 text-blue-700',
  INGREDIENT: 'bg-green-100 text-green-700',
};
const TRIGGERED_BY_LABEL = { SYSTEM: 'Alerte automatique', COOK: 'Cuisinier' };
const TRIGGERED_BY_COLOR = {
  SYSTEM: 'bg-gray-100 text-gray-600',
  COOK:   'bg-orange-100 text-orange-700',
};

const StockAlertsPage = () => {
  const navigate = useNavigate();
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('UNRESOLVED');

  useEffect(() => { loadAlerts(true); }, []);

  useEffect(() => {
    return wsManager.onEvent(() => loadAlerts(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAlerts(true); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAlerts = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const url = filter === 'UNRESOLVED'
        ? API_ENDPOINTS.STOCK_ALERTS.UNRESOLVED
        : API_ENDPOINTS.STOCK_ALERTS.BASE;
      const res = await api.get(url);
      setAlerts(res.data || []);
    } catch {
      if (showLoading) toast.error('Erreur lors du chargement des alertes');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCreateSupplyOrder = (alert) => {
    navigate('/admin/supplies/new', {
      state: {
        fromAlert:         true,
        alertId:           alert.alertId,
        productId:         alert.productId,
        productName:       alert.productName,
        productType:       alert.productType,
        currentStock:      alert.currentStock,
        alertThreshold:    alert.alertThreshold,
        requestedQuantity: alert.requestedQuantity,
        triggeredBy:       alert.triggeredBy,
      },
    });
  };

  if (loading) {
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
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Alertes de stock
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gerez les ruptures de stock en editant un bon de commande pour votre fournisseur
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadAlerts(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>
        </div>

        {/* Filtre */}
        <div className="flex gap-2">
          {[
            { key: 'UNRESOLVED', label: 'Non resolues', icon: AlertTriangle },
            { key: 'ALL',        label: 'Toutes',       icon: Filter       },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all
                ${filter === key
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Compteur */}
        {alerts.length > 0 && (
          <p className="text-sm text-gray-500">
            <span className="font-bold text-red-600">{alerts.filter(a => !a.resolved).length}</span> alerte{alerts.filter(a => !a.resolved).length > 1 ? 's' : ''} non resolue{alerts.filter(a => !a.resolved).length > 1 ? 's' : ''}
            {filter === 'ALL' && ` sur ${alerts.length} au total`}
          </p>
        )}

        {/* Liste */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
            <p className="font-bold text-gray-500">Aucune alerte{filter === 'UNRESOLVED' ? ' non resolue' : ''}</p>
            <p className="text-sm text-gray-400 mt-1">Les stocks sont sous controle.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.alertId}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
                  ${alert.resolved ? 'border-gray-100 opacity-60' : 'border-red-200'}`}
              >
                {/* Bandeau statut */}
                <div className={`flex items-center gap-2 px-5 py-2 text-xs font-bold
                  ${alert.resolved ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-700'}`}>
                  {alert.resolved
                    ? <><CheckCircle className="h-3.5 w-3.5" /> Resolu - stock reconstitue</>
                    : <><AlertTriangle className="h-3.5 w-3.5" /> Stock critique - bon de commande requis</>}
                  <span className="ml-auto">#{alert.alertId}</span>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Colonne 1 - Infos produit */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-start gap-4">
                      {/* Image ou icone produit */}
                      {alert.imageUrl ? (
                        <img
                          src={alert.imageUrl}
                          alt={alert.productName}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-7 w-7 text-gray-300" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900 text-lg">{alert.productName || `Produit #${alert.productId}`}</h3>
                          {alert.productType && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRODUCT_TYPE_COLOR[alert.productType] || 'bg-gray-100 text-gray-600'}`}>
                              {PRODUCT_TYPE_LABEL[alert.productType] || alert.productType}
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${TRIGGERED_BY_COLOR[alert.triggeredBy] || 'bg-gray-100 text-gray-600'}`}>
                            {TRIGGERED_BY_LABEL[alert.triggeredBy] || alert.triggeredBy || 'SYSTEM'}
                          </span>
                        </div>
                        {alert.productPrice != null && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />
                            Prix unitaire : <strong className="text-gray-800">{Number(alert.productPrice).toFixed(2)} €</strong>
                          </p>
                        )}
                        {alert.providerName && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                            <Truck className="h-3.5 w-3.5" />
                            Fournisseur : <strong className="text-gray-800">{alert.providerName}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Niveaux de stock */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                        <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">Stock actuel</p>
                        <p className={`text-2xl font-black ${(alert.currentStock ?? 0) <= 0 ? 'text-red-700' : 'text-red-600'}`}>
                          {alert.currentStock ?? '-'}
                        </p>
                        <p className="text-xs text-red-400">unites</p>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
                        <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider mb-1">Seuil alerte</p>
                        <p className="text-2xl font-black text-yellow-700">{alert.alertThreshold ?? '-'}</p>
                        <p className="text-xs text-yellow-500">minimum</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                        <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Besoin cuisinier</p>
                        <p className="text-2xl font-black text-orange-700">{alert.requestedQuantity ?? '-'}</p>
                        <p className="text-xs text-orange-400">demande</p>
                      </div>
                    </div>

                    {/* Barre de progression stock */}
                    {alert.alertThreshold != null && alert.currentStock != null && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Niveau de stock</span>
                          <span className="font-bold text-red-600">
                            {Math.max(0, Math.round((alert.currentStock / Math.max(alert.alertThreshold, 1)) * 100))}% du seuil
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, (alert.currentStock / Math.max(alert.alertThreshold, 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Message alerte */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" /> Message d'alerte
                      </p>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      {alert.triggeredBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Signale par : <strong className="text-gray-600">{alert.triggeredBy === 'SYSTEM' ? 'Systeme automatique' : alert.triggeredBy}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {fmtDate(alert.alertDate)}
                      </span>
                    </div>
                  </div>

                  {/* Colonne 2 - Action */}
                  <div className="flex flex-col justify-between gap-4">
                    {!alert.resolved ? (
                      <>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Comment resoudre</p>
                          <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                            <li>Editez un bon de commande ci-dessous</li>
                            <li>Envoyez-le au fournisseur</li>
                            <li>Le fournisseur livre les produits</li>
                            <li>L'alerte se resout automatiquement quand le stock atteint le niveau demande</li>
                          </ol>
                          {alert.requestedQuantity && (
                            <p className="text-xs font-bold text-blue-800 mt-3 bg-blue-100 rounded-lg px-3 py-2">
                              Quantite minimum a commander : <span className="text-blue-900">{alert.requestedQuantity} unites</span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCreateSupplyOrder(alert)}
                          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 text-sm"
                        >
                          <ShoppingCart className="h-5 w-5" />
                          Editer un bon de commande
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <p className="font-bold text-gray-600 text-sm">Alerte resolue</p>
                        <p className="text-xs text-gray-400">Le stock a ete reconstitue via livraison fournisseur.</p>
                      </div>
                    )}
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

export default StockAlertsPage;
