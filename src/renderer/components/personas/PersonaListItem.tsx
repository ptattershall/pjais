import React from 'react';
import { useContextMenu } from '../../hooks/useContextMenu';
import { PersonaData } from '@shared/types/persona';

const buildPersonaMenu = (persona: PersonaData) => {
  return [
    { label: `Edit ${persona.name}`, click: () => console.log(`Editing ${persona.id}`) },
    { label: 'Activate/Deactivate', click: () => console.log(`Toggling ${persona.id}`) },
    { type: 'separator' },
    { label: 'Delete', click: () => console.log(`Deleting ${persona.id}`), },
  ];
};

interface PersonaListItemProps {
  persona: PersonaData;
}

export const PersonaListItem: React.FC<PersonaListItemProps> = ({ persona }) => {
  const contextMenuProps = useContextMenu(buildPersonaMenu, persona);

  return (
    <div
      {...contextMenuProps}
      className="p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
    >
      <h3 className="font-bold">{persona.name}</h3>
      <p className="text-sm text-gray-400">{persona.description}</p>
    </div>
  );
}; 