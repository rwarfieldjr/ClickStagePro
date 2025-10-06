import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { R2Uploader } from "@/components/R2Uploader";
import { Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
// Generate a unique staging request ID
const generateStagingId = () => {
  return 'staging_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export default function UploadPhotos() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [submissionId] = useState(() => generateStagingId());
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const handleUploadComplete = (files: any[]) => {
    setUploadedFiles(files);
    if (files.length > 0) {
      toast({
        title: "Upload Session Complete",
        description: `${files.length} photo(s) ready for staging.`,
      });
    }
  };


  return (
    <>
      <Helmet>
        <title>Upload Photos for Staging - ClickStage Pro</title>
        <meta name="description" content="Upload property photos for professional virtual staging by ClickStage Pro." />
      </Helmet>
      
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-center mb-6 underline">Upload Photos for Staging</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your property photos and transform them with our professional AI-powered virtual staging service.
            </p>
            {user && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Uploading as:</span>
                <Badge variant="secondary" data-testid="badge-user-email">{user.email}</Badge>
              </div>
            )}
            {!user && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Anonymous upload session</span>
              </div>
            )}
          </div>

          {/* R2 Upload Interface */}
          <R2Uploader 
            submissionId={submissionId} 
            onUploadComplete={handleUploadComplete}
          />

          {/* Upload Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Upload Guidelines</CardTitle>
              <CardDescription>
                For best staging results, please follow these guidelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-600">✓ Recommended</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• High-resolution photos (at least 1920x1080)</li>
                    <li>• Well-lit rooms with natural lighting</li>
                    <li>• Wide-angle shots showing entire rooms</li>
                    <li>• Clean, uncluttered spaces</li>
                    <li>• JPEG, PNG, or WebP formats</li>
                    <li>• File size under 10MB each</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-red-600">✗ Avoid</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Blurry or out-of-focus images</li>
                    <li>• Dark or poorly lit photos</li>
                    <li>• Extreme wide-angle distortion</li>
                    <li>• Photos with people or pets</li>
                    <li>• Heavily cluttered spaces</li>
                    <li>• Low-resolution images</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Files Summary */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Photos ({uploadedFiles.length})</CardTitle>
                <CardDescription>
                  Your photos have been uploaded and are ready for staging
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}