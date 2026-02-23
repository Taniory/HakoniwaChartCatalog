"""Add 'aliases' field to all post JSON files.

Maps chart_id -> list of alternative chart names that are conceptually
the same or very similar visualization.
"""
import json
import glob

# Define aliases mapping: chart_id -> list of alternative IDs
ALIASES_MAP = {
    "butterfly-chart": ["population-pyramid", "diverging-bar", "tornado-chart"],
    "boxplot": ["box-and-whisker"],
    "violin-plot": ["density-plot", "bean-plot"],
    "ridgeline-plot": ["joyplot", "density-ridges"],
    "doughnut-chart": ["donut-chart", "ring-chart"],
    "nightingale-rose": ["coxcomb-chart", "polar-area-chart", "rose-chart"],
    "stacked-area": ["area-chart-stacked"],
    "step-line": ["step-chart", "staircase-chart"],
    "step-area-chart": ["step-area", "staircase-area"],
    "threshold-line": ["reference-line-chart"],
    "confidence-band": ["error-band", "uncertainty-band"],
    "error-bar-chart": ["error-whisker"],
    "heatmap": ["matrix-heatmap"],
    "calendar-heatmap": ["github-heatmap", "activity-heatmap"],
    "circular-heatmap": ["radial-heatmap"],
    "treemap": ["tree-map", "mosaic-treemap"],
    "tree-chart": ["dendrogram", "hierarchy-chart"],
    "sunburst": ["sunburst-chart", "multi-level-pie"],
    "network-graph": ["force-directed-graph", "node-link-diagram"],
    "arc-diagram": ["arc-graph"],
    "chord-diagram": ["dependency-wheel", "ribbon-chart"],
    "sankey-diagram": ["alluvial-diagram", "flow-diagram"],
    "parallel-coordinates": ["parallel-axes"],
    "parallel-sets": ["categorical-parallel"],
    "funnel-chart": ["funnel-plot", "conversion-funnel"],
    "gauge-chart": ["speedometer-chart", "dial-chart"],
    "waterfall-chart": ["bridge-chart", "cascade-chart"],
    "candlestick": ["ohlc-chart", "stock-chart"],
    "radar-chart": ["spider-chart", "web-chart", "star-chart"],
    "polar-bar-chart": ["radial-bar-chart"],
    "polar-stacked-bar": ["radial-stacked-bar"],
    "polar-scatter": ["radial-scatter"],
    "polar-line": ["spiral-chart", "radial-line"],
    "pictorial-bar": ["isotype-chart", "pictogram-bar"],
    "bump-chart": ["rank-chart"],
    "slope-graph": ["slope-chart", "before-after-chart"],
    "lollipop-chart": ["lollipop-plot", "dot-plot"],
    "dumbbell-chart": ["dumbbell-plot", "gap-chart"],
    "bullet-chart": ["bullet-graph"],
    "punchcard-chart": ["bubble-matrix", "dot-matrix"],
    "barcode-chart": ["strip-plot", "tick-plot"],
    "scatter-matrix": ["splom", "scatter-plot-matrix", "pairs-plot"],
    "hexbin-plot": ["hexagonal-binning"],
    "waffle-chart": ["waffle-plot", "square-pie"],
    "comet-chart": ["trajectory-chart"],
    "flame-graph": ["flamegraph", "icicle-chart"],
    "horizon-chart": ["horizon-graph"],
    "wind-rose": ["wind-direction-chart", "compass-rose"],
    "gantt-chart": ["timeline-chart", "project-schedule"],
    "clock-diagram": ["24h-clock", "circular-timeline"],
    "custom-word-cloud": ["tag-cloud", "word-cloud"],
    "voronoi-diagram": ["thiessen-polygon"],
    "state-diagram": ["state-machine", "fsm-diagram"],
    "ternary-plot": ["triangle-plot", "ternary-diagram", "de-finetti-diagram"],
    "bubble-chart": ["proportional-symbol"],
    "contour-density": ["kde-plot", "density-contour"],
    "marimekko": ["mosaic-plot", "mekko-chart"],
    "streamgraph": ["theme-river", "stream-chart"],
    "radial-stacked-bar-chart": ["radial-stacked-bar"],
    "upset": ["upset-plot"],
}

files = glob.glob("site/posts/*.json")
updated = 0
for f in files:
    if f.endswith("index.json"):
        continue
    with open(f, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    chart_id = data.get("chart_id", "")
    aliases = ALIASES_MAP.get(chart_id, [])

    # Only update if aliases field is missing or empty
    if "aliases" not in data or data["aliases"] != aliases:
        data["aliases"] = aliases
        with open(f, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        updated += 1
        print(f"Updated {f}: aliases={aliases}")

print(f"\nTotal updated: {updated} files")
