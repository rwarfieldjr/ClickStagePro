import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Register() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (import.meta.env.VITE_DEV_AUTH === "1") {
      // Dev mode: auto-redirect to account
      setLocation("/account");
    } else {
      // Production mode: redirect to OIDC login (registration happens through OIDC provider)
      window.location.href = "/api/login";
    }
  }, [setLocation]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold mb-4">Create Account</h1>
      <p className="text-gray-600">
        Redirecting to login...
      </p>
    </div>
  );
}
