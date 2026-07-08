import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { RotateCcw, Search, Filter, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

// ── Status styles ──────────────────────────────────────────────────────────────
const TRANSACTION_STATUS = {
  COMPLETED: { label: 'Payé',       color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  PENDING:   { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock       },
  FAILED:    { label: 'Échoué',     color: 'bg-red-100 text-red-700',      icon: XCircle     },
  REFUNDED:  { label: 'Remboursé',  color: 'bg-gray-100 text-gray-600',    icon: RotateCcw   },
};

const ORDER_STATUS_LABEL = {
  ACTIVE:         { label: 'En attente de préparation', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  IN_PREPARATION: { label: 'En cours de préparation',   color: 'text-orange-600 bg-orange-50 border-orange-200' },
  CLOSED:         { label: 'Prête à servir',            color: 'text-blue-600 bg-blue-50 border-blue-200'       },
  SERVED:         { label: 'Servie au client',          color: 'text-green-600 bg-green-50 border-green-200'    },
  CANCELLED:      { label: 'Annulée / Remboursée',      color: 'text-red-600 bg-red-50 border-red-200'          },
};

const PAYMENT_METHOD_LABEL = {
  CASH: 'Espèces',
  CARD: 'Carte',
  ONLINE: 'En ligne (Stripe)',
};

const AdminTransactionsPage = () => {
  const { user } = useAuth();

  const [transactions, setTransactions]   = useState([]);
  const [filtered,     setFiltered]       = useState([]);
  const [loading,      setLoading]        = useState(true);
  const [searchTerm,   setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter]   = useState('ALL');
  const [refundingId,  setRefundingId]    = useState(null);
  const [confirmId,    setConfirmId]      = useState(null);

  useEffect(() => { loadTransactions(); }, []);
  useEffect(() => { applyFilters(); }, [transactions, searchTerm, statusFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.TRANSACTIONS.BASE);
      setTransactions(res.data || []);
    } catch {
      toast.error('Impossible de charger les transactions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let list = [...transactions];
    if (statusFilter !== 'ALL') {
      list = list.filter(t => t.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t =>
        t.customerFullName?.toLowerCase().includes(q) ||
        String(t.orderId).includes(q) ||
        String(t.idTransaction).includes(q)
      );
    }
    setFiltered(list);
  };

  const handleRefund = async (tx) => {
    setRefundingId(tx.idTransaction);
    try {
      await api.post(API_ENDPOINTS.TRANSACTIONS.REFUND(tx.idTransaction), {
        refundedBy: user?.username || 'ADMIN',
      });
      toast.success(`Transaction #${tx.idTransaction} remboursée`);
      await loadTransactions();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Remboursement impossible');
    } finally {
      setRefundingId(null);
      setConfirmId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const STATUS_TABS = ['ALL', 'COMPLETED', 'PENDING', 'REFUNDED', 'FAILED'];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Historique de tous les paiements</p>
          </div>
          <button
            type="button"
            onClick={loadTransactions}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher par client, n° commande…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Status tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_TABS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all
                  ${statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
              >
                {s === 'ALL' ? 'Toutes' : (TRANSACTION_STATUS[s]?.label || s)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['COMPLETED', 'PENDING', 'REFUNDED', 'FAILED'].map(s => {
            const count = transactions.filter(t => t.status === s).length;
            const total = transactions.filter(t => t.status === s).reduce((acc, t) => acc + (t.amount || 0), 0);
            const cfg   = TRANSACTION_STATUS[s] || {};
            const Icon  = cfg.icon;
            return (
              <div key={s} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  {Icon && <Icon className="h-4 w-4 text-gray-400" />}
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cfg.label}</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{count}</p>
                <p className="text-xs text-gray-400">{total.toFixed(2)} €</p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center text-gray-400 py-16">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['#', 'Date', 'Client', 'Commande', 'Paiement', 'Montant', 'Statut tx', 'Statut cmd', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(tx => {
                    const txStatus  = TRANSACTION_STATUS[tx.status] || {};
                    const TxIcon    = txStatus.icon;
                    const ordStatus = ORDER_STATUS_LABEL[tx.orderStatus] || {};
                    const canRefund = tx.orderStatus === 'ACTIVE' && tx.status !== 'REFUNDED';

                    return (
                      <tr key={tx.idTransaction} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-500 text-xs">#{tx.idTransaction}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {tx.customerFullName || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                          {tx.orderId ? `#${tx.orderId}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {PAYMENT_METHOD_LABEL[tx.paymentMethod] || tx.paymentMethod}
                        </td>
                        <td className="px-4 py-3 font-black text-gray-900">
                          {Number(tx.amount || 0).toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${txStatus.color || 'bg-gray-100 text-gray-600'}`}>
                            {TxIcon && <TxIcon className="h-3 w-3" />}
                            {txStatus.label || tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {tx.orderStatus ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${ordStatus.color || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                              {ordStatus.label || tx.orderStatus}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {canRefund && (
                            confirmId === tx.idTransaction ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRefund(tx)}
                                  disabled={refundingId === tx.idTransaction}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-60"
                                >
                                  {refundingId === tx.idTransaction ? '…' : 'Confirmer'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmId(null)}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmId(tx.idTransaction)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-lg transition-colors"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Rembourser
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminTransactionsPage;
