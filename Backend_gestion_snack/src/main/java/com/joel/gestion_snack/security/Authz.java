package com.joel.gestion_snack.security;

import com.joel.gestion_snack.model.entity.RoleType;
import com.joel.gestion_snack.repository.MessageRepository;
import com.joel.gestion_snack.repository.OrderRepository;
import com.joel.gestion_snack.repository.ProviderProductRepository;
import com.joel.gestion_snack.repository.ReservationRepository;
import com.joel.gestion_snack.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Règles de propriété des données, utilisées dans les expressions {@code @PreAuthorize}
 * (ex. {@code @authz.ownsOrder(authentication, #id)}).
 *
 * <p>Elles complètent les contrôles par rôle : un client n'accède qu'à SES commandes, réservations et
 * avis ; un fournisseur qu'à SES livraisons ; chacun qu'à SON profil.
 */
@Component("authz")
@RequiredArgsConstructor
public class Authz {

    private static final Set<RoleType> STAFF_ROLES = Set.of(RoleType.ADMIN, RoleType.CASHIER, RoleType.WAITER, RoleType.COOK);

    private final OrderRepository orderRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;
    private final ProviderProductRepository providerProductRepository;
    private final MessageRepository messageRepository;

    /** L'utilisateur connecté est exactement ce compte ({@code users.user_id}). */
    public boolean isUser(Authentication auth, Long userId) {
        AuthUser me = current(auth);
        return me != null && userId != null && userId.equals(me.getUserId());
    }

    /** Fiche client (table customers) de l'utilisateur connecté. */
    public boolean isCustomer(Authentication auth, Long customerId) {
        return hasOwnerId(auth, RoleType.CUSTOMER, customerId);
    }

    /** Fiche fournisseur (table provider) de l'utilisateur connecté. */
    public boolean isProvider(Authentication auth, Long providerId) {
        return hasOwnerId(auth, RoleType.PROVIDER, providerId);
    }

    /** Fiche employé (table employees) de l'utilisateur connecté, quel que soit son rôle de personnel. */
    public boolean isEmployee(Authentication auth, Long employeeId) {
        AuthUser me = current(auth);
        return me != null && STAFF_ROLES.contains(me.getRole())
                && employeeId != null && employeeId.equals(me.getOwnerId());
    }

    public boolean ownsOrder(Authentication auth, Long orderId) {
        Long customerId = customerIdOf(auth);
        return customerId != null && orderId != null
                && orderRepository.existsByOrderIdAndCustomer_CustomerId(orderId, customerId);
    }

    public boolean ownsReservation(Authentication auth, Long reservationId) {
        Long customerId = customerIdOf(auth);
        return customerId != null && reservationId != null
                && reservationRepository.existsByReservationIdAndCustomer_CustomerId(reservationId, customerId);
    }

    public boolean ownsReview(Authentication auth, Long reviewId) {
        Long customerId = customerIdOf(auth);
        return customerId != null && reviewId != null
                && reviewRepository.existsByReviewIdAndCustomer_CustomerId(reviewId, customerId);
    }

    public boolean ownsSupply(Authentication auth, Long supplyId) {
        AuthUser me = current(auth);
        return me != null && me.getRole() == RoleType.PROVIDER && me.getOwnerId() != null && supplyId != null
                && providerProductRepository.existsByProvideIdAndProvider_ProviderId(supplyId, me.getOwnerId());
    }

    /** Notification personnelle de l'utilisateur connecté (suppression). */
    public boolean ownsMessage(Authentication auth, Long messageId) {
        AuthUser me = current(auth);
        return me != null && messageId != null
                && messageRepository.existsByIdMessageAndUser_UserId(messageId, me.getUserId());
    }

    /** Notification personnelle de l'utilisateur connecté, ou message diffusé à tous (marquage « lu »). */
    public boolean canReadMessage(Authentication auth, Long messageId) {
        return ownsMessage(auth, messageId)
                || (messageId != null && messageRepository.existsByIdMessageAndIsBroadcastTrue(messageId));
    }

    private boolean hasOwnerId(Authentication auth, RoleType role, Long ownerId) {
        AuthUser me = current(auth);
        return me != null && me.getRole() == role && ownerId != null && ownerId.equals(me.getOwnerId());
    }

    private Long customerIdOf(Authentication auth) {
        AuthUser me = current(auth);
        return me != null && me.getRole() == RoleType.CUSTOMER ? me.getOwnerId() : null;
    }

    static AuthUser current(Authentication auth) {
        return auth != null && auth.getPrincipal() instanceof AuthUser user ? user : null;
    }
}
