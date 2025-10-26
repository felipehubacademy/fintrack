import Tooltip from './Tooltip';
import { HelpCircle } from 'lucide-react';

export default function HelpTooltip({ content, autoOpen = false }) {
  return (
    <Tooltip content={content} position="top" autoOpen={autoOpen}>
      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
    </Tooltip>
  );
}

