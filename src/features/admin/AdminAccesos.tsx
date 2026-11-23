import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Encabezado from '../../shared/ui/Encabezado'
import Icon, { IconName } from '../../shared/ui/Icon'
import { Opciones } from '../../shared/ui/Opciones'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import { casetaService } from '../caseta/casetaService'
import DetalleAcceso from '../caseta/DetalleAcceso'
import LogoEmpresa, { tieneInsignia } from '../caseta/LogoEmpresa'
import { Acceso, ETIQUETA_TIPO, TipoAcceso } from '../caseta/tipos'

type Estado = 'TODOS' | 'DENTRO' | 'SALIERON' | 'CASETA'
const ICONO: Record<TipoAcceso, IconName> = { VISITA_QR: 'qr', PAQUETERIA: 'paquete', COMIDA: 'comida', SERVICIO: 'herramienta', VISITA_SIN_QR: 'visita' }
const hora = (d?: Date) => (d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '')
const duracion = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60_000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min` }
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const estadoDe = (a: Acceso): Exclude<Estado, 'TODOS'> => (a.paquete === 'CASETA' && !a.entregado ? 'CASETA' : a.salida || a.entregado ? 'SALIERON' : 'DENTRO')
const CHIP: Record<Exclude<Estado, 'TODOS'>, { t: (a: Acceso) => string; c: string }> = {
  DENTRO: { t: () => 'Dentro', c: 'bg-acento/[0.1] text-acento' },
  SALIERON: { t: (a) => (a.entregado ? 'Entregado' : `Salió ${hora(a.salida)}`), c: 'bg-texto/[0.07] text-texto/70' },
  CASETA: { t: () => 'En caseta', c: 'bg-alerta/[0.12] text-alerta' },
}

/*
  CSV seguro para Excel: cada celda va entre comillas y, si empieza con = + - @ (o tabulador),
  se antepone un apóstrofo para que Excel no la ejecute como fórmula (inyección CSV).
*/
const celda = (v: unknown) => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}
function exportarCsv(lista: Acceso[]) {
  const enc = ['Folio', 'Tipo', 'Nombre o empresa', 'Casa', 'Entrada', 'Salida', 'Entregado', 'Placas', 'Vehículo', 'Registró entrada', 'Registró salida', 'Pase', 'Pase creado por', 'Fotos']
  const filas = lista.map((a) => [a.folio, ETIQUETA_TIPO[a.tipo], a.nombre, a.casa, a.entrada.toLocaleString('es-MX'), a.salida?.toLocaleString('es-MX') ?? '',
    a.entregado?.toLocaleString('es-MX') ?? '', a.placas ?? '', a.vehiculo ?? '', a.registradoPor.nombre, a.salidaPor?.nombre ?? '', a.paseFolio ?? '', a.paseCreadoPor?.nombre ?? '', a.fotos.length])
  const csv = '﻿' + [enc, ...filas].map((f) => f.map(celda).join(',')).join('\r\n') // BOM: acentos correctos en Excel
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url; enlace.download = `bitacora-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(enlace); enlace.click(); enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* Bitácora de accesos para la administración: búsqueda, filtros, detalle y exportación */
export default function AdminAccesos() {
  const [accesos, setAccesos] = useState<Acceso[] | null>(null)
  const [estado, setEstado] = useState<Estado>('TODOS')
  const [tipo, setTipo] = useState<TipoAcceso | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Acceso | null>(null)
  const ahora = Date.now()

  const cargar = useCallback(async () => {
    try { setAccesos(await casetaService.listarHoy()) } catch { toast.error('No se pudo cargar la bitácora') }
  }, [])
  useEffect(() => { void cargar(); return casetaService.suscribir(() => void cargar()) }, [cargar])
  useAtrasCierra(abierto !== null, () => setAbierto(null))

  const lista = useMemo(() => {
    const q = normal(busqueda.trim())
    return (accesos ?? []).filter((a) =>
      (estado === 'TODOS' || estadoDe(a) === estado) && (!tipo || a.tipo === tipo) &&
      (!q || normal([a.nombre, a.casa, a.placas, a.folio, a.registradoPor.nombre, a.paseCreadoPor?.nombre].filter(Boolean).join(' ')).includes(q)))
  }, [accesos, estado, tipo, busqueda])
  const cuenta = (e: Estado) => (accesos ?? []).filter((a) => e === 'TODOS' || estadoDe(a) === e).length

  return (
    <>
      <Encabezado titulo="Accesos" detalle="Entradas y salidas de hoy"
        accion={<button type="button" onClick={() => { exportarCsv(lista); toast.success('Bitácora descargada', { description: `${lista.length} registros en CSV (se abre en Excel).` }) }}
          disabled={!lista.length} className="btn-secundario btn-chico"><Icon n="descargar" size={17} />Exportar</button>} />

      {/* Filtros en una fila sobre la lista */}
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto/45"><Icon n="buscar" size={18} /></span>
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} maxLength={60} placeholder="Buscar nombre, casa, placas o folio"
            className="block w-full h-12 rounded-[14px] bg-panel pl-11 pr-4 text-[1rem] shadow-tarjeta outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-acento placeholder:text-texto/45" />
        </label>
        <div role="group" aria-label="Estado" className="flex gap-1 overflow-x-auto rounded-[12px] bg-texto/[0.06] p-1 [scrollbar-width:none]">
          {([['TODOS', 'Todos'], ['DENTRO', 'Dentro'], ['CASETA', 'En caseta'], ['SALIERON', 'Salidas']] as [Estado, string][]).map(([v, t]) => (
            <button key={v} aria-pressed={estado === v} onClick={() => setEstado(v)}
              className={`flex-1 shrink-0 h-9 px-3 rounded-[9px] text-[0.875rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150
                ${estado === v ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>
              {t} <span className="cifras">{cuenta(v)}</span>
            </button>
          ))}
        </div>
        <Opciones etiqueta="Tipo" valor={tipo} onCambio={setTipo}
          cuadricula="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&>*]:shrink-0 [&>*]:whitespace-nowrap sm:mx-0 sm:flex-wrap sm:px-0"
          opciones={(Object.keys(ETIQUETA_TIPO) as TipoAcceso[]).map((t) => ({ valor: t, etiqueta: ETIQUETA_TIPO[t], extra: <Icon n={ICONO[t]} size={16} /> }))} />
      </div>

      <p className="mt-5 mb-2 px-1 text-[0.875rem] text-suave" aria-live="polite"><span className="cifras">{lista.length}</span> registro{lista.length === 1 ? '' : 's'}</p>
      <div className="rounded-[20px] bg-panel shadow-tarjeta overflow-hidden">
        {accesos === null ? <div className="h-48 animate-pulse" /> : lista.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[1.0625rem] font-semibold">Sin resultados</p>
            <p className="mt-1 text-[0.9375rem] text-suave">Prueba con otro filtro o búsqueda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-separador">
            {lista.map((a) => {
              const e = estadoDe(a)
              const largo = e === 'DENTRO' && ahora - a.entrada.getTime() > 2 * 3600_000
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setAbierto(a)}
                    className="flex w-full items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-texto/[0.03] active:bg-texto/[0.05] transition-colors">
                    {tieneInsignia(a.nombre) ? <LogoEmpresa nombre={a.nombre} size={44} />
                      : <span className="grid place-items-center h-11 w-11 shrink-0 rounded-[14px] bg-fondo text-texto/75"><Icon n={ICONO[a.tipo]} size={22} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1rem] font-semibold truncate">{a.nombre}</span>
                      <span className="block text-[0.875rem] text-suave truncate">{a.casa} · {ETIQUETA_TIPO[a.tipo]}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.8125rem] cifras">
                        <span className="text-suave">Entró {hora(a.entrada)} · {a.registradoPor.nombre}</span>
                        {a.placas && <span className="rounded-md bg-fondo px-1.5 py-0.5 font-semibold tracking-[0.04em]">{a.placas}</span>}
                        {largo && <span className="rounded-md bg-peligro/[0.1] px-1.5 py-0.5 font-semibold text-peligro">{duracion(ahora - a.entrada.getTime())} dentro</span>}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold cifras ${CHIP[e].c}`}>{CHIP[e].t(a)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {abierto && <DetalleAcceso acceso={abierto} onCerrar={() => setAbierto(null)} />}
    </>
  )
}
