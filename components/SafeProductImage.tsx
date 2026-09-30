"use client";

import { useState } from "react";

export default function SafeProductImage({
  src,
  alt,
  className = "",
  priority = false,
  fallback = "تصویر در حال آماده‌سازی است",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  fallback?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className={"safe-image-fallback " + className}><b>{alt.slice(0, 1)}</b><small>{fallback}</small></span>;
  }
  return <img
    className={className}
    src={src}
    alt={alt}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    onError={() => setFailed(true)}
  />;
}
