import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, X, UploadCloud, FileText, Loader2, Zap } from 'lucide-react';
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
    <div className="mt-4 mb-2 space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-500 overflow-hidden",
          isDragActive 
            ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]" 
            : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/40",
          isAnyProcessing && "cursor-default"
        )}
      >
        {/* High-Magic Scanner Animation */}
        <AnimatePresence>
          {files.some(f => f.status === 'processing') && (
            <motion.div 
              initial={{ top: '-10%' }}
              animate={{ top: '110%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <input {...getInputProps()} />
        <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className={cn(
            "p-3 rounded-2xl transition-all duration-500",
            isDragActive ? "bg-neon-cyan text-slate-950 scale-110" : "bg-slate-900 text-slate-500 group-hover:text-neon-cyan group-hover:scale-105 shadow-inner"
          )}>
            {isDragActive ? <Zap className="w-6 h-6 fill-current" /> : <UploadCloud className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">
              {isDragActive ? "Drop to Scan" : "Neural Data Intake"}
            </p>
            <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest">
              Drop Images or PDFs for Intelligent OCR
            </p>
          </div>
        </div>
      </div>

      {/* File Status Grid */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {files.map((file) => (
              <motion.div
                layout
                key={file.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card rounded-xl p-3 flex items-center gap-3 border border-slate-800/50 relative overflow-hidden"
              >
                {/* Progress Background */}
                <div 
                  className="absolute inset-0 bg-neon-cyan/5 transition-all duration-500 ease-out" 
                  style={{ width: `${file.progress}%` }}
                />

                <div className={cn(
                  "p-2 rounded-lg border",
                  file.status === 'completed' ? "bg-neon-emerald/10 border-neon-emerald/30 text-neon-emerald" :
                  file.status === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                  "bg-slate-900 border-slate-800 text-slate-500"
                )}>
                  {file.type === 'pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[10px] font-black text-slate-200 truncate uppercase tracking-tight">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          file.status === 'error' ? "bg-red-500" : "bg-neon-cyan"
                        )}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 w-8 text-right">{file.progress}%</span>
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

      <div className="flex items-center justify-center gap-4 text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] pt-1">
        <span className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Visuals</span>
        <span className="text-slate-800">/</span>
        <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Docs</span>
        <span className="text-slate-800">/</span>
        <span className="text-neon-cyan/40">OCR Intelligence</span>
      </div>
    </div>
  );
}
