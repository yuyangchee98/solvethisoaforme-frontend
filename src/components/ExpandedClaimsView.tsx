import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ClaimTree, ParsedClaim } from '@/lib/claim-parser';
import type { ClaimAnalysis } from '@/lib/api';
import type { AnnotationData } from '@/lib/annotationUtils';
import { AnnotatedText } from '@/components/text/AnnotatedText';
import { getAnnotationsForClaim, getClaimStartPosition, getClaimEndPosition } from '@/lib/claimPositions';

interface ExpandedClaimsViewProps {
  claimTree: ClaimTree;
  analyses: ClaimAnalysis[];
  annotations: AnnotationData[];
  fullText: string;
  onAnnotationClick?: (annotation: AnnotationData) => void;
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

export function ExpandedClaimsView({
  claimTree,
  analyses,
  annotations,
  fullText,
  onAnnotationClick,
  onAnnotationHover
}: ExpandedClaimsViewProps) {
  const [expandedClaims, setExpandedClaims] = useState<Set<number>>(new Set());

  // Get all claims in order
  const allClaims = Array.from(claimTree.claims.values()).sort((a, b) => a.number - b.number);

  // Map claim number to error count
  const errorCounts = new Map<number, number>();
  analyses.forEach((analysis) => {
    errorCounts.set(analysis.claim_number, analysis.antecedent_errors.length);
  });

  const toggleExpanded = (claimNumber: number) => {
    const newExpanded = new Set(expandedClaims);
    if (newExpanded.has(claimNumber)) {
      newExpanded.delete(claimNumber);
    } else {
      newExpanded.add(claimNumber);
    }
    setExpandedClaims(newExpanded);
  };

  return (
    <div className="flex-1 h-full overflow-auto bg-stone-50 p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Expanded Claims View</h1>
          <p className="text-sm text-stone-600">
            Click on dependencies to expand and view full context
          </p>
        </div>

        {allClaims.map((claim) => (
          <ClaimCard
            key={claim.number}
            claim={claim}
            claimTree={claimTree}
            errorCount={errorCounts.get(claim.number) || 0}
            isExpanded={expandedClaims.has(claim.number)}
            onToggleExpanded={() => toggleExpanded(claim.number)}
            annotations={annotations}
            fullText={fullText}
            onAnnotationClick={onAnnotationClick}
            onAnnotationHover={onAnnotationHover}
          />
        ))}
      </div>
    </div>
  );
}

interface ClaimCardProps {
  claim: ParsedClaim;
  claimTree: ClaimTree;
  errorCount: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  annotations: AnnotationData[];
  fullText: string;
  onAnnotationClick?: (annotation: AnnotationData) => void;
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

function ClaimCard({
  claim,
  claimTree,
  errorCount,
  isExpanded,
  onToggleExpanded,
  annotations,
  fullText,
  onAnnotationClick,
  onAnnotationHover
}: ClaimCardProps) {
  const hasDependencies = claim.dependsOn.length > 0;

  // Get error styling
  const getCardClass = () => {
    if (errorCount === 0) return 'border-emerald-200 bg-white';
    if (errorCount <= 2) return 'border-amber-200 bg-amber-50/30';
    return 'border-red-200 bg-red-50/30';
  };

  const getStatusIcon = () => {
    if (errorCount === 0) return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    return <AlertCircle className="h-5 w-5 text-amber-600" />;
  };

  const getErrorBadgeClass = () => {
    if (errorCount === 0) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (errorCount <= 2) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // Format dependency text
  const getDependencyText = () => {
    if (claim.dependsOn.length === 0) return null;
    if (claim.dependsOn.length === 1) {
      return `Claim ${claim.dependsOn[0]}`;
    }
    const min = Math.min(...claim.dependsOn);
    const max = Math.max(...claim.dependsOn);
    return `any of Claims ${min}-${max}`;
  };

  return (
    <Card className={`border-2 ${getCardClass()} transition-all`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-stone-600" />
            <h3 className="text-lg font-bold text-stone-900">
              Claim {claim.number}
            </h3>
            {claim.isIndependent && (
              <Badge className="text-[10px] bg-stone-700 text-white border-0 px-2 py-0.5">
                INDEPENDENT
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {errorCount > 0 && (
              <Badge className={`text-xs font-semibold border ${getErrorBadgeClass()}`}>
                {errorCount} error{errorCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Dependencies - Expandable */}
        {hasDependencies && (
          <div className="mb-4">
            <button
              onClick={onToggleExpanded}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors text-sm font-medium text-stone-700 w-full"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Depends on: {getDependencyText()}</span>
              <span className="text-xs text-stone-500 ml-auto">
                {isExpanded ? 'Hide' : 'Show'} context
              </span>
            </button>

            {/* Expanded dependency claims */}
            {isExpanded && (
              <div className="mt-3 pl-6 border-l-2 border-stone-300 space-y-3">
                {claim.dependsOn.map((depNumber) => {
                  const depClaim = claimTree.claims.get(depNumber);
                  if (!depClaim) return null;

                  return (
                    <div
                      key={depNumber}
                      className="bg-stone-50 rounded-lg p-4 border border-stone-200"
                    >
                      <div className="text-xs font-bold text-stone-600 mb-2">
                        Claim {depNumber}
                      </div>
                      <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                        <AnnotatedText
                          fullText={fullText}
                          claimStart={getClaimStartPosition(fullText, depNumber)}
                          claimEnd={getClaimEndPosition(fullText, depNumber)}
                          annotations={getAnnotationsForClaim(annotations, depNumber)}
                          onAnnotationClick={onAnnotationClick}
                          onAnnotationHover={onAnnotationHover}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Claim Text */}
        <div className="prose prose-sm max-w-none">
          <div className="text-stone-800 leading-relaxed whitespace-pre-wrap">
            <AnnotatedText
              fullText={fullText}
              claimStart={getClaimStartPosition(fullText, claim.number)}
              claimEnd={getClaimEndPosition(fullText, claim.number)}
              annotations={getAnnotationsForClaim(annotations, claim.number)}
              onAnnotationClick={onAnnotationClick}
              onAnnotationHover={onAnnotationHover}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
