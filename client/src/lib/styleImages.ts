import imgModernFarmhouse   from "../assets/styles/modern-farmhouse.png";
import imgCoastal           from "../assets/styles/coastal.png";
import imgScandinavian      from "../assets/styles/scandinavian.png";
import imgContemporary      from "../assets/styles/contemporary.png";
import imgMidCenturyModern  from "../assets/styles/mid-century-modern.png";
import imgMountainRustic    from "../assets/styles/mountain-rustic.png";
import imgTransitional      from "../assets/styles/transitional.png";
import imgJapandi           from "../assets/styles/japandi.png";
import imgPlaceholder       from "../assets/styles/placeholder.png";

export const STYLE_IMAGES: Record<string, string> = {
  "modern-farmhouse":   imgModernFarmhouse,
  "coastal":            imgCoastal,
  "scandinavian":       imgScandinavian,
  "contemporary":       imgContemporary,
  "mid-century-modern": imgMidCenturyModern,
  "mountain-rustic":    imgMountainRustic,
  "transitional":       imgTransitional,
  "japandi":            imgJapandi,
  "placeholder":        imgPlaceholder,
};

export function resolveStyleImage(slug: string) {
  return STYLE_IMAGES[slug] || STYLE_IMAGES["placeholder"];
}
