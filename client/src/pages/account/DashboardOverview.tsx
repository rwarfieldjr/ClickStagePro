import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen, 
  Image, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  Plus,
  Zap,
  Calendar,
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalProjects: number;
  completedProjects: number;
  totalPhotos: number;
  unreadMessages: number;
  recentActivity: Array<{
    id: string;
    type: 'project_created' | 'project_completed' | 'message_received' | 'photo_uploaded';
    title: string;
    description: string;
    timestamp: string;
  }>;
}

export default function DashboardOverview() {
  // Fetch current user
  const { data: userResponse } = useQuery<{
    success: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>({
    queryKey: ['/api/auth/me'],
  });

  // Fetch dashboard statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    stats: DashboardStats;
  }>({
    queryKey: ['/api/dashboard/stats'],
    retry: 1
  });

  const user = userResponse?.user;
  const stats = statsData?.stats;

  const quickActions = [
    {
      title: "New Project",
      description: "Start a new staging project",
      icon: Plus,
      href: "/pricing",
      variant: "default" as const,
    },
    {
      title: "Upload Photos",
      description: "Add photos to existing project",
      icon: Image,
      href: "/account/photos",
      variant: "outline" as const,
    },
    {
      title: "View Messages",
      description: "Check your conversations",
      icon: MessageCircle,
      href: "/account/messages",
      variant: "outline" as const,
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created':
        return <FolderOpen className="w-4 h-4" />;
      case 'project_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'message_received':
        return <MessageCircle className="w-4 h-4" />;
      case 'photo_uploaded':
        return <Image className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome-title">
          Welcome back{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your virtual staging projects.
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>
            Get started with these common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Button
                  variant={action.variant}
                  size="lg"
                  className="w-full h-auto p-4 flex-col items-start space-y-2 hover-elevate"
                  data-testid={`button-quick-action-${action.title.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="flex items-center space-x-2 w-full">
                    <action.icon className="w-5 h-5" />
                    <span className="font-medium">{action.title}</span>
                  </div>
                  <p className="text-sm opacity-90 text-left">
                    {action.description}
                  </p>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-projects">
              {statsLoading ? '...' : stats?.totalProjects || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              All time projects
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-projects">
              {statsLoading ? '...' : stats?.completedProjects || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Projects completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photos Processed</CardTitle>
            <Image className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-photos">
              {statsLoading ? '...' : stats?.totalPhotos || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Images staged
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold" data-testid="text-unread-messages">
                {statsLoading ? '...' : stats?.unreadMessages || '0'}
              </div>
              {stats && stats.unreadMessages > 0 && (
                <Badge variant="destructive" className="text-xs">
                  New
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Unread messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>
            Your latest project updates and interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-48" />
                      <div className="h-3 bg-muted rounded w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Activity Yet
              </h3>
              <p className="text-muted-foreground">
                Start your first project to see activity here.
              </p>
              <Link href="/pricing">
                <Button className="mt-4" data-testid="button-start-first-project">
                  Start Your First Project
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}