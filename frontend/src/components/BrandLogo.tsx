import React from 'react';
import wasteflowLogo from '../assets/wasteflow-logo-new.png';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  showTagline?: boolean;
  tagline?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  imgClassName = 'h-20 w-auto',
  showWordmark = true,
  wordmarkClassName = '',
  showTagline = false,
  tagline = 'Client Portal',
}) => {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img src={wasteflowLogo} alt="WasteFlow" className={`object-contain ${imgClassName}`} />
      {showWordmark && (
        <span className={`brand-wordmark mt-2 ${wordmarkClassName}`}>
          WasteFlow
        </span>
      )}
      {showTagline && <span className="mt-1 text-xs uppercase tracking-wide text-secondary-500">{tagline}</span>}
    </div>
  );
};
