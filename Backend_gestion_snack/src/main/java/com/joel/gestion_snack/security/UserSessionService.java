package com.joel.gestion_snack.security;

import com.joel.gestion_snack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Relit en base, à chaque requête authentifiée, l'état réel du compte (actif, rôle courant).
 *
 * <p>Un JWT étant sans état, il resterait sinon valable jusqu'à son expiration même si l'administrateur
 * désactive le compte ou change le rôle. Le résultat est mis en cache 15 secondes par utilisateur pour
 * ne pas ajouter une requête SQL à chaque appel ; les changements de compte évincent l'entrée du cache.
 */
@Service
@RequiredArgsConstructor
public class UserSessionService {

    private static final long TTL_MILLIS = 15_000L;
    private static final int MAX_ENTRIES = 10_000;

    private final UserRepository userRepository;
    private final ConcurrentMap<Long, Entry> cache = new ConcurrentHashMap<>();

    private record Entry(AuthUser user, long loadedAt) {
    }

    /** Utilisateur authentifiable (compte existant et actif) ou vide. */
    public Optional<AuthUser> resolve(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        long now = System.currentTimeMillis();
        Entry entry = cache.get(userId);
        if (entry == null || now - entry.loadedAt() > TTL_MILLIS) {
            if (cache.size() >= MAX_ENTRIES) {
                cache.clear();
            }
            entry = new Entry(load(userId), now);
            cache.put(userId, entry);
        }
        return Optional.ofNullable(entry.user());
    }

    /** À appeler après une désactivation, un changement de rôle ou de mot de passe. */
    public void evict(Long userId) {
        if (userId != null) {
            cache.remove(userId);
        }
    }

    private AuthUser load(Long userId) {
        return userRepository.findSessionView(userId)
                .filter(v -> !Boolean.FALSE.equals(v.getIsActive()))
                .map(v -> new AuthUser(v.getUserId(), v.getUsername(), v.getRoleName(), v.getOwnerId()))
                .orElse(null);
    }
}
