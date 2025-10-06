import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, TrendingUp, TrendingDown, History, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CreditTransaction {
  id: number;
  userId: string;
  delta: number;
  reason: string | null;
  sourceId: string | null;
  createdAt: string;
}

export function CreditBalance() {
  const { data: balanceData, isLoading: balanceLoading, error: balanceError, isError: isBalanceError } = useQuery<{
    success: boolean;
    balance: number;
  }>({
    queryKey: ['/api/credits/balance'],
  });

  const { data: transactionsData, isLoading: transactionsLoading, error: transactionsError, isError: isTransactionsError } = useQuery<{
    success: boolean;
    transactions: CreditTransaction[];
  }>({
    queryKey: ['/api/credits/transactions'],
  });

  const formatReason = (reason: string | null): string => {
    if (!reason) return 'Other';
    
    const reasonMap: Record<string, string> = {
      'stripe_purchase': 'Credit Purchase',
      'photo_staged': 'Photo Staged',
      'refund': 'Refund',
      'bonus': 'Bonus Credits',
      'promo': 'Promotional Credits',
      'adjustment': 'Manual Adjustment',
    };
    
    return reasonMap[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (balanceLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isBalanceError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Credits</AlertTitle>
        <AlertDescription>
          Failed to load your credit balance. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  if (!balanceData?.success) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Unable to retrieve credit information at this time.
        </AlertDescription>
      </Alert>
    );
  }

  const balance = balanceData.balance;
  const transactions = transactionsData?.transactions ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Credit Balance
          </CardTitle>
          <CardDescription>
            Your available credits for virtual staging services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-foreground" data-testid="text-credit-balance">
              {balance}
            </div>
            <div className="text-sm text-muted-foreground">
              {balance === 1 ? 'credit' : 'credits'} available
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Your credit transaction history and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isTransactionsError || !transactionsData?.success ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load transaction history. Please try again later.
              </AlertDescription>
            </Alert>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{formatReason(transaction.reason)}</span>
                        {transaction.sourceId && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.sourceId.substring(0, 12)}...
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {transaction.delta > 0 ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-500">
                              +{transaction.delta}
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-red-500">
                              {transaction.delta}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
