import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  createdAt: string;
}

export default function CreditsWidget({ hideAuthPrompt = false }: { hideAuthPrompt?: boolean }) {
  const [, navigate] = useLocation();
  const [balance, setBalance] = useState<number>(0);
  const [email, setEmail] = useState<string>("");
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);

  // Helper that flags 401s like FileManager does
  async function j<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (res.status === 401) {
      const text = await res.text().catch(() => "");
      const err = new Error(text || "Unauthorized") as any;
      err.code = 401;
      throw err;
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setAuthNeeded(false);
      try {
        // Try /me first
        let me: any;
        try {
          me = await j("/api/credits/me");
        } catch (e: any) {
          if (e?.code === 401) throw e;
          // Fallback to balance endpoint if /me not present
          me = await j("/api/credits/balance");
        }

        const userEmail = me?.email || "";
        const userBalance = typeof me?.balance === "number" ? me.balance : Number(me ?? 0);
        
        if (userEmail) setEmail(userEmail);
        setBalance(Number.isFinite(userBalance) ? userBalance : 0);
        
        // Load transactions
        try {
          const txData = await j<{ transactions: CreditTransaction[] }>("/api/credits/transactions");
          setTransactions(txData.transactions || []);
        } catch {
          setTransactions([]);
        }
      } catch (e: any) {
        if (e?.code === 401) {
          setAuthNeeded(true);
        } else {
          console.error("credits load failed", e);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Friendly auth-needed block (matches FileManager UX)
  if (authNeeded && !hideAuthPrompt) {
    const devAuth = import.meta?.env?.VITE_DEV_AUTH === "1";
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <h3 className="font-semibold mb-1">Sign in required</h3>
        <p className="mb-3">
          You need to be logged in to view your credit balance and transactions.
        </p>
        {!devAuth && (
          <Button onClick={() => navigate("/account")}>
            Go to Login
          </Button>
        )}
        {devAuth && (
          <p className="text-sm italic">
            Dev auth is enabled; refresh the page after server restart.
          </p>
        )}
      </div>
    );
  }
  
  if (authNeeded && hideAuthPrompt) {
    return null;
  }

  return (
    <Card data-testid="card-credits-widget">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Credits
            </CardTitle>
            <CardDescription>Manage your staging credits</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/credits/ledger.csv"
              className="px-3 py-2 rounded-lg bg-gray-100 text-sm hover:bg-gray-200"
              data-testid="link-export-csv"
            >
              Export CSV
            </a>
            <Button asChild size="sm" data-testid="button-place-order">
              <Link href="/contact-us">
                <Plus className="h-4 w-4 mr-1" />
                Place Staging Order
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance Display */}
          <div className="rounded-lg bg-muted p-4">
            <div className="text-sm text-muted-foreground">Available Balance</div>
            <div className="text-3xl font-bold" data-testid="text-credit-balance">
              {loading ? "..." : balance}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              credits remaining
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Recent Transactions</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between text-sm border-b pb-2"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div>
                      <div className="font-medium">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        tx.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
