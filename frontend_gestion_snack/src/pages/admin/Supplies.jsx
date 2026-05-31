import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Truck, Search, Calendar, Package, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminSupplies = () => {
    const navigate = useNavigate();
    const [supplies, setSupplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSupplies();
    }, []);

    const fetchSupplies = async () => {
        try {
            const response = await api.get('/providers/supplies');
            setSupplies(response.data || []);
        } catch (error) {
            console.error('Erreur chargement approvisionnements:', error);
            toast.error('Erreur lors du chargement des approvisionnements');
        } finally {
            setLoading(false);
        }
    };

    const handleValidateSupply = async (id) => {
        try {
            await api.post(`/providers/supplies/${id}/validate`);
            toast.success('Réception confirmée et stock mis à jour');
            fetchSupplies();
        } catch (error) {
            console.error('Erreur validation:', error);
            const msg = error.response?.data?.message || 'Erreur lors de la validation';
            toast.error(msg);
        }
    };

    const filteredSupplies = supplies.filter(supply =>
        supply.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supply.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supply.createdBy?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="h-6 w-6 text-gray-600" />
                        </button>
                        <div className="bg-purple-100 p-3 rounded-full">
                            <Truck className="h-8 w-8 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Approvisionnements</h1>
                            <p className="text-gray-600">Historique des commandes aux fournisseurs</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/admin/supplies/new')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <Package className="h-5 w-5" />
                        Nouvelle Commande
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par fournisseur, produit..."
                                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créé par</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSupplies.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                            Aucun approvisionnement trouvé
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSupplies.map((supply) => (
                                        <tr key={supply.provideId} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {new Date(supply.supplyDate).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {supply.providerName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {supply.productName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                {supply.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${supply.status === 'VALIDATED' || supply.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                                                        supply.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                    {supply.status === 'VALIDATED' || supply.status === 'RECEIVED' ? 'Reçu' :
                                                        supply.status === 'PENDING' ? 'En attente' : supply.status || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {supply.createdBy}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {supply.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Confirmer la réception de cette commande ? Le stock sera mis à jour.')) {
                                                                handleValidateSupply(supply.provideId);
                                                            }
                                                        }}
                                                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                                        title="Confirmer la réception"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                        <span className="font-medium">Confirmer</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminSupplies;
