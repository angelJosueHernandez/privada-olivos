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
          <Fila icono="candado" etiqueta="Verificación en dos pasos">
            <span className="inline-flex items-center gap-1.5 text-ok"><Icon n="check" size={15} stroke={3} />Activa</span>
          </Fila>
          <Fila icono="reloj" etiqueta="Sesión iniciada">
            {inicioSesion ? inicioSesion.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
          </Fila>
          <Fila icono="salir" etiqueta="Cierre por inactividad">{INACTIVIDAD_MIN[user.rol]} min</Fila>
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
