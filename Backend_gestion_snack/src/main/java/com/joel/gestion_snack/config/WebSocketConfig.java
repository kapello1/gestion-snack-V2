package com.joel.gestion_snack.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${allowed.origins:http://localhost:5173}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Simple in-memory broker pour les topics de diffusion
        registry.enableSimpleBroker("/topic");
        // Préfixe pour les messages envoyés par les clients vers le backend
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint natif WebSocket (Vercel + Render supportent les WebSockets nativement)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","));

        // Endpoint SockJS comme fallback (proxies intermédiaires)
        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .withSockJS();
    }
}
