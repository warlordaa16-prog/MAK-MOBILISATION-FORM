import { MobilizationEntry, SaveEntryPayload } from '../types';

const QUEUE_KEY = 'univmob_offline_queue';
const RECENT_ENTRIES_KEY = 'univmob_recent_entries';
const SESSION_COUNTER_KEY = 'univmob_session_counter';
const SELECTED_UNIVERSITY_KEY = 'univmob_selected_university';

export interface QueuedEntry extends SaveEntryPayload {
  queueId: string;
  queuedAt: string;
  temporaryEntry: MobilizationEntry;
}

export class OfflineQueueService {
  private static listeners: Array<() => void> = [];

  static subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private static notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error notifying queue subscriber', err);
      }
    });
  }

  static getQueue(): QueuedEntry[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addToQueue(payload: SaveEntryPayload): QueuedEntry {
    const queue = this.getQueue();
    const now = new Date();
    const queueId = 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Format local date and time
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const temporaryEntry: MobilizationEntry = {
      id: 'OFFLINE-' + queueId.slice(-6).toUpperCase(),
      fullName: payload.fullName,
      telephone: payload.telephone,
      university: payload.university,
      date: `${day}/${month}/${year}`,
      time: `${hours}:${minutes}`,
      timestamp: now.toISOString(),
      syncedToGoogleSheets: false,
      queuedOffline: true,
    };

    const queuedItem: QueuedEntry = {
      ...payload,
      queueId,
      queuedAt: now.toISOString(),
      temporaryEntry,
    };

    queue.push(queuedItem);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    // Also add to recent entries marked as offline
    this.addRecentEntry(temporaryEntry);
    this.incrementSessionCounter();
    this.notify();

    return queuedItem;
  }

  static removeFromQueue(queueId: string) {
    const queue = this.getQueue().filter((item) => item.queueId !== queueId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    this.notify();
  }

  static clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
    this.notify();
  }

  // Recent entries for fast local display
  static getRecentEntries(): MobilizationEntry[] {
    try {
      const data = localStorage.getItem(RECENT_ENTRIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addRecentEntry(entry: MobilizationEntry) {
    try {
      const recents = this.getRecentEntries();
      // Prepend and limit to 10
      const updated = [entry, ...recents.filter((e) => e.id !== entry.id)].slice(0, 10);
      localStorage.setItem(RECENT_ENTRIES_KEY, JSON.stringify(updated));
      this.notify();
    } catch (e) {
      console.warn('Could not save recent entry', e);
    }
  }

  static updateRecentEntryStatus(queueIdOrOfflineId: string, serverEntry: MobilizationEntry) {
    try {
      const recents = this.getRecentEntries();
      const updated = recents.map((item) => {
        if (item.id.includes(queueIdOrOfflineId) || item.telephone === serverEntry.telephone) {
          return {
            ...serverEntry,
            queuedOffline: false,
          };
        }
        return item;
      });
      localStorage.setItem(RECENT_ENTRIES_KEY, JSON.stringify(updated));
      this.notify();
    } catch (e) {
      console.warn('Could not update recent entry status', e);
    }
  }

  // Session Counter
  static getSessionCounter(): number {
    try {
      const val = sessionStorage.getItem(SESSION_COUNTER_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  static incrementSessionCounter(): number {
    const current = this.getSessionCounter();
    const next = current + 1;
    try {
      sessionStorage.setItem(SESSION_COUNTER_KEY, String(next));
    } catch {}
    this.notify();
    return next;
  }

  static resetSessionCounter() {
    try {
      sessionStorage.setItem(SESSION_COUNTER_KEY, '0');
    } catch {}
    this.notify();
  }

  // Persistent Selected University
  static getSelectedUniversity(): string | null {
    try {
      return localStorage.getItem(SELECTED_UNIVERSITY_KEY);
    } catch {
      return null;
    }
  }

  static setSelectedUniversity(universityName: string) {
    try {
      localStorage.setItem(SELECTED_UNIVERSITY_KEY, universityName);
    } catch {}
  }
}
