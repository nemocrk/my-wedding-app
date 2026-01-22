import React, { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip Component - Displays a tooltip on hover
 * @param {Object} props
 * @param {React.ReactNode} props.children - Trigger element
 * @param {string|React.ReactNode} props.content - Tooltip content
 * @param {string} props.position - Position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * @param {string} props.className - Additional CSS classes for trigger wrapper
 */
const Tooltip = ({ children, content, position = 'top', className = '' }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x, y;

    switch (position) {
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom;
        break;
      case 'left':
        x = rect.left;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right;
        y = rect.top + rect.height / 2;
        break;
      case 'top':
      default:
        x = rect.left + rect.width / 2;
        y = rect.top;
        break;
    }

    setTooltip({ show: true, x, y });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  const getTransform = () => {
    switch (position) {
      case 'bottom':
        return 'translate(-50%, 10px)';
      case 'left':
        return 'translate(calc(-100% - 10px), -50%)';
      case 'right':
        return 'translate(10px, -50%)';
      case 'top':
      default:
        return 'translate(-50%, -100%)';
    }
  };

  const getArrowStyle = () => {
    const baseStyle = {
      position: 'absolute',
      width: 0,
      height: 0,
    };

    switch (position) {
      case 'bottom':
        return {
          ...baseStyle,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid #111827',
        };
      case 'left':
        return {
          ...baseStyle,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderLeft: '6px solid #111827',
        };
      case 'right':
        return {
          ...baseStyle,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderRight: '6px solid #111827',
        };
      case 'top':
      default:
        return {
          ...baseStyle,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #111827',
        };
    }
  };

  return (
    <>
      <div
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {tooltip.show && createPortal(
        <div
          className="fixed z-[9999] w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl pointer-events-none hidden lg:block"
          style={{
            top: `${tooltip.y}px`,
            left: `${tooltip.x}px`,
            transform: getTransform(),
          }}
        >
          <div className="break-words">{content}</div>
          <div style={getArrowStyle()}></div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
