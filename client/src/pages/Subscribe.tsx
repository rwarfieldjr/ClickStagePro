import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Shield, RotateCcw, X } from "lucide-react"

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    credits: 6,
    rollover: 12,
    features: [
      "6 credits per month",
      "Rollover up to 12 total",
      "48h standard delivery",
      "Email support"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    credits: 13,
    rollover: 26,
    popular: true,
    features: [
      "13 credits per month",
      "Rollover up to 26 total",
      "Shareable across team (up to 3 users)",
      "Priority email & phone support"
    ]
  },
  {
    id: "team",
    name: "Team",
    price: 199,
    credits: 28,
    rollover: 56,
    features: [
      "28 credits per month",
      "Rollover up to 56 total",
      "Shareable across team (up to 10 users)",
      "Dedicated account manager"
    ]
  }
]

const trustFeatures = [
  { icon: Shield, text: "Secure checkout" },
  { icon: RotateCcw, text: "Credits roll over" },
  { icon: X, text: "Cancel anytime" }
]

export default function Subscribe() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const selectPlan = (planId: string) => {
    setSelectedPlan(planId)
    // TODO: Implement plan preselection logic when GHL form is integrated
    console.log(`Preselecting plan: ${planId}`)
  }

  // Check for plan preselection from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const planParam = urlParams.get('plan')
    if (planParam && ['starter', 'pro', 'team'].includes(planParam)) {
      setSelectedPlan(planParam)
      // Auto-scroll to form when plan is preselected
      setTimeout(() => {
        const formElement = document.getElementById('subscribe-form')
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' })
        }
      }, 500)
    }
  }, [])

  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold font-display mb-6" data-testid="text-monthly-plans-title">
            Monthly <span className="text-primary">Credit Plans</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
            Recurring credits with team sharing and rollover up to 2× your monthly allowance.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative hover-elevate transition-all duration-200 ${
                plan.popular ? 'ring-2 ring-primary scale-105' : ''
              }`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.popular && (
                <Badge 
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1"
                  data-testid="badge-most-popular"
                >
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full mt-6 rounded-lg font-bold"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                  data-testid={`button-select-${plan.id}`}
                >
                  <a href="#subscribe-form" onClick={() => selectPlan(plan.id)}>
                    Select {plan.name}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Row */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-16 text-sm text-muted-foreground">
          {trustFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <feature.icon className="h-4 w-4" />
              <span>{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Subscription Form Embed Section */}
        <div id="subscribe-form" className="max-w-[720px] mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold mb-4">Start Your Monthly Plan</CardTitle>
              <CardDescription className="text-lg">
                Choose your subscription and start getting monthly credits with rollover benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center py-16 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <div className="space-y-4">
                  <p className="text-lg font-medium text-muted-foreground">
                    GHL Subscription Form Embed Section
                  </p>
                  <div className="bg-background p-4 rounded border">
                    <code className="text-sm text-muted-foreground break-all">
                      &lt;!-- GHL SUBSCRIPTION FORM EMBED CODE GOES HERE --&gt;
                    </code>
                  </div>
                  {selectedPlan && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-primary">
                        Preselected Plan: {plans.find(p => p.id === selectedPlan)?.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Implement plan preselection in your GHL form integration
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Replace the comment above with your GoHighLevel subscription form embed code. 
                    Plan preselection via ?plan=pro URL parameters is supported.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}