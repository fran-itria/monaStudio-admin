import { useId, useRef, useState } from "react"
import type { Product } from "../../lib/types"
import { formatPrice } from "../../lib/format"
import style from "./ProductPicker.module.css"

interface Props {
    products: Product[]
    /** ids ya agregados: se muestran marcados y no se pueden volver a elegir */
    selectedIds: string[]
    onPick: (product: Product) => void
    disabled?: boolean
}

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

/** Buscador con lista desplegable para elegir un producto (teclado: ↑ ↓ Enter Esc). */
export default function ProductPicker({ products, selectedIds, onPick, disabled }: Props) {
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const listId = useId()
    const listRef = useRef<HTMLUListElement>(null)

    const words = normalize(query).split(/\s+/).filter(Boolean)
    const results = products
        .filter(p => words.every(w => normalize(p.nombre).includes(w)))
        .slice(0, 50)

    const pick = (product: Product) => {
        if (selectedIds.includes(product.id)) return
        onPick(product)
        setQuery("")
        setActive(0)
    }

    const move = (delta: number) => {
        if (!results.length) return
        const next = (active + delta + results.length) % results.length
        setActive(next)
        listRef.current?.children[next]?.scrollIntoView({ block: "nearest" })
    }

    return (
        <div className={style.picker}>
            <input
                type="search"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
                placeholder="Buscá un producto para agregarlo…"
                value={query}
                disabled={disabled}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); move(1) }
                    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1) }
                    else if (e.key === "Enter") {
                        e.preventDefault()
                        if (open && results[active]) pick(results[active])
                    }
                    else if (e.key === "Escape") setOpen(false)
                }}
            />
            {open &&
                <ul className={style.results} id={listId} role="listbox" ref={listRef}>
                    {results.length ? results.map((p, i) => {
                        const added = selectedIds.includes(p.id)
                        return (
                            <li
                                key={p.id}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                aria-disabled={added}
                                className={`${style.option} ${i === active ? style.active : ""} ${added ? style.added : ""}`}
                                // mousedown para que no se cierre la lista antes del click
                                onMouseDown={(e) => { e.preventDefault(); pick(p) }}
                                onMouseEnter={() => setActive(i)}
                            >
                                {p.images?.[0]?.url
                                    ? <img src={p.images[0].url} alt="" />
                                    : <span className={style.noImage} aria-hidden="true" />}
                                <span className={style.info}>
                                    <span className={style.name}>{p.nombre}</span>
                                    <span className={style.meta}>
                                        {formatPrice(Number(p.discountedPrice) > 0 ? p.discountedPrice! : p.price)} · stock {p.stock ?? 0}
                                        {p.productVarities?.length ? " · con variedades" : ""}
                                    </span>
                                </span>
                                {added && <span className={style.badge}>Agregado</span>}
                            </li>
                        )
                    }) : <li className={style.empty}>No hay productos con stock que coincidan</li>}
                </ul>
            }
        </div>
    )
}
