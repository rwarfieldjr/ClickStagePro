# ClickStage Pro Virtual Staging - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from leading property tech platforms like Airbnb, Zillow, and modern SaaS applications, emphasizing visual storytelling and professional credibility for AI-powered virtual staging services.

## Core Design Elements

### A. Color Palette
**Primary Colors (Dark Mode):**
- Background: 20 8% 12% (deep charcoal)
- Surface: 25 6% 18% (warm dark gray)
- Primary Brand: 210 85% 58% (professional blue)
- Text Primary: 0 0% 95% (near white)

**Primary Colors (Light Mode):**
- Background: 0 0% 98% (soft white)
- Surface: 0 0% 100% (pure white)
- Primary Brand: 210 85% 48% (deeper professional blue)
- Text Primary: 20 8% 15% (dark charcoal)

**Accent Colors:**
- Success: 142 76% 36% (professional green)
- Warning: 38 92% 50% (amber)
- Subtle Accent: 270 30% 85% (soft lavender - used sparingly)

### B. Typography
- **Primary Font**: Inter (Google Fonts) - clean, modern, highly legible
- **Display Font**: Poppins (Google Fonts) - for headings and hero sections
- **Font Hierarchy**: 
  - Hero: text-5xl/6xl (Poppins, bold)
  - Headers: text-2xl/3xl (Poppins, semibold)
  - Body: text-base/lg (Inter, regular)
  - Captions: text-sm (Inter, medium)

### C. Layout System
**Tailwind Spacing Units**: Consistent use of 4, 8, 16, and 24 (p-4, m-8, gap-16, py-24)
- Micro spacing: 4 units
- Component spacing: 8 units
- Section spacing: 16 units
- Major layout spacing: 24 units

### D. Component Library

**Navigation:**
- Clean header with logo, main nav links, and prominent CTA button
- Sticky navigation with subtle shadow on scroll
- Mobile hamburger menu with slide-out panel

**Hero Section:**
- Full-viewport hero with gradient overlay (210 85% 58% to 270 30% 65%)
- Large hero heading with subtitle
- Primary and secondary CTA buttons
- Background: Subtle animated gradient or high-quality staging transformation image

**Before/After Gallery:**
- Interactive slider comparison tool
- Grid layout for portfolio items
- Hover effects revealing project details
- Modal lightbox for detailed views

**Forms:**
- Modern floating label design
- File upload with drag-and-drop for property photos
- Multi-step form for service requests
- Inline validation with helpful error states

**Cards & Content Blocks:**
- Elevated cards with subtle shadows
- Service feature cards with icons
- Testimonial cards with client photos
- Pricing tier cards with clear feature comparison

### E. Visual Treatment

**Gradients:**
- Hero background: Subtle diagonal gradient from primary blue to soft purple
- CTA buttons: Gentle gradient on hover states
- Section dividers: Minimal gradient borders

**Photography & Images:**
- High-quality before/after staging photos as primary content
- Professional property photography
- Consistent aspect ratios (16:9 for hero, 4:3 for gallery)
- Subtle image overlays for text readability

**Shadows & Depth:**
- Subtle elevation: shadow-sm for cards
- Interactive elements: shadow-md on hover
- Modals and dropdowns: shadow-xl

## Go High Level Compatibility
- Clean HTML structure with semantic elements
- External CSS/JS references via CDN
- Modular component approach for easy drag-and-drop integration
- Script tags placed as separate elements outside div containers
- Form integration compatible with GHL form builders

## Key Design Principles
1. **Visual Storytelling**: Emphasize dramatic before/after transformations
2. **Professional Trust**: Clean, corporate aesthetic builds credibility
3. **Conversion Focus**: Clear CTAs and streamlined user journeys
4. **Mobile-First**: Responsive design prioritizing mobile experience
5. **Performance**: Optimized images and minimal animations

## Images
- **Hero Image**: Large, high-impact before/after split or transformation video
- **Gallery Images**: Curated portfolio of staging transformations in consistent grid
- **Service Icons**: Simple line icons for different staging services
- **Testimonial Photos**: Professional headshots of satisfied clients
- **About Section**: Professional team photo or AI staging process visualization