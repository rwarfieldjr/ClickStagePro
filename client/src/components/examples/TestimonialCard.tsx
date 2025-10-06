import { TestimonialCard } from '../TestimonialCard'
import clientAvatar from '@/assets/styles/placeholder.png'
import agentAvatar from '@/assets/styles/placeholder.png'

export default function TestimonialCardExample() {
  return (
    <div className="p-8 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <TestimonialCard
          name="Sarah Johnson"
          role="Real Estate Agent"
          company="Century 21"
          content="ClickStage Pro transformed my listings completely. Properties that sat on the market for months sold within weeks after virtual staging. The quality is incredible!"
          rating={5}
          avatar={clientAvatar}
        />
        <TestimonialCard
          name="Michael Chen"
          role="Property Manager"
          company="Elite Properties"
          content="The 12-hour rush delivery is a game-changer. My clients love seeing their properties staged before they hit the market."
          rating={5}
          avatar={agentAvatar}
        />
      </div>
    </div>
  )
}