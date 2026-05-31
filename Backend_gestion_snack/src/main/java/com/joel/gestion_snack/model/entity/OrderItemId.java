package com.joel.gestion_snack.model.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Objects;

/**
 * Clé composite pour OrderItem
 * Les noms des champs doivent correspondre aux noms des champs @Id dans OrderItem
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemId implements Serializable {
    
    private Long order;
    private Long product;
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OrderItemId that = (OrderItemId) o;
        return Objects.equals(order, that.order) && Objects.equals(product, that.product);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(order, product);
    }
}

