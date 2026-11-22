import { useState } from 'react'
import Hoja from '../../shared/ui/Hoja'
import Icon, { IconName } from '../../shared/ui/Icon'
import LogoEmpresa, { tieneInsignia } from './LogoEmpresa'
import { Acceso, Actor, COLORES, ETIQUETA_ROL, ETIQUETA_TIPO, VEHICULOS } from './tipos'

const fechaHora = (d: Date) => d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const hora = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const duracion = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60_000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min` }
const quien = (a: Actor) => `${a.nombre} · ${ETIQUETA_ROL[a.rol]}${a.casa ? ` · ${a.casa}` : ''}`

type Paso = { icono: IconName; titulo: string; por?: Actor; cuando?: Date; extra?: string; tono: 'ok' | 'neutro' | 'pendiente' | 'alerta' }

function LineaTiempo({ pasos }: { pasos: Paso[] }) {
  const tono = { ok: 'bg-ok text-white', neutro: 'bg-texto/80 text-white', pendiente: 'bg-texto/[0.08] text-texto/50', alerta: 'bg-alerta text-white' }
  return (
    <ol className="relative">
      {pasos.map((p, i) => (
        <li key={i} className="anim-entrar relative flex gap-4 pb-6 last:pb-0" style={{ animationDelay: `${i * 60}ms` }}>
          {i < pasos.length - 1 && <span aria-hidden="true" className="absolute left-[17px] top-9 bottom-0 w-[2px] rounded-full bg-separador" />}
          <span className={`relative z-[1] grid place-items-center h-9 w-9 shrink-0 rounded-full ${tono[p.tono]}`}><Icon n={p.icono} size={17} stroke={2.2} /></span>
          <div className="min-w-0 pt-1">
            <p className="text-[1rem] font-semibold leading-snug">{p.titulo}</p>
            {p.por && <p className="text-[0.875rem] text-texto/80">por <strong className="font-semibold">{quien(p.por)}</strong></p>}
            <p className="text-[0.8125rem] text-suave cifras">{p.cuando ? fechaHora(p.cuando) : ''}{p.extra ? `${p.cuando ? ' · ' : ''}${p.extra}` : ''}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-[0.9375rem] text-suave shrink-0">{etiqueta}</dt>
      <dd className="text-[0.9375rem] font-medium text-right">{children}</dd>
    </div>
  )
}

/* Detalle completo de un registro de la bitácora: quién hizo cada paso, cuándo, datos y fotos */
export default function DetalleAcceso({ acceso: a, onCerrar }: { acceso: Acceso; onCerrar: () => void }) {
  const [ampliada, setAmpliada] = useState<string | null>(null)
  const enCaseta = a.paquete === 'CASETA' && !a.entregado
  const dentro = !a.salida && a.paquete !== 'CASETA'
  const estado = a.salida ? { t: `Salió ${hora(a.salida)}`, c: 'bg-texto/[0.07] text-texto/70' }
    : a.entregado ? { t: 'Entregado', c: 'bg-ok/[0.12] text-ok' }
    : enCaseta ? { t: 'En caseta', c: 'bg-alerta/[0.12] text-alerta' }
    : { t: 'Dentro', c: 'bg-acento/[0.1] text-acento' }

  const pasos: Paso[] = [
    ...(a.paseCreadoPor ? [{ icono: 'qr' as IconName, titulo: `Pase creado${a.paseFolio ? ` (${a.paseFolio})` : ''}`, por: a.paseCreadoPor, cuando: a.paseCreadoEn, tono: 'neutro' as const }] : []),
    { icono: 'entrada', titulo: a.paquete === 'CASETA' ? 'Paquete recibido en caseta' : 'Entrada registrada', por: a.registradoPor, cuando: a.entrada, tono: 'ok' },
    ...(a.entregado ? [{ icono: 'check' as IconName, titulo: 'Paquete entregado al residente', por: a.entregadoPor, cuando: a.entregado, extra: `${duracion(a.entregado.getTime() - a.entrada.getTime())} en caseta`, tono: 'ok' as const }] : []),
    ...(a.salida ? [{ icono: 'salir' as IconName, titulo: 'Salida registrada', por: a.salidaPor, cuando: a.salida, extra: `estuvo ${duracion(a.salida.getTime() - a.entrada.getTime())}`, tono: 'neutro' as const }] : []),
    ...(dentro ? [{ icono: 'reloj' as IconName, titulo: 'Sigue dentro', extra: `lleva ${duracion(Date.now() - a.entrada.getTime())}`, tono: 'pendiente' as const }] : []),
    ...(enCaseta ? [{ icono: 'paquete' as IconName, titulo: 'Pendiente de entregar', extra: `lleva ${duracion(Date.now() - a.entrada.getTime())} en caseta`, tono: 'alerta' as const }] : []),
  ]
  const vehiculo = VEHICULOS.find((v) => v.valor === a.vehiculo)?.etiqueta
  const color = COLORES.find((c) => c.valor === a.color)

  return (
    <Hoja titulo="Detalle del registro" onCerrar={onCerrar}>
      <div className="space-y-5">
        {/* Encabezado */}
        <div className="anim-entrar flex items-center gap-4">
          {tieneInsignia(a.nombre)
            ? <LogoEmpresa nombre={a.nombre} size={56} />
            : <span className="grid place-items-center h-14 w-14 shrink-0 rounded-[16px] bg-panel shadow-tarjeta text-texto/75"><Icon n={a.tipo === 'VISITA_QR' ? 'qr' : 'visita'} size={26} /></span>}
          <div className="min-w-0 flex-1">
            <p className="text-[1.375rem] font-bold tracking-[-0.015em] leading-tight truncate">{a.nombre}</p>
            <p className="text-[0.9375rem] text-suave">{ETIQUETA_TIPO[a.tipo]} · {a.casa}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${estado.c}`}>{estado.t}</span>
        </div>

        {/* Quién y cuándo */}
        <section aria-labelledby="t-historial" className="rounded-[20px] bg-panel shadow-tarjeta p-5">
          <h3 id="t-historial" className="mb-4 flex items-center justify-between text-[0.9375rem] font-semibold">
            Historial
            <span className="rounded-md bg-fondo px-2 py-0.5 text-[0.8125rem] font-semibold tracking-[0.04em] text-texto/70 cifras">Folio {a.folio}</span>
          </h3>
          <LineaTiempo pasos={pasos} />
        </section>

        {/* Datos guardados */}
        <section aria-labelledby="t-datos" className="anim-entrar rounded-[20px] bg-panel shadow-tarjeta px-5 py-2" style={{ animationDelay: '80ms' }}>
          <h3 id="t-datos" className="pt-3 pb-1 text-[0.9375rem] font-semibold">Datos registrados</h3>
          <dl className="divide-y divide-separador">
            <Fila etiqueta="Casa">{a.casa}</Fila>
            <Fila etiqueta="Tipo">{ETIQUETA_TIPO[a.tipo]}</Fila>
            {vehiculo && <Fila etiqueta="Llegó en">{vehiculo}</Fila>}
            {a.placas && <Fila etiqueta="Placas"><span className="tracking-[0.06em] font-semibold cifras">{a.placas}</span></Fila>}
            {color && <Fila etiqueta="Color"><span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/15" style={{ background: color.muestra }} />{color.etiqueta}</span></Fila>}
            {a.cantidad && <Fila etiqueta="Paquetes">{a.cantidad === '3+' ? '3 o más' : a.cantidad}</Fila>}
            {a.paquete && <Fila etiqueta="Entrega">{a.paquete === 'CASETA' ? 'Se quedó en caseta' : 'En la casa'}</Fila>}
          </dl>
          {a.etiquetas?.length ? (
            <div className="flex flex-wrap gap-1.5 pb-3">
              {a.etiquetas.map((e) => <span key={e} className="rounded-full bg-fondo px-3 py-1 text-[0.8125rem] font-medium">{e}</span>)}
            </div>
          ) : null}
          {a.nota && <p className="mb-3 rounded-[14px] bg-fondo px-4 py-3 text-[0.9375rem]">{a.nota}</p>}
        </section>

        {/* Fotos */}
        <section aria-labelledby="t-fotos" className="anim-entrar" style={{ animationDelay: '120ms' }}>
          <h3 id="t-fotos" className="mb-3 text-[0.9375rem] font-semibold">Fotos de evidencia · {a.fotos.length}</h3>
          {a.fotos.length ? (
            <div className="grid grid-cols-3 gap-2.5">
              {a.fotos.map((f, i) => (
                <button key={f} type="button" onClick={() => setAmpliada(f)} aria-label={`Ampliar foto ${i + 1}`}
                  className="overflow-hidden rounded-[14px] aspect-square bg-texto/[0.06] active:scale-[0.97] transition-transform duration-150">
                  <img src={f} alt={`Evidencia ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-[16px] bg-panel px-4 py-4 text-[0.9375rem] text-suave shadow-tarjeta">Este registro no tiene fotos.</p>
          )}
        </section>
      </div>

      {ampliada && (
        <div role="dialog" aria-label="Foto ampliada" onClick={() => setAmpliada(null)}
          className="anim-hoja fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4 pt-[calc(env(safe-area-inset-top)+3.5rem)]">
          <button type="button" onClick={() => setAmpliada(null)} aria-label="Cerrar foto"
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] grid place-items-center h-11 w-11 rounded-full bg-white/15 text-white">
            <Icon n="cerrar" size={20} />
          </button>
          <img src={ampliada} alt="Evidencia ampliada" className="max-h-full max-w-full rounded-[16px] object-contain" />
        </div>
      )}
    </Hoja>
  )
}
