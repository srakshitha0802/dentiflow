/**
 * Returns the base path prefix for static assets when deployed to GitHub Pages.
 * On GitHub Pages the site lives at /dentiflow/, so all raw <img> and <video>
 * src attributes must be prefixed with this value.
 *
 * Usage:
 *   import { getBasePath } from "@/lib/basePath";
 *   <img src={`${getBasePath()}/images/logo.png`} />
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}
