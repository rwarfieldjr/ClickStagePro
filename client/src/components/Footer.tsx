import { Link } from "wouter"
import { Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-card border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">CS</span>
              </div>
              <span className="font-display font-semibold text-xl">ClickStage Pro</span>
            </div>
            <p className="text-muted-foreground max-w-md mb-6">
              Transform empty properties into buyer's dreams with our professional AI-powered virtual staging services. 
              Sell homes faster with stunning visualizations.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(864) 400-0766</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>support@clickstagepro.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Greenville, SC</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services#residential" className="text-muted-foreground hover:text-foreground text-sm">
                  Residential Virtual Staging
                </Link>
              </li>
              <li>
                <Link to="/services#commercial" className="text-muted-foreground hover:text-foreground text-sm">
                  Commercial Virtual Staging
                </Link>
              </li>
              <li>
                <Link to="/services#multi-family" className="text-muted-foreground hover:text-foreground text-sm">
                  Multi-Family Apartment Staging
                </Link>
              </li>
              <li>
                <Link to="/services#photo-enhancement" className="text-muted-foreground hover:text-foreground text-sm">
                  Photo Enhancement
                </Link>
              </li>
              <li>
                <Link to="/services#decluttering" className="text-muted-foreground hover:text-foreground text-sm">
                  Room Decluttering
                </Link>
              </li>
              <li>
                <Link to="/services#interior-renovation" className="text-muted-foreground hover:text-foreground text-sm">
                  Interior Renovation Ideas
                </Link>
              </li>
              <li>
                <Link to="/services#exterior-renovation" className="text-muted-foreground hover:text-foreground text-sm">
                  Exterior Renovation Ideas
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground text-sm">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="text-muted-foreground hover:text-foreground text-sm">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link to="/contact-us" className="text-muted-foreground hover:text-foreground text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/place-order" className="text-muted-foreground hover:text-foreground text-sm">
                  Place Staging Order
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-4 pt-4 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">© 2025 ClickStage Pro. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground text-sm">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-muted-foreground hover:text-foreground text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}