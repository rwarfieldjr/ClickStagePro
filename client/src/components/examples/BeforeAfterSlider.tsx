import { BeforeAfterSlider } from '../BeforeAfterSlider'
import beforeImage from '@assets/generated_images/Empty_bedroom_before_staging_59928103.png'
import afterImage from '@assets/generated_images/Staged_bedroom_after_transformation_5b7031f7.png'

export default function BeforeAfterSliderExample() {
  return (
    <div className="p-8 bg-background">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Before/After Slider</h2>
        <BeforeAfterSlider
          beforeImage={beforeImage}
          afterImage={afterImage}
          beforeLabel="Empty Room"
          afterLabel="Staged"
          className="aspect-[4/3]"
        />
      </div>
    </div>
  )
}