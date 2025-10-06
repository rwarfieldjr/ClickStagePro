import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { STYLES } from "@/lib/styleCatalog";
import { resolveStyleImage } from "@/lib/styleImages";

export default function Styles() {
  const [selectedStyle, setSelectedStyle] = useState<{ name: string; image: string } | null>(null);

  const styles = STYLES.map(style => ({
    name: style.title,
    slug: style.slug,
    image: resolveStyleImage(style.slug),
    description: style.desc
  }));

  return (
    <>
      <Helmet>
        <title>Staging Styles | ClickStage Pro Virtual Staging</title>
        <meta 
          name="description" 
          content="Explore our professional virtual staging styles including Modern Farmhouse, Coastal, Scandinavian, Contemporary, Mid-Century Modern, Mountain Rustic, and Transitional designs." 
        />
      </Helmet>

      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6" data-testid="text-styles-title">
              Our Staging <span className="text-primary">Styles</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose from our curated collection of professional staging styles designed to showcase your property's full potential and attract the right buyers
            </p>
          </div>

          {/* Styles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {styles.map((style) => (
              <div 
                key={style.slug}
                className="group"
                data-testid={`style-${style.slug}`}
              >
                <button
                  onClick={() => setSelectedStyle({ name: style.name, image: style.image })}
                  className="relative overflow-hidden rounded-lg mb-4 aspect-[4/3] w-full cursor-pointer hover-elevate active-elevate-2"
                  data-testid={`button-view-${style.slug}`}
                >
                  <img 
                    src={style.image} 
                    alt={`${style.name} staging style example`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </button>
                <h3 className="text-2xl font-semibold mb-3" data-testid={`text-${style.slug}`}>
                  {style.name}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {style.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="bg-muted/50 rounded-2xl p-12">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Property?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Select your preferred style during the upload process and watch your empty rooms come to life with professional staging
              </p>
              <a 
                href="/place-order" 
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                data-testid="button-get-started"
              >
                Place Staging Order
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedStyle} onOpenChange={() => setSelectedStyle(null)}>
        <DialogContent className="max-w-6xl w-full p-0" data-testid="dialog-image-viewer">
          <DialogTitle className="sr-only">
            {selectedStyle?.name} - Full Size View
          </DialogTitle>
          {selectedStyle && (
            <div className="relative">
              <img 
                src={selectedStyle.image} 
                alt={`${selectedStyle.name} - Full size view`}
                className="w-full h-auto rounded-lg"
                data-testid="img-expanded-style"
              />
              <button
                onClick={() => setSelectedStyle(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                data-testid="button-close-viewer"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 rounded-b-lg">
                <h3 className="text-white text-2xl font-semibold">{selectedStyle.name}</h3>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
