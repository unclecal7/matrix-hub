import { useRef, useState, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CheckIcon, LockIcon } from './Icons';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { IOItem } from '../hooks/useGroupFiltering';

const CELL_SIZE = 36;
const HEADER_W = 200;
const COL_HEADER_H = 160;

function hexToRgba(hex: string | undefined, alpha: number): string {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return `rgba(255,255,255,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

interface RoutingGridProps {
  inputs: IOItem[];
  visibleRows: (IOItem & { type: string })[];
  routing: Record<number, number>;
  showLocks: boolean;
  isOffline: boolean;
  outputsArray: IOItem[];
  inputsArray: IOItem[];
  onRoute: (outId: number, inId: number) => void;
  onSearch: () => void;
  onPresetRecall: (index: number) => void;
}

export default function RoutingGrid({
  inputs,
  visibleRows,
  routing,
  showLocks,
  isOffline,
  outputsArray,
  inputsArray,
  onRoute,
  onSearch,
  onPresetRecall,
}: RoutingGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [headerWidth, setHeaderWidth] = useState<number>(() => {
    const stored = localStorage.getItem('mh-header-w');
    return stored ? Math.max(120, Math.min(500, parseInt(stored, 10))) : 200;
  });
  const headerWidthRef = useRef(headerWidth);
  useEffect(() => { headerWidthRef.current = headerWidth; }, [headerWidth]);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    input: string;
    output: string;
    active: boolean;
  } | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => gridRef.current,
    estimateSize: () => CELL_SIZE,
    overscan: 10,
  });

  const colVirtualizer = useVirtualizer({
    count: inputs.length,
    getScrollElement: () => gridRef.current,
    estimateSize: () => CELL_SIZE,
    horizontal: true,
    overscan: 10,
  });

  const handleRoute = useCallback(
    (outId: number, inId: number) => {
      const output = outputsArray.find((o) => o.id === outId);
      if (output?.locked && showLocks) return;
      setFlashCell(`${outId}-${inId}`);
      setTimeout(() => setFlashCell(null), 400);
      onRoute(outId, inId);
    },
    [showLocks, outputsArray, onRoute],
  );

  const handleCellHover = useCallback(
    (outId: number, inId: number, e: React.MouseEvent) => {
      setHoveredCell({ row: outId, col: inId });
      const outItem = outputsArray.find((o) => o.id === outId);
      const inItem = inputsArray.find((i) => i.id === inId);
      if (outItem && inItem) {
        setTooltip({
          x: e.clientX + 12,
          y: e.clientY - 8,
          input: inItem.label,
          output: outItem.label,
          active: routing[outId] === inId,
        });
      }
    },
    [routing, outputsArray, inputsArray],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setTooltip(null);
  }, []);

  // Scroll selected cell into view
  const scrollToCell = useCallback(
    (rowIdx: number, colIdx: number) => {
      rowVirtualizer.scrollToIndex(rowIdx, { align: 'auto' });
      colVirtualizer.scrollToIndex(colIdx, { align: 'auto' });
    },
    [rowVirtualizer, colVirtualizer],
  );

  // Keyboard navigation
  useKeyboardShortcuts({
    enabled: !isOffline,
    onNavigate: useCallback(
      (direction) => {
        setSelectedCell((prev) => {
          const rowCount = visibleRows.length;
          const colCount = inputs.length;
          if (rowCount === 0 || colCount === 0) return prev;

          let { rowIdx, colIdx } = prev || { rowIdx: 0, colIdx: 0 };

          switch (direction) {
            case 'up':
              rowIdx = Math.max(0, rowIdx - 1);
              break;
            case 'down':
              rowIdx = Math.min(rowCount - 1, rowIdx + 1);
              break;
            case 'left':
              colIdx = Math.max(0, colIdx - 1);
              break;
            case 'right':
              colIdx = Math.min(colCount - 1, colIdx + 1);
              break;
          }

          scrollToCell(rowIdx, colIdx);
          const row = visibleRows[rowIdx];
          const col = inputs[colIdx];
          if (row && col) {
            setHoveredCell({ row: row.id, col: col.id });
          }
          return { rowIdx, colIdx };
        });
      },
      [visibleRows, inputs, scrollToCell],
    ),
    onRoute: useCallback(() => {
      if (!selectedCell) return;
      const row = visibleRows[selectedCell.rowIdx];
      const col = inputs[selectedCell.colIdx];
      if (row && col) {
        handleRoute(row.id, col.id);
      }
    }, [selectedCell, visibleRows, inputs, handleRoute]),
    onClear: useCallback(() => {
      setSelectedCell(null);
      setHoveredCell(null);
      setTooltip(null);
    }, []),
    onSearch,
    onPresetRecall,
  });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = headerWidthRef.current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      setHeaderWidth(Math.max(120, Math.min(500, dragStartW.current + delta)));
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('mh-header-w', String(headerWidthRef.current));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Derive selected cell IDs for rendering
  const selectedRowId = selectedCell ? visibleRows[selectedCell.rowIdx]?.id : undefined;
  const selectedColId = selectedCell ? inputs[selectedCell.colIdx]?.id : undefined;

  return (
    <>
      <div
        className="mh-grid-container"
        ref={gridRef}
        style={{ '--mh-header-w': `${headerWidth}px` } as React.CSSProperties}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            position: 'relative',
            width: headerWidth + colVirtualizer.getTotalSize(),
            height: COL_HEADER_H + rowVirtualizer.getTotalSize(),
          }}
        >
          {/* Column headers */}
          <div className="mh-col-headers" style={{ height: COL_HEADER_H }}>
            {/* Sticky left spacer */}
            <div
              style={{
                position: 'sticky',
                left: 0,
                width: headerWidth,
                height: COL_HEADER_H,
                flexShrink: 0,
                background: 'var(--mh-surface)',
                borderRight: '1px solid var(--mh-border)',
                zIndex: 2,
              }}
            >
              <div className="mh-resize-handle" onMouseDown={handleDragStart} />
            </div>

            {/* Scrollable column headers */}
            <div
              style={{
                position: 'relative',
                width: colVirtualizer.getTotalSize() + CELL_SIZE * 2,
                height: COL_HEADER_H,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {colVirtualizer.getVirtualItems().map((virtualCol) => {
                const input = inputs[virtualCol.index];
                const isColHovered = hoveredCell?.col === input.id;
                return (
                  <div
                    key={input.id}
                    className={`mh-col-header ${isColHovered ? 'hovered' : ''}`}
                    style={{
                      position: 'absolute',
                      left: virtualCol.start,
                      top: 0,
                      width: virtualCol.size,
                      height: COL_HEADER_H,
                    }}
                  >
                    <div
                      className="mh-col-header-text"
                      style={{ color: isColHovered ? undefined : input.color }}
                    >
                      {input.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          <div style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
            {/* Crosshair column overlay */}
            {hoveredCell && !isOffline && (() => {
              const colIdx = inputs.findIndex((i) => i.id === hoveredCell.col);
              if (colIdx === -1) return null;
              return (
                <div
                  className="mh-crosshair-col"
                  style={{ left: headerWidth + colIdx * CELL_SIZE, top: 0, bottom: 0 }}
                />
              );
            })()}

            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = visibleRows[virtualRow.index];
              if (!row) return null;
              const isRowHovered = hoveredCell?.row === row.id;
              const routedId = routing[row.id];
              const routedLabel = routedId !== undefined
                ? inputsArray.find((i) => i.id === routedId)?.label
                : undefined;
              return (
                <div
                  key={virtualRow.key}
                  className="mh-row"
                  style={{
                    position: 'absolute',
                    top: virtualRow.start,
                    left: 0,
                    width: headerWidth + colVirtualizer.getTotalSize(),
                    height: virtualRow.size,
                    display: 'flex',
                    ...(isRowHovered && !isOffline ? { background: 'var(--mh-accent-dim)' } : {}),
                  }}
                >
                  <div className={`mh-row-header ${isRowHovered ? 'hovered' : ''}`}>
                    <div className="mh-row-color" style={{ background: row.color }} />
                    <span className="mh-row-label">{row.label}</span>
                    {routedLabel && !isOffline && (
                      <span className="mh-route-badge" title={routedLabel}>→ {routedLabel}</span>
                    )}
                    {row.locked && showLocks && <LockIcon color="#f43f5e" />}
                  </div>

                  {/* Scrollable cells */}
                  <div
                    style={{
                      position: 'relative',
                      width: colVirtualizer.getTotalSize(),
                      height: CELL_SIZE,
                      flexShrink: 0,
                    }}
                  >
                    {colVirtualizer.getVirtualItems().map((virtualCol) => {
                      const input = inputs[virtualCol.index];
                      const isActive = routing[row.id] === input.id;
                      const isLocked = row.locked && showLocks;
                      const cellKey = `${row.id}-${input.id}`;
                      const isFlashing = flashCell === cellKey;
                      const isSelected = row.id === selectedRowId && input.id === selectedColId;
                      return (
                        <div
                          key={cellKey}
                          className={`mh-cell ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isFlashing ? 'flash' : ''} ${isSelected ? 'selected' : ''}`}
                          style={{
                            position: 'absolute',
                            left: virtualCol.start,
                            top: 0,
                            width: virtualCol.size,
                            height: CELL_SIZE,
                            background: hexToRgba(input.color, hoveredCell?.col === input.id && !isOffline ? 0.07 : 0.03),
                          }}
                          onClick={() => {
                            handleRoute(row.id, input.id);
                            const rIdx = visibleRows.findIndex((r) => r.id === row.id);
                            if (rIdx >= 0) setSelectedCell({ rowIdx: rIdx, colIdx: virtualCol.index });
                          }}
                          onMouseEnter={(e) => handleCellHover(row.id, input.id, e)}
                          onMouseMove={(e) => {
                            if (tooltip) setTooltip((t) => ({ ...t!, x: e.clientX + 12, y: e.clientY - 8 }));
                          }}
                        >
                          {isActive && (
                            <div className="mh-checkmark">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Offline overlay */}
        {isOffline && (
          <div className="mh-offline-overlay">
            <div className="mh-offline-text">OFFLINE</div>
            <div className="mh-offline-sub">Device connection lost — waiting for reconnect...</div>
            <div
              style={{
                width: 120,
                height: 2,
                background: 'var(--mh-surface3)',
                borderRadius: 1,
                marginTop: 8,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: 'var(--mh-danger)',
                  borderRadius: 1,
                  position: 'absolute',
                  animation: 'mh-scan 1.5s ease-in-out infinite',
                }}
              />
            </div>
            <style>{`
              @keyframes mh-scan {
                0% { left: -40px; }
                100% { left: 120px; }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && !isOffline && (
        <div className="mh-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div>
            <strong>{tooltip.output}</strong> ← {tooltip.input}
          </div>
          <div className="mh-tooltip-route">
            {tooltip.active ? '✓ Active route — click to clear' : 'Click to route'}
          </div>
        </div>
      )}
    </>
  );
}
