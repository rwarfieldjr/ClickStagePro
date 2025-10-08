import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider"
import { Link } from "wouter"
import { ArrowRight, Home, TrendingUp, Users, Award, CheckCircle, DollarSign } from "lucide-react"
import { Helmet } from "react-helmet-async"

// Import the provided bedroom images
import beforeBedroom from "@assets/28_dsc_2541_1758204032969.jpg"
import afterBedroom from "@assets/Quick_Staging___Sep_17__2025__01_53_PM_image_5_edited (1)_1758204027035.png"

// Import the provided living room images
import beforeLivingRoom from "@assets/14-Bruce St-014_1758205389126.jpg"
import afterLivingRoom from "@assets/Quick_Staging___Sep_18__2025__10_13_AM_image_1_edited (2)_1758205381820.png"

// Import the provided Day to Dusk transformation images
import beforeDayToDusk from "@assets/03-Jessica Mines Wy-003_1758206132311.jpg"
import afterDayToDusk from "@assets/Quick_Staging___Sep_18__2025__10_30_AM_image_1_edited_1758206122718.png"

// Import the provided De-Clutter transformation images
import beforeDeClutter from "@assets/409 Iron Bridge Way Simpsonville SC-27_1758206660508.jpg"
import afterDeClutter from "@assets/Quick_Staging___Sep_18__2025__10_30_AM_image_1_edited (1)_1758206655289.png"

// Import the provided Exterior Renovation transformation images
import beforeExteriorRenovation from "@assets/409 Iron Bridge Way Simpsonville SC-1_1758230178978.jpg"
import afterExteriorRenovation from "@assets/Quick_Staging___Sep_18__2025__10_30_AM_image_1_edited (2)_1758230186962.png"

// Import the provided Commercial Space transformation images
import beforeCommercialSpace from "@assets/pexels-pixabay-257636_1758290709054.jpg"
import afterCommercialSpace from "@assets/Quick_Staging___Sep_19__2025__10_03_AM_image_1_edited_1758290703287.png"

// Import the provided Apartment Staging transformation images
import beforeApartmentStaging from "@assets/point3d-commercial-imaging-ltd-nQlVMCHPysY-unsplash_1758295494505.jpg"
import afterApartmentStaging from "@assets/Quick_Staging___Sep_19__2025__11_23_AM_image_1_edited_1758295487326.png"

// Import Renovation Inspiration images
import renovationOption1 from "@assets/Quick_Staging___Oct_2__2025__01_45_PM_image_1_edited_1759516066367.png"
import renovationOption2 from "@assets/Quick_Staging___Oct_2__2025__09_53_AM_image_1_edited_1759516072948.png"

export default function Portfolio() {
  const transformationImpacts = [
    {
      icon: TrendingUp,
      title: "73% Faster Sales",
      description: "Staged properties sell significantly faster than vacant ones",
      stat: "Average 23 days vs 87 days"
    },
    {
      icon: DollarSign,
      title: "Higher Sale Prices",
      description: "Virtual staging increases perceived value and final sale price",
      stat: "Up to 10% higher offers"
    },
    {
      icon: Users,
      title: "More Buyer Interest",
      description: "Staged homes receive 3x more online views and showings",
      stat: "300% increase in engagement"
    },
    {
      icon: Award,
      title: "Professional Quality",
      description: "Photorealistic results indistinguishable from traditional staging",
      stat: "95% client satisfaction"
    }
  ]

  const portfolioFeatures = [
    {
      title: "Master Bedroom Transformation",
      description: "Transform empty bedrooms into luxurious retreats that help buyers envision their perfect space"
    },
    {
      title: "Living Room Staging",
      description: "Create inviting living spaces that showcase the room's potential and flow"
    },
    {
      title: "Kitchen & Dining Areas",
      description: "Stage kitchens and dining rooms to highlight functionality and gathering spaces"
    },
    {
      title: "Home Office & Flex Spaces",
      description: "Show buyers how flexible spaces can be utilized for modern work-from-home needs"
    }
  ]

  return (
    <>
      <Helmet>
        <title>Portfolio - Virtual Staging Transformations | ClickStage Pro</title>
        <meta 
          name="description" 
          content="See dramatic before and after virtual staging transformations. Professional AI-powered staging that helps properties sell 73% faster with higher prices. View our portfolio of real estate staging success stories."
        />
        <meta name="keywords" content="virtual staging portfolio, before after staging, property staging examples, real estate staging transformations, ClickStage Pro portfolio" />
        
        {/* Open Graph Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Portfolio - Virtual Staging Transformations | ClickStage Pro" />
        <meta property="og:description" content="See dramatic before and after virtual staging transformations. Professional AI-powered staging that helps properties sell 73% faster with higher prices." />
        <meta property="og:url" content="https://clickstagepro.com/portfolio" />
        <meta property="og:site_name" content="ClickStage Pro" />
        <meta property="og:image" content="https://clickstagepro.com/og-portfolio.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Before and after virtual staging transformation showing empty room vs beautifully staged space" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Portfolio - Virtual Staging Transformations | ClickStage Pro" />
        <meta name="twitter:description" content="See dramatic before and after virtual staging transformations. Professional AI-powered staging that helps properties sell 73% faster." />
        <meta name="twitter:image" content="https://clickstagepro.com/og-portfolio.jpg" />
        <meta name="twitter:image:alt" content="Before and after virtual staging transformation" />
        
        {/* Additional SEO */}
        <link rel="canonical" href="https://clickstagepro.com/portfolio" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="ClickStage Pro" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6" data-testid="text-portfolio-title">
              Transformation <span className="text-primary">Portfolio</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              See the dramatic impact of professional virtual staging. These real transformations showcase 
              how empty rooms become buyer magnets that sell faster and for higher prices.
            </p>
          </div>
          
          {/* Main Before/After Showcase */}
          <div className="max-w-5xl mx-auto mb-16">
            <BeforeAfterSlider
              beforeImage={beforeBedroom}
              afterImage={afterBedroom}
              beforeLabel="Before"
              afterLabel="After"
              className="h-[500px] md:h-[600px] shadow-2xl"
            />
            
            {/* Description below image */}
            <div className="mt-6 text-center">
              <h3 className="text-2xl font-bold font-display mb-3" data-testid="text-master-bedroom-title">
                Master Bedroom Transformation
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-master-bedroom-description">
                From empty space to luxurious retreat - helping buyers envision their dream bedroom
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8" data-testid="button-start-project">
                <Link href="/place-order">
                  Place Staging Order
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8" data-testid="button-view-pricing">
                <Link href="/pricing">
                  View Pricing Plans
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Gallery Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4" data-testid="text-gallery-title">
              Portfolio Gallery
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore more stunning transformations showcasing our versatility across different room types and design styles
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto space-y-16">
            {/* Living Room Transformation */}
            <div>
              <BeforeAfterSlider
                beforeImage={beforeLivingRoom}
                afterImage={afterLivingRoom}
                beforeLabel="Before"
                afterLabel="After"
                className="h-[400px] md:h-[500px] shadow-xl"
              />
              
              {/* Description below image */}
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold font-display mb-3" data-testid="text-living-room-title">
                  Living Room & Kitchen Transformation
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-living-room-description">
                  Converting an empty open-plan space into a warm, inviting living area that showcases the home's potential
                </p>
              </div>
            </div>

            {/* Day to Dusk Transformation */}
            <div>
              <BeforeAfterSlider
                beforeImage={beforeDayToDusk}
                afterImage={afterDayToDusk}
                beforeLabel="Before"
                afterLabel="After"
                className="h-[400px] md:h-[500px] shadow-xl"
              />
              
              {/* Description below image */}
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold font-display mb-3" data-testid="text-day-to-dusk-title">
                  <Link href="/services#photo-enhancement" className="hover:text-primary transition-colors">
                    Day to Dusk Transformation
                  </Link>
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-day-to-dusk-description">
                  Dramatic exterior enhancement that transforms ordinary daytime photos into stunning twilight scenes with emotional appeal
                </p>
              </div>
            </div>

            {/* De-Clutter Transformation */}
            <div>
              <BeforeAfterSlider
                beforeImage={beforeDeClutter}
                afterImage={afterDeClutter}
                beforeLabel="Before"
                afterLabel="After"
                className="h-[400px] md:h-[500px] shadow-xl"
              />
              
              {/* Description below image */}
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold font-display mb-3" data-testid="text-de-clutter-title">
                  <Link href="/services#decluttering" className="hover:text-primary transition-colors">
                    De-Clutter Transformation
                  </Link>
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-de-clutter-description">
                  Sometimes the clients forget or don't think to move items for before the photographer arrives. We can handle it with our De-Clutter option!
                </p>
              </div>
            </div>

            {/* Exterior Renovation Transformation */}
            <div>
              <BeforeAfterSlider
                beforeImage={beforeExteriorRenovation}
                afterImage={afterExteriorRenovation}
                beforeLabel="Before"
                afterLabel="After"
                className="h-[400px] md:h-[500px] shadow-xl"
              />
              
              {/* Description below image */}
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold font-display mb-3" data-testid="text-exterior-renovation-title">
                  <Link href="/services#exterior-renovation" className="hover:text-primary transition-colors">
                    Exterior Renovation Transformation
                  </Link>
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-exterior-renovation-description">
                  Dramatic color and style transformation showing homeowners and builders the stunning potential of exterior renovation projects
                </p>
              </div>
            </div>

            {/* Renovation Inspiration */}
            <div>
              <BeforeAfterSlider
                beforeImage={renovationOption2}
                afterImage={renovationOption1}
                beforeLabel="Light & Neutral"
                afterLabel="Bold & Dramatic"
                className="h-[400px] md:h-[500px] shadow-xl"
              />
              
              {/* Description below image */}
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold font-display mb-3" data-testid="text-renovation-inspiration-title">
                  Renovation Inspiration
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-renovation-inspiration-description">
                  Explore design possibilities and see how different color schemes can transform the same space - from light & airy neutrals to bold, dramatic accent walls
                </p>
              </div>
            </div>

            {/* Apartment Staging Transformation */}
            <div>
              <BeforeAfterSlider
                beforeImage={beforeApartmentStaging}
                afterImage={afterApartmentStaging}
                beforeLabel="Before"
                afterLabel="After"
                className="h-[400px] md:h-[500px] shadow-xl"
              />
              
              {/* Description below image */}
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold font-display mb-3" data-testid="text-apartment-staging-title">
                  <Link href="/services#multi-family" className="hover:text-primary transition-colors">
                    Apartment Staging Transformation
                  </Link>
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-apartment-staging-description">
                  Help apartment managers lease vacant units faster with professional staging. Transform empty apartments into move-in ready spaces that attract quality tenants and command higher rents, reducing vacancy periods for property management companies.
                </p>
              </div>
            </div>

            {/* Commercial Space Transformation */}
            <div>
              <BeforeAfterSlider
                beforeImage={beforeCommercialSpace}
                afterImage={afterCommercialSpace}
                beforeLabel="Before"
                afterLabel="After"
                className="h-[400px] md:h-[500px] shadow-xl"
              />
              
              {/* Description below image */}
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold font-display mb-3" data-testid="text-commercial-space-title">
                  Commercial Space Transformation
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-commercial-space-description">
                  Showcase the full potential of commercial spaces for business owners, developers, and commercial real estate professionals. Transform empty warehouses into fully operational business environments.
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-6">
              Each transformation is carefully crafted to highlight your property's best features and appeal to your target buyer demographic
            </p>
            <Button asChild variant="outline" size="lg" data-testid="button-see-more-examples">
              <Link href="/services">
                See Our Full Service Options
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Transformation Impact Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4" data-testid="text-impact-title">
              The Power of Virtual Staging
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional virtual staging transforms empty properties into buyer magnets with measurable results
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {transformationImpacts.map((impact, index) => (
              <Card key={index} className="text-center hover-elevate" data-testid={`card-impact-${index}`}>
                <CardHeader className="pb-3">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <impact.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{impact.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {impact.description}
                  </p>
                  <div className="text-sm font-semibold text-primary">
                    {impact.stat}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4" data-testid="text-features-title">
              Complete Property Transformation
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our virtual staging services cover every room type to showcase your property's full potential
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {portfolioFeatures.map((feature, index) => (
              <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 bg-primary rounded-full mt-3 flex-shrink-0" />
                    <div>
                      <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-6" data-testid="text-benefits-title">
                Why Choose ClickStage Pro?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">24 to 48 Hour Turnaround</h3>
                    <p className="text-muted-foreground text-sm">
                      Get your professionally staged photos with rush delivery available
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Photorealistic Quality</h3>
                    <p className="text-muted-foreground text-sm">
                      AI-powered staging that looks indistinguishable from real furniture
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Multiple Style Options</h3>
                    <p className="text-muted-foreground text-sm">
                      Choose from modern, traditional, luxury, and contemporary design styles
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Unlimited Revisions</h3>
                    <p className="text-muted-foreground text-sm">
                      We'll work with you until you're completely satisfied with the results
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-lg overflow-hidden shadow-lg">
                <img
                  src={afterBedroom}
                  alt="Professionally staged bedroom showcasing luxury staging quality"
                  className="w-full h-full object-cover"
                  data-testid="image-staged-example"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-6" data-testid="text-final-cta-title">
            Ready to Transform Your Listings?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
            Join thousands of real estate professionals who trust ClickStage Pro to showcase their properties 
            in the best possible light. Get started today and see the difference professional staging makes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              variant="secondary" 
              size="lg" 
              className="text-lg px-8 py-3"
              data-testid="button-get-started"
            >
              <Link href="/contact">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline"
              size="lg" 
              className="text-lg px-8 py-3 bg-white text-black border-white hover:bg-white/90"
              data-testid="button-learn-more"
            >
              <Link href="/services">
                Learn More About Our Services
              </Link>
            </Button>
          </div>
        </div>
      </section>
      </div>
    </>
  )
}