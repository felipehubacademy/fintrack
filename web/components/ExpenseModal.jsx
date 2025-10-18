import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOrganization } from '../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, CreditCard as CreditIcon } from 'lucide-react';

export default function ExpenseModal({ isOpen, onClose, onSuccess }) {
  const { organization, user: orgUser, costCenters, loading: orgLoading } = useOrganization();
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category_id: '',
    owner_name: '',
    payment_method: 'cash',
    card_id: '',
    installments: 1,
  });

  const isCredit = form.payment_method === 'credit_card';

  useEffect(() => {
    if (!isOpen) return;
    // Load categories and cards for org
    const load = async () => {
      if (organization?.id && organization.id !== 'default-org') {
        const [{ data: cats }, { data: cardsData }] = await Promise.all([
          supabase.from('budget_categories').select('*').eq('organization_id', organization.id).order('name'),
          supabase.from('cards').select('*').eq('organization_id', organization.id).eq('is_active', true).order('name')
        ]);
        setCategories(cats || []);
        setCards(cardsData || []);
      } else {
        setCategories([]);
        setCards([]);
      }
    };
    load();
  }, [isOpen, organization]);

  const ownerOptions = useMemo(() => (costCenters || []).map(cc => ({ id: cc.id, name: cc.name })), [costCenters]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!organization?.id || !orgUser?.id) return;
    if (!form.description || !form.amount || !form.date) return;
    if (!form.owner_name) return;
    setSaving(true);
    try {
      // Resolve IDs by selections
      const costCenter = ownerOptions.find(o => o.name === form.owner_name);
      const category = categories.find(c => c.id === form.category_id);
      if (!costCenter) throw new Error('Responsável inválido');

      if (isCredit) {
        if (!form.card_id || !form.installments) throw new Error('Cartão e parcelas são obrigatórios');
        // Call create_installments RPC
        const { error } = await supabase.rpc('create_installments', {
          p_amount: Number(form.amount),
          p_installments: Number(form.installments),
          p_description: form.description,
          p_date: form.date,
          p_card_id: form.card_id,
          p_category_id: category?.id || null,
          p_cost_center_id: costCenter.id,
          p_owner: form.owner_name,
          p_organization_id: organization.id,
          p_user_id: orgUser.id,
          p_whatsapp_message_id: null
        });
        if (error) throw error;
      } else {
        // Insert single expense
        const insertData = {
          organization_id: organization.id,
          user_id: orgUser.id,
          cost_center_id: costCenter.id,
          owner: form.owner_name,
          category_id: category?.id || null,
          category: category?.name || null,
          amount: Number(form.amount),
          description: form.description,
          date: form.date,
          payment_method: form.payment_method,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: orgUser.id,
          source: 'manual'
        };
        const { error } = await supabase.from('expenses').insert(insertData);
        if (error) throw error;
      }
      onClose?.();
      onSuccess?.();
    } catch (e) {
      alert('Erro ao salvar despesa');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <CreditIcon className="h-4 w-4 text-white" />
              </div>
              <span>Nova Despesa</span>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Mercado, Farmácia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Responsável *</label>
                <select
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione...</option>
                  {ownerOptions.map(o => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="cash">Dinheiro</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              {isCredit && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cartão *</label>
                    <select
                      value={form.card_id}
                      onChange={(e) => setForm({ ...form, card_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Selecione...</option>
                      {cards.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parcelas *</label>
                    <select
                      value={form.installments}
                      onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}x</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


