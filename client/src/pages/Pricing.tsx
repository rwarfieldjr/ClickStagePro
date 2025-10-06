import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, Clock, Users, Star, Zap, Palette, Trash2, Home, MapPin, RotateCcw } from "lucide-react"

// Base pricing data
const basePhotoPrice = 10;

// One-time bundled photo packs
const bundledPacks = [
  {
    id: "pack-1",
    photos: 1,
    price: 10,
    pricePerPhoto: 10,
    savings: null,
    description: "Try our service"
  },
  {
    id: "pack-5",
    photos: 5,
    price: 45,
    pricePerPhoto: 9,
    savings: "Save $5",
    description: "Perfect for a single listing"
  },
  {
    id: "pack-10", 
    photos: 10,
    price: 85,
    pricePerPhoto: 8.50,
    savings: "Save $15",
    description: "Great for 2-3 listings",
    popular: true
  },
  {
    id: "pack-20",
    photos: 20,
    price: 160,
    pricePerPhoto: 8,
    savings: "Save $40",
    description: "Ideal for multiple projects"
  },
  {
    id: "pack-50",
    photos: 50,
    price: 375,
    pricePerPhoto: 7.50,
    savings: "Save $125",
    description: "Perfect for agencies"
  },
  {
    id: "pack-100",
    photos: 100,
    price: 700,
    pricePerPhoto: 7,
    savings: "Save $300", 
    description: "Maximum value for teams"
  }
];


// Add-on services
const addOns = [
  {
    id: "rush",
    name: "Rush 12-hr",
    price: 5,
    description: "Expedited delivery in 12 hours",
    icon: Clock
  },
  {
    id: "day-to-dusk",
    name: "Day-to-Dusk",
    price: 2,
    description: "Transform day photos to beautiful dusk lighting",
    icon: Star
  },
  {
    id: "declutter",
    name: "Declutter/Item Removal (light)",
    price: 4,
    description: "Remove minor clutter and unwanted items",
    icon: Trash2
  },
  {
    id: "renovation",
    name: "Advanced Virtual Renovation/Full Replace",
    price: 5,
    description: "Complete room transformation and renovation",
    icon: Home
  },
  {
    id: "photo-enhancement",
    name: "Photo Enhancement",
    price: 3,
    description: "Professional photo editing and color correction",
    icon: Palette
  },
  {
    id: "unlimited-revisions",
    name: "Unlimited Revisions",
    price: "FREE",
    description: "Unlimited revisions until you're completely satisfied",
    icon: RotateCcw
  },
];

export default function Pricing() {
  const handleGetStarted = (planId: string, planType: 'bundled' | 'monthly') => {
    // Navigate to checkout with plan details
    const searchParams = new URLSearchParams({
      plan: planId,
      type: planType
    });
    window.location.href = `/checkout?${searchParams.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
            Professional virtual staging at $10 per photo. Buy credits once, use them when you need them.
          </p>
        </div>

        {/* One-time Bundled Photo Packs */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Credit Packs</h2>
            <p className="text-lg text-muted-foreground mb-2">
              Buy credits once. Use them whenever you need them.
            </p>
            <Badge variant="outline" className="text-xs">Credits expire based on pack size</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            {bundledPacks.map((pack) => (
              <Card key={pack.id} className={`relative hover-elevate ${pack.popular ? 'border-primary' : ''}`}>
                {pack.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <div className="text-2xl font-bold">{pack.photos}</div>
                  <div className="text-sm text-muted-foreground">photos</div>
                  <div className="text-3xl font-bold text-primary">${pack.price}</div>
                  <div className="text-sm text-muted-foreground">
                    ${pack.pricePerPhoto} per photo
                  </div>
                  {pack.savings && <div className="text-xs font-medium text-green-600">{pack.savings}</div>}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-center text-muted-foreground mb-4">{pack.description}</p>
                  <Button 
                    className="w-full" 
                    asChild
                    data-testid={`button-pack-${pack.photos}`}
                    variant={pack.popular ? "default" : "outline"}
                  >
                    <a href="/place-order">
                      Place Staging Order
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-16" />

        {/* Add-ons Section */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Add-on Services</h2>
            <p className="text-lg text-muted-foreground">
              Enhance your photos with optional premium services (per photo).
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addOns.map((addon) => {
              const IconComponent = addon.icon;
              return (
                <Card key={addon.id} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{addon.name}</h3>
                          <div className="text-lg font-bold text-primary">+${addon.price}</div>
                        </div>
                        <p className="text-sm text-muted-foreground">{addon.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <Separator className="my-16" />

        {/* Simple Policies */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple Policies</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about our pricing and credits.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Credit Expiry</h3>
                      <p className="text-sm text-muted-foreground">
                        1-5 credits expire in 6-12 months. 10+ credits expire in 12-24 months and auto-extend when you use them.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Turnaround Time</h3>
                      <p className="text-sm text-muted-foreground">
                        48 hours standard delivery. 12 hours with Rush add-on.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Properties?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start with our most popular 10-credit pack for maximum savings. 
            Professional staging results guaranteed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              asChild
              data-testid="button-cta-pack"
            >
              <a href="/place-order">
                Buy 10 Credits - $85
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Questions? Contact our team for custom enterprise pricing.
          </p>
        </section>

      </div>
    </div>
  );
}