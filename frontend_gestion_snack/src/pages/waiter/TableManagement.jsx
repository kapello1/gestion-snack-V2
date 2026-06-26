import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Clock, Users, CheckCircle, XCircle, AlertCircle, RefreshCw, User, Phone, Mail, Hash, Calendar, X, Search } from 'lucide-react';
import api from '../../utils/api';
import { wsManager } from '../../lib/wsManager';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/layout/Layout';

const TableManagement = () => {
    const queryClient = useQueryClient();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        return wsManager.onEvent(() => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['reservations', 'today'] });
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Réservations du jour (BOOKED uniquement)
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayReservations = [] } = useQuery({
        queryKey: ['reservations', 'today'],
        queryFn: async () => {
            const res = await api.get(API_ENDPOINTS.RESERVATIONS.BY_DATE(todayStr)).catch(() => ({ data: [] }));
            return (res.data || []).filter(r => r.status === 'BOOKED');
        },
        staleTime: Infinity,
    });

    // Map tableId → réservation la plus pertinente (en cours > prochaine)
    const reservationByTable = todayReservations.reduce((map, r) => {
        const existing = map[r.tableId];
        if (!existing) { map[r.tableId] = r; return map; }
        const nowMs = Date.now();
        const fromMs = new Date(r.datetimeFrom).getTime();
        const existFromMs = new Date(existing.datetimeFrom).getTime();
        const isCurrent = fromMs <= nowMs && new Date(r.datetimeTo).getTime() > nowMs;
        const existIsCurrent = existFromMs <= nowMs && new Date(existing.datetimeTo).getTime() > nowMs;
        if (isCurrent && !existIsCurrent) { map[r.tableId] = r; return map; }
        if (!isCurrent && existIsCurrent) return map;
        if (fromMs < existFromMs) map[r.tableId] = r;
        return map;
    }, {});

    const fmtSlot = (from, to) => {
        const fmt = dt => new Date(dt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
        return `${fmt(from)} → ${fmt(to)}`;
    };

    const lastUpdated = new Date();

    // ── Modal réservation ───────────────────────────────────────────────────
    const [reservationModal, setReservationModal] = useState({ open: false, tableId: null, tableNumber: null, capacity: null });
    const [resForm, setResForm] = useState({ date: '', timeFrom: '', places: 2 });
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [resLoading, setResLoading] = useState(false);
    const searchTimerRef = useRef(null);

    const openReservationModal = (table) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(Math.ceil(now.getMinutes() / 30) * 30 % 60).padStart(2, '0');
        const roundedHH = now.getMinutes() > 30 ? String(now.getHours() + 1).padStart(2, '0') : hh;
        setResForm({ date: dateStr, timeFrom: `${roundedHH}:${mm}`, places: 2 });
        setCustomerSearch('');
        setCustomerResults([]);
        setSelectedCustomer(null);
        setReservationModal({ open: true, tableId: table.tableId, tableNumber: table.tableNumber, capacity: table.capacity });
    };

    const closeReservationModal = () => {
        setReservationModal({ open: false, tableId: null, tableNumber: null, capacity: null });
        setCustomerSearch('');
        setCustomerResults([]);
        setSelectedCustomer(null);
    };

    const customerFullName = (c) => `${c.firstName || ''} ${c.lastName || ''}`.trim();

    const searchCustomers = async (term) => {
        if (!term || term.length < 2) { setCustomerResults([]); return; }
        try {
            const res = await api.get(API_ENDPOINTS.CUSTOMERS.BASE);
            const all = res.data || [];
            const low = term.toLowerCase();
            setCustomerResults(
                all.filter(c => customerFullName(c).toLowerCase().includes(low)).slice(0, 8)
            );
        } catch { setCustomerResults([]); }
    };

    const handleCustomerSearchChange = (val) => {
        setCustomerSearch(val);
        setSelectedCustomer(null);
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => searchCustomers(val), 350);
    };

    const handleSubmitReservation = async () => {
        if (!selectedCustomer) { toast.error('Sélectionnez un client'); return; }
        if (!resForm.date || !resForm.timeFrom) { toast.error('Date et heure requises'); return; }
        if (!resForm.places || resForm.places < 1) { toast.error('Nombre de personnes requis'); return; }
        if (reservationModal.capacity && resForm.places > reservationModal.capacity) {
            toast.error(`Capacité max de cette table : ${reservationModal.capacity} pers.`); return;
        }
        const datetimeFrom = new Date(`${resForm.date}T${resForm.timeFrom}:00`);
        const datetimeTo   = new Date(datetimeFrom.getTime() + 90 * 60 * 1000);
        setResLoading(true);
        try {
            await api.post(API_ENDPOINTS.RESERVATIONS.BASE, {
                customerId: selectedCustomer.customerId,
                tableId: reservationModal.tableId,
                datetimeFrom: datetimeFrom.toISOString().slice(0, 19),
                datetimeTo:   datetimeTo.toISOString().slice(0, 19),
                places: resForm.places,
                createdBy: 'WAITER',
            });
            toast.success(`Table #${reservationModal.tableNumber} réservée pour ${customerFullName(selectedCustomer)}`);
            queryClient.invalidateQueries({ queryKey: ['reservations', 'today'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            closeReservationModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erreur lors de la réservation');
        } finally {
            setResLoading(false);
        }
    };

    const handleCancelReservation = async (reservationId) => {
        if (!window.confirm('Annuler cette réservation ?')) return;
        try {
            await api.post(API_ENDPOINTS.RESERVATIONS.CANCEL(reservationId));
            toast.success('Réservation annulée');
            queryClient.invalidateQueries({ queryKey: ['reservations', 'today'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        } catch (err) {
            toast.error(err.response?.data?.message || "Erreur lors de l'annulation");
        }
    };

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
        queryClient.invalidateQueries({ queryKey: ['reservations', 'today'] });
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
                        const custName = (customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || null : null) || customer?.username || activeOrder?.customerName || null;
                        const custPhone = customer?.phone || activeOrder?.customerPhone || null;
                        const custEmail = customer?.email || activeOrder?.customerEmail || null;
                        const custId = activeOrder?.customerId || customer?.customerId || null;

                        const reservation = reservationByTable[table.tableId] || null;
                        const isCurrentRes = reservation
                            ? new Date(reservation.datetimeFrom).getTime() <= Date.now() &&
                              new Date(reservation.datetimeTo).getTime() > Date.now()
                            : false;

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
                                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                                        reservation
                                            ? isCurrentRes
                                                ? 'bg-orange-200 text-orange-800'
                                                : 'bg-yellow-200 text-yellow-800'
                                            : table.status === 'FREE' ? 'bg-green-200 text-green-800'
                                            : table.status === 'OCCUPIED' ? 'bg-red-200 text-red-800'
                                            : 'bg-yellow-200 text-yellow-800'
                                        }`}>
                                        {reservation ? 'RÉSERVÉ' : table.status}
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

                                {reservation && (
                                    <div className={`mb-4 p-3 rounded-md border text-sm ${isCurrentRes ? 'bg-orange-50 border-orange-300' : 'bg-yellow-50 border-yellow-200'}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className={`flex items-center gap-1 font-semibold ${isCurrentRes ? 'text-orange-800' : 'text-yellow-800'}`}>
                                                <Calendar className="h-3.5 w-3.5" />
                                                Réservation
                                            </div>
                                            {isCurrentRes && (
                                                <span className="text-xs font-bold bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                                                    En cours
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                                            <User className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                            {reservation.customerName || `Client #${reservation.customerId}`}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-700 mt-0.5">
                                            <Clock className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                            {fmtSlot(reservation.datetimeFrom, reservation.datetimeTo)}
                                        </div>
                                        {reservation.places > 0 && (
                                            <div className="flex items-center gap-1.5 text-gray-600 mt-0.5">
                                                <Users className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                                {reservation.places} convive{reservation.places > 1 ? 's' : ''}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleCancelReservation(reservation.reservationId)}
                                            className="mt-2 w-full px-3 py-1.5 rounded-md text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                                        >
                                            Annuler la réservation
                                        </button>
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
                                        onClick={() => openReservationModal(table)}
                                        className="flex flex-col items-center justify-center p-2 rounded transition-colors bg-white border border-yellow-500 text-yellow-600 hover:bg-yellow-50"
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

            {/* ── Modal réservation ── */}
            {reservationModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-gray-800">
                                Réserver table #{reservationModal.tableNumber}
                                {reservationModal.capacity && (
                                    <span className="ml-2 text-sm font-normal text-gray-500">({reservationModal.capacity} pers. max)</span>
                                )}
                            </h2>
                            <button onClick={closeReservationModal} className="p-1 text-gray-400 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Recherche client */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Client *</label>
                            {selectedCustomer ? (
                                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-blue-800 text-sm">{customerFullName(selectedCustomer)}</p>
                                        <p className="text-xs text-blue-600">{selectedCustomer.email}</p>
                                    </div>
                                    <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-blue-400 hover:text-blue-700">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={e => handleCustomerSearchChange(e.target.value)}
                                        placeholder="Rechercher par nom, email ou téléphone..."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                    {customerResults.length > 0 && (
                                        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {customerResults.map(c => (
                                                <li key={c.customerId}
                                                    onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerResults([]); }}
                                                    className="px-3 py-2 cursor-pointer hover:bg-yellow-50 text-sm">
                                                    <p className="font-medium text-gray-800">{customerFullName(c)}</p>
                                                    <p className="text-gray-500 text-xs">{c.email} {c.phone ? `· ${c.phone}` : ''}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {customerSearch.length >= 2 && customerResults.length === 0 && (
                                        <p className="absolute mt-1 text-xs text-gray-400 px-1">Aucun client trouvé</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Date */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                            <input
                                type="date"
                                value={resForm.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setResForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>

                        {/* Heure */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Heure de début * <span className="font-normal text-gray-400">(durée 1h30)</span></label>
                            <input
                                type="time"
                                value={resForm.timeFrom}
                                onChange={e => setResForm(f => ({ ...f, timeFrom: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>

                        {/* Nombre de personnes */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de couverts *</label>
                            <input
                                type="number"
                                min={1}
                                max={reservationModal.capacity || 20}
                                value={resForm.places}
                                onChange={e => setResForm(f => ({ ...f, places: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={closeReservationModal} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmitReservation}
                                disabled={resLoading || !selectedCustomer || !resForm.date || !resForm.timeFrom}
                                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors text-sm"
                            >
                                {resLoading ? 'Enregistrement...' : 'Confirmer la réservation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default TableManagement;
