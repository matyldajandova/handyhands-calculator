/**
 * Service for generating and managing order IDs
 */

/**
 * Generate a unique order ID
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `order_${timestamp}_${random}`;
}

/**
 * Get order ID from hash data or generate a new one
 */
export function getOrCreateOrderId(hashData?: { calculationData?: { orderId?: string } }): string {
  // If hash data contains an order ID, use it
  if (hashData?.calculationData?.orderId) {
    return hashData.calculationData.orderId;
  }
  
  // Otherwise generate a new one
  return generateOrderId();
}
