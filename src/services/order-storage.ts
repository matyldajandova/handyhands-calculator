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
    notes: string;
  };
  
  // Last updated timestamp
  lastUpdated?: number;
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
        notes: '',
        ...currentData.poptavka,
        ...poptavka
      }
    });
  },

  /**
   * Update customer data and optionally update poptavka data
   */
  updateCustomerAndPoptavka(customer: { firstName: string; lastName: string; email: string }, poptavkaData?: Partial<OrderData['poptavka']>): void {
    const currentData = this.get() || {};
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
        notes: '',
        ...currentData.poptavka,
        ...poptavkaData
      }
    });
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
