import './globals.css';
import { Nav } from '@/components/Nav';
import { AppBoot } from '@/components/AppBoot';

export const metadata = {
  title: 'Study+ v7',
  description: 'Planificador académico con reinicio automático, demo integrada y estilo minimalista.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppBoot />
        <div className="background-grid" />
        <main className="container">
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
