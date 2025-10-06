import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, LogIn, UserPlus } from "lucide-react";
import DashboardOverview from "./account/DashboardOverview";
import Projects from "./account/Projects";
import ProjectDetail from "./account/ProjectDetail";
import Photos from "./account/Photos";
import Messages from "./account/Messages";
import Support from "./account/Support";
import Billing from "./account/Billing";
import Profile from "./account/Profile";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  createdAt: string;
}

export default function AccountDashboard() {
  const [location, setLocation] = useLocation();
  
  // Check authentication status
  const { data: userResponse, isLoading, error } = useQuery<{
    success: boolean;
    user: UserProfile;
  }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Custom sidebar width for account dashboard
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full">
        <div className="w-80 border-r bg-sidebar">
          <div className="p-4">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-10" />
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="space-y-4 text-center">
              <Skeleton className="h-12 w-64 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Authentication error or user not authenticated
  if (error || !userResponse?.success || !userResponse?.user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              You need to be signed in to access your account dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Button onClick={() => setLocation("/login")} data-testid="button-sign-in">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/register")}
                data-testid="button-sign-up"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </div>
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/")}
                data-testid="button-back-home"
                className="text-sm"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated, render the dashboard
  // Determine which page to show based on location
  let PageComponent = DashboardOverview;
  if (location === '/account/projects') PageComponent = Projects;
  else if (location.startsWith('/account/projects/')) PageComponent = ProjectDetail;
  else if (location === '/account/photos') PageComponent = Photos;
  else if (location === '/account/messages') PageComponent = Messages;
  else if (location === '/account/support') PageComponent = Support;
  else if (location === '/account/billing') PageComponent = Billing;
  else if (location === '/account/profile') PageComponent = Profile;
  
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center space-x-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold text-foreground">
                Account Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {userResponse.user.firstName || userResponse.user.email}
              </span>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <PageComponent />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}