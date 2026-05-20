/**
 * Inline JSON-LD payload as a `<script type="application/ld+json">` tag.
 *
 * Server component — renders once at request time, no client JS. Use one
 * per logical schema (e.g. one for WebSite, one for BreadcrumbList) rather
 * than packing everything into a `@graph` array, since Google's Rich
 * Results test handles both but stand-alone blocks are easier to diff.
 *
 * Safe to interpolate user-supplied strings: React escapes `<`, `>`, `&`
 * inside a JSX text child (this is how `dangerouslySetInnerHTML` is
 * avoided). Specifically we do NOT use `dangerouslySetInnerHTML`; the
 * JSON is rendered as a normal text child so React handles escaping.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  // `dangerouslySetInnerHTML` would be required to avoid React escaping
  // the JSON's quotes/braces (which would break the schema). We sanitise
  // the only HTML-significant sequence — </script> — defensively.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
