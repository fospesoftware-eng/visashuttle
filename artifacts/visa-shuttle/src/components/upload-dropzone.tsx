import { useCallback, useState } from "react";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "success" | "error";
  progress: number;
}

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}

export function UploadDropzone({ 
  onUpload, 
  accept = "*", 
  maxSize = 10 * 1024 * 1024,
  multiple = true,
  className = "" 
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(f => f.size <= maxSize);
    const uploadedFiles: UploadedFile[] = validFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      size: f.size,
      status: "uploading" as const,
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...uploadedFiles]);
    
    uploadedFiles.forEach((file, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress: 100, status: "success" as const } : f
          ));
        } else {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress } : f
          ));
        }
      }, 200);
    });

    onUpload(validFiles);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className={className} data-testid="upload-dropzone">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          }
        `}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          data-testid="input-file-upload"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">Drop files here or click to upload</p>
            <p className="text-sm text-muted-foreground mt-1">
              Max file size: {formatSize(maxSize)}
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2" data-testid="upload-file-list">
          {files.map(file => (
            <div 
              key={file.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              data-testid={`upload-file-${file.id}`}
            >
              <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                {file.status === "uploading" && (
                  <Progress value={file.progress} className="h-1 mt-1" />
                )}
              </div>
              {file.status === "success" && (
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              )}
              {file.status === "error" && (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file.id)}
                className="flex-shrink-0"
                data-testid={`button-remove-file-${file.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
