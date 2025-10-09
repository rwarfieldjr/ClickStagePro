import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, CheckCircle, AlertCircle, Download, X } from 'lucide-react';

// File validation constants
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  key: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface R2UploaderProps {
  submissionId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
}

export function R2Uploader({ submissionId, onUploadComplete }: R2UploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return 'Only JPG, PNG, WebP, and GIF files are allowed.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }
    return null;
  };

  const updateFileProgress = (id: string, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const uploadFileToSupabase = async (file: File): Promise<void> => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add file to state
    const uploadFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      key: '',
      status: 'uploading',
      progress: 0
    };

    setFiles(prev => [...prev, uploadFile]);

    try {
      // Step 1: Get upload info
      updateFileProgress(fileId, { progress: 10 });
      const uploadUrlResponse = await fetch('/api/r2/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          filename: file.name,
          mime: file.type,
          fileSize: file.size
        })
      });

      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.json();
        throw new Error(error.error || 'Failed to get upload info');
      }

      const { uploadUrl, key, contentType } = await uploadUrlResponse.json();
      updateFileProgress(fileId, { key, progress: 20 });

      // Step 2: Convert file to base64 and upload to Supabase Storage
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round(20 + (e.loaded / e.total) * 30); // 20-50%
            updateFileProgress(fileId, { progress });
          }
        };

        reader.onload = async () => {
          try {
            updateFileProgress(fileId, { progress: 50 });
            
            const base64 = (reader.result as string).split(',')[1];
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                key, 
                file: base64, 
                mime: contentType 
              })
            });

            if (!uploadResponse.ok) {
              throw new Error('Upload failed');
            }

            updateFileProgress(fileId, { 
              status: 'completed', 
              progress: 100 
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
      });

    } catch (error: any) {
      updateFileProgress(fileId, { 
        status: 'error', 
        progress: 0,
        error: error.message 
      });
      throw error;
    }
  };

  const handleFiles = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    // Check total file count
    if (files.length + fileArray.length > MAX_FILES) {
      toast({
        title: 'Too Many Files',
        description: `You can upload a maximum of ${MAX_FILES} files at once.`,
        variant: 'destructive'
      });
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: 'Invalid File',
          description: `${file.name}: ${error}`,
          variant: 'destructive'
        });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // Upload files sequentially to avoid overwhelming the server
    for (const file of validFiles) {
      try {
        await uploadFileToSupabase(file);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Upload error:', error);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast({
        title: 'Upload Complete',
        description: `${successCount} file(s) uploaded successfully.`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: 'Upload Errors',
        description: `${errorCount} file(s) failed to upload.`,
        variant: 'destructive'
      });
    }

    // Notify parent component
    onUploadComplete?.(files.filter(f => f.status === 'completed'));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const testDownloadUrl = async (file: UploadedFile) => {
    try {
      const response = await fetch('/api/r2/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: file.key,
          asFilename: file.name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const { url } = await response.json();
      
      // Show the URL (for testing purposes)
      toast({
        title: 'Download URL Generated',
        description: 'Check browser console for the URL (testing only)',
      });
      
      // Log URL to console (for testing, don't show in production)
      console.log('Download URL (expires in 15 minutes):', url);
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const completedFiles = files.filter(f => f.status === 'completed');
  const uploadingFiles = files.filter(f => f.status === 'uploading');
  const errorFiles = files.filter(f => f.status === 'error');

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Upload Property Photos</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Drag & drop up to {MAX_FILES} images or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports JPG, PNG, WebP, GIF • Max {MAX_FILE_SIZE / 1024 / 1024}MB per file
              </p>
            </div>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-select-files"
            >
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileInput}
              className="hidden"
              data-testid="input-file-upload"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">
              Upload Progress ({files.length} files)
            </CardTitle>
            {!isUploading && files.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFiles}
                data-testid="button-clear-files"
              >
                Clear All
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <File className="w-4 h-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                        {file.key && <span> • Key: {file.key.split('/').pop()}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testDownloadUrl(file)}
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Get Link
                        </Button>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </>
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    {file.status !== 'uploading' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(file.id)}
                        data-testid={`button-remove-${file.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-2" />
                )}
                
                {file.status === 'error' && file.error && (
                  <p className="text-xs text-red-600">{file.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {files.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="default">{completedFiles.length} Completed</Badge>
          </div>
          {uploadingFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{uploadingFiles.length} Uploading</Badge>
            </div>
          )}
          {errorFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{errorFiles.length} Failed</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}