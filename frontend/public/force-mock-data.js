// Run this script in the browser console to force-load mock portfolio data
(async function() {
  try {
    // Fetch the mock portfolio data
    const response = await fetch('/api/mock-portfolio');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const portfolioData = await response.json();
    console.log('Loaded mock portfolio data:', portfolioData);
    
    // Store in localStorage
    localStorage.setItem('ovt-portfolio-positions', JSON.stringify(portfolioData));
    console.log('Mock portfolio data injected into localStorage');
    
    // Force a refresh
    window.dispatchEvent(new Event('storage'));
    
    // Reload the page to ensure it uses the new data
    if (confirm('Mock data loaded. Reload page to apply?')) {
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to inject mock portfolio data:', error);
  }
})(); 