import { useState } from 'react';
import { useOVTClient } from '../../src/hooks/useOVTClient';

interface TokenMintingProps {
  onActionRequiringMultiSig: (action: any) => void;
}

export default function TokenMinting({ onActionRequiringMultiSig }: TokenMintingProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const { isLoading } = useOVTClient();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure positive numbers only
    if (parseFloat(value) > 0 || value === '') {
      setAmount(value);
    }
  };

  const isFormValid = () => {
    return amount && parseFloat(amount) > 0 && reason.trim().length > 0 && !isLoading;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) return;

    const action = {
      type: 'MINT_TOKENS',
      description: `Mint ${amount} OTORI VISION TOKEN - Reason: ${reason}`,
      data: {
        amount: parseFloat(amount),
        reason: reason.trim(),
        symbol: 'OTORI·VISION·TOKEN',
        timestamp: Date.now(),
      },
    };

    onActionRequiringMultiSig(action);
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Token minting requires 3-of-5 admin signatures. All tokens will be minted as "OTORI VISION TOKEN".
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount to Mint
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="amount"
              id="amount"
              required
              min="1"
              step="1"
              value={amount}
              onChange={handleAmountChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter amount"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            Minting Reason
          </label>
          <div className="mt-1">
            <textarea
              name="reason"
              id="reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Explain the reason for minting these tokens"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isFormValid()}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Mint Tokens'}
          </button>
        </div>
      </form>
    </div>
  );
} 