import { useEffect, useRef, useState, useMemo, useCallback } from "react";

function resolveSitePath(pathFromSiteRoot) {
  const normalized = pathFromSiteRoot.replace(/^\.?\//, "");
  if (import.meta.env.DEV) {
    return `/site/${normalized}`;
  }
  return `./${normalized}`;
}

function normalizePostPath(path) {
  if (import.meta.env.DEV) {
    if (path.startsWith("/site/")) {
      return path;
    }
    if (path.startsWith("/")) {
      return `/site${path}`;
    }
    if (path.startsWith("./")) {
      return `/site/${path.slice(2)}`;
    }
    return `/site/${path}`;
  }

  if (path.startsWith("/")) {
    return `.${path}`;
  }
  if (path.startsWith("./")) {
    return path;
  }
  return `./${path}`;
}

export default function ChartThumbnail({ path }) {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const channelTokenRef = useRef(Math.random().toString(16).slice(2));
  
  const [inView, setInView] = useState(false);
  const [post, setPost] = useState(null);
  const [frameReady, setFrameReady] = useState(false);
  const [scale, setScale] = useState(1);

  const sandboxSrc = useMemo(() => resolveSitePath("sandbox.html"), []);

  // Intersection Observer to lazy load the iframe
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // Only load once
        }
      },
      { rootMargin: "200px" } // Load slightly before coming into view
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Resize Observer to keep the 800x600 chart scaled down to the container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      // The internal iframe is fixed to 800x600
      setScale(width / 800);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch post data when in view
  useEffect(() => {
    if (!inView) return;
    
    let isMounted = true;
    async function fetchPost() {
      try {
        const res = await fetch(normalizePostPath(path));
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (isMounted) setPost(data);
      } catch (e) {
        console.error("Thumbnail fetch error", e);
      }
    }
    fetchPost();
    return () => { isMounted = false; };
  }, [inView, path]);

  const sendRender = useCallback(() => {
    if (!post || !frameRef.current || !frameReady) return;
    frameRef.current.contentWindow.postMessage(
      {
        type: "render",
        request_id: Math.random().toString(16).slice(2),
        channel_token: channelTokenRef.current,
        post,
      },
      "*"
    );
  }, [post, frameReady]);

  // Send render message when data and frame are ready
  useEffect(() => {
    sendRender();
  }, [post, frameReady, sendRender]);

  return (
    <div 
      ref={containerRef} 
      className="chart-thumbnail-container"
      style={{
        width: "100%",
        aspectRatio: "800/410", // Match detailed view ratio (.chart-shell is 410px height)
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid var(--border)"
      }}
    >
      {!inView || !post ? (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-soft)",
          fontSize: "0.85rem",
          animation: "pulse 2s infinite ease-in-out"
        }}>
          Loading Preview...
        </div>
      ) : (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "800px",
          height: "600px",
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          pointerEvents: "none" // Prevent interaction with the thumbnail
        }}>
          <iframe
            ref={frameRef}
            src={sandboxSrc}
            title="Chart Preview"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: "100%", border: "none", opacity: frameReady ? 1 : 0, transition: "opacity 0.5s ease" }}
            onLoad={() => setFrameReady(true)}
          />
        </div>
      )}
    </div>
  );
}
