package com.joel.gestion_snack.service;

import com.joel.gestion_snack.config.WebSocketEventPublisher;
import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.OrderItemRequestDTO;
import com.joel.gestion_snack.model.dto.OrderRequestDTO;
import com.joel.gestion_snack.model.entity.DiningTable;
import com.joel.gestion_snack.model.entity.Order;
import com.joel.gestion_snack.model.entity.OrderStatus;
import com.joel.gestion_snack.model.entity.OrderType;
import com.joel.gestion_snack.model.entity.PaymentMethodType;
import com.joel.gestion_snack.model.entity.Product;
import com.joel.gestion_snack.model.entity.Revenue;
import com.joel.gestion_snack.model.entity.TableStatusType;
import com.joel.gestion_snack.model.entity.Transaction;
import com.joel.gestion_snack.model.entity.TransactionStatusType;
import com.joel.gestion_snack.repository.CustomerRepository;
import com.joel.gestion_snack.repository.DiningTableRepository;
import com.joel.gestion_snack.repository.OrderItemRepository;
import com.joel.gestion_snack.repository.OrderRepository;
import com.joel.gestion_snack.repository.ProductRepository;
import com.joel.gestion_snack.repository.RevenueRepository;
import com.joel.gestion_snack.repository.TransactionRepository;
import com.joel.gestion_snack.service.implementations.OrderServiceImpl;
import com.joel.gestion_snack.service.implementations.StripeService;
import com.joel.gestion_snack.utils.MapperUtil;
import com.stripe.exception.ApiException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Encaissement Stripe et remboursement : montant enregistré, chiffre d'affaires, annulation de la commande.
 * Tests sans Spring ni base : les dépôts et Stripe sont simulés.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrderPaymentRefundTest {

    @Mock OrderRepository orderRepository;
    @Mock OrderItemRepository orderItemRepository;
    @Mock ProductRepository productRepository;
    @Mock CustomerRepository customerRepository;
    @Mock DiningTableRepository diningTableRepository;
    @Mock RevenueRepository revenueRepository;
    @Mock TransactionRepository transactionRepository;
    @Mock MapperUtil mapperUtil;
    @Mock WebSocketEventPublisher wsPublisher;
    @Mock StripeService stripeService;
    @Mock EntityManager entityManager;

    @InjectMocks OrderServiceImpl service;

    private final LocalDate today = LocalDate.now();

    @BeforeEach
    void commonStubs() {
        when(mapperUtil.toOrderDTO(any())).thenReturn(new OrderDTO());
        when(orderItemRepository.findByOrder_OrderId(anyLong())).thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(revenueRepository.save(any(Revenue.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------ création + paiement Stripe

    @Test
    void lePaiementStripeEstEnregistreAuTotalRelueDepuisLaBase() {
        Product pizza = new Product();
        pizza.setProductId(2L);
        pizza.setProductName("Pizza");
        pizza.setUnitPrice(new BigDecimal("12.00"));
        pizza.setQuantityAvailable(100);
        when(productRepository.findById(2L)).thenReturn(Optional.of(pizza));
        when(orderItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(revenueRepository.findByDate(today)).thenReturn(Optional.empty());

        // La commande reçoit son identifiant à l'enregistrement, comme avec la base.
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            if (o.getOrderId() == null) {
                o.setOrderId(9L);
            }
            return o;
        });
        // Le trigger de la base recalcule le total : seul un rechargement (refresh) le rend visible.
        doAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setTotalAmount(new BigDecimal("24.00"));
            return null;
        }).when(entityManager).refresh(any(Order.class));

        OrderItemRequestDTO line = new OrderItemRequestDTO();
        line.setProductId(2L);
        line.setQuantity(2);
        OrderRequestDTO request = new OrderRequestDTO();
        request.setOrderType(OrderType.TAKEAWAY);
        request.setPaymentMethod(PaymentMethodType.CARD);
        request.setCreatedBy("CUSTOMER");
        request.setStripePaymentIntentId("pi_test_1");
        request.setOrderItems(List.of(line));

        service.createOrder(request);

        ArgumentCaptor<Transaction> tx = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository).save(tx.capture());
        assertThat(tx.getValue().getAmount()).isEqualByComparingTo("24.00");
        assertThat(tx.getValue().getStatus()).isEqualTo(TransactionStatusType.COMPLETED);
        assertThat(tx.getValue().getStripePaymentIntentId()).isEqualTo("pi_test_1");

        ArgumentCaptor<Revenue> revenue = ArgumentCaptor.forClass(Revenue.class);
        verify(revenueRepository).save(revenue.capture());
        assertThat(revenue.getValue().getAmount()).isEqualByComparingTo("24.00");
        assertThat(revenue.getValue().getOrderCount()).isEqualTo(1);

        // Les lignes doivent être écrites en base AVANT le rechargement, sinon le trigger n'a rien à totaliser.
        InOrder order = inOrder(orderRepository, entityManager);
        order.verify(orderRepository).flush();
        order.verify(entityManager).refresh(any(Order.class));
    }

    // ------------------------------------------------------------------ remboursement Stripe

    private Order activeOrder(BigDecimal total) {
        Order o = new Order();
        o.setOrderId(5L);
        o.setStatus(OrderStatus.ACTIVE);
        o.setTotalAmount(total);
        o.setOrderDate(today);
        return o;
    }

    private Transaction stripeTransaction(Order order, BigDecimal amount) {
        Transaction t = new Transaction();
        t.setIdTransaction(19L);
        t.setOrder(order);
        t.setAmount(amount);
        t.setStatus(TransactionStatusType.COMPLETED);
        t.setStripePaymentIntentId("pi_paid");
        return t;
    }

    private Revenue revenue(String amount, int count) {
        Revenue r = new Revenue();
        r.setDate(today);
        r.setAmount(new BigDecimal(amount));
        r.setOrderCount(count);
        return r;
    }

    private void stubRefundContext(Order order, Transaction tx, Revenue revenue) {
        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));
        when(transactionRepository.findFirstByOrder_OrderIdAndStatus(5L, TransactionStatusType.COMPLETED))
                .thenReturn(Optional.of(tx));
        when(transactionRepository.existsByOrder_OrderIdAndStatus(5L, TransactionStatusType.REFUNDED)).thenReturn(false);
        when(revenueRepository.findByDate(today)).thenReturn(Optional.of(revenue));
    }

    @Test
    void remboursementStripeNormal_annuleLaCommandeEtCorrigeLeCA() throws Exception {
        DiningTable table = new DiningTable();
        table.setTableId(3L);
        table.setStatus(TableStatusType.OCCUPIED);
        Order order = activeOrder(new BigDecimal("24.00"));
        order.setTable(table);
        Transaction tx = stripeTransaction(order, new BigDecimal("24.00"));
        Revenue revenue = revenue("100.00", 3);
        stubRefundContext(order, tx, revenue);

        service.refundOrder(5L, "admin");

        verify(stripeService).createRefund("pi_paid", 2400L);
        assertThat(tx.getStatus()).isEqualTo(TransactionStatusType.REFUNDED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(table.getStatus()).isEqualTo(TableStatusType.FREE);
        assertThat(revenue.getAmount()).isEqualByComparingTo("76.00");
        assertThat(revenue.getOrderCount()).isEqualTo(2);
        verify(wsPublisher).publishOrderEvent("ORDER_REFUNDED", 5L);
    }

    @Test
    void ancienPaiementStripeEnregistreA0_rembourseLeTotalReelSansToucherAuCA() throws Exception {
        Order order = activeOrder(new BigDecimal("24.00"));
        Transaction tx = stripeTransaction(order, new BigDecimal("0.00"));   // enregistré à 0 avant la correction
        Revenue revenue = revenue("100.00", 3);                               // le CA n'a jamais reçu ces 24 €
        stubRefundContext(order, tx, revenue);

        service.refundOrder(5L, "admin");

        verify(stripeService).createRefund("pi_paid", 2400L);                 // le vrai total, pas 0
        assertThat(tx.getAmount()).isEqualByComparingTo("24.00");             // la transaction est corrigée
        assertThat(tx.getStatus()).isEqualTo(TransactionStatusType.REFUNDED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(revenue.getAmount()).isEqualByComparingTo("100.00");       // on ne retire pas ce qui n'a pas été ajouté
        assertThat(revenue.getOrderCount()).isEqualTo(2);
    }

    @Test
    void remboursementRefuseSiLaCommandeEstDejaEnPreparation() throws Exception {
        Order order = activeOrder(new BigDecimal("24.00"));
        order.setStatus(OrderStatus.IN_PREPARATION);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.refundOrder(5L, "admin"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ACTIVE");
        verifyNoInteractions(stripeService);
    }

    @Test
    void remboursementRefuseSiLeMontantEstNul_sansAppelerStripe() throws Exception {
        Order order = activeOrder(new BigDecimal("0.00"));
        Transaction tx = stripeTransaction(order, new BigDecimal("0.00"));
        stubRefundContext(order, tx, revenue("100.00", 3));

        assertThatThrownBy(() -> service.refundOrder(5L, "admin"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Montant à rembourser nul");
        verifyNoInteractions(stripeService);
        assertThat(tx.getStatus()).isEqualTo(TransactionStatusType.COMPLETED);
    }

    @Test
    void siStripeRefuse_labaseResteIntacte() throws Exception {
        Order order = activeOrder(new BigDecimal("24.00"));
        Transaction tx = stripeTransaction(order, new BigDecimal("24.00"));
        Revenue revenue = revenue("100.00", 3);
        stubRefundContext(order, tx, revenue);
        when(stripeService.createRefund(anyString(), anyLong()))
                .thenThrow(new ApiException("Stripe indisponible", "req_1", "api_error", 500, null));

        assertThatThrownBy(() -> service.refundOrder(5L, "admin"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Remboursement Stripe impossible");

        assertThat(tx.getStatus()).isEqualTo(TransactionStatusType.COMPLETED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.ACTIVE);
        assertThat(revenue.getAmount()).isEqualByComparingTo("100.00");
        verify(transactionRepository, never()).save(any(Transaction.class));
        verify(wsPublisher, never()).publishOrderEvent(anyString(), anyLong());
    }
}
