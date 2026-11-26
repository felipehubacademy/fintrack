import Link from 'next/link';
import { useI18n } from '../contexts/I18nContext';

export default function LandingFooter() {
  const { t } = useI18n();
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-4 mb-6 group">
              <img 
                src="/images/logo_flat.svg" 
                alt="MeuAzulão" 
                className="h-16 w-16 group-hover:scale-110 transition-transform"
              />
              <div>
                <span className="text-2xl font-bold text-white block">MeuAzulão</span>
                <span className="text-sm text-gray-400">{t('web.landingFooter.moneySortedOnWhatsapp')}</span>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
              {t('web.landingFooter.textZulOnWhatsappLike')}
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">{t('web.landingFooter.product')}</h3>
            <ul className="space-y-3">
              <li><a href="#features" className="hover:text-white transition-colors">{t('web.landingFooter.features')}</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">{t('web.landingFooter.howItWorks')}</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">{t('web.landingFooter.dashboard')}</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">{t('web.shared.support')}</h3>
            <ul className="space-y-3">
              <li><Link href="/help" className="hover:text-white transition-colors">{t('web.landingFooter.helpCenter')}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t('web.landingFooter.contact')}</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">{t('web.landingFooter.legal')}</h3>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t('web.landingFooter.privacy')}</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">{t('web.shared.termsOfService')}</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>{t('web.landingFooter.meuazulaoAllRightsReserved', { p0: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
