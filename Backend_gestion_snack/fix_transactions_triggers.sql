CREATE OR REPLACE FUNCTION trg_transactions_ai_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('transactions','INSERT', NEW.idtransaction::text, NEW.created_by);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_transactions_au_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('transactions','UPDATE', OLD.idtransaction::text, NEW.updated_by);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_transactions_ad_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('transactions','DELETE', OLD.idtransaction::text, current_user);
    RETURN OLD;
END;
$$;
