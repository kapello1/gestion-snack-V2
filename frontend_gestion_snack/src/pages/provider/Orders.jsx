import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Search, Package, CheckCircle, Calendar, Clock, Tag,
  ShoppingCart, TrendingUp, Image as ImageIcon, Info
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
      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="h-6 w-6 text-gray-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-100"
    />
  );
};

const ProviderOrdersPage = () => {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState([]);
  const [filteredSupplies, setFilteredSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [validating, setValidating] = useState(null);

  const isAdmin = user?.roleName === 'ADMIN';

  const loadSupplies = useCallback(async (showLoading = false) => {
    if (!user) return;
    try {
      if (showLoading) setLoading(true);
      const endpoint = isAdmin
        ? API_ENDPOINTS.PROVIDERS.SUPPLIES
        : API_ENDPOINTS.PROVIDERS.BY_PROVIDER(user.ownerId);
      const response = await api.get(endpoint);
      setSupplies(response.data || []);
    } catch {
      if (showLoading) toast.error('Erreur lors du chargement des bons de commande');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => { loadSupplies(true); }, [loadSupplies]);
  useEffect(() => wsManager.onEvent(() => loadSupplies(false)), [loadSupplies]);

  useEffect(() => {
    let result = supplies;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.productName || '').toLowerCase().includes(term) ||
        (s.providerName || '').toLowerCase().includes(term) ||
        String(s.provideId).includes(term)
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(s =>
        statusFilter === 'PENDING'
          ? (!s.status || s.status === 'PENDING')
          : s.status === statusFilter
      );
    }
    setFilteredSupplies(result);
  }, [searchTerm, supplies, statusFilter]);

  const handleValidate = async (supplyId) => {
    setValidating(supplyId);
    try {
      await api.post(API_ENDPOINTS.PROVIDERS.VALIDATE_SUPPLY(supplyId));
      toast.success('Bon de commande valide - stock mis a jour');
      await loadSupplies(false);
    } catch (err) {
      console.error('Erreur validation:', err);
      toast.error('Erreur lors de la validation');
    } finally {
      setValidating(null);
    }
  };

  const totalValidated = supplies
    .filter(s => s.status === 'VALIDATED')
    .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const pendingCount = supplies.filter(s => !s.status || s.status === 'PENDING').length;

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bons de Commande</h1>
            <p className="text-gray-500 mt-1">
              {isAdmin ? 'Gestion globale des approvisionnements' : 'Validez vos commandes fournisseurs'}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="text-xs text-yellow-600">En attente</p>
            </div>
            <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">{totalValidated.toFixed(2)} €</p>
              <p className="text-xs text-green-600">Total valide</p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher produit, fournisseur, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
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
        <div className="space-y-4">
          {filteredSupplies.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
              <Package className="h-14 w-14 mx-auto mb-4 text-gray-200" />
              <p className="text-gray-400 text-lg">Aucun bon de commande trouve</p>
            </div>
          ) : (
            filteredSupplies.map(supply => {
              const status = supply.status || 'PENDING';
              const isPending = status === 'PENDING';
              const margin = supply.unitSalePrice && supply.unitPrice
                ? supply.unitSalePrice - supply.unitPrice
                : null;

              return (
                <div
                  key={supply.provideId}
                  className={`bg-white rounded-xl shadow-sm border-l-4 p-5 transition-shadow hover:shadow-md ${status === 'VALIDATED' ? 'border-green-500' : 'border-yellow-400'}`}
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Image + infos produit */}
                    <div className="flex gap-4 flex-1">
                      <ProductImage src={supply.imageUrl} alt={supply.productName} />

                      <div className="flex-1 min-w-0">
                        {/* Badge statut + ID */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">#{supply.provideId}</span>
                          <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {STATUS_LABELS[status] || status}
                          </span>
                          {supply.productType && (
                            <span className="px-2 py-0.5 rounded border text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {supply.productType}
                            </span>
                          )}
                        </div>

                        {/* Nom produit */}
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {supply.productName || `Produit #${supply.productId}`}
                        </h3>

                        {/* Description */}
                        {supply.productDescription && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1 flex items-start gap-1">
                            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                            {supply.productDescription}
                          </p>
                        )}

                        {/* Fournisseur + date */}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                          {isAdmin && supply.providerName && (
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="h-3.5 w-3.5" />
                              {supply.providerName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {supply.supplyDate ? new Date(supply.supplyDate).toLocaleDateString('fr-FR') : '-'}
                          </span>
                          {supply.validatedAt && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Clock className="h-3.5 w-3.5" />
                              Valide le {new Date(supply.validatedAt).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>

                        {/* Stock actuel */}
                        {supply.currentStock != null && (
                          <p className="text-xs text-gray-400 mt-1">
                            Stock actuel: <strong className="text-gray-600">{supply.currentStock}</strong>
                            {supply.alertThreshold != null && ` / seuil alerte: ${supply.alertThreshold}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Colonne prix + action */}
                    <div className="flex flex-col items-end justify-between gap-3 min-w-[180px]">
                      <div className="text-right space-y-1">
                        <div className="text-sm text-gray-500">
                          Quantite: <span className="font-bold text-gray-900">{supply.quantity}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Prix achat: <span className="font-semibold text-gray-800">
                            {supply.unitPrice != null ? `${Number(supply.unitPrice).toFixed(2)} €` : 'N/A'}
                          </span>
                        </div>
                        {supply.unitSalePrice != null && (
                          <div className="text-sm text-gray-500">
                            Prix vente: <span className="font-semibold text-gray-700">
                              {Number(supply.unitSalePrice).toFixed(2)} €
                            </span>
                          </div>
                        )}
                        {margin != null && (
                          <div className={`text-xs flex items-center gap-1 justify-end ${margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            <TrendingUp className="h-3 w-3" />
                            Marge: {margin > 0 ? '+' : ''}{Number(margin).toFixed(2)} €/u
                          </div>
                        )}
                        <div className="text-xl font-bold text-blue-600 mt-1">
                          {supply.totalAmount != null ? `${Number(supply.totalAmount).toFixed(2)} €` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">Montant total</div>
                      </div>

                      {isPending ? (
                        <button
                          onClick={() => handleValidate(supply.provideId)}
                          disabled={validating === supply.provideId}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {validating === supply.provideId ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          {validating === supply.provideId ? 'Validation...' : 'Valider'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-green-600 rounded-lg border border-green-200 text-sm font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Valide
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

export default ProviderOrdersPage;
