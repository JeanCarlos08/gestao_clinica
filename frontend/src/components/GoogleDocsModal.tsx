"use client"

import React, { useEffect } from "react"
import GoogleDocsIframe from "./GoogleDocsIframe"

type Props = {
  docId: string
  onClose: () => void
}

export default function GoogleDocsModal({ docId, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[90vw] max-w-4xl h-[85vh] bg-white rounded shadow-lg overflow-hidden transform transition-all duration-200">
        <div className="flex items-center justify-between p-3 border-b gap-3">
          <h3 className="text-lg font-medium">Editor do Google Docs</h3>
          <div className="flex items-center gap-2">
            <a
              href={`https://docs.google.com/document/d/${docId}/edit`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm px-3 py-1 rounded bg-blue-50 text-blue-700 border"
            >Abrir em nova aba</a>
            <button onClick={onClose} className="text-sm px-3 py-1 rounded bg-gray-100">Fechar</button>
          </div>
        </div>
        <div className="h-[calc(100%-56px)]">
          <GoogleDocsIframe docId={docId} makePublic={false} />
        </div>
      </div>
    </div>
  )
}
