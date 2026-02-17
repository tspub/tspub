export const config = {
  runtime: "edge",
};

export default async function handler(req: Request): Promise<Response> {
  const { ImageResponse } = await import("@vercel/og");

  const url = new URL(req.url);
  const pkg = url.searchParams.get("pkg");

  if (!pkg) {
    return new Response("Missing ?pkg= parameter", { status: 400 });
  }

  // Fetch score data
  let score = 0;
  let _grade = "?";
  let categories: Record<string, number> = {};

  try {
    const origin = url.origin;
    const checkRes = await fetch(
      `${origin}/api/check?pkg=${encodeURIComponent(pkg)}`,
    );
    if (checkRes.ok) {
      const data = (await checkRes.json()) as {
        score: number;
        grade: string;
        categoryScores: Record<string, number>;
      };
      score = data.score;
      _grade = data.grade;
      categories = data.categoryScores;
    }
  } catch {
    // Use defaults
  }

  const ringColor =
    score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  // SVG donut ring parameters
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const categoryOrder = ["exports", "types", "files", "metadata", "size"];
  const categoryLabels: Record<string, string> = {
    exports: "Exports",
    types: "Types",
    files: "Files",
    metadata: "Metadata",
    size: "Size",
  };

  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundColor: "#0f172a",
          color: "#e2e8f0",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "60px",
        },
        children: [
          // Header
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "40px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: { fontSize: "48px", fontWeight: 700 },
                          children: pkg,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: "24px",
                            color: "#94a3b8",
                            marginTop: "8px",
                          },
                          children: "Package Health Report",
                        },
                      },
                    ],
                  },
                },
                // Score ring
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      width: "140px",
                      height: "140px",
                    },
                    children: [
                      {
                        type: "svg",
                        props: {
                          width: "140",
                          height: "140",
                          viewBox: "0 0 120 120",
                          children: [
                            {
                              type: "circle",
                              props: {
                                cx: "60",
                                cy: "60",
                                r: String(radius),
                                fill: "none",
                                stroke: "#1e293b",
                                strokeWidth: "8",
                              },
                            },
                            {
                              type: "circle",
                              props: {
                                cx: "60",
                                cy: "60",
                                r: String(radius),
                                fill: "none",
                                stroke: ringColor,
                                strokeWidth: "8",
                                strokeLinecap: "round",
                                strokeDasharray: String(circumference),
                                strokeDashoffset: String(offset),
                                transform: "rotate(-90 60 60)",
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            position: "absolute",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: "36px",
                                  fontWeight: 700,
                                  color: ringColor,
                                },
                                children: String(score),
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Category bars
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                flex: 1,
              },
              children: categoryOrder.map((cat) => ({
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "100px",
                          fontSize: "20px",
                          color: "#94a3b8",
                        },
                        children: categoryLabels[cat] ?? cat,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          flex: 1,
                          height: "24px",
                          backgroundColor: "#1e293b",
                          borderRadius: "12px",
                          overflow: "hidden",
                          display: "flex",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: `${categories[cat] ?? 100}%`,
                                height: "100%",
                                backgroundColor:
                                  (categories[cat] ?? 100) >= 80
                                    ? "#22c55e"
                                    : (categories[cat] ?? 100) >= 50
                                      ? "#eab308"
                                      : "#ef4444",
                                borderRadius: "12px",
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "48px",
                          fontSize: "20px",
                          textAlign: "right",
                          fontWeight: 600,
                        },
                        children: String(categories[cat] ?? 100),
                      },
                    },
                  ],
                },
              })),
            },
          },
          // Footer
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid #1e293b",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: { fontSize: "24px", fontWeight: 700, color: "#0ea5e9" },
                    children: "tspub.dev",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { fontSize: "18px", color: "#64748b" },
                    children: "The unified TypeScript package toolkit",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
