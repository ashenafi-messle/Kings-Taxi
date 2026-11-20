import React from 'react';

export interface LoadingSkeletonProps {
  rows?: number;
  height?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 4,
  height = 24,
  className = '',
}) => {
  return (
    <div className={`w-100 py-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-secondary-subtle rounded-2 mb-2 animate-pulse"
          style={{
            height: height,
            width: i % 2 === 0 ? '100%' : '80%',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
};
