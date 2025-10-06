import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard } from "lucide-react";

// Stripe promise will be loaded dynamically from server
let stripePromise: Promise<Stripe | null> | null = null;

const getStripePromise = async () => {
  if (!stripePromise) {
    const { publishableKey } = await fetch('/api/billing/public-key').then(r => r.json());
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Note: Pricing is now handled server-side for security

const CheckoutForm = ({ planData }: { planData: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase!",
      });
      setLocation('/payment-success');
    }
    setIsProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg">
        <PaymentElement />
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-complete-payment"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        {isProcessing ? 'Processing...' : `Pay $${planData.price}`}
      </Button>
    </form>
  );
};

// Bundle pricing data - maps bundle keys to display info
const BUNDLE_INFO: Record<string, { name: string; price: number; credits: number }> = {
  'pack-1': { name: '1 Credit Pack', price: 10, credits: 1 },
  'pack-5': { name: '5 Credits Pack', price: 45, credits: 5 },
  'pack-10': { name: '10 Credits Pack', price: 85, credits: 10 },
  'pack-20': { name: '20 Credits Pack', price: 160, credits: 20 },
  'pack-50': { name: '50 Credits Pack', price: 375, credits: 50 },
  'pack-100': { name: '100 Credits Pack', price: 700, credits: 100 },
};

// Map bundle IDs to Stripe price ID env var names
const BUNDLE_TO_PRICE_KEY: Record<string, string> = {
  'pack-1': 'PRICE_SINGLE',
  'pack-5': 'PRICE_5',
  'pack-10': 'PRICE_10',
  'pack-20': 'PRICE_20',
  'pack-50': 'PRICE_50',
  'pack-100': 'PRICE_100',
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [bundleInfo, setBundleInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Load Stripe instance first
    getStripePromise().then(setStripe);

    // Get bundle details from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');

    if (!plan || !BUNDLE_INFO[plan]) {
      setLocation('/pricing');
      return;
    }

    const bundle = BUNDLE_INFO[plan];
    const priceKey = BUNDLE_TO_PRICE_KEY[plan];
    
    // Create PaymentIntent for the selected bundle
    apiRequest("POST", "/api/billing/create-intent", { 
      bundleKey: priceKey
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setClientSecret(data.clientSecret);
          setBundleInfo(bundle);
          setLoading(false);
        } else {
          console.error('Payment setup error:', data.message);
          setLocation('/pricing');
        }
      })
      .catch((error) => {
        console.error('Payment setup error:', error);
        setLocation('/pricing');
      });
  }, [setLocation]);

  if (loading || !clientSecret || !bundleInfo || !stripe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/pricing')}
          className="mb-6"
          data-testid="button-back-to-pricing"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pricing
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Complete Your Purchase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="flex justify-between items-center mb-2">
                <span>{bundleInfo.name}</span>
                <span className="font-semibold">${bundleInfo.price}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {bundleInfo.credits} credit{bundleInfo.credits !== 1 ? 's' : ''}
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>${bundleInfo.price}</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <Elements stripe={stripe} options={{ clientSecret }}>
              <CheckoutForm planData={bundleInfo} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}