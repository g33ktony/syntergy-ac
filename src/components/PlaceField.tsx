import { useEffect, useRef, useState } from 'react'
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
  const [hints, setHints] = useState<Array<{ label: string; latlng?: LatLng; placeId?: string }>>(
    [],
  )
  const [focused, setFocused] = useState(false)
  const fieldRef = useRef<HTMLLabelElement>(null)
  const blurTimer = useRef<number | undefined>(undefined)
  const suppressUntilTyped = useRef(false)
  const pickGeneration = useRef(0)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setFocused(false)
        setHints([])
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!focused || suppressUntilTyped.current) {
      setHints([])
      return
    }
    const q = value.trim()
    if (q.length < 3) {
      setHints([])
      return
    }
    let active = true
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          if (hasGoogleApiKey()) {
            const key = getGoogleApiKey()!
            const predictions = await suggestPlaces(q, key)
            if (!active) return
            setHints(
              predictions.map((p) => ({
                label: p.description,
                placeId: p.placeId,
              })),
            )
          } else {
            const photon = await photonSuggest(q)
            if (!active) return
            setHints(photon.map((p) => ({ label: p.label, latlng: p.latlng })))
          }
        } catch {
          if (!active) return
          setHints([])
        }
      })()
    }, 350)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [value, focused])

  async function pick(hint: { label: string; latlng?: LatLng; placeId?: string }) {
    const generation = ++pickGeneration.current
    suppressUntilTyped.current = true
    onChange(hint.label)
    setFocused(false)
    setHints([])
    if (hint.latlng) {
      onResolved?.(hint.label, hint.latlng)
      return
    }
    const key = getGoogleApiKey()
    if (!key) return
    try {
      const latlng = await geocodePlace(hint.label, key)
      if (generation !== pickGeneration.current) return
      onResolved?.(hint.label, latlng)
    } catch {
      /* lookup form still works with the string */
    }
  }

  return (
    <label ref={fieldRef} className="field place-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => {
          pickGeneration.current += 1
          suppressUntilTyped.current = false
          setFocused(true)
          onChange(e.target.value)
        }}
        onFocus={() => {
          if (blurTimer.current !== undefined) window.clearTimeout(blurTimer.current)
          setFocused(true)
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => {
            setFocused(false)
            setHints([])
          }, 150)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setFocused(false)
            setHints([])
            e.currentTarget.blur()
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {focused && hints.length > 0 ? (
        <ul className="place-suggestions" role="listbox">
          {hints.map((hint) => (
            <li key={hint.placeId ?? hint.label}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pick(hint)}
              >
                {hint.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  )
}
