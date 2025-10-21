/**
 * Service for tracking submitted orders to prevent duplicate submissions
 */

import { hashService } from './hash-service';

const STORAGE_KEY = 'handyhands-submitted-orders';
const LEGACY_STORAGE_KEY = 'handyhands-submitted-hashes'; // Old key for migration

export const hashSubmissionService = {
  /**
   * Get all submitted order IDs from localStorage
   */
  getSubmittedOrderIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const submittedIds = data ? JSON.parse(data) : [];
      
      // Migrate from old storage key if it exists
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
      
      return submittedIds;
    } catch {
      return [];
    }
  },

  /**
   * Extract order ID from hash data
   */
  getOrderIdFromHash(hash: string): string | null {
    try {
      const decodedData = hashService.decodeHash(hash);
      
      // Check if hash has order ID
      if (decodedData?.calculationData?.orderId) {
        return decodedData.calculationData.orderId as string;
      }
      
      // For old hashes without order ID, generate one based on hash content
      // This ensures backward compatibility
      if (decodedData) {
        const serviceType = decodedData.serviceType || 'unknown';
        const totalPrice = decodedData.totalPrice || 0;
        const timestamp = Date.now();
        const fallbackOrderId = `legacy_${serviceType}_${totalPrice}_${timestamp}`;
        return fallbackOrderId;
      }
      
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Add an order ID to the submitted list
   */
  addSubmittedOrder(orderId: string): void {
    try {
      const submittedIds = this.getSubmittedOrderIds();
      if (!submittedIds.includes(orderId)) {
        submittedIds.push(orderId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(submittedIds));
      }
    } catch {
      // Silently fail if localStorage is not available
    }
  },

  /**
   * Check if an order has already been submitted
   */
  isOrderSubmitted(orderId: string): boolean {
    return this.getSubmittedOrderIds().includes(orderId);
  },

  /**
   * Check if a hash's order has already been submitted
   */
  isHashSubmitted(hash: string): boolean {
    const orderId = this.getOrderIdFromHash(hash);
    console.log('Debug - Hash order ID:', orderId);
    console.log('Debug - Submitted order IDs:', this.getSubmittedOrderIds());
    if (!orderId) return false;
    const isSubmitted = this.isOrderSubmitted(orderId);
    console.log('Debug - Is order submitted:', isSubmitted);
    return isSubmitted;
  },

  /**
   * Add a hash's order to the submitted list
   */
  addSubmittedHash(hash: string): void {
    const orderId = this.getOrderIdFromHash(hash);
    console.log('Debug - Adding order ID to submitted list:', orderId);
    if (orderId) {
      this.addSubmittedOrder(orderId);
    }
  },

  // Legacy methods for backward compatibility
  /**
   * @deprecated Use isHashSubmitted instead
   */
  isCalculationSubmitted(hash: string): boolean {
    return this.isHashSubmitted(hash);
  },

  /**
   * @deprecated Use addSubmittedHash instead
   */
  addSubmittedCalculation(hash: string): void {
    this.addSubmittedHash(hash);
  },

  /**
   * Clear all submitted calculations (useful for testing or admin functions)
   */
  clearSubmittedHashes(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail if localStorage is not available
    }
  },

  /**
   * Get count of submitted orders
   */
  getSubmittedCount(): number {
    return this.getSubmittedOrderIds().length;
  }
};
