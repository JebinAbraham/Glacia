import { useEffect, useRef } from 'react';

interface CustomCursorProps {
  enabled: boolean;
}

const isCoarsePointer = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches;
};

const SNAP_RADIUS = 140;
const TRAIL_LENGTH = 6;
const INTERACTIVE_SELECTORS = [
  'button',
  '[role="button"]',
  'a',
  'input',
  'textarea',
  'select',
  '[data-hoverable]',
  '[data-cursor-target]',
].join(',');

export function CustomCursor({ enabled }: CustomCursorProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(false);
  const blendStrengthRef = useRef(0);
  const interactiveElementsRef = useRef<HTMLElement[]>([]);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const trailPositionsRef = useRef<{ x: number; y: number }[]>([]);
  const refreshPendingRef = useRef(false);

  const setVisibility = (visible: boolean) => {
    const opacity = visible ? '1' : '0';
    if (innerRef.current) innerRef.current.style.opacity = opacity;
    if (outerRef.current) outerRef.current.style.opacity = opacity;
    trailRefs.current.forEach((node) => {
      if (node) {
        node.style.opacity = visible ? node.style.opacity : '0';
      }
    });
  };

  const refreshInteractiveElements = () => {
    if (typeof document === 'undefined') return;
    interactiveElementsRef.current = Array.from(document.querySelectorAll(INTERACTIVE_SELECTORS)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !!el.offsetParent,
    );
  };

  const scheduleRefresh = () => {
    if (refreshPendingRef.current) return;
    refreshPendingRef.current = true;
    requestAnimationFrame(() => {
      refreshPendingRef.current = false;
      refreshInteractiveElements();
    });
  };

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || isCoarsePointer()) {
      setVisibility(false);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
      return;
    }

    document.body.style.cursor = 'none';
    setVisibility(false);
    currentRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    targetRef.current = { ...currentRef.current };
    refreshInteractiveElements();
    trailPositionsRef.current = Array.from({ length: TRAIL_LENGTH }, () => ({ ...currentRef.current }));

    const handleMove = (event: MouseEvent) => {
      const pointer = { x: event.clientX, y: event.clientY };
      let blendedPoint = { ...pointer };
      let strongestInfluence = 0;

      for (const element of interactiveElementsRef.current) {
        const rect = element.getBoundingClientRect();
        if (!rect.width && !rect.height) continue;
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const dx = pointer.x - center.x;
        const dy = pointer.y - center.y;
        const distance = Math.hypot(dx, dy);
        if (distance < SNAP_RADIUS) {
          const influence = 1 - distance / SNAP_RADIUS;
          const easedInfluence = Math.min(1, Math.pow(influence, 0.7) * 1.35);
          if (easedInfluence > strongestInfluence) {
            strongestInfluence = easedInfluence;
            blendedPoint = {
              x: pointer.x * (1 - easedInfluence) + center.x * easedInfluence,
              y: pointer.y * (1 - easedInfluence) + center.y * easedInfluence,
            };
          }
        }
      }

      targetRef.current = blendedPoint;
      blendStrengthRef.current = strongestInfluence;

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setVisibility(true);
        currentRef.current = { ...blendedPoint };
      }
    };

    const handleLeave = () => {
      isVisibleRef.current = false;
      setVisibility(false);
    };

    const handleBlur = () => {
      isVisibleRef.current = false;
      setVisibility(false);
    };

    const handleResize = () => {
      scheduleRefresh();
    };

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            scheduleRefresh();
          })
        : null;
    if (observer && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const animate = () => {
      const current = currentRef.current;
      const target = targetRef.current;
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;

      velocityRef.current = {
        x: target.x - current.x,
        y: target.y - current.y,
      };

      const velocityMagnitude = Math.min(Math.hypot(velocityRef.current.x, velocityRef.current.y) / 80, 0.6);
      const rawBlend = blendStrengthRef.current;
      const blendFactor = Math.min(1, Math.pow(rawBlend, 0.55) * 1.2);
      const scale = 1 + velocityMagnitude * 0.8 + blendFactor * 0.8;
      const rotation = velocityRef.current.x * 0.25;
      const snappedOpacity = isVisibleRef.current ? (blendFactor > 0.05 ? 0.05 : 1) : 0;

      const translate = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;

      const trailPositions = trailPositionsRef.current;
      trailPositions.pop();
      trailPositions.unshift({ ...current });

      trailPositions.forEach((pos, index) => {
        const trailNode = trailRefs.current[index];
        if (!trailNode) return;
        const progress = index / TRAIL_LENGTH;
        const opacityBase = (1 - progress) * 0.35;
        const opacity = snappedOpacity === 0.05 ? opacityBase * 0.35 : opacityBase;
        const size = 8 + (1 - progress) * 10;
        trailNode.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
        trailNode.style.opacity = opacity.toString();
        trailNode.style.width = `${size}px`;
        trailNode.style.height = `${size}px`;
      });

      if (innerRef.current) {
        innerRef.current.style.transform = translate;
        innerRef.current.style.opacity = snappedOpacity.toString();
        innerRef.current.style.backgroundColor = blendFactor
          ? `rgba(59,130,246,${0.6 + blendFactor * 0.3})`
          : 'rgba(37,99,235,0.95)';
      }

      if (outerRef.current) {
        outerRef.current.style.transform = `${translate} scale(${scale}) rotate(${rotation}deg)`;
        outerRef.current.style.opacity = snappedOpacity.toString();
        outerRef.current.style.borderColor = blendFactor
          ? `rgba(37,99,235,${0.8 + blendFactor * 0.2})`
          : 'rgba(96,165,250,0.7)';
        outerRef.current.style.backgroundColor = blendFactor
          ? `rgba(59,130,246,${0.08 + blendFactor * 0.2})`
          : 'transparent';
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
      document.body.style.cursor = '';
      setVisibility(false);
    };
  }, [enabled]);

  if (typeof window !== 'undefined' && isCoarsePointer()) {
    return null;
  }

  return (
    <>
      {Array.from({ length: TRAIL_LENGTH }).map((_, index) => (
        <div
          key={`cursor-trail-${index}`}
          ref={(node) => {
            if (node) {
              trailRefs.current[index] = node;
            }
          }}
          className="pointer-events-none fixed top-0 left-0 z-[9998] rounded-full bg-blue-200/70 blur-2xl transition-opacity duration-200 ease-out"
          style={{ opacity: 0 }}
        />
      ))}
      <div
        ref={outerRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] h-9 w-9 rounded-full border-[1.5px] border-blue-500/70 shadow-[0_0_30px_rgba(59,130,246,0.35)] transition-opacity duration-300 ease-out"
        style={{ opacity: 0 }}
      />
      <div
        ref={innerRef}
        className="pointer-events-none fixed top-0 left-0 z-[10000] h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.45)] transition-opacity duration-300 ease-out"
        style={{ opacity: 0 }}
      />
    </>
  );
}
