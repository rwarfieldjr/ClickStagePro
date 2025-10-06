import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Clock, Award, Users } from "lucide-react"

const features = [
  {
    icon: Clock,
    title: "24 to 48 hr delivery",
    description: "Get your staged photos back within 1-2 business days"
  },
  {
    icon: Award,
    title: "Premium Quality",
    description: "Photorealistic results that look like real furniture"
  },
  {
    icon: Users,
    title: "Expert Support",
    description: "Dedicated team to help with your staging needs"
  }
]

export default function Contact() {
  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold font-display mb-4" data-testid="text-contact-title">
            Place <span className="text-primary">Staging Order</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-6">Easy As 1, 2, 3</p>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {/* GoHighLevel Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl md:text-4xl font-bold underline mb-1">Staging Order Process</CardTitle>
                <CardDescription className="text-center mt-1">
                  <div className="space-y-3 text-lg md:text-xl">
                    <div>Step 1: Provide Your Contact Information</div>
                    <div>Step 2: Upload Your Photos and Select Your Style</div>
                    <div>Step 3: Select Your Bundle and Submit Payment!</div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 'auto' }}>
                  <iframe 
                    src="https://api.leadconnectorhq.com/widget/survey/1aS0fExOqo8gzkq2ypFO" 
                    style={{ border: 'none', width: '100%', height: '1800px', minHeight: '1200px' }}
                    scrolling="no" 
                    id="1aS0fExOqo8gzkq2ypFO" 
                    title="survey"
                  ></iframe>
                  <script src="https://link.msgsndr.com/js/form_embed.js" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Other content */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Get In Touch</CardTitle>
                <CardDescription>
                  Ready to get started? Contact us directly or fill out the form.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">(864) 400-0766</div>
                    <div className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM EST</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">support@clickstagepro.com</div>
                    <div className="text-sm text-muted-foreground">Email Support</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Greenville, SC</div>
                    <div className="text-sm text-muted-foreground">Serving Nationwide</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why Choose Us?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{feature.title}</div>
                      <div className="text-xs text-muted-foreground">{feature.description}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}