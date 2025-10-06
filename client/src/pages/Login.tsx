import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (import.meta.env.VITE_DEV_AUTH === "1") {
      // Dev mode: auto-redirect to account
      setLocation("/account");
    } else {
      // Production mode: redirect to OIDC login
      window.location.href = "/api/login";
    }
  }, [setLocation]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <p className="text-gray-600">
        Redirecting to login...
      </p>
    </div>
  );
}
