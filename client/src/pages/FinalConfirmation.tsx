import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Home, ArrowRight, MapPin, User, Phone, Mail, Camera, Clock, Award, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { StagingRequest } from "@shared/schema";

export default function FinalConfirmation() {
  const [, setLocation] = useLocation();
  const [stagingRequestId, setStagingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('request');
    
    if (!requestId) {
      setLocation('/');
      return;
    }
    
    setStagingRequestId(requestId);
  }, []);

  const { data: stagingRequest, isLoading, error } = useQuery({
    queryKey: ['/api/staging-requests', stagingRequestId],
    enabled: !!stagingRequestId,
    queryFn: async () => {
      if (!stagingRequestId) return null;
      
      const response = await fetch(`/api/staging-requests/${stagingRequestId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch staging request details');
      }
      
      const result = await response.json();
      return result.data as StagingRequest;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">Loading Order Details...</h1>
          <p className="text-muted-foreground">Please wait while we retrieve your order information.</p>
        </div>
      </div>
    );
  }

  if (error || !stagingRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the order details you're looking for.</p>
          <Button onClick={() => setLocation('/')} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Clock,
      title: "24-48 Hour Delivery",
      description: "Your staged photos will be ready within 1-2 business days"
    },
    {
      icon: Award,
      title: "Professional Quality",
      description: "Photorealistic staging that looks like real furniture"
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "Our team is here to help with any questions"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-950/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold mb-4 text-green-600" data-testid="text-confirmation-title">
            Order Complete!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Thank you for your order! We've received all your information and photos. 
            Our professional team will start working on your virtual staging right away.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Order ID</h4>
                    <p className="font-mono text-sm" data-testid="text-order-id">{stagingRequest.id}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Plan</h4>
                    <p className="capitalize" data-testid="text-plan-type">
                      {stagingRequest.planType === 'onetime' ? 'One-time' : 'Subscription'} - {stagingRequest.photosPurchased} photos
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Property Type</h4>
                    <p className="capitalize" data-testid="text-property-type">
                      {stagingRequest.propertyType.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Rooms to Stage</h4>
                    <p data-testid="text-rooms">{stagingRequest.rooms} room{stagingRequest.rooms !== '1' ? 's' : ''}</p>
                  </div>
                </div>

                {stagingRequest.propertyImages && stagingRequest.propertyImages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Uploaded Photos ({stagingRequest.propertyImages.length})
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {stagingRequest.propertyImages.map((url, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={url} 
                            alt={`Property photo ${index + 1}`}
                            className="w-full h-full object-cover"
                            data-testid={`img-property-${index}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact & Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-primary" />
                  <span>Contact & Property Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h4 className="font-medium mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-contact-name">{stagingRequest.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-contact-email">{stagingRequest.email}</span>
                    </div>
                    {stagingRequest.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span data-testid="text-contact-phone">{stagingRequest.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Address */}
                <div>
                  <h4 className="font-medium mb-3">Property Address</h4>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div data-testid="text-property-address">
                      <p>{stagingRequest.addressLine1}</p>
                      {stagingRequest.addressLine2 && <p>{stagingRequest.addressLine2}</p>}
                      <p>{stagingRequest.city}, {stagingRequest.state} {stagingRequest.postalCode}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                {stagingRequest.message && (
                  <div>
                    <h4 className="font-medium mb-3">Additional Notes</h4>
                    <p className="text-muted-foreground" data-testid="text-message">{stagingRequest.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* What's Next */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What Happens Next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-950/20 rounded-full flex items-center justify-center mt-0.5">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Order Received</p>
                        <p className="text-xs text-muted-foreground">Your payment and information have been processed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                        <Camera className="w-3 h-3 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Professional Staging</p>
                        <p className="text-xs text-muted-foreground">Our team will create stunning staged photos</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center mt-0.5">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Delivery</p>
                        <p className="text-xs text-muted-foreground">You'll receive your photos via email within 24 hrs or less</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      <strong>Estimated delivery:</strong><br />
                      {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Why Choose ClickStage Pro?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Our support team is here to help with any questions about your order.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">(864) 400-0766</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">support@clickstagepro.com</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-12">
          <Button 
            onClick={() => setLocation('/')}
            variant="outline"
            data-testid="button-back-home"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <Button 
            onClick={() => setLocation('/pricing')}
            data-testid="button-order-again"
          >
            Order More Staging
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Confirmation Email Notice */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            A confirmation email with these details has been sent to <span className="font-medium">{stagingRequest.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}