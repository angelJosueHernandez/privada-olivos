import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Encabezado from '../../shared/ui/Encabezado'
import Vacio from '../../shared/ui/Vacio'
import { useAuth } from '../auth/AuthContext'
import { comunidadService } from '../comunidad/comunidadService'
import ListaAnuncios, { leerVisto, marcarVisto } from '../comunidad/ListaAnuncios'
import { Anuncio } from '../comunidad/tipos'

export default function AnunciosPage() {
  const casa = useAuth().user?.casa ?? ''
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null)
  // Se guarda la marca anterior para resaltar lo nuevo en esta visita, y se actualiza al entrar
  const [vistoHasta] = useState(leerVisto)
  useEffect(() => { marcarVisto() }, [])

  const cargar = useCallback(async () => {
    try { setAnuncios(await comunidadService.anuncios(casa)) } catch { toast.error('No se pudieron cargar los anuncios') }
  }, [casa])
  useEffect(() => { void cargar(); return comunidadService.suscribir(() => void cargar()) }, [cargar])

  return (
    <>
      <Encabezado titulo="Anuncios" detalle="Avisos de la administración de tu privada" />
      {anuncios === null ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-40 rounded-[22px] bg-panel shadow-tarjeta animate-pulse" />)}</div>
      ) : anuncios.length === 0 ? (
        <Vacio icono="megafono" titulo="Sin anuncios" texto="Cuando la administración publique algo, lo verás aquí y te llegará una notificación." />
      ) : (
        <ListaAnuncios anuncios={anuncios} vistoHasta={vistoHasta} />
      )}
    </>
  )
}
