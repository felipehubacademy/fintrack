import PaymentsSoonPage from '../../components/billing/PaymentsSoonPage';
import { subscribeServerSideProps } from '../../lib/billingPages';

// Redirects to the RevenueCat Web Purchase Link (see lib/billingPages.js).
export default PaymentsSoonPage;

export const getServerSideProps = subscribeServerSideProps('subscribe', ['en']);
