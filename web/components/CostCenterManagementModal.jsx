import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Users, Plus, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function CostCenterManagementModal({ isOpen, onClose, organization }) {
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    default_split_percentage: 50.0,
    linked_email: ''
  });

  const colors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
    '#10B981', '#06B6D4', '#8B5A2B', '#6B7280', '#F97316'
  ];

  useEffect(() => {
    if (isOpen && organization) {
      fetchCostCenters();
    }
  }, [isOpen, organization]);

  const fetchCostCenters = async () => {
    try {
      setLoading(true);
      
      // Buscar cost centers com informações do usuário vinculado (se houver)
      const { data, error } = await supabase
        .from('cost_centers')
        .select(`
          *,
          linked_user:user_id(name, email)
        `)
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;

      setCostCenters(data || []);
    } catch (error) {
      console.error('Erro ao buscar responsáveis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Nome do responsável é obrigatório');
      return;
    }

    // Validar percentual
    const percentage = parseFloat(formData.default_split_percentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Percentual padrão deve estar entre 0 e 100');
      return;
    }

    try {
      if (editingCostCenter) {
        // Editar responsável (não permite editar user_id ou linked_email se já vinculado)
        const updateData = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
          default_split_percentage: percentage
        };

        // Só permite alterar linked_email se não estiver vinculado a um usuário
        if (!editingCostCenter.user_id && formData.linked_email) {
          updateData.linked_email = formData.linked_email.trim();
        }

        const { error } = await supabase
          .from('cost_centers')
          .update(updateData)
          .eq('id', editingCostCenter.id);

        if (error) throw error;
      } else {
        // Criar novo responsável
        const { error } = await supabase
          .from('cost_centers')
          .insert({
            organization_id: organization.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color,
            default_split_percentage: percentage,
            linked_email: formData.linked_email.trim() || null,
            is_active: true
          });

        if (error) throw error;
      }

      await fetchCostCenters();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar responsável:', error);
      alert('Erro ao salvar responsável: ' + error.message);
    }
  };

  const handleEdit = (costCenter) => {
    setEditingCostCenter(costCenter);
    setFormData({
      name: costCenter.name,
      description: costCenter.description || '',
      color: costCenter.color || '#6366F1',
      default_split_percentage: costCenter.default_split_percentage || 50.0,
      linked_email: costCenter.linked_email || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (costCenterId) => {
    if (!confirm('Tem certeza que deseja excluir este responsável?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', costCenterId);

      if (error) throw error;

      await fetchCostCenters();
    } catch (error) {
      console.error('Erro ao excluir responsável:', error);
      alert('Erro ao excluir responsável');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6366F1',
      default_split_percentage: 50.0,
      linked_email: ''
    });
    setEditingCostCenter(null);
    setShowForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] overflow-hidden border border-flight-blue/20">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-flight-blue/5 rounded-t-xl">
            <CardTitle className="flex items-center space-x-3">
              <span className="text-gray-900 font-semibold">Gerenciar Responsáveis</span>
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Info Card */}
            {!showForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">Sobre Centros de Custo</h4>
                    <p className="text-sm text-blue-800">
                      Centros de custo permitem organizar e dividir despesas entre responsáveis. 
                      Cada centro pode ter um percentual padrão para despesas compartilhadas, que pode ser ajustado individualmente.
                      Quando um usuário aceita um convite, ele é automaticamente vinculado ao centro de custo com seu email.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">
                  {editingCostCenter ? 'Editar Responsável' : 'Novo Responsável'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      placeholder="Ex: Felipe, Letícia, Compartilhado..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      placeholder="Descrição opcional do responsável"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Percentual Padrão para Despesas Compartilhadas *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.default_split_percentage}
                        onChange={(e) => setFormData({ ...formData, default_split_percentage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue pr-8"
                        placeholder="50.00"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Percentual sugerido para despesas compartilhadas (pode ser ajustado por despesa)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email para Vincular Usuário (Opcional)
                    </label>
                    <input
                      type="email"
                      value={formData.linked_email}
                      onChange={(e) => setFormData({ ...formData, linked_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue disabled:bg-gray-100"
                      placeholder="email@exemplo.com"
                      disabled={editingCostCenter?.user_id}
                    />
                    {editingCostCenter?.user_id ? (
                      <p className="text-xs text-gray-500 mt-1">
                        ✅ Já vinculado ao usuário: {editingCostCenter.linked_user?.name || editingCostCenter.linked_user?.email}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Quando um usuário com este email aceitar o convite, será automaticamente vinculado a este centro de custo
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, color })}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-8 border-t border-gray-200">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
                    >
                      {editingCostCenter ? 'Salvar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Cost Centers List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Responsáveis ({costCenters.length})</h3>
                {!showForm && (
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Responsável
                  </Button>
                )}
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando responsáveis...</p>
                </div>
              ) : costCenters.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum responsável encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {costCenters.map((costCenter) => (
                    <div key={costCenter.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-flight-blue/30 transition-colors">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: costCenter.color || '#6366F1' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 truncate">{costCenter.name}</p>
                            {costCenter.user_id && (
                              <Badge variant="success" className="text-xs">
                                Vinculado
                              </Badge>
                            )}
                          </div>
                          {costCenter.description && (
                            <p className="text-sm text-gray-600 truncate">{costCenter.description}</p>
                          )}
                          <div className="flex items-center space-x-3 mt-1">
                            <p className="text-xs text-gray-500">
                              {costCenter.default_split_percentage}% padrão
                            </p>
                            {costCenter.user_id && costCenter.linked_user && (
                              <p className="text-xs text-green-600 truncate">
                                👤 {costCenter.linked_user.name || costCenter.linked_user.email}
                              </p>
                            )}
                            {costCenter.linked_email && !costCenter.user_id && (
                              <p className="text-xs text-orange-500 truncate">
                                📧 Aguardando: {costCenter.linked_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(costCenter)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(costCenter.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
