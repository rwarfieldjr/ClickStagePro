import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import Home from "@/pages/Home";
import Contact from "@/pages/Contact";
import ContactUs from "@/pages/ContactUs";
import OrderPacks from "@/pages/OrderPacks";
import Subscribe from "@/pages/Subscribe";
import ClientPortalPage from "@/pages/ClientPortalPage";
import Pricing from "@/pages/Pricing";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import OrderCompletion from "@/pages/OrderCompletion";
import FinalConfirmation from "@/pages/FinalConfirmation";
import Admin from "@/pages/Admin";
import Services from "@/pages/Services";
import About from "@/pages/About";
import Portfolio from "@/pages/Portfolio";
import FAQ from "@/pages/FAQ";
import Styles from "@/pages/Styles";
import AccountDashboard from "@/pages/AccountDashboard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import UploadPhotos from "@/pages/UploadPhotos";
import VAUploads from "@/pages/VAUploads";
import PlaceOrder from "@/pages/PlaceOrder";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";

// Component to handle scroll to top on route changes
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        {/* Native static pages - do not intercept these routes */}
        <Route path="/order-step-1.html">{() => { window.location.href = '/order-step-1.html'; return null; }}</Route>
        <Route path="/upload.html">{() => { window.location.href = '/upload.html'; return null; }}</Route>
        <Route path="/thank-you.html">{() => { window.location.href = '/thank-you.html'; return null; }}</Route>
        
        <Route path="/" component={Home} />
        <Route path="/contact" component={Contact} />
        <Route path="/contact-us" component={ContactUs} />
        <Route path="/order-packs" component={OrderPacks} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/portal" component={ClientPortalPage} />
        <Route path="/client-portal" component={ClientPortalPage} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/payment-cancel" component={PaymentCancel} />
        <Route path="/order-completion" component={OrderCompletion} />
        <Route path="/order-complete" component={FinalConfirmation} />
        <Route path="/admin" component={Admin} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/services" component={Services} />
        <Route path="/faq" component={FAQ} />
        <Route path="/styles" component={Styles} />
        <Route path="/about" component={About} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/upload-photos" component={UploadPhotos} />
        <Route path="/va/uploads" component={VAUploads} />
        <Route path="/place-order" component={PlaceOrder} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/account" component={AccountDashboard} />
        <Route path="/account/:rest*" component={AccountDashboard} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <AuthProvider>
              <div className="min-h-screen flex flex-col bg-background text-foreground">
                <Header />
                <main className="flex-1">
                  <Router />
                </main>
                <Footer />
              </div>
              <ChatWidget />
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
