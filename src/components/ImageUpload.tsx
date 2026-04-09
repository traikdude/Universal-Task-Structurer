import React, { useCallback, useState } from 'react';
import { Image as ImageIcon, X, UploadCloud } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploadProps {
  onImageSelect: (base64: string, mimeType: string) => void;
  onImageRemove: () => void;
  currentImage: string | null;
}

export function ImageUpload({ onImageSelect, onImageRemove, currentImage }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelect(result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  if (currentImage) {
    return (
      <div className="relative inline-block mt-3">
        <img src={currentImage} alt="Uploaded preview" className="h-24 w-auto rounded-lg border border-gray-200 shadow-sm object-cover" />
        <button
          onClick={onImageRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragging ? "border-teal-500 bg-teal-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        )}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className={cn("w-6 h-6 mb-2", isDragging ? "text-teal-500" : "text-gray-400")} />
          <p className="text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
        </div>
        <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp, image/heic" onChange={handleFileInput} />
      </label>
      <div className="flex gap-4 mt-2 text-xs text-gray-400 justify-center">
        <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Whiteboard photos</span>
        <span>·</span>
        <span>🧾 Receipts</span>
        <span>·</span>
        <span>📝 Handwritten notes</span>
      </div>
    </div>
  );
}
