import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Link } from "wouter"
import { ChevronDown, ChevronRight, HelpCircle, MessageSquare, Mail } from "lucide-react"

export default function FAQ() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionId: string) => {
    const newOpenSections = new Set(openSections)
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId)
    } else {
      newOpenSections.add(sectionId)
    }
    setOpenSections(newOpenSections)
  }

  const faqSections = [
    {
      id: "pricing",
      title: "Pricing & Plans",
      icon: HelpCircle,
      questions: [
        {
          id: "cost",
          question: "How much does it cost?",
          answer: "Our pricing is simple and transparent. Individual photos are $10 each à la carte. However, bundles and monthly subscription plans offer significantly lower per-photo pricing, making them more cost-effective for regular users."
        },
        {
          id: "credits-rollover",
          question: "Do credits roll over?",
          answer: "Yes! With subscription plans, unused credits roll over to the next month up to 2× your monthly allowance. This gives you flexibility to use credits when you need them most without losing value."
        },
        {
          id: "bundle-expiration",
          question: "Do one-time bundles expire?",
          answer: "No. Purchase them when convenient and use the credits whenever you need them."
        },
        {
          id: "plan-changes",
          question: "Can I change my plan mid-cycle?",
          answer: "Yes! Upgrades take effect immediately, giving you access to additional credits right away. Downgrades take effect at the start of your next billing cycle to ensure you don't lose any benefits you've already paid for."
        },
        {
          id: "team-sharing",
          question: "Can I share credits with my team?",
          answer: "Absolutely! Pro and Team plans include shared credit pools, allowing multiple team members to use credits from the same account. This is perfect for real estate teams and agencies."
        }
      ]
    },
    {
      id: "process",
      title: "Process & Turnaround",
      icon: MessageSquare,
      questions: [
        {
          id: "turnaround",
          question: "What's the standard turnaround time?",
          answer: "Our standard turnaround is 48 hours or less. However, most projects finish much sooner - many are completed faster depending on complexity and current queue. Rush delivery guarantees 12-hour completion."
        },
        {
          id: "rush-delivery",
          question: "Do you offer rush delivery?",
          answer: "Yes! Rush delivery is available for urgent projects, with guaranteed delivery in 12 hours. This service can be added to any order for an additional fee."
        },
        {
          id: "whats-included",
          question: "What's included with each photo?",
          answer: "Each photo includes one professional virtual staging design plus one minor revision if needed. This ensures you get exactly the look you want for your listing."
        },
        {
          id: "minor-revision",
          question: "What counts as a 'minor revision'?",
          answer: "Minor revisions include style swaps (changing from modern to traditional furniture), color adjustments, small furniture changes, or minor layout tweaks. Major redesigns would be considered additional work."
        },
        {
          id: "photo-submission",
          question: "How do I submit photos?",
          answer: "Simply upload your photos using our order form. The process is straightforward - select your package, upload images, specify any preferences, and submit. You'll receive confirmation and updates via email."
        }
      ]
    },
    {
      id: "technical",
      title: "Technical Requirements",
      icon: Mail,
      questions: [
        {
          id: "photo-limits",
          question: "What are the photo requirements and limits?",
          answer: "We accept JPG, PNG, WebP, and GIF files up to 10MB each. For best results, use wide-angle shots that show as much of the room as possible. Higher resolution photos produce better staging results."
        },
        {
          id: "decluttering",
          question: "Can you remove clutter from photos?",
          answer: "Yes, we offer light decluttering services. We can remove personal items, excessive furniture, and general clutter to create cleaner, more appealing spaces. Major object removal may require additional fees."
        },
        {
          id: "day-to-dusk",
          question: "Can you do day-to-dusk conversions?",
          answer: "Absolutely! Day-to-dusk conversion is available as an add-on option for any photo. This creates beautiful twilight exterior shots that make properties more appealing and memorable."
        },
        {
          id: "virtual-renovation",
          question: "Do you offer virtual renovations?",
          answer: "Yes! We can visualize renovations for kitchens, bathrooms, flooring, and more. Pricing varies by scope and complexity. Contact us with your specific renovation visualization needs for a custom quote."
        },
        {
          id: "floor-plans",
          question: "Can you stage floor plans or do 2D staging?",
          answer: "Yes, we offer basic 2D staging overlays for floor plans. This service helps potential buyers visualize furniture placement and room flow in the property layout."
        },
        {
          id: "low-quality",
          question: "What if my photos are low quality?",
          answer: "We'll always try our best to work with the photos you provide. However, we'll let you know upfront if the image quality won't meet our professional standards so you can decide how to proceed."
        },
        {
          id: "styles-offered",
          question: "What furniture styles do you offer?",
          answer: "We offer a wide variety of styles including Modern, Transitional, Scandinavian, Farmhouse, Traditional, Contemporary, Industrial, and more. You can specify your preferred style when placing your order."
        },
        {
          id: "brand-guidelines",
          question: "Can you follow specific brand guidelines?",
          answer: "Yes! If you have specific brand guidelines or style preferences, just add notes to your order. We can match specific color schemes, furniture styles, or brand aesthetics."
        }
      ]
    },
    {
      id: "policies",
      title: "Policies & Terms",
      icon: HelpCircle,
      questions: [
        {
          id: "virtually-staged-label",
          question: "Do you label images as 'Virtually Staged'?",
          answer: "We can add watermarks or labels if requested. However, MLS compliance regarding virtual staging disclosures is your responsibility. We recommend checking your local MLS rules and regulations."
        },
        {
          id: "image-ownership",
          question: "Who owns the staged images?",
          answer: "You receive a license to use the staged images for marketing that specific property. This includes MLS listings, marketing materials, websites, and promotional use related to selling or renting that property."
        },
        {
          id: "cancellation",
          question: "What's your cancellation policy?",
          answer: "You maintain access to your account until the end of your current billing period. When you cancel, credit rollover resets, but you can use remaining credits until your subscription expires."
        },
        {
          id: "refunds",
          question: "Do you offer refunds?",
          answer: "We offer refunds if we fail to meet our promised service levels (like missing turnaround times). Otherwise, all sales are final. We're committed to delivering quality work that meets your expectations."
        },
        {
          id: "file-storage",
          question: "How long do you store my files?",
          answer: "We maintain your files for 90 days after completion. We recommend downloading and keeping local copies of your staged images for your records, as files are automatically purged after the retention period."
        }
      ]
    },
    {
      id: "support",
      title: "Support & Contact",
      icon: MessageSquare,
      questions: [
        {
          id: "contact-support",
          question: "How do I contact support?",
          answer: "You can reach our support team via email or live chat. Our hours are 9am-6pm ET, Monday through Friday. Subscribers receive priority support with faster response times."
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6">
              Frequently Asked <span className="text-primary">Questions</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know about our virtual staging services, pricing, and process. 
              Can't find what you're looking for? Contact our support team.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {faqSections.map((section) => (
              <Card key={section.id} className="overflow-hidden" data-testid={`faq-section-${section.id}`}>
                <CardHeader className="bg-muted/30">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <section.icon className="h-4 w-4 text-primary" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {section.questions.map((faq, index) => (
                      <Collapsible
                        key={faq.id}
                        open={openSections.has(faq.id)}
                        onOpenChange={() => toggleSection(faq.id)}
                      >
                        <CollapsibleTrigger
                          className="w-full text-left p-6 hover:bg-muted/30 transition-colors border-b border-border last:border-b-0 flex items-center justify-between gap-4"
                          data-testid={`faq-question-${faq.id}`}
                        >
                          <span className="font-medium text-foreground">
                            {faq.question}
                          </span>
                          {openSections.has(faq.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-1 data-[state=open]:slide-down-1">
                          <div className="px-6 pb-6 pt-2" data-testid={`faq-answer-${faq.id}`}>
                            <p className="text-muted-foreground leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}