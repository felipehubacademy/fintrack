import { ArrowRight } from 'lucide-react';

export default function WelcomeStep({ user, organization, onNext }) {
  return (
    <div className="max-w-3xl xl:max-w-4xl mx-auto text-center space-y-12 py-20">
      {/* Welcome Message */}
      <div className="space-y-8">
        <h2 className="text-5xl md:text-6xl xl:text-7xl font-bold text-gray-900">
          Olá, {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-2xl xl:text-3xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Vamos configurar a{' '}
          <span className="font-bold text-[#207DFF]">{organization?.name}</span>{' '}
          em apenas 5 passos
        </p>
      </div>

      {/* CTA */}
      <div className="pt-8">
        <button
          onClick={onNext}
          className="inline-flex items-center space-x-3 px-10 py-5 xl:px-12 xl:py-6 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-full text-xl xl:text-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <span>Vamos começar!</span>
          <ArrowRight className="w-6 h-6 xl:w-7 xl:h-7" />
        </button>
      </div>
    </div>
  );
}
