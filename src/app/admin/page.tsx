'use client';

import React from 'react';
import AdminDashboard from '../../../components/admin/AdminDashboard';
import { useOVTClient } from '../../hooks/useOVTClient';
import '../../../styles/globals.css';

export default function AdminPage() {
  const { navData, isLoading, error, formatValue } = useOVTClient();

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">OVT Fund Metrics</h2>
          {isLoading ? (
            <p>Loading fund metrics...</p>
          ) : error ? (
            <p className="text-red-500">Error loading fund metrics</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-xl font-bold">{formatValue(navData?.totalValueSats || 0)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Change</p>
                <p className="text-xl font-bold">{navData?.changePercentage}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data Source</p>
                <p className="text-xl font-bold">{navData?.dataSource?.label || 'Unknown'}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">OVT Rune Information</h2>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="text-base flex justify-between">
              <span>Bitcoin Rune representing the OTORI Vision Token</span>
              <span className="text-amber-600 font-medium">Not Etched</span>
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Initial Supply</p>
              <p className="text-base">500,000</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Supply</p>
              <p className="text-base">500,000</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Minting</p>
              <p className="text-base">Enabled</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Minting Events</p>
              <p className="text-base">0</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <AdminDashboard />
      </div>
    </div>
  );
} 