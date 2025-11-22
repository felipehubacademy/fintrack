import Image from 'next/image';
import Link from 'next/link';

export default function Logo({ className = "h-24 w-24", ...props }) {
  return (
    <Link href="/dashboard" className="cursor-pointer hover:opacity-80 transition-opacity">
      <Image
        src="/images/logo_flat.svg"
        alt="MeuAzulão Logo"
        width={96}
        height={96}
        className={`${className} p-0 m-0`}
        style={{ padding: 0, margin: 0 }}
        {...props}
      />
    </Link>
  );
}
