import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Clock, Users, CheckCircle, XCircle, AlertCircle, RefreshCw, User, Phone, Mail, Hash } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/layout/Layout';

const TableManagement = () => {
    const queryClient = useQueryClient();
    const [now, setNow] = useState(new Date());

    // Compteur de secondes pour le chrono (ne touche pas à la base de données)
    useState(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    });

    const MAX_OCCUPANCY_TIME_MS = 2.5 * 60 * 60 * 1000;

    // React Query remplace le setInterval de polling
    // WebSocket invalide ['tables'] → refetch automatique sans polling
    const { data: tables = [], isLoading: tablesLoading } = useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const res = await api.get(API_ENDPOINTS.TABLES.BASE);
            return res.data || [];
        },
        staleTime: Infinity,
    });

    const { data: activeOrders = [] } = useQuery({
        queryKey: ['orders', 'active'],
        queryFn: async () => {
            const res = await api.get(API_ENDPOINTS.ORDERS.BY_STATUS('ACTIVE')).catch(() => ({ data: [] }));
            return res.data || [];
        },
        staleTime: Infinity,
    });

    // Map tableId → commande active
    const ordersByTable = activeOrders.reduce((map, order) => {
        if (order.tableId) map[order.tableId] = order;
        return map;
    }, {});

    const lastUpdated = new Date();

    const handleReleaseTable = async (tableId) => {
        try {
            await api.post(API_ENDPOINTS.TABLES.RELEASE(tableId));
            toast.success('Table libérée avec succès');
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Impossible de libérer la table');
        }
    };

    const handleStatusChange = async (tableId, newStatus) => {
        if (newStatus === 'FREE') {
            return handleReleaseTable(tableId);
        }
        try {
            await api.put(API_ENDPOINTS.TABLES.UPDATE_STATUS(tableId), null, {
                params: { status: newStatus }
            });
            toast.success(`Statut de la table mis à jour: ${newStatus}`);
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        } catch {
            toast.error('Erreur lors de la mise à jour du statut');
        }
    };

    const handleManualRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
    };

    const getRemainingTime = (updatedAt) => {
        if (!updatedAt) return null;
        const start = new Date(updatedAt).getTime();
        const elapsed = now.getTime() - start;
        const remaining = MAX_OCCUPANCY_TIME_MS - elapsed;
        return remaining > 0 ? remaining : 0;
    };

    const formatTime = (ms) => {
        if (ms === null) return '--:--';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'FREE': return 'bg-green-100 border-green-500 text-green-800';
            case 'OCCUPIED': return 'bg-red-100 border-red-500 text-red-800';
            case 'RESERVED': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
            default: return 'bg-gray-100 border-gray-500 text-gray-800';
        }
    };

    if (tablesLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Gestion des Tables</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                            Mis à jour: {lastUpdated.toLocaleTimeString()}
                        </span>
                        <button
                            onClick={handleManualRefresh}
                            className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                            title="Forcer le rafraîchissement"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tables.map((table) => {
                        const isOccupied = table.status === 'OCCUPIED';
                        const remainingTime = isOccupied ? getRemainingTime(table.updatedAt) : null;
                        const isOvertime = remainingTime === 0;

                        const activeOrder = ordersByTable[table.tableId];
                        const customer = activeOrder?.customer || activeOrder?.customerInfo || null;
                        const custName = customer?.fullName || customer?.username || activeOrder?.customerName || null;
                        const custPhone = customer?.phone || activeOrder?.customerPhone || null;
                        const custEmail = customer?.email || activeOrder?.customerEmail || null;
                        const custId = activeOrder?.customerId || customer?.customerId || null;

                        return (
                            <div
                                key={table.tableId}
                                className={`border-l-4 rounded-lg shadow-md p-4 transition-all hover:shadow-lg ${getStatusColor(table.status)} bg-white`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="bg-gray-200 p-2 rounded-full">
                                            <span className="text-xl font-bold text-gray-700">#{table.tableNumber}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold opacity-75">Capacité</p>
                                            <div className="flex items-center text-gray-700">
                                                <Users className="h-4 w-4 mr-1" />
                                                <span>{table.capacity} pers.</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${table.status === 'FREE' ? 'bg-green-200 text-green-800' :
                                        table.status === 'OCCUPIED' ? 'bg-red-200 text-red-800' :
                                            'bg-yellow-200 text-yellow-800'
                                        }`}>
                                        {table.status}
                                    </div>
                                </div>

                                {isOccupied && (custName || custId) && (
                                    <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200 text-sm">
                                        <div className="flex items-center gap-1 font-semibold text-blue-800 mb-1.5">
                                            <User className="h-3.5 w-3.5" />
                                            Client
                                        </div>
                                        {custName && (
                                            <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                                                <User className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                                {custName}
                                            </div>
                                        )}
                                        {activeOrder?.guestCount > 0 && (
                                            <div className="flex items-center gap-1.5 text-gray-700 font-semibold mt-0.5">
                                                <Users className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                                {activeOrder.guestCount} couvert{activeOrder.guestCount > 1 ? 's' : ''}
                                            </div>
                                        )}
                                        {custPhone && (
                                            <div className="flex items-center gap-1.5 text-gray-600 text-xs mt-0.5">
                                                <Phone className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                                {custPhone}
                                            </div>
                                        )}
                                        {custEmail && (
                                            <div className="flex items-center gap-1.5 text-gray-600 text-xs mt-0.5">
                                                <Mail className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                                {custEmail}
                                            </div>
                                        )}
                                        {custId && !custName && (
                                            <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                                                <Hash className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                                Client #{custId}
                                            </div>
                                        )}
                                        {activeOrder?.orderId && (
                                            <div className="text-xs text-blue-600 mt-1 font-medium">
                                                Commande #{activeOrder.orderId}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isOccupied && (
                                    <div className={`mb-4 p-3 rounded-md ${isOvertime ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-gray-500">Temps restant</span>
                                            <Clock className={`h-4 w-4 ${isOvertime ? 'text-red-600 animate-pulse' : 'text-blue-500'}`} />
                                        </div>
                                        <p className={`text-xl font-mono font-bold ${isOvertime ? 'text-red-600' : 'text-gray-800'}`}>
                                            {formatTime(remainingTime)}
                                        </p>
                                        {isOvertime && (
                                            <p className="text-xs text-red-500 mt-1 font-semibold">Temps écoulé !</p>
                                        )}
                                    </div>
                                )}

                                {table.status === 'RESERVED' && table.reservedForCustomerName && (
                                    <div className="mb-4 p-3 bg-yellow-50 rounded-md border border-yellow-200 text-sm">
                                        <div className="flex items-center gap-1 font-semibold text-yellow-800 mb-1">
                                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                            Réservation
                                        </div>
                                        <div className="text-gray-700 font-medium">{table.reservedForCustomerName}</div>
                                        <div className="text-gray-500 text-xs">ID: {table.reservedForCustomerId}</div>
                                        <div className="text-gray-700 mt-1 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(table.activeReservationDate).toLocaleString()}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <button
                                        onClick={() => handleStatusChange(table.tableId, 'FREE')}
                                        disabled={table.status === 'FREE'}
                                        className={`flex flex-col items-center justify-center p-2 rounded transition-colors ${table.status === 'FREE'
                                            ? 'bg-green-600 text-white cursor-default'
                                            : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                                            }`}
                                    >
                                        <CheckCircle className="h-5 w-5 mb-1" />
                                        <span className="text-xs">Libérer</span>
                                    </button>

                                    <button
                                        onClick={() => handleStatusChange(table.tableId, 'OCCUPIED')}
                                        disabled={table.status === 'OCCUPIED'}
                                        className={`flex flex-col items-center justify-center p-2 rounded transition-colors ${table.status === 'OCCUPIED'
                                            ? 'bg-red-600 text-white cursor-default'
                                            : 'bg-white border border-red-600 text-red-600 hover:bg-red-50'
                                            }`}
                                    >
                                        <XCircle className="h-5 w-5 mb-1" />
                                        <span className="text-xs">Occuper</span>
                                    </button>

                                    <button
                                        onClick={() => handleStatusChange(table.tableId, 'RESERVED')}
                                        disabled={table.status === 'RESERVED'}
                                        className={`flex flex-col items-center justify-center p-2 rounded transition-colors ${table.status === 'RESERVED'
                                            ? 'bg-yellow-500 text-white cursor-default'
                                            : 'bg-white border border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                                            }`}
                                    >
                                        <AlertCircle className="h-5 w-5 mb-1" />
                                        <span className="text-xs">Réserver</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
};

export default TableManagement;
