import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Truck, Package, Save, ArrowLeft, AlertTriangle, Info, TrendingDown } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminSupplyRequest = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { user }  = useAuth();

    // Donnees pre-remplies depuis l'alerte de stock (navigation state)
    const alertState = location.state || {};
    const fromAlert  = alertState.fromAlert === true;

    const [providers, setProviders] = useState([]);
    const [products,  setProducts]  = useState([]);
    const [loading,   setLoading]   = useState(true);

    const [formData, setFormData] = useState({
        providerId:    '',
        productId:     alertState.productId ? String(alertState.productId) : '',
        quantity:      alertState.requestedQuantity ? String(alertState.requestedQuantity) : '',
        unitCost:      '',   // prix d'achat fournisseur (inferieur au prix de vente)
        supplyDate:    new Date().toISOString().split('T')[0],
    });

    const minQuantity = alertState.requestedQuantity || 1;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [provRes, prodRes] = await Promise.all([
                    api.get(API_ENDPOINTS.PROVIDERS.BASE),
                    api.get(API_ENDPOINTS.PRODUCTS.BASE),
                ]);
                setProviders(provRes.data || []);
                setProducts(prodRes.data || []);
            } catch {
                toast.error('Erreur lors du chargement des donnees');
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

        const qty = parseInt(formData.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            toast.error('La quantite doit etre un nombre positif');
            return;
        }
        if (fromAlert && qty < minQuantity) {
            toast.error(`La quantite doit etre superieure ou egale a la demande du cuisinier (${minQuantity} unites)`);
            return;
        }

        try {
            const unitCost = formData.unitCost ? parseFloat(formData.unitCost) : null;
            const payload = {
                providerId:  parseInt(formData.providerId),
                productId:   parseInt(formData.productId),
                quantity:    qty,
                unitPrice:   unitCost,
                totalAmount: unitCost != null ? unitCost * qty : null,
                supplyDate:  formData.supplyDate,
                createdBy:   user.username,
            };
            await api.post('/providers/supplies', payload);
            toast.success('Bon de commande cree avec succes - le fournisseur va livrer les produits');
            // Retour vers les alertes si on venait d'une alerte, sinon le dashboard
            navigate(fromAlert ? '/admin/stock-alerts' : '/admin/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erreur lors de la creation du bon de commande');
        }
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

    const selectedProduct = products.find(p => String(p.productId) === String(formData.productId));

    return (
        <Layout>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <button
                    type="button"
                    onClick={() => navigate(fromAlert ? '/admin/stock-alerts' : '/admin/dashboard')}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-6 text-sm font-semibold"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {fromAlert ? 'Retour aux alertes de stock' : 'Retour au tableau de bord'}
                </button>

                {/* Bandeau alerte d'origine */}
                {fromAlert && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-800 text-sm">Bon de commande suite a une alerte de stock</p>
                            <p className="text-red-600 text-xs mt-0.5">
                                Produit : <strong>{alertState.productName}</strong>
                                {alertState.currentStock != null && ` - Stock actuel : ${alertState.currentStock} unites`}
                                {alertState.alertThreshold != null && ` - Seuil : ${alertState.alertThreshold}`}
                            </p>
                            {alertState.requestedQuantity && (
                                <p className="text-red-700 text-xs mt-1 font-semibold">
                                    Quantite minimum requise : {alertState.requestedQuantity} unites (demande du cuisinier)
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-100 p-3 rounded-xl">
                            <Truck className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900">Nouveau Bon de Commande</h1>
                            <p className="text-gray-500 text-sm">Commander du stock a un fournisseur</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Fournisseur */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                Fournisseur *
                            </label>
                            <select
                                value={formData.providerId}
                                onChange={(e) => setFormData(prev => ({ ...prev, providerId: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Selectionner un fournisseur</option>
                                {providers.map(p => (
                                    <option key={p.providerId} value={p.providerId}>
                                        {p.firstName} {p.lastName}
                                        {p.providerType ? ` (${p.providerType})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Produit */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                Produit *
                            </label>
                            <select
                                value={formData.productId}
                                onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Selectionner un produit</option>
                                {products.map(p => (
                                    <option key={p.productId} value={p.productId}>
                                        {p.productName} - Stock actuel : {p.quantityAvailable} - Seuil : {p.alertThreshold}
                                    </option>
                                ))}
                            </select>
                            {selectedProduct && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                    <Package className="h-3.5 w-3.5" />
                                    <span>Prix unitaire : <strong>{Number(selectedProduct.unitPrice).toFixed(2)} €</strong></span>
                                    <span className="text-gray-300">|</span>
                                    <span>Stock actuel : <strong className={selectedProduct.quantityAvailable <= selectedProduct.alertThreshold ? 'text-red-600' : 'text-gray-700'}>{selectedProduct.quantityAvailable}</strong></span>
                                </div>
                            )}
                        </div>

                        {/* Quantite */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                Quantite a commander *
                                {fromAlert && (
                                    <span className="ml-1 text-red-500 normal-case font-normal">(min. {minQuantity})</span>
                                )}
                            </label>
                            <input
                                type="number"
                                min={fromAlert ? minQuantity : 1}
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                                    ${fromAlert && parseInt(formData.quantity) < minQuantity
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-gray-200'}`}
                                required
                                placeholder={fromAlert ? `Minimum ${minQuantity}` : 'Quantite'}
                            />
                            {fromAlert && formData.quantity && parseInt(formData.quantity) < minQuantity && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    Doit etre {'>'}= {minQuantity} (demande cuisinier)
                                </p>
                            )}
                            {fromAlert && formData.quantity && parseInt(formData.quantity) >= minQuantity && (
                                <p className="text-xs text-green-600 mt-1">
                                    Quantite suffisante pour satisfaire la demande du cuisinier
                                </p>
                            )}
                        </div>

                        {/* Prix d'achat fournisseur + Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Prix d'achat unitaire (€)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.unitCost}
                                    onChange={(e) => setFormData(prev => ({ ...prev, unitCost: e.target.value }))}
                                    placeholder="0.00"
                                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                                        ${selectedProduct && formData.unitCost &&
                                          parseFloat(formData.unitCost) >= Number(selectedProduct.unitPrice)
                                            ? 'border-orange-300 bg-orange-50'
                                            : 'border-gray-200'}`}
                                />
                                {/* Avertissement si prix achat >= prix vente */}
                                {selectedProduct && formData.unitCost && parseFloat(formData.unitCost) > 0 && (
                                    parseFloat(formData.unitCost) >= Number(selectedProduct.unitPrice)
                                        ? (
                                            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                Prix d'achat superieur ou egal au prix de vente ({Number(selectedProduct.unitPrice).toFixed(2)} €) - aucune marge !
                                            </p>
                                        ) : (
                                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                <Info className="h-3 w-3" />
                                                Marge : +{(Number(selectedProduct.unitPrice) - parseFloat(formData.unitCost)).toFixed(2)} € / unite
                                            </p>
                                        )
                                )}
                                {selectedProduct && (
                                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" />
                                        Prix de vente restaurant : {Number(selectedProduct.unitPrice).toFixed(2)} €
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Date de commande *
                                </label>
                                <input
                                    type="date"
                                    value={formData.supplyDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, supplyDate: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Recapitulatif */}
                        {selectedProduct && formData.quantity && parseInt(formData.quantity) > 0 && (
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-2">
                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Recapitulatif</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-600">Produit</span>
                                    <span className="font-semibold text-blue-800">{selectedProduct.productName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-600">Quantite commandee</span>
                                    <span className="font-semibold text-blue-800">{parseInt(formData.quantity)} unites</span>
                                </div>
                                {formData.unitCost && parseFloat(formData.unitCost) > 0 ? (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-blue-600">Prix d'achat unitaire</span>
                                            <span className="font-semibold text-blue-800">{parseFloat(formData.unitCost).toFixed(2)} €</span>
                                        </div>
                                        <div className="border-t border-blue-200 pt-2 flex justify-between">
                                            <span className="font-bold text-blue-700">Cout total d'achat</span>
                                            <span className="font-black text-blue-900 text-lg">
                                                {(parseInt(formData.quantity) * parseFloat(formData.unitCost)).toFixed(2)} €
                                            </span>
                                        </div>
                                        {parseFloat(formData.unitCost) < Number(selectedProduct.unitPrice) && (
                                            <div className="flex justify-between text-xs text-green-600">
                                                <span>Marge totale estimee</span>
                                                <span className="font-bold">
                                                    +{(parseInt(formData.quantity) * (Number(selectedProduct.unitPrice) - parseFloat(formData.unitCost))).toFixed(2)} €
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Saisissez le prix d'achat fournisseur pour calculer le cout total</p>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex justify-center items-center gap-2 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-black shadow-lg shadow-blue-100"
                        >
                            <Save className="h-5 w-5" />
                            Valider le bon de commande
                        </button>
                    </form>
                </div>

                {/* Note explicative */}
                <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 flex items-start gap-2">
                        <Info className="h-4 w-4 flex-shrink-0 text-gray-400 mt-0.5" />
                        Une fois ce bon de commande valide, le fournisseur selectionne recevra la demande et effectuera la livraison.
                        L'alerte de stock se resoudra automatiquement lorsque le fournisseur aura livree la quantite commandee
                        et que le stock sera mis a jour.
                    </p>
                </div>
            </div>
        </Layout>
    );
};

export default AdminSupplyRequest;
