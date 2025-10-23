import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Edit, 
  Trash2, 
  PlusCircle,
  CheckCircle,
  DollarSign 
} from 'lucide-react';

export default function InvestmentProgressCard({ 
  goal, 
  contributions = [],
  onEdit,
  onDelete,
  onAddContribution,
  costCenters = []
}) {
  const [showContributions, setShowContributions] = useState(false);

  // Calcular progresso
  const totalContributed = contributions
    .filter(c => c.confirmed)
    .reduce((sum, c) => sum + Number(c.amount), 0);
  
  const progressPercentage = (totalContributed / Number(goal.target_amount)) * 100;
  const remaining = Math.max(0, Number(goal.target_amount) - totalContributed);

  const getFrequencyLabel = (frequency) => {
    const labels = {
      monthly: 'Mensal',
      biweekly: 'Quinzenal',
      weekly: 'Semanal'
    };
    return labels[frequency] || frequency;
  };

  const costCenter = costCenters.find(cc => cc.id === goal.cost_center_id);

  return (
    <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="h-5 w-5 text-flight-blue" />
              <CardTitle className="text-lg font-semibold text-gray-900">
                {goal.name}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Badge className="bg-flight-blue/10 text-flight-blue">
                {getFrequencyLabel(goal.frequency)}
              </Badge>
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Dia {goal.due_day}
              </span>
              {costCenter && (
                <span className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full mr-1" 
                    style={{ backgroundColor: costCenter.color }}
                  />
                  {costCenter.name}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={onEdit}
              size="sm"
              variant="outline"
              className="border-gray-300"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              onClick={onDelete}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progresso</span>
            <span className={`font-semibold ${
              progressPercentage >= 100 ? 'text-green-600' : 'text-flight-blue'
            }`}>
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercentage >= 100 
                  ? 'bg-gradient-to-r from-green-500 to-green-600' 
                  : 'bg-gradient-to-r from-flight-blue to-blue-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Meta</div>
            <div className="font-semibold text-gray-900">
              R$ {Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Investido</div>
            <div className="font-semibold text-green-700 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              R$ {totalContributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Restante</div>
            <div className="font-semibold text-orange-700">
              R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-2">
          <Button
            onClick={onAddContribution}
            size="sm"
            className="flex-1 bg-flight-blue hover:bg-flight-blue/90 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar Aporte
          </Button>
          
          {contributions.length > 0 && (
            <Button
              onClick={() => setShowContributions(!showContributions)}
              size="sm"
              variant="outline"
              className="border-gray-300"
            >
              {showContributions ? 'Ocultar' : `Ver ${contributions.length}`}
            </Button>
          )}
        </div>

        {/* Contributions List */}
        {showContributions && contributions.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Histórico de Aportes ({contributions.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {contributions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((contribution) => (
                  <div
                    key={contribution.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="flex items-center space-x-3">
                      {contribution.confirmed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Calendar className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          R$ {Number(contribution.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(contribution.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <Badge className={
                      contribution.confirmed 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }>
                      {contribution.confirmed ? 'Confirmado' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Goal Completed Badge */}
        {progressPercentage >= 100 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="text-sm text-green-800">
              <span className="font-semibold">Meta atingida! 🎉</span>
              <p className="text-xs text-green-700 mt-0.5">
                Parabéns! Você completou esta meta de investimento.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

