import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CreditCard, Loader2 } from "lucide-react";
import { useStripe, useElements, PaymentElement, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Initialize Stripe outside of component to avoid recreating
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface SetupIntentResponse {
  success: boolean;
  client_secret: string;
  setup_intent_id: string;
}

// Payment setup form component - must be wrapped with Elements
function PaymentSetupForm({ 
  clientSecret, 
  setupIntentId, 
  onSuccess, 
  onCancel, 
  isProcessing, 
  setIsProcessing 
}: {
  clientSecret: string;
  setupIntentId: string;
  onSuccess: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}) {
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

  // Attach payment method mutation
  const attachPaymentMethodMutation = useMutation({
    mutationFn: async (setupIntentId: string) => {
      const response = await apiRequest('POST', '/api/billing/attach-payment-method', { setup_intent_id: setupIntentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/payment-methods'] });
      toast({
        title: "Payment Method Added",
        description: "Your payment method has been successfully added and saved.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save payment method.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret || !setupIntentId) {
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm the setup intent
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Method Setup Failed",
          description: error.message || "There was an error setting up your payment method.",
          variant: "destructive",
        });
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // Setup intent succeeded, now attach the payment method
        attachPaymentMethodMutation.mutate(setupIntentId);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-md">
        <PaymentElement 
          options={{
            layout: "tabs",
            paymentMethodOrder: ['card']
          }}
        />
      </div>
      
      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-cancel-add-payment"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className="flex-1"
          data-testid="button-save-payment-method"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Save Payment Method
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function PaymentMethodManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create setup intent mutation
  const createSetupIntentMutation = useMutation({
    mutationFn: async (): Promise<SetupIntentResponse> => {
      const response = await fetch('/api/billing/setup-intent', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.client_secret);
      setSetupIntentId(data.setup_intent_id);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment method setup.",
        variant: "destructive",
      });
      setIsDialogOpen(false);
    },
  });


  const handleAddPaymentMethod = async () => {
    setIsDialogOpen(true);
    createSetupIntentMutation.mutate();
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setClientSecret(null);
    setSetupIntentId(null);
    setIsProcessing(false);
  };


  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleAddPaymentMethod} data-testid="button-add-payment-method">
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Add Payment Method</span>
            </DialogTitle>
            <DialogDescription>
              Add a new payment method to your account for faster checkouts.
            </DialogDescription>
          </DialogHeader>

          {createSetupIntentMutation.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Setting up...</span>
            </div>
          ) : clientSecret ? (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe'
                }
              }}
            >
              <PaymentSetupForm
                clientSecret={clientSecret}
                setupIntentId={setupIntentId!}
                onSuccess={handleDialogClose}
                onCancel={handleDialogClose}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </Elements>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}