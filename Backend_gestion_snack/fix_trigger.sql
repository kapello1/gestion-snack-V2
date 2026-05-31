-- Fix for trg_employee_after_insert_fn to resolve enum type comparison error
CREATE OR REPLACE FUNCTION trg_employee_after_insert_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    r_id BIGINT;
    user_exists BOOLEAN;
    target_role VARCHAR;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = NEW.email OR username = NEW.username) INTO user_exists;
    IF user_exists THEN
        PERFORM fn_audit_insert('employees', 'INSERT', NEW.employee_id::text, NEW.created_by);
        RETURN NEW;
    END IF;

    -- Normalize target role
    target_role := UPPER(NEW.position);

    -- Search for role with explicit text cast to avoid operator errors
    SELECT role_id INTO r_id FROM roles WHERE role_name::text = target_role LIMIT 1;

    -- Fallback if role not found (e.g., Manager -> WAITER)
    IF r_id IS NULL THEN
        SELECT role_id INTO r_id FROM roles WHERE role_name::text = 'WAITER' LIMIT 1;
    END IF;

    IF r_id IS NOT NULL THEN
        INSERT INTO users (owner_id, username, password_hash, email, role_id, created_by)
        VALUES (NEW.employee_id, NEW.username, crypt('1234', gen_salt('bf')), NEW.email, r_id, NEW.created_by);
    END IF;

    PERFORM fn_audit_insert('employees','INSERT', NEW.employee_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
