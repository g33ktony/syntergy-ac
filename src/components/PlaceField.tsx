import { useEffect, useId, useState } from 'react'
import { getGoogleApiKey, hasGoogleApiKey } from '../lib/config'
import { geocodePlace, suggestPlaces } from '../lib/google'
import { photonSuggest } from '../lib/providers/photon'
import type { LatLng } from '../types'

type PlaceFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  onResolved?: (label: string, latlng: LatLng) => void
  placeholder?: string
}

export function PlaceField({
  label,
  value,
  onChange,
  onResolved,
  placeholder,
}: PlaceFieldProps) {
  const listId = useId()
  const [hints, setHints] = useState<Array<{ label: string; latlng?: LatLng; placeId?: string }>>(
    [],
  )

  useEffect(() => {
    const q = value.trim()
    if (q.length < 3) {
      setHints([])
      return
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          if (hasGoogleApiKey()) {
            const key = getGoogleApiKey()!
            const predictions = await suggestPlaces(q, key)
            setHints(
              predictions.map((p) => ({
                label: p.description,
                placeId: p.placeId,
              })),
            )
          } else {
            const photon = await photonSuggest(q)
            setHints(photon.map((p) => ({ label: p.label, latlng: p.latlng })))
          }
        } catch {
          setHints([])
        }
      })()
    }, 350)
    return () => window.clearTimeout(handle)
  }, [value])

  async function pick(hint: { label: string; latlng?: LatLng; placeId?: string }) {
    onChange(hint.label)
    setHints([])
    if (hint.latlng) {
      onResolved?.(hint.label, hint.latlng)
      return
    }
    const key = getGoogleApiKey()
    if (!key) return
    try {
      const latlng = await geocodePlace(hint.label, key)
      onResolved?.(hint.label, latlng)
    } catch {
      /* lookup form still works with the string */
    }
  }

  return (
    <label className="field place-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        list={listId}
      />
      {hints.length > 0 ? (
        <ul className="place-suggestions" role="listbox">
          {hints.map((hint) => (
            <li key={hint.placeId ?? hint.label}>
              <button type="button" onClick={() => void pick(hint)}>
                {hint.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  )
}
