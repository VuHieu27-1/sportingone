import React from 'react';
import { ASSETS } from '../../asset/constants';

interface AuthSportsBackgroundProps {
  bgIndex: number;
}

export const AuthSportsBackground: React.FC<AuthSportsBackgroundProps> = ({ bgIndex }) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {ASSETS.AUTH_SPORTS_BGS.map((item, index) => {
        const bgUrl = typeof item === 'string' ? item : item.url;
        return (
          <div
            key={bgUrl}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${
              index === bgIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            }`}
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
        );
      })}

            <div className="absolute inset-0 bg-gradient-to-r from-[#07130e]/90 via-[#006241]/40 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
    </div>
  );
};
