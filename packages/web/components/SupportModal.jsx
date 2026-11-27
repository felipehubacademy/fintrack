import { useState } from 'react';
import { HelpCircle, X, Send, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { useNotificationContext } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabaseClient';
import { useI18n } from '../contexts/I18nContext';

export default function SupportModal({ 
  isOpen, 
  onClose,
  userEmail = '',
  userName = ''
}) {
  const { t } = useI18n();
  const { success: showSuccess, error: showError } = useNotificationContext();
  const [formData, setFormData] = useState({
    name: userName || '',
    email: userEmail || '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      showError(t('web.supportModal.pleaseFillInEveryField'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Tentar obter token de autenticação se disponível
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/support/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('web.supportModal.couldnTSendTheMessage'));
      }

      setSubmitted(true);
      showSuccess(t('web.supportModal.messageSentWeLlGet'));
      
      // Reset form
      setFormData({
        name: userName || '',
        email: userEmail || '',
        subject: '',
        message: ''
      });

      // Close modal after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Erro ao enviar mensagem de suporte:', error);
      showError(error.message || t('web.supportModal.couldnTSendTheMessage2'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubmitted(false);
      setFormData({
        name: userName || '',
        email: userEmail || '',
        subject: '',
        message: ''
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <HelpCircle className="w-8 h-8 text-[#207DFF]" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
              {t('web.supportModal.contactSupport')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('web.supportModal.messageSent')}
              </h3>
              <p className="text-gray-600">
                {t('web.supportModal.weLlGetBackTo')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="support-name" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('web.supportModal.fullName')}
                </label>
                <input
                  id="support-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-[#207DFF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('web.supportModal.yourName')}
                />
              </div>

              <div>
                <label htmlFor="support-email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('web.supportModal.email')}
                </label>
                <input
                  id="support-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-[#207DFF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('web.shared.youEmailCom')}
                />
              </div>

              <div>
                <label htmlFor="support-subject" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('web.supportModal.subject')}
                </label>
                <input
                  id="support-subject"
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-[#207DFF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('web.supportModal.whatSItAbout')}
                />
              </div>

              <div>
                <label htmlFor="support-message" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('web.supportModal.message')}
                </label>
                <textarea
                  id="support-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-[#207DFF] transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('web.supportModal.tellUsYourQuestionIdea')}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-6 py-2 min-h-[44px]"
                >
                  {t('web.shared.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.email || !formData.subject || !formData.message}
                  className="w-full md:w-auto px-6 py-2 min-h-[44px] inline-flex items-center justify-center"
                >
                  {isSubmitting ? (
                    t('web.shared.sending')
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t('web.supportModal.sendMessage')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

