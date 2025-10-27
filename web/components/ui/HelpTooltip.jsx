import Tooltip from './Tooltip';
import { HelpCircle } from 'lucide-react';

export default function HelpTooltip({ content, autoOpen = false, wide = false, position = 'right' }) {
  return (
    <Tooltip content={content} position={position} autoOpen={autoOpen} wide={wide}>
      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
    </Tooltip>
  );
}

