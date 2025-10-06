import { ThemeProvider } from '../ThemeProvider'
import { HeroSection } from '../HeroSection'

export default function HeroSectionExample() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <HeroSection />
      </div>
    </ThemeProvider>
  )
}