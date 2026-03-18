import { Badge } from "@/components/ui/badge";
import type { Patent } from "./fake-patent";

interface CenterPanelProps {
  patent: Patent;
}

export function CenterPanel({ patent }: CenterPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-stone-50">
      <div className="max-w-3xl mx-auto py-8 px-6 space-y-8">
        {/* Title & metadata */}
        <header className="space-y-3">
          <h1 className="text-xl font-semibold text-stone-900 leading-tight">
            {patent.title}
          </h1>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500">
            <Badge variant="outline" className="font-mono">
              {patent.patentNumber}
            </Badge>
            <span>Filed: {patent.filingDate}</span>
            <span className="text-stone-300">|</span>
            <span>Published: {patent.publicationDate}</span>
          </div>
          <div className="text-sm text-stone-600">
            <span className="font-medium">Inventors:</span>{" "}
            {patent.inventors.join(", ")}
          </div>
          <div className="text-sm text-stone-600">
            <span className="font-medium">Assignee:</span> {patent.assignee}
          </div>
        </header>

        {/* Abstract */}
        <section id="abstract">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-2">
            Abstract
          </h2>
          <p className="text-sm leading-relaxed text-stone-700">
            {patent.abstract}
          </p>
        </section>

        {/* Description sections */}
        {patent.description.map((section) => (
          <section
            key={section.heading}
            id={`section-${section.heading.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {section.heading}
            </h2>
            <div className="space-y-3">
              {section.paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-stone-700"
                >
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}

        {/* Claims */}
        <section id="claims">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-3">
            Claims
          </h2>
          <div className="space-y-4">
            {patent.claims.map((claim) => (
              <div
                key={claim.number}
                id={`claim-${claim.number}`}
                className="group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono font-medium text-stone-400 pt-0.5 select-none shrink-0 w-5 text-right">
                    {claim.number}.
                  </span>
                  <p className="text-sm leading-relaxed text-stone-700">
                    {claim.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
