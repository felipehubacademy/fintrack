import GetAppPage from '../../components/billing/GetAppPage';
import { subscribeServerSideProps } from '../../lib/billingPages';

// Sends phones to their store; computers see the store buttons (lib/billingPages.js).
export default GetAppPage;

export const getServerSideProps = subscribeServerSideProps('subscribe', ['en']);
