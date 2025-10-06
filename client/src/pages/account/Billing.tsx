import CreditsWidget from "../../components/CreditsWidget";
import PortalStatus from "../../components/PortalStatus";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

export default function BillingPage() {
  const { toast } = useToast();

  const managePortalMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/billing/portal', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!r.ok) throw new Error('Failed to create portal session');
      return r.json() as Promise<{ url: string }>
    },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e: any) => toast({ title: 'Unable to open billing portal', description: e?.message || 'Please try again later', variant: 'destructive' })
  });

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-2">Billing & Credits</h1>
      <PortalStatus />
      <div className="my-4">
        <Button onClick={() => managePortalMutation.mutate()} disabled={managePortalMutation.isPending}>
          {managePortalMutation.isPending ? 'Opening…' : 'Manage billing'}
        </Button>
      </div>
      <CreditsWidget />
    </div>
  );
}
