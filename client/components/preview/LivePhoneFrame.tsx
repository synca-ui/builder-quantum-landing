import React, { PropsWithChildren } from "react";

type LivePhoneFrameProps = {
  className?: string;
  widthClass?: string;
  heightClass?: string;
};

export function LivePhoneFrame({
  children,
  className = "",
  widthClass = "w-56",
  heightClass = "h-[420px]",
}: PropsWithChildren<LivePhoneFrameProps>) {
  return (
    <div className={`relative ${className}`}>
      <div className={`iphone-16pro ${widthClass} ${heightClass}`}>
        {/* Side buttons */}
        <div className="iphone-buttons" aria-hidden="true">
          <span className="btn btn-power" />
          <span className="btn btn-volume-up" />
          <span className="btn btn-volume-down" />
        </div>

        {/* Screen */}
        <div className="iphone-screen no-scrollbar">
          {/* Dynamic island / notch */}
          <div className="iphone-island" aria-hidden="true">
            <span className="island-speaker" />
            <span className="island-camera" />
          </div>

          {/* Content */}
          <div className="iphone-content">
            {children}
          </div>
        </div>
      </div>
      {/* Shadow */}
      <div className="iphone-shadow" aria-hidden="true" />
    </div>
  );
}

export default LivePhoneFrame;
