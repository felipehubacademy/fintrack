import { DeleteAccountPage } from './delete-account';
import { localeServerSideProps } from '../lib/publicLocale';

// Localized alias of /delete-account (defaults to es; ?lang= still wins).
export default DeleteAccountPage;

export const getServerSideProps = localeServerSideProps('es');
