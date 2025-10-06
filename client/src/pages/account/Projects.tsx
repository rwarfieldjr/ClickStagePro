import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Calendar, 
  MapPin, 
  Image as ImageIcon, 
  Filter,
  FolderOpen,
  Plus,
  Eye
} from "lucide-react";
import { Link } from "wouter";

interface Project {
  id: string;
  name: string;
  email: string;
  propertyType: string;
  addressLine1: string;
  city: string;
  state: string;
  rooms: string;
  photosPurchased: number;
  originalPhotos: number;
  stagedPhotos: number;
  totalPhotos: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  planType: string;
  planName: string;
}

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch user's projects
  const { data: projectsData, isLoading } = useQuery<{
    success: boolean;
    data: Project[];
  }>({
    queryKey: ['/api/projects'],
    retry: 1
  });

  const projects = projectsData?.data || [];

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-projects-title">
            My Projects
          </h1>
          <p className="text-muted-foreground">
            Manage and track your virtual staging projects
          </p>
        </div>
        <Link href="/pricing">
          <Button data-testid="button-new-project">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Filter className="w-5 h-5" />
            <span>Filter Projects</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, address, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-projects"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {projects.length === 0 ? "No Projects Yet" : "No Matching Projects"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {projects.length === 0 
                ? "Start your first virtual staging project to see it here."
                : "Try adjusting your search terms or filters."
              }
            </p>
            {projects.length === 0 && (
              <Link href="/pricing">
                <Button data-testid="button-start-first-project">
                  Start Your First Project
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover-elevate">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg" data-testid={`text-project-name-${project.id}`}>
                        {project.name}
                      </CardTitle>
                      <Badge variant="outline">
                        {project.planType === 'onetime' ? 'One-time' : 'Subscription'}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{project.addressLine1}, {project.city}, {project.state}</span>
                      </span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      project.status === 'completed' ? 'default' : 
                      project.status === 'in_progress' ? 'secondary' : 
                      'outline'
                    }>
                      {project.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(project.createdAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Property Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Property Type</span>
                      <div className="font-medium capitalize">
                        {project.propertyType.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rooms</span>
                      <div className="font-medium">{project.rooms}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Photos Purchased</span>
                      <div className="font-medium">{project.photosPurchased}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Original Images</span>
                      <div className="font-medium">{project.originalPhotos}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Staged Images</span>
                      <div className="font-medium">{project.stagedPhotos}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {project.photosPurchased > 0 && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${getProgressPercentage(project.stagedPhotos, project.photosPurchased)}%` 
                        }}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-2">
                      <Link href={`/account/projects/${project.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-view-project-${project.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      <Link href="/account/photos">
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-view-photos-${project.id}`}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Photos ({project.totalPhotos})
                        </Button>
                      </Link>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}