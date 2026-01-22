import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Toast Component - Displays temporary notification messages
 * @param {Object} props
 * @param {string} props.id - Unique toast identifier
 * @param {string} props.type - Toast type: 'success' | 'error' | 'warning' | 'info'
 * @param {string} props.message - Toast message content
 * @param {number} props.duration - Auto-dismiss duration in ms (default: 3000)
 * @param {Function} props.onClose - Callback when toast is dismissed
 */
const Toast = ({ id, type = 'info', message, duration = 3000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const decrement = (100 / duration) * 50; // Update every 50ms
        return Math.max(0, prev - decrement);
      });
    }, 50);

    // Auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const config = {
    success: {
      icon: CheckCircle,
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      progressColor: 'bg-green-500',
    },
    error: {
      icon: XCircle,
      bgGradient: 'from-red-50 to-rose-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      progressColor: 'bg-red-500',
    },
    warning: {
      icon: AlertCircle,
      bgGradient: 'from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      progressColor: 'bg-yellow-500',
    },
    info: {
      icon: Info,
      bgGradient: 'from-blue-50 to-sky-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      progressColor: 'bg-blue-500',
    },
  };

  const { icon: Icon, bgGradient, borderColor, iconColor, progressColor } = config[type];

  return (
    <div
      className={`
        relative w-full max-w-sm overflow-hidden rounded-lg shadow-lg border
        bg-gradient-to-r ${bgGradient} ${borderColor}
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${iconColor}`}>
            <Icon size={24} />
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className={`h-full ${progressColor} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Toast;