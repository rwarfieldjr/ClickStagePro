import { useState, useRef, useEffect } from "react";
import Uppy from "@uppy/core";
import DragDrop from "@uppy/drag-drop";
import ProgressBar from "@uppy/progress-bar";
import "@uppy/core/dist/style.min.css";
import "@uppy/drag-drop/dist/style.min.css";
import "@uppy/progress-bar/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";

interface DragDropUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  stagingRequestId: string;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  className?: string;
}

export function DragDropUploader({
  maxNumberOfFiles = 10,
  maxFileSize = 10485760,
  stagingRequestId,
  onComplete,
  className = "",
}: DragDropUploaderProps) {
  const dragDropRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      },
      autoProceed: true,
    });

    uppyInstance.use(AwsS3, {
      shouldUseMultipart: false,
      getUploadParameters: async (file) => {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stagingRequestId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get upload parameters");
        }
        
        const data = await response.json();
        return {
          method: data.method,
          url: data.url,
        };
      },
    });

    uppyInstance.on("complete", (result) => {
      // Only trigger callback if there are successful uploads
      if (result.successful && result.successful.length > 0) {
        onComplete?.(result);
      }
    });

    return uppyInstance;
  });

  useEffect(() => {
    const addPlugins = () => {
      if (!dragDropRef.current || !progressRef.current) {
        return;
      }

      try {
        // Add DragDrop plugin
        uppy.use(DragDrop, {
          target: dragDropRef.current,
          width: "100%",
          height: "200px",
          note: "Drag and drop your property photos here, or click to browse",
        });

        // Add ProgressBar plugin
        uppy.use(ProgressBar, {
          target: progressRef.current,
          hideAfterFinish: false,
        });
      } catch (error) {
        console.error("Error adding Uppy plugins:", error);
      }
    };

    // Add plugins immediately if refs are ready
    addPlugins();

    return () => {
      uppy.destroy();
    };
  }, [uppy]);

  return (
    <div className={className}>
      <div 
        ref={dragDropRef} 
        data-testid="drag-drop-upload-area"
        style={{ minHeight: '200px', width: '100%' }}
      />
      <div ref={progressRef} style={{ marginTop: '1rem' }} />
      
      <div className="text-center text-xs text-muted-foreground mt-2">
        Supports JPEG, PNG, WebP files up to 10MB each. Maximum {maxNumberOfFiles} photos.
      </div>
    </div>
  );
}