import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import DownloadSection from '@/components/DownloadSection';
import ProvidersSection from '@/components/ProvidersSection';

export default function Home() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <HeroSection />
      <FeaturesSection />
      <ProvidersSection />
      <DownloadSection />
    </Layout>
  );
}
