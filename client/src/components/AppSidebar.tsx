import { Home, FolderOpen, Image, MessageCircle, HelpCircle, CreditCard, User } from "lucide-react";
import { useLocation, Link } from "wouter";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Account dashboard menu items
const menuItems = [
  {
    title: "Dashboard",
    url: "/account",
    icon: Home,
  },
  {
    title: "Projects",
    url: "/account/projects",
    icon: FolderOpen,
  },
  {
    title: "Photos",
    url: "/account/photos",
    icon: Image,
  },
  {
    title: "Messages",
    url: "/account/messages",
    icon: MessageCircle,
  },
  {
    title: "Support",
    url: "/account/support",
    icon: HelpCircle,
  },
  {
    title: "Billing",
    url: "/account/billing",
    icon: CreditCard,
  },
  {
    title: "Profile",
    url: "/account/profile",
    icon: User,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/account" && location.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase()}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}