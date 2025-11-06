/**
 * Unified localStorage service for order data
 * Replaces multiple localStorage keys with a single 'handyhands-order' key
 */

export interface OrderData {
  // Customer identification data (shared across all forms)
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  
  // Poptavka form data (excludes customer fields - they're in customer object)
  // Note: 'notes' field removed - poptavka notes are stored in hash only, never in localStorage
  poptavka?: {
    phone: string;
    propertyStreet: string;
    propertyCity: string;
    propertyZipCode: string;
    isCompany: boolean;
    companyName: string;
    companyIco: string;
    companyDic: string;
    companyStreet: string;
    companyCity: string;
    companyZipCode: string;
  };
  
  // Last updated timestamp
  lastUpdated?: number;
  // Current order ID - used to detect new orders
  currentOrderId?: string;
}

const STORAGE_KEY = 'handyhands-order';

export const orderStorage = {
  /**
   * Get all order data from localStorage
   */
  get(): OrderData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Save all order data to localStorage
   */
  set(data: OrderData): void {
    try {
      const dataWithTimestamp = {
        ...data,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
    } catch {
      // Silently fail if localStorage is not available
    }
  },

  /**
   * Update customer data only
   */
  updateCustomer(customer: { firstName: string; lastName: string; email: string }): void {
    const currentData = this.get() || {};
    this.set({
      ...currentData,
      customer
    });
  },

  /**
   * Update poptavka form data only (excludes customer fields)
   */
  updatePoptavka(poptavka: Partial<OrderData['poptavka']>): void {
    const currentData = this.get() || {};
    // Exclude notes from poptavka data - they're stored in hash only
    const { notes: _, ...poptavkaWithoutNotes } = poptavka as Record<string, unknown>;
    this.set({
      ...currentData,
      poptavka: {
        phone: '',
        propertyStreet: '',
        propertyCity: '',
        propertyZipCode: '',
        isCompany: false,
        companyName: '',
        companyIco: '',
        companyDic: '',
        companyStreet: '',
        companyCity: '',
        companyZipCode: '',
        ...currentData.poptavka,
        ...poptavkaWithoutNotes
      }
    });
  },

  /**
   * Update customer data and optionally update poptavka data
   */
  updateCustomerAndPoptavka(customer: { firstName: string; lastName: string; email: string }, poptavkaData?: Partial<OrderData['poptavka']>): void {
    const currentData = this.get() || {};
    // Exclude notes from poptavka data - they're stored in hash only
    const { notes: _, ...poptavkaDataWithoutNotes } = (poptavkaData || {}) as Record<string, unknown>;
    // Also exclude notes from current poptavka data
    const { notes: __, ...currentPoptavkaWithoutNotes } = (currentData.poptavka || {}) as Record<string, unknown>;
    this.set({
      ...currentData,
      customer,
      poptavka: {
        phone: '',
        propertyStreet: '',
        propertyCity: '',
        propertyZipCode: '',
        isCompany: false,
        companyName: '',
        companyIco: '',
        companyDic: '',
        companyStreet: '',
        companyCity: '',
        companyZipCode: '',
        ...currentPoptavkaWithoutNotes,
        ...poptavkaDataWithoutNotes
      }
    });
  },

  /**
   * Clear poptavka notes (but keep other poptavka data)
   * Note: This is a no-op now since notes are not stored in localStorage
   */
  clearPoptavkaNotes(): void {
    // Notes are stored in hash only, not localStorage, so nothing to clear
  },

  /**
   * Check if order ID changed and clear poptavka notes if it did
   */
  checkAndClearNotesForNewOrder(orderId: string): void {
    try {
      const currentData = this.get();
      if (currentData?.currentOrderId && currentData.currentOrderId !== orderId) {
        // New order detected - clear poptavka notes
        this.clearPoptavkaNotes();
      }
      // Update current order ID
      this.set({
        ...currentData,
        currentOrderId: orderId
      });
    } catch {
      // Silently fail if localStorage is not available
    }
  },

  /**
   * Clear all order data
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail if localStorage is not available
    }
  }
};
