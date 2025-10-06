import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Image as ImageIcon, 
  Download,
  MessageSquare,
  Plus,
  FileText,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  Home,
  Eye,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface Project {
  id: string;
  paymentIntentId?: string;
  planId: string;
  planType: string;
  photosPurchased: number;
  name: string;
  email: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  propertyType: string;
  rooms: string;
  message?: string;
  propertyImages: string[];
  createdAt: string;
}

interface Asset {
  id: string;
  projectId: string;
  userId: string;
  kind: 'original' | 'staged' | 'revision_ref';
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  processingStatus: string;
}

interface Revision {
  id: string;
  projectId: string;
  originalAssetId: string;
  stagedAssetId?: string;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
}

interface ExtraPhotoRequest {
  id: string;
  projectId: string;
  photoCount: number;
  status: 'pending' | 'paid' | 'completed';
  paymentIntentId?: string;
  createdAt: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [selectedAssetForRevision, setSelectedAssetForRevision] = useState<string>("");
  const [extraPhotoCount, setExtraPhotoCount] = useState(1);
  const [isExtraPhotoDialogOpen, setIsExtraPhotoDialogOpen] = useState(false);

  // Fetch project details
  const { data: projectResponse, isLoading: projectLoading } = useQuery<{
    success: boolean;
    data: Project;
  }>({
    queryKey: ['/api/projects', id],
    enabled: !!id,
    retry: 1
  });

  // Fetch project assets
  const { data: assetsResponse, isLoading: assetsLoading } = useQuery<{
    success: boolean;
    data: Asset[];
  }>({
    queryKey: ['/api/projects', id, 'assets'],
    enabled: !!id,
    retry: 1
  });

  // Fetch revisions
  const { data: revisionsResponse, isLoading: revisionsLoading } = useQuery<{
    success: boolean;
    data: Revision[];
  }>({
    queryKey: ['/api/projects', id, 'revisions'],
    enabled: !!id,
    retry: 1
  });

  // Fetch extra photo requests
  const { data: extrasResponse } = useQuery<{
    success: boolean;
    data: ExtraPhotoRequest[];
  }>({
    queryKey: ['/api/projects', id, 'extras'],
    enabled: !!id,
    retry: 1
  });

  const project = projectResponse?.data;
  const assets = assetsResponse?.data || [];
  const revisions = revisionsResponse?.data || [];
  const extras = extrasResponse?.data || [];

  // Organize assets by type
  const originalAssets = assets.filter(asset => asset.kind === 'original');
  const stagedAssets = assets.filter(asset => asset.kind === 'staged');

  // Create revision mutation
  const revisionMutation = useMutation({
    mutationFn: async (data: { originalAssetId: string; notes: string }) => {
      const response = await apiRequest('POST', `/api/projects/${id}/revisions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'revisions'] });
      toast({
        title: "Revision Requested",
        description: "Your revision request has been submitted successfully.",
      });
      setIsRevisionDialogOpen(false);
      setRevisionNotes("");
      setSelectedAssetForRevision("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit revision request.",
        variant: "destructive",
      });
    },
  });

  // Extra photos mutation
  const extraPhotosMutation = useMutation({
    mutationFn: async (photoCount: number) => {
      const response = await apiRequest('POST', `/api/projects/${id}/extras`, { photoCount });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to payment for extra photos
      setLocation(`/checkout?payment_intent=${data.data.paymentIntentId}&type=extras`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process extra photos request.",
        variant: "destructive",
      });
    },
  });

  const handleRevisionSubmit = () => {
    if (!selectedAssetForRevision || !revisionNotes.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a photo and provide revision notes.",
        variant: "destructive",
      });
      return;
    }

    revisionMutation.mutate({
      originalAssetId: selectedAssetForRevision,
      notes: revisionNotes.trim()
    });
  };

  const handleExtraPhotosSubmit = () => {
    if (extraPhotoCount < 1 || extraPhotoCount > 10) {
      toast({
        title: "Invalid Count",
        description: "Please select between 1 and 10 additional photos.",
        variant: "destructive",
      });
      return;
    }

    extraPhotosMutation.mutate(extraPhotoCount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getProgressPercentage = () => {
    const totalAssets = originalAssets.length;
    const processedAssets = stagedAssets.length;
    if (totalAssets === 0) return 0;
    return Math.round((processedAssets / totalAssets) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-muted rounded"></div>
            <div className="h-8 w-64 bg-muted rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/account/projects')} data-testid="button-back-projects">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Project Not Found</h1>
            <p className="text-muted-foreground">The requested project could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/account/projects')} data-testid="button-back-projects">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground" data-testid={`text-project-title-${project.id}`}>
              {project.name}'s Project
            </h1>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <span className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{project.city}, {project.state}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDate(project.createdAt)}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={project.planType === 'onetime' ? 'outline' : 'default'}>
            {project.planType === 'onetime' ? 'One-time' : 'Subscription'}
          </Badge>
          <Badge variant="secondary">{project.photosPurchased} Photos</Badge>
        </div>
      </div>

      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Progress</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stagedAssets.length}/{originalAssets.length}</div>
            <Progress value={getProgressPercentage()} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Photos processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Revisions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revisions.filter(r => r.status === 'pending' || r.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extra Photos</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{extras.length}</div>
            <p className="text-xs text-muted-foreground">
              Additional requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="photos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="photos" data-testid="tab-photos">Photos</TabsTrigger>
          <TabsTrigger value="revisions" data-testid="tab-revisions">Revisions</TabsTrigger>
          <TabsTrigger value="extras" data-testid="tab-extras">Extra Photos</TabsTrigger>
          <TabsTrigger value="details" data-testid="tab-details">Project Details</TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
        </TabsList>

        {/* Photos Tab */}
        <TabsContent value="photos" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Photo Gallery</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-fullscreen-gallery">
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </Button>
            </div>
          </div>

          {originalAssets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Photos Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Photos will appear here once they are uploaded to your project.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {originalAssets.map((originalAsset, index) => {
                const stagedAsset = stagedAssets.find(staged => 
                  staged.fileName.includes(originalAsset.fileName.split('.')[0])
                );

                return (
                  <Card key={originalAsset.id} className="overflow-hidden hover-elevate">
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium truncate">
                          {originalAsset.fileName}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          {stagedAsset ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Processing
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <AspectRatio ratio={16 / 9}>
                        {stagedAsset ? (
                          <BeforeAfterSlider
                            beforeImage={`/api/assets/${originalAsset.id}/download`}
                            afterImage={`/api/assets/${stagedAsset.id}/download`}
                          />
                        ) : (
                          <div className="relative w-full h-full">
                            <img
                              src={`/api/assets/${originalAsset.id}/download`}
                              alt={originalAsset.fileName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="bg-white/90 rounded-lg p-3 text-center">
                                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                                <p className="text-sm font-medium">Processing...</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </AspectRatio>
                    </CardContent>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Uploaded {formatDate(originalAsset.uploadedAt)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedPhotoIndex(index);
                              setIsPhotoModalOpen(true);
                            }}
                            data-testid={`button-view-photo-${originalAsset.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {stagedAsset && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(`/api/assets/${stagedAsset.id}/download`, '_blank')}
                              data-testid={`button-download-photo-${stagedAsset.id}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Revisions Tab */}
        <TabsContent value="revisions" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Revision Requests</h2>
            <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-request-revision">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Request Revision
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Request Photo Revision</DialogTitle>
                  <DialogDescription>
                    Select a photo and describe the changes you'd like to see.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset-select">Select Photo</Label>
                    <select
                      id="asset-select"
                      value={selectedAssetForRevision}
                      onChange={(e) => setSelectedAssetForRevision(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="select-revision-photo"
                    >
                      <option value="">Choose a photo...</option>
                      {stagedAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.fileName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revision-notes">Revision Notes</Label>
                    <Textarea
                      id="revision-notes"
                      placeholder="Describe the changes you'd like to see..."
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      rows={4}
                      data-testid="textarea-revision-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRevisionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRevisionSubmit}
                    disabled={revisionMutation.isPending}
                    data-testid="button-submit-revision"
                  >
                    {revisionMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {revisionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : revisions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Revisions Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Request revisions for your staged photos when you need adjustments.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {revisions.map((revision) => {
                const originalAsset = assets.find(a => a.id === revision.originalAssetId);
                const stagedAsset = revision.stagedAssetId ? assets.find(a => a.id === revision.stagedAssetId) : null;

                return (
                  <Card key={revision.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            Revision for {originalAsset?.fileName || 'Unknown Photo'}
                          </CardTitle>
                          <CardDescription>
                            Requested {formatDate(revision.createdAt)}
                            {revision.resolvedAt && ` • Resolved ${formatDate(revision.resolvedAt)}`}
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusBadgeVariant(revision.status)}>
                          {revision.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    {revision.notes && (
                      <CardContent>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Notes:</Label>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                            {revision.notes}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Extra Photos Tab */}
        <TabsContent value="extras" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Additional Photos</h2>
            <Dialog open={isExtraPhotoDialogOpen} onOpenChange={setIsExtraPhotoDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-request-extra-photos">
                  <Plus className="w-4 h-4 mr-2" />
                  Purchase Extra Photos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Purchase Additional Photos</DialogTitle>
                  <DialogDescription>
                    Add more photos to your current project. Each additional photo costs $7.99.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="photo-count">Number of Photos</Label>
                    <Input
                      id="photo-count"
                      type="number"
                      min="1"
                      max="10"
                      value={extraPhotoCount}
                      onChange={(e) => setExtraPhotoCount(Number(e.target.value))}
                      data-testid="input-extra-photo-count"
                    />
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span>Photos:</span>
                      <span>{extraPhotoCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Price per photo:</span>
                      <span>$7.99</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>${(extraPhotoCount * 7.99).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExtraPhotoDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleExtraPhotosSubmit}
                    disabled={extraPhotosMutation.isPending}
                    data-testid="button-purchase-extra-photos"
                  >
                    {extraPhotosMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Continue to Payment
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {extras.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Plus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Extra Photos</h3>
                <p className="text-muted-foreground mb-4">
                  Purchase additional photos if you need more than your current plan includes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {extras.map((extra) => (
                <Card key={extra.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {extra.photoCount} Additional Photos
                        </CardTitle>
                        <CardDescription>
                          Requested {formatDate(extra.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(extra.status)}>
                          {extra.status}
                        </Badge>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${(extra.photoCount * 7.99).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${7.99} per photo
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Project Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <h2 className="text-xl font-semibold">Project Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{project.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{project.email}</span>
                </div>
                {project.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{project.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Home className="w-5 h-5" />
                  <span>Property Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div>{project.addressLine1}</div>
                    {project.addressLine2 && <div>{project.addressLine2}</div>}
                    <div>{project.city}, {project.state} {project.postalCode}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Property Type: {project.propertyType}</div>
                  <div className="text-sm text-muted-foreground">Rooms: {project.rooms}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {project.message && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.message}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Project Communication</h2>
            <Link href="/account/messages">
              <Button variant="outline" data-testid="button-view-all-messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                View All Messages
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Messages Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                Project-specific messaging will be available here soon. For now, use the main Messages section.
              </p>
              <Link href="/account/messages">
                <Button data-testid="button-go-to-messages">
                  Go to Messages
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}