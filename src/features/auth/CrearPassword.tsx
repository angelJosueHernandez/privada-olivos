import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import Icon from '../../shared/ui/Icon'
import { PASSWORD_MIN, revisarPassword } from '../directorio/tipos'
import { ErrorFormulario } from '../../shared/ui/useValidacion'
import { useAuth } from './AuthContext'

const campo = 'block w-full h-14 rounded-[14px] bg-panel pl-4 pr-14 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-acento'

/* Primera entrada con contraseña temporal: la persona crea la suya antes de usar la app */
export default function CrearPassword() {
  const { user, crearPassword, logout } = useAuth()
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const largoOk = nueva.length >= PASSWORD_MIN

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const falta = revisarPassword(nueva, user?.email) || (nueva !== repetir ? 'Las contraseñas no coinciden.' : '')
    if (falta) { setError(falta); return }
    setError(''); setEnviando(true)
    try {
      await crearPassword(nueva)
      toast.success('Contraseña creada', { description: 'Úsala la próxima vez que entres.' })
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.') }
    finally { setEnviando(false) }
  }

  return (
    <main className="min-h-dvh bg-fondo px-5 py-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-sm">
        <span className="grid place-items-center h-14 w-14 rounded-[18px] bg-acento text-acento-texto"><Icon n="candado" size={28} /></span>
        <h1 className="mt-6 titulo-grande">Crea tu contraseña</h1>
        <p className="mt-2 text-[1.0625rem] text-texto/75 text-pretty">
          Hola{user?.nombre ? `, ${user.nombre.split(' ')[0]}` : ''}. Entraste con una contraseña temporal; elige una que solo tú conozcas.
        </p>

        <form onSubmit={enviar} noValidate className="mt-8 space-y-5">
          {/* Campo oculto para que el administrador de contraseñas asocie el correo */}
          <input type="email" name="email" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
          <div>
            <label htmlFor="nueva" className="mb-2 block text-[1rem] font-semibold">Contraseña nueva</label>
            <div className="relative">
              <input id="nueva" type={ver ? 'text' : 'password'} autoComplete="new-password" value={nueva} maxLength={128} autoFocus
                onChange={(e) => setNueva(e.target.value)} aria-describedby="reglas" className={campo} />
              <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver}
                className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center h-12 w-12 rounded-full text-texto/55">
                <Icon n="ojo" size={20} />
              </button>
            </div>
            <p id="reglas" className={`mt-2 flex items-center gap-1.5 px-1 text-[0.875rem] transition-colors ${largoOk ? 'text-ok' : 'text-suave'}`}>
              {largoOk && <Icon n="check" size={15} stroke={2.4} />}Al menos {PASSWORD_MIN} caracteres. Una frase es fácil de recordar.
            </p>
          </div>
          <div>
            <label htmlFor="repetir" className="mb-2 block text-[1rem] font-semibold">Repítela</label>
            <input id="repetir" type={ver ? 'text' : 'password'} autoComplete="new-password" value={repetir} maxLength={128}
              onChange={(e) => setRepetir(e.target.value)} className={campo} />
          </div>
          <ErrorFormulario mensaje={error} />
          <button type="submit" disabled={enviando} className="btn-primario w-full">{enviando ? 'Guardando…' : 'Guardar y entrar'}</button>
        </form>
        <button type="button" onClick={logout} className="mt-4 w-full min-h-11 text-[0.9375rem] font-medium text-acento">Salir</button>
      </div>
    </main>
  )
}
