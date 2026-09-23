package com.joel.gestion_snack.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Sécurise le canal WebSocket STOMP.
 * <ul>
 *   <li>CONNECT : exige {@code Authorization: Bearer <jwt>} valide (compte actif) ;</li>
 *   <li>SUBSCRIBE : les topics de diffusion sont ouverts aux utilisateurs connectés, mais
 *       {@code /topic/notifications/{userId}} n'est accessible qu'à son propriétaire ;</li>
 *   <li>SEND : aucune destination applicative n'existe, tout envoi client est refusé.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String PERSONAL_PREFIX = "/topic/notifications/";
    private static final String BROADCAST_TOPIC = "/topic/notifications/broadcast";

    private final JwtService jwtService;
    private final JwtAuthConverter converter;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscription(accessor);
        } else if (StompCommand.SEND.equals(command)) {
            throw new MessagingException("Envoi non autorisé : ce canal est en lecture seule pour les clients");
        }
        return message;
    }

    private Authentication authenticate(String header) {
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new MessagingException("Authentification WebSocket requise");
        }
        try {
            Jwt jwt = jwtService.decode(header.substring(7).trim());
            return new UserAuthenticationToken(converter.authenticate(jwt), jwt);
        } catch (JwtException | org.springframework.security.core.AuthenticationException e) {
            log.warn("Connexion WebSocket refusée : {}", e.getMessage());
            throw new MessagingException("Jeton WebSocket invalide ou expiré");
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof UserAuthenticationToken auth)) {
            throw new MessagingException("Abonnement refusé : utilisateur non authentifié");
        }
        String destination = accessor.getDestination();
        if (destination != null && destination.startsWith(PERSONAL_PREFIX) && !destination.equals(BROADCAST_TOPIC)) {
            String expected = PERSONAL_PREFIX + auth.getPrincipal().getUserId();
            if (!destination.equals(expected)) {
                log.warn("Abonnement refusé pour {} sur {}", auth.getName(), destination);
                throw new MessagingException("Abonnement refusé : canal personnel d'un autre utilisateur");
            }
        }
    }
}
