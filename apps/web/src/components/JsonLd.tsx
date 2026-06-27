/**
 * Renders one or more JSON-LD structured-data blobs as a <script> tag. Server
 * component — safe to drop into any page/layout. JSON.stringify escapes the content;
 * we additionally guard against a literal "</script>" breaking out of the tag.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
