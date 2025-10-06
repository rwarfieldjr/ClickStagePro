import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Plus, CheckCircle, Loader2 } from "lucide-react";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  } | null;
  is_default: boolean;
  created: number;
}

interface PlanData {
  id: string;
  type: string;
  name: string;
  price: number;
  photos: number;
}

interface SavedPaymentCheckoutProps {
  planData: PlanData;
  onSuccess: () => void;
}

interface SavedPaymentResponse {
  requires_action?: boolean;
  client_secret?: string;
  payment_intent?: {
    id: string;
    status: string;
  };
}

interface NewCardPaymentResponse {
  clientSecret: string;
}

function SavedPaymentCheckoutForm({ planData, onSuccess }: SavedPaymentCheckoutProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedMethod, setSelectedMethod] = useState<'default' | 'saved' | 'new'>('default');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const stripe = useStripe();
  const elements = useElements();

  // Fetch saved payment methods
  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useQuery<{
    success: boolean;
    payment_methods: PaymentMethod[];
  }>({
    queryKey: ['/api/billing/payment-methods'],
    retry: 1
  });

  // Set default selection when payment methods load
  useEffect(() => {
    if (paymentMethodsData?.payment_methods.length) {
      const defaultMethod = paymentMethodsData.payment_methods.find(pm => pm.is_default);
      if (defaultMethod) {
        setSelectedMethod('default');
        setSelectedPaymentMethodId(defaultMethod.id);
      } else {
        setSelectedMethod('saved');
        setSelectedPaymentMethodId(paymentMethodsData.payment_methods[0].id);
      }
    } else if (paymentMethodsData?.payment_methods.length === 0) {
      setSelectedMethod('new');
      setShowNewCardForm(true);
    }
  }, [paymentMethodsData]);

  // Create payment intent with saved method
  const savedMethodMutation = useMutation<SavedPaymentResponse, Error, { paymentMethodId?: string; useDefault?: boolean }>({
    mutationFn: async ({ paymentMethodId, useDefault }) => {
      const response = await apiRequest('POST', '/api/create-payment-intent-with-saved-method', {
        planId: planData.id,
        planType: planData.type,
        payment_method_id: paymentMethodId,
        use_default: useDefault
      });
      return response.json();
    },
    onSuccess: (response) => {
      if (response.requires_action) {
        // Handle 3D Secure authentication
        setClientSecret(response.client_secret || null);
      } else if (response.payment_intent?.status === 'succeeded') {
        // Payment completed successfully
        toast({
          title: "Payment Successful!",
          description: "Your order has been processed successfully.",
        });
        setLocation(`/order-completion?payment_intent=${response.payment_intent.id}`);
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    },
  });

  // Create regular payment intent for new cards
  const newCardMutation = useMutation<NewCardPaymentResponse, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        planId: planData.id,
        planType: planData.type
      });
      return response.json();
    },
    onSuccess: (response) => {
      setClientSecret(response.clientSecret || null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment.",
        variant: "destructive",
      });
    },
  });

  const handlePaymentMethodChange = (value: string) => {
    if (value === 'new') {
      setSelectedMethod('new');
      setShowNewCardForm(true);
      if (!clientSecret) {
        newCardMutation.mutate();
      }
    } else if (value === 'default') {
      setSelectedMethod('default');
      setShowNewCardForm(false);
      const defaultMethod = paymentMethodsData?.payment_methods.find(pm => pm.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      }
    } else {
      setSelectedMethod('saved');
      setSelectedPaymentMethodId(value);
      setShowNewCardForm(false);
    }
  };

  const handleSavedMethodPayment = async () => {
    setIsProcessing(true);
    
    try {
      if (selectedMethod === 'default') {
        await savedMethodMutation.mutateAsync({ useDefault: true });
      } else if (selectedMethod === 'saved' && selectedPaymentMethodId) {
        await savedMethodMutation.mutateAsync({ paymentMethodId: selectedPaymentMethodId });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewCardPayment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-completion`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "There was an error processing your payment.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful!",
          description: "Your order has been processed successfully.",
        });
        setLocation(`/order-completion?payment_intent=${paymentIntent.id}`);
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handle3DSecure = async () => {
    if (!stripe || !clientSecret) return;

    setIsProcessing(true);

    try {
      // Use confirmCardPayment for saved payment methods requiring authentication
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        // No payment method needed - it's already attached to the PaymentIntent
      });

      if (error) {
        toast({
          title: "Authentication Failed",
          description: error.message || "Payment authentication failed.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful!",
          description: "Your order has been processed successfully.",
        });
        setLocation(`/order-completion?payment_intent=${paymentIntent.id}`);
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
      case 'mastercard':
      case 'amex':
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  // Handle 3D Secure authentication if required
  if (clientSecret && savedMethodMutation.data?.requires_action) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Additional Authentication Required</h3>
          <p className="text-muted-foreground mb-4">
            Your bank requires additional verification to complete this payment.
          </p>
        </div>
        <Button 
          onClick={handle3DSecure}
          disabled={isProcessing}
          className="w-full"
          data-testid="button-authenticate-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Authenticating...
            </>
          ) : (
            'Complete Authentication'
          )}
        </Button>
      </div>
    );
  }

  if (paymentMethodsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading payment methods...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      {paymentMethodsData?.payment_methods.length ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Payment Method</h3>
          
          <RadioGroup
            value={
              selectedMethod === 'default' 
                ? 'default' 
                : selectedMethod === 'new' 
                  ? 'new'
                  : selectedPaymentMethodId
            }
            onValueChange={handlePaymentMethodChange}
            className="space-y-3"
          >
            {/* Default Payment Method */}
            {paymentMethodsData.payment_methods.some(pm => pm.is_default) && (
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover-elevate">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {getBrandIcon(paymentMethodsData.payment_methods.find(pm => pm.is_default)?.card?.brand || '')}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">
                            {paymentMethodsData.payment_methods.find(pm => pm.is_default)?.card?.brand} •••• {paymentMethodsData.payment_methods.find(pm => pm.is_default)?.card?.last4}
                          </span>
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Use your default payment method
                        </p>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            )}
            
            {/* Other Saved Payment Methods */}
            {paymentMethodsData.payment_methods.filter(pm => !pm.is_default).map((method) => (
              <div key={method.id} className="flex items-center space-x-3 p-4 border rounded-lg hover-elevate">
                <RadioGroupItem value={method.id} id={method.id} />
                <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getBrandIcon(method.card?.brand || '')}
                    </span>
                    <div>
                      <div className="font-medium capitalize">
                        {method.card?.brand} •••• {method.card?.last4}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {method.card?.exp_month?.toString().padStart(2, '0')}/{method.card?.exp_year}
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
            
            {/* Add New Payment Method */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover-elevate">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Use a new payment method</div>
                    <p className="text-sm text-muted-foreground">
                      Enter card details for this purchase
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      ) : null}

      <Separator />

      {/* Payment Form */}
      {showNewCardForm && clientSecret ? (
        <form onSubmit={handleNewCardPayment} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Card Details</h3>
            <div className="bg-muted/50 p-4 rounded-md">
              <PaymentElement 
                options={{
                  layout: "tabs",
                  paymentMethodOrder: ['card']
                }}
              />
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={isProcessing || !stripe || !elements}
            className="w-full"
            data-testid="button-pay-with-new-card"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ${planData.price}
              </>
            )}
          </Button>
        </form>
      ) : selectedMethod !== 'new' && paymentMethodsData?.payment_methods.length ? (
        <Button
          onClick={handleSavedMethodPayment}
          disabled={isProcessing}
          className="w-full"
          data-testid="button-pay-with-saved-method"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ${planData.price}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

export function SavedPaymentCheckout({ planData, onSuccess }: SavedPaymentCheckoutProps) {
  return (
    <Elements stripe={stripePromise}>
      <SavedPaymentCheckoutForm planData={planData} onSuccess={onSuccess} />
    </Elements>
  );
}