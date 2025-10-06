import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "wouter"
import { MapPin, Users, Target, Award } from "lucide-react"

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6">
              About <span className="text-primary">ClickStage Pro</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Built by a real estate agent, for real estate agents.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <div className="text-lg leading-relaxed text-muted-foreground space-y-6">
              <p>
                ClickStage Pro was built by a real estate agent, for real estate agents.
              </p>
              
              <p>
                With more than two decades of experience selling homes, we've seen firsthand what the data proves: staging sells homes faster and for more money. The problem? Traditional staging has always been expensive, slow, and out of reach for most agents and their clients.
              </p>
              
              <p>
                That's why we created ClickStage Pro. Based in Greenville, SC, our mission is simple—make professional staging accessible to every agent, for every listing.
              </p>
              
              <p>
                Big staging companies charge thousands of dollars and often price out smaller agents or homes. But with today's technology, there's no reason staging should be a luxury. Our virtual staging solutions give agents a powerful, affordable tool to compete at the highest level—without breaking the budget.
              </p>
              
              <p className="text-foreground font-semibold">
                We believe every property deserves to look its best online. With ClickStage Pro, that's now fully attainable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Our Values
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything we do is guided by our commitment to real estate professionals and their success.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center" data-testid="card-value-accessible">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Accessible</h3>
                <p className="text-muted-foreground text-sm">
                  Professional staging for every agent and every budget
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center" data-testid="card-value-affordable">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Affordable</h3>
                <p className="text-muted-foreground text-sm">
                  Competitive pricing without sacrificing quality
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center" data-testid="card-value-experienced">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Experienced</h3>
                <p className="text-muted-foreground text-sm">
                  Built on 20+ years of real estate expertise
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center" data-testid="card-value-local">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Local</h3>
                <p className="text-muted-foreground text-sm">
                  Proudly based in Greenville, SC
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
            Ready to Transform Your Listings?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of agents who trust ClickStage Pro to make their properties stand out online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/place-order">
              <Button size="lg" data-testid="button-contact">
                Place Staging Order
              </Button>
            </Link>
            <Link href="/services">
              <Button size="lg" variant="outline" data-testid="button-services">
                View Our Services
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}