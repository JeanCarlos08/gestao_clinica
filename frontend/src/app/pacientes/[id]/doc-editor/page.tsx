"use client"

import React from "react"
import { useParams } from "next/navigation"
import GoogleDocsIframe from "../../../components/GoogleDocsIframe"

export default function DocEditorPage() {
  const params = useParams()
  const id = params?.id
  const [docId, setDocId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    let mounted = true
    async function fetchDoc() {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/pacientes/${id}/document`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 404) {
          throw new Error('Nenhum documento associado a esse paciente.')
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.detail || 'Falha ao buscar documento')
        }
        const j = await res.json()
        if (mounted) setDocId(j.google_doc_id)
      } catch (err: any) {
        if (mounted) setError(err.message || String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchDoc()
    return () => { mounted = false }
  }, [id])

  if (!id) return <div>ID do paciente ausente</div>

  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Editor de Documento (Paciente {id})</h1>
      <p className="text-sm text-muted-foreground mb-2">O documento será carregado no iframe abaixo. Se o Google bloquear o embed, use o link para abrir em nova aba.</p>
      {loading && <div>Carregando documento...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {docId && <GoogleDocsIframe docId={docId} makePublic={false} />}
    </main>
  )
}
