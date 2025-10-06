import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Receipt, Calendar, DollarSign } from "lucide-react";

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

export function BillingHistory() {
  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{
    success: boolean;
    invoices: Invoice[];
  }>({
    queryKey: ['/api/billing/invoices'],
    retry: 1
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

  const formatDatetime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'open':
        return 'secondary';
      case 'void':
      case 'uncollectible':
        return 'destructive';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'open':
        return 'Outstanding';
      case 'void':
        return 'Void';
      case 'uncollectible':
        return 'Uncollectible';
      case 'draft':
        return 'Draft';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.invoice_pdf) {
      window.open(invoice.invoice_pdf, '_blank');
    } else if (invoice.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank');
    }
  };

  if (invoicesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!invoicesData?.invoices.length) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Billing History
          </h3>
          <p className="text-muted-foreground">
            Your invoices and receipts will appear here once you make your first purchase.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invoicesData.invoices.map((invoice) => (
        <Card key={invoice.id} className="hover-elevate">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="flex items-center space-x-3">
                  <span className="text-lg">
                    {invoice.number || `Invoice ${invoice.id.slice(-6)}`}
                  </span>
                  <Badge variant={getStatusColor(invoice.status)} data-testid={`badge-status-${invoice.id}`}>
                    {getStatusText(invoice.status)}
                  </Badge>
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDatetime(invoice.created)}
                  </div>
                  {invoice.period_start && invoice.period_end && (
                    <div>
                      Billing Period: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(invoice.amount_paid, invoice.currency)}
                </div>
                {invoice.amount_due > 0 && (
                  <div className="text-sm text-destructive">
                    {formatCurrency(invoice.amount_due, invoice.currency)} due
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                {invoice.description && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.description}
                  </p>
                )}
                {invoice.due_date && invoice.status === 'open' && (
                  <p className="text-sm text-destructive">
                    Due: {formatDate(invoice.due_date)}
                  </p>
                )}
              </div>
              
              <div className="flex space-x-2">
                {(invoice.invoice_pdf || invoice.hosted_invoice_url) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadInvoice(invoice)}
                    data-testid={`button-download-${invoice.id}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}