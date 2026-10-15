import React from 'react';
import { generateCode128SvgData, BarcodeRenderOptions } from '../../utils/code128';

interface Code128BarcodeProps {
  value: string;
  options?: BarcodeRenderOptions;
  className?: string;
  showText?: boolean;
}

export const Code128Barcode: React.FC<Code128BarcodeProps> = ({
  value,
  options = {},
  className = '',
  showText = true
}) => {
  const svgData = generateCode128SvgData(value, {
    includeText: showText,
    width: options.width ?? 1.5,
    height: options.height ?? 46,
    fontSize: options.fontSize ?? 10,
    ...options
  });

  if (!svgData) {
    return (
      <div className={`p-2 border border-dashed border-red-300 text-xs text-red-600 rounded bg-red-50 text-center ${className}`}>
        رمز باركود غير صالح ({value})
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center bg-white ${className}`}>
      <svg
        width={svgData.totalWidth}
        height={svgData.totalHeight}
        viewBox={`0 0 ${svgData.totalWidth} ${svgData.totalHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <rect
          x="0"
          y="0"
          width={svgData.totalWidth}
          height={svgData.totalHeight}
          fill={svgData.backgroundColor}
        />
        {svgData.rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y="4"
            width={r.width}
            height={svgData.height}
            fill={svgData.barColor}
          />
        ))}
        {showText && (
          <text
            x={svgData.totalWidth / 2}
            y={svgData.height + svgData.fontSize + 4}
            textAnchor="middle"
            fill={svgData.textColor}
            fontSize={svgData.fontSize}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="600"
            letterSpacing="1px"
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  );
};
