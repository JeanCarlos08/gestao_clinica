"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft, Undo2, Redo2, Printer, Download, Save, FileText, Loader2,
  AlertCircle, Link2, Link2Off, Highlighter, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, IndentIncrease, IndentDecrease, PaintBucket,
  Code2, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, Quote, Image as ImageIcon, Table2, Trash2, Eraser, Check,
} from "lucide-react";
import { API as API_BASE } from "@/lib/api";

interface LaudoInfo { id: string; titulo: string; paciente: string; tipo: string; status: string; url: string; embed_url: string; kind?: string; }
interface NativeDoc { id: number; titulo: string; conteudo_html: string; atualizado_em: string; }

const COLORS = ["#000000", "#555555", "#C0392B", "#E67E22", "#B7950B", "#1E7A46", "#1D5FA8", "#6C3FA8", "#8A1F3D", "#FFFFFF"];

type Tiper = ReturnType<typeof useEditor>;

function Btn({ title, on, disabled, onClick, children }: { title: string; on?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={e => { e.preventDefault(); onClick(); }}
      className={`docs-btn ${on ? "docs-btn-on" : ""}`}
    >
      {children}
    </button>
  );
}
function Bar({ sep = false, children }: { sep?: boolean; children: React.ReactNode }) {
  return <span className={`docs-tb-group${sep ? " docs-tb-sep" : ""}`}>{children}</span>;
}

function Toolbar({ ed }: { ed: Tiper }) {
  const [colorOpen, setColorOpen] = useState(false);
  if (!ed) return null;
  const ch = () => ed.chain().focus();
  const addLink = () => {
    const prev = (ed.getAttributes("link") as { href?: string }).href || "";
    const input = window.prompt("Endereço do link (URL):", prev || "https://");
    if (input === null) return;
    if (input === "") { ch().extendMarkRange("link").unsetLink().run(); return; }
    ch().extendMarkRange("link").setLink({ href: input }).run();
  };
  const paraState = ed.isActive("heading", { level: 1 }) ? "h1" : ed.isActive("heading", { level: 2 }) ? "h2" : ed.isActive("heading", { level: 3 }) ? "h3" : ed.isActive("blockquote") ? "quote" : "p";
  return (
    <div className="docs-tb" role="toolbar">
      <Bar>
        <Btn title="Desfazer (Ctrl+Z)" disabled={!ed.can().undo()} onClick={() => ch().undo().run()}><Undo2 size={16} /></Btn>
        <Btn title="Refazer (Ctrl+Y)" disabled={!ed.can().redo()} onClick={() => ch().redo().run()}><Redo2 size={16} /></Btn>
      </Bar>
      <Bar sep>
        <Btn title="Imprimir / Salvar PDF" onClick={() => window.print()}><Printer size={16} /></Btn>
      </Bar>
      <Bar sep>
        <select
          title="Estilo de parágrafo"
          className="docs-select"
          value={paraState}
          onChange={e => {
            const v = e.target.value;
            if (v === "h1") ch().setHeading({ level: 1 }).run();
            else if (v === "h2") ch().setHeading({ level: 2 }).run();
            else if (v === "h3") ch().setHeading({ level: 3 }).run();
            else if (v === "quote") ch().setBlockquote().run();
            else ch().setParagraph().run();
          }}
        >
          <option value="p">Texto normal</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
          <option value="quote">Citação</option>
        </select>
        <select title="Fonte" className="docs-select" defaultValue="Arial" onChange={e => ch().setFontFamily(e.target.value).run()}>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Garamond">Garamond</option>
        </select>
        <select title="Tamanho da fonte" className="docs-select" defaultValue="11pt" onChange={e => ch().setFontSize(e.target.value).run()}>
          {[8, 9, 10, 11, 12, 14, 18, 24, 36].map(s => <option key={s} value={`${s}pt`}>{s}</option>)}
        </select>
      </Bar>
      <Bar sep>
        <Btn title="Negrito (Ctrl+B)" on={ed.isActive("bold")} onClick={() => ch().toggleBold().run()}><Bold size={16} /></Btn>
        <Btn title="Itálico (Ctrl+I)" on={ed.isActive("italic")} onClick={() => ch().toggleItalic().run()}><Italic size={16} /></Btn>
        <Btn title="Sublinhado (Ctrl+U)" on={ed.isActive("underline")} onClick={() => ch().toggleUnderline().run()}><UnderlineIcon size={16} /></Btn>
        <Btn title="Tachado" on={ed.isActive("strike")} onClick={() => ch().toggleStrike().run()}><Strikethrough size={16} /></Btn>
      </Bar>
      <Bar sep>
        <div className="relative">
          <Btn title="Cor do texto" on={colorOpen} onClick={() => setColorOpen(v => !v)}><PaintBucket size={16} /></Btn>
          {colorOpen && (
            <div className="docs-colorpop">
              {COLORS.map(hex => (
                <button
                  key={hex}
                  type="button"
                  className="docs-swatch"
                  style={{ background: hex }}
                  title={hex}
                  onClick={() => { ch().setColor(hex).run(); setColorOpen(false); }}
                />
              ))}
              <button type="button" className="docs-swatch docs-swatch-reset" title="Sem cor" onClick={() => { ch().unsetColor().run(); setColorOpen(false); }}>✕</button>
            </div>
          )}
        </div>
        <Btn title="Destaque amarelo" on={ed.isActive("highlight")} onClick={() => ch().toggleHighlight({ color: "#FFF59D" }).run()}><Highlighter size={16} /></Btn>
        <Btn title="Inserir/remover link" on={ed.isActive("link")} onClick={addLink}>{ed.isActive("link") ? <Link2Off size={16} /> : <Link2 size={16} />}</Btn>
        <label className="docs-btn" title="Inserir imagem" style={{ cursor: "pointer" }}>
          <ImageIcon size={16} />
          <input
            type="file" accept="image/*" style={{ display: "none" }}
            onChange={ev => {
              const f = ev.target.files?.[0];
              if (!f) { ev.target.value = ""; return; }
              const reader = new FileReader();
              reader.onload = () => ch().setImage({ src: String(reader.result) }).run();
              reader.readAsDataURL(f);
              ev.target.value = "";
            }}
          />
        </label>
      </Bar>
      <Bar sep>
        <Btn title="Alinhar à esquerda" on={ed.isActive({ textAlign: "left" })} onClick={() => ch().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
        <Btn title="Centralizar" on={ed.isActive({ textAlign: "center" })} onClick={() => ch().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
        <Btn title="Alinhar à direita" on={ed.isActive({ textAlign: "right" })} onClick={() => ch().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
        <Btn title="Justificar" on={ed.isActive({ textAlign: "justify" })} onClick={() => ch().setTextAlign("justify").run()}><AlignJustify size={16} /></Btn>
      </Bar>
      <Bar sep>
        <Btn title="Lista com marcadores" on={ed.isActive("bulletList")} onClick={() => ch().toggleBulletList().run()}><List size={16} /></Btn>
        <Btn title="Lista numerada" on={ed.isActive("orderedList")} onClick={() => ch().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
        <Btn title="Aumentar recuo" disabled={!ed.can().sinkListItem("listItem")} onClick={() => ch().sinkListItem("listItem").run()}><IndentIncrease size={16} /></Btn>
        <Btn title="Diminuir recuo" disabled={!ed.can().liftListItem("listItem")} onClick={() => ch().liftListItem("listItem").run()}><IndentDecrease size={16} /></Btn>
      </Bar>
      <Bar sep>
        <Btn title="Inserir tabela 3×3" onClick={() => ch().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={16} /></Btn>
        <Btn title="Citação" on={ed.isActive("blockquote")} onClick={() => ch().toggleBlockquote().run()}><Quote size={16} /></Btn>
        <Btn title="Bloco de código" on={ed.isActive("codeBlock")} onClick={() => ch().toggleCodeBlock().run()}><Code2 size={16} /></Btn>
      </Bar>
      <Bar sep>
        <Btn title="Limpar formatação" onClick={() => ch().unsetAllMarks().clearNodes().run()}><Eraser size={16} /></Btn>
        <Btn title="Excluir seleção" onClick={() => ch().deleteSelection().run()}><Trash2 size={16} /></Btn>
      </Bar>
    </div>
  );
}

function NativeEditor({ docId, onBack }: { docId: string; onBack: () => void }) {
  const [titulo, setTitulo] = useState("Documento sem título");
  const [saveState, setSaveState] = useState<"none" | "sav" | "ok" | "err">("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [palavras, setPalavras] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const router = useRouter();
  const API = API_BASE;

  const persistRef = useRef<(html: string, tituloNovo?: string) => void>(() => {});
  const initialTitulo = useRef<string>("");

  const ed = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle, Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LinkExt.configure({ openOnClick: false }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: "Comece a escrever seu documento…" }),
    ],
    content: "<p></p>",
    editorProps: { attributes: { class: "doc-prose", spellcheck: "true" } },
    onUpdate: ({ editor: e2 }) => {
      const html = e2.getHTML();
      setPalavras(e2.getText().trim().split(/\s+/).filter(Boolean).length);
      setSaveState("sav");
      window.clearTimeout((persistRef.current as unknown as { _t?: number })._t);
      (persistRef.current as unknown as { _t?: number })._t = window.setTimeout(() => persistRef.current(html), 1400);
    },
  });

  const persist = useCallback(async (html: string, tituloNovo?: string) => {
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setSaveState("sav");
    try {
      const res = await fetch(`${API}/laudos/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ conteudo_html: html, ...(tituloNovo !== undefined ? { titulo: tituloNovo } : {}) }),
      });
      if (!res.ok) throw new Error();
      setSaveState("ok");
    } catch {
      setSaveState("err");
    }
  }, [docId, API]);

  useEffect(() => { persistRef.current = persist; }, [persist]);

  useEffect(() => {
    void (async () => {
      const tk = localStorage.getItem("token");
      if (!tk) { router.push("/"); return; }
      try {
        const res = await fetch(`${API}/laudos/${docId}`, { headers: { Authorization: `Bearer ${tk}` } });
        if (res.ok) {
          const d: NativeDoc = await res.json();
          setTitulo(d.titulo);
          initialTitulo.current = d.titulo;
          if (ed && !ed.isDestroyed) {
            ed.commands.setContent(d.conteudo_html || "<p></p>");
            setPalavras(ed.getText().trim().split(/\s+/).filter(Boolean).length);
          }
        } else setError("Documento não encontrado ou não é um documento interno.");
      } catch { setError("Erro de comunicação."); }
      finally { setLoading(false); }
    })();
  }, [docId, ed, router, API]);

  const salvarTitulo = () => {
    if (!ed || ed.isDestroyed) return;
    void persist(ed.getHTML(), titulo);
  };

  const baixarHtml = () => {
    if (!ed || ed.isDestroyed) return;
    const blob = new Blob([`<html><head><meta charset="utf-8"><title>${titulo}</title></head><body>${ed.getHTML()}</body></html>`], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo}.html`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      <p className="text-sm text-[var(--text-muted)]">Abrindo documento…</p>
    </div>
  );
  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-sm text-[var(--text-muted)]">{error}</p>
      <Link href="/laudos" className="text-sm text-[var(--primary)] hover:underline">Voltar aos documentos</Link>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 docs-screen">
      <style>{DOC_CSS}</style>
      {/* Barra superior — título editável + estado de salvamento + ações (estilo Docs) */}
      <div className="docs-top">
        <div className="docs-top-left">
          <button onClick={onBack} className="docs-icon-btn" title="Voltar"><ArrowLeft size={18} /></button>
          <div className="w-7 h-7 rounded bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center flex-shrink-0"><FileText size={15} className="text-[var(--primary)]" /></div>
          <input
            className="docs-title"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onBlur={() => { if (titulo !== initialTitulo.current) salvarTitulo(); }}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            spellCheck={false}
          />
          <span className="docs-savestate" data-s={saveState}>
            {saveState === "sav" && <><Loader2 size={12} className="animate-spin" /> Salvando…</>}
            {saveState === "ok" && <><Check size={12} /> Todas as alterações salvas</>}
            {saveState === "err" && "Erro ao salvar — tente de novo"}
            {saveState === "none" && <span />}
          </span>
        </div>
        <div className="docs-top-right">
          <button className="docs-icon-btn" title="Salvar agora" onClick={() => { if (!ed || ed.isDestroyed) return; window.clearTimeout((persistRef.current as unknown as { _t?: number })._t); persist(ed.getHTML(), titulo !== initialTitulo.current ? titulo : undefined); }}><Save size={16} /></button>
          <div className="relative">
            <button className="docs-icon-btn" title="Baixar / Imprimir" onClick={() => setDownloadOpen(v => !v)}><Download size={16} /></button>
            {downloadOpen && (
              <div className="docs-menu">
                <button type="button" onClick={() => { setDownloadOpen(false); baixarHtml(); }}><Download size={13} /> Baixar .html</button>
                <button type="button" onClick={() => { setDownloadOpen(false); window.print(); }}><Printer size={13} /> Imprimir / PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fileira de ferramentas */}
      <div className="docs-tbwrap">
        {ed && !ed.isDestroyed && <Toolbar ed={ed} />}
      </div>

      {/* Régua visual */}
      <div className="docs-ruler" aria-hidden>
        {[...Array(33)].map((_, i) => <span key={i} />)}
      </div>

      {/* Canvas cinza com folha A4 */}
      <div className="docs-canvas">
        {ed && !ed.isDestroyed && (
          <div className="doc-sheet" style={{ zoom: `${zoom}%` }}>
            <EditorContent editor={ed} />
          </div>
        )}
      </div>

      {/* Barra de status */}
      <div className="docs-statusbar">
        <button type="button" className="docs-pill">{palavras} palavras</button>
        <span className="flex-1" />
        <span className="zoom-ctl">
          <button type="button" onClick={() => setZoom(z => Math.max(50, z - 10))}>−</button>
          <select value={zoom} onChange={e => setZoom(Number(e.target.value))}>
            {[50, 75, 90, 100, 125, 150, 200].map(z => <option key={z} value={z}>{z}%</option>)}
          </select>
          <button type="button" onClick={() => setZoom(z => Math.min(200, z + 10))}>+</button>
        </span>
      </div>
    </div>
  );
}

const DOC_CSS = `
.docs-screen { min-height: 0; }
.docs-top { display:flex; align-items:center; justify-content:space-between; gap:16px; height:52px; padding:0 14px 0 6px; border-bottom:1px solid var(--border); background:var(--card); flex-shrink:0; }
.docs-top-left { display:flex; align-items:center; gap:10px; min-width:0; }
.docs-top-right { display:flex; align-items:center; gap:6px; }
.docs-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9999px; color:var(--text-muted); transition:background .15s,color .15s; }
.docs-icon-btn:hover { background:var(--card-hover); color:#fff; }
.docs-title { background:transparent; border:1px solid transparent; border-radius:8px; font-weight:700; font-size:15px; color:#fff; padding:5px 10px; min-width:220px; max-width:380px; }
.docs-title:hover { border-color:var(--border); }
.docs-title:focus { outline:none; border-color:var(--primary); background:var(--background); }
.docs-savestate { display:inline-flex; align-items:center; gap:5px; font-size:11px; color:var(--text-muted); white-space:nowrap; }
.docs-tbwrap { border-bottom:1px solid var(--border); background:var(--card); flex-shrink:0; overflow-x:auto; scrollbar-width:none; }
.docs-tbwrap::-webkit-scrollbar { display:none; }
.docs-tb { display:flex; align-items:center; gap:2px; padding:6px 10px; min-height:44px; }
.docs-tb-group { display:flex; align-items:center; gap:2px; }
.docs-tb-sep { margin-left:6px; padding-left:6px; border-left:1px solid var(--border); }
.docs-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:6px; color:var(--text-muted); background:transparent; }
.docs-btn:hover { background:var(--card-hover); color:#fff; }
.docs-btn.docs-btn-on { background:rgba(77,167,104,.18); color:var(--primary); }
.docs-btn:disabled { opacity:.32; cursor:default; }
.docs-btn:disabled:hover { background:transparent; color:var(--text-muted); }
.docs-select { background:var(--card-hover); border:1px solid var(--border); color:#fff; border-radius:6px; font-size:12px; padding:4px 6px; max-width:130px; }
.docs-select:hover { border-color:var(--border-light); }
.docs-colorpop { position:absolute; top:36px; left:0; z-index:60; display:grid; grid-template-columns:repeat(6,22px); gap:6px; padding:10px; border-radius:10px; background:var(--card); border:1px solid var(--border-light); box-shadow:0 12px 32px rgba(0,0,0,.5); }
.docs-swatch { width:22px; height:22px; border-radius:50%; border:1px solid rgba(255,255,255,.25); }
.docs-swatch-reset { display:flex; align-items:center; justify-content:center; font-size:9px; color:var(--background); }
.docs-menu { position:absolute; right:0; top:40px; z-index:60; background:var(--card); border:1px solid var(--border-light); border-radius:10px; box-shadow:0 16px 40px rgba(0,0,0,.55); overflow:hidden; min-width:170px; }
.docs-menu button { display:flex; align-items:center; gap:8px; width:100%; padding:9px 14px; font-size:13px; color:#fff; }
.docs-menu button:hover { background:var(--card-hover); }
.docs-ruler { position:relative; height:18px; flex-shrink:0; display:flex; align-items:flex-end; justify-content:center; gap:22px; border-bottom:1px solid var(--border); background:var(--background); opacity:.5; overflow:hidden; }
.docs-ruler span { width:1px; height:6px; background:var(--text-muted); }
.docs-ruler span:nth-child(4n) { height:10px; }
.docs-canvas { flex:1; overflow:auto; background:#171b18; padding:32px 24px 96px; }
.doc-sheet { width:794px; min-height:1123px; margin:0 auto; background:#fff; color:#1c1e21; border-radius:2px; box-shadow:0 2px 8px rgba(0,0,0,.30),0 12px 40px rgba(0,0,0,.35); box-sizing:border-box; padding:96px 96px 120px; font-family:Arial,Helvetica,sans-serif; font-size:11pt; line-height:1.54; }
.doc-prose { outline:none !important; min-height:180px; }
.doc-prose p { margin:0 0 10px; }
.doc-prose h1 { font-size:20pt; font-weight:600; margin:18px 0 10px; color:#1c1e21; }
.doc-prose h2 { font-size:16pt; font-weight:600; margin:16px 0 8px; color:#1c1e21; }
.doc-prose h3 { font-size:13pt; font-weight:600; margin:14px 0 6px; color:#1c1e21; }
.doc-prose ul, .doc-prose ol { margin:0 0 10px; padding-left:26px; }
.doc-prose ul { list-style:disc; }
.doc-prose ul ul { list-style:circle; }
.doc-prose ol { list-style:decimal; }
.doc-prose li { margin-bottom:4px; }
.doc-prose blockquote { border-left:3px solid #dadce0; padding-left:14px; color:#444; margin:10px 0; background:transparent; }
.doc-prose pre { background:#f1f3f4; border-radius:6px; padding:10px 12px; font-family:"Courier New",monospace; font-size:10pt; overflow-x:auto; color:#1c1e21; }
.doc-prose code { font-family:"Courier New",monospace; font-size:10pt; }
.doc-prose a { color:#1a73e8; text-decoration:underline; }
.doc-prose table { border-collapse:collapse; width:100%; margin:12px 0; }
.doc-prose th, .doc-prose td { border:1px solid #dadce0; padding:6px 9px; font-size:10pt; text-align:left; position:relative; }
.doc-prose th { background:#f8f9fa; font-weight:600; }
.doc-prose img { max-width:100%; height:auto; border-radius:4px; }
.doc-prose ::placeholder { color:#9aa0a6; }
.doc-prose p.is-editor-empty:first-child::before { content:attr(data-placeholder); color:#9aa0a6; float:left; height:0; pointer-events:none; }
.doc-prose ::selection { background:rgba(26,115,232,.20); }
.docs-statusbar { display:flex; align-items:center; gap:10px; height:38px; padding:0 16px; border-top:1px solid var(--border); background:var(--card); font-size:12px; color:var(--text-muted); flex-shrink:0; }
.docs-pill { border:1px solid var(--border); border-radius:9999px; padding:3px 12px; font-size:12px; color:var(--text-muted); }
.docs-pill:hover { color:#fff; border-color:var(--border-light); }
.zoom-ctl { display:flex; align-items:center; gap:6px; }
.zoom-ctl button { width:22px; height:22px; border-radius:6px; color:var(--text-muted); }
.zoom-ctl button:hover { background:var(--card-hover); color:#fff; }
.zoom-ctl select { background:var(--card-hover); border:1px solid var(--border); color:#fff; border-radius:6px; font-size:12px; padding:2px 6px; }
@media print {
  .app-bg-photo, aside, .docs-top, .docs-tbwrap, .docs-ruler, .docs-statusbar { display:none !important; }
  body, main { background:#fff !important; }
  .docs-canvas { overflow:visible !important; padding:0 !important; background:#fff !important; }
  .doc-sheet { box-shadow:none !important; width:100% !important; zoom:100% !important; padding:12mm 16mm; min-height:0; }
}
`;

function GoogleEditor({ id, titulo }: { id: string; titulo: string }) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
        <span className="flex items-center gap-2 text-sm text-white font-semibold truncate"><FileText size={16} className="text-amber-400" /> {titulo}</span>
        <a href={`https://docs.google.com/document/d/${id}/edit`} target="_blank" rel="noreferrer" className="text-xs text-[var(--primary)] hover:underline">Abrir no Google Docs ↗</a>
      </div>
      <iframe title="Laudo Google Docs" src={`https://docs.google.com/document/d/${id}/preview`} className="flex-1 w-full bg-white" />
    </div>
  );
}

export default function LaudoEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";
  const isNative = /^\d+$/.test(id);

  const [google, setGoogle] = useState<LaudoInfo | null>(null);
  const [gLoading, setGLoading] = useState<boolean>(!isNative);
  const [gError, setGError] = useState<string | null>(null);

  useEffect(() => {
    if (isNative) return;
    const tk = localStorage.getItem("token");
    if (!tk) { router.push("/"); return; }
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/laudos`, { headers: { Authorization: `Bearer ${tk}` } });
        const all: LaudoInfo[] = await res.json();
        const found = all.find(l => l.id === id);
        if (!found) setGError("Laudo não encontrado."); else setGoogle(found);
      } catch { setGError("Erro de comunicação."); }
      finally { setGLoading(false); }
    })();
  }, [id, isNative, router]);

  const toList = () => router.push("/laudos");

  if (!isNative) {
    if (gLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-[var(--primary)]" /></div>;
    if (gError || !google) return <div className="flex-1 flex flex-col items-center justify-center gap-3"><AlertCircle size={30} className="text-red-400" /><p className="text-sm text-[var(--text-muted)]">{gError}</p><button onClick={toList} className="text-sm text-[var(--primary)] hover:underline">Voltar</button></div>;
    return <div className="flex-1 flex flex-col min-h-0"><GoogleEditor id={google.id} titulo={google.titulo} /></div>;
  }

  return <NativeEditor docId={id} onBack={toList} />;
}
