import { useRef, useState } from 'react';
import { Upload, X, FileText, File } from 'lucide-react';
import { Button } from './ui/Button';

export default function FileUploadButton({ onFileSelect, disabled, uploading, progress }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleClear = () => {
    setSelectedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return <Upload className="h-4 w-4" />;
    if (fileName.endsWith('.pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!selectedFileName ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${dragActive ? 'border-flight-blue bg-flight-blue/5' : 'border-gray-300 hover:border-flight-blue'}
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={!disabled && !uploading ? handleClick : undefined}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-1">
            Clique ou arraste um arquivo
          </p>
          <p className="text-xs text-gray-500">
            PDF, CSV ou Excel (máx. 10MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
          {getFileIcon(selectedFileName)}
          <span className="text-sm text-gray-700 flex-1 truncate">
            {selectedFileName}
          </span>
          {!uploading && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {uploading && progress > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-end text-xs text-gray-600 mb-1">
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-flight-blue h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

