import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Utensils, Users, X, CheckCircle, User, Phone, Mail, Hash, Clock, Calendar, Timer } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, TABLE_STATUS, STATUS_COLORS } from '../../utils/constants';
import { wsManager } from '../../lib/wsManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const fmtSlot = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
};

const Countdown = ({ targetDate, label, colorClass }) => {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    const update = () => {
      const diffMs = new Date(targetDate).getTime() - Date.now();
      if (diffMs <= 0) { setDisplay('00:00:00'); return; }
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setDisplay(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return (
    <div className={`flex items-center gap-1 text-xs font-bold ${colorClass}`}>
      <Timer className="h-3 w-3" />
      <span>{label} {display}</span>
    </div>
  );
};

const WaiterTablesPage = () => {
  const [tables, setTables] = useState([]);
  const [ordersByTable, setOrdersByTable] = useState({});
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const queryClient = useQueryClient();

  // Réservations du jour
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: todayReservations = [] } = useQuery({
    queryKey: ['reservations', 'today-waiter'],
    queryFn: async () => {
      const res = await api.get(API_ENDPOINTS.RESERVATIONS.BY_DATE(todayStr)).catch(() => ({ data: [] }));
      return (res.data || []).filter(r => r.status === 'BOOKED');
    },
    staleTime: Infinity,
  });

  const reservationByTable = todayReservations.reduce((map, r) => {
    const existing = map[r.tableId];
    if (!existing) { map[r.tableId] = r; return map; }
    const nowMs = Date.now();
    const fromMs = new Date(r.datetimeFrom).getTime();
    const isCurrent = fromMs <= nowMs && new Date(r.datetimeTo).getTime() > nowMs;
    const existFromMs = new Date(existing.datetimeFrom).getTime();
    const existIsCurrent = existFromMs <= nowMs && new Date(existing.datetimeTo).getTime() > nowMs;
    if (isCurrent && !existIsCurrent) { map[r.tableId] = r; return map; }
    if (!isCurrent && existIsCurrent) return map;
    if (fromMs < existFromMs) map[r.tableId] = r;
    return map;
  }, {});

  useEffect(() => {
    loadTables(true);
  }, []);

  // Rafraîchissement instantané et silencieux sur tout événement WebSocket
  useEffect(() => {
    return wsManager.onEvent(() => {
      loadTables(false);
      queryClient.invalidateQueries({ queryKey: ['reservations', 'today-waiter'] });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { filterTables(); }, [searchTerm, selectedStatus, tables]);

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
    } catch (err) {
      if (showLoading) toast.error('Erreur lors du chargement des tables');
      else throw err;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filterTables = () => {
    let filtered = tables;
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.tableNumber?.toString().includes(searchTerm) ||
        t.capacity?.toString().includes(searchTerm)
      );
    }
    if (selectedStatus) {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }
    setFilteredTables(filtered.sort((a, b) => a.tableNumber - b.tableNumber));
  };

  const updateTableStatus = async (tableId, status) => {
    try {
      await api.put(API_ENDPOINTS.TABLES.UPDATE_STATUS(tableId), null, { params: { status } });
      toast.success('Statut de la table mis à jour');
      loadTables();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const releaseTable = async (tableId) => {
    try {
      await api.post(API_ENDPOINTS.TABLES.RELEASE(tableId));
      toast.success('Table libérée avec succès');
      loadTables();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de libérer la table');
    }
  };

  const freeCount = tables.filter(t => t.status === TABLE_STATUS.FREE).length;

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des tables</h1>
          <p className="text-gray-600 mt-1">
            {freeCount} table{freeCount > 1 ? 's' : ''} libre{freeCount > 1 ? 's' : ''} · {tables.length} au total
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une table..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-900"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-900"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(LABELS.TABLE_STATUS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Free tables quick view */}
        {freeCount > 0 && (
          <div className="mb-6 bg-green-50 rounded-xl p-4 border border-green-100">
            <h2 className="text-sm font-bold text-green-800 mb-2">Tables libres</h2>
            <div className="flex flex-wrap gap-2">
              {tables.filter(t => t.status === TABLE_STATUS.FREE).map(t => (
                <span key={t.tableId} className="px-3 py-1 bg-white rounded-lg text-sm font-semibold text-green-800 border border-green-200">
                  Table #{t.tableNumber} · {t.capacity} place{t.capacity > 1 ? 's' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tables grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-12">
              <Utensils className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              Aucune table trouvée
            </div>
          ) : (
            filteredTables.map(table => {
              const activeOrder = ordersByTable[table.tableId];
              const customer = activeOrder?.customer || activeOrder?.customerInfo || null;
              const custName = customer?.fullName || customer?.firstName
                ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
                : activeOrder?.customerName || null;
              const custPhone = customer?.phone || activeOrder?.customerPhone || null;
              const custEmail = customer?.email || activeOrder?.customerEmail || null;
              const custId    = activeOrder?.customerId || customer?.customerId || null;

              return (
                <div key={table.tableId} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                  {/* Table header */}
                  <div className={`px-5 py-4 border-b ${table.status === TABLE_STATUS.FREE ? 'bg-green-50 border-green-100' : table.status === TABLE_STATUS.OCCUPIED ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-900">Table #{table.tableNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS.TABLE[table.status] || 'bg-gray-100 text-gray-800'}`}>
                        {LABELS.TABLE_STATUS[table.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Users className="h-4 w-4" />
                      Capacité : {table.capacity} personne{table.capacity > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Customer info + couverts for OCCUPIED tables */}
                    {table.status === TABLE_STATUS.OCCUPIED && (custName || custId) && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm">
                        <p className="font-bold text-blue-800 mb-2 flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> Client occupant
                        </p>
                        {custName && (
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <User className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            <span className="font-medium">{custName}</span>
                          </div>
                        )}
                        {activeOrder?.guestCount > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-700 mt-1">
                            <Users className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            <span className="font-semibold">{activeOrder.guestCount} couvert{activeOrder.guestCount > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {custPhone && (
                          <div className="flex items-center gap-1.5 text-gray-700 mt-1">
                            <Phone className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            {custPhone}
                          </div>
                        )}
                        {custEmail && (
                          <div className="flex items-center gap-1.5 text-gray-700 mt-1 break-all">
                            <Mail className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            {custEmail}
                          </div>
                        )}
                        {custId && !custName && (
                          <div className="flex items-center gap-1.5 text-gray-600 mt-1">
                            <Hash className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            Client #{custId}
                          </div>
                        )}
                        {activeOrder?.orderId && (
                          <p className="text-blue-600 font-bold mt-1.5 text-xs">
                            Commande #{activeOrder.orderId}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Reservation info — données venant du DTO table OU des réservations du jour */}
                    {(() => {
                      const rTable = table.status === TABLE_STATUS.RESERVED && table.reservedForCustomerName ? table : null;
                      const rDay = reservationByTable[table.tableId];
                      const r = rTable || rDay;
                      if (!r) return null;
                      const name = rTable ? table.reservedForCustomerName : r.customerName;
                      const phone = rTable ? table.reservedForCustomerPhone : null;
                      const places = rTable ? table.reservationPlaces : r.places;
                      const from = rTable ? table.activeReservationDate : r.datetimeFrom;
                      const to = rTable ? table.reservationDatetimeTo : r.datetimeTo;
                      const now = Date.now();
                      const fromMs = from ? new Date(from).getTime() : 0;
                      const toMs = to ? new Date(to).getTime() : 0;
                      const inProgress = fromMs <= now && toMs > now;
                      return (
                        <div className={`p-3 rounded-xl border text-sm space-y-1 ${inProgress ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <p className={`font-bold mb-1 flex items-center gap-1 ${inProgress ? 'text-orange-700' : 'text-yellow-800'}`}>
                            <Calendar className="h-3.5 w-3.5" />
                            {inProgress ? 'Réservation en cours' : 'Prochaine réservation'}
                          </p>
                          {name && (
                            <p className="text-gray-700 flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                              {name}
                            </p>
                          )}
                          {phone && (
                            <p className="text-gray-600 flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                              {phone}
                            </p>
                          )}
                          {places > 0 && (
                            <p className="text-gray-700 flex items-center gap-1 font-semibold">
                              <Users className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                              {places} personne{places > 1 ? 's' : ''}
                            </p>
                          )}
                          {from && (
                            <p className="text-gray-500 text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {fmtSlot(from)}{to ? ` → ${fmtSlot(to)}` : ''}
                            </p>
                          )}
                          {/* Compte à rebours */}
                          {to && inProgress && <Countdown targetDate={to} label="Fin dans" colorClass="text-orange-600" />}
                          {from && !inProgress && fromMs > now && <Countdown targetDate={from} label="Début dans" colorClass="text-yellow-700" />}
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {table.status === TABLE_STATUS.FREE && (
                        <button
                          onClick={() => updateTableStatus(table.tableId, TABLE_STATUS.OCCUPIED)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-bold"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Attribuer
                        </button>
                      )}
                      {(table.status === TABLE_STATUS.OCCUPIED || table.status === TABLE_STATUS.RESERVED) && (
                        <button
                          onClick={() => releaseTable(table.tableId)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold"
                        >
                          <X className="h-4 w-4" />
                          Libérer
                        </button>
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

export default WaiterTablesPage;
