import { useState, useEffect } from 'react';
import { Card, CardContent } from './Card';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import Tooltip from './Tooltip';

/**
 * ResponsiveTable - Componente que renderiza tabelas em desktop e cards em mobile
 * 
 * @param {Array} columns - Array de objetos com configuração das colunas
 *   { key, label, render?, sortable?, mobileLabel? }
 * @param {Array} data - Array de dados para renderizar
 * @param {Function} renderRowActions - Função que renderiza ações da linha (recebe item)
 * @param {Object} sortConfig - { key, direction } - Estado de ordenação
 * @param {Function} onSort - Callback quando coluna é clicada para ordenar
 * @param {Function} renderEmptyState - Função opcional para renderizar estado vazio
 * @param {Boolean} enableSelection - Habilitar seleção múltipla
 * @param {Array} selectedItems - Array de IDs selecionados
 * @param {Function} onSelectionChange - Callback quando seleção muda (recebe itemId, checked)
 * @param {Function} onSelectAll - Callback para selecionar/desselecionar todos
 * @param {Boolean} allSelected - Se todos os itens estão selecionados
 */
export default function ResponsiveTable({
  columns = [],
  data = [],
  renderRowActions,
  sortConfig = null,
  onSort = null,
  renderEmptyState = null,
  className = '',
  enableSelection = false,
  selectedItems = [],
  onSelectionChange = null,
  onSelectAll = null,
  allSelected = false,
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Função para obter ícone de ordenação
  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortConfig.direction === 'asc' 
      ? <span className="text-gray-600">↑</span>
      : <span className="text-gray-600">↓</span>;
  };

  // Renderizar estado vazio
  if (data.length === 0) {
    if (renderEmptyState) {
      return renderEmptyState();
    }
    return (
      <div className="p-8 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-gray-600">Nenhum item encontrado</p>
      </div>
    );
  }

  // Renderização Desktop (Tabela)
  if (!isMobile) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {enableSelection && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={allSelected && data.length > 0}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                    className="h-4 w-4 text-flight-blue focus:ring-flight-blue border-gray-300 rounded cursor-pointer"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable && onSort
                      ? 'cursor-pointer hover:bg-gray-100 select-none'
                      : ''
                  }`}
                  onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
                >
                  {column.sortable && onSort ? (
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {getSortIcon(column.key)}
                    </div>
                  ) : (
                    <span>{column.label}</span>
                  )}
                </th>
              ))}
              {renderRowActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              const itemId = item.id || index;
              const isSelected = selectedItems.includes(itemId);
              
              return (
                <tr 
                  key={itemId} 
                  className={`hover:bg-gray-50 transition ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  {enableSelection && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectionChange && onSelectionChange(itemId, e.target.checked)}
                        className="h-4 w-4 text-flight-blue focus:ring-flight-blue border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(item, index) : item[column.key]}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {renderRowActions(item, index)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Renderização Mobile (Cards)
  return (
    <div className={`space-y-4 ${className}`}>
      {enableSelection && onSelectAll && data.length > 0 && (
        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="h-4 w-4 text-flight-blue focus:ring-flight-blue border-gray-300 rounded cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700">Selecionar todos</span>
        </div>
      )}
      {data.map((item, index) => {
        const itemId = item.id || index;
        const isSelected = selectedItems.includes(itemId);
        
        return (
          <Card 
            key={itemId} 
            className={`border shadow-sm ${isSelected ? 'border-flight-blue bg-blue-50' : 'border-gray-200'}`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {enableSelection && (
                  <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectionChange && onSelectionChange(itemId, e.target.checked)}
                      className="h-4 w-4 text-flight-blue focus:ring-flight-blue border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">Selecionar</span>
                  </div>
                )}
                {columns.map((column) => {
                  const label = column.mobileLabel || column.label;
                  const value = column.render ? column.render(item, index) : item[column.key];
                  
                  // Não mostrar colunas vazias em mobile (opcional)
                  if (!value && column.hideIfEmpty) return null;
                  
                  // Se a coluna tem mobileRender, usar ela
                  const displayValue = column.mobileRender ? column.mobileRender(item, index) : value;
                  
                  // Obter cor do texto mobile (pode ser função ou string)
                  const mobileColor = typeof column.mobileTextColor === 'function' 
                    ? column.mobileTextColor(item, index)
                    : (column.mobileTextColor || 'text-gray-900');
                  
                  return (
                    <div key={column.key} className="flex flex-col space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {label}
                      </div>
                      <div className={`text-sm ${mobileColor} break-words`}>
                        {displayValue || '-'}
                      </div>
                    </div>
                  );
                })}
                
                {/* Ações no mobile */}
                {renderRowActions && (
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-end space-x-2 min-h-[44px]">
                    {renderRowActions(item, index)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

