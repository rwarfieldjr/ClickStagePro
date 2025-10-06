import React from "react";

export default function PortalStatus() {
  const [data, setData] = React.useState<any>(null);
  React.useEffect(() => { 
    fetch("/dev/health", { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ ok: false })); 
  }, []);
  
  if (!data) return <div className="text-xs text-muted-foreground">Checking…</div>;
  
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className={`px-2 py-1 rounded ${data.ok ? "bg-green-600 text-white" : "bg-rose-600 text-white"}`}>
        Health: {data.ok ? "OK" : "Issues"}
      </span>
      <span className={`px-2 py-1 rounded ${data.info?.present?.R2_BUCKET ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100"}`}>R2</span>
      <span className={`px-2 py-1 rounded ${data.info?.present?.STRIPE_SECRET_KEY ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100"}`}>Stripe</span>
      <span className={`px-2 py-1 rounded ${data.info?.present?.STRIPE_PRICE_count ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100"}`}>Prices</span>
      <span className={`px-2 py-1 rounded ${data.info?.flags?.ENABLE_R2 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100"}`}>R2 Flag</span>
      <span className={`px-2 py-1 rounded ${data.info?.flags?.ENABLE_CREDITS_API ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100"}`}>Credits Flag</span>
    </div>
  );
}
