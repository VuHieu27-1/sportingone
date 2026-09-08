import React, { useState, useRef } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Percent,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ChartDataPoint, ChartMetricType } from './types';

interface MainRevenueChartProps {
  dataPoints: ChartDataPoint[];
  metric: ChartMetricType;
  onMetricChange: (metric: ChartMetricType) => void;
  comparePrevious: boolean;
  timeRangeLabel: string;
  clusterTitle: string;
}

export const MainRevenueChart: React.FC<MainRevenueChartProps> = ({
  dataPoints,
  metric,
  onMetricChange,
  comparePrevious,
  timeRangeLabel,
  clusterTitle,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getMetricValue = (pt: ChartDataPoint, isPrev: boolean = false): number => {
    if (metric === 'revenue') {
      return isPrev ? pt.previousValue : pt.currentValue;
    }
    if (metric === 'orders') {
      return isPrev ? pt.previousOrders : pt.currentOrders;
    }
    // occupancy
    return isPrev ? pt.previousOccupancy : pt.currentOccupancy;
  };

  const currentValues = dataPoints.map((pt) => getMetricValue(pt, false));
  const previousValues = dataPoints.map((pt) => getMetricValue(pt, true));

  const totalCurrent = currentValues.reduce((acc, curr) => acc + curr, 0);
  const totalPrevious = previousValues.reduce((acc, curr) => acc + curr, 0);

  const maxVal = Math.max(
    ...currentValues,
    comparePrevious ? Math.max(...previousValues, 0) : 0,
    metric === 'occupancy' ? 100 : metric === 'orders' ? 5 : 500000
  );

  const width = 800;
  const height = 280;
  const paddingX = 55;
  const paddingY = 40;
  const chartWidth = width - 2 * paddingX;
  const chartHeight = height - 2 * paddingY;

  const pointsCount = Math.max(dataPoints.length, 1);

  const currentCoords = dataPoints.map((pt, idx) => {
    const x = paddingX + (idx / Math.max(pointsCount - 1, 1)) * chartWidth;
    const val = getMetricValue(pt, false);
    const y = height - paddingY - (val / (maxVal || 1)) * chartHeight;
    return { x, y, val, pt };
  });

  const prevCoords = dataPoints.map((pt, idx) => {
    const x = paddingX + (idx / Math.max(pointsCount - 1, 1)) * chartWidth;
    const val = getMetricValue(pt, true);
    const y = height - paddingY - (val / (maxVal || 1)) * chartHeight;
    return { x, y, val, pt };
  });

  const createSmoothPath = (coords: Array<{ x: number; y: number }>) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

    return coords.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = coords[idx - 1];
      const cp1x = prev.x + (pt.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (pt.x - prev.x) / 2;
      const cp2y = pt.y;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
    }, '');
  };

  const currentPathD = createSmoothPath(currentCoords);
  const prevPathD = createSmoothPath(prevCoords);

  const currentFillD =
    currentCoords.length > 0
      ? `${currentPathD} L ${currentCoords[currentCoords.length - 1].x} ${height - paddingY} L ${currentCoords[0].x} ${height - paddingY} Z`
      : '';

  const formatDisplayValue = (val: number) => {
    if (metric === 'revenue') return `${val.toLocaleString('vi-VN')}đ`;
    if (metric === 'orders') return `${val} đơn`;
    return `${val.toFixed(1)}%`;
  };

  const formatShortAxisVal = (val: number) => {
    if (metric === 'revenue') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
      return `${val}`;
    }
    if (metric === 'orders') return `${val}`;
    return `${val.toFixed(0)}%`;
  };

  // Smooth mouse movement tracker anywhere on the chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || pointsCount <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * width;

    // Find nearest point index based on horizontal position
    const boundedX = Math.min(Math.max(mouseSvgX, paddingX), width - paddingX);
    const progress = (boundedX - paddingX) / chartWidth;
    const nearestIdx = Math.min(
      Math.max(Math.round(progress * (pointsCount - 1)), 0),
      pointsCount - 1
    );

    setHoveredIdx(nearestIdx);
  };

  const hoveredPoint = hoveredIdx !== null && dataPoints[hoveredIdx] ? dataPoints[hoveredIdx] : null;
  const hoveredCoord = hoveredIdx !== null && currentCoords[hoveredIdx] ? currentCoords[hoveredIdx] : null;

  // Calculate tooltip placement: above the pointer dot
  // If dot is too high near top border (y < 90), flip tooltip to sit below the dot
  const isTopFlipped = hoveredCoord ? hoveredCoord.y < 85 : false;
  const tooltipLeftPercent = hoveredCoord ? (hoveredCoord.x / width) * 100 : 50;
  const tooltipTopPercent = hoveredCoord ? (hoveredCoord.y / height) * 100 : 50;

  return (
    <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm font-['Plus_Jakarta_Sans',sans-serif] space-y-4">
      {/* Header with Title & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#F2F0EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-base font-extrabold text-[#1E3932]">
              Biểu Đồ Doanh Thu &amp; Xu Hướng: {clusterTitle}
            </h2>
          </div>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Tổng quan biến thiên theo thời gian thực dựa trên toàn bộ đơn đặt sân thực tế.
          </p>
        </div>

        {/* Metric Switcher Tabs */}
        <div className="flex items-center bg-[#F2F0EB] p-1 rounded-full text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => onMetricChange('revenue')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              metric === 'revenue'
                ? 'bg-white text-[#006241] shadow-sm'
                : 'text-[#6F7E72] hover:text-[#1E3932]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Doanh thu</span>
          </button>

          <button
            type="button"
            onClick={() => onMetricChange('orders')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              metric === 'orders'
                ? 'bg-white text-[#006241] shadow-sm'
                : 'text-[#6F7E72] hover:text-[#1E3932]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Số đơn</span>
          </button>

          <button
            type="button"
            onClick={() => onMetricChange('occupancy')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              metric === 'occupancy'
                ? 'bg-white text-[#006241] shadow-sm'
                : 'text-[#6F7E72] hover:text-[#1E3932]'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Độ lấp đầy (%)</span>
          </button>
        </div>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-[#006241]" />
            <span className="text-[#1E3932]">Kỳ này ({timeRangeLabel})</span>
          </div>

          {comparePrevious && (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1 border-t-2 border-dashed border-slate-400" />
              <span className="text-[#6F7E72]">Kỳ trước</span>
            </div>
          )}
        </div>

        <div className="text-xs text-[#6F7E72]">
          Tổng {metric === 'revenue' ? 'doanh thu' : metric === 'orders' ? 'số đơn' : 'độ lấp đầy TB'}:{' '}
          <strong className="text-[#006241] font-mono text-sm">
            {formatDisplayValue(
              metric === 'occupancy'
                ? totalCurrent / Math.max(dataPoints.length, 1)
                : totalCurrent
            )}
          </strong>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="w-full relative pt-2 select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-h-[220px] max-h-[320px] overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="mainRevenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#006241" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#006241" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Axis values */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * chartHeight;
            const labelVal = maxVal * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#E6E2D8"
                  strokeDasharray={ratio === 0 ? '0' : '4 4'}
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fontSize="10"
                  fontWeight="600"
                  fill="#94A3B8"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                >
                  {formatShortAxisVal(labelVal)}
                </text>
              </g>
            );
          })}

          {/* Previous period dashed line */}
          {comparePrevious && prevPathD && (
            <path
              d={prevPathD}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}

          {/* Current period area fill */}
          {currentFillD && <path d={currentFillD} fill="url(#mainRevenueGrad)" />}

          {/* Current period main stroke */}
          {currentPathD && (
            <path
              d={currentPathD}
              fill="none"
              stroke="#006241"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Vertical highlight tracking line on hover */}
          {hoveredCoord && (
            <line
              x1={hoveredCoord.x}
              y1={paddingY}
              x2={hoveredCoord.x}
              y2={height - paddingY}
              stroke="#006241"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              opacity="0.8"
            />
          )}

          {/* Data Points (Dots) */}
          {currentCoords.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g key={idx} className="pointer-events-none">
                {/* Outer halo when hovered */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="10"
                    fill="#006241"
                    fillOpacity="0.15"
                    className="animate-ping"
                  />
                )}

                {/* Dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : pt.val > 0 ? 3.5 : 2}
                  fill={isHovered ? '#006241' : pt.val > 0 ? '#006241' : '#CBD5E1'}
                  stroke="#FFFFFF"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-100"
                />
              </g>
            );
          })}

          {/* X-axis Labels */}
          {currentCoords.map((pt, idx) => {
            const showLabel =
              pointsCount <= 14 ||
              idx % Math.ceil(pointsCount / 12) === 0 ||
              idx === pointsCount - 1;
            if (!showLabel) return null;

            return (
              <text
                key={idx}
                x={pt.x}
                y={height - 14}
                fontSize="9.5"
                fontWeight={hoveredIdx === idx ? '800' : '600'}
                fill={hoveredIdx === idx ? '#006241' : '#6F7E72'}
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                className="transition-colors duration-100"
              >
                {pt.pt.label}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip positioned neatly ABOVE the pointer */}
        {hoveredPoint && hoveredCoord && (
          <div
            className="absolute z-50 pointer-events-none transition-all duration-75 ease-out"
            style={{
              left: `${tooltipLeftPercent}%`,
              top: `${tooltipTopPercent}%`,
              transform: isTopFlipped
                ? 'translate(-50%, 14px)'
                : 'translate(-50%, calc(-100% - 14px))',
            }}
          >
            <div className="bg-[#1E3932] text-white px-3.5 py-2.5 rounded-2xl shadow-2xl text-xs space-y-1 border border-emerald-500/30 min-w-[190px] relative">
              {/* Pointing Caret Arrow */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#1E3932] border-emerald-500/30 rotate-45 ${
                  isTopFlipped
                    ? '-top-1.5 border-t border-l'
                    : '-bottom-1.5 border-b border-r'
                }`}
              />

              <div className="flex items-center justify-between border-b border-white/15 pb-1 font-bold">
                <span className="text-emerald-400 font-mono text-[11px]">
                  {hoveredPoint.label}
                  {hoveredPoint.subLabel && hoveredPoint.subLabel !== hoveredPoint.label
                    ? ` · ${hoveredPoint.subLabel}`
                    : ''}
                </span>
                <span className="text-[10px] font-medium text-white/60">Chi tiết</span>
              </div>

              <div className="space-y-0.5 pt-0.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Doanh thu:</span>
                  <strong className="font-mono text-emerald-300 font-bold">
                    {hoveredPoint.currentValue.toLocaleString('vi-VN')}đ
                  </strong>
                </div>

                {comparePrevious && (
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>Kỳ trước:</span>
                    <span className="font-mono">
                      {hoveredPoint.previousValue.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-white/70">Đã thanh toán:</span>
                  <strong className="font-mono text-white">
                    {hoveredPoint.currentOrders} đơn
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/70">Giờ đã thuê:</span>
                  <span className="font-mono text-white font-medium">
                    {hoveredPoint.currentHours.toFixed(1)}h
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/70">Độ lấp đầy:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {hoveredPoint.currentOccupancy.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
