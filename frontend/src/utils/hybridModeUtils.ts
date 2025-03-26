/**
 * Hybrid Mode Utilities
 * 
 * This file provides utilities for hybrid mode operation, where the application
 * can work with both real API data and mock data depending on configuration.
 */

type ServiceType = 'price' | 'portfolio' | 'trading' | 'auth' | 'all';

/**
 * Environment configuration for hybrid mode
 * This can be controlled via environment variables
 */
const HYBRID_MODE_CONFIG = {
  // Enable hybrid mode globally
  enabled: process.env.NEXT_PUBLIC_HYBRID_MODE === 'true',
  
  // Services that should use mock data when hybrid mode is enabled
  mockServices: (process.env.NEXT_PUBLIC_HYBRID_MODE_SERVICES || 'all').split(','),
  
  // Force hybrid mode regardless of connectivity (useful for development)
  forceMock: process.env.NEXT_PUBLIC_FORCE_MOCK === 'true',
};

/**
 * Determine if the application should use mock data for a specific service
 * 
 * @param service - The service to check (price, portfolio, trading, auth, all)
 * @returns boolean - Whether mock data should be used
 */
export function shouldUseMockData(service: ServiceType): boolean {
  // If hybrid mode is not enabled and not forced, always use real data
  if (!HYBRID_MODE_CONFIG.enabled && !HYBRID_MODE_CONFIG.forceMock) {
    return false;
  }
  
  // If mock mode is forced, always use mock data
  if (HYBRID_MODE_CONFIG.forceMock) {
    return true;
  }
  
  // Check if the specific service should use mock data
  return (
    HYBRID_MODE_CONFIG.mockServices.includes(service) ||
    HYBRID_MODE_CONFIG.mockServices.includes('all')
  );
}

/**
 * Update the hybrid mode configuration at runtime
 * 
 * @param options - Configuration options to update
 */
export function updateHybridModeConfig(options: {
  enabled?: boolean;
  mockServices?: ServiceType[];
  forceMock?: boolean;
}): void {
  if (typeof options.enabled === 'boolean') {
    HYBRID_MODE_CONFIG.enabled = options.enabled;
  }
  
  if (Array.isArray(options.mockServices)) {
    HYBRID_MODE_CONFIG.mockServices = options.mockServices;
  }
  
  if (typeof options.forceMock === 'boolean') {
    HYBRID_MODE_CONFIG.forceMock = options.forceMock;
  }
} 