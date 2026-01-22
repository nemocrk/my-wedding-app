import React, { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(undefined);

/**
 * Custom Toast Component with gradient background and progress bar
 */
const CustomToast = ({ type, message, t }) => {
  const config = {
    success: {
      icon: CheckCircle,
      gradient: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      iconColor: 'text-green-600',
      progress: 'bg-green-500',
    },
    error: {
      icon: XCircle,
      gradient: 'from-red-50 to-rose-50',
      border: 'border-red-200',
      iconColor: 'text-red-600',
      progress: 'bg-red-500',
    },
    warning: {
      icon: AlertCircle,
      gradient: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      progress: 'bg-yellow-500',
    },
    info: {
      icon: Info,
      gradient: 'from-blue-50 to-sky-50',
      border: 'border-blue-200',
      iconColor: 'text-blue-600',
      progress: 'bg-blue-500',
    },
  };

  const { icon: Icon, gradient, border, iconColor } = config[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 bg-gradient-to-r ${gradient} ${border} border rounded-lg shadow-lg`}
    >
      <div className={`flex-shrink-0 ${iconColor}`}>
        <Icon size={24} />
      </div>
      <p className="text-sm font-medium text-gray-900 leading-relaxed flex-1">
        {message}
      </p>
    </div>
  );
};

/**
 * ToastProvider - Wraps react-hot-toast with custom styling
 */
export const ToastProvider = ({ children }) => {
  const show = (message, type = 'info', duration = 3000) => {
    return toast.custom(
      (t) => <CustomToast type={type} message={message} t={t} />,
      {
        duration,
        position: 'top-right',
      }
    );
  };

  const success = (message, duration = 3000) => {
    return toast.custom(
      (t) => <CustomToast type="success" message={message} t={t} />,
      { duration, position: 'top-right' }
    );
  };

  const error = (message, duration = 3000) => {
    return toast.custom(
      (t) => <CustomToast type="error" message={message} t={t} />,
      { duration, position: 'top-right' }
    );
  };

  const warning = (message, duration = 3000) => {
    return toast.custom(
      (t) => <CustomToast type="warning" message={message} t={t} />,
      { duration, position: 'top-right' }
    );
  };

  const info = (message, duration = 3000) => {
    return toast.custom(
      (t) => <CustomToast type="info" message={message} t={t} />,
      { duration, position: 'top-right' }
    );
  };

  // Advanced features from react-hot-toast
  const promise = (promiseFn, messages) => {
    return toast.promise(promiseFn, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  };

  const loading = (message) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  };

  const dismiss = (toastId) => {
    toast.dismiss(toastId);
  };

  const value = {
    show,
    success,
    error,
    warning,
    info,
    promise, // 🎉 NEW: Promise handling
    loading, // 🎉 NEW: Loading state
    dismiss, // 🎉 NEW: Manual dismiss
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        }}
      />
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook - Access toast notification functions
 * @returns {Object} Toast methods: { show, success, error, warning, info, promise, loading, dismiss }
 * @example
 * const toast = useToast();
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 * 
 * // NEW: Promise handling
 * toast.promise(
 *   fetchData(),
 *   {
 *     loading: 'Loading...',
 *     success: 'Data loaded!',
 *     error: 'Failed to load data'
 *   }
 * );
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
