"use client"

import React from "react"
import { useParams } from "next/navigation"
import GoogleDocsIframe from "../../../components/GoogleDocsIframe"
import GoogleDocsModal from "../../../components/GoogleDocsModal"

export default function DocEditorPage() {
  const params = useParams()
  const id = params?.id
  const [docId, setDocId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)

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
      {docId && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <input id="tempMinutes" type="number" min={1} defaultValue={30} className="w-24 p-2 rounded bg-[var(--card)] border" />
            <button
              onClick={async () => {
                const token = localStorage.getItem('token')
                const minutes = (document.getElementById('tempMinutes') as HTMLInputElement).value
                try {
                  const res = await fetch('/api/docs/embed', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ doc_id: docId, temporary_minutes: Number(minutes) }) })
                  const j = await res.json()
                  if (!res.ok) throw new Error(j.detail || 'Falha')
                  alert(`Permissão criada: ${j.permission_id}. Expira em: ${j.expires_at}`)
                } catch (err: any) { alert(err.message || String(err)) }
              }}
              className="px-3 py-1 bg-[var(--primary)] text-white rounded"
            >Conceder Acesso Temporário</button>
            <button
              onClick={async () => {
                const token = localStorage.getItem('token')
                const perm = prompt('Permission ID para revogar (copie do alerta)')
                if (!perm) return
                try {
                  const res = await fetch('/api/docs/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ doc_id: docId, permission_id: perm }) })
                  const j = await res.json()
                  if (!res.ok) throw new Error(j.detail || 'Falha')
                  alert('Permissão revogada')
                } catch (err: any) { alert(err.message || String(err)) }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >Revogar Acesso</button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >Abrir Editor</button>
          </div>
          {/* Modal popup */}
          {modalOpen && docId && (
            <GoogleDocsModal docId={docId} onClose={() => setModalOpen(false)} />
          )}
        </div>
      )}
    </main>
  )
}
