import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pkg = req.query["pkg"];
  if (!pkg || typeof pkg !== "string") {
    return res.status(400).json({ error: "Missing ?pkg= parameter" });
  }

  if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(pkg)) {
    return res.status(400).json({ error: "Invalid package name" });
  }

  try {
    // Fetch score from our own check endpoint
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["host"] || "tspub.dev";
    const checkUrl = `${protocol}://${host}/api/check?pkg=${encodeURIComponent(pkg)}`;

    const checkRes = await fetch(checkUrl);
    if (!checkRes.ok) {
      return res.status(checkRes.status).json({
        schemaVersion: 1,
        label: "tspub",
        message: "error",
        color: "lightgrey",
      });
    }

    const data = (await checkRes.json()) as { grade: string; score: number };

    const color =
      data.grade === "A+" || data.grade === "A" ? "brightgreen" :
      data.grade === "B+" || data.grade === "B" ? "yellowgreen" :
      data.grade === "C" ? "yellow" :
      data.grade === "D" ? "orange" : "red";

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({
      schemaVersion: 1,
      label: "tspub",
      message: `${data.grade} (${data.score})`,
      color,
    });
  } catch {
    return res.status(500).json({
      schemaVersion: 1,
      label: "tspub",
      message: "error",
      color: "lightgrey",
    });
  }
}
