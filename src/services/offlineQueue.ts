import { MobilizationEntry, SaveEntryPayload } from '../types';

const QUEUE_KEY = 'univmob_offline_queue';
const RECENT_ENTRIES_KEY = 'univmob_recent_entries';
const SESSION_COUNTER_KEY = 'univmob_session_counter';
const SELECTED_UNIVERSITY_KEY = 'univmob_selected_university';
const MANUAL_OFFLINE_KEY = 'univmob_manual_offline_mode';
const SOUND_ENABLED_KEY = 'univmob_sound_feedback';

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

  // Manual Offline Work Mode (Allows field mobilizers to intentionally work offline to save battery & data bundles)
  static isManualOffline(): boolean {
    try {
      return localStorage.getItem(MANUAL_OFFLINE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  static setManualOffline(enabled: boolean) {
    try {
      localStorage.setItem(MANUAL_OFFLINE_KEY, enabled ? 'true' : 'false');
    } catch {}
    this.notify();
  }

  static toggleManualOffline(): boolean {
    const next = !this.isManualOffline();
    this.setManualOffline(next);
    return next;
  }

  static isEffectivelyOffline(): boolean {
    if (this.isManualOffline()) return true;
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  // Audio / Sound Feedback for rapid tactile confirmation
  static isSoundEnabled(): boolean {
    try {
      const val = localStorage.getItem(SOUND_ENABLED_KEY);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  }

  static setSoundEnabled(enabled: boolean) {
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch {}
    this.notify();
  }

  static playSuccessChime(isOffline = false) {
    if (!this.isSoundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Pitch: 880Hz (A5) for online, 660Hz (E5) for offline
      osc.frequency.setValueAtTime(isOffline ? 659.25 : 880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isOffline ? 880 : 1318.5, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Audio playback silent fail
    }
  }

  // Queue storage
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

    // Format East African / local date and time
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // Sequential clean offline ID
    const offlineNum = queue.length + 1;
    const temporaryEntry: MobilizationEntry = {
      id: `OFF-${String(offlineNum).padStart(3, '0')}`,
      fullName: payload.fullName.trim(),
      telephone: payload.telephone,
      university: payload.university,
      date: `${day}/${month}/${year}`,
      time: `${hours}:${minutes}`,
      timestamp: now.toISOString(),
      syncedToGoogleSheets: false,
      queuedOffline: true,
      mobilizerName: payload.mobilizerName || 'Field Mobilizer',
      mobilizationMethod: payload.mobilizationMethod || 'Campus Gate / Main Entrance',
      intakeMethod: payload.intakeMethod || 'rapid-single',
      notes: payload.notes,
    };

    const queuedItem: QueuedEntry = {
      ...payload,
      fullName: payload.fullName.trim(),
      queueId,
      queuedAt: now.toISOString(),
      temporaryEntry,
    };

    queue.push(queuedItem);
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to store queue item', e);
    }

    // Also add to recent entries marked as offline
    this.addRecentEntry(temporaryEntry);
    this.incrementSessionCounter();
    this.playSuccessChime(true);
    this.notify();

    return queuedItem;
  }

  static addMultipleToQueue(payloads: SaveEntryPayload[]): QueuedEntry[] {
    const queue = this.getQueue();
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const added: QueuedEntry[] = [];
    let curCount = queue.length;

    for (const payload of payloads) {
      curCount++;
      const queueId = 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const temporaryEntry: MobilizationEntry = {
        id: `OFF-${String(curCount).padStart(3, '0')}`,
        fullName: payload.fullName.trim(),
        telephone: payload.telephone,
        university: payload.university,
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}`,
        timestamp: now.toISOString(),
        syncedToGoogleSheets: false,
        queuedOffline: true,
        mobilizerName: payload.mobilizerName || 'Field Mobilizer',
        mobilizationMethod: payload.mobilizationMethod || 'Campus Gate / Main Entrance',
        intakeMethod: payload.intakeMethod || 'multi-part',
        notes: payload.notes,
      };

      const item: QueuedEntry = {
        ...payload,
        fullName: payload.fullName.trim(),
        queueId,
        queuedAt: now.toISOString(),
        temporaryEntry,
      };

      queue.push(item);
      added.push(item);
      this.addRecentEntry(temporaryEntry);
    }

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to store batch queue items', e);
    }

    this.incrementSessionCounter(added.length);
    this.playSuccessChime(true);
    this.notify();

    return added;
  }

  static removeFromQueue(queueId: string) {
    const queue = this.getQueue().filter((item) => item.queueId !== queueId && item.temporaryEntry.id !== queueId);
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
    this.notify();
  }

  static clearQueue() {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {}
    this.notify();
  }

  // Reliable Synchronization Engine
  static async syncQueue(): Promise<{ success: boolean; syncedCount: number; message?: string }> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return { success: true, syncedCount: 0, message: 'Queue is already empty.' };
    }

    try {
      const response = await fetch('/api/entries/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: queue }),
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with status ${response.status}`);
      }

      const data = await response.json();
      let successfulRemovals = 0;

      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((res: any) => {
          if (res.success) {
            successfulRemovals++;
            if (res.queueId) {
              this.removeFromQueue(res.queueId);
            }
            if (res.entry) {
              this.updateRecentEntryStatus(res.queueId, res.entry);
            }
          }
        });
      } else if (data.success) {
        // Fallback: entire batch succeeded
        this.clearQueue();
        successfulRemovals = queue.length;
      }

      this.notify();
      return {
        success: true,
        syncedCount: data.syncedCount || successfulRemovals,
        message: `Successfully synchronized ${data.syncedCount || successfulRemovals} offline record(s) to Google Sheets!`,
      };
    } catch (err: any) {
      console.warn('Sync failed:', err);
      return {
        success: false,
        syncedCount: 0,
        message: err?.message || 'Synchronization failed. Records remain safely stored locally.',
      };
    }
  }

  // Export queued items as CSV directly from browser
  static exportQueueCSV() {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    const headers = ['Offline ID', 'Full Name', 'Telephone', 'University', 'Queued At'];
    const rows = queue.map((q) => [
      `"${q.temporaryEntry.id}"`,
      `"${q.fullName.replace(/"/g, '""')}"`,
      `"${q.telephone}"`,
      `"${q.university.replace(/"/g, '""')}"`,
      `"${q.queuedAt}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `offline_mobilization_queue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Universal Data Safe-Keep: Download all stored data (both offline queue and cached records)
  static exportAllKeptData(format: 'csv' | 'json' = 'csv') {
    const queue = this.getQueue().map((q) => q.temporaryEntry);
    const recents = this.getRecentEntries();
    
    // De-duplicate by phone or ID
    const seenPhones = new Set<string>();
    const combined: MobilizationEntry[] = [];
    
    [...queue, ...recents].forEach((item) => {
      if (!seenPhones.has(item.telephone)) {
        seenPhones.add(item.telephone);
        combined.push(item);
      }
    });

    if (combined.length === 0) {
      // If client cache is empty, trigger server download
      window.location.href = `/api/entries/export-kept?format=${format}`;
      return;
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ count: combined.length, entries: combined }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kept_mobilization_data_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // CSV format
    const headers = ['ID', 'Full Name', 'Telephone', 'University', 'Date', 'Time', 'Mobilizer', 'Outreach Method', 'Intake Channel', 'Sync Status'];
    const rows = combined.map((e) => [
      `"${e.id}"`,
      `"${(e.fullName || '').replace(/"/g, '""')}"`,
      `"${e.telephone}"`,
      `"${(e.university || '').replace(/"/g, '""')}"`,
      `"${e.date}"`,
      `"${e.time}"`,
      `"${(e.mobilizerName || 'Field Mobilizer').replace(/"/g, '""')}"`,
      `"${(e.mobilizationMethod || 'Direct Outreach').replace(/"/g, '""')}"`,
      `"${(e.intakeMethod || 'rapid-single').replace(/"/g, '""')}"`,
      `"${e.queuedOffline ? 'KEPT OFFLINE' : e.syncedToGoogleSheets ? 'SYNCED' : 'PENDING'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kept_mobilization_data_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      // Prepend and limit to 15
      const updated = [entry, ...recents.filter((e) => e.id !== entry.id && e.telephone !== entry.telephone)].slice(0, 15);
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
        if (
          item.id === queueIdOrOfflineId ||
          item.id.includes(queueIdOrOfflineId) ||
          item.telephone === serverEntry.telephone
        ) {
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

  static incrementSessionCounter(by: number = 1): number {
    const current = this.getSessionCounter();
    const next = current + by;
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
