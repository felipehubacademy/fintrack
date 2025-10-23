import { useState } from 'react';
import { AlertTriangle, Mail, Phone, Building, User, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

export default function DuplicateUserModal({ 
  isOpen, 
  onClose, 
  duplicateData, 
  onLoginExisting,
  onCreateNew 
}) {
  if (!isOpen || !duplicateData) return null;

  const { checks } = duplicateData;
  const hasEmailDuplicate = checks.email?.exists;
  const hasPhoneDuplicate = checks.phone?.exists;
  const hasOrgDuplicate = checks.organizationEmail?.exists;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Conta já existe!</h2>
              <p className="text-orange-100">Encontramos dados similares em nossa base</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Email Duplicate */}
          {hasEmailDuplicate && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Email já cadastrado
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
                        Organização: {checks.email.user.organization_id ? 'Vinculada' : 'Não vinculada'}
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
                    Telefone já cadastrado
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
                        Organização: {checks.phone.user.organization_id ? 'Vinculada' : 'Não vinculada'}
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
                    Email já usado em organização
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
                  Importante
                </h3>
                <p className="text-yellow-800 text-sm">
                  Para evitar conflitos no sistema, recomendamos fazer login com a conta existente. 
                  Se você tem certeza de que esta é uma conta diferente, pode continuar o cadastro.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          
          {hasEmailDuplicate && (
            <Button
              onClick={() => onLoginExisting(checks.email.user)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Fazer Login
            </Button>
          )}
          
          <Button
            onClick={onCreateNew}
            variant="outline"
            className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            Continuar Cadastro
          </Button>
        </div>
      </div>
    </div>
  );
}
