import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function ClientPortalPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect logged-in users to dashboard, logged-out users to login
    if (isAuthenticated && user) {
      navigate("/account");
    } else {
      navigate("/login");
    }
  }, [isAuthenticated, user, navigate]);

  // Show nothing while redirecting
  return null;
}
