"use client"

import React from "react"
import { useParams } from "next/navigation"
import GoogleDocsIframe from "../../../components/GoogleDocsIframe"

export default function DocEditorPage() {
  const params = useParams()
  const id = params?.id

  // In this example we assume `id` is the Google Doc ID stored in `documento.google_doc_id`.
  // Integrate with your own paciente/document lookup to fetch the doc ID.

  if (!id) return <div>ID do paciente ausente</div>

  // For demo: treat patient id as doc id. Replace with real lookup.
  const docId = id

  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Editor de Documento (Paciente {id})</h1>
      <p className="text-sm text-muted-foreground mb-2">O documento será carregado no iframe abaixo. Se o Google bloquear o embed, use o link para abrir em nova aba.</p>
      <GoogleDocsIframe docId={docId} makePublic={false} />
    </main>
  )
}
