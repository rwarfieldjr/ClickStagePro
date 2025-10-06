import { HeroSection } from "@/components/HeroSection"
import { ServiceCard } from "@/components/ServiceCard"
import { TestimonialCard } from "@/components/TestimonialCard"
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "wouter"
import { HomeIcon, Camera, Palette, ArrowRight, CheckCircle, Clock, Users, Award } from "lucide-react"

// Import generated images
// Fallback placeholders if generated assets are not present in CI
import heroImage from "@/assets/styles/placeholder.png"
import clientAvatar from "@/assets/styles/placeholder.png"
import agentAvatar from "@/assets/styles/placeholder.png"

// Use fallback placeholders if user-provided assets are not bundled
import beforeImage from "@/assets/styles/placeholder.png"
import afterImage from "@/assets/styles/placeholder.png"

export default function Home() {
  // TODO: Remove mock data when integrating with real services
  const services = [
    {
      icon: HomeIcon,
      title: "Starter",
      description: "Perfect for getting started",
      price: "$29",
      features: [
        "5 photos per month",
        "Professional staging",
        "Rush delivery available",
        "Email support"
      ]
    },
    {
      icon: Camera,
      title: "Pro",
      description: "Most popular choice",
      price: "$79", 
      features: [
        "20 photos per month",
        "Professional staging",
        "Rush delivery available", 
        "Priority support",
        "Multiple staging styles"
      ],
      popular: true
    },
    {
      icon: Palette,
      title: "Business",
      description: "For growing businesses",
      price: "$199",
      features: [
        "60 photos per month",
        "Professional staging",
        "Rush delivery available",
        "Priority support", 
        "Dedicated account manager"
      ]
    }
  ]

  // TODO: Remove mock testimonial data
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Real Estate Agent", 
      company: "Century 21",
      content: "ClickStage Pro transformed my listings completely. Properties that sat on the market for months sold within weeks after virtual staging. The quality is incredible!",
      rating: 5,
      avatar: clientAvatar
    },
    {
      name: "Michael Chen",
      role: "Property Manager",
      company: "Elite Properties", 
      content: "The 12-hour rush delivery is a game-changer. My clients love seeing their properties staged before they hit the market.",
      rating: 5,
      avatar: agentAvatar
    }
  ]

  const benefits = [
    {
      icon: CheckCircle,
      title: "Sell 73% Faster",
      description: "Staged homes sell significantly faster than empty properties"
    },
    {
      icon: Clock,
      title: "Rush Delivery Available", 
      description: "Get your professionally staged photos back quickly with our rush service"
    },
    {
      icon: Users,
      title: "Expert Designers",
      description: "Our team of interior designers creates stunning, market-ready spaces"
    },
    {
      icon: Award,
      title: "Premium Quality",
      description: "Photorealistic staging that looks indistinguishable from real furniture"
    }
  ]

  return (
    <div>
      <HeroSection />
      
      {/* Benefits Section */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-4" data-testid="text-benefits-title">
              Why Choose AI Virtual Staging?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform empty properties into buyer's dreams with cutting-edge technology
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover-elevate">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2" data-testid={`text-benefit-${index}`}>
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Gallery */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-4" data-testid="text-gallery-title">
              See the Transformation
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See the dramatic transformation as we turn empty rooms into beautiful, staged spaces that sell faster
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Before Image */}
              <div className="relative group">
                <img
                  src={beforeImage}
                  alt="Empty living room with fireplace - no furniture, ready for staging"
                  className="w-full aspect-[4/3] object-cover rounded-lg shadow-lg"
                  data-testid="image-before"
                />
              </div>
              
              {/* After Image */}
              <div className="relative group">
                <img
                  src={afterImage}
                  alt="Modern farmhouse living room staged with furniture and fireplace decor"
                  className="w-full aspect-[4/3] object-cover rounded-lg shadow-lg"
                  data-testid="image-after"
                />
              </div>
            </div>
            
            <div className="text-center">
              <Button asChild size="lg" data-testid="button-view-more-examples">
                <Link href="/portfolio">
                  View More Examples
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-6" data-testid="text-pricing-title">
            Professional Staging at <span className="text-primary">Unbeatable Prices</span>
          </h2>
          <div className="text-xl text-muted-foreground mb-8">
            <p>
              Pricing as low as <span className="font-bold text-primary">$7.00 per Staged Photo</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/pricing">
              <Button size="lg" className="group" data-testid="button-view-pricing">
                View All Pricing Plans
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" data-testid="button-get-started">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-4" data-testid="text-guarantee-title">
              Our Commitment to You
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We stand behind every photo we stage with industry-leading guarantees
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Unlimited Revisions Card */}
            <div className="bg-card rounded-lg p-6 border shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 relative">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">∞</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold mb-3" data-testid="text-unlimited-revisions-title">
                    Unlimited Revisions
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Not happy with a result? We'll keep refining until it's perfect. No limits, no extra charges.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      No revision limits
                    </li>
                    <li className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      No extra charges
                    </li>
                    <li className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      Fast turnaround on changes
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 100% Satisfaction Guarantee Card */}
            <div className="bg-card rounded-lg p-6 border shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold mb-3" data-testid="text-satisfaction-guarantee-title">
                    100% Satisfaction Guarantee
                  </h3>
                  <p className="text-muted-foreground mb-4" data-testid="text-satisfaction-guarantee-description">
                    We've got you. Message us within 30 days of purchase and we'll keep revising—free—until you love the results.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      30-day guarantee window
                    </li>
                    <li className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      Free unlimited revisions
                    </li>
                    <li className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      Message us through your order
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-4" data-testid="text-testimonials-title">
              What Our Clients Say
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of satisfied real estate professionals who trust ClickStage Pro
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                name={testimonial.name}
                role={testimonial.role}
                company={testimonial.company}
                content={testimonial.content}
                rating={testimonial.rating}
                avatar={testimonial.avatar}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold mb-4" data-testid="text-cta-title">
            Ready to Transform Your Listings?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Get professional virtual staging results in just 12 hours with rush delivery. Upload your photos and see the magic happen.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              asChild
              variant="secondary" 
              size="lg" 
              className="text-lg px-8 py-3"
              data-testid="button-start-project"
            >
              <Link href="/place-order">
                Place Staging Order
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="secondary"
              size="lg" 
              className="text-lg px-8 py-3"
              data-testid="button-view-pricing"
            >
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}