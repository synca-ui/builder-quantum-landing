import { useEffect, useState } from "react";
import QR from "qrcode";

interface Props {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 256 }: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function gen() {
      try {
        const url = await QR.toDataURL(value, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: size,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        // ignore
      }
    }
    gen();
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) return null;
  return (
    <img
      src={dataUrl}
      alt="QR code"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
