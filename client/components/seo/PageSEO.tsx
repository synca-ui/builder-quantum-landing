import { Helmet } from "react-helmet-async";

const SITE_ORIGIN = "https://www.maitr.de";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

interface PageSEOProps {
  title: string;
  description: string;
  /**
   * Pfad der Seite, mit führendem Slash (z.B. "/impressum").
   *
   * Bewusst PFLICHT: vorher stand hier der Standardwert "", und keine einzige
   * Seite hat den Wert übergeben. Dadurch kanonisierte jede Unterseite auf
   * https://www.maitr.de/ und wies sich gegenüber Google als Dublette der
   * Startseite aus. Die Werte liegen gebündelt in client/lib/seo.ts.
   */
  canonicalPath: string;
  noindex?: boolean;
  ogImage?: string;
}

export function PageSEO({
  title,
  description,
  canonicalPath,
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
}: PageSEOProps) {
  // Genau eine kanonische Form pro Seite: führender Slash erzwungen,
  // Slash am Ende entfernt (Ausnahme Startseite).
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const canonicalUrl =
    path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path.replace(/\/+$/, "")}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content="Maitr" />
      <meta property="og:locale" content="de_DE" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
