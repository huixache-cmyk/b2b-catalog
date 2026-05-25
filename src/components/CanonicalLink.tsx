"use client";

import { usePathname } from "next/navigation";

export function CanonicalLink() {
  const pathname = usePathname();
  const domain = "https://www.geekystore.mx";
  
  // Format the absolute canonical URL, avoiding double slashes
  const canonicalUrl = `${domain}${pathname === "/" ? "" : pathname}`;

  return <link rel="canonical" href={canonicalUrl} />;
}
