import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { inject } from "@vercel/analytics";
import "./playground.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === "undefined") return;

    inject();

    // Vercel rewrites /check/:pkg and /scan/:path to /playground, so the
    // correct HTML is served. But VitePress's client-side router doesn't
    // know those paths, causing a 404 on hydration. Convert them to the
    // hash-based equivalent so VitePress routes to /playground normally.
    const path = window.location.pathname;
    const checkMatch = path.match(/^\/check\/(.+)/);
    const scanMatch = path.match(/^\/scan\/(.+)/);
    if (checkMatch) {
      const pkg = decodeURIComponent(checkMatch[1]!);
      router.go(`/playground#check&pkg=${encodeURIComponent(pkg)}`);
    } else if (scanMatch) {
      const repo = decodeURIComponent(scanMatch[1]!);
      router.go(`/playground#scan&repo=${encodeURIComponent(repo)}`);
    }
  },
} satisfies Theme;
