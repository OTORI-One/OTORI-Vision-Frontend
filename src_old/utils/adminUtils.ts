// List of authorized admin wallet addresses
export const ADMIN_WALLETS = [
  'bc1qqv2ptz224mqlavatqs9t0y8erfnr9f6v2pcnen', 
  'bc1pz3pxz5evvzvgrgwn7wphejj93ydnj4yecz9fvdkwulpyxymvz0rqcha48x', 
  'bc1qvmazxsqhkcx5h8twck323uz4nl84rc233a6u59', 
  'bc1pljvt6v482xvhrd9cyh6vwm6dx8r9rdck9ttex7gz0fmrvlz0u28qqr9rnl', 
  'tb1qatvvk3c3saefxerldrazzgkpxjpresywdy60p7', 
  'tb1p7w7x9c2wev7gqzj5xcxpx3km33x36g20dtj6tywu9unnu2zxa7hqdd6hua', 
  'tb1pzvrec8gz5apn38vdrqh29wxdyxdra3jh6fxs7z02kw0yzq7a7msq8ftyze'
  // Removed wildcard for production
];

export function isAdminWallet(address: string): boolean {
  // Add debug logging
  console.log('Checking if wallet is admin:', address);
  console.log('Admin wallets count:', ADMIN_WALLETS.length);
  
  // For security, skip the check only if address is empty or undefined
  if (!address) {
    console.log('No wallet address provided - denying admin access');
    return false;
  }
  
  // Normalize address by trimming whitespace
  const normalizedAddress = address.trim().toLowerCase();
  console.log('Normalized address for comparison:', normalizedAddress);
  
  // Note: Wildcard support has been removed for production
  
  // Case-insensitive comparison to avoid issues with address format
  const isAdmin = ADMIN_WALLETS.some(adminWallet => {
    const normalizedAdminWallet = adminWallet.trim().toLowerCase();
    const matches = normalizedAdminWallet === normalizedAddress;
    if (matches) {
      console.log(`Match found with admin wallet: ${adminWallet}`);
    }
    return matches;
  });
  
  console.log(`Admin access for ${address}: ${isAdmin ? 'GRANTED' : 'DENIED'}`);
  return isAdmin;
} 