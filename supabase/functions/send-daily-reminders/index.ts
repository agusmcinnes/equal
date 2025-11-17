// Supabase Edge Function: Send Daily Reminders for Scheduled Transactions
// Runs every day at 9:00 AM to send email reminders to users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { generateReminderEmailHTML, generateReminderEmailText } from "./email-template.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledTransactionWithDetails {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  next_execution_date: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  wallet_name?: string;
  wallet_provider?: string;
}

interface UserReminder {
  userId: string;
  userEmail: string;
  userName: string;
  transactions: ScheduledTransactionWithDetails[];
}

interface EmailResult {
  userId: string;
  userEmail: string;
  success: boolean;
  error?: string;
  transactionCount: number;
}

// Send email using Resend API
async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  text: string,
  resendApiKey: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Equals <noreply@equalsgestion.com>',
        to: [to],
        subject: subject,
        html: html,
        text: text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return {
      success: true,
      messageId: data.id
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable. Please configure it in Supabase Dashboard > Settings > Edge Functions > Secrets');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting daily reminders process...');

    // Get today's date at start of day (local timezone)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    console.log(`Checking for scheduled transactions between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);

    // Query scheduled transactions for today from the view
    const { data: scheduledTransactions, error: queryError } = await supabase
      .from('scheduled_transactions_with_details')
      .select('*')
      .eq('is_active', true)
      .gte('next_execution_date', todayStart.toISOString())
      .lt('next_execution_date', todayEnd.toISOString());

    if (queryError) {
      console.error('Error querying scheduled transactions:', queryError);
      throw queryError;
    }

    console.log(`Found ${scheduledTransactions?.length || 0} scheduled transactions for today`);

    if (!scheduledTransactions || scheduledTransactions.length === 0) {
      return new Response(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          message: 'No scheduled transactions for today. No emails sent.',
          totalUsers: 0,
          emailsSent: 0,
          results: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Group transactions by user
    const userTransactionsMap = new Map<string, ScheduledTransactionWithDetails[]>();

    for (const tx of scheduledTransactions) {
      if (!userTransactionsMap.has(tx.user_id)) {
        userTransactionsMap.set(tx.user_id, []);
      }
      userTransactionsMap.get(tx.user_id)!.push(tx as ScheduledTransactionWithDetails);
    }

    console.log(`Grouped into ${userTransactionsMap.size} users`);

    // Get user details from auth.users
    const userReminders: UserReminder[] = [];

    for (const [userId, transactions] of userTransactionsMap.entries()) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

      if (userError || !userData.user) {
        console.error(`Error getting user ${userId}:`, userError);
        continue;
      }

      if (!userData.user.email) {
        console.warn(`User ${userId} has no email address`);
        continue;
      }

      // Get user name from metadata or use email
      const userName = userData.user.user_metadata?.name ||
                      userData.user.user_metadata?.full_name ||
                      userData.user.email.split('@')[0];

      userReminders.push({
        userId: userId,
        userEmail: userData.user.email,
        userName: userName,
        transactions: transactions
      });
    }

    console.log(`Prepared ${userReminders.length} user reminders`);

    // Send emails
    const emailResults: EmailResult[] = [];
    const dateStr = today.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    for (const reminder of userReminders) {
      console.log(`Sending email to ${reminder.userEmail} (${reminder.transactions.length} transactions)`);

      const html = generateReminderEmailHTML(
        reminder.userName,
        reminder.transactions,
        dateStr
      );

      const text = generateReminderEmailText(
        reminder.userName,
        reminder.transactions,
        dateStr
      );

      const subject = `📅 Recordatorio: Tienes ${reminder.transactions.length} ${reminder.transactions.length === 1 ? 'transacción programada' : 'transacciones programadas'} para hoy`;

      const emailResult = await sendEmailViaResend(
        reminder.userEmail,
        subject,
        html,
        text,
        resendApiKey
      );

      emailResults.push({
        userId: reminder.userId,
        userEmail: reminder.userEmail,
        success: emailResult.success,
        error: emailResult.error,
        transactionCount: reminder.transactions.length
      });

      if (emailResult.success) {
        console.log(`✅ Email sent successfully to ${reminder.userEmail} (Message ID: ${emailResult.messageId})`);
      } else {
        console.error(`❌ Failed to send email to ${reminder.userEmail}: ${emailResult.error}`);
      }
    }

    // Prepare summary
    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.filter(r => !r.success).length;

    const response = {
      timestamp: new Date().toISOString(),
      date: dateStr,
      totalUsers: userReminders.length,
      emailsSent: successCount,
      emailsFailed: failureCount,
      totalTransactions: scheduledTransactions.length,
      results: emailResults,
      message: `Sent ${successCount} email${successCount !== 1 ? 's' : ''} to users with scheduled transactions for today. ${failureCount} failed.`
    };

    console.log('Summary:', response.message);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Fatal error in daily reminders function:', error);

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
