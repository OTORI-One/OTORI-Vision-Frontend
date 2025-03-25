interface ChartToggleProps {
  activeChart: 'price' | 'nav';
  onToggle: (chart: 'price' | 'nav') => void;
}

export default function ChartToggle({ activeChart, onToggle }: ChartToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-primary p-1 mb-4" role="group" aria-label="Chart type toggle">
      <button
        onClick={() => onToggle('price')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeChart === 'price'
            ? 'bg-primary text-white'
            : 'text-primary hover:bg-primary hover:bg-opacity-10'
        }`}
        aria-pressed={activeChart === 'price'}
      >
        Price Chart
      </button>
      <button
        onClick={() => onToggle('nav')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeChart === 'nav'
            ? 'bg-primary text-white'
            : 'text-primary hover:bg-primary hover:bg-opacity-10'
        }`}
        aria-pressed={activeChart === 'nav'}
      >
        NAV Breakdown
      </button>
    </div>
  );
} 