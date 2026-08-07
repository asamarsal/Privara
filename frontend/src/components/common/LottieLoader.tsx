import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../../../public/lottie/loading.json';

interface LottieLoaderProps {
  size?: number;
  text?: string;
}

export const LottieLoader: React.FC<LottieLoaderProps> = ({ 
  size = 60, 
  text = 'Loading active orders...' 
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', gap: '8px' }}>
      <div style={{ width: size, height: size }}>
        <Lottie animationData={loadingAnimation} loop={true} />
      </div>
      {text && (
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500 }}>
          {text}
        </span>
      )}
    </div>
  );
};

export const MiniLottieSpinner: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return (
    <div style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Lottie animationData={loadingAnimation} loop={true} />
    </div>
  );
};
