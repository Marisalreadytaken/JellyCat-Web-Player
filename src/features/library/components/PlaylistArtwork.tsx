import { useArtworkUrl, icons } from "@shared/ui";

export function PlaylistArtwork({ itemId, tag, icon: Icon = icons.playlist }: { itemId?: string; tag?: string; icon?: typeof icons.album }) {
  const url = useArtworkUrl(itemId, tag, 1000);

  return (
    <div className="playlist-detail-artwork">
      {url ? (
        <>
          <img className="playlist-detail-artwork-bg" src={url} alt="" aria-hidden="true" />
          <img className="playlist-detail-artwork-cover" src={url} alt="" loading="lazy" decoding="async" />
        </>
      ) : (
        <div className="art-placeholder"><Icon size={36} /></div>
      )}
    </div>
  );
}
