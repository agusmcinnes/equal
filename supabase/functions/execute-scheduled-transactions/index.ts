// Supabase Edge Function: Execute Scheduled Transactions
// Runs every 5 minutes to check and execute pending scheduled transactions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for allowing requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface definitions
interface ScheduledTransactionRow {
  id: string;
  user_id: string;
  description: string;
  category_id: string | null;
  amount: number;
  currency: string;
  crypto_type: string | null;
  wallet_id: string | null;
  type: 'income' | 'expense';
  start_date: string;
  end_date: string | null;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'bi-annual' | 'yearly';
  last_execution_date: string | null;
  next_execution_date: string;
  is_active: boolean;
}

interface ExecutionResult {
  transactionId: string;
  scheduledId: string;
  success: boolean;
  error?: string;
  description: string;
}

// Calculate next execution date based on frequency
function calculateNextExecutionDate(currentDate: Date, frequency: string): string {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'bi-annual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
  }

  return nextDate.toISOString();
}

// Main function to execute a single scheduled transaction
async function executeScheduledTransaction(
  supabase: any,
  scheduled: ScheduledTransactionRow
): Promise<ExecutionResult> {
  const now = new Date();
  const nextExecutionDate = new Date(scheduled.next_execution_date);

  try {
    // Verify that execution date has arrived
    if (nextExecutionDate > now) {
      return {
        transactionId: '',
        scheduledId: scheduled.id,
        success: false,
        error: 'Execution date not yet reached',
        description: scheduled.description
      };
    }

    // Check if scheduled transaction has expired
    if (scheduled.end_date) {
      const endDate = new Date(scheduled.end_date);
      if (endDate < now) {
        // Deactivate expired transaction
        await supabase
          .from('scheduled_transactions')
          .update({ is_active: false })
          .eq('id', scheduled.id);

        return {
          transactionId: '',
          scheduledId: scheduled.id,
          success: true,
          error: 'Expired and deactivated',
          description: scheduled.description
        };
      }
    }

    // Create transaction in transactions table
    // Note: recurring_id is set to null because scheduled_transactions
    // is a separate system from recurring_transactions
    const { data: newTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: scheduled.user_id,
        date: now.toISOString(),
        description: scheduled.description,
        category_id: scheduled.category_id,
        amount: scheduled.amount,
        currency: scheduled.currency,
        crypto_type: scheduled.crypto_type,
        wallet_id: scheduled.wallet_id,
        type: scheduled.type,
        is_recurring: true,
        recurring_id: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating transaction:', insertError);
      return {
        transactionId: '',
        scheduledId: scheduled.id,
        success: false,
        error: insertError.message,
        description: scheduled.description
      };
    }

    // Calculate next execution date
    const newNextExecutionDate = calculateNextExecutionDate(
      nextExecutionDate,
      scheduled.frequency
    );

    // Update scheduled transaction
    const { error: updateError } = await supabase
      .from('scheduled_transactions')
      .update({
        last_execution_date: now.toISOString(),
        next_execution_date: newNextExecutionDate
      })
      .eq('id', scheduled.id);

    if (updateError) {
      console.error('Error updating scheduled transaction:', updateError);
      // Transaction was created but update failed - log warning
      return {
        transactionId: newTransaction.id,
        scheduledId: scheduled.id,
        success: true,
        error: `Warning: Transaction created but failed to update schedule: ${updateError.message}`,
        description: scheduled.description
      };
    }

    return {
      transactionId: newTransaction.id,
      scheduledId: scheduled.id,
      success: true,
      description: scheduled.description
    };

  } catch (error) {
    console.error('Unexpected error executing scheduled transaction:', error);
    return {
      transactionId: '',
      scheduledId: scheduled.id,
      success: false,
      error: error.message || 'Unknown error',
      description: scheduled.description
    };
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting scheduled transactions execution check...');

    // Query pending scheduled transactions using the view
    const { data: pendingTransactions, error: queryError } = await supabase
      .from('pending_scheduled_transactions')
      .select('*');

    if (queryError) {
      console.error('Error querying pending transactions:', queryError);
      throw queryError;
    }

    console.log(`Found ${pendingTransactions?.length || 0} pending scheduled transactions`);

    const results: ExecutionResult[] = [];

    // Execute each pending transaction
    if (pendingTransactions && pendingTransactions.length > 0) {
      for (const scheduled of pendingTransactions) {
        const result = await executeScheduledTransaction(supabase, scheduled as ScheduledTransactionRow);
        results.push(result);

        // Log each execution
        console.log(`Executed scheduled transaction ${scheduled.id}:`,
          result.success ? 'SUCCESS' : `FAILED - ${result.error}`);
      }
    }

    // Prepare summary response
    const successCount = results.filter(r => r.success && !r.error).length;
    const failureCount = results.filter(r => !r.success).length;
    const warningCount = results.filter(r => r.success && r.error).length;

    const response = {
      timestamp: new Date().toISOString(),
      totalChecked: pendingTransactions?.length || 0,
      executed: successCount,
      warnings: warningCount,
      failures: failureCount,
      results: results,
      message: `Processed ${results.length} scheduled transactions. ${successCount} successful, ${warningCount} warnings, ${failureCount} failed.`
    };

    console.log('Execution summary:', response.message);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Fatal error in scheduled transactions executor:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
