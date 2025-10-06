import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Download, Archive, Shield, AlertCircle, Users } from 'lucide-react';

interface UploadInfo {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
  key: string;
}

export default function VAUploads() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]);
  const [zipLoading, setZipLoading] = useState(false);

  // Check if user is admin
  const isAdmin = user && ((user as any).isAdmin || (user as any).role === 'admin');

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadUploads();
    }
  }, [isAuthenticated, isAdmin]);

  const loadUploads = async () => {
    try {
      const response = await fetch('/api/r2/list');
      if (response.ok) {
        const data = await response.json();
        setUploads(data.uploads || []);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to load uploads',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Network Error',
        description: 'Failed to connect to server',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUploadSelection = (uploadId: string) => {
    setSelectedUploads(prev => 
      prev.includes(uploadId) 
        ? prev.filter(id => id !== uploadId)
        : [...prev, uploadId]
    );
  };

  const selectAll = () => {
    setSelectedUploads(uploads.map(u => u.id));
  };

  const clearSelection = () => {
    setSelectedUploads([]);
  };

  const downloadZip = async () => {
    if (selectedUploads.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select files to download',
        variant: 'destructive'
      });
      return;
    }

    setZipLoading(true);
    try {
      const selectedKeys = uploads
        .filter(u => selectedUploads.includes(u.id))
        .map(u => u.key);

      const response = await fetch('/api/r2/batch-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: selectedKeys })
      });

      if (response.ok) {
        // Handle ZIP download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uploads-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Download Started',
          description: `ZIP file with ${selectedUploads.length} files is downloading`
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Download Failed',
          description: error.message || 'ZIP creation failed',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download ZIP file',
        variant: 'destructive'
      });
    } finally {
      setZipLoading(false);
    }
  };

  // Auth check
  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>VA Panel - Authentication Required - ClickStage Pro</title>
        </Helmet>
        <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <Card className="p-8">
            <CardContent className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Authentication Required</h3>
                <p className="text-sm text-muted-foreground">
                  Please log in to access the VA panel.
                </p>
              </div>
              <Button onClick={() => window.location.href = '/api/login'} className="w-full">
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Admin check
  if (!isAdmin) {
    return (
      <>
        <Helmet>
          <title>VA Panel - Access Denied - ClickStage Pro</title>
        </Helmet>
        <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <Card className="p-8 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">Access Denied</h3>
                <p className="text-sm text-red-600 dark:text-red-300">
                  This page is only accessible to administrators.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/upload-photos'}
                data-testid="button-back-to-uploads"
              >
                Back to Upload Photos
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>VA Panel - Client Uploads - ClickStage Pro</title>
        <meta name="description" content="Administrative panel for managing client photo uploads." />
      </Helmet>
      
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">VA Upload Management</h1>
              <p className="text-muted-foreground">
                Manage and download client photo uploads
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                Admin Panel
              </Badge>
            </div>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Management</CardTitle>
              <CardDescription>
                Select files to download or manage client uploads (last 100 shown)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={uploads.length === 0}
                  data-testid="button-select-all"
                >
                  Select All ({uploads.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedUploads.length === 0}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
                <div className="text-sm text-muted-foreground">
                  {selectedUploads.length} of {uploads.length} selected
                </div>
                <div className="ml-auto">
                  <Button
                    onClick={downloadZip}
                    disabled={selectedUploads.length === 0 || zipLoading}
                    data-testid="button-download-zip"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {zipLoading ? 'Creating ZIP...' : `Download ZIP (${selectedUploads.length})`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload List */}
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-pulse">Loading uploads...</div>
              </CardContent>
            </Card>
          ) : uploads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Download className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No Uploads Found</h3>
                <p className="text-sm text-muted-foreground">
                  Client uploads will appear here once photos are uploaded.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads ({uploads.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                        selectedUploads.includes(upload.id) ? 'bg-primary/10 border-primary' : ''
                      }`}
                      onClick={() => toggleUploadSelection(upload.id)}
                      data-testid={`upload-item-${upload.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUploads.includes(upload.id)}
                        onChange={() => toggleUploadSelection(upload.id)}
                        className="rounded"
                        data-testid={`checkbox-${upload.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{upload.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {(upload.size / 1024 / 1024).toFixed(2)} MB • 
                          {' '}Uploaded {new Date(upload.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {upload.key.split('/').pop()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>
                  This panel is only accessible to administrators. 
                  Files are stored securely and expire according to retention policies.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}