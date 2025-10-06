import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function PaymentCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Payment Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your payment was cancelled. No charges have been made to your account.
              </p>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">What happened?</h3>
                <p className="text-sm text-muted-foreground">
                  The payment process was interrupted or cancelled. This could happen if you:
                </p>
                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                  <p>• Closed the payment window</p>
                  <p>• Clicked the back button during payment</p>
                  <p>• Experienced a connection issue</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => setLocation('/pricing')}
                variant="outline"
                data-testid="button-back-pricing"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Pricing
              </Button>
              
              <Button 
                onClick={() => setLocation('/pricing')}
                data-testid="button-try-again"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mt-6">
              Need help? Call our support team at (864) 400-0766
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}