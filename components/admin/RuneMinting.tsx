import React, { useState } from 'react';
import { useLaserEyes } from '@omnisat/lasereyes';
import MultiSigApproval from './MultiSigApproval';
import { useOVTClient } from '../../src/hooks/useOVTClient';

export default function RuneMinting() {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMultiSigModalOpen, setIsMultiSigModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const { address } = useLaserEyes();
  const { formatValue } = useOVTClient();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value);
  };

  const handleMint = async () => {
    if (!amount || parseInt(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError(null);
    setSuccess(null);

    // Create the mint action for MultiSig approval
    const mintAction = {
      type: 'MINT_RUNE',
      description: `Mint ${amount} OVT tokens`,
      data: {
        amount: parseInt(amount)
      },
      execute: async (signatures: string[]) => {
        try {
          setIsLoading(true);
          
          // Call the API endpoint to mint tokens
          const response = await fetch('/api/mint-rune', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: parseInt(amount),
              signatures
            }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to mint tokens');
          }
          
          setSuccess(`Successfully minted ${amount} OVT tokens. Transaction ID: ${data.txid}`);
          setAmount('');
        } catch (err: any) {
          setError(`Failed to mint tokens: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    // Open the MultiSig modal
    setPendingAction(mintAction);
    setIsMultiSigModalOpen(true);
  };

  const handleMultiSigComplete = async (signatures: string[]) => {
    if (!pendingAction) return;
    
    setIsMultiSigModalOpen(false);
    
    try {
      // Execute the action with collected signatures
      await pendingAction.execute(signatures);
    } catch (err: any) {
      setError(`Failed to execute action: ${err.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Mint OVT Rune</h2>
      <p className="text-sm text-gray-500 mb-6">
        Mint additional OVT tokens to support rolling raises and the inflationary supply model.
      </p>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount to Mint
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              name="amount"
              id="amount"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">OVT</span>
            </div>
          </div>
        </div>
        
        <button
          type="button"
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
          onClick={handleMint}
          disabled={isLoading || !amount}
        >
          {isLoading ? 'Processing...' : 'Mint Tokens (Requires MultiSig)'}
        </button>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <MultiSigApproval
        isOpen={isMultiSigModalOpen}
        onClose={() => setIsMultiSigModalOpen(false)}
        onComplete={handleMultiSigComplete}
        action={pendingAction}
      />
    </div>
  );
} 