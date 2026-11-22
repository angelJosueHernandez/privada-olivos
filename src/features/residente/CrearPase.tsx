import { FormEvent, ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { Opciones } from '../../shared/ui/Opciones'
import Icon from '../../shared/ui/Icon'
import { DiaPase, HORARIOS, HorarioPase, MOTIVOS, NuevoPase } from '../caseta/tipos'

function Seccion({ titulo, nota, children, retraso = 0 }: { titulo: string; nota?: string; children: ReactNode; retraso?: number }) {
  return (
    <section className="anim-entrar" style={{ animationDelay: `${retraso}ms` }}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{titulo}</h3>
        {nota && <span className="text-[0.8125rem] text-suave">{nota}</span>}
      </div>
      {children}
    </section>
  )
}

const campo = 'block w-full h-14 rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none ' +
  'transition-[box-shadow] duration-150 focus:ring-2 focus:ring-acento placeholder:text-texto/40'

/** Horarios que todavía sirven hoy (no se ofrece "Mañana 8–14" si ya son las 15:00) */
const horariosDisponibles = (dia: DiaPase) => {
  const h = new Date().getHours()
  return HORARIOS.filter((x) => dia === 'MANANA' || x.hasta > h)
}

/* Formulario del residente para crear un pase de visita. Casi todo se elige con opciones. */
export default function CrearPase({ idFormulario, onCrear }: { idFormulario: string; onCrear: (d: NuevoPase) => Promise<void> }) {
  const [visitante, setVisitante] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  const [dia, setDia] = useState<DiaPase>(() => (horariosDisponibles('HOY').length ? 'HOY' : 'MANANA'))
  const [horario, setHorario] = useState<HorarioPase | null>(() => horariosDisponibles(dia).find((x) => x.valor === 'DIA')?.valor ?? horariosDisponibles(dia)[0]?.valor ?? null)
  const [personas, setPersonas] = useState('1')
  const [enVehiculo, setEnVehiculo] = useState<'NO' | 'SI'>('NO')
  const [placas, setPlacas] = useState('')
  const [error, setError] = useState('')

  const horarios = horariosDisponibles(dia)
  const cambiarDia = (d: DiaPase) => {
    setDia(d)
    if (!horariosDisponibles(d).some((x) => x.valor === horario)) setHorario(horariosDisponibles(d)[0]?.valor ?? null)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const nombre = visitante.trim().replace(/\s+/g, ' ')
    const placa = placas.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    const falta = nombre.length < 3 ? 'Escribe el nombre de tu visita.' : !horario ? 'Elige el horario.' : enVehiculo === 'SI' && placa && placa.replace(/-/g, '').length < 5 ? 'Revisa las placas.' : ''
    if (falta) { setError(falta); toast.error(falta); return }
    setError('')
    await onCrear({
      visitante: nombre.slice(0, 80), motivo: motivo ?? undefined, dia, horario: horario!,
      personas: personas === '5+' ? 5 : Number(personas), placas: enVehiculo === 'SI' && placa ? placa.slice(0, 12) : undefined,
    })
  }

  return (
    <form id={idFormulario} onSubmit={enviar} noValidate className="space-y-8">
      <Seccion titulo="¿Quién te visita?">
        <label htmlFor="visitante" className="sr-only">Nombre de la visita</label>
        <input id="visitante" className={campo} value={visitante} onChange={(e) => setVisitante(e.target.value)}
          placeholder="Nombre y apellido" autoComplete="off" autoCapitalize="words" maxLength={80} enterKeyHint="done" />
        <p className="mt-2 px-1 text-[0.8125rem] text-suave">El guardia lo verá al escanear el código para confirmar quién es.</p>
      </Seccion>

      <Seccion titulo="Motivo" nota="Opcional" retraso={40}>
        <Opciones etiqueta="Motivo" valor={motivo} onCambio={setMotivo} opciones={MOTIVOS.map((m) => ({ valor: m, etiqueta: m }))} />
      </Seccion>

      <Seccion titulo="¿Cuándo?" retraso={80}>
        <div className="space-y-3">
          <Opciones etiqueta="Día" valor={dia} opcional={false} onCambio={(v) => v && cambiarDia(v)} cuadricula="grid grid-cols-2 gap-2"
            opciones={[
              { valor: 'HOY' as DiaPase, etiqueta: 'Hoy', extra: <Icon n="calendario" size={17} /> },
              { valor: 'MANANA' as DiaPase, etiqueta: 'Mañana', extra: <Icon n="calendario" size={17} /> },
            ].filter((o) => o.valor === 'MANANA' || horariosDisponibles('HOY').length > 0)} />
          <Opciones etiqueta="Horario" valor={horario} opcional={false} onCambio={(v) => v && setHorario(v)} cuadricula="grid grid-cols-2 gap-2"
            opciones={horarios.map((h) => ({
              valor: h.valor,
              etiqueta: <span className="flex flex-col leading-tight py-1.5"><span>{h.etiqueta}</span><span className="text-[0.8125rem] opacity-75 cifras">{String(h.desde).padStart(2, '0')}:00 – {h.hasta}:00</span></span>,
            }))} />
        </div>
      </Seccion>

      <Seccion titulo="¿Cuántas personas?" retraso={120}>
        <Opciones etiqueta="Personas" valor={personas} opcional={false} onCambio={(v) => v && setPersonas(v)} cuadricula="grid grid-cols-5 gap-2"
          opciones={['1', '2', '3', '4', '5+'].map((n) => ({ valor: n, etiqueta: <span className="cifras">{n}</span> }))} />
      </Seccion>

      <Seccion titulo="¿Cómo llega?" retraso={160}>
        <Opciones etiqueta="Cómo llega" valor={enVehiculo} opcional={false} onCambio={(v) => v && setEnVehiculo(v)} cuadricula="grid grid-cols-2 gap-2"
          opciones={[
            { valor: 'NO' as const, etiqueta: 'A pie o en taxi', extra: <Icon n="visita" size={18} /> },
            { valor: 'SI' as const, etiqueta: 'En su vehículo', extra: <Icon n="auto" size={18} /> },
          ]} />
        {enVehiculo === 'SI' && (
          <div className="anim-llenar mt-3">
            <label htmlFor="placas" className="mb-1.5 block px-1 text-[0.875rem] font-medium">Placas <span className="font-normal text-suave">(opcional)</span></label>
            <input id="placas" className={`${campo} font-semibold uppercase tracking-[0.08em]`} value={placas}
              onChange={(e) => setPlacas(e.target.value.toUpperCase())} placeholder="ABC-123-D" autoComplete="off"
              autoCapitalize="characters" spellCheck={false} maxLength={12} enterKeyHint="done" />
            <p className="mt-2 px-1 text-[0.8125rem] text-suave">El guardia revisará que las placas coincidan al llegar.</p>
          </div>
        )}
      </Seccion>

      {error && <p role="alert" className="anim-sacudir rounded-[14px] bg-peligro/[0.08] px-4 py-3 text-[0.9375rem] font-medium text-peligro">{error}</p>}
    </form>
  )
}
