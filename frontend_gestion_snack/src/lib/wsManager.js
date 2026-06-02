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

/**
 * Gestionnaire WebSocket singleton.
 * Une seule connexion STOMP est ouverte quelle que soit la route active.
 * Tous les événements entrants invalident le cache React Query ciblé,
 * déclenchant un re-fetch uniquement pour les composants abonnés aux
 * données concernées.
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
        // Toutes les mutations de commandes (create / cancel / close / serve / pay)
        // publient sur ce topic → invalide toutes les queries ['orders', ...]
        client.subscribe('/topic/orders', () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        });

        // Toutes les mutations de tables publient sur ce topic
        // → invalide les queries ['tables'] et ['orders'] (tables liées aux commandes)
        client.subscribe('/topic/tables', () => {
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
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
};
