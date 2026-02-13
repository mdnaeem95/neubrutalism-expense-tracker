import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import NeuDialog, { type DialogButton, type DialogButtonStyle } from '@/components/ui/NeuDialog';

interface DialogConfig {
  title: string;
  message?: string;
  buttons: DialogButton[];
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
}

interface DialogContextValue {
  showDialog: (config: DialogConfig) => void;
  showConfirm: (config: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void;
  showError: (title: string, message: string) => void;
  showSuccess: (title: string, message: string, onDismiss?: () => void) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const queueRef = useRef<DialogConfig[]>([]);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Show next queued dialog after a short delay for animation
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setConfig(next);
        setVisible(true);
      } else {
        setConfig(null);
      }
    }, 250);
  }, []);

  const showDialog = useCallback((cfg: DialogConfig) => {
    // Wrap button onPress to auto-dismiss
    const wrappedButtons = cfg.buttons.map((btn) => ({
      ...btn,
      onPress: () => {
        dismiss();
        btn.onPress?.();
      },
    }));

    const wrappedConfig = { ...cfg, buttons: wrappedButtons };

    if (visible) {
      queueRef.current.push(wrappedConfig);
    } else {
      setConfig(wrappedConfig);
      setVisible(true);
    }
  }, [visible, dismiss]);

  const showConfirm = useCallback(({ title, message, confirmLabel = 'Delete', onConfirm }: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => {
    showDialog({
      title,
      message,
      icon: 'alert-circle-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
      iconColor: colors.error,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmLabel, style: 'destructive', onPress: onConfirm },
      ],
    });
  }, [showDialog, colors]);

  const showError = useCallback((title: string, message: string) => {
    showDialog({
      title,
      message,
      icon: 'close-circle-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
      iconColor: colors.error,
      buttons: [{ text: 'OK', style: 'default' }],
    });
  }, [showDialog, colors]);

  const showSuccess = useCallback((title: string, message: string, onDismiss?: () => void) => {
    showDialog({
      title,
      message,
      icon: 'check-circle-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
      iconColor: colors.success,
      buttons: [{ text: 'OK', style: 'default', onPress: onDismiss }],
    });
  }, [showDialog, colors]);

  return (
    <DialogContext.Provider value={{ showDialog, showConfirm, showError, showSuccess }}>
      {children}
      {config && (
        <NeuDialog
          visible={visible}
          title={config.title}
          message={config.message}
          buttons={config.buttons}
          icon={config.icon}
          iconColor={config.iconColor}
          onDismiss={dismiss}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
}
