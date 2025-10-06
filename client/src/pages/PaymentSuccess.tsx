import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, ArrowRight } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Get payment details from URL parameters (Stripe redirects with payment_intent)
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
    
    if (paymentIntent) {
      // Automatically redirect to order completion after a brief confirmation
      setIsRedirecting(true);
      
      setTimeout(() => {
        let orderCompletionUrl = `/order-completion?payment_intent=${paymentIntent}`;
        if (paymentIntentClientSecret) {
          orderCompletionUrl += `&payment_intent_client_secret=${paymentIntentClientSecret}`;
        }
        setLocation(orderCompletionUrl);
      }, 2000);
    } else {
      // No payment intent found - redirect to home
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center py-12">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <div className="space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-20 h-20 text-green-500" />
          </div>
          
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-bold text-green-600" data-testid="text-payment-success">
              Payment Successful!
            </h1>
            <p className="text-xl text-muted-foreground">
              Thank you for your purchase! Your payment has been processed successfully.
            </p>
          </div>

          {isRedirecting ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-primary font-medium">Redirecting to order completion...</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm">Next: Complete your order with contact info and photos</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No payment information found. Redirecting to home page...
              </p>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Need help? Call our support team at <span className="font-medium">(864) 400-0766</span>
          </div>
        </div>
      </div>
    </div>
  );
}