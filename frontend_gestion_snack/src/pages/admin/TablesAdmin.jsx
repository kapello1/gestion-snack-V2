import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Plus, Edit, Trash2, Utensils, Users, User, Phone, Mail, Hash, LogOut } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { LABELS, TABLE_STATUS } from '../../utils/constants';
import { wsManager } from '../../lib/wsManager';

const TablesAdminPage = () => {
    const { user } = useAuth();
    const [tables, setTables] = useState([]);
    const [ordersByTable, setOrdersByTable] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);

    const [formData, setFormData] = useState({
        tableNumber: '',
        capacity: '',
        status: 'FREE',
    });

    useEffect(() => {
        loadTables(true);
    }, []);

    // Rafraîchissement instantané et silencieux sur tout événement WebSocket
    useEffect(() => {
        return wsManager.onEvent(() => loadTables(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadTables = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [tablesRes, ordersRes] = await Promise.all([
                api.get(API_ENDPOINTS.TABLES.BASE),
                api.get(API_ENDPOINTS.ORDERS.BY_STATUS('ACTIVE')).catch(() => ({ data: [] })),
            ]);
            setTables(tablesRes.data || []);
            const map = {};
            (ordersRes.data || []).forEach(order => {
                if (order.tableId) map[order.tableId] = order;
            });
            setOrdersByTable(map);
        } catch (error) {
            if (showLoading) toast.error('Erreur lors du chargement des tables');
            else throw error;
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingTable(null);
        setFormData({
            tableNumber: '',
            capacity: '',
            status: 'FREE',
        });
        setShowModal(true);
    };

    const handleEdit = (table) => {
        setEditingTable(table);
        setFormData({
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            status: table.status,
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette table ?')) return;
        try {
            await api.delete(API_ENDPOINTS.TABLES.BY_ID(id));
            toast.success('Table supprimée');
            loadTables();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleRelease = async (tableId) => {
        try {
            await api.post(API_ENDPOINTS.TABLES.RELEASE(tableId));
            toast.success('Table libérée avec succès');
            loadTables();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Impossible de libérer la table');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                tableNumber: parseInt(formData.tableNumber),
                capacity: parseInt(formData.capacity),
                createdBy: user.username,
                updatedBy: user.username
            };

            if (editingTable) {
                await api.put(API_ENDPOINTS.TABLES.BY_ID(editingTable.tableId), payload);
                toast.success('Table mise à jour');
            } else {
                await api.post(API_ENDPOINTS.TABLES.BASE, payload);
                toast.success('Table créée');
            }
            setShowModal(false);
            loadTables();
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
                        <h1 className="text-3xl font-bold text-gray-900">Gestion des Tables</h1>
                        <p className="text-gray-600 mt-2">Configurer la salle</p>
                    </div>
                    <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors">
                        <Plus className="h-5 w-5" />
                        Ajouter une table
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {tables.sort((a, b) => a.tableNumber - b.tableNumber).map((table) => {
                        const activeOrder = ordersByTable[table.tableId];
                        const customer = activeOrder?.customer || activeOrder?.customerInfo || null;
                        const custName = customer?.fullName || customer?.username || activeOrder?.customerName || null;
                        const custPhone = customer?.phone || activeOrder?.customerPhone || null;
                        const custEmail = customer?.email || activeOrder?.customerEmail || null;
                        const custId = activeOrder?.customerId || customer?.customerId || null;
                        return (
                        <div key={table.tableId} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-t-4 border-yellow-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-100 p-2 rounded-full">
                                        <Utensils className="h-6 w-6 text-yellow-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Table #{table.tableNumber}</h3>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${table.status === 'FREE' ? 'bg-green-100 text-green-800' :
                                            table.status === 'OCCUPIED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {LABELS.TABLE_STATUS[table.status] || table.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {(table.status === 'OCCUPIED' || table.status === 'RESERVED') && (
                                        <button
                                            onClick={() => handleRelease(table.tableId)}
                                            title="Libérer la table"
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <LogOut className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button onClick={() => handleEdit(table)} className="text-yellow-600 hover:text-yellow-800"><Edit className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(table.tableId)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-600 mt-2">
                                <Users className="h-5 w-5" />
                                <span className="font-medium">Capacité: {table.capacity} personnes</span>
                            </div>
                            {table.occupiedSeats !== undefined && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Occupation:</span>
                                        <span className={`font-bold ${table.occupiedSeats >= table.capacity ? 'text-red-600' : 'text-green-600'}`}>
                                            {table.occupiedSeats} / {table.capacity}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full ${table.occupiedSeats >= table.capacity ? 'bg-red-600' : 'bg-green-600'}`}
                                            style={{ width: `${Math.min((table.occupiedSeats / table.capacity) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Customer info for OCCUPIED tables */}
                            {table.status === 'OCCUPIED' && (custName || custId) && (
                                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                                    <div className="font-semibold text-blue-800 mb-1 flex items-center gap-1">
                                        <User className="h-3.5 w-3.5" /> Client occupant
                                    </div>
                                    {custName && <div className="flex items-center gap-1 text-gray-700"><User className="h-3 w-3 text-blue-400" />{custName}</div>}
                                    {activeOrder?.guestCount > 0 && (
                                        <div className="flex items-center gap-1 text-gray-700 font-semibold mt-0.5">
                                            <Users className="h-3 w-3 text-blue-400" />
                                            {activeOrder.guestCount} couvert{activeOrder.guestCount > 1 ? 's' : ''}
                                        </div>
                                    )}
                                    {custPhone && <div className="flex items-center gap-1 text-gray-700"><Phone className="h-3 w-3 text-blue-400" />{custPhone}</div>}
                                    {custEmail && <div className="flex items-center gap-1 text-gray-700 break-all"><Mail className="h-3 w-3 text-blue-400" />{custEmail}</div>}
                                    {custId && !custName && <div className="flex items-center gap-1 text-gray-600"><Hash className="h-3 w-3 text-blue-400" />Client #{custId}</div>}
                                    {activeOrder?.orderId && <div className="text-blue-600 font-medium mt-1 text-xs">Commande #{activeOrder.orderId}</div>}
                                </div>
                            )}

                            {table.status === 'RESERVED' && table.reservedForCustomerName && (
                                <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200 text-sm space-y-0.5">
                                    <div className="font-semibold text-yellow-800 mb-1">📅 Réservation</div>
                                    <div className="flex items-center gap-1 text-gray-700">
                                        <User className="h-3 w-3 text-yellow-500" />
                                        {table.reservedForCustomerName}
                                    </div>
                                    {table.reservedForCustomerPhone && (
                                        <div className="flex items-center gap-1 text-gray-700">
                                            <Phone className="h-3 w-3 text-yellow-500" />
                                            {table.reservedForCustomerPhone}
                                        </div>
                                    )}
                                    {table.reservationPlaces > 0 && (
                                        <div className="flex items-center gap-1 text-gray-700 font-semibold">
                                            <Users className="h-3 w-3 text-yellow-500" />
                                            {table.reservationPlaces} personne{table.reservationPlaces > 1 ? 's' : ''}
                                        </div>
                                    )}
                                    {table.activeReservationDate && (
                                        <div className="text-gray-500 text-xs">
                                            🕐 {new Date(table.activeReservationDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold mb-4">{editingTable ? 'Modifier' : 'Ajouter'} une table</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Numéro de table</label>
                                    <input type="number" required min="1" value={formData.tableNumber} onChange={e => setFormData({ ...formData, tableNumber: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Capacité</label>
                                    <input type="number" required min="1" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Statut initial</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                        {Object.entries(LABELS.TABLE_STATUS).map(([key, val]) => (
                                            <option key={key} value={key}>{val}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-4 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
                                    <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">Enregistrer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TablesAdminPage;
