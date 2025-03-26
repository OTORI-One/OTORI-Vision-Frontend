import React from 'react';
import { useCurrencyToggle, Currency } from '../src/hooks/useCurrencyToggle';

// Define simple arrow icons for tests
const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export interface ChartDataItem {
  name: string;
  initialInvestment: number;
  currentValue: number;
  growth: number;
  description?: string;
  tokenAmount: number;
  pricePerToken: number;
  formatted?: {
    initialInvestment: string;
    currentValue: string;
    growth: string;
    pricePerToken: string;
  };
}

interface TokenExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: ChartDataItem;
}

export default function TokenExplorerModal({ isOpen, onClose, token }: TokenExplorerModalProps) {
  const { formatValue, currency } = useCurrencyToggle();
  
  if (!isOpen || !token) return null;
  
  // Get data from token
  const { 
    name, 
    description, 
    initialInvestment, 
    currentValue, 
    growth, 
    tokenAmount, 
    pricePerToken,
    formatted
  } = token;
  
  // Determine if growth is positive
  const isPositive = growth >= 0;
  
  // Format the growth percentage
  const formattedGrowthPercentage = `${isPositive ? '+' : ''}${growth.toFixed(2)}%`;
  
  // Create a mock transaction for display
  const mockTransaction = {
    type: 'Purchase',
    date: new Date().toLocaleDateString(),
    amount: tokenAmount,
    price: pricePerToken,
    total: initialInvestment
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" data-testid="token-explorer-modal">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Modal header */}
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gray-900" id="modal-title" data-testid="token-name">
              {name}
            </h3>
            <button 
              type="button" 
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={onClose}
              data-testid="close-modal"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {description && (
            <p className="mt-2 text-sm text-gray-500">
              {description}
            </p>
          )}
          
          {/* Value information */}
          <div className="mt-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Initial Investment:</span>
              <span className="font-medium">{formatted?.initialInvestment || formatValue(initialInvestment)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Current Value:</span>
              <span className="font-medium">{formatted?.currentValue || formatValue(currentValue)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Change:</span>
              <span className={`flex items-center font-medium ${isPositive ? 'text-success' : 'text-error'}`}>
                {isPositive ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                {formatted?.growth || formattedGrowthPercentage}
              </span>
            </div>
          </div>
          
          {/* Token details */}
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Token Details</h4>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Holdings:</span>
                <span className="font-medium">{tokenAmount.toLocaleString()} tokens</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Price per Token:</span>
                <span className="font-medium">{formatted?.pricePerToken || formatValue(pricePerToken)}</span>
              </div>
            </div>
          </div>
          
          {/* Transaction history */}
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Transaction History</h4>
            
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mockTransaction.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {mockTransaction.date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {mockTransaction.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatValue(mockTransaction.price)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Close button */}
          <div className="mt-6 sm:mt-8 sm:flex sm:justify-end">
            <button
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 