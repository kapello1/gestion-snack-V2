import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Plus, Edit, Trash2, Truck, Mail, Phone, MapPin, Clock, Tag } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuth } from '../../context/AuthContext';
import { wsManager } from '../../lib/wsManager';

const ProvidersPage = () => {
    const { user } = useAuth();
    const [providers, setProviders] = useState([]);
    const [filteredProviders, setFilteredProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        address: '',
        providerType: '',
        deliveryDelay: '',
    });

    useEffect(() => {
        loadProviders(true);
    }, []);

    useEffect(() => {
        return wsManager.onEvent(() => loadProviders(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        filterProviders();
    }, [searchTerm, providers]);

    const loadProviders = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const response = await api.get(API_ENDPOINTS.PROVIDERS.BASE);
            setProviders(response.data || []);
        } catch (error) {
            console.error('Erreur chargement fournisseurs:', error);
            if (showLoading) toast.error('Erreur lors du chargement des fournisseurs');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const filterProviders = () => {
        if (!searchTerm) {
            setFilteredProviders(providers);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = providers.filter(prov =>
            prov.firstName?.toLowerCase().includes(lowerTerm) ||
            prov.lastName?.toLowerCase().includes(lowerTerm) ||
            prov.username?.toLowerCase().includes(lowerTerm) ||
            prov.email?.toLowerCase().includes(lowerTerm)
        );
        setFilteredProviders(filtered);
    };

    const handleAdd = () => {
        setEditingProvider(null);
        setFormData({
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            phone: '',
            address: '',
            providerType: '',
            deliveryDelay: '',
        });
        setShowModal(true);
    };

    const handleEdit = (provider) => {
        setEditingProvider(provider);
        setFormData({
            firstName: provider.firstName || '',
            lastName: provider.lastName || '',
            username: provider.username || '',
            email: provider.email || '',
            phone: provider.phone || '',
            address: provider.address || '',
            providerType: provider.providerType || '',
            deliveryDelay: provider.deliveryDelay || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
        try {
            await api.delete(API_ENDPOINTS.PROVIDERS.BY_ID(id));
            toast.success('Fournisseur supprimé');
            loadProviders();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, createdBy: user.username, updatedBy: user.username };

            if (editingProvider) {
                await api.put(API_ENDPOINTS.PROVIDERS.BY_ID(editingProvider.providerId), payload);
                toast.success('Fournisseur mis à jour');
            } else {
                await api.post(API_ENDPOINTS.PROVIDERS.BASE, payload);
                toast.success('Fournisseur créé');
            }
            setShowModal(false);
            loadProviders();
        } catch (error) {
            const msg = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
            toast.error(msg);
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
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestion des Fournisseurs</h1>
                        <p className="text-gray-600 mt-2">Gérer les partenaires d'approvisionnement</p>
                    </div>
                    <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                        <Plus className="h-5 w-5" />
                        Ajouter un fournisseur
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher un fournisseur..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProviders.map((prov) => (
                        <div key={prov.providerId} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-t-4 border-purple-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-100 p-2 rounded-full">
                                        <Truck className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{prov.firstName} {prov.lastName}</h3>
                                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                            {prov.providerType || 'Général'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(prov)} className="text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(prov.providerId)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {prov.email}</div>
                                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {prov.phone || 'N/A'}</div>
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {prov.address || 'N/A'}</div>
                                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Délai: {prov.deliveryDelay || 'N/A'}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-4">{editingProvider ? 'Modifier' : 'Ajouter'} un fournisseur</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Prénom</label>
                                        <input type="text" required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nom</label>
                                        <input type="text" required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nom d'utilisateur</label>
                                        <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                                        <PhoneInput defaultCountry="BE" value={formData.phone} onChange={val => setFormData({ ...formData, phone: val })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <input type="text" value={formData.providerType} onChange={e => setFormData({ ...formData, providerType: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Ex: Boissons, Nourriture..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Délai de livraison</label>
                                        <input type="text" value={formData.deliveryDelay} onChange={e => setFormData({ ...formData, deliveryDelay: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Ex: 2 jours" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Adresse</label>
                                        <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows="2"></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
                                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Enregistrer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ProvidersPage;
