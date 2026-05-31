import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import usePolling from '../../utils/usePolling';

const StockAlertsPage = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAlerts(true);
    }, []);

    usePolling(() => loadAlerts(false), 5000);

    const loadAlerts = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const response = await api.get(API_ENDPOINTS.STOCK_ALERTS.UNRESOLVED);
            setAlerts(response.data || []);
        } catch (error) {
            if (showLoading) toast.error('Erreur lors du chargement des alertes');
            else throw error;
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        try {
            // Assuming PUT /stock-alerts/{id}/resolve
            await api.put(`${API_ENDPOINTS.STOCK_ALERTS.BASE}/${id}/resolve`);
            toast.success('Alerte résolue');
            loadAlerts();
        } catch (error) {
            // Fallback if specific endpoint doesn't exist, maybe update the alert object directly?
            // For now assuming standard REST pattern or what was implied.
            toast.error('Erreur lors de la résolution');
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
                        <h1 className="text-3xl font-bold text-gray-900">Alertes de Stock</h1>
                        <p className="text-gray-600 mt-2">Suivi des stocks faibles</p>
                    </div>
                    <button onClick={loadAlerts} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                        <RefreshCw className="h-5 w-5" />
                        Actualiser
                    </button>
                </div>

                <div className="space-y-4">
                    {alerts.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
                            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                            <p className="text-lg font-medium">Aucune alerte de stock !</p>
                            <p>Tout est sous contrôle.</p>
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div key={alert.alertId} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 flex justify-between items-center">
                                <div className="flex items-start gap-4">
                                    <div className="bg-red-100 p-3 rounded-full">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Produit ID: {alert.productId}</h3>
                                        <p className="text-gray-800 font-medium mt-1">{alert.message}</p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Détecté le: {new Date(alert.alertDate).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleResolve(alert.alertId)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Marquer comme résolu
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default StockAlertsPage;
