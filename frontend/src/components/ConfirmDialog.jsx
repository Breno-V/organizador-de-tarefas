export default function ConfirmDialog({ titulo, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <p className="confirm-text">
          Excluir <strong>"{titulo}"</strong>?
        </p>
        <p className="confirm-subtext">Essa ação não pode ser desfeita.</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onCancel} autoFocus>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
