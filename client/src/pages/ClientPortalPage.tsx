import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import CreditsWidget from "../components/CreditsWidget";
import FileManager from "../components/FileManager";
import PortalStatus from "../components/PortalStatus";

export default function ClientPortalPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h3 className="font-semibold mb-2">Sign in required</h3>
          <p className="mb-4">
            You need to be logged in to view your credit balance, transactions, and file manager.
          </p>
          <Button data-testid="button-login" onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Client Portal</h1>
      <PortalStatus />
      <div className="grid gap-6">
        <CreditsWidget hideAuthPrompt />
        <FileManager hideAuthPrompt />
      </div>
    </div>
  );
}
