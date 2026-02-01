import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, FileText, Link2, GitBranch, ArrowUp, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ClaimTree, ParsedClaim } from '@/lib/claim-parser';
import type { ClaimAnalysis } from '@/lib/api';
import type { AnnotationData } from '@/lib/annotationUtils';
import { AnnotatedText } from '@/components/text/AnnotatedText';
import { getAnnotationsForClaim, getClaimStartPosition, getClaimEndPosition } from '@/lib/claimPositions';
import {
  getDependencyType,
  buildDependencyChain,
  formatChainBreadcrumb,
  formatMultiDependencyRange,
  isChainDependency,
  isMultiDependency,
  getDependencySummary
} from '@/lib/dependencyUtils';

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

        {/* Dependencies - Different views for chain vs multi */}
        {hasDependencies && (
          <>
            {isChainDependency(claim) ? (
              <ChainDependencyView
                claim={claim}
                claimTree={claimTree}
                isExpanded={isExpanded}
                onToggleExpanded={onToggleExpanded}
                annotations={annotations}
                fullText={fullText}
                onAnnotationClick={onAnnotationClick}
                onAnnotationHover={onAnnotationHover}
              />
            ) : (
              <MultiDependencyView
                claim={claim}
                claimTree={claimTree}
                isExpanded={isExpanded}
                onToggleExpanded={onToggleExpanded}
                annotations={annotations}
                fullText={fullText}
                onAnnotationClick={onAnnotationClick}
                onAnnotationHover={onAnnotationHover}
              />
            )}
          </>
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

interface ChainDependencyViewProps {
  claim: ParsedClaim;
  claimTree: ClaimTree;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  annotations: AnnotationData[];
  fullText: string;
  onAnnotationClick?: (annotation: AnnotationData) => void;
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

function ChainDependencyView({
  claim,
  claimTree,
  isExpanded,
  onToggleExpanded,
  annotations,
  fullText,
  onAnnotationClick,
  onAnnotationHover
}: ChainDependencyViewProps) {
  const chain = buildDependencyChain(claim.number, claimTree);
  const breadcrumb = formatChainBreadcrumb(claim.number, chain);

  return (
    <div className="mb-4">
      <button
        onClick={onToggleExpanded}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-sm font-medium text-blue-900 w-full border border-blue-200"
      >
        <Link2 className="h-4 w-4 flex-shrink-0" />
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="flex-1 text-left">
          {isExpanded ? 'Dependency chain:' : `Chain: ${breadcrumb}`}
        </span>
        <span className="text-xs text-blue-600 ml-auto flex-shrink-0">
          {isExpanded ? 'Hide' : 'Show'} chain
        </span>
      </button>

      {/* Expanded chain view */}
      {isExpanded && (
        <div className="mt-3 space-y-0">
          {chain.slice(1).reverse().map((depNumber, index, arr) => {
            const depClaim = claimTree.claims.get(depNumber);
            if (!depClaim) return null;

            const isLast = index === arr.length - 1;

            return (
              <div key={depNumber} className="relative">
                {/* Connecting line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 to-blue-200 chain-connector" />
                )}

                <div className="pl-6 pt-3 relative">
                  {/* Arrow indicator */}
                  <div className="absolute left-0 top-6">
                    <ArrowUp className="h-4 w-4 text-blue-400 rotate-180" />
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-blue-900">
                        Claim {depNumber}
                      </span>
                    </div>
                    <div className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MultiDependencyViewProps {
  claim: ParsedClaim;
  claimTree: ClaimTree;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  annotations: AnnotationData[];
  fullText: string;
  onAnnotationClick?: (annotation: AnnotationData) => void;
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

function MultiDependencyView({
  claim,
  claimTree,
  isExpanded,
  onToggleExpanded,
  annotations,
  fullText,
  onAnnotationClick,
  onAnnotationHover
}: MultiDependencyViewProps) {
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set());
  const rangeText = formatMultiDependencyRange(claim.dependsOn);

  const toggleOption = (claimNumber: number) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(claimNumber)) {
      newExpanded.delete(claimNumber);
    } else {
      newExpanded.add(claimNumber);
    }
    setExpandedOptions(newExpanded);
  };

  return (
    <div className="mb-4">
      <button
        onClick={onToggleExpanded}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-sm font-medium text-purple-900 w-full border border-purple-200"
      >
        <GitBranch className="h-4 w-4 flex-shrink-0" />
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="flex-1 text-left">
          {isExpanded ? 'Alternative options:' : `Depends on ${rangeText}`}
        </span>
        <span className="text-xs text-purple-600 ml-auto flex-shrink-0">
          {isExpanded ? 'Hide' : 'Show'} options
        </span>
      </button>

      {/* Expanded multi-dependency view */}
      {isExpanded && (
        <div className="mt-3">
          {claim.dependsOn.length > 4 && (
            <div className="text-xs text-purple-600 mb-2 px-2">
              Scroll horizontally to view all options →
            </div>
          )}
          <div className="multi-dependency-scroll overflow-x-auto pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-w-max md:min-w-0">
              {claim.dependsOn.map((depNumber) => {
                const depClaim = claimTree.claims.get(depNumber);
                if (!depClaim) return null;

                const isOptionExpanded = expandedOptions.has(depNumber);
                const dependencySummary = getDependencySummary(depClaim, claimTree);

                return (
                  <div
                    key={depNumber}
                    className="bg-purple-50 rounded-lg border-2 border-purple-200 min-w-[300px] md:min-w-0"
                  >
                    <button
                      onClick={() => toggleOption(depNumber)}
                      className="w-full px-4 py-3 text-left hover:bg-purple-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-purple-900">
                            Claim {depNumber}
                          </span>
                        </div>
                        {isOptionExpanded ? (
                          <ChevronUp className="h-4 w-4 text-purple-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      {dependencySummary && (
                        <div className="text-xs text-purple-600 mt-1">
                          {dependencySummary}
                        </div>
                      )}
                    </button>

                    {isOptionExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-purple-200">
                        <div className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap">
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
