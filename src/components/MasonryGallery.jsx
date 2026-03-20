import { useMemo } from "react";
import ChartThumbnail from "./ChartThumbnail";

function getNoveltyColor(score) {
  if (score >= 90) return "novelty-high";
  if (score >= 70) return "novelty-mid";
  return "novelty-low";
}

export default function MasonryGallery({ rows, onSelectRow, onSearchTag }) {
  const cards = useMemo(() => {
    return rows.map((row) => ({
      ...row,
    }));
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
          <div className="card-media">
            <ChartThumbnail path={card.path} thumbnail={card.thumbnail} />
            <div className="card-overlay" aria-hidden="true">
              <span>View Detail</span>
            </div>
          </div>

          <div className="card-content">
            <div className="card-header" style={{ justifyContent: "flex-end" }}>
              {card.novelty_score !== undefined && (
                <span className={`card-score ${getNoveltyColor(card.novelty_score)}`}>
                  N-Score: {card.novelty_score}
                </span>
              )}
            </div>

            <h3 className="card-title">{card.title}</h3>

            <div className="card-chart-type">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              {card.chart_id || "Unknown Chart"}
            </div>

            {card.tags && card.tags.length > 0 && (
              <div className="card-tags">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="card-tag"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSearchTag) onSearchTag(tag);
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
