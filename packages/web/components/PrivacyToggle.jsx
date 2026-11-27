import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { useI18n } from '../contexts/I18nContext';

export default function PrivacyToggle({ value, onChange, orgName }) {
  const { t } = useI18n();
  const options = [
    { key: 'all', label: t('web.shared.all') },
    { key: 'individual', label: t('web.privacyToggle.onlyMine') },
    { key: 'org', label: t('web.privacyToggle.only', { orgName }) }
  ];

  return (
    <div className="inline-flex gap-2 p-1 bg-gray-100 rounded-lg">
      {options.map(option => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all",
            value === option.key
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

