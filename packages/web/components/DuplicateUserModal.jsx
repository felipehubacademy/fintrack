import { useState } from 'react';
import { AlertTriangle, Mail, Phone, Building, User, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { useI18n } from '../contexts/I18nContext';

export default function DuplicateUserModal({ 
  isOpen, 
  onClose, 
  duplicateData, 
  onLoginExisting,
  onCreateNew 
}) {
  const { t } = useI18n();
  if (!isOpen || !duplicateData) return null;

  const { checks } = duplicateData;
  const hasEmailDuplicate = checks.email?.exists;
  const hasPhoneDuplicate = checks.phone?.exists;
  const hasOrgDuplicate = checks.organizationEmail?.exists;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header fixo */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">{t('web.duplicateUserModal.accountAlreadyExists')}</h2>
              <p className="text-orange-100">{t('web.duplicateUserModal.weFoundSimilarDetailsAlready')}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Duplicate */}
          {hasEmailDuplicate && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {t('web.duplicateUserModal.emailAlreadyRegistered')}
                  </h3>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {checks.email.user.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">
                        {checks.email.user.email}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">
                        {t('web.duplicateUserModal.household')} {checks.email.user.organization_id ? t('web.duplicateUserModal.linked') : t('web.duplicateUserModal.notLinked')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phone Duplicate */}
          {hasPhoneDuplicate && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">
                    {t('web.duplicateUserModal.phoneAlreadyRegistered')}
                  </h3>
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {checks.phone.user.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Phone className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">
                        {checks.phone.user.phone}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">
                        {t('web.duplicateUserModal.household')} {checks.phone.user.organization_id ? t('web.duplicateUserModal.linked') : t('web.duplicateUserModal.notLinked')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organization Email Duplicate */}
          {hasOrgDuplicate && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Building className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    {t('web.duplicateUserModal.emailAlreadyUsedByA')}
                  </h3>
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {checks.organizationEmail.organization.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  {t('web.duplicateUserModal.important')}
                </h3>
                <p className="text-yellow-800 text-sm">
                  {t('web.duplicateUserModal.toAvoidConflictsWeSuggest')}
                </p>
              </div>
            </div>
          </div>
        </div>

        
        {/* Footer fixo */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {t('web.shared.cancel')}
            </Button>
            
            {hasEmailDuplicate && (
              <Button
                onClick={() => onLoginExisting(checks.email.user)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {t('web.duplicateUserModal.signIn')}
              </Button>
            )}
            
            <Button
              onClick={onCreateNew}
              variant="outline"
              className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {t('web.duplicateUserModal.keepSigningUp')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
