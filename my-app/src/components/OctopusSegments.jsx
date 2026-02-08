import React, { useMemo, useRef, useState } from "react";

/**
 * Clockwise from the head:
 * 0 Diet Calendar
 * 1 Sleep Tracker
 * 2 Coming Soon
 * 3 Journal
 * 4 Meditation (AI)
 * 5 Yoga & AI Form
 */
export const FEATURES = ["diet", "sleep", "comingSoon", "journal", "meditation", "yoga"];

// Must match your PNG pixel size
const IMG_W = 614;
const IMG_H = 406;

/**
 * ✅ PERFECT CLIPS (your final JSON)
 */
export const DEFAULT_CLIPS = {
  diet: [
    { x: 345, y: 190, w: 34, h: 26, r: 10 },
    { x: 378, y: 209, w: 34, h: 26, r: 10 },
    { x: 403, y: 211, w: 34, h: 26, r: 10 },
    { x: 431, y: 215, w: 34, h: 26, r: 10 },
    { x: 467, y: 199, w: 34, h: 26, r: 10 },
    { x: 472, y: 166, w: 30, h: 24, r: 10 },
    { x: 442, y: 165, w: 24, h: 22, r: 10 },
  ],

  sleep: [
    { x: 325, y: 211, w: 36, h: 26, r: 0 },
    { x: 346, y: 238, w: 36, h: 26, r: 0 },
    { x: 386, y: 254, w: 36, h: 26, r: 0 },
    { x: 430, y: 261, w: 36, h: 26, r: 0 },
    { x: 458, y: 263, w: 36, h: 26, r: 0 },
    { x: 479, y: 259, w: 36, h: 26, r: 0 },
    { x: 497, y: 241, w: 36, h: 26, r: 0 },
  ],

  comingSoon: [
    { x: 288, y: 213, w: 38, h: 28, r: 10 },
    { x: 298, y: 247, w: 38, h: 28, r: 10 },
    { x: 314, y: 266, w: 38, h: 28, r: 10 },
    { x: 329, y: 278, w: 38, h: 28, r: 10 },
    { x: 358, y: 292, w: 38, h: 28, r: 10 },
    { x: 398, y: 310, w: 38, h: 28, r: 10 },
    { x: 442, y: 308, w: 38, h: 28, r: 10 },
  ],

  journal: [
    { x: 262, y: 217, w: 38, h: 28, r: -10 },
    { x: 244, y: 239, w: 38, h: 28, r: -10 },
    { x: 227, y: 258, w: 38, h: 28, r: -10 },
    { x: 205, y: 270, w: 38, h: 28, r: -10 },
    { x: 182, y: 297, w: 38, h: 28, r: -10 },
    { x: 150, y: 310, w: 38, h: 28, r: -10 },
    { x: 116, y: 304, w: 38, h: 28, r: -10 },
  ],

  meditation: [
    { x: 243, y: 198, w: 36, h: 26, r: 0 },
    { x: 216, y: 219, w: 36, h: 26, r: 0 },
    { x: 189, y: 239, w: 36, h: 26, r: 0 },
    { x: 154, y: 258, w: 36, h: 26, r: 0 },
    { x: 57, y: 247, w: 36, h: 26, r: 0 },
    { x: 89, y: 264, w: 36, h: 26, r: 0 },
    { x: 117, y: 264, w: 36, h: 26, r: 0 },
  ],

  yoga: [
    { x: 226, y: 185, w: 34, h: 26, r: -10 },
    { x: 210, y: 196, w: 34, h: 26, r: -10 },
    { x: 184, y: 204, w: 34, h: 26, r: -10 },
    { x: 152, y: 215, w: 34, h: 26, r: -10 },
    { x: 113, y: 169, w: 34, h: 26, r: -10 },
    { x: 95, y: 187, w: 30, h: 24, r: -10 },
    { x: 124, y: 210, w: 24, h: 22, r: -10 },
  ],
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default function OctopusSegments({
  src,
  progress,
  debug = false,
  clips: clipsProp,
  onClipsChange, // optional
  onDebugClick, // optional
}) {
  const clips = useMemo(() => clipsProp || DEFAULT_CLIPS, [clipsProp]);

  // ✅ overlap to hide seams
  const PAD = 14;

  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const safeProgress = useMemo(() => {
    const safe = {};
    for (const f of FEATURES) safe[f] = progress?.[f] ?? Array(7).fill(false);
    return safe;
  }, [progress]);

  const updateClip = (featureKey, segIdx, updater) => {
    if (!onClipsChange) return;
    const next = deepClone(clips);
    const c = next[featureKey][segIdx];
    updater(c);
    onClipsChange(next);
  };

  const getSvgPoint = (evt) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const onMouseDownRect = (evt, featureKey, segIdx) => {
    if (!debug || !onClipsChange) return;
    evt.preventDefault();
    evt.stopPropagation();

    setSelected({ featureKey, segIdx });

    const c = clips[featureKey][segIdx];
    const start = getSvgPoint(evt);

    dragRef.current = {
      featureKey,
      segIdx,
      startX: start.x,
      startY: start.y,
      origX: c.x,
      origY: c.y,
    };
  };

  const onMouseMove = (evt) => {
    if (!dragRef.current) return;
    const { featureKey, segIdx, startX, startY, origX, origY } = dragRef.current;

    const p = getSvgPoint(evt);
    const dx = p.x - startX;
    const dy = p.y - startY;

    const snap = evt.shiftKey ? 5 : 1;

    updateClip(featureKey, segIdx, (c) => {
      c.x = Math.round((origX + dx) / snap) * snap;
      c.y = Math.round((origY + dy) / snap) * snap;
    });
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${IMG_W} ${IMG_H}`}
      className="octoSvg"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <defs>
        {FEATURES.flatMap((featureKey) =>
          clips[featureKey].map((c, i) => (
            <clipPath key={`${featureKey}-${i}`} id={`clip-${featureKey}-${i}`}>
              <rect
                x={c.x - PAD / 2}
                y={c.y - PAD / 2}
                width={c.w + PAD}
                height={c.h + PAD}
                rx={999}
                ry={999}
                transform={`rotate(${c.r} ${c.x + c.w / 2} ${c.y + c.h / 2})`}
              />
            </clipPath>
          ))
        )}
      </defs>

      {/* 1) Grey base */}
      <image
        href={src}
        x="0"
        y="0"
        width={IMG_W}
        height={IMG_H}
        style={{ filter: "grayscale(1) brightness(0.95) contrast(1.05)" }}
      />

      {/* 2) Colored overlays */}
      {FEATURES.flatMap((featureKey) =>
        safeProgress[featureKey].map((isOn, segIdx) => {
          if (!isOn) return null;
          return (
            <image
              key={`on-${featureKey}-${segIdx}`}
              href={src}
              x="0"
              y="0"
              width={IMG_W}
              height={IMG_H}
              clipPath={`url(#clip-${featureKey}-${segIdx})`}
            />
          );
        })
      )}

      {/* 3) Debug outlines (padded to match clip) */}
      {debug &&
        FEATURES.flatMap((featureKey) =>
          clips[featureKey].map((c, i) => {
            const isSelected = selected?.featureKey === featureKey && selected?.segIdx === i;

            return (
              <rect
                key={`dbg-${featureKey}-${i}`}
                x={c.x - PAD / 2}
                y={c.y - PAD / 2}
                width={c.w + PAD}
                height={c.h + PAD}
                rx={999}
                ry={999}
                transform={`rotate(${c.r} ${c.x + c.w / 2} ${c.y + c.h / 2})`}
                fill="transparent"
                stroke={isSelected ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.75)"}
                strokeWidth={isSelected ? 3 : 2}
                opacity="0.8"
                onMouseDown={(evt) => onMouseDownRect(evt, featureKey, i)}
                onClick={() => onDebugClick?.(featureKey, i)}
                style={{ cursor: onClipsChange ? "grab" : "default" }}
              />
            );
          })
        )}
    </svg>
  );
}
