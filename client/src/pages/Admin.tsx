import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Eye, Trash2, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react"
import type { StagingRequest } from "@shared/schema"

export default function Admin() {
  const [apiKey, setApiKey] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { toast } = useToast()
  
  // Check if API key is stored in localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem("admin_api_key")
    if (storedKey) {
      setApiKey(storedKey)
      setIsAuthenticated(true)
    }
  }, [])

  // Fetch staging requests with API key authentication
  const { data: stagingRequests = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/staging-requests", apiKey],
    queryFn: async () => {
      if (!isAuthenticated || !apiKey) return []
      
      const response = await fetch("/api/staging-requests", {
        headers: {
          "X-API-Key": apiKey,
        },
      })
      
      if (response.status === 401) {
        setIsAuthenticated(false)
        localStorage.removeItem("admin_api_key")
        throw new Error("Invalid API key")
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch staging requests")
      }
      
      const result = await response.json()
      return result.data || []
    },
    enabled: isAuthenticated && !!apiKey,
  })

  const handleLogin = () => {
    if (apiKey.trim()) {
      localStorage.setItem("admin_api_key", apiKey.trim())
      setIsAuthenticated(true)
      toast({
        title: "Authentication Successful",
        description: "Welcome to the admin dashboard!",
      })
    } else {
      toast({
        title: "API Key Required",
        description: "Please enter your admin API key to continue.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    setApiKey("")
    setIsAuthenticated(false)
    localStorage.removeItem("admin_api_key")
    toast({
      title: "Logged Out",
      description: "You have been logged out of the admin dashboard.",
    })
  }

  const handleDeleteRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/staging-requests/${id}`, {
        method: "DELETE",
        headers: {
          "X-API-Key": apiKey,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete staging request")
      }

      toast({
        title: "Request Deleted",
        description: "The staging request has been permanently deleted.",
      })
      
      refetch()
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the staging request. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Authentication form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>
              Enter your API key to access the ClickStage Pro admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Admin API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                data-testid="input-api-key"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full"
              data-testid="button-login"
            >
              Access Dashboard
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Contact your system administrator if you don't have an API key.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main admin dashboard
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage staging requests and client inquiries</p>
        </div>
        <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
          Logout
        </Button>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests" data-testid="tab-requests">
            Staging Requests ({stagingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading staging requests...</div>
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <p className="font-semibold">Error Loading Data</p>
                  <p className="text-sm">{error.message}</p>
                  <Button variant="outline" onClick={() => refetch()} className="mt-4">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : stagingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p className="font-semibold">No Staging Requests</p>
                  <p className="text-sm">New requests will appear here once submitted.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {stagingRequests.map((request: StagingRequest) => (
                <RequestCard 
                  key={request.id} 
                  request={request} 
                  onDelete={() => handleDeleteRequest(request.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stagingRequests.length}</div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {stagingRequests.filter((r: StagingRequest) => 
                    r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString()
                  ).length}
                </div>
                <p className="text-sm text-muted-foreground">Today's Requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {stagingRequests.filter((r: StagingRequest) => 
                    r.createdAt && 
                    new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </div>
                <p className="text-sm text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RequestCard({ request, onDelete }: { request: StagingRequest; onDelete: () => void }) {
  return (
    <Card className="hover-elevate">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {request.name}
              <Badge variant="secondary" className="text-xs">
                {request.propertyType}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {request.email}
              </span>
              {request.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {request.phone}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-view-${request.id}`}>
                  <Eye className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Staging Request Details</DialogTitle>
                  <DialogDescription>
                    Request from {request.name}
                  </DialogDescription>
                </DialogHeader>
                <RequestDetails request={request} />
              </DialogContent>
            </Dialog>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onDelete}
              data-testid={`button-delete-${request.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {request.rooms} rooms • {request.propertyType}
          </span>
          {request.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {request.message && (
          <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
            {request.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function RequestDetails({ request }: { request: StagingRequest }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-1">Contact Information</h4>
          <div className="space-y-1">
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {request.email}
            </p>
            {request.phone && (
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {request.phone}
              </p>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-1">Property Details</h4>
          <div className="space-y-1">
            <p><span className="text-muted-foreground">Type:</span> {request.propertyType}</p>
            <p><span className="text-muted-foreground">Rooms:</span> {request.rooms}</p>
            {request.createdAt && (
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {new Date(request.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {request.message && (
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-2">Message</h4>
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{request.message}</p>
          </div>
        </div>
      )}

      {request.propertyImages && request.propertyImages.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-2">
            Property Photos ({request.propertyImages.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {request.propertyImages.map((imagePath, index) => (
              <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                <img 
                  src={imagePath} 
                  alt={`Property photo ${index + 1}`}
                  className="w-full h-full object-cover hover-elevate cursor-pointer"
                  onClick={() => window.open(imagePath, '_blank')}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">Request ID: {request.id}</p>
      </div>
    </div>
  )
}