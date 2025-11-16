import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScheduledTransactionExecutorService } from './services/scheduled-transaction-executor.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('equals');

  constructor(private scheduledExecutor: ScheduledTransactionExecutorService) {}

  ngOnInit(): void {
    // El servicio de ejecución automática se inicializa automáticamente
    // al inyectarse y comienza a verificar transacciones programadas
  }
}
