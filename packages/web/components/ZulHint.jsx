import { zulChatLink } from '@fintrack/shared/config';
import { useI18n } from '../contexts/I18nContext';
import WhatsAppIcon from './WhatsAppIcon';

// "Text Zul: <example>" plus a button that opens WhatsApp with the example
// pre-filled. Used by empty states and the dashboard home.
export function WhatsAppButton({ text, label, className = '', size = 'md' }) {
  const { t } = useI18n();
  const sizes = size === 'sm' ? 'h-9 px-4 text-sm' : 'h-11 px-5 text-sm sm:text-base';
  return (
    <a
      href={zulChatLink(text || t('web.zul.greeting'))}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp focus-visible:ring-offset-2 ${sizes} ${className}`}
    >
      <WhatsAppIcon className="h-5 w-5" />
      <span>{label || t('web.zul.openWhatsapp')}</span>
    </a>
  );
}

export default function ZulHint({ text, label, className = '', align = 'center' }) {
  const { t } = useI18n();
  const alignCls = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  return (
    <div className={`flex flex-col gap-3 ${alignCls} ${className}`}>
      <p className="text-sm text-gray-600">
        {t('web.zul.textZul')}{' '}
        <span className="inline-block rounded-xl bg-brand-50 px-2.5 py-1 font-medium text-ink-900">
          &ldquo;{text}&rdquo;
        </span>
      </p>
      <WhatsAppButton text={text} label={label} />
    </div>
  );
}
