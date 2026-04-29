import Link from 'next/link';
import { getHomeSnapshot } from '@/lib/app-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { courseCount, eventCount, classCount, latestPlan, profile } = await getHomeSnapshot();

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <div className="hero-card">
          <span className="eyebrow">Study+ · planner académico</span>
          <h1>Organiza tu semana con una experiencia más limpia, simple y demostrable.</h1>
          <p>
            Study+ ahora inicia con la información reiniciada al abrir, incluye carga de demo académica y muestra el
            estado del sistema con una interfaz clara, minimalista y enfocada en la experiencia.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/onboarding">Configurar datos</Link>
            <Link className="button secondary" href="/planner">Generar plan semanal</Link>
            <Link className="button ghost" href="/dashboard">Ver tablero</Link>
          </div>
          <div className="three-points">
            <div className="mini-card"><strong>Se reinicia al abrir</strong><span>Evita que se mezclen datos de otros usuarios o de sesiones anteriores.</span></div>
            <div className="mini-card"><strong>Trae demo integrada</strong><span>Puedes cargar datos de ejemplo rápidamente para exponer el MVP.</span></div>
            <div className="mini-card"><strong>Respeta el contexto real</strong><span>Combina clases, eventos, clima, movilidad y la fecha actual de Bogotá.</span></div>
          </div>
        </div>

        <div className="stats-panel">
          <div className="metric-card"><span>Materias</span><strong>{courseCount}</strong><small>registradas</small></div>
          <div className="metric-card"><span>Eventos</span><strong>{eventCount}</strong><small>académicos</small></div>
          <div className="metric-card"><span>Clases</span><strong>{classCount}</strong><small>horario semanal</small></div>
          <div className="metric-card"><span>Bloques</span><strong>{latestPlan?.items.length ?? 0}</strong><small>último plan</small></div>
          <div className="metric-card wide"><span>Movilidad</span><strong className="metric-soft">{profile ? 'Lista' : 'Pendiente'}</strong><small>{profile ? profile.transportMode : 'configura tu dirección'}</small></div>
        </div>
      </section>

      <section className="grid-main three-col">
        <div className="card">
          <h2>Más limpio</h2>
          <p className="muted">Nuevo estilo visual claro, sobrio y minimalista, inspirado en interfaces del ecosistema Apple.</p>
        </div>
        <div className="card">
          <h2>Más seguro para demo</h2>
          <p className="muted">Cada sesión se inicia vacía para que no queden restos de uso anterior visibles en pantalla.</p>
        </div>
        <div className="card">
          <h2>Más consistente</h2>
          <p className="muted">Inicio, dashboard y planner se renderizan dinámicamente para reflejar los datos recién cargados.</p>
        </div>
      </section>
    </div>
  );
}
