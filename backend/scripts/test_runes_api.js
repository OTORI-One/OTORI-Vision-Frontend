#!/usr/bin/env node

/**
 * Simple test script for OTORI Vision Runes API
 * 
 * This script tests all endpoints of the Runes API to ensure they're working correctly.
 * Run this after setting up the Runes API server to verify functionality.
 */

// Import fetch for Node.js environment
import fetch from 'node-fetch';

// Configuration
const config = {
  apiBaseUrl: 'http://localhost:3030',
  runeId: '240249:101',
  lpAddress: 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f'
};

// Test utilities
const runTest = async (name, testFn) => {
  try {
    console.log(`\n🧪 TESTING: ${name}`);
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
};

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${config.apiBaseUrl}${endpoint}`;
  console.log(`  Making request to: ${url}`);
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = new Error(`API request failed with status ${response.status}`);
    error.response = {
      status: response.status,
      data: await response.text()
    };
    throw error;
  }
  
  return await response.json();
};

// Test cases
const tests = [
  {
    name: 'API Documentation',
    run: async () => {
      const result = await apiRequest('/');
      console.log(`  API version: ${result.version}`);
      console.log(`  Endpoints: ${result.endpoints.length}`);
      if (!result.endpoints || result.endpoints.length === 0) {
        throw new Error('No endpoints found in API documentation');
      }
      return true;
    }
  },
  {
    name: 'Health Check',
    run: async () => {
      const result = await apiRequest('/health');
      console.log(`  API status: ${result.status}`);
      console.log(`  Ord version: ${result.dependencies.ord.version}`);
      
      if (result.status !== 'healthy') {
        console.warn('  ⚠️ API health check reports unhealthy status');
        // We'll continue with tests but warn about potential issues
      }
      return true;
    }
  },
  {
    name: 'Rune Info',
    run: async () => {
      const result = await apiRequest(`/rune/${config.runeId}`);
      console.log(`  Rune info retrieved`);
      
      if (!result.success) {
        throw new Error('Failed to retrieve rune info');
      }
      return true;
    }
  },
  {
    name: 'Rune Balances',
    run: async () => {
      const result = await apiRequest(`/rune/${config.runeId}/balances`);
      console.log(`  Balances retrieved: ${result.balances ? result.balances.length : 0} addresses`);
      
      if (!result.success) {
        throw new Error('Failed to retrieve rune balances');
      }
      return true;
    }
  },
  {
    name: 'Rune Distribution',
    run: async () => {
      const result = await apiRequest(`/rune/${config.runeId}/distribution`);
      
      if (!result.success) {
        throw new Error('Failed to retrieve distribution stats');
      }
      
      const stats = result.distributionStats;
      console.log(`  Total supply: ${stats.totalSupply}`);
      console.log(`  Treasury held: ${stats.treasuryHeld}`);
      console.log(`  LP held: ${stats.lpHeld}`);
      console.log(`  Distributed: ${stats.distributed} (${stats.percentDistributed}%)`);
      
      return true;
    }
  },
  {
    name: 'LP Info',
    run: async () => {
      const result = await apiRequest(`/rune/${config.runeId}/lp-info`);
      
      if (!result.success) {
        throw new Error('Failed to retrieve LP info');
      }
      
      const lpInfo = result.lpInfo;
      console.log(`  LP address: ${lpInfo.address}`);
      console.log(`  OVT balance: ${lpInfo.liquidity.ovt}`);
      console.log(`  BTC balance: ${lpInfo.liquidity.btcSats} sats`);
      
      return true;
    }
  },
  {
    name: 'Prepare LP Distribution',
    run: async () => {
      const result = await apiRequest('/rune/prepare-lp-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          runeId: config.runeId,
          amount: 1000,
          lpAddress: config.lpAddress
        })
      });
      
      if (!result.success) {
        throw new Error('Failed to prepare LP distribution');
      }
      
      console.log(`  PSBTs created: ${result.psbts.length}`);
      
      return true;
    }
  }
];

// Run all tests
const runAllTests = async () => {
  console.log('=====================================================');
  console.log('🚀 OTORI Vision Runes API Test Suite');
  console.log('=====================================================');
  console.log(`API URL: ${config.apiBaseUrl}`);
  console.log(`Rune ID: ${config.runeId}`);
  console.log('=====================================================');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await runTest(test.name, test.run);
    result ? passed++ : failed++;
  }
  
  console.log('\n=====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');
  
  if (failed > 0) {
    console.log('\n⚠️ Some tests failed. Please check the API server configuration.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! The Runes API is working correctly.');
    process.exit(0);
  }
};

// Start the tests
runAllTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 