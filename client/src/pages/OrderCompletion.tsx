import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { orderCompletionSchema } from "@shared/schema"
import { z } from "zod"
import { CheckCircle, Upload, AlertCircle, ArrowRight, MapPin, User, Phone, Mail, Home } from "lucide-react"
import { DragDropUploader } from "@/components/DragDropUploader"
import type { UploadResult } from "@uppy/core"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from "@tanstack/react-query"

type OrderCompletionValues = z.infer<typeof orderCompletionSchema>

export default function OrderCompletion() {
  const [, setLocation] = useLocation();
  const { toast } = useToast()
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [stagingRequestId, setStagingRequestId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [showUploader, setShowUploader] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const form = useForm<OrderCompletionValues>({
    resolver: zodResolver(orderCompletionSchema),
    defaultValues: {
      paymentIntentId: "",
      name: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      propertyType: undefined,
      rooms: undefined,
      message: "",
    },
  })

  // Extract payment intent from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    
    if (!paymentIntent) {
      toast({
        title: "Missing Payment Information",
        description: "Please complete your payment first before accessing this page.",
        variant: "destructive",
      });
      setLocation('/pricing');
      return;
    }
    
    setPaymentIntentId(paymentIntent);
    form.setValue('paymentIntentId', paymentIntent);
  }, []);

  const orderCompletionMutation = useMutation({
    mutationFn: async (data: OrderCompletionValues) => {
      const response = await fetch("/api/order-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to complete order");
      }
      
      return response.json();
    },
    onSuccess: (response) => {
      setStagingRequestId(response.data?.id);
      setShowUploader(true);
      toast({
        title: "Contact Information Saved!",
        description: "Now please upload your property photos to complete your order.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Completion Failed",
        description: error.message || "There was an error completing your order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrderCompletionValues) => {
    orderCompletionMutation.mutate(data);
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && stagingRequestId && !isUploading) {
      setIsUploading(true);
      
      const newImageUrls = result.successful.map(file => file.uploadURL).filter((url): url is string => Boolean(url));
      
      try {
        // Combine new images with existing ones
        const allImageUrls = [...uploadedImages, ...newImageUrls];
        
        const response = await fetch(`/api/staging-requests/${stagingRequestId}/images`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyImages: allImageUrls,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save uploaded images");
        }

        setUploadedImages(allImageUrls);
        toast({
          title: "Photos Uploaded Successfully!",
          description: `${newImageUrls.length} photo${newImageUrls.length !== 1 ? 's' : ''} added to your order.`,
        });
        
        // Navigate to final confirmation after successful upload
        if (allImageUrls.length > 0) {
          setTimeout(() => {
            setLocation(`/order-complete?request=${stagingRequestId}`);
          }, 1500);
        }
        
      } catch (error) {
        console.error("Error saving uploaded images:", error);
        toast({
          title: "Upload Error",
          description: "Photos were uploaded but couldn't be saved to your order. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!paymentIntentId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Loading Order Information...</h1>
          <p className="text-muted-foreground">Please wait while we verify your payment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Progress Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
              <span className="text-sm text-green-600 font-medium">Payment Complete</span>
            </div>
            <div className="w-12 h-0.5 bg-muted"></div>
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center ${showUploader ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                <User className="w-3 h-3" />
              </div>
              <span className={`text-sm font-medium ${showUploader ? 'text-green-600' : 'text-primary'}`}>Contact Info</span>
            </div>
            <div className="w-12 h-0.5 bg-muted"></div>
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center ${showUploader ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Upload className="w-3 h-3" />
              </div>
              <span className={`text-sm font-medium ${showUploader ? 'text-primary' : 'text-muted-foreground'}`}>Upload Photos</span>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold mb-4" data-testid="text-order-completion-title">
            Complete Your Order
          </h1>
          <p className="text-lg text-muted-foreground">
            {!showUploader ? 
              "Please provide your contact and property information to complete your virtual staging order." :
              "Now upload your property photos to finish your order!"
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {!showUploader ? (
              /* Contact Information Form */
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Contact & Property Information</CardTitle>
                  <CardDescription>
                    Tell us about yourself and the property you want to stage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Contact Information Section */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <User className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg">Contact Information</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Smith" {...field} data-testid="input-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="john@example.com" 
                                  {...field} 
                                  data-testid="input-email" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Address Section */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <MapPin className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg">Property Address</h3>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="addressLine1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address *</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Main Street" {...field} data-testid="input-address1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="addressLine2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Apartment/Unit (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Apt 4B, Unit 2, etc." {...field} data-testid="input-address2" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City *</FormLabel>
                                <FormControl>
                                  <Input placeholder="San Francisco" {...field} data-testid="input-city" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State *</FormLabel>
                                <FormControl>
                                  <Input placeholder="CA" {...field} data-testid="input-state" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ZIP Code *</FormLabel>
                                <FormControl>
                                  <Input placeholder="94107" {...field} data-testid="input-postal" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Property Details Section */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <Home className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg">Property Details</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="propertyType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Property Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} data-testid="select-property-type">
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select property type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="residential">Residential Home</SelectItem>
                                    <SelectItem value="condo">Condo</SelectItem>
                                    <SelectItem value="townhouse">Townhouse</SelectItem>
                                    <SelectItem value="single_family">Single Family Home</SelectItem>
                                    <SelectItem value="commercial">Commercial Property</SelectItem>
                                    <SelectItem value="vacation_rental">Vacation Rental</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="rooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Rooms to Stage *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} data-testid="select-rooms">
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select number" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1">1 Room</SelectItem>
                                    <SelectItem value="2">2 Rooms</SelectItem>
                                    <SelectItem value="3">3 Rooms</SelectItem>
                                    <SelectItem value="4">4 Rooms</SelectItem>
                                    <SelectItem value="5">5 Rooms</SelectItem>
                                    <SelectItem value="6+">6+ Rooms</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us about your styling preferences, target demographic, or any special requirements..."
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                  data-testid="textarea-message"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={orderCompletionMutation.isPending}
                        data-testid="button-save-info"
                      >
                        {orderCompletionMutation.isPending ? "Saving..." : "Save Information & Continue"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              /* Photo Upload Section */
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Upload Property Photos</CardTitle>
                  <CardDescription>
                    Upload clear, well-lit photos of the rooms you want staged. Multiple angles per room work best!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {stagingRequestId && (
                      <DragDropUploader
                        maxNumberOfFiles={20}
                        maxFileSize={10485760}
                        stagingRequestId={stagingRequestId}
                        onComplete={handleUploadComplete}
                        className="mb-6"
                      />
                    )}
                    
                    {uploadedImages.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Uploaded Photos ({uploadedImages.length})</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {uploadedImages.map((url, index) => (
                            <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                              <img 
                                src={url} 
                                alt={`Uploaded property photo ${index + 1}`}
                                className="w-full h-full object-cover"
                                data-testid={`img-uploaded-${index}`}
                              />
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <span className="text-green-800 dark:text-green-200 font-medium">
                              Photos uploaded successfully! Redirecting to confirmation...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">What Happens Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Payment processed successfully</span>
                  </div>
                  <div className={`flex items-start space-x-3 ${!showUploader ? 'text-muted-foreground' : ''}`}>
                    <div className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ${showUploader ? 'bg-green-500' : 'bg-muted'}`}></div>
                    <span>Contact information saved</span>
                  </div>
                  <div className={`flex items-start space-x-3 ${uploadedImages.length === 0 ? 'text-muted-foreground' : ''}`}>
                    <div className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ${uploadedImages.length > 0 ? 'bg-green-500' : 'bg-muted'}`}></div>
                    <span>Property photos uploaded</span>
                  </div>
                  <div className="flex items-start space-x-3 text-muted-foreground">
                    <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 bg-muted"></div>
                    <span>Professional staging within 24 hrs or less</span>
                  </div>
                  <div className="flex items-start space-x-3 text-muted-foreground">
                    <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 bg-muted"></div>
                    <span>High-resolution photos delivered</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2 mb-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Need help?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Call our support team at{" "}
                    <span className="text-foreground font-medium">(864) 400-0766</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}