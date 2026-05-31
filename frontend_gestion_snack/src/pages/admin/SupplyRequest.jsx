import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Truck, Package, Save, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminSupplyRequest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [providers, setProviders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        providerId: '',
        productId: '',
        quantity: '',
        supplyDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [provRes, prodRes] = await Promise.all([
                    api.get(API_ENDPOINTS.PROVIDERS.BASE),
                    api.get(API_ENDPOINTS.PRODUCTS.BASE)
                ]);
                setProviders(provRes.data || []);
                setProducts(prodRes.data || []);
            } catch (error) {
                console.error('Erreur chargement données:', error);
                toast.error('Erreur lors du chargement des données');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.providerId || !formData.productId || !formData.quantity) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            const payload = {
                providerId: parseInt(formData.providerId),
                productId: parseInt(formData.productId),
                quantity: parseInt(formData.quantity),
                supplyDate: formData.supplyDate,
                createdBy: user.username
            };

            await api.post('/providers/supplies', payload);
            toast.success('Bon de commande créé avec succès');
            navigate('/admin/dashboard');
        } catch (error) {
            console.error('Erreur création commande:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de la création de la commande');
        }
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
            <div className="max-w-2xl mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Retour au tableau de bord
                </button>

                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-purple-100 p-3 rounded-full">
                            <Truck className="h-8 w-8 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Nouveau Bon de Commande</h1>
                            <p className="text-gray-600">Commander du stock à un fournisseur</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fournisseur
                            </label>
                            <select
                                value={formData.providerId}
                                onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                                className="block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-purple-500 focus:border-purple-500"
                                required
                            >
                                <option value="">Sélectionner un fournisseur</option>
                                {providers.map(p => (
                                    <option key={p.providerId} value={p.providerId}>
                                        {p.firstName} {p.lastName} ({p.providerType || 'Général'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Produit
                            </label>
                            <select
                                value={formData.productId}
                                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                className="block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-purple-500 focus:border-purple-500"
                                required
                            >
                                <option value="">Sélectionner un produit</option>
                                {products.map(p => (
                                    <option key={p.productId} value={p.productId}>
                                        {p.productName} (Stock actuel: {p.quantityAvailable})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantité
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date de commande
                                </label>
                                <input
                                    type="date"
                                    value={formData.supplyDate}
                                    onChange={(e) => setFormData({ ...formData, supplyDate: e.target.value })}
                                    className="block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
                            >
                                <Save className="h-5 w-5" />
                                Valider la commande
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default AdminSupplyRequest;
