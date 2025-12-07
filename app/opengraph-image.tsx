import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OgImage() {
  const logoBuffer = await readFile(
    join(
      process.cwd(),
      "public",
      "affordable-peptides-logo-transparent.png",
    ),"base64"
  );

  const logoSrc = `data:image/png;base64,${logoBuffer}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "72px 96px",
          color: "white",
          background:
            "radial-gradient(circle at 20% 20%, rgba(138, 65, 220, 0.45), transparent 55%), radial-gradient(circle at 80% 30%, rgba(79, 29, 135, 0.6), transparent 60%), radial-gradient(circle at center, #040008, #010103 65%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: 620,
              height: 620,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.18), rgba(129, 60, 209, 0.1))",
              borderRadius: "36px",
              boxShadow: "0 45px 90px rgba(118, 41, 255, 0.45)",
              overflow: "hidden",
              padding: "28px",
            }}
          >
            <img
              src={logoSrc}
              alt="Affordable Peptides"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "auto",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              textTransform: "uppercase",
              letterSpacing: "0.8rem",
              fontSize: 48,
              color: "rgba(224, 197, 255, 0.95)",
            }}
          >
            Affordable Peptides
            <span
              style={{
                fontSize: 38,
                letterSpacing: "0.5rem",
                marginTop: 12,
                color: "rgba(208, 175, 255, 0.6)",
              }}
            >
              Research. Integrity. Transparency.
            </span>
          </div>
        </div>
        <div
          style={{
            maxWidth: "1460px",
            fontSize: 48,
            lineHeight: 1.2,
            fontWeight: 600,
            textShadow: "0 22px 40px rgba(50, 15, 100, 0.6)",
            marginBottom: "48px",
          }}
        >
          High-Purity, Research-Grade Peptides Without the Markup
        </div>
        <div
          style={{
            marginTop: "0",
            fontSize: 38,
            lineHeight: 1.45,
            color: "rgba(226, 210, 255, 0.85)",
            maxWidth: "1600px",
          }}
        >
          Transparent third-party testing, fair pricing, and science-first
          practices for professionals who refuse to compromise on quality.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

