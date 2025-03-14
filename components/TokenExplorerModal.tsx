import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useOVTClient } from '../src/hooks/useOVTClient';

interface TokenExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: {
    name: string;
    description: string;
    initial: number;
    current: number;
    change: number;
    address: string;
    holdings: string;
    totalValue: number;
    transactions: Array<{
      date: string;
      type: 'buy' | 'sell';
      amount: string;
      price: number;
    }>;
  };
  baseCurrency?: 'usd' | 'btc';
}

// Format token amounts consistently across the application
const formatTokenAmount = (value: string): string => {
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(numericValue)) return '0 tokens';
  
  if (numericValue >= 1000000) {
    return `${(numericValue / 1000000).toFixed(2)}M tokens`;
  }
  if (numericValue >= 1000) {
    return `${Math.floor(numericValue / 1000)}k tokens`;
  }
  return `${Math.floor(numericValue)} tokens`;
};

export default function TokenExplorerModal({ isOpen, onClose, tokenData, baseCurrency = 'usd' }: TokenExplorerModalProps) {
  const { formatValue } = useOVTClient();
  const profitLoss = tokenData.current - tokenData.initial;
  const profitLossPercentage = ((profitLoss / tokenData.initial) * 100).toFixed(2);

  // Format values using the OVT client's formatValue function
  const formattedInitial = formatValue(tokenData.initial, baseCurrency);
  const formattedCurrent = formatValue(tokenData.current, baseCurrency);
  const formattedProfitLoss = formatValue(Math.abs(profitLoss), baseCurrency);
  const formattedTotalValue = formatValue(tokenData.totalValue, baseCurrency);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-2xl font-semibold leading-6 text-gray-900">
                      {tokenData.name}
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-500">{tokenData.description}</p>

                    {/* Portfolio Address */}
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Portfolio Address</span>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {tokenData.address}
                          </code>
                          <button className="text-blue-600 hover:text-blue-800">
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Holdings and P/L */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Total Value</h4>
                            <p className="text-xl font-semibold">{formattedTotalValue}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Total Holdings</h4>
                            <p className="text-xl font-semibold">{formatTokenAmount(tokenData.holdings)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-500">Profit/Loss</h4>
                        <p className={`mt-1 text-xl font-semibold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitLoss >= 0 ? '+' : ''}{profitLossPercentage}%
                        </p>
                        <p className={`text-sm ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitLoss >= 0 ? '+' : '-'}{formattedProfitLoss}
                        </p>
                      </div>
                    </div>

                    {/* Transaction History */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Transaction History</h4>
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Date</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {tokenData.transactions.map((transaction, idx) => (
                              <tr key={idx}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">{transaction.date}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                    transaction.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {transaction.type}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {formatTokenAmount(transaction.amount)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {formatValue(transaction.price, baseCurrency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 