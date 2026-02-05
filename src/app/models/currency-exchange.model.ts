export interface CurrencyExchange {
  id?: string;
  user_id?: string;
  operation_type: 'buy_usd' | 'sell_usd';
  exchange_rate: number;
  rate_source: 'blue' | 'oficial' | 'custom';
  source_amount: number;
  source_currency: string;
  destination_amount: number;
  destination_currency: string;
  source_transaction_id?: string;
  destination_transaction_id?: string;
  source_wallet_id?: string;
  destination_wallet_id?: string;
  notes?: string;
  executed_at?: string;
  created_at?: string;
}

export interface CurrencyExchangeWithDetails extends CurrencyExchange {
  source_wallet_name?: string;
  source_wallet_provider?: string;
  destination_wallet_name?: string;
  destination_wallet_provider?: string;
}

export interface ExchangePreview {
  operation_type: 'buy_usd' | 'sell_usd';
  source_amount: number;
  source_currency: string;
  destination_amount: number;
  destination_currency: string;
  exchange_rate: number;
  rate_source: 'blue' | 'oficial' | 'custom';
}

export interface ExchangeFormData {
  operation_type: 'buy_usd' | 'sell_usd';
  amount: number;
  exchange_rate: number;
  rate_source: 'blue' | 'oficial' | 'custom';
  source_wallet_id: string;
  destination_wallet_id: string;
  notes?: string;
}
