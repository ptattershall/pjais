import { SecurityEvent } from '../../shared/types/security';

const MAX_EVENTS = 1000;
const PRUNE_SIZE = 500;

export class SecurityEventLogger {
  private events: SecurityEvent[] = [];

  log(event: SecurityEvent): void {
    this.events.push(event);

    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-PRUNE_SIZE);
    }

    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn(`[SECURITY] ${event.severity.toUpperCase()}: ${event.description}`, event.details || '');
    }
  }

  getEvents(limit?: number): SecurityEvent[] {
    const sortedEvents = [...this.events].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sortedEvents.slice(0, limit) : sortedEvents;
  }

  async saveEvents(): Promise<void> {
    // In a real implementation, this would save events to a secure log file.
    console.log('Security events saved (simulation).');
    // For demonstration, we just clear the in-memory log on save.
    this.events = [];
  }
} 