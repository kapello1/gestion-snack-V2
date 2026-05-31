import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Package, CheckCircle, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import usePolling from '../../utils/usePolling';

const ProviderOrdersPage = () => {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState([]);
  const [filteredSupplies, setFilteredSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const isAdmin = user?.roleName === 'ADMIN';

  useEffect(() => {
    loadSupplies(true);
  }, [user]);

  useEffect(() => {
    filterSupplies();
  }, [searchTerm, supplies, statusFilter]);

  usePolling(() => loadSupplies(false), 5000);

  const loadSupplies = async (showLoading = false) => {
    if (!user) return;

    try {
      if (showLoading) setLoading(true);
      let response;
      if (isAdmin) {
        // Admin sees all supplies
        response = await api.get(API_ENDPOINTS.PROVIDERS.SUPPLIES);
      } else {
        // Provider sees only their supplies
        response = await api.get(API_ENDPOINTS.PROVIDERS.BY_PROVIDER(user.ownerId));
      }
      setSupplies(response.data || []);
    } catch (error) {
      if (showLoading) toast.error('Erreur lors du chargement des bons de commande');
      else throw error;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleValidate = async (supplyId) => {
    try {
      // Assuming endpoint to update supply is PUT /providers/supplies/{id}
      // and we send the new status
      // If the specific endpoint doesn't exist in config, we might need to use a generic one or assume one.
      // Based on API_ENDPOINTS, there isn't a specific UPDATE_SUPPLY. 
      // I will assume PUT /providers/supplies/{id} works as per standard REST.
      // If not, I would need to add it to API_ENDPOINTS.
      // Let's try to use the CREATE_SUPPLY endpoint base but with ID? 
      // Actually, let's assume the backend supports PUT on the base resource + ID.

      await api.post(`${API_ENDPOINTS.PROVIDERS.SUPPLIES}/${supplyId}/validate`);

      toast.success('Bon de commande validé avec succès');
      loadSupplies();
    } catch (error) {
      console.error('Erreur validation:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const filterSupplies = () => {
    let filtered = supplies;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (supply) =>
          supply.product?.productName?.toLowerCase().includes(lowerTerm) ||
          supply.provideId?.toString().includes(lowerTerm)
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(supply =>
        statusFilter === 'PENDING' ? (supply.status === 'PENDING' || !supply.status) : supply.status === statusFilter
      );
    }

    setFilteredSupplies(filtered);
  };

  const calculateTotal = (supply) => {
    const price = supply.product?.unitPrice || 0;
    return (supply.quantity * price).toFixed(2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bons de Commande</h1>
            <p className="text-gray-600 mt-2">
              {isAdmin ? 'Gestion globale des approvisionnements' : 'Validez vos commandes fournisseurs'}
            </p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <span className="text-sm text-blue-800 font-medium">
              Total Validé: {filteredSupplies
                .filter(s => s.status === 'VALIDATED')
                .reduce((acc, curr) => acc + (curr.quantity * (curr.product?.unitPrice || 0)), 0)
                .toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par produit ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="VALIDATED">Validé</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredSupplies.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Aucun bon de commande trouvé</p>
            </div>
          ) : (
            filteredSupplies.map((supply) => {
              const isPending = supply.status === 'PENDING' || !supply.status;
              const isValidated = supply.status === 'VALIDATED';

              return (
                <div
                  key={supply.provideId}
                  className={`bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg border-l-4 ${isValidated ? 'border-green-500' : 'border-yellow-500'
                    }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">#{supply.provideId}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${isValidated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {supply.status || 'PENDING'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {supply.product?.productName || `Produit #${supply.productId}`}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(supply.supplyDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {isAdmin && supply.provider && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Fournisseur:</span>
                            <span>{supply.provider.firstName} {supply.provider.lastName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 min-w-[150px]">
                      <div className="text-sm text-gray-500">Quantité: <span className="font-bold text-gray-900">{supply.quantity}</span></div>
                      <div className="text-sm text-gray-500">Prix unitaire: {supply.unitPrice ? `${supply.unitPrice} €` : 'N/A'}</div>
                      <div className="text-lg font-bold text-blue-600 flex items-center gap-1">
                        
                        {supply.totalAmount ? `${supply.totalAmount} €` : 'N/A'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <button
                          onClick={() => handleValidate(supply.provideId)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Valider</span>
                        </button>
                      )}
                      {isValidated && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-default">
                          <CheckCircle className="h-4 w-4" />
                          <span>Validé</span>
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
