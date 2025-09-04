import React, { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PhonePortalContext = createContext<HTMLElement | null>(null);

export function PhonePortalProvider({ children }: PropsWithChildren<{}>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (rootRef.current) setNode(rootRef.current);
  }, []);

  return (
    <PhonePortalContext.Provider value={node}>
      {/* portal mount point */}
      <div ref={rootRef} className="phone-portal-root" />
      {children}
    </PhonePortalContext.Provider>
  );
}

export function PhonePortal({ children }: PropsWithChildren<{}>) {
  const node = useContext(PhonePortalContext);
  if (node) return createPortal(children, node);
  if (typeof document !== "undefined") return createPortal(children, document.body);
  return null;
}

export default PhonePortal;
