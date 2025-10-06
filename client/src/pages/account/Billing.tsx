import CreditsWidget from "../../components/CreditsWidget";
import PortalStatus from "../../components/PortalStatus";

export default function BillingPage() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-2">Billing & Credits</h1>
      <PortalStatus />
      <CreditsWidget />
    </div>
  );
}
