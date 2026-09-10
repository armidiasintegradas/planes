import type { Metadata } from 'next';
import './globals.css';
import AuthGate from '../components/AuthGate';
import EmailLifecycleKick from '../components/EmailLifecycleKick';

export const metadata: Metadata = {
  title: 'Planes Gestão | Japaratinga Resort – Expansão 3',
  description: 'Planejamento, execução e inteligência em tempo real para a obra Japaratinga Resort – Expansão 3.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <EmailLifecycleKick />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
