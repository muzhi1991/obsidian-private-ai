import { cubicOut } from "svelte/easing";
export function scaleIn(
    node: HTMLElement,
    {
        delay = 0,
        duration = 400,
        easing = cubicOut,
    }: {
        delay?: number;
        duration?: number;
        easing?: (t: number) => number;
    },
): {
    delay: number;
    duration: number;
    easing: (t: number) => number;
    css: (t: number) => string;
} {
    return {
        delay,
        duration,
        easing,
        css: (t) => `
  transform: scale(${t});
  opacity: ${t};
`,
    };
}