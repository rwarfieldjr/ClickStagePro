import { ServiceCard } from '../ServiceCard'
import { Home, Camera, Palette } from 'lucide-react'

export default function ServiceCardExample() {
  return (
    <div className="p-8 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <ServiceCard
          icon={Home}
          title="Basic Staging"
          description="Perfect for single rooms and basic properties"
          price="$29"
          features={[
            "1-2 rooms staged",
            "Basic furniture placement",
            "12-hour rush delivery",
            "2 revisions included"
          ]}
        />
        <ServiceCard
          icon={Camera}
          title="Premium Staging"
          description="Complete home staging with professional touch"
          price="$99"
          features={[
            "Up to 8 rooms staged",
            "Premium furniture selection",
            "Same-day delivery",
            "Unlimited revisions",
            "Photo enhancement"
          ]}
          popular
        />
        <ServiceCard
          icon={Palette}
          title="Luxury Staging"
          description="High-end staging for luxury properties"
          price="$199"
          features={[
            "Unlimited rooms",
            "Designer furniture",
            "Priority delivery",
            "Dedicated designer",
            "Custom styling"
          ]}
        />
      </div>
    </div>
  )
}