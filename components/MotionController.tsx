"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = [
  ".section-heading",
  ".category-card",
  ".product-card",
  ".trust-cards article",
  ".story-band > *",
  ".review-grid blockquote",
  ".article-card",
  ".final-cta > *",
  ".page-hero > *",
  ".product-page > *",
  ".product-details-grid > *",
  ".legacy-section > *",
  ".guarantee > *",
  ".faq-list details",
  ".panel",
  ".cart-row",
  ".auth-form",
  ".result-card",
  ".erp-module-header",
  ".erp-metric",
  ".erp-panel",
  ".erp-record",
  ".erp-inline-card",
  ".erp-table-wrap"
].join(",");

export default function MotionController() {
  const pathname = usePathname();
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    document.body.classList.add("motion-ready");

    let raf = 0;
    const updateScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, window.scrollY / max));
        root.style.setProperty("--page-scroll", String(progress));
        root.style.setProperty("--page-scroll-px", window.scrollY + "px");
        if (progressRef.current) {
          progressRef.current.style.transform = "scaleX(" + progress + ")";
        }
        const header = document.querySelector(".site-header");
        if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
      });
    };

    const show = (node: Element) => {
      if (!(node instanceof HTMLElement)) return;
      node.classList.remove("motion-pending");
      node.classList.add("motion-visible");
    };

    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              show(entry.target);
              observer?.unobserve(entry.target);
            }
          }
        }, { rootMargin: "0px 0px -7% 0px", threshold: 0.08 })
      : null;

    const reveal = (node: Element, index = 0) => {
      if (!(node instanceof HTMLElement) || node.dataset.motionBound === "1") return;
      node.dataset.motionBound = "1";
      node.classList.add("motion-reveal");
      node.style.setProperty("--reveal-delay", Math.min(index % 6, 5) * 70 + "ms");

      // Never leave content hidden when motion support is unavailable.
      if (!observer) {
        show(node);
        return;
      }

      node.classList.add("motion-pending");

      // Above-the-fold content should be revealed immediately after binding.
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.98 && rect.bottom > 0) {
        requestAnimationFrame(() => show(node));
        return;
      }

      observer.observe(node);
    };

    const bind = (scope: ParentNode = document) => {
      scope.querySelectorAll(REVEAL_SELECTOR).forEach((node, index) => reveal(node, index));
    };

    bind();

    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        for (const added of record.addedNodes) {
          if (!(added instanceof HTMLElement)) continue;
          if (added.matches?.(REVEAL_SELECTOR)) reveal(added);
          bind(added);
        }
      }
    });
    mutation.observe(document.body, { subtree: true, childList: true });

    // Safety net: a reveal animation must never make real content disappear permanently.
    const revealFallback = window.setTimeout(() => {
      document.querySelectorAll(".motion-reveal.motion-pending").forEach(show);
    }, 1200);

    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    updateScroll();

    return () => {
      mutation.disconnect();
      observer?.disconnect();
      window.clearTimeout(revealFallback);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      cancelAnimationFrame(raf);

      // Route changes can reuse DOM nodes in Next.js. Reset stale bindings and
      // force them visible before the next route binds its own observer.
      document.querySelectorAll<HTMLElement>('[data-motion-bound="1"]').forEach((node) => {
        node.classList.remove("motion-pending");
        node.classList.add("motion-visible");
        delete node.dataset.motionBound;
      });
    };
  }, [pathname]);

  useEffect(() => {
    const main = document.querySelector("main, .rishe-erp-main");
    if (!(main instanceof HTMLElement)) return;
    main.classList.remove("motion-route-enter");
    void main.offsetWidth;
    main.classList.add("motion-route-enter");
  }, [pathname]);

  return <div ref={progressRef} className="scroll-progress" aria-hidden="true" />;
}
