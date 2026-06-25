import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Search, FileText, Filter, RefreshCw, User, Database, Activity, Calendar } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';

const ACTION_COLORS = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  CREATE: 'bg-green-100 text-green-800',
  SELECT: 'bg-gray-100 text-gray-700',
};

const AdminLogsPage = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit-logs?size=500');
      return res.data || [];
    },
    staleTime: 30000,
    onError: () => toast.error('Erreur lors du chargement des logs'),
  });

  const uniqueTables = [...new Set(logs.map(l => l.tableName).filter(Boolean))].sort();
  const uniqueActions = [...new Set(logs.map(l => l.actionType).filter(Boolean))].sort();

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.performedBy?.toLowerCase().includes(search.toLowerCase()) ||
      log.recordId?.toString().includes(search) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.tableName?.toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || log.actionType === actionFilter;
    const matchTable = !tableFilter || log.tableName === tableFilter;
    return matchSearch && matchAction && matchTable;
  });

  const fmt = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-8 w-8 text-indigo-600" />
              Journal d'activité
            </h1>
            <p className="text-gray-500 mt-1">
              {filtered.length} entrée{filtered.length !== 1 ? 's' : ''} · Audit complet des actions système
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher (utilisateur, ID, détails...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 appearance-none"
            >
              <option value="">Toutes les actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="relative">
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={tableFilter}
              onChange={e => setTableFilter(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 appearance-none"
            >
              <option value="">Toutes les tables</option>
              {uniqueTables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun log trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Table</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID enr.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(log => (
                    <tr key={log.logId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {fmt(log.performedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${ACTION_COLORS[log.actionType] || 'bg-gray-100 text-gray-700'}`}>
                          {log.actionType || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        <div className="flex items-center gap-1">
                          <Database className="h-3.5 w-3.5 text-indigo-400" />
                          {log.tableName || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        #{log.recordId || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {log.performedBy || 'SYSTEM'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                        <span className="truncate block" title={log.details}>
                          {log.details || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminLogsPage;
