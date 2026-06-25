import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Package, Truck, Search, Calendar, CheckCircle, Clock, BarChart2 } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { wsManager } from '../../lib/wsManager';

const STATUS_LABELS = { PENDING: 'En attente', VALIDATED: 'Validé', CANCELLED: 'Annulé' };
const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  VALIDATED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const ProviderSuppliesPage = () => {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadSupplies = async (showLoading = false) => {
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
  };

  useEffect(() => { loadSupplies(true); }, [user]);
  useEffect(() => wsManager.onEvent(() => loadSupplies(false)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = supplies.filter(s => {
    const matchSearch = !search ||
      s.product?.productName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' ? (!s.status || s.status === 'PENDING') : s.status === statusFilter);
    return matchSearch && matchStatus;
  });

  const totalValidated = supplies
    .filter(s => s.status === 'VALIDATED')
    .reduce((acc, s) => acc + (s.totalAmount || s.quantity * (s.product?.unitPrice || 0)), 0);

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
            <div className="p-2 bg-blue-50 rounded-lg"><Package className="h-6 w-6 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{supplies.length}</p>
              <p className="text-sm text-gray-500">Total livraisons</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Clock className="h-6 w-6 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-500">En attente</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><BarChart2 className="h-6 w-6 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalValidated.toFixed(2)} €</p>
              <p className="text-sm text-gray-500">Montant validé</p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
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
            <option value="VALIDATED">Validé</option>
          </select>
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun approvisionnement trouvé</p>
            </div>
          ) : (
            filtered.map(s => {
              const status = s.status || 'PENDING';
              const amount = s.totalAmount ?? (s.quantity * (s.product?.unitPrice || s.unitPrice || 0));
              return (
                <div key={s.provideId} className={`bg-white rounded-xl border-l-4 shadow-sm p-5 ${status === 'VALIDATED' ? 'border-green-500' : status === 'CANCELLED' ? 'border-red-400' : 'border-yellow-400'}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">#{s.provideId}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[status] || status}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {s.product?.productName || `Produit #${s.productId}`}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {s.supplyDate ? new Date(s.supplyDate).toLocaleDateString('fr-FR') : '-'}
                        </span>
                        <span>Qté: <strong className="text-gray-900">{s.quantity}</strong></span>
                        {s.unitPrice && <span>PU: <strong className="text-gray-900">{s.unitPrice} €</strong></span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">{amount ? `${Number(amount).toFixed(2)} €` : 'N/A'}</p>
                        <p className="text-xs text-gray-400">Montant total</p>
                      </div>
                      {status === 'VALIDATED' && (
                        <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
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
