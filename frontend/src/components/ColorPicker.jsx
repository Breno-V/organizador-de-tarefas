const PALETA = [
  '#2B5F5F', '#4A7B5C', '#7B8B6B', '#6B8E6B',
  '#5A6B7A', '#5A7B7B', '#8B6F9E', '#8B6B7B',
  '#C24B3A', '#D48B6B', '#B88B7B', '#C48B6B',
  '#C47A2E', '#B8962E', '#A0806B', '#8B7B6B',
]

export default function ColorPicker({ value, onChange, id }) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Selecionar cor">
      {PALETA.map(cor => {
        const selected = value === cor
        return (
          <button
            key={cor}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Cor ${cor}`}
            className={`color-swatch${selected ? ' color-swatch--selected' : ''}`}
            style={{ backgroundColor: cor }}
            onClick={() => onChange(cor)}
          />
        )
      })}
    </div>
  )
}
