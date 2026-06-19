package com.joel.gestion_snack.utils;

import com.joel.gestion_snack.model.dto.*;
import com.joel.gestion_snack.model.entity.*;
import org.springframework.stereotype.Component;

/**
 * Utilitaire pour mapper les entités vers les DTOs et vice versa
 */
@Component
public class MapperUtil {

    // Role mappers
    public RoleDTO toRoleDTO(Role role) {
        if (role == null)
            return null;
        RoleDTO dto = new RoleDTO();
        dto.setRoleId(role.getRoleId());
        dto.setRoleName(role.getRoleName());
        dto.setDescription(role.getDescription());
        dto.setCreatedBy(role.getCreatedBy());
        dto.setCreatedAt(role.getCreatedAt());
        dto.setUpdatedBy(role.getUpdatedBy());
        dto.setUpdatedAt(role.getUpdatedAt());
        return dto;
    }

    public Role toRole(RoleRequestDTO dto) {
        if (dto == null)
            return null;
        Role role = new Role();
        role.setRoleName(dto.getRoleName());
        role.setDescription(dto.getDescription());
        role.setCreatedBy(dto.getCreatedBy());
        return role;
    }

    // Customer mappers
    public CustomerDTO toCustomerDTO(Customer customer) {
        if (customer == null)
            return null;
        CustomerDTO dto = new CustomerDTO();
        dto.setCustomerId(customer.getCustomerId());
        dto.setFirstName(customer.getFirstName());
        dto.setLastName(customer.getLastName());
        dto.setUsername(customer.getUsername());
        dto.setAddress(customer.getAddress());
        dto.setPhone(customer.getPhone());
        dto.setEmail(customer.getEmail());
        dto.setCreatedBy(customer.getCreatedBy());
        dto.setCreatedAt(customer.getCreatedAt());
        dto.setUpdatedBy(customer.getUpdatedBy());
        dto.setUpdatedAt(customer.getUpdatedAt());
        dto.setEmailVerified(customer.getEmailVerified());
        return dto;
    }

    public Customer toCustomer(CustomerRequestDTO dto) {
        if (dto == null)
            return null;
        Customer customer = new Customer();
        customer.setFirstName(dto.getFirstName());
        customer.setLastName(dto.getLastName());
        customer.setUsername(dto.getUsername());
        customer.setAddress(dto.getAddress());
        customer.setPhone(dto.getPhone());
        customer.setEmail(dto.getEmail());
        customer.setCreatedBy(dto.getCreatedBy());
        return customer;
    }

    // Product mappers
    public ProductDTO toProductDTO(Product product) {
        if (product == null)
            return null;
        ProductDTO dto = new ProductDTO();
        dto.setProductId(product.getProductId());
        dto.setProductName(product.getProductName());
        dto.setUnitPrice(product.getUnitPrice());
        dto.setQuantityAvailable(product.getQuantityAvailable());
        dto.setAlertThreshold(product.getAlertThreshold());
        dto.setCategoryId(product.getCategoryId());
        dto.setStockId(product.getStockId());
        dto.setDescription(product.getDescription());
        dto.setAlergy(product.getAlergy());
        dto.setImageUrl(product.getImageUrl());
        dto.setProductType(product.getProductType());
        dto.setNeedsSauce(product.getNeedsSauce());
        dto.setNeedsViande(product.getNeedsViande());
        dto.setCreatedBy(product.getCreatedBy());
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedBy(product.getUpdatedBy());
        dto.setUpdatedAt(product.getUpdatedAt());
        return dto;
    }

    public Product toProduct(ProductRequestDTO dto) {
        if (dto == null)
            return null;
        Product product = new Product();
        product.setProductName(dto.getProductName());
        product.setUnitPrice(dto.getUnitPrice());
        product.setQuantityAvailable(dto.getQuantityAvailable());
        product.setAlertThreshold(dto.getAlertThreshold());
        product.setCategoryId(dto.getCategoryId());
        product.setStockId(dto.getStockId());
        product.setDescription(dto.getDescription());
        product.setAlergy(dto.getAlergy());
        product.setImageUrl(dto.getImageUrl());
        product.setProductType(dto.getProductType());
        product.setNeedsSauce(dto.getNeedsSauce() != null ? dto.getNeedsSauce() : false);
        product.setNeedsViande(dto.getNeedsViande() != null ? dto.getNeedsViande() : false);
        product.setCreatedBy(dto.getCreatedBy());
        return product;
    }

    // DiningTable mappers
    public DiningTableDTO toDiningTableDTO(DiningTable table) {
        if (table == null)
            return null;
        DiningTableDTO dto = new DiningTableDTO();
        dto.setTableId(table.getTableId());
        dto.setOrderId(table.getOrderId());
        dto.setTableNumber(table.getTableNumber());
        dto.setCapacity(table.getCapacity());
        dto.setStatus(table.getStatus());
        dto.setCreatedBy(table.getCreatedBy());
        dto.setCreatedAt(table.getCreatedAt());
        dto.setUpdatedBy(table.getUpdatedBy());
        dto.setUpdatedAt(table.getUpdatedAt());
        return dto;
    }

    public DiningTable toDiningTable(DiningTableRequestDTO dto) {
        if (dto == null)
            return null;
        DiningTable table = new DiningTable();
        table.setOrderId(dto.getOrderId());
        table.setTableNumber(dto.getTableNumber());
        table.setCapacity(dto.getCapacity());
        table.setStatus(dto.getStatus() != null ? dto.getStatus() : TableStatusType.FREE);
        table.setCreatedBy(dto.getCreatedBy());
        return table;
    }

    // Order mappers
    public OrderDTO toOrderDTO(Order order) {
        if (order == null)
            return null;
        OrderDTO dto = new OrderDTO();
        dto.setOrderId(order.getOrderId());
        dto.setTableId(order.getTable() != null ? order.getTable().getTableId() : null);
        dto.setCustomerId(order.getCustomer() != null ? order.getCustomer().getCustomerId() : null);
        dto.setCustomer(order.getCustomer() != null ? toCustomerDTO(order.getCustomer()) : null);
        dto.setTotalAmount(order.getTotalAmount());
        dto.setOrderDate(order.getOrderDate());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setOrderType(order.getOrderType());
        dto.setPickupTime(order.getPickupTime());
        dto.setGuestCount(order.getGuestCount());
        dto.setStatus(order.getStatus());
        dto.setCreatedBy(order.getCreatedBy());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedBy(order.getUpdatedBy());
        dto.setUpdatedAt(order.getUpdatedAt());
        return dto;
    }

    // OrderItem mappers
    public OrderItemDTO toOrderItemDTO(OrderItem item) {
        if (item == null)
            return null;
        OrderItemDTO dto = new OrderItemDTO();
        dto.setOrderItemId(item.getOrderItemId());
        dto.setOrderId(item.getOrder().getOrderId());
        dto.setProductId(item.getProduct().getProductId());
        dto.setSaleId(item.getSaleId());
        dto.setProductName(item.getProduct().getProductName());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setLineTotal(item.getLineTotal());
        dto.setCreatedBy(item.getCreatedBy());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedBy(item.getUpdatedBy());
        dto.setUpdatedAt(item.getUpdatedAt());
        return dto;
    }

    // Employee mappers
    public EmployeeDTO toEmployeeDTO(Employee employee) {
        if (employee == null)
            return null;
        EmployeeDTO dto = new EmployeeDTO();
        dto.setEmployeeId(employee.getEmployeeId());
        dto.setLastName(employee.getLastName());
        dto.setFirstName(employee.getFirstName());
        dto.setUsername(employee.getUsername());
        dto.setAddress(employee.getAddress());
        dto.setPhone(employee.getPhone());
        dto.setEmail(employee.getEmail());
        if (employee.getRole() != null) {
            dto.setRoleId(employee.getRole().getRoleId());
            dto.setRoleName(employee.getRole().getRoleName().name());
        }
        dto.setSalary(employee.getSalary());
        dto.setHireDate(employee.getHireDate());
        dto.setCreatedBy(employee.getCreatedBy());
        dto.setCreatedAt(employee.getCreatedAt());
        dto.setUpdatedBy(employee.getUpdatedBy());
        dto.setUpdatedAt(employee.getUpdatedAt());
        return dto;
    }

    public Employee toEmployee(EmployeeRequestDTO dto) {
        if (dto == null)
            return null;
        Employee employee = new Employee();
        employee.setLastName(dto.getLastName());
        employee.setFirstName(dto.getFirstName());
        employee.setUsername(dto.getUsername());
        employee.setAddress(dto.getAddress());
        employee.setPhone(dto.getPhone());
        employee.setEmail(dto.getEmail());
        employee.setSalary(dto.getSalary());
        employee.setHireDate(dto.getHireDate());
        employee.setCreatedBy(dto.getCreatedBy());
        return employee;
    }

    // Provider mappers
    public ProviderDTO toProviderDTO(Provider provider) {
        if (provider == null)
            return null;
        ProviderDTO dto = new ProviderDTO();
        dto.setProviderId(provider.getProviderId());
        dto.setName(provider.getName());
        dto.setAddress(provider.getAddress());
        dto.setPhone(provider.getPhone());
        dto.setEmail(provider.getEmail());
        dto.setProviderType(provider.getProviderType());
        dto.setDeliveryDelay(provider.getDeliveryDelay());
        dto.setCreatedBy(provider.getCreatedBy());
        dto.setCreatedAt(provider.getCreatedAt());
        dto.setUpdatedBy(provider.getUpdatedBy());
        dto.setUpdatedAt(provider.getUpdatedAt());
        return dto;
    }

    public Provider toProvider(ProviderRequestDTO dto) {
        if (dto == null)
            return null;
        Provider provider = new Provider();
        provider.setName(dto.getName());
        provider.setAddress(dto.getAddress());
        provider.setPhone(dto.getPhone());
        provider.setEmail(dto.getEmail());
        provider.setProviderType(dto.getProviderType());
        provider.setDeliveryDelay(dto.getDeliveryDelay());
        provider.setCreatedBy(dto.getCreatedBy());
        return provider;
    }

    // Reservation mappers
    public ReservationDTO toReservationDTO(Reservation reservation) {
        if (reservation == null)
            return null;
        ReservationDTO dto = new ReservationDTO();
        dto.setReservationId(reservation.getReservationId());
        dto.setCustomerId(reservation.getCustomer().getCustomerId());
        dto.setTableId(reservation.getTable().getTableId());
        dto.setTableNumber(reservation.getTable().getTableNumber());
        dto.setTableCapacity(reservation.getTable().getCapacity());
        if (reservation.getCustomer() != null) {
            dto.setCustomerName(
                    reservation.getCustomer().getFirstName() + " " + reservation.getCustomer().getLastName());
        }
        dto.setDatetimeFrom(reservation.getDatetimeFrom());
        dto.setDatetimeTo(reservation.getDatetimeTo());
        dto.setPlaces(reservation.getPlaces());
        dto.setAttribut55(reservation.getAttribut55());
        dto.setStatus(reservation.getStatus());
        dto.setCreatedBy(reservation.getCreatedBy());
        dto.setCreatedAt(reservation.getCreatedAt());
        dto.setUpdatedBy(reservation.getUpdatedBy());
        dto.setUpdatedAt(reservation.getUpdatedAt());
        return dto;
    }

    public Reservation toReservation(ReservationRequestDTO dto) {
        if (dto == null)
            return null;
        Reservation reservation = new Reservation();
        reservation.setDatetimeFrom(dto.getDatetimeFrom());
        reservation.setDatetimeTo(dto.getDatetimeTo());
        reservation.setPlaces(dto.getPlaces());
        reservation.setAttribut55(dto.getAttribut55());
        reservation.setStatus(ReservationStatus.BOOKED);
        reservation.setCreatedBy(dto.getCreatedBy());
        return reservation;
    }

    // Review mappers
    public ReviewDTO toReviewDTO(Review review) {
        if (review == null)
            return null;
        ReviewDTO dto = new ReviewDTO();
        dto.setReviewId(review.getReviewId());
        dto.setCustomerId(review.getCustomer().getCustomerId());
        dto.setCustomerName(review.getCustomer().getFirstName() + " " + review.getCustomer().getLastName());
        dto.setComment(review.getComment());
        dto.setStar(review.getStar());
        dto.setProductId(review.getProduct() != null ? review.getProduct().getProductId() : null);
        dto.setCreatedBy(review.getCreatedBy());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setUpdatedBy(review.getUpdatedBy());
        dto.setUpdatedAt(review.getUpdatedAt());
        return dto;
    }

    public Review toReview(ReviewRequestDTO dto) {
        if (dto == null)
            return null;
        Review review = new Review();
        review.setComment(dto.getComment());
        review.setStar(dto.getStar());
        review.setCreatedBy(dto.getCreatedBy());
        return review;
    }

    // StockAlert mappers
    public StockAlertDTO toStockAlertDTO(StockAlert alert) {
        if (alert == null)
            return null;
        StockAlertDTO dto = new StockAlertDTO();
        dto.setAlertId(alert.getAlertId());
        dto.setProductId(alert.getProduct().getProductId());
        dto.setProductName(alert.getProduct().getProductName());
        dto.setMessage(alert.getMessage());
        dto.setAlertDate(alert.getAlertDate());
        dto.setResolved(alert.getResolved());
        return dto;
    }

    // ProviderProduct mappers
    public ProviderProductDTO toProviderProductDTO(ProviderProduct providerProduct) {
        if (providerProduct == null)
            return null;
        ProviderProductDTO dto = new ProviderProductDTO();
        dto.setProvideId(providerProduct.getProvideId());
        dto.setProviderId(providerProduct.getProvider().getProviderId());
        dto.setProviderName(providerProduct.getProvider().getName());
        dto.setProductId(providerProduct.getProduct().getProductId());
        dto.setProductName(providerProduct.getProduct().getProductName());
        dto.setQuantity(providerProduct.getQuantity());
        dto.setSupplyDate(providerProduct.getSupplyDate());
        dto.setCreatedBy(providerProduct.getCreatedBy());
        dto.setCreatedAt(providerProduct.getCreatedAt());
        dto.setUpdatedBy(providerProduct.getUpdatedBy());
        dto.setUpdatedAt(providerProduct.getUpdatedAt());
        return dto;
    }

    public ProviderProduct toProviderProduct(ProviderProductRequestDTO dto) {
        if (dto == null)
            return null;
        ProviderProduct providerProduct = new ProviderProduct();
        providerProduct.setQuantity(dto.getQuantity());
        providerProduct.setSupplyDate(dto.getSupplyDate() != null ? dto.getSupplyDate() : java.time.LocalDate.now());
        providerProduct.setCreatedBy(dto.getCreatedBy());
        return providerProduct;
    }

    // User mappers
    public UserDTO toUserDTO(User user) {
        if (user == null)
            return null;
        UserDTO dto = new UserDTO();
        dto.setUserId(user.getUserId());
        dto.setOwnerId(user.getOwnerId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRoleId(user.getRole().getRoleId());
        dto.setRoleName(user.getRole().getRoleName().name());
        dto.setPinUpToDate(user.getPinUpToDate());
        dto.setIsActive(user.getIsActive());
        dto.setLastLogin(user.getLastLogin());
        dto.setCreatedBy(user.getCreatedBy());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedBy(user.getUpdatedBy());
        dto.setUpdatedAt(user.getUpdatedAt());
        return dto;
    }

    // AuditLog mappers
    public AuditLogDTO toAuditLogDTO(AuditLog log) {
        if (log == null)
            return null;
        AuditLogDTO dto = new AuditLogDTO();
        dto.setLogId(log.getLogId());
        dto.setTableName(log.getTableName());
        dto.setActionType(log.getActionType());
        dto.setRecordId(log.getRecordId());
        dto.setPerformedBy(log.getPerformedBy());
        dto.setPerformedAt(log.getPerformedAt());
        dto.setDetails(log.getDetails());
        return dto;
    }
}
