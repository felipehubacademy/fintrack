import { DeleteAccountPage } from './delete-account';
import { localeServerSideProps } from '../lib/publicLocale';

// Localized alias of /delete-account (defaults to pt; ?lang= still wins).
export default DeleteAccountPage;

export const getServerSideProps = localeServerSideProps('pt');
