import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, X, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'pdf';
  status: 'pending' | 'processing' | 'done' | 'error';
}

interface MultiFileUploadProps {
  onTextExtracted: (text: string, filename: string) => void;
}

export function MultiFileUpload({ onTextExtracted }: MultiFileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const extractTextFromImage = async (file: File): Promise<string> => {
    const result = await Tesseract.recognize(file, 'eng');
    return result.data.text;
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const processFile = async (uploadedFile: UploadedFile) => {
    try {
      let text = '';
      if (uploadedFile.type === 'image') {
        text = await extractTextFromImage(uploadedFile.file);
      } else if (uploadedFile.type === 'pdf') {
        text = await extractTextFromPDF(uploadedFile.file);
      }

      if (text.trim()) {
        const formattedText = `\n\n=== FROM ${uploadedFile.file.name} ===\n${text.trim()}\n=== END ===\n`;
        onTextExtracted(formattedText, uploadedFile.file.name);
      }

      setFiles(prev => prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'done' } : f));
    } catch (error) {
      console.error("Error processing file:", error);
      setFiles(prev => prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'error' } : f));
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const isPdf = file.type === 'application/pdf';
      return {
        id: Math.random().toString(36).substring(7),
        file,
        preview: isPdf ? '' : URL.createObjectURL(file),
        type: isPdf ? 'pdf' : 'image',
        status: 'pending'
      } as UploadedFile;
    });

    setFiles(prev => {
      const combined = [...prev, ...newFiles].slice(0, 10); // Max 10 files
      
      // Process new files that were added
      const addedFiles = combined.filter(f => newFiles.some(nf => nf.id === f.id));
      addedFiles.forEach(f => {
        setFiles(current => current.map(cf => cf.id === f.id ? { ...cf, status: 'processing' } : cf));
        processFile(f);
      });
      
      return combined;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 10
  });

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  return (
    <div className="mt-4">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {files.map(file => (
            <div key={file.id} className="relative group w-20 h-20 rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-gray-50 flex items-center justify-center">
              {file.type === 'image' ? (
                <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-8 h-8 text-red-500" />
              )}
              
              {file.status === 'processing' && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              )}
              
              {file.status === 'error' && (
                <div className="absolute inset-0 bg-red-100/80 flex items-center justify-center">
                  <span className="text-xs font-bold text-red-600 text-center px-1">Error</span>
                </div>
              )}

              <button
                onClick={() => removeFile(file.id)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < 10 && (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className={cn("w-6 h-6 mb-2", isDragActive ? "text-blue-500" : "text-gray-400")} />
            <p className="text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop (Max 10)
            </p>
          </div>
          <input {...getInputProps()} />
        </div>
      )}
      
      <div className="flex gap-4 mt-2 text-xs text-gray-400 justify-center">
        <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Images</span>
        <span>·</span>
        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDFs</span>
        <span>·</span>
        <span>OCR Auto-Extract</span>
      </div>
    </div>
  );
}
