import React from 'react';
import { NewRedisConnectionModal } from '../NewRedisConnectionModal';
import { NewKeyModal } from './NewKeyModal';
import { NamespaceDeleteModal } from './NamespaceDeleteModal';
import { FlushDbModal } from './FlushDbModal';
import { RedisServerInfoModal } from './RedisServerInfoModal';
import { RedisConnectionConfig, RedisKeyType, RedisServerInfo } from '../types';

interface RedisModalsProps {
  isConnModalOpen: boolean;
  onCloseConnModal: () => void;
  onSaveConnection: (config: RedisConnectionConfig) => void;
  editingConn: RedisConnectionConfig | null;
  isNewKeyModalOpen: boolean;
  onCloseNewKeyModal: () => void;
  onCreateKey: (key: string, type: RedisKeyType, ttl: number, initialValue: any) => Promise<void>;
  namespaceDeleteModal: { namespace: string; keys: string[] } | null;
  isDeletingNamespace: boolean;
  onCancelNamespaceDelete: () => void;
  onConfirmNamespaceDelete: () => void;
  isFlushConfirmOpen: boolean;
  activeDb: number;
  onCancelFlush: () => void;
  onConfirmFlush: () => void;
  isServerInfoOpen: boolean;
  onCloseServerInfo: () => void;
  serverInfo: RedisServerInfo | null;
}

export const RedisModals: React.FC<RedisModalsProps> = ({
  isConnModalOpen,
  onCloseConnModal,
  onSaveConnection,
  editingConn,
  isNewKeyModalOpen,
  onCloseNewKeyModal,
  onCreateKey,
  namespaceDeleteModal,
  isDeletingNamespace,
  onCancelNamespaceDelete,
  onConfirmNamespaceDelete,
  isFlushConfirmOpen,
  activeDb,
  onCancelFlush,
  onConfirmFlush,
  isServerInfoOpen,
  onCloseServerInfo,
  serverInfo,
}) => {
  return (
    <>
      <NewRedisConnectionModal
        isOpen={isConnModalOpen}
        onClose={onCloseConnModal}
        onSaved={onSaveConnection}
        initialConfig={editingConn}
      />
      <NewKeyModal
        isOpen={isNewKeyModalOpen}
        onClose={onCloseNewKeyModal}
        onSubmit={onCreateKey}
      />
      {namespaceDeleteModal && (
        <NamespaceDeleteModal
          isOpen={true}
          namespace={namespaceDeleteModal.namespace}
          keysCount={namespaceDeleteModal.keys.length}
          isDeleting={isDeletingNamespace}
          onCancel={onCancelNamespaceDelete}
          onConfirm={onConfirmNamespaceDelete}
        />
      )}
      <FlushDbModal
        isOpen={isFlushConfirmOpen}
        activeDb={activeDb}
        onCancel={onCancelFlush}
        onConfirm={onConfirmFlush}
      />
      <RedisServerInfoModal
        isOpen={isServerInfoOpen}
        onClose={onCloseServerInfo}
        serverInfo={serverInfo}
      />
    </>
  );
};
