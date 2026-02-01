import { useEffect } from 'react';
import { X, FileText, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClaimTree, ParsedClaim } from '@/lib/claim-parser';

interface ClaimTreeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  claimTree: ClaimTree;
  errorCounts: Map<number, number>;
  onClaimClick: (claimNumber: number) => void;
}

export function ClaimTreeOverlay({
  isOpen,
  onClose,
  claimTree,
  errorCounts,
  onClaimClick,
}: ClaimTreeOverlayProps) {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClaimClick = (claimNumber: number) => {
    onClaimClick(claimNumber);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 claim-tree-backdrop"
        onClick={onClose}
        style={{ top: '4rem' }} // Account for top nav
      />

      {/* Slide-in Panel */}
      <div
        className="fixed left-0 top-16 bottom-0 w-96 bg-white shadow-2xl z-50 claim-tree-panel overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold text-lg text-stone-900">Claim Tree</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-stone-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {claimTree.roots.map((rootNumber) => (
            <ClaimTreeNode
              key={rootNumber}
              claimNumber={rootNumber}
              claimTree={claimTree}
              errorCounts={errorCounts}
              onClaimClick={handleClaimClick}
              depth={0}
            />
          ))}

          {claimTree.roots.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-stone-500">
              <FileText className="h-12 w-12 mb-3 text-stone-300" />
              <p className="text-sm">No claims found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface ClaimTreeNodeProps {
  claimNumber: number;
  claimTree: ClaimTree;
  errorCounts: Map<number, number>;
  onClaimClick: (claimNumber: number) => void;
  depth: number;
}

function ClaimTreeNode({
  claimNumber,
  claimTree,
  errorCounts,
  onClaimClick,
  depth,
}: ClaimTreeNodeProps) {
  const claim = claimTree.claims.get(claimNumber);
  if (!claim) return null;

  const errorCount = errorCounts.get(claimNumber) || 0;
  const hasMultipleDependencies = claim.dependsOn.length > 1;

  // Find children (claims that depend on this one)
  const children: number[] = [];
  claimTree.claims.forEach((c) => {
    if (c.dependsOn.includes(claimNumber)) {
      children.push(c.number);
    }
  });

  // Color based on error count
  const getColorClass = () => {
    if (errorCount === 0) return 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100';
    if (errorCount <= 2) return 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100';
    return 'bg-red-50 border-red-200 text-red-900 hover:bg-red-100';
  };

  const getErrorBadgeClass = () => {
    if (errorCount === 0) return 'bg-emerald-100 text-emerald-700';
    if (errorCount <= 2) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-2">
      {/* Claim Node */}
      <div
        className="relative group"
        style={{ paddingLeft: `${depth * 1.5}rem` }}
      >
        {/* Connecting Line */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-px bg-stone-300" style={{ left: `${(depth - 1) * 1.5 + 0.5}rem` }} />
        )}
        {depth > 0 && (
          <div className="absolute top-1/2 w-4 border-t border-stone-300" style={{ left: `${(depth - 1) * 1.5 + 0.5}rem` }} />
        )}

        {/* Claim Card */}
        <div
          className={`
            relative cursor-pointer rounded-lg border-2 p-3 transition-all
            ${getColorClass()}
          `}
          onClick={() => onClaimClick(claimNumber)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className={`font-bold text-sm ${claim.isIndependent ? 'text-base' : ''}`}>
                  Claim {claimNumber}
                </span>
                {claim.isIndependent && (
                  <Badge className="text-[10px] bg-stone-700 text-white border-0 px-1.5 py-0">
                    IND
                  </Badge>
                )}
              </div>

              {/* Multiple dependencies badge */}
              {hasMultipleDependencies && (
                <div className="flex items-center gap-1.5 mt-2">
                  <GitBranch className="h-3 w-3 text-stone-500" />
                  <span className="text-xs text-stone-600 font-medium">
                    any of {Math.min(...claim.dependsOn)}-{Math.max(...claim.dependsOn)}
                  </span>
                </div>
              )}

              {/* Preview of claim text */}
              <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                {claim.text.length > 100 ? claim.text.slice(0, 100) + '...' : claim.text}
              </p>
            </div>

            {/* Error Badge */}
            {errorCount > 0 && (
              <Badge className={`text-xs font-semibold border-0 flex-shrink-0 ${getErrorBadgeClass()}`}>
                {errorCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Render Children */}
      {children.length > 0 && (
        <div className="space-y-2">
          {children.map((childNumber) => (
            <ClaimTreeNode
              key={childNumber}
              claimNumber={childNumber}
              claimTree={claimTree}
              errorCounts={errorCounts}
              onClaimClick={onClaimClick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
