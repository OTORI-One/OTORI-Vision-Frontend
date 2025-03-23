import type { NextApiRequest, NextApiResponse } from 'next';
import mockPortfolioData from '../../src/mock-data/portfolio-positions.json';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add addresses to portfolio items if they don't exist
  const portfolioWithAddresses = (mockPortfolioData as any[]).map(position => ({
    ...position,
    address: position.address || `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
  }));
  
  res.status(200).json(portfolioWithAddresses);
} 