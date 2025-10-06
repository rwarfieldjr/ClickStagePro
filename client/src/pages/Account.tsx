import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CreditCard, Trash2, Download, Calendar, DollarSign, CheckCircle } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PaymentMethodManager } from "../components/PaymentMethodManager";
import { BillingHistory } from "../components/BillingHistory";

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

interface Invoice {
  id: string;
  number: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  due_date: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string | null;
  period_start: number | null;
  period_end: number | null;
}


export default function Account() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payment-methods");

  // Fetch payment methods
  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useQuery<{
    success: boolean;
    payment_methods: PaymentMethod[];
  }>({
    queryKey: ['/api/billing/payment-methods'],
    retry: 1
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{
    success: boolean;
    invoices: Invoice[];
  }>({
    queryKey: ['/api/billing/invoices'],
    retry: 1
  });


  // Set default payment method mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('PATCH', '/api/billing/default-payment-method', { payment_method_id: paymentMethodId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/payment-methods'] });
      toast({
        title: "Default Payment Method Updated",
        description: "Your default payment method has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default payment method.",
        variant: "destructive",
      });
    },
  });

  // Remove payment method mutation
  const removeMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('DELETE', `/api/billing/payment-methods/${paymentMethodId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/payment-methods'] });
      toast({
        title: "Payment Method Removed",
        description: "Your payment method has been successfully removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'succeeded':
      case 'active':
        return 'default';
      case 'open':
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'canceled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-account-title">
            Account & Billing
          </h1>
          <p className="text-muted-foreground">
            Manage your payment methods and view billing history for credit pack purchases.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment-methods" data-testid="button-tab-payment-methods">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="billing-history" data-testid="button-tab-billing-history">
              <Calendar className="w-4 h-4 mr-2" />
              Billing History
            </TabsTrigger>
          </TabsList>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Payment Methods</h2>
              <Elements stripe={stripePromise}>
                <PaymentMethodManager />
              </Elements>
            </div>

            {paymentMethodsLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {paymentMethodsData?.payment_methods.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No Payment Methods
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Add a payment method to make future purchases faster and easier.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  paymentMethodsData?.payment_methods.map((method) => (
                    <Card key={method.id} className="hover-elevate">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">
                              {getBrandIcon(method.card?.brand || 'unknown')}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-foreground capitalize">
                                  {method.card?.brand} •••• {method.card?.last4}
                                </h3>
                                {method.is_default && (
                                  <Badge variant="default" data-testid={`badge-default-${method.id}`}>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Expires {method.card?.exp_month?.toString().padStart(2, '0')}/{method.card?.exp_year}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {method.card?.funding} • Added {formatDate(method.created)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!method.is_default && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDefaultMutation.mutate(method.id)}
                                disabled={setDefaultMutation.isPending}
                                data-testid={`button-set-default-${method.id}`}
                              >
                                Set as Default
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMutation.mutate(method.id)}
                              disabled={removeMutation.isPending}
                              data-testid={`button-remove-${method.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Billing History Tab */}
          <TabsContent value="billing-history" className="space-y-6">
            <h2 className="text-xl font-semibold">Billing History</h2>
            
            <Elements stripe={stripePromise}>
              <BillingHistory />
            </Elements>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}