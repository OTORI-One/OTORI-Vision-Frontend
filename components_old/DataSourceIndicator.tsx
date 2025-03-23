import React from 'react';

interface DataSourceIndicatorProps {
  isMock: boolean;
  label: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * DataSourceIndicator Component
 * 
 * Displays a visual indicator showing whether data is from the real contract or mock data
 */
export default function DataSourceIndicator({ 
  isMock, 
  label, 
  color,
  size = 'md' 
}: DataSourceIndicatorProps) {
  // Determine the color class based on the color prop
  const getColorClass = () => {
    if (color === 'amber') return 'bg-amber-500';
    if (color === 'green') return 'bg-green-500';
    if (color === 'red') return 'bg-red-500';
    if (color === 'blue') return 'bg-blue-500';
    return 'bg-gray-500'; // Default fallback
  };
  
  // Determine size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          dot: 'w-1.5 h-1.5 mr-1'
        };
      case 'lg':
        return {
          container: 'px-3 py-2 text-sm',
          dot: 'w-3 h-3 mr-2'
        };
      case 'md':
      default:
        return {
          container: 'px-2.5 py-1.5 text-xs',
          dot: 'w-2 h-2 mr-1.5'
        };
    }
  };
  
  const sizeClasses = getSizeClasses();
  
  return (
    <div className={`inline-flex items-center rounded-full ${sizeClasses.container} ${
      isMock ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
    }`}>
      <span className={`inline-block rounded-full ${sizeClasses.dot} ${getColorClass()}`}></span>
      <span>{label}</span>
    </div>
  );
} 