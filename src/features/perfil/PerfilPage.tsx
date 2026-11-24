import { ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { IconName } from '../../shared/ui/Icon'
import { useAuth } from '../auth/AuthContext'
import { INACTIVIDAD_MIN, rutaInicio } from '../auth/permisos'
import { casetaService } from '../caseta/casetaService'
import { ETIQUETA_ROL } from '../caseta/tipos'
import { toast } from 'sonner'
import { useEstadoAvisos } from '../../shared/avisos/sistema'
import { useInstalar } from '../../shared/avisos/instalar'
import Hoja from '../../shared/ui/Hoja'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import { authService } from '../auth/authService'
import { PASSWORD_MIN, revisarPassword } from '../directorio/tipos'
import { ErrorFormulario } from '../../shared/ui/useValidacion'
import ConfigurarAutenticador from '../auth/ConfigurarAutenticador'

const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

function Grupo({ titulo, children, retraso = 0 }: { titulo: string; children: ReactNode; retraso?: number }) {
  return (
    <section className="anim-entrar" style={{ animationDelay: `${retraso}ms` }}>
      <h2 className="px-4 mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-suave">{titulo}</h2>
      <dl className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">{children}</dl>
    </section>
  )
}
function Fila({ icono, etiqueta, children }: { icono: IconName; etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 px-4 min-h-[56px] py-2.5">
      <span className="grid place-items-center h-9 w-9 shrink-0 rounded-[10px] bg-fondo text-texto/70"><Icon n={icono} size={18} /></span>
      <dt className="flex-1 text-[0.9375rem]">{etiqueta}</dt>
      <dd className="text-[0.9375rem] font-medium text-right text-texto/80 min-w-0 truncate">{children}</dd>
    </div>
  )
}

/* App autenticadora: ver cuál protege la cuenta y configurarla o cambiarla (celular nuevo) */
function DosPasos() {
  const { user } = useAuth()
  const [estado, setEstado] = useState(user?.dosPasos ?? 'SIN_CONFIGURAR')
  const [abierto, setAbierto] = useState(false)
  useAtrasCierra(abierto, () => setAbierto(false))
  if (!user) return null
  return (
    <>
      <div className="flex items-center gap-3.5 px-4 min-h-[56px] py-2.5">
        <span className="grid place-items-center h-9 w-9 shrink-0 rounded-[10px] bg-fondo text-texto/70"><Icon n="candado" size={18} /></span>
        <dt className="min-w-0 flex-1 text-[0.9375rem]">
          Verificación en dos pasos
          <span className={`block text-[0.8125rem] ${estado === 'APP' ? 'text-ok' : 'text-alerta'}`}>
            {estado === 'APP' ? 'Con app autenticadora' : estado === 'PRUEBA' ? 'Con código de prueba' : 'Sin configurar'}
          </span>
        </dt>
        <dd><button type="button" onClick={() => setAbierto(true)} className="min-h-11 px-1 text-[0.9375rem] font-medium text-acento">{estado === 'APP' ? 'Cambiar' : 'Configurar'}</button></dd>
      </div>
      {abierto && (
        <Hoja titulo={estado === 'APP' ? 'Cambiar app autenticadora' : 'App autenticadora'} onCerrar={() => setAbierto(false)}>
          {estado === 'APP' && <p className="mb-6 rounded-[14px] bg-alerta/[0.1] px-4 py-3 text-[0.9375rem] text-texto/85">Al terminar, los códigos de tu app anterior dejarán de servir. Úsalo si cambiaste de celular.</p>}
          <ConfigurarAutenticador iniciar={() => authService.iniciar2fa(user)}
            onCodigo={async (c) => { await authService.activar2fa(user, c); setEstado('APP'); setAbierto(false); toast.success('App autenticadora lista', { description: 'Desde ahora te pediremos su código al entrar.' }) }} />
        </Hoja>
      )}
    </>
  )
}

const campoPass = 'block w-full h-14 rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-acento'

/* Cambiar la contraseña propia: pide la actual para que nadie la cambie con el celular desbloqueado */
function CambiarPassword() {
  const { user } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const cerrar = () => { setAbierto(false); setActual(''); setNueva(''); setRepetir(''); setError('') }
  useAtrasCierra(abierto, cerrar)
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || enviando) return
    const falta = !actual ? 'Escribe tu contraseña actual.' : revisarPassword(nueva, user.email) || (nueva !== repetir ? 'Las contraseñas nuevas no coinciden.' : nueva === actual ? 'La nueva debe ser distinta a la actual.' : '')
    if (falta) { setError(falta); return }
    setError(''); setEnviando(true)
    try { await authService.crearPassword(user, nueva, actual); toast.success('Contraseña actualizada'); cerrar() }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cambiar') }
    finally { setEnviando(false) }
  }
  return (
    <>
      <div className="flex items-center gap-3.5 px-4 min-h-[56px] py-2.5">
        <span className="grid place-items-center h-9 w-9 shrink-0 rounded-[10px] bg-fondo text-texto/70"><Icon n="candado" size={18} /></span>
        <dt className="flex-1 text-[0.9375rem]">Contraseña</dt>
        <dd><button type="button" onClick={() => setAbierto(true)} className="min-h-11 px-1 text-[0.9375rem] font-medium text-acento">Cambiar</button></dd>
      </div>
      {abierto && (
        <Hoja titulo="Cambiar contraseña" onCerrar={cerrar}
          pie={<button type="submit" form="form-pass" disabled={enviando} className="btn-primario w-full">{enviando ? 'Guardando…' : 'Guardar contraseña'}</button>}>
          <form id="form-pass" onSubmit={enviar} noValidate className="space-y-5">
            <input type="email" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
            <div>
              <label htmlFor="p-actual" className="mb-2 block text-[1rem] font-semibold">Contraseña actual</label>
              <input id="p-actual" type="password" autoComplete="current-password" maxLength={128} value={actual} onChange={(e) => setActual(e.target.value)} className={campoPass} />
            </div>
            <div>
              <label htmlFor="p-nueva" className="mb-2 block text-[1rem] font-semibold">Contraseña nueva</label>
              <input id="p-nueva" type="password" autoComplete="new-password" maxLength={128} value={nueva} onChange={(e) => setNueva(e.target.value)} className={campoPass} aria-describedby="p-reglas" />
              <p id="p-reglas" className="mt-1.5 px-1 text-[0.8125rem] text-suave">Al menos {PASSWORD_MIN} caracteres.</p>
            </div>
            <div>
              <label htmlFor="p-repetir" className="mb-2 block text-[1rem] font-semibold">Repite la nueva</label>
              <input id="p-repetir" type="password" autoComplete="new-password" maxLength={128} value={repetir} onChange={(e) => setRepetir(e.target.value)} className={campoPass} />
            </div>
            <ErrorFormulario mensaje={error} />
          </form>
        </Hoja>
      )}
    </>
  )
}

/* Notificaciones e instalación en ESTE celular o computadora */
function Dispositivo() {
  const { estado, activar } = useEstadoAvisos()
  const { modo, instalar } = useInstalar()
  const accion = 'inline-flex items-center h-9 px-3.5 rounded-full bg-acento text-acento-texto text-[0.875rem] font-semibold active:scale-[0.96] transition-transform'
  return (
    <Grupo titulo="Este dispositivo" retraso={150}>
      <Fila icono="avisos" etiqueta="Notificaciones">
        {estado === 'activos' ? <span className="inline-flex items-center gap-1.5 text-ok"><Icon n="check" size={15} stroke={3} />Activas</span>
          : estado === 'pendiente' ? <button type="button" className={accion} onClick={async () => { if ((await activar()) === 'activos') toast.success('Notificaciones activadas') }}>Activar</button>
          : estado === 'bloqueados' ? <span className="text-peligro">Bloqueadas</span>
          : estado === 'instalar' ? <span className="text-suave">Instala la app primero</span>
          : <span className="text-suave">No disponibles</span>}
      </Fila>
      <Fila icono="descargar" etiqueta="App">
        {modo === 'instalada' ? <span className="inline-flex items-center gap-1.5 text-ok"><Icon n="check" size={15} stroke={3} />Instalada</span>
          : modo === 'boton' ? <button type="button" className={accion} onClick={async () => { if (await instalar()) toast.success('App instalada') }}>Instalar</button>
          : modo === 'ios' ? <span className="text-suave text-[0.875rem]">Compartir → Agregar a inicio</span>
          : <span className="text-suave text-[0.875rem]">Menú ⋮ → Instalar</span>}
      </Fila>
    </Grupo>
  )
}

/* Perfil del usuario de la sesión: datos de la cuenta, seguridad y actividad del día */
export default function PerfilPage() {
  const { user, inicioSesion, logout } = useAuth()
  const navegar = useNavigate()
  const [actividad, setActividad] = useState<{ entradas: number; salidas: number; entregas: number } | null>(null)

  useEffect(() => {
    if (user?.rol === 'GUARDIA') casetaService.actividadDe(user.id).then(setActividad).catch(() => setActividad(null))
  }, [user])

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => (window.history.state?.idx > 0 ? navegar(-1) : navegar(rutaInicio(user.rol), { replace: true }))} className="mb-6 -ml-2 inline-flex items-center gap-1 min-h-11 px-2 rounded-full text-[0.9375rem] font-medium text-acento hover:bg-acento/[0.06]">
        <Icon n="atras" size={20} />Volver
      </button>

      {/* Tarjeta de identidad */}
      <div className="anim-entrar flex flex-col items-center text-center">
        <span className="anim-pop grid place-items-center h-24 w-24 rounded-full bg-acento text-acento-texto text-[2rem] font-bold shadow-[0_12px_28px_-12px_rgb(var(--acento)/0.7)]">
          {iniciales(user.nombre)}
        </span>
        <h1 className="mt-4 text-[1.75rem] font-bold tracking-[-0.02em]">{user.nombre}</h1>
        <p className="mt-1 inline-flex items-center gap-2 text-[1rem] text-suave">
          <span className="rounded-full bg-acento/[0.1] px-2.5 py-0.5 text-[0.8125rem] font-semibold text-acento">{ETIQUETA_ROL[user.rol]}</span>
          {user.casa && <span>{user.casa}</span>}
        </p>
      </div>

      <div className="mt-10 space-y-8">
        <Grupo titulo="Cuenta" retraso={60}>
          <Fila icono="correo" etiqueta="Correo">{user.email ?? '—'}</Fila>
          <Fila icono="usuario" etiqueta="Rol">{ETIQUETA_ROL[user.rol]}</Fila>
          {user.casa && <Fila icono="inicio" etiqueta="Casa">{user.casa}</Fila>}
          <Fila icono="lista" etiqueta="ID de usuario"><span className="cifras tracking-[0.03em]">{user.id}</span></Fila>
          <Fila icono="caseta" etiqueta="Privada">Los Olivos</Fila>
        </Grupo>

        <Grupo titulo="Seguridad" retraso={120}>
          <DosPasos />
          <Fila icono="reloj" etiqueta="Sesión iniciada">
            {inicioSesion ? inicioSesion.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
          </Fila>
          <Fila icono="salir" etiqueta="Cierre por inactividad">{INACTIVIDAD_MIN[user.rol]} min</Fila>
          <CambiarPassword />
        </Grupo>

        <Dispositivo />

        {user.rol === 'GUARDIA' && (
          <Grupo titulo="Mi actividad de hoy" retraso={180}>
            <Fila icono="entrada" etiqueta="Entradas registradas"><span className="cifras">{actividad?.entradas ?? '…'}</span></Fila>
            <Fila icono="salir" etiqueta="Salidas registradas"><span className="cifras">{actividad?.salidas ?? '…'}</span></Fila>
            <Fila icono="paquete" etiqueta="Paquetes entregados"><span className="cifras">{actividad?.entregas ?? '…'}</span></Fila>
          </Grupo>
        )}

        <p className="anim-entrar px-4 text-[0.875rem] leading-[1.45] text-suave" style={{ animationDelay: '220ms' }}>
          Cada acción que haces queda registrada con tu nombre, la fecha y la hora para el control de la privada.
          Para cambiar tus datos, pide ayuda a la administración.
        </p>

        <button onClick={logout} className="btn-secundario w-full text-peligro">
          <Icon n="salir" size={19} />Cerrar sesión
        </button>
      </div>
    </div>
  )
}
