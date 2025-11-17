-- Create triggers to automatically synchronize goal current_amount with linked transactions
-- This ensures data consistency between goals and their transactions

-- Function to recalculate goal current_amount based on goal_movements
CREATE OR REPLACE FUNCTION recalculate_goal_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id uuid;
  v_new_amount numeric;
  v_target_amount numeric;
BEGIN
  -- Determine which goal_id to recalculate
  IF TG_OP = 'DELETE' THEN
    v_goal_id := OLD.goal_id;
  ELSE
    v_goal_id := NEW.goal_id;
  END IF;

  -- Calculate new current_amount from goal_movements
  SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
  INTO v_new_amount
  FROM goal_movements
  WHERE goal_id = v_goal_id;

  -- Ensure amount is not negative
  v_new_amount := GREATEST(v_new_amount, 0);

  -- Get target_amount to check completion
  SELECT target_amount INTO v_target_amount
  FROM goals
  WHERE id = v_goal_id;

  -- Update the goal with new amount and completion status
  UPDATE goals
  SET
    current_amount = v_new_amount,
    is_completed = (v_new_amount >= v_target_amount),
    completed_at = CASE
      WHEN v_new_amount >= v_target_amount AND NOT is_completed THEN NOW()
      WHEN v_new_amount < v_target_amount THEN NULL
      ELSE completed_at
    END,
    updated_at = NOW()
  WHERE id = v_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on goal_movements INSERT/UPDATE/DELETE
CREATE TRIGGER trigger_goal_movements_sync
AFTER INSERT OR UPDATE OR DELETE ON goal_movements
FOR EACH ROW
EXECUTE FUNCTION recalculate_goal_amount();

-- Function to validate goal movement matches goal currency
CREATE OR REPLACE FUNCTION validate_goal_movement_currency()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_currency varchar(8);
  v_wallet_currency varchar(8);
BEGIN
  -- Get goal currency
  SELECT currency INTO v_goal_currency
  FROM goals
  WHERE id = NEW.goal_id;

  -- If wallet_id is provided, validate currency matches
  IF NEW.wallet_id IS NOT NULL THEN
    SELECT currency INTO v_wallet_currency
    FROM wallets
    WHERE id = NEW.wallet_id;

    IF v_wallet_currency != v_goal_currency THEN
      RAISE EXCEPTION 'Wallet currency (%) does not match goal currency (%)', v_wallet_currency, v_goal_currency;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate currency before inserting/updating goal_movements
CREATE TRIGGER trigger_validate_goal_movement_currency
BEFORE INSERT OR UPDATE ON goal_movements
FOR EACH ROW
EXECUTE FUNCTION validate_goal_movement_currency();

-- Add comments
COMMENT ON FUNCTION recalculate_goal_amount() IS 'Automatically recalculates goal current_amount and completion status when movements change';
COMMENT ON FUNCTION validate_goal_movement_currency() IS 'Validates that wallet currency matches goal currency before creating a movement';
