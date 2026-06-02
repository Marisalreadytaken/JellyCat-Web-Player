import { useMemo } from "react";
import { Music, type LucideIcon } from "lucide-react";
import { jellyfinClient } from "@core/jellyfin";

export function useArtworkUrl(itemId?: string, tag?: string, maxHeight = 500) {
  return useMemo(() => {
    if (!itemId) return undefined;
    try {
      return jellyfinClient.artworkUrl(itemId, tag, maxHeight);
    } catch {
      return undefined;
    }
  }, [itemId, tag, maxHeight]);
}

export function Artwork({ itemId, tag, icon: Icon = Music, className = "artwork", maxHeight = 300 }: {
  itemId?: string;
  tag?: string;
  icon?: LucideIcon;
  className?: string;
  maxHeight?: number;
}) {
  const url = useArtworkUrl(itemId, tag, maxHeight);
  return (
    <div className={className}>
      {url ? <img src={url} alt="" loading="lazy" decoding="async" /> : <div className="art-placeholder"><Icon size={28} /></div>}
    </div>
  );
}
