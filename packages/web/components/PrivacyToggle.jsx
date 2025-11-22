import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export default function PrivacyToggle({ value, onChange, orgName }) {
  const options = [
    { key: 'all', label: 'Todas' },
    { key: 'individual', label: 'Só Minhas' },
    { key: 'org', label: `Só ${orgName}` }
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

