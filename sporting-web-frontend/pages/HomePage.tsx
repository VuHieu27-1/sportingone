import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../component/common/Header';
import { Footer } from '../component/common/Footer';
import { HeroSection } from '../component/intro/HeroSection';
import { NearbyCourtsSection } from '../component/intro/NearbyCourtsSection';
import { EcosystemSection } from '../component/intro/EcosystemSection';
import { PlayerBenefitsSection } from '../component/intro/PlayerBenefitsSection';
import { VendorBenefitsSection } from '../component/intro/VendorBenefitsSection';
import { MetricsBannerSection } from '../component/intro/MetricsBannerSection';
import { DualCtaSection } from '../component/intro/DualCtaSection';
import { AuthUser } from '../types/auth';

interface HomePageProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();

  const handleNavigateToUserBooking = (params?: {
    sport?: string;
    location?: string;
    vendorId?: number | string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.sport && params.sport !== 'ALL') searchParams.set('sport', params.sport);
    if (params?.location) searchParams.set('location', params.location);
    if (params?.vendorId) searchParams.set('vendorId', String(params.vendorId));
    const queryStr = searchParams.toString();
    navigate(queryStr ? `/user?${queryStr}` : '/user');
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB] text-[#1E3932] flex flex-col font-sans selection:bg-[#006241] selection:text-[#FBF8F0]">
      <Header
        onNavigateToAuth={(mode = 'login') => navigate(`/${mode}`)}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      <main className="flex-grow">
        <HeroSection
          onOpenBooking={handleNavigateToUserBooking}
          onOpenRegister={() => navigate('/register')}
        />
        <NearbyCourtsSection
          onSelectCourt={handleNavigateToUserBooking}
        />
        <EcosystemSection />
        <PlayerBenefitsSection />
        <VendorBenefitsSection onOpenRegister={() => navigate('/register')} />
        <MetricsBannerSection />
        <DualCtaSection
          onOpenLogin={() => navigate('/login')}
          onOpenRegister={() => navigate('/register')}
        />
      </main>

      <Footer />
    </div>
  );
};
