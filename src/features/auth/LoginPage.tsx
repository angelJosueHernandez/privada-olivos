import { FormEvent, ReactNode, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Icon, { IconName } from '../../shared/ui/Icon'
import Marca from '../../shared/ui/Marca'
import PanelLogin, { ListaFunciones } from './PanelLogin'
import { rutaInicio, useAuth } from './AuthContext'

const CLAVE = 'privada.email'
const leerEmail = () => { try { return localStorage.getItem(CLAVE) ?? '' } catch { return '' } }
const guardarEmail = (v: string | null) => {
  try { v ? localStorage.setItem(CLAVE, v) : localStorage.removeItem(CLAVE) } catch { /* sin almacenamiento */ }
}

/*
  Campo relleno al estilo iOS: gris suave sin borde en reposo; al enfocarlo se vuelve blanco
  con borde de acento. Ícono a la izquierda y etiqueta flotante que sube al escribir.
*/
function Campo({ id, icono, etiqueta, children, accion }: {
  id: string; icono: IconName; etiqueta: string; children: ReactNode; accion?: ReactNode
}) {
  return (
    <div className="group relative rounded-[14px] bg-fondo ring-1 ring-inset ring-transparent
      focus-within:bg-panel focus-within:ring-[1.5px] focus-within:ring-acento
      has-[[aria-invalid=true]]:bg-peligro/[0.05] has-[[aria-invalid=true]]:ring-peligro/60">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-suave group-focus-within:text-acento">
        <Icon n={icono} size={20} />
      </span>
      {children}
      <label htmlFor={id}
        className="pointer-events-none absolute left-12 top-1/2 origin-left -translate-y-1/2 text-[1.0625rem] text-suave
          transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none
          peer-focus:-translate-y-[122%] peer-focus:scale-[0.8]
          peer-[:not(:placeholder-shown)]:-translate-y-[122%] peer-[:not(:placeholder-shown)]:scale-[0.8]">
        {etiqueta}
      </label>
      {accion}
    </div>
  )
}
const entrada =
  'peer block w-full h-14 bg-transparent rounded-[14px] pl-12 pr-4 pt-[1.15rem] pb-1 text-[1.0625rem] text-texto placeholder-transparent outline-none'

type Fallo = 'email' | 'password' | 'ambos' | 'codigo' | null

export default function LoginPage() {
  const { user, pendiente2fa, login, verificar2fa, logout } = useAuth()
  const [email, setEmail] = useState(leerEmail)
  const [recordar, setRecordar] = useState(() => leerEmail() !== '')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [ayuda, setAyuda] = useState(false)
  const [error, setError] = useState('')
  const [fallo, setFallo] = useState<Fallo>(null)
  const grupo = useRef<HTMLDivElement>(null)
  const [cargando, setCargando] = useState(false)

  if (user) return <Navigate to={rutaInicio(user.rol)} replace />

  // Reinicia la sacudida sin volver a montar los campos (así no se pierde el foco)
  const sacudir = () => {
    const el = grupo.current
    if (!el) return
    el.classList.remove('anim-sacudir')
    void el.offsetWidth
    el.classList.add('anim-sacudir')
  }
  const fallar = (mensaje: string, campo: Fallo) => { setError(mensaje); setFallo(campo); sacudir() }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setFallo(null)
    if (pendiente2fa) {
      if (codigo.trim().length !== 6) return fallar('Escribe los 6 dígitos del código.', 'codigo')
    } else if (!email.trim() || !password) {
      const campo: Fallo = !email.trim() && !password ? 'ambos' : !email.trim() ? 'email' : 'password'
      return fallar(campo === 'email' ? 'Escribe tu correo.' : campo === 'password' ? 'Escribe tu contraseña.' : 'Escribe tu correo y tu contraseña.', campo)
    }
    setCargando(true)
    try {
      if (pendiente2fa) {
        await verificar2fa(codigo.trim())
      } else {
        await login(email, password)
        guardarEmail(recordar ? email.trim() : null)
      }
    } catch (err) {
      fallar(err instanceof Error ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.', pendiente2fa ? 'codigo' : 'ambos')
    } finally {
      setCargando(false)
    }
  }

  const volver = () => { setCodigo(''); setError(''); setFallo(null); logout() }
  const describe = error ? 'error-acceso' : undefined
  const invalido = (campo: 'email' | 'password' | 'codigo') => (fallo === campo || (fallo === 'ambos' && campo !== 'codigo')) || undefined

  return (
    <main className="min-h-dvh bg-panel lg:grid lg:grid-cols-[5fr_6fr]">
      <PanelLogin />

      {/* Celular primero: una columna centrada; tableta: la misma columna a 400px; computadora: mitad derecha */}
      <section className="min-h-dvh flex flex-col items-center justify-center
        px-6 md:px-10 lg:px-16 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)] md:py-20">
        <div key={pendiente2fa ? 'codigo' : 'acceso'} className="anim-entrar w-full max-w-[400px]">

          {/* Encabezado: centrado en celular y tableta, alineado a la izquierda en computadora */}
          <header className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="lg:hidden">
              {pendiente2fa ? (
                <span className="grid place-items-center h-[72px] w-[72px] rounded-[20px] bg-acento/[0.1] text-acento">
                  <Icon n="candado" size={34} stroke={1.7} />
                </span>
              ) : (
                <span className="flex flex-col items-center">
                  <span className="md:hidden"><Marca size={72} /></span>
                  <span className="hidden md:block"><Marca size={80} /></span>
                  <span className="mt-3.5 text-[0.8125rem] font-medium tracking-[0.01em] text-suave">Mi Privada</span>
                </span>
              )}
            </span>
            <h1 className="titulo-grande mt-6 lg:mt-0 text-balance">
              {pendiente2fa ? 'Verifica que eres tú' : 'Inicia sesión'}
            </h1>
            <p className="mt-2 text-[1.0625rem] leading-[1.4] text-suave text-balance">
              {pendiente2fa
                ? 'Escribe el código de 6 dígitos que muestra tu app de autenticación.'
                : 'Usa el correo que registró la administración de tu privada.'}
            </p>
          </header>

          <form onSubmit={enviar} noValidate className="mt-8">
            <div ref={grupo} className="space-y-3">
              {pendiente2fa ? (
                <label className="block">
                  <span className="sr-only">Código de verificación</span>
                  <input
                    className="block w-full h-16 rounded-[14px] bg-fondo text-center text-[1.75rem] font-semibold cifras tracking-[0.45em] pl-[0.45em] text-texto
                      placeholder:text-suave outline-none ring-inset focus:bg-panel focus:ring-[1.5px] focus:ring-acento
                      aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-peligro/60"
                    inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" autoFocus required
                    placeholder="000000" value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    aria-invalid={invalido('codigo')} aria-describedby={describe} />
                </label>
              ) : (
                <>
                  <Campo id="email" icono="correo" etiqueta="Correo electrónico">
                    <input id="email" className={entrada} type="email" inputMode="email" autoComplete="username"
                      autoCapitalize="none" spellCheck={false} placeholder="Correo electrónico" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={invalido('email')} aria-describedby={describe} />
                  </Campo>
                  <Campo id="password" icono="candado" etiqueta="Contraseña"
                    accion={
                      <button type="button" onClick={() => setVer(!ver)}
                        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full text-suave hover:text-texto">
                        <Icon n={ver ? 'ojoOculto' : 'ojo'} size={20} />
                      </button>
                    }>
                    <input id="password" className={`${entrada} pr-14`} type={ver ? 'text' : 'password'}
                      autoComplete="current-password" placeholder="Contraseña" required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={invalido('password')} aria-describedby={describe} />
                  </Campo>
                </>
              )}
            </div>

            {error && (
              <p id="error-acceso" role="alert" className="mt-3 flex items-start gap-2 text-[0.9375rem] text-peligro">
                <span className="mt-0.5 shrink-0"><Icon n="alerta" size={18} /></span>{error}
              </p>
            )}

            {!pendiente2fa && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 text-[0.9375rem] min-h-11 whitespace-nowrap cursor-pointer select-none">
                  <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="peer sr-only" />
                  <span aria-hidden="true"
                    className={`grid place-items-center h-[22px] w-[22px] rounded-[7px] transition-colors duration-150
                      peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-acento/55 peer-focus-visible:outline-offset-2
                      ${recordar ? 'bg-acento text-acento-texto' : 'bg-panel ring-[1.5px] ring-inset ring-borde'}`}>
                    {recordar && (
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                  Recordar mi correo
                </label>
                <button type="button" onClick={() => setAyuda(!ayuda)} aria-expanded={ayuda}
                  className="text-[0.9375rem] font-medium text-acento min-h-11 whitespace-nowrap hover:underline underline-offset-4">
                  Olvidé mi contraseña
                </button>
              </div>
            )}
            {ayuda && !pendiente2fa && (
              <p className="anim-entrar mt-1 text-[0.9375rem] leading-[1.4] text-suave bg-fondo rounded-[14px] px-4 py-3">
                Pide a la administración de tu privada que te ayude a restablecerla.
              </p>
            )}

            <button disabled={cargando} className="btn-primario w-full mt-6">
              {cargando && <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-[spin_0.7s_linear_infinite]" />}
              {cargando ? 'Verificando…' : pendiente2fa ? 'Verificar' : 'Continuar'}
            </button>

            {pendiente2fa && (
              <button type="button" onClick={volver} className="btn-secundario w-full mt-3">
                Usar otra cuenta
              </button>
            )}
          </form>

          {/* Pie: notas discretas, sin cajas */}
          <div className="mt-5 space-y-2 text-center lg:text-left">
            <p className="text-[0.875rem] leading-[1.45] text-suave text-balance lg:[text-wrap:pretty]">
              <span className="inline-block align-[-3px] mr-1.5 text-suave"><Icon n="candado" size={15} stroke={2} /></span>
              <span className="font-semibold text-texto">Cuenta protegida.</span>{' '}
              Te pedimos un código de tu app de autenticación al entrar.
            </p>
            {!pendiente2fa && (
              <p className="text-[0.875rem] leading-[1.45] text-suave text-balance lg:[text-wrap:pretty]">
                ¿Aún no tienes acceso? Pídelo a la administración de tu privada.
              </p>
            )}
          </div>

          {!pendiente2fa && (
            <div className="lg:hidden mt-12 border-t border-separador pt-8">
              <h2 className="mb-5 text-[1.0625rem] font-semibold tracking-[-0.01em]">Todo tu privada en un lugar</h2>
              <ListaFunciones />
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
