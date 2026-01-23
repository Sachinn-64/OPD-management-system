import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  actions,
  noPadding = false,
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            {title && <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4 sm:p-6'}>{children}</div>
    </div>
  );
};
