"use client"

import React, { useEffect, useState } from "react"

type Props = {
  docId: string
  makePublic?: boolean
}

export default function GoogleDocsIframe({ docId, makePublic = false }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchUrl() {
      try {
        const res = await fetch(`/api/docs/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_id: docId, make_public: makePublic }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.detail || "Falha ao obter link do documento")
        }
        const j = await res.json()
        if (mounted) setUrl(j.embed_url || j.edit_url)
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : String(err))
      }
    }

    fetchUrl()
    return () => {
      mounted = false
    }
  }, [docId, makePublic])

  if (error) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="font-medium">Não foi possível embutir o documento:</p>
        <p className="text-sm text-red-600">{error}</p>
        <p className="mt-2 text-sm">
          Abra em nova aba: <a className="text-blue-600 underline" href={`https://docs.google.com/document/d/${docId}/edit`} target="_blank" rel="noreferrer">Abrir no Google Docs</a>
        </p>
      </div>
    )
  }

  if (!url) return <div>Carregando documento...</div>

  return (
    <div className="w-full h-[80vh]">
      <iframe
        title={`GoogleDoc-${docId}`}
        src={url}
        className="w-full h-full border"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  )
}
