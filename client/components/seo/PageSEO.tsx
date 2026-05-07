import React from "react";
import { Helmet } from "react-helmet-async";

interface PageSEOProps {
  title: string;
  description: string;
  canonicalPath?: string;
  noindex?: boolean;
  ogImage?: string;
}

export function PageSEO({
  title,
  description,
  canonicalPath = "",
  noindex = false,
  ogImage = "https://www.maitr.de/og-image.png", // Assume a default OG image exists
}: PageSEOProps) {
  const canonicalUrl = `https://www.maitr.de${canonicalPath}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      <link rel="canonical" href={canonicalUrl} />
      
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
