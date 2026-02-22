import { useMemo } from "react";
import ChartThumbnail from "./ChartThumbnail";

function getNoveltyColor(score) {
  if (score >= 90) return "novelty-high";
  if (score >= 70) return "novelty-mid";
  return "novelty-low";
}

export default function MasonryGallery({ rows, onSelectRow }) {
  // We'll calculate a pseudo-random height or layout style for varied card sizes
  // to enhance the masonry effect, using the post title and date as seed.

  const cards = useMemo(() => {
    return rows.map((row) => {
      // Create a deterministic pseudo-random height class based on chart length
      // to make the masonry grid look more dynamic (like Pinterest)
      return {
        ...row
      };
    });
  }, [rows]);

  if (!cards || cards.length === 0) {
    return <div className="gallery-empty">No charts found.</div>;
  }

  return (
    <div className="masonry-grid">
      {cards.map((card) => (
        <button
          type="button"
          key={card.post_id || card.path}
          className="gallery-card"
          onClick={() => {
            if (onSelectRow) onSelectRow(card);
          }}
        >
          {/* Lazy loaded live chart thumbnail */}
          <ChartThumbnail path={card.path} />

          <div className="card-content">
            <div className="card-header">
              <span className="card-date">{card.date}</span>
              {card.novelty_score !== undefined && (
                <span className={`card-score ${getNoveltyColor(card.novelty_score)}`}>
                  N-Score: {card.novelty_score}
                </span>
              )}
            </div>
            
            <h3 className="card-title">{card.title}</h3>
            
            <div className="card-chart-type">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              {card.chart_id || "Unknown Chart"}
            </div>

            {/* If we have tags in the index, show them */}
            {card.tags && card.tags.length > 0 && (
              <div className="card-tags">
                {card.tags.map((tag) => (
                  <span key={tag} className="card-tag">#{tag}</span>
                ))}
              </div>
            )}
          </div>
          
          <div className="card-overlay">
            <span>View Detail →</span>
          </div>
        </button>
      ))}
    </div>
  );
}
