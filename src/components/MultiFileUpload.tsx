import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, X, FileText, Loader2, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface MultiFileUploadProps {
  onTextExtracted: (text: string) => void;
}

interface FileStatus {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export function MultiFileUpload({ onTextExtracted }: MultiFileUploadProps) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isAnyProcessing, setIsAnyProcessing] = useState(false);

  const processFile = async (file: File, statusId: string) => {
    updateFileStatus(statusId, { status: 'processing', progress: 10 });

    try {
      let extractedText = '';

      if (file.type.startsWith('image/')) {
        const result = await Tesseract.recognize(file, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              updateFileStatus(statusId, { progress: 10 + Math.round(m.progress * 80) });
            }
          },
        });
        extractedText = result.data.text;
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(' ') + '\n';
          updateFileStatus(statusId, { progress: 10 + Math.round((i / pdf.numPages) * 80) });
        }
        extractedText = fullText;
      }

      updateFileStatus(statusId, { status: 'completed', progress: 100 });
      onTextExtracted(`\n--- Extracted from ${file.name} ---\n${extractedText}\n`);
    } catch (err) {
      console.error('OCR Error:', err);
      updateFileStatus(statusId, { status: 'error', progress: 0, error: 'Extraction failed' });
    }
  };

  const updateFileStatus = (id: string, updates: Partial<FileStatus>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: (file.type.startsWith('image/') ? 'image' : 'pdf') as 'image' | 'pdf',
      status: 'pending' as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setIsAnyProcessing(true);

    newFiles.forEach((fileStatus, index) => {
      processFile(acceptedFiles[index], fileStatus.id);
    });
  }, [onTextExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    }
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="mt-3 mb-2 space-y-3">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-500 overflow-hidden",
          isDragActive
            ? "border-neon-cyan bg-neon-cyan/15 shadow-[0_0_35px_rgba(34,211,238,0.25)] scale-[1.01]"
            : "border-slate-600/60 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:border-neon-cyan/40 hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]",
          isAnyProcessing && "cursor-default"
        )}
      >
        {/* Scanner line animation */}
        <AnimatePresence>
          {files.some(f => f.status === 'processing') && (
            <motion.div
              initial={{ top: '-10%' }}
              animate={{ top: '110%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <input {...getInputProps()} />

        <div className="p-5 flex flex-col items-center justify-center text-center gap-3">
          {/* Icon */}
          <div className={cn(
            "p-3 rounded-2xl transition-all duration-500",
            isDragActive
              ? "bg-neon-cyan text-slate-950 scale-125 shadow-[0_0_25px_rgba(34,211,238,0.5)]"
              : "bg-gradient-to-br from-slate-700 to-slate-800 text-neon-cyan group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-slate-600/60"
          )}>
            {isDragActive
              ? <Zap className="w-6 h-6 fill-current" />
              : <span className="text-2xl leading-none">🧠</span>
            }
          </div>

          {/* Text */}
          <div>
            <p className={cn(
              "text-sm font-black uppercase tracking-[0.2em] transition-colors duration-300",
              isDragActive ? "text-neon-cyan" : "text-slate-200 group-hover:text-neon-cyan"
            )}>
              {isDragActive ? "⚡ Drop to Scan!" : "🖼️ Neural Data Intake"}
            </p>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
              Drop images or PDFs for intelligent OCR
            </p>
          </div>

          {/* Hint chips */}
          {!isDragActive && (
            <div className="flex items-center gap-3 text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-full border border-slate-700/50">
                📋 Whiteboards
              </span>
              <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-full border border-slate-700/50">
                🧾 Receipts
              </span>
              <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-full border border-slate-700/50">
                📝 Handwritten
              </span>
            </div>
          )}
        </div>
      </div>

      {/* File Status Grid */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {files.map((file) => (
              <motion.div
                layout
                key={file.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative rounded-xl p-3 flex items-center gap-3 overflow-hidden border transition-all duration-300"
                style={{
                  background: file.status === 'completed'
                    ? 'rgba(16,185,129,0.08)'
                    : file.status === 'error'
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(15,23,42,0.70)',
                  borderColor: file.status === 'completed'
                    ? 'rgba(16,185,129,0.3)'
                    : file.status === 'error'
                    ? 'rgba(239,68,68,0.3)'
                    : 'rgba(51,65,85,0.5)',
                }}
              >
                {/* Progress background fill */}
                <div
                  className="absolute inset-0 bg-neon-cyan/5 transition-all duration-500 ease-out"
                  style={{ width: `${file.progress}%` }}
                />

                {/* File type icon */}
                <div className={cn(
                  "p-2 rounded-lg border flex-shrink-0 z-10",
                  file.status === 'completed' ? "bg-neon-emerald/10 border-neon-emerald/30 text-neon-emerald" :
                  file.status === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                  "bg-slate-900 border-slate-700 text-slate-400"
                )}>
                  {file.status === 'completed'
                    ? <CheckCircle2 className="w-4 h-4" />
                    : file.status === 'error'
                    ? <AlertTriangle className="w-4 h-4" />
                    : file.type === 'pdf'
                    ? <FileText className="w-4 h-4" />
                    : <ImageIcon className="w-4 h-4" />
                  }
                </div>

                {/* File name + progress */}
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[10px] font-black text-slate-200 truncate tracking-tight">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          file.status === 'error' ? "bg-red-500" :
                          file.status === 'completed' ? "bg-neon-emerald" :
                          "bg-neon-cyan"
                        )}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 w-8 text-right">
                      {file.status === 'completed' ? '✓' : file.status === 'error' ? '✗' : `${file.progress}%`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
