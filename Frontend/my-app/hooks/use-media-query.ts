import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Initial check
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Listener for changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } 
    // Legacy browsers
    else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query, matches]);

  return matches;
}

// Common media query hooks
export function useIsMobile() {
  return useMediaQuery('(max-width: 640px)');
}

export function useIsTablet() {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsLargeDesktop() {
  return useMediaQuery('(min-width: 1280px)');
}

// Orientation hooks
export function useIsPortrait() {
  return useMediaQuery('(orientation: portrait)');
}

export function useIsLandscape() {
  return useMediaQuery('(orientation: landscape)');
}

// Device-specific hooks
export function useIsTouchDevice() {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}

export function useIsMouseDevice() {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}

// Dark mode hook
export function useIsDarkMode() {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

// Reduced motion hook
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}