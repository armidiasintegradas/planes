import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Planes Gestão | Japaratinga Resort – Expansão 3',
  description: 'Planejamento, execução e inteligência em tempo real para a obra Japaratinga Resort – Expansão 3.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
