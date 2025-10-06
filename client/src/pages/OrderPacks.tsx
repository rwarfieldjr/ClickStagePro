import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqItems = [
  {
    question: "How fast is delivery?",
    answer: "Standard 48h, priority options available."
  },
  {
    question: "Do credits expire?",
    answer: "No."
  },
  {
    question: "What files can I upload?",
    answer: "JPG/PNG. Max 25MB per file."
  }
]

// Smooth scroll behavior is handled by CSS scroll-behavior: smooth on html

export default function OrderPacks() {
  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold font-display mb-6" data-testid="text-order-packs-title">
            Order <span className="text-primary">Virtual Staging</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Buy credits once.
          </p>
          <Button 
            size="lg" 
            asChild
            className="rounded-lg font-bold px-8 py-4 text-lg w-full sm:w-auto"
            data-testid="button-start-order"
          >
            <a href="#order-form">
              Start Your Order
            </a>
          </Button>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Form Embed Section */}
        <div id="order-form" className="max-w-[820px] mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold mb-4">Start Your Order</CardTitle>
              <CardDescription className="text-lg">
                Select your credit package and get started with virtual staging
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center py-16 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <div className="space-y-4">
                  <p className="text-lg font-medium text-muted-foreground">
                    GHL Order Form Embed Section
                  </p>
                  <div className="bg-background p-4 rounded border">
                    <code className="text-sm text-muted-foreground break-all">
                      &lt;!-- GHL ORDER FORM EMBED CODE GOES HERE --&gt;
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Replace the comment above with your GoHighLevel order form embed code. 
                    This section is optimized for mobile-first responsive design.
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