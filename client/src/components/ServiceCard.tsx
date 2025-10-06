import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, LucideIcon } from "lucide-react"

interface ServiceCardProps {
  icon: LucideIcon
  title: string
  description: string
  price: string
  features: string[]
  popular?: boolean
}

export function ServiceCard({ icon: Icon, title, description, price, features, popular = false }: ServiceCardProps) {
  return (
    <Card className={`relative h-full ${popular ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </div>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <div className="text-2xl font-bold text-primary mt-1">{price}</div>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mr-3" />
              {feature}
            </li>
          ))}
        </ul>
        
        <Button 
          className="w-full" 
          variant={popular ? "default" : "outline"}
          data-testid={`button-choose-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          Choose {title}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}