import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { rutaInicio, useAuth } from './AuthContext'

const CLAVE = 'privada.email'
const leerEmail = () => { try { return localStorage.getItem(CLAVE) ?? '' } catch { return '' } }
const guardarEmail = (v: string | null) => {
  try { v ? localStorage.setItem(CLAVE, v) : localStorage.removeItem(CLAVE) } catch { /* sin almacenamiento */ }
}

const campo =
  'w-full h-12 rounded-xl bg-fondo border border-borde pl-12 pr-4 text-base text-texto placeholder:text-suave/60 focus:border-acento focus:bg-white'

export default function LoginPage() {
  const { user, pendiente2fa, login, verificar2fa, logout } = useAuth()
  const [email, setEmail] = useState(leerEmail)
  const [recordar, setRecordar] = useState(() => leerEmail() !== '')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [ayuda, setAyuda] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (user) return <Navigate to={rutaInicio(user.rol)} replace />

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      if (pendiente2fa) {
        await verificar2fa(codigo.trim())
      } else {
        await login(email, password)
        guardarEmail(recordar ? email.trim() : null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="relative min-h-dvh bg-panel overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-24 h-80 w-80 rounded-full bg-acento/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-acento/10 blur-3xl" />
      <div className="relative min-h-dvh w-full max-w-sm md:max-w-md mx-auto px-6 flex flex-col justify-center
        pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">

        {pendiente2fa && (
          <button type="button" onClick={logout} aria-label="Volver"
            className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] h-11 w-11 grid place-items-center rounded-full text-texto">
            <Icon n="atras" />
          </button>
        )}

        <p className="font-semibold text-acento mb-3">Los Olivos</p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {pendiente2fa ? 'Un paso más' : 'Hola de nuevo'}
        </h1>
        <p className="text-suave mt-2">
          {pendiente2fa
            ? 'Escribe el código de 6 dígitos de tu app de autenticación.'
            : 'Inicia sesión con el correo que registró la administración.'}
        </p>

        <form onSubmit={enviar} className="mt-8 space-y-4">
          {pendiente2fa ? (
            <label className="block">
              <span className="sr-only">Código de verificación</span>
              <input className="w-full h-14 rounded-xl bg-fondo border border-borde text-center text-2xl tracking-[0.5em] focus:border-acento focus:bg-white"
                inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus required
                placeholder="······" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
          ) : (
            <>
              <label className="block relative">
                <span className="sr-only">Correo electrónico</span>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-suave"><Icon n="correo" size={20} /></span>
                <input className={campo} type="email" inputMode="email" autoComplete="username"
                  autoCapitalize="none" placeholder="Correo electrónico" required
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <div className="relative">
                <label>
                  <span className="sr-only">Contraseña</span>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-suave"><Icon n="candado" size={20} /></span>
                  <input className={`${campo} pr-12`} type={ver ? 'text' : 'password'}
                    autoComplete="current-password" placeholder="Contraseña" required
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <button type="button" onClick={() => setVer(!ver)}
                  aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-0 top-0 h-12 w-12 grid place-items-center text-suave">
                  <Icon n={ver ? 'ojoOculto' : 'ojo'} size={20} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2.5 text-sm min-h-11">
                  <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)}
                    className="h-5 w-5 rounded border-borde accent-acento" />
                  Recordar mi correo
                </label>
                <button type="button" onClick={() => setAyuda(!ayuda)}
                  className="text-sm font-semibold text-acento min-h-11">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              {ayuda && (
                <p className="text-sm text-suave bg-fondo rounded-xl p-3">
                  Pide a la administración de tu privada que te ayude a restablecerla.
                </p>
              )}
            </>
          )}

          {error && <p role="alert" className="text-sm text-peligro">{error}</p>}

          <button disabled={cargando}
            className="w-full h-12 rounded-xl bg-bosque text-white text-base font-bold disabled:opacity-60 active:brightness-95">
            {cargando ? 'Verificando…' : pendiente2fa ? 'Verificar código' : 'Entrar'}
          </button>
        </form>

        <p className="mt-10 text-xs text-suave/80 text-center">
          Demo: residente@demo.mx / Residente123 · guardia@demo.mx / Guardia123 · admin@demo.mx / Admin123 (código 123456)
        </p>
      </div>
    </main>
  )
}
