import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient partagé à travers toute l'application.
 * - staleTime: Infinity → les données ne sont JAMAIS considérées périmées
 *   automatiquement ; seul un événement WebSocket (invalidateQueries) déclenche
 *   un re-fetch, ce qui élimine tout polling passif.
 * - refetchOnWindowFocus: false → pas de re-fetch quand l'utilisateur revient
 *   sur l'onglet (le WS gère la fraîcheur des données).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 10 * 60 * 1000,   // 10 min en cache après la dernière utilisation
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,  // Rafraîchit après reconnexion réseau
    },
  },
});

export default queryClient;
