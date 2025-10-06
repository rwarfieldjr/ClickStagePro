import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Sparkles, CheckCircle, Clock } from "lucide-react"
import { Link } from "wouter"
import heroImage from "@assets/generated_images/Virtual_staging_before_after_comparison_c0b36504.png"

export function HeroSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Virtual staging transformation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-block mb-4" data-testid="badge-advanced-ai">
            <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-sm font-medium text-white">Advanced AI Technology</span>
            </div>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6" data-testid="text-hero-title">
            Transform Empty Properties with{" "}
            <span className="text-white">AI Virtual Staging</span>
          </h1>
          
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Powered by the latest AI breakthroughs in image generation - creating photorealistic staging that helps homes sell faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/place-order">
              <Button 
                size="lg" 
                className="text-lg px-8 py-3 bg-primary hover:bg-primary/90 border-primary-border"
                data-testid="button-get-started"
              >
                Place Staging Order
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <Button 
              asChild
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3 text-white border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
              data-testid="button-view-portfolio"
            >
              <Link href="/portfolio">
                <Play className="mr-2 h-5 w-5" />
                View Portfolio
              </Link>
            </Button>

            <Button 
              asChild
              variant="outline"
              size="lg" 
              className="text-lg px-8 py-3 text-white border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20"
              data-testid="button-client-portal-hero"
            >
              <Link href="/client-portal">
                Client Portal
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center" data-testid="stat-faster-sales">
              <div className="text-3xl font-bold text-white">73%</div>
              <div className="text-sm text-gray-300">Faster Sales</div>
            </div>
            <div className="text-center" data-testid="stat-higher-offers">
              <div className="text-3xl font-bold text-white">15%</div>
              <div className="text-sm text-gray-300">Higher Offers</div>
            </div>
            <div className="text-center" data-testid="stat-delivery-time">
              <div className="text-3xl font-bold text-white">24-48h</div>
              <div className="text-sm text-gray-300">Delivery</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}