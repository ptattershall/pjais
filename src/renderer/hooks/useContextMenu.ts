import { useCallback } from 'react';

export const useContextMenu = (
  menuTemplate: (item: any) => any[],
  item: any
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