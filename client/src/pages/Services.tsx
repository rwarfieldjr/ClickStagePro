import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "wouter"
import { 
  HomeIcon, 
  Building, 
  Building2, 
  Camera, 
  Sparkles, 
  PaintBucket, 
  Lightbulb, 
  Wrench 
} from "lucide-react"

export default function Services() {
  const services = [
    {
      id: "residential",
      icon: HomeIcon,
      title: "Residential Virtual Staging",
      description: "Transform empty homes into buyer's dreams with our professional residential staging services. Perfect for single-family homes, condos, and townhouses.",
      features: [
        "Living rooms, bedrooms, and kitchens",
        "Modern and traditional furniture styles",
        "Professional lighting and décor",
        "24 hr or less turnaround",
        "Unlimited revisions"
      ]
    },
    {
      id: "commercial",
      icon: Building,
      title: "Commercial Virtual Staging",
      description: "Professional staging solutions for commercial properties including offices, retail spaces, and hospitality venues.",
      features: [
        "Office and workspace staging",
        "Retail and restaurant layouts",
        "Hotel and hospitality spaces",
        "Modern business aesthetics",
        "Brand-appropriate styling"
      ]
    },
    {
      id: "multi-family",
      icon: Building2,
      title: "Multi-Family Apartment Staging",
      description: "Specialized staging for apartment complexes, multi-unit buildings, and rental properties to maximize occupancy rates.",
      features: [
        "Studio to 3+ bedroom layouts",
        "Tenant-friendly furniture",
        "Space optimization techniques",
        "Bulk pricing available",
        "Property management integration"
      ]
    },
    {
      id: "photo-enhancement",
      icon: Camera,
      title: "Photo Enhancement",
      description: "Professional photo editing and enhancement services to make your property images stand out in listings.",
      features: [
        "Color correction and brightness",
        "HDR photo processing",
        "Perspective correction",
        "Object removal",
        "Sky replacement"
      ]
    },
    {
      id: "decluttering",
      icon: Sparkles,
      title: "Room Decluttering",
      description: "Remove unwanted items and clutter from your property photos to create clean, appealing spaces that buyers love.",
      features: [
        "Personal items removal",
        "Furniture rearrangement",
        "Space optimization",
        "Clean, minimal aesthetics",
        "Professional presentation"
      ]
    },
    {
      id: "interior-renovation",
      icon: Lightbulb,
      title: "Interior Renovation Ideas",
      description: "Visualize potential interior renovations and design updates to help buyers see the property's true potential.",
      features: [
        "Kitchen and bathroom updates",
        "Flooring and paint changes",
        "Modern fixture installation",
        "Open floor plan concepts",
        "Budget-friendly improvements"
      ]
    },
    {
      id: "exterior-renovation",
      icon: Wrench,
      title: "Exterior Renovation Ideas",
      description: "Show off potential exterior improvements and curb appeal enhancements to increase property value perception.",
      features: [
        "Landscaping improvements",
        "Exterior paint and siding",
        "Door and window upgrades",
        "Outdoor living spaces",
        "Architectural enhancements"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6">
              Our <span className="text-primary">Services</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Professional virtual staging and photo enhancement services to help you sell properties faster and for better prices. 
              Transform any property into a buyer's dream with our AI-powered solutions.
            </p>
            <Link href="/pricing">
              <Button size="lg" className="text-lg px-8" data-testid="button-pricing">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} id={service.id} className="hover-elevate transition-all duration-300 scroll-mt-24" data-testid={`card-service-${index}`}>
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-semibold">{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2 text-sm">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-primary/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
            Ready to Transform Your Properties?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose from our flexible pricing options and start staging your properties today. 
            Professional results guaranteed with fast turnaround times.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="outline" data-testid="button-contact">
                Get Started Today
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" data-testid="button-pricing-cta">
                View All Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}