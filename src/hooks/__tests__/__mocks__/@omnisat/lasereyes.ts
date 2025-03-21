// Mock implementation of @omnisat/lasereyes
export const LaserEyes = {
  random: jest.fn(() => ({
    id: 'mock-id',
    value: 100000,
    status: 'confirmed'
  }))
};

export const useLaserEyes = jest.fn(() => ({
  address: 'mock-wallet-address',
  network: 'testnet',
  isConnected: true,
  connect: jest.fn(),
  disconnect: jest.fn()
}));

export default LaserEyes; 