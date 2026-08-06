import { ImageResponse } from "next/og";

/**
 * Favicon gerado a partir da identidade WATA.
 *
 * Gerado por codigo em vez de arquivo binario: o "W" em grafite acompanha os
 * tokens do design system e nao depende de um asset que precisaria ser
 * versionado e mantido em varias resolucoes.
 *
 * Para usar o logo real da loja, apague este arquivo e coloque a imagem em
 * `src/app/icon.png` (ou `icon.svg`) — o Next.js reconhece pelo nome.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Tokens graphite e white do design system (Secao 16).
          background: "#303236",
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          borderRadius: 6,
        }}
      >
        W
      </div>
    ),
    size,
  );
}
