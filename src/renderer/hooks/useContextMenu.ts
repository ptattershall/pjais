import { useCallback } from 'react';

// Context menu item interface
interface ContextMenuItem {
  label: string;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
  accelerator?: string;
  click?: () => void;
  submenu?: ContextMenuItem[];
}

// Generic item type that can be passed to the context menu
interface ContextMenuData {
  id?: string;
  [key: string]: unknown;
}

export const useContextMenu = <T extends ContextMenuData = ContextMenuData>(
  menuTemplate: (item: T) => ContextMenuItem[],
  item: T
) => {
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      const template = menuTemplate(item);
      
      window.electronAPI.system.showContextMenu(template, {
        x: event.clientX,
        y: event.clientY,
      });
    },
    [item, menuTemplate]
  );

  return { onContextMenu: handleContextMenu };
}; 