import { ArrowRight } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

export default function WelcomeStep({ user, organization, onNext, onboardingType }) {
  const { t } = useI18n();
  // Textos dinâmicos baseados no tipo de onboarding
  const getWelcomeText = () => {
    switch(onboardingType) {
      case 'invited':
        return t('web.welcomeStep.letSMakeYoursIn', { name: organization?.name });
      case 'solo':
        return t('web.welcomeStep.letSSetUpIn', { name: organization?.name });
      case 'admin':
      default:
        return t('web.welcomeStep.letSSetUpIn2', { name: organization?.name });
    }
  };

  return (
    <div className="max-w-3xl xl:max-w-4xl mx-auto flex flex-col items-center justify-center text-center space-y-12 py-8 md:py-12 min-h-[70vh]">
      {/* Welcome Message */}
      <div className="space-y-8">
        <h2 className="text-5xl md:text-6xl xl:text-7xl font-bold text-gray-900">
          {t('web.welcomeStep.hi', { p0: user?.name?.split(' ')[0] })}
        </h2>
        <p className="text-2xl xl:text-3xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {getWelcomeText()}
        </p>
      </div>

      {/* CTA */}
      <div className="pt-8">
        <button
          onClick={onNext}
          className="inline-flex items-center space-x-3 px-10 py-5 xl:px-12 xl:py-6 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-full text-xl xl:text-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <span>{t('web.welcomeStep.letSStart')}</span>
          <ArrowRight className="w-6 h-6 xl:w-7 xl:h-7" />
        </button>
      </div>
    </div>
  );
}
