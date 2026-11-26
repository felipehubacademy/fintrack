import { useBillingStatus } from '../../hooks/useBillingStatus';
import PaywallModal from './PaywallModal';

/**
 * Wraps an add/edit modal ({ isOpen, onClose, ... }). When the household has
 * no access (trial over, no Plus) opening it shows the paywall instead, so
 * every button that opens the form is gated in one place. Reading, deleting
 * and everything else keep working.
 */
export default function withPaywall(Modal) {
  function Gated(props) {
    const { hasAccess } = useBillingStatus();
    if (props.isOpen && !hasAccess) {
      return <PaywallModal isOpen onClose={props.onClose} />;
    }
    return <Modal {...props} />;
  }
  Gated.displayName = `withPaywall(${Modal.displayName || Modal.name || 'Modal'})`;
  return Gated;
}
