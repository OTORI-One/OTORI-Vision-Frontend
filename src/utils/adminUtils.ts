// List of authorized admin wallet addresses
export const ADMIN_WALLETS = [
  'bc1qqv2ptz224mqlavatqs9t0y8erfnr9f6v2pcnen', 
  'bc1pz3pxz5evvzvgrgwn7wphejj93ydnj4yecz9fvdkwulpyxymvz0rqcha48x', 
  'bc1qvmazxsqhkcx5h8twck323uz4nl84rc233a6u59', 
  'bc1pljvt6v482xvhrd9cyh6vwm6dx8r9rdck9ttex7gz0fmrvlz0u28qqr9rnl', 
  'tb1qatvvk3c3saefxerldrazzgkpxjpresywdy60p7', 
  'tb1p7w7x9c2wev7gqzj5xcxpx3km33x36g20dtj6tywu9unnu2zxa7hqdd6hua', 
  'tb1pzvrec8gz5apn38vdrqh29wxdyxdra3jh6fxs7z02kw0yzq7a7msq8ftyze',
  // Add a wildcard to ensure any connected wallet can access admin features during development
  '*'
];

export function isAdminWallet(address: string): boolean {
  // Add debug logging
  console.log('Checking if wallet is admin:', address);
  console.log('Admin wallets:', ADMIN_WALLETS);
  
  // FORCE ADMIN ACCESS FOR DEVELOPMENT
  console.log('DEVELOPMENT MODE: Forcing admin access for all wallets');
  return true;
  
  // During development, allow any wallet with the wildcard
  if (ADMIN_WALLETS.includes('*')) {
    console.log('Wildcard admin access enabled - granting access to all wallets');
    return true;
  }
  
  // Case-insensitive comparison to avoid issues with address format
  return ADMIN_WALLETS.some(adminWallet => 
    adminWallet.toLowerCase() === address.toLowerCase()
  );
} 