/**
 * Hybrid notification batching to prevent spam
 * - First reaction per photo: Immediate push notification
 * - Subsequent reactions: Batched within 2-minute window
 * - In-app notifications: Always immediate (no batching)
 */

type PendingBatch = {
  playerId: string;
  photoId: string;
  reactorNames: Set<string>;
  reactionCount: number;
  timer: ReturnType<typeof setTimeout>;
};

const BATCH_DELAY = 2 * 60 * 1000; // 2 minutes
const pendingBatches = new Map<string, PendingBatch>(); // key = `${photoId}-${playerId}`
const firstNotificationSent = new Map<string, Set<string>>(); // photoId → Set<playerId>

export const ReactionBatchingService = {
  /**
   * Queue a reaction notification with hybrid batching
   * First reaction sends immediately, subsequent reactions batched
   */
  queueReaction(
    photoId: string,
    playerId: string,
    reactorName: string,
    sendImmediate: () => Promise<void>,
    sendBatched: (count: number, names: string[]) => Promise<void>
  ): void {
    const batchKey = `${photoId}-${playerId}`;
    
    // Check if this is the first notification for this photo+player combo
    if (!firstNotificationSent.has(photoId)) {
      firstNotificationSent.set(photoId, new Set());
    }
    
    const isFirstNotification = !firstNotificationSent.get(photoId)?.has(playerId);
    
    if (isFirstNotification) {
      // Send immediately for first reaction
      sendImmediate().then(() => {
        console.log(`🔔 First reaction notification sent immediately for photo ${photoId}`);
      }).catch((error) => {
        console.error('❌ Failed to send immediate notification:', error);
      });
      
      // Mark as sent
      firstNotificationSent.get(photoId)!.add(playerId);
      
      // Start batch timer for subsequent reactions
      const timer = setTimeout(() => {
        this.sendBatchedNotification(batchKey, sendBatched);
      }, BATCH_DELAY);
      
      pendingBatches.set(batchKey, {
        playerId,
        photoId,
        reactorNames: new Set([reactorName]),
        reactionCount: 1,
        timer,
      });
      
      console.log(`⏱️ Batch timer started for photo ${photoId}, player ${playerId}`);
    } else {
      // Add to existing batch
      const existing = pendingBatches.get(batchKey);
      
      if (existing) {
        // Clear old timer and reset
        clearTimeout(existing.timer);
        
        existing.reactorNames.add(reactorName);
        existing.reactionCount += 1;
        
        // Set new timer
        const timer = setTimeout(() => {
          this.sendBatchedNotification(batchKey, sendBatched);
        }, BATCH_DELAY);
        
        existing.timer = timer;
        pendingBatches.set(batchKey, existing);
        
        console.log(`📊 Added to batch: ${existing.reactionCount} reactions from ${existing.reactorNames.size} people`);
      } else {
        // Create new batch (shouldn't happen, but handle it)
        const timer = setTimeout(() => {
          this.sendBatchedNotification(batchKey, sendBatched);
        }, BATCH_DELAY);
        
        pendingBatches.set(batchKey, {
          playerId,
          photoId,
          reactorNames: new Set([reactorName]),
          reactionCount: 1,
          timer,
        });
      }
    }
  },

  /**
   * Send batched notification after delay
   */
  async sendBatchedNotification(
    batchKey: string,
    sendBatched: (count: number, names: string[]) => Promise<void>
  ): Promise<void> {
    const batch = pendingBatches.get(batchKey);
    if (!batch) return;

    try {
      const names = Array.from(batch.reactorNames);
      await sendBatched(batch.reactionCount, names);
      console.log(`✅ Batched notification sent: ${batch.reactionCount} reactions from ${names.length} people`);
    } catch (error) {
      console.error('❌ Failed to send batched notification:', error);
    } finally {
      pendingBatches.delete(batchKey);
    }
  },

  /**
   * Cancel pending batch for a photo+player
   */
  cancelPending(photoId: string, playerId: string): void {
    const batchKey = `${photoId}-${playerId}`;
    const batch = pendingBatches.get(batchKey);
    
    if (batch) {
      clearTimeout(batch.timer);
      pendingBatches.delete(batchKey);
      console.log('🚫 Cancelled pending batch:', batchKey);
    }
  },

  /**
   * Clear all pending batches (cleanup)
   */
  clearAll(): void {
    pendingBatches.forEach((batch) => {
      clearTimeout(batch.timer);
    });
    pendingBatches.clear();
    firstNotificationSent.clear();
    console.log('🧹 Cleared all pending batches');
  },

  /**
   * Reset first notification tracking for a photo (for testing)
   */
  resetFirstNotification(photoId: string): void {
    firstNotificationSent.delete(photoId);
    console.log('🔄 Reset first notification tracking for photo:', photoId);
  },

  /**
   * Get pending batch info (for debugging)
   */
  getPendingInfo(photoId: string, playerId: string): PendingBatch | undefined {
    const batchKey = `${photoId}-${playerId}`;
    return pendingBatches.get(batchKey);
  },

  /**
   * Get total pending notification count (for debugging)
   */
  getPendingCount(): number {
    return Array.from(pendingBatches.values())
      .reduce((sum, batch) => sum + batch.reactionCount, 0);
  },
};