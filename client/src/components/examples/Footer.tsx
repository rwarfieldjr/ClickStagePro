import { ThemeProvider } from '../ThemeProvider'
import { Footer } from '../Footer'

export default function FooterExample() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 p-8">
          <p className="text-muted-foreground">Page content above footer</p>
        </div>
        <Footer />
      </div>
    </ThemeProvider>
  )
}