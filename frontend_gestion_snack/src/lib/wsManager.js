import { Client } from '@stomp/stompjs';
import queryClient from './queryClient';

/**
 * Construit l'URL WebSocket à partir de VITE_API_BASE_URL.
 * Ex: https://api.render.app/api  →  wss://api.render.app/ws
 *     http://localhost:8080/api   →  ws://localhost:8080/ws
 */
const buildWsUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  return base
    .replace(/\/api$/, '/ws')
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
};

let client = null;

// Callbacks enregistrés par des composants non-React-Query (ex: Dashboard)
const listeners = new Set();

/**
 * Gestionnaire WebSocket singleton.
 * Une seule connexion STOMP est ouverte quelle que soit la route active.
 * Tous les événements entrants invalident le cache React Query ciblé et
 * notifient les listeners enregistrés via onEvent().
 */
export const wsManager = {
  connect() {
    if (client?.active) return;

    client = new Client({
      brokerURL: buildWsUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect() {
        client.subscribe('/topic/orders', () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          listeners.forEach(fn => fn({ topic: 'orders' }));
        });

        client.subscribe('/topic/tables', () => {
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          listeners.forEach(fn => fn({ topic: 'tables' }));
        });

        client.subscribe('/topic/reservations', () => {
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          listeners.forEach(fn => fn({ topic: 'reservations' }));
        });
      },

      onStompError(frame) {
        console.warn('[WS] STOMP error:', frame.headers?.message);
      },

      onDisconnect() {
        console.info('[WS] Déconnecté du serveur');
      },
    });

    client.activate();
  },

  disconnect() {
    if (client) {
      client.deactivate();
      client = null;
    }
  },

  isConnected() {
    return !!client?.active;
  },

  /**
   * Enregistre un callback appelé à chaque événement WS reçu.
   * Retourne une fonction de désinscription à appeler dans le cleanup useEffect.
   */
  onEvent(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
