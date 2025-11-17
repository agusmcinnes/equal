// Email template for daily scheduled transactions reminders

interface ScheduledTransactionEmail {
  id: string;
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

export function generateReminderEmailHTML(
  userName: string,
  transactions: ScheduledTransactionEmail[],
  date: string
): string {
  const transactionsHTML = transactions.map(tx => {
    const icon = tx.type === 'income' ? '💰' : '💸';
    const typeLabel = tx.type === 'income' ? 'Ingreso' : 'Gasto';
    const typeColor = tx.type === 'income' ? '#22c55e' : '#ef4444';

    const time = new Date(tx.next_execution_date).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const categoryEmoji = tx.category_icon || '📂';
    const walletEmoji = '💳';

    return `
      <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid ${typeColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">${icon}</span>
            <div>
              <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px;">
                ${tx.description}
              </div>
              <div style="font-size: 12px; color: #6b7280;">
                ${typeLabel}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 700; color: ${typeColor};">
              $${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tx.currency}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              ⏰ ${time}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 16px; padding-top: 12px; border-top: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;">
          ${tx.category_name ? `<div>${categoryEmoji} ${tx.category_name}</div>` : ''}
          ${tx.wallet_name ? `<div>${walletEmoji} ${tx.wallet_name}${tx.wallet_provider ? ` (${tx.wallet_provider})` : ''}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const summaryHTML = `
    <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-top: 24px; margin-bottom: 24px;">
      <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 12px;">
        📊 Resumen del día
      </div>
      <div style="display: flex; justify-content: space-around; gap: 16px;">
        ${totalIncome > 0 ? `
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Ingresos</div>
            <div style="font-size: 18px; font-weight: 700; color: #22c55e;">
              +$${totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ` : ''}
        ${totalExpense > 0 ? `
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Gastos</div>
            <div style="font-size: 18px; font-weight: 700; color: #ef4444;">
              -$${totalExpense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio de Transacciones Programadas</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #463397, #9850eb); color: white; padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 8px;">📅</div>
          <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">
            Transacciones Programadas
          </h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">
            ${date}
          </p>
        </div>

        <!-- Body -->
        <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151;">
            Hola <strong>${userName}</strong>,
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151;">
            Tienes <strong>${transactions.length} ${transactions.length === 1 ? 'transacción programada' : 'transacciones programadas'}</strong> para hoy:
          </p>

          <!-- Transactions List -->
          ${transactionsHTML}

          <!-- Summary -->
          ${summaryHTML}

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://tu-app-url.com" style="display: inline-block; background: linear-gradient(135deg, #463397, #9850eb); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Ver en la App
            </a>
          </div>

          <!-- Info Box -->
          <div style="background: #eff6ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; margin-top: 24px;">
            <div style="display: flex; align-items: flex-start; gap: 8px;">
              <span style="font-size: 16px;">ℹ️</span>
              <div style="font-size: 13px; color: #0369a1; line-height: 1.5;">
                Estas transacciones se ejecutarán automáticamente en las horas indicadas. No necesitas hacer nada, solo queremos que estés informado.
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">
            Este es un recordatorio automático de <strong>Equals</strong>
          </p>
          <p style="margin: 0;">
            © ${new Date().getFullYear()} Equals - Financial Management App
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateReminderEmailText(
  userName: string,
  transactions: ScheduledTransactionEmail[],
  date: string
): string {
  const transactionsList = transactions.map((tx, index) => {
    const icon = tx.type === 'income' ? '💰' : '💸';
    const time = new Date(tx.next_execution_date).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `
${index + 1}. ${icon} ${tx.description}
   Monto: $${tx.amount.toLocaleString('es-AR')} ${tx.currency}
   Hora: ${time}
   ${tx.category_name ? `Categoría: ${tx.category_name}` : ''}
   ${tx.wallet_name ? `Billetera: ${tx.wallet_name}` : ''}
`;
  }).join('\n');

  return `
📅 Transacciones Programadas - ${date}

Hola ${userName},

Tienes ${transactions.length} ${transactions.length === 1 ? 'transacción programada' : 'transacciones programadas'} para hoy:

${transactionsList}

Estas transacciones se ejecutarán automáticamente en las horas indicadas.

---
© ${new Date().getFullYear()} Equals - Financial Management App
  `.trim();
}
