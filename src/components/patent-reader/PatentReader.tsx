import { useState, useCallback } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { CenterPanel } from "./CenterPanel";
import { RightSidebar } from "./RightSidebar";
import { FAKE_PATENT } from "./fake-patent";

export function PatentReader() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const handleScrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="flex h-full">
      <LeftSidebar
        patent={FAKE_PATENT}
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((c) => !c)}
        onScrollTo={handleScrollTo}
      />
      <CenterPanel patent={FAKE_PATENT} />
      <RightSidebar
        patent={FAKE_PATENT}
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((c) => !c)}
      />
    </div>
  );
}
