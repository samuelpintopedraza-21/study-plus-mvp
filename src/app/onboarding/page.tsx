'use client';

import { useEffect, useState } from 'react';


type Course = { id: string; name: string; code: string; difficulty: number; weeklyHours: number; credits: number };
type Event = { id: string; title: string; type: string; dueDate: string; estimatedHours: number; courseId?: string | null; course?: { name: string } | null };
type ClassSession = { id: string; weekday: number; startTime: string; endTime: string; location?: string | null; course?: { name: string; code: string } | null };
type Profile = { id: string; homeAddress: string; transportMode: 'carro' | 'publico' } | null;
type Commute = { distanceKm: number; minutes: number; summary: string; mode: 'carro' | 'publico' } | null;

const weekdayLabels: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
};

export default function OnboardingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [profile, setProfile] = useState<Profile>(null);
  const [commute, setCommute] = useState<Commute>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: '', code: '', difficulty: 3, weeklyHours: 3, credits: 3 });
  const [eventForm, setEventForm] = useState({ title: '', type: 'Entrega', estimatedHours: 2, dueDate: '', courseId: '' });
  const [classForm, setClassForm] = useState({ courseId: '', weekday: 1, startTime: '08:00', endTime: '09:20', location: 'Uniandes' });
  const [profileForm, setProfileForm] = useState({ homeAddress: '', transportMode: 'publico' as 'carro' | 'publico' });

  async function load() {
    const [cRes, eRes, sRes, pRes] = await Promise.all([
      fetch('/api/courses', { cache: 'no-store' }),
      fetch('/api/academic-events', { cache: 'no-store' }),
      fetch('/api/class-sessions', { cache: 'no-store' }),
      fetch('/api/student-profile', { cache: 'no-store' }),
    ]);

    const [c, e, s, p] = await Promise.all([cRes.json(), eRes.json(), sRes.json(), pRes.json()]);

    setCourses(Array.isArray(c) ? c : []);
    setEvents(Array.isArray(e) ? e : []);
    setClassSessions(Array.isArray(s) ? s : []);
    setProfile(p?.profile || null);
    setCommute(p?.commute || null);
    if (p?.profile) setProfileForm({ homeAddress: p.profile.homeAddress, transportMode: p.profile.transportMode });
    else setProfileForm({ homeAddress: '', transportMode: 'publico' });
  }

  useEffect(() => {
    load();
  }, []);

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courseForm) });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'No se pudo guardar la materia.');
    setMessage('Materia guardada.');
    setCourseForm({ name: '', code: '', difficulty: 3, weeklyHours: 3, credits: 3 });
    load();
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/academic-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventForm) });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'No se pudo guardar el evento.');
    setMessage('Evento guardado.');
    setEventForm({ title: '', type: 'Entrega', estimatedHours: 2, dueDate: '', courseId: '' });
    load();
  }

  async function saveClass(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/class-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classForm) });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'No se pudo guardar la clase.');
    setMessage('Clase guardada en tu horario semanal.');
    setClassForm({ courseId: classForm.courseId, weekday: 1, startTime: '08:00', endTime: '09:20', location: 'Uniandes' });
    load();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/student-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForm) });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'No se pudo guardar la ubicación.');
    setProfile(data.profile);
    setCommute(data.commute);
    setMessage('Ubicación y modo de transporte guardados.');
    load();
  }

  async function del(path: string) {
    setError('');
    const res = await fetch(path, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || 'No se pudo eliminar el registro.');
    load();
  }

  async function loadDemo() {
    setLoadingDemo(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/demo/load', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo cargar la demo.');
        return;
      }
      setMessage('Demo cargada correctamente.');
      await load();
    } finally {
      setLoadingDemo(false);
    }
  }

  async function clearAll() {
    setCleaning(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/session/clear', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo limpiar la información.');
        return;
      }
      setMessage('Se reinició toda la información de la sesión actual.');
      await load();
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="section-banner">
        <div>
          <span className="eyebrow">Paso 1</span>
          <h1>Configura la base del planner</h1>
          <p className="muted">
            Puedes cargar una demo para exponer el MVP o registrar tus datos manualmente. Cada nueva apertura reinicia
            automáticamente la información para evitar residuos de otras sesiones.
          </p>
        </div>
        <div className="hero-actions">
          <button className="button secondary" type="button" onClick={loadDemo} disabled={loadingDemo}>
            {loadingDemo ? 'Cargando demo...' : 'Cargar demo'}
          </button>
          <button className="button ghost" type="button" onClick={clearAll} disabled={cleaning}>
            {cleaning ? 'Limpiando...' : 'Reiniciar todo'}
          </button>
        </div>
      </section>

      {!!message && <div className="success">{message}</div>}
      {!!error && <div className="error">{error}</div>}

      <div className="grid-main onboarding-grid">
        <section className="card">
          <div className="section-head split">
            <div>
              <span className="eyebrow subtle">Movilidad</span>
              <h2>Dirección y transporte</h2>
            </div>
            <span className="badge">Uniandes → hogar</span>
          </div>
          <form className="stack-md" onSubmit={saveProfile}>
            <div className="input-group"><label>Dirección de referencia en Bogotá</label><input value={profileForm.homeAddress} onChange={(e) => setProfileForm({ ...profileForm, homeAddress: e.target.value })} placeholder="Ej. Carrera 15 #100-20, Bogotá" /></div>
            <div className="input-group"><label>Modo habitual de transporte</label><select value={profileForm.transportMode} onChange={(e) => setProfileForm({ ...profileForm, transportMode: e.target.value as 'carro' | 'publico' })}><option value="publico">Transporte público</option><option value="carro">Carro</option></select></div>
            <button className="button primary" type="submit">Guardar contexto</button>
          </form>
          <div className="stack-md" style={{ marginTop: 18 }}>
            {profile ? <div className="data-tile"><div><h3>{profile.homeAddress}</h3><p className="muted">Modo: {profile.transportMode === 'carro' ? 'Carro' : 'Transporte público'}</p><p className="muted">{commute?.summary || 'Calculando trayecto...'}</p></div><div className="mini-score">{commute ? `${commute.distanceKm} km` : '--'}</div></div> : <div className="empty-state">Aún no has configurado tu dirección de referencia.</div>}
          </div>
        </section>

        <section className="card">
          <div className="section-head split"><div><span className="eyebrow subtle">Académico</span><h2>Registra materias</h2></div><span className="badge">{courses.length} materias</span></div>
          <form className="stack-md" onSubmit={saveCourse}>
            <div className="input-group"><label>Nombre</label><input value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="Ej. Precálculo" /></div>
            <div className="input-group"><label>Código</label><input value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="Ej. MATE-1201" /></div>
            <div className="form-grid-3"><div className="input-group"><label>Dificultad</label><input type="number" min="1" max="5" value={courseForm.difficulty} onChange={(e) => setCourseForm({ ...courseForm, difficulty: Number(e.target.value) })} /></div><div className="input-group"><label>Horas / semana</label><input type="number" min="1" value={courseForm.weeklyHours} onChange={(e) => setCourseForm({ ...courseForm, weeklyHours: Number(e.target.value) })} /></div><div className="input-group"><label>Créditos</label><input type="number" min="1" value={courseForm.credits} onChange={(e) => setCourseForm({ ...courseForm, credits: Number(e.target.value) })} /></div></div>
            <button className="button primary" type="submit">Guardar materia</button>
          </form>
          <div className="stack-sm" style={{ marginTop: 16 }}>{courses.length ? courses.map((course) => <article className="data-tile" key={course.id}><div><h3>{course.name}</h3><p className="muted">{course.code} · dificultad {course.difficulty}/5 · {course.weeklyHours} h/semana</p></div><div className="tile-side"><span className="badge">{course.credits} cr.</span><button className="button danger compact" onClick={() => del(`/api/courses?id=${course.id}`)}>Eliminar</button></div></article>) : <div className="empty-state">Todavía no hay materias registradas.</div>}</div>
        </section>

        <section className="card">
          <div className="section-head split"><div><span className="eyebrow subtle">Horario</span><h2>Registra tus clases</h2></div><span className="badge">{classSessions.length} clases</span></div>
          <p className="muted">Solo se permiten lunes a viernes. Sábado y domingo se tratan como días sin clases.</p>
          <form className="stack-md" onSubmit={saveClass}>
            <div className="input-group"><label>Materia</label><select value={classForm.courseId} onChange={(e) => setClassForm({ ...classForm, courseId: e.target.value })}><option value="">Selecciona una materia</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></div>
            <div className="form-grid-3"><div className="input-group"><label>Día</label><select value={classForm.weekday} onChange={(e) => setClassForm({ ...classForm, weekday: Number(e.target.value) })}>{Object.entries(weekdayLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="input-group"><label>Inicio</label><input type="time" value={classForm.startTime} onChange={(e) => setClassForm({ ...classForm, startTime: e.target.value })} /></div><div className="input-group"><label>Fin</label><input type="time" value={classForm.endTime} onChange={(e) => setClassForm({ ...classForm, endTime: e.target.value })} /></div></div>
            <div className="input-group"><label>Ubicación</label><input value={classForm.location} onChange={(e) => setClassForm({ ...classForm, location: e.target.value })} placeholder="Ej. ML-608, Uniandes" /></div>
            <button className="button primary" type="submit">Guardar clase</button>
          </form>
          <div className="stack-sm" style={{ marginTop: 16 }}>{classSessions.length ? classSessions.map((session) => <article className="data-tile" key={session.id}><div><h3>{session.course?.name || 'Materia'}</h3><p className="muted">{weekdayLabels[session.weekday]} · {session.startTime}-{session.endTime} · {session.location || 'Uniandes'}</p></div><div className="tile-side"><span className="badge">{session.course?.code || 'Clase'}</span><button className="button danger compact" onClick={() => del(`/api/class-sessions?id=${session.id}`)}>Eliminar</button></div></article>) : <div className="empty-state">Todavía no has registrado clases.</div>}</div>
        </section>

        <section className="card">
          <div className="section-head split"><div><span className="eyebrow subtle">Agenda</span><h2>Registra eventos</h2></div><span className="badge">{events.length} eventos</span></div>
          <form className="stack-md" onSubmit={saveEvent}>
            <div className="input-group"><label>Título del evento</label><input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Ej. Parcial IP" /></div>
            <div className="form-grid-2"><div className="input-group"><label>Tipo</label><select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}><option>Entrega</option><option>Examen</option><option>Quiz</option></select></div><div className="input-group"><label>Horas para prepararlo</label><input type="number" min="1" value={eventForm.estimatedHours} onChange={(e) => setEventForm({ ...eventForm, estimatedHours: Number(e.target.value) })} /></div></div>
            <div className="input-group"><label>Fecha y hora límite</label><input type="datetime-local" value={eventForm.dueDate} onChange={(e) => setEventForm({ ...eventForm, dueDate: e.target.value })} /></div>
            <div className="input-group"><label>Materia asociada</label><select value={eventForm.courseId} onChange={(e) => setEventForm({ ...eventForm, courseId: e.target.value })}><option value="">Sin materia asociada</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></div>
            <button className="button primary" type="submit">Guardar evento</button>
          </form>
          <div className="stack-sm" style={{ marginTop: 16 }}>{events.length ? events.map((event) => <article className="data-tile" key={event.id}><div><h3>{event.title}</h3><p className="muted">{new Date(event.dueDate).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · {event.estimatedHours} h · {event.course?.name || 'Sin materia'}</p></div><div className="tile-side"><span className="badge">{event.type}</span><button className="button danger compact" onClick={() => del(`/api/academic-events?id=${event.id}`)}>Eliminar</button></div></article>) : <div className="empty-state">Todavía no hay eventos registrados.</div>}</div>
        </section>
      </div>
    </div>
  );
}
