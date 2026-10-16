import { bad, body, handle, json } from "@/lib/server/http";
import { addAssetFromUrl } from "@/lib/server/media";
import { getProject, updateProject } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

type Lookup = {
  trackName: string;
  description: string;
  artworkUrl512?: string;
  screenshotUrls?: string[];
  primaryGenreName?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  formattedPrice?: string;
  trackViewUrl?: string;
  sellerName?: string;
};

async function appStore(url: string) {
  const id = /id(\d{6,})/.exec(url)?.[1] ?? (/^\d{6,}$/.test(url) ? url : null);
  if (!id) return null;
  const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=us&entity=software`);
  const j = (await res.json()) as { results?: Lookup[] };
  return j.results?.[0] ?? null;
}

async function website(url: string) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Macintosh) Shipreel/0.1" }, redirect: "follow" });
  const html = (await res.text()).slice(0, 400_000);
  const meta = (name: string) =>
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i").exec(html)?.[1] ??
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i").exec(html)?.[1];
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim();
  return {
    title: meta("og:title") ?? title,
    description: meta("og:description") ?? meta("description"),
    image: meta("og:image"),
    themeColor: meta("theme-color"),
    siteName: meta("og:site_name"),
  };
}

/** Prefill a product from an App Store link (iTunes lookup: name, copy, icon, screenshots) or a website. */
export const POST = handle(async (req: Request) => {
  const b = await body<{ url: string; projectId?: string; importMedia?: boolean }>(req);
  const url = b.url?.trim();
  if (!url) return bad("Paste a link.");
  if (/apps\.apple\.com|itunes\.apple\.com|^\d{6,}$/.test(url)) {
    const app = await appStore(url);
    if (!app) return bad("Couldn't find that app on the App Store.", 404);
    const result = {
      source: "appstore" as const,
      name: app.trackName,
      description: app.description,
      category: app.primaryGenreName,
      icon: app.artworkUrl512,
      screenshots: app.screenshotUrls ?? [],
      rating: app.averageUserRating,
      ratings: app.userRatingCount,
      price: app.formattedPrice,
      appStore: app.trackViewUrl,
      seller: app.sellerName,
    };
    if (b.projectId && b.importMedia) {
      const project = await getProject(b.projectId);
      if (project) {
        const shots = [];
        for (const [i, s] of result.screenshots.slice(0, 6).entries()) shots.push((await addAssetFromUrl(b.projectId, s, `appstore-${i + 1}`)).file);
        const icon = result.icon ? (await addAssetFromUrl(b.projectId, result.icon, "app-icon")).file : undefined;
        await updateProject(b.projectId, {
          screenshots: [...project.screenshots, ...shots],
          brand: { ...project.brand, logo: icon ? `asset:${icon}` : project.brand.logo },
          links: { ...project.links, appStore: result.appStore },
          proof: result.ratings && result.rating ? [...project.proof.filter((p) => !/App Store rating/.test(p)), `${result.rating.toFixed(1)}★ App Store rating (${result.ratings.toLocaleString()} ratings)`] : project.proof,
        });
      }
    }
    return json(result);
  }
  const site = await website(url.startsWith("http") ? url : `https://${url}`);
  return json({ source: "website" as const, ...site, website: url });
});
