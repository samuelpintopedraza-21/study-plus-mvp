import { getDashboardSnapshot } from '@/lib/app-data';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const weekdayLabels: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes' };

export default async function DashboardPage() {
  const { courses, events, classSessions, latestPlan, profile } = await getDashboardSnapshot();

  return (
    <div className="page-stack">
      <section className="grid-main planner-top-grid">
        <div className="card">
          <div className="section-head split">
            <div>
              <span className="eyebrow subtle">Radar académico</span>
              <h2>Estado actual</h2>
            </div>
            <span className="badge">Bogotá</span>
          </div>
          <div className="stats-panel clean-stats">
            <div className="metric-card"><span>Materias</span><strong>{courses.length}</strong><small>registradas</small></div>
            <div className="metric-card"><span>Eventos</span><strong>{events.length}</strong><small>pendientes</small></div>
            <div className="metric-card"><span>Clases</span><strong>{classSessions.length}</strong><small>horario semanal</small></div>
            <div className="metric-card"><span>Bloques</span><strong>{latestPlan?.items.length ?? 0}</strong><small>último plan</small></div>
          </div>
        </div>

        <div className="card">
          <div className="section-head split"><h2>Contexto</h2><span className="badge">Movilidad</span></div>
          <div className="stack-sm">
            <div className="info-line"><strong>Dirección:</strong><span>{profile?.homeAddress || 'No configurada'}</span></div>
            <div className="info-line"><strong>Modo:</strong><span>{profile?.transportMode === 'carro' ? 'Carro' : profile?.transportMode === 'publico' ? 'Transporte público' : 'Pendiente'}</span></div>
            <div className="info-line"><strong>Último plan:</strong><span>{latestPlan?.rationale || 'Todavía no se ha generado.'}</span></div>
          </div>
        </div>
      </section>

      <section className="grid-main three-col">
        <div className="card">
          <div className="section-head split"><h2>Materias</h2><span className="badge">Académico</span></div>
          <div className="stack-sm">
            {courses.length ? courses.map((course) => (
              <article className="data-tile" key={course.id}><div><h3>{course.name}</h3><p className="muted">{course.code} · dificultad {course.difficulty}/5 · {course.weeklyHours} h/semana</p></div><span className="badge">{course.credits} cr.</span></article>
            )) : <div className="empty-state">No hay materias aún.</div>}
          </div>
        </div>

        <div className="card">
          <div className="section-head split"><h2>Horario de clases</h2><span className="badge">L-V</span></div>
          <div className="stack-sm">
            {classSessions.length ? classSessions.map((session) => (
              <article className="data-tile" key={session.id}><div><h3>{session.course?.name || 'Clase'}</h3><p className="muted">{weekdayLabels[session.weekday]} · {session.startTime}-{session.endTime} · {session.location || 'Uniandes'}</p></div><span className="badge">{session.course?.code || 'Clase'}</span></article>
            )) : <div className="empty-state">No hay clases registradas.</div>}
          </div>
        </div>

        <div className="card">
          <div className="section-head split"><h2>Eventos próximos</h2><span className="badge">Agenda</span></div>
          <div className="stack-sm">
            {events.length ? events.map((event) => (
              <article className="data-tile" key={event.id}><div><h3>{event.title}</h3><p className="muted">{formatDateTime(event.dueDate)} · {event.estimatedHours} h · {event.course?.name || 'Sin materia'}</p></div><span className="badge accent">{event.type}</span></article>
            )) : <div className="empty-state">No hay eventos todavía.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
