import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, User, Settings, CreditCard } from "lucide-react"

export default function Portal() {
  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-6" data-testid="text-portal-title">
            Client <span className="text-primary">Portal</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access your account, manage your projects, and track your virtual staging orders.
          </p>
        </div>

        {/* Portal Access Card */}
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl mb-4">Customer Portal Access</CardTitle>
              <CardDescription className="text-lg">
                We'll redirect you to the secure Customer Portal where you can manage your account and orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
                <div className="flex flex-col items-center space-y-2">
                  <User className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Account Management</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Settings className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Project Tracking</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <CreditCard className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Billing & Credits</span>
                </div>
              </div>


              {/* Portal Button */}
              <Button 
                size="lg" 
                className="w-full md:w-auto px-8 py-4 text-lg font-bold rounded-lg"
                asChild
                data-testid="button-access-portal"
              >
                <a href="https://zaavty4ai0bz98pao9ou.app.clientclub.net/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Access Customer Portal
                </a>
              </Button>
              
              <p className="text-xs text-muted-foreground">
                You'll be redirected to a secure external portal to manage your account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}