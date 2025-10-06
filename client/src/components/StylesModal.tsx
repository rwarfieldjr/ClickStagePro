import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { STYLES } from "@/lib/styleCatalog";
import { resolveStyleImage } from "@/lib/styleImages";

interface StylesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StylesModal({ open, onOpenChange }: StylesModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<{ title: string; image: string } | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-3xl font-bold font-display">Our Staging Styles</DialogTitle>
          <p className="text-muted-foreground mb-6">
            Choose from our curated collection of professional staging styles designed to showcase your property's full potential
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STYLES.map((style) => (
              <div key={style.slug} className="group">
                <button
                  onClick={() => setSelectedStyle({ title: style.title, image: resolveStyleImage(style.slug) })}
                  className="relative overflow-hidden rounded-lg mb-3 aspect-[4/3] w-full cursor-pointer hover-elevate active-elevate-2"
                  data-testid={`button-style-${style.slug}`}
                >
                  <img 
                    src={resolveStyleImage(style.slug)} 
                    alt={`${style.title} staging style`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveStyleImage("placeholder"); }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <ZoomIn className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </button>
                <h3 className="text-lg font-semibold mb-2" data-testid={`text-style-${style.slug}`}>
                  {style.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {style.desc}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Zoomed Image Dialog */}
      <Dialog open={!!selectedStyle} onOpenChange={() => setSelectedStyle(null)}>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="sr-only">{selectedStyle?.title} - Full View</DialogTitle>
          {selectedStyle && (
            <div className="relative">
              <button
                onClick={() => setSelectedStyle(null)}
                className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur hover-elevate active-elevate-2 z-10"
                data-testid="button-close-zoom"
              >
                <X className="h-5 w-5" />
              </button>
              <img 
                src={selectedStyle.image} 
                alt={selectedStyle.title}
                className="w-full h-auto rounded-lg"
              />
              <p className="mt-4 text-center text-xl font-semibold">{selectedStyle.title}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
