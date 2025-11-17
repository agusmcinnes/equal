export interface Goal {
  id?: string;
  user_id?: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  category: string;
  currency?: string; // 'ARS', 'USD', 'EUR', 'CRYPTO'
  wallet_id?: string; // Optional wallet association
  icon?: string;
  color?: string;
  target_date?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GoalMovement {
  id?: string;
  goal_id: string;
  user_id?: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description?: string;
  transaction_id?: string; // Linked transaction for balance tracking
  wallet_id?: string; // Wallet used for this movement
  created_at?: string;
}

export interface GoalWithMovements extends Goal {
  movements?: GoalMovement[];
}
