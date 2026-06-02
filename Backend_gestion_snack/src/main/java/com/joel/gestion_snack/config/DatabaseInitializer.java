
package com.joel.gestion_snack.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        log.info("Exécution des scripts de correction de la base de données...");

        try {
            // 1. Activer l'extension pgcrypto si elle n'existe pas
            jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto");
            log.info("Extension pgcrypto vérifiée/activée.");

            // 1b. Statut SERVED pour le flux cuisine → service
            jdbcTemplate.execute("ALTER TYPE order_status_type ADD VALUE IF NOT EXISTS 'SERVED'");
            log.info("Valeur SERVED ajoutée à order_status_type si nécessaire.");

            // 1c. Table revenue (utilisée par le chiffre d'affaires, absente du script SQL principal)
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS revenue (
                        revenue_id BIGSERIAL PRIMARY KEY,
                        date DATE NOT NULL UNIQUE,
                        amount NUMERIC(14,2) NOT NULL DEFAULT 0,
                        order_count INTEGER NOT NULL DEFAULT 0,
                        created_by VARCHAR(50),
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        updated_by VARCHAR(50),
                        updated_at TIMESTAMPTZ
                    )
                    """);
            log.info("Table revenue vérifiée/créée.");

            // 2. Supprimer le trigger dupliqué s'il existe
            jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_employees_ai ON employees");
            log.info("Trigger dupliqué trg_employees_ai supprimé.");

            // 3. Correction: trg_employee_after_insert_fn
            // Utilisation de ::text pour la comparaison safe et gestion des cas où le rôle
            // n'existe pas
            String fixEmployeeTrigger = "CREATE OR REPLACE FUNCTION trg_employee_after_insert_fn() " +
                    "RETURNS trigger LANGUAGE plpgsql AS $$ " +
                    "DECLARE " +
                    "    user_exists BOOLEAN; " +
                    "BEGIN " +
                    "    SELECT EXISTS(SELECT 1 FROM users WHERE email = NEW.email OR username = NEW.username) INTO user_exists; " +
                    "    IF user_exists THEN " +
                    "        PERFORM fn_audit_insert('employees', 'INSERT', NEW.employee_id::text, NEW.created_by); " +
                    "        RETURN NEW; " +
                    "    END IF; " +
                    " " +
                    "    IF NEW.role_id IS NOT NULL THEN " +
                    "        INSERT INTO users (owner_id, username, password, email, role_id, created_by) " +
                    "        VALUES (NEW.employee_id, NEW.username, crypt('1234', gen_salt('bf')), NEW.email, NEW.role_id, NEW.created_by); " +
                    "    END IF; " +
                    " " +
                    "    PERFORM fn_audit_insert('employees', 'INSERT', NEW.employee_id::text, NEW.created_by); " +
                    "    RETURN NEW; " +
                    "END; " +
                    "$$;";
            jdbcTemplate.execute(fixEmployeeTrigger);
            log.info("Fonction trg_employee_after_insert_fn corrigée.");

            // 4. Correction: trg_customer_after_insert_fn
            // Le compte User est créé actif (is_active=true) — la désactivation éventuelle
            // est gérée côté Java (CustomerServiceImpl) si l'email est configuré
            String fixCustomerTrigger = "CREATE OR REPLACE FUNCTION trg_customer_after_insert_fn() " +
                    "RETURNS trigger LANGUAGE plpgsql AS $$ " +
                    "DECLARE " +
                    "    r_id BIGINT; " +
                    "    user_exists BOOLEAN; " +
                    "BEGIN " +
                    "    SELECT EXISTS(SELECT 1 FROM users WHERE email = NEW.email OR username = NEW.username) INTO user_exists; " +
                    "    IF user_exists THEN " +
                    "        PERFORM fn_audit_insert('customers', 'INSERT', NEW.customer_id::text, NEW.created_by); " +
                    "        RETURN NEW; " +
                    "    END IF; " +
                    "    SELECT role_id INTO r_id FROM roles WHERE role_name::text = 'CUSTOMER' LIMIT 1; " +
                    "    IF r_id IS NULL THEN " +
                    "        RAISE EXCEPTION 'Role CUSTOMER not found'; " +
                    "    END IF; " +
                    "    INSERT INTO users (owner_id, username, password, email, role_id, created_by, is_active) " +
                    "    VALUES (NEW.customer_id, NEW.username, crypt('1234', gen_salt('bf')), NEW.email, r_id, NEW.created_by, true); "
                    +
                    " " +
                    "    PERFORM fn_audit_insert('customers', 'INSERT', NEW.customer_id::text, NEW.created_by); " +
                    "    RETURN NEW; " +
                    "END; " +
                    "$$;";
            jdbcTemplate.execute(fixCustomerTrigger);
            log.info("Fonction trg_customer_after_insert_fn corrigée.");

            // 5. Correction: trg_provider_after_insert_fn
            String fixProviderTrigger = "CREATE OR REPLACE FUNCTION trg_provider_after_insert_fn() " +
                    "RETURNS trigger LANGUAGE plpgsql AS $$ " +
                    "DECLARE " +
                    "    r_id BIGINT; " +
                    "    generated_username VARCHAR(50); " +
                    "BEGIN " +
                    "    SELECT role_id INTO r_id FROM roles WHERE role_name::text = 'PROVIDER' LIMIT 1; " +
                    "    IF r_id IS NULL THEN " +
                    "        RAISE EXCEPTION 'Role PROVIDER not found'; " +
                    "    END IF; " +
                    "    generated_username := LOWER(REPLACE(NEW.name, ' ', '.')) || NEW.provider_id; " +
                    "    INSERT INTO users (owner_id, username, password, email, role_id, created_by) " +
                    "    VALUES (NEW.provider_id, generated_username, crypt('1234', gen_salt('bf')), NEW.email, r_id, NEW.created_by); " +
                    " " +
                    "    PERFORM fn_audit_insert('provider', 'INSERT', NEW.provider_id::text, NEW.created_by); " +
                    "    RETURN NEW; " +
                    "END; " +
                    "$$;";
            jdbcTemplate.execute(fixProviderTrigger);
            log.info("Fonction trg_provider_after_insert_fn corrigée.");

            // 6. Correction: trg_orders_au_fn (Status Enum comparison)
            String fixOrdersTrigger = "CREATE OR REPLACE FUNCTION trg_orders_au_fn() " +
                    "RETURNS trigger LANGUAGE plpgsql AS $$ " +
                    "BEGIN " +
                    "    PERFORM fn_audit_insert('orders', 'UPDATE', OLD.order_id::text, NEW.updated_by); " +
                    " " +
                    "    IF OLD.status::text <> 'CANCELLED' AND NEW.status::text = 'CANCELLED' THEN " +
                    "        UPDATE products p " +
                    "        SET quantity_available = p.quantity_available + oi.quantity, " +
                    "            updated_at = CURRENT_TIMESTAMP " +
                    "        FROM order_items oi " +
                    "        WHERE oi.order_id = NEW.order_id AND oi.product_id = p.product_id; " +
                    "    END IF; " +
                    "    RETURN NEW; " +
                    "END; " +
                    "$$;";
            jdbcTemplate.execute(fixOrdersTrigger);
            log.info("Fonction trg_orders_au_fn corrigée.");

            // 7. Correction: trg_reservations_au_fn (Status Enum comparison)
            String fixReservationsTrigger = "CREATE OR REPLACE FUNCTION trg_reservations_au_fn() " +
                    "RETURNS trigger LANGUAGE plpgsql AS $$ " +
                    "BEGIN " +
                    "    PERFORM fn_audit_insert('reservations', 'UPDATE', OLD.reservation_id::text, NEW.updated_by); "
                    +
                    "    IF OLD.status::text <> 'CANCELLED' AND NEW.status::text = 'CANCELLED' THEN " +
                    "        UPDATE tables_snack SET status = 'FREE', updated_at = CURRENT_TIMESTAMP WHERE table_id = NEW.table_id; "
                    +
                    "    END IF; " +
                    "    RETURN NEW; " +
                    "END; " +
                    "$$;";
            jdbcTemplate.execute(fixReservationsTrigger);
            log.info("Fonction trg_reservations_au_fn corrigée.");

            // 8. Correction: triggers transactions (colonne idtransaction, pas transaction_id)
            jdbcTemplate.execute("""
                    CREATE OR REPLACE FUNCTION trg_transactions_ai_fn()
                    RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN
                        PERFORM fn_audit_insert('transactions','INSERT', NEW.idtransaction::text, NEW.created_by);
                        RETURN NEW;
                    END;
                    $$;
                    """);
            jdbcTemplate.execute("""
                    CREATE OR REPLACE FUNCTION trg_transactions_au_fn()
                    RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN
                        PERFORM fn_audit_insert('transactions','UPDATE', OLD.idtransaction::text, NEW.updated_by);
                        RETURN NEW;
                    END;
                    $$;
                    """);
            jdbcTemplate.execute("""
                    CREATE OR REPLACE FUNCTION trg_transactions_ad_fn()
                    RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN
                        PERFORM fn_audit_insert('transactions','DELETE', OLD.idtransaction::text, current_user);
                        RETURN OLD;
                    END;
                    $$;
                    """);
            log.info("Fonctions trg_transactions_* corrigées (colonne idtransaction).");

        } catch (Exception e) {
            log.error("Erreur lors de l'initialisation de la base de données", e);
        }
    }
}
