import Tooltip from './Tooltip';
import { HelpCircle } from 'lucide-react';

export default function HelpTooltip({ content, autoOpen = false, wide = false, position = 'right' }) {
  return (
    <Tooltip content={content} position={position} autoOpen={autoOpen} wide={wide}>
      <div className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-2 md:p-0 -m-2 md:m-0">
        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help md:cursor-help" />
      </div>
    </Tooltip>
  );
}

