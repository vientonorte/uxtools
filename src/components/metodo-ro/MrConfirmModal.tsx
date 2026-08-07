import { MrButton } from './MrButton';
import { MrModal } from './MrModal';

interface MrConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MrConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}: MrConfirmModalProps) {
  return (
    <MrModal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      danger={danger}
      footer={
        <>
          <MrButton variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </MrButton>
          <MrButton
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </MrButton>
        </>
      }
    >
      {/* body empty — description carries message */}
      <span className="visually-hidden">{description}</span>
    </MrModal>
  );
}
