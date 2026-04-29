import Link from 'next/link';

export function Nav() {
  return (
    <header className="topbar">
      <div>
        <div className="brand">Study+</div>
        <div className="sub">v7 · demo limpia al abrir · horario de clases · clima y movilidad</div>
      </div>
      <nav className="navlinks">
        <Link href="/">Inicio</Link>
        <Link href="/onboarding">Onboarding</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/planner">Planner</Link>
      </nav>
    </header>
  );
}
