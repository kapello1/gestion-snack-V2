import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Package, Truck, Search, Calendar, CheckCircle, Clock,
  BarChart2, Tag, Info, Image as ImageIcon
} from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { wsManager } from '../../lib/wsManager';

const STATUS_LABELS = { PENDING: 'En attente', VALIDATED: 'Valide' };
const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  VALIDATED: 'bg-green-100 text-green-800 border-green-200',
};

const ProductImage = ({ src, alt }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="h-5 w-5 text-gray-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-gray-100"
    />
  );
};

const ProviderSuppliesPage = () => {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadSupplies = useCallback(async (showLoading = false) => {
    if (!user) return;
    try {
      if (showLoading) setLoading(true);
      const res = await api.get(API_ENDPOINTS.PROVIDERS.BY_PROVIDER(user.ownerId));
      setSupplies(res.data || []);
    } catch {
      if (showLoading) toast.error('Erreur lors du chargement des approvisionnements');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadSupplies(true); }, [loadSupplies]);
  useEffect(() => wsManager.onEvent(() => loadSupplies(false)), [loadSupplies]);

  const filtered = supplies.filter(s => {
    const matchSearch = !search ||
      (s.productName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.productType || '').toLowerCase().includes(search.toLowerCase());
    const status = s.status || 'PENDING';
    const matchStatus = statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' ? status === 'PENDING' : status === statusFilter);
    return matchSearch && matchStatus;
  });

  const getAmount = (s) => {
    if (s.totalAmount != null) return Number(s.totalAmount);
    const unitCost = s.unitPrice != null ? Number(s.unitPrice)
      : s.purchasePrice != null ? Number(s.purchasePrice) : 0;
    return unitCost * (s.quantity || 0);
  };

  const totalValidated = supplies
    .filter(s => s.status === 'VALIDATED')
    .reduce((acc, s) => acc + getAmount(s), 0);

  const pendingCount = supplies.filter(s => !s.status || s.status === 'PENDING').length;

  if (loading) return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-600" />
            Mes Approvisionnements
          </h1>
          <p className="text-gray-500 mt-1">Historique et suivi de vos bons de livraison</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{supplies.length}</p>
              <p className="text-sm text-gray-500">Total livraisons</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-500">En attente</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <BarChart2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalValidated.toFixed(2)} €</p>
              <p className="text-sm text-gray-500">Montant valide</p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit ou type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="VALIDATED">Valide</option>
          </select>
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Aucun approvisionnement trouve</p>
            </div>
          ) : (
            filtered.map(s => {
              const status = s.status || 'PENDING';
              // Prix d'achat : unitPrice du bon de commande, sinon prix achat du produit
              const displayPrice = s.unitPrice != null ? Number(s.unitPrice)
                : s.purchasePrice != null ? Number(s.purchasePrice) : null;
              const displayTotal = s.totalAmount != null ? Number(s.totalAmount)
                : displayPrice != null ? displayPrice * (s.quantity || 0) : null;

              return (
                <div
                  key={s.provideId}
                  className={`bg-white rounded-xl shadow-sm border-l-4 p-5 transition-shadow hover:shadow-md ${status === 'VALIDATED' ? 'border-green-500' : 'border-yellow-400'}`}
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Image + infos produit */}
                    <div className="flex gap-4 flex-1">
                      <ProductImage src={s.imageUrl} alt={s.productName} />

                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">#{s.provideId}</span>
                          <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {STATUS_LABELS[status] || status}
                          </span>
                          {s.productType && (
                            <span className="px-2 py-0.5 rounded border text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {s.productType}
                            </span>
                          )}
                        </div>

                        {/* Nom produit */}
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {s.productName || `Produit #${s.productId}`}
                        </h3>

                        {/* Description */}
                        {s.productDescription && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1 flex items-start gap-1">
                            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                            {s.productDescription}
                          </p>
                        )}

                        {/* Date + validation */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {s.supplyDate ? new Date(s.supplyDate).toLocaleDateString('fr-FR') : '-'}
                          </span>
                          {s.validatedAt && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Clock className="h-3.5 w-3.5" />
                              Valide le {new Date(s.validatedAt).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>

                        {/* Stock actuel */}
                        {s.currentStock != null && (
                          <p className="text-xs text-gray-400 mt-1">
                            Stock actuel: <strong className="text-gray-600">{s.currentStock}</strong>
                            {s.alertThreshold != null && ` / seuil: ${s.alertThreshold}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Colonne prix */}
                    <div className="flex flex-col items-end gap-1 min-w-[160px] justify-center">
                      <div className="text-sm text-gray-500">
                        Qte: <span className="font-bold text-gray-900">{s.quantity}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Prix unitaire: <span className="font-semibold text-gray-800">
                          {displayPrice != null ? `${displayPrice.toFixed(2)} €` : '-'}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-blue-600 mt-1">
                        {displayTotal != null ? `${displayTotal.toFixed(2)} €` : '-'}
                      </div>
                      <div className="text-xs text-gray-400">Montant total</div>

                      {status === 'VALIDATED' && (
                        <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span>Valide</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProviderSuppliesPage;
