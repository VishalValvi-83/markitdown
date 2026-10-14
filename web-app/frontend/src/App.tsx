import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  Clipboard,
  Download,
  FileText,
  LoaderCircle,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const ACCEPTED_FILES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const onDrop = useCallback((files: File[]) => {
    setError('');
    setMarkdown('');
    setIsCopied(false);
    setSelectedFile(files[0] ?? null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024,
    noClick: true,
    onDropRejected: (rejections) => {
      setSelectedFile(null);
      setError(rejections[0]?.errors[0]?.message ?? 'That file cannot be uploaded.');
    },
  });

  async function convertFile() {
    if (!selectedFile) return;

    setIsConverting(true);
    setError('');
    setMarkdown('');
    setIsCopied(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/convert`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as { markdown?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Conversion failed.');
      }

      setMarkdown(payload.markdown ?? '');
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Conversion failed.');
    } finally {
      setIsConverting(false);
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1800);
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedFile?.name.replace(/\.[^/.]+$/, '') ?? 'converted'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setSelectedFile(null);
    setMarkdown('');
    setError('');
    setIsCopied(false);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f4] text-[#17231f]">
      <div className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-[#dfe7dd] pb-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#173b32] text-[#d5f17b] shadow-[0_8px_24px_rgba(23,59,50,0.18)]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#63796e]">OmniMark</p>
              <p className="text-sm font-medium text-[#53655d]">Document intelligence, simplified.</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-[#d2dfcf] bg-white/60 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#688074] sm:inline-flex">Private by default</span>
        </header>

        <section className="grid gap-12 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-20">
          <div className="max-w-xl">
            <p className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.28em] text-[#78922c]">Convert once. Think faster.</p>
            <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#173b32] sm:text-7xl">Your files, in a language AI understands.</h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[#617069]">Drop in a document and get clean, structured Markdown in moments. Tables, headings, links, and the useful bits stay intact.</p>
            <div className="mt-8 flex flex-wrap gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#6b7e74]">
              {['PDF', 'DOCX', 'PPTX', 'XLSX', 'TXT'].map((type) => <span className="rounded-full bg-[#e7efdf] px-3 py-2" key={type}>{type}</span>)}
            </div>
          </div>

          <div {...getRootProps()} className="relative rounded-4xl border border-[#d6e3d2] bg-white p-3 shadow-[0_24px_80px_rgba(53,83,63,0.11)]">
            <input {...getInputProps()} />
            <div className={`rounded-3xl border-2 border-dashed p-8 transition sm:p-12 ${isDragActive ? 'border-[#9ab83e] bg-[#f1f7df]' : 'border-[#d8e4d3] bg-[#fbfcf8]'}`}>
              {selectedFile ? (
                <div className="text-center">
                  <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-[#173b32] text-[#d5f17b]"><FileText size={28} /></div>
                  <p className="truncate text-lg font-semibold text-[#173b32]">{selectedFile.name}</p>
                  <p className="mt-1 font-mono text-xs text-[#829188]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <button onClick={convertFile} disabled={isConverting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173b32] px-5 py-3 font-semibold text-white transition hover:bg-[#28564a] disabled:cursor-wait disabled:opacity-70">
                      {isConverting ? <><LoaderCircle className="animate-spin" size={18} /> Converting...</> : <><Sparkles size={18} /> Convert to Markdown</>}
                    </button>
                    <button onClick={reset} disabled={isConverting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d1dfcd] px-5 py-3 font-semibold text-[#587064] transition hover:bg-[#eef4eb] disabled:opacity-50"><X size={17} /> Choose another</button>
                  </div>
                  {isConverting && <p className="mt-5 text-sm text-[#7a8b83]">Reading structure and preparing your Markdown...</p>}
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-[#e6f0d7] text-[#6d8e23]"><UploadCloud size={29} /></div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#173b32]">{isDragActive ? 'Release to upload' : 'Drop your document here'}</h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#7c8b83]">A clean Markdown version will be ready in a few seconds. Files are processed temporarily.</p>
                  <button onClick={open} className="mt-7 rounded-xl bg-[#173b32] px-5 py-3 font-semibold text-white transition hover:bg-[#28564a]">Browse files</button>
                  <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#a1aea6]">Maximum file size: 15 MB</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mx-auto mb-8 flex max-w-3xl items-center gap-3 rounded-xl border border-[#efc8c1] bg-[#fff4f1] px-4 py-3 text-sm text-[#a14d3e]">{error}</div>}

        {markdown && <section className="mx-auto mb-12 max-w-5xl overflow-hidden rounded-3xl border border-[#d8e4d3] bg-white shadow-[0_16px_50px_rgba(53,83,63,0.08)]">
          <div className="flex flex-col gap-3 border-b border-[#e8eee5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#79932d]">Conversion complete</p><h2 className="mt-1 text-xl font-semibold text-[#173b32]">Markdown preview</h2></div>
            <div className="flex gap-2">
              <button onClick={copyMarkdown} className="inline-flex items-center gap-2 rounded-lg border border-[#d6e3d2] px-3 py-2 text-sm font-semibold text-[#526b5e] hover:bg-[#f3f7f0]">{isCopied ? <Check size={16} /> : <Clipboard size={16} />}{isCopied ? 'Copied' : 'Copy'}</button>
              <button onClick={downloadMarkdown} className="inline-flex items-center gap-2 rounded-lg bg-[#d5f17b] px-3 py-2 text-sm font-semibold text-[#173b32] hover:bg-[#c6e667]"><Download size={16} /> Download .md</button>
            </div>
          </div>
          <article className="prose prose-slate max-w-none overflow-x-auto px-5 py-7 sm:px-7"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></article>
        </section>}

        <footer className="border-t border-[#dfe7dd] py-5 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa9a0]">Built for documents that deserve to be understood <span className="mx-1 text-[#c1cbc4]">|</span> Powered by Microsoft MarkItDown engine</footer>
      </div>
    </main>
  );
}

export default App;
