import { useCallback, useEffect, useState } from "react"
import api from "../../lib/axios.config"
import type { Category, Varity } from "../../lib/types"
import { errorMessage } from "../../lib/format"
import style from "./Catalog.module.css"

interface PanelProps<T extends { id: string, name: string }> {
    title: string
    singular: string
    items: T[] | undefined
    onCreate: (names: string[]) => Promise<void>
    onDelete?: (item: T) => Promise<void>
    deleteNote?: string
}

function CatalogPanel<T extends { id: string, name: string }>({ title, singular, items, onCreate, onDelete, deleteNote }: PanelProps<T>) {
    const [filter, setFilter] = useState("")
    const [name, setName] = useState("")
    const [bulk, setBulk] = useState(false)
    const [bulkText, setBulkText] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "ok" | "error", text: string }>()

    const existing = new Set(items?.map(i => i.name.trim().toLowerCase()))
    const filtered = items?.filter(i => i.name.toLowerCase().includes(filter.trim().toLowerCase()))

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const raw = bulk ? bulkText.split(/[\n,]/) : [name]
        const names = [...new Set(raw.map(n => n.trim()).filter(Boolean))]
        const repeated = names.filter(n => existing.has(n.toLowerCase()))
        const toCreate = names.filter(n => !existing.has(n.toLowerCase()))
        if (!toCreate.length) {
            setMessage({ type: "error", text: repeated.length ? `Ya existe: ${repeated.join(", ")}` : `Escribí el nombre de la ${singular}` })
            return
        }
        setLoading(true)
        setMessage(undefined)
        try {
            await onCreate(toCreate)
            setName("")
            setBulkText("")
            setMessage({
                type: "ok",
                text: `${toCreate.length === 1 ? `Se creó "${toCreate[0]}"` : `Se crearon ${toCreate.length} ${title.toLowerCase()}`}`
                    + (repeated.length ? `. Omitidas por repetidas: ${repeated.join(", ")}` : ""),
            })
        } catch (error) {
            setMessage({ type: "error", text: errorMessage(error) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className={style.panel}>
            <div className={style.panelHeader}>
                <h2>{title}</h2>
                <span className={style.count}>{items?.length ?? "…"}</span>
            </div>

            <form className={style.form} onSubmit={submit}>
                {bulk ?
                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder={`Una ${singular} por línea o separadas por coma`}
                        rows={4}
                    />
                    :
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`Nueva ${singular}`}
                    />
                }
                <div className={style.formActions}>
                    <button type="button" className={style.linkButton} onClick={() => setBulk(prev => !prev)}>
                        {bulk ? "Crear una sola" : "Crear varias a la vez"}
                    </button>
                    <button className={style.create} disabled={loading}>
                        {loading ? "Creando…" : `Crear ${bulk ? title.toLowerCase() : singular}`}
                    </button>
                </div>
                {message && <p className={message.type === "ok" ? style.ok : style.error}>{message.text}</p>}
            </form>

            <input
                className={style.filter}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Buscar ${singular}…`}
                aria-label={`Buscar ${singular}`}
            />

            {!items ?
                <p className={style.empty}>Cargando…</p>
                : !filtered?.length ?
                    <p className={style.empty}>{items.length ? "No hay coincidencias" : `Todavía no hay ${title.toLowerCase()}`}</p>
                    :
                    <ul className={style.list}>
                        {filtered.map(item => (
                            <li key={item.id} className={style.chip}>
                                <span>{item.name}</span>
                                {onDelete &&
                                    <button
                                        type="button"
                                        aria-label={`Eliminar ${item.name}`}
                                        title="Eliminar"
                                        onClick={async () => {
                                            if (!confirm(`¿Eliminar la ${singular} "${item.name}"?`)) return
                                            try {
                                                await onDelete(item)
                                                setMessage({ type: "ok", text: `Se eliminó "${item.name}"` })
                                            } catch (error) {
                                                setMessage({ type: "error", text: errorMessage(error, `No se pudo eliminar "${item.name}"`) })
                                            }
                                        }}
                                    >×</button>
                                }
                            </li>
                        ))}
                    </ul>
            }
            {deleteNote && <p className={style.note}>{deleteNote}</p>}
        </section>
    )
}

export default function Catalog() {
    const [categories, setCategories] = useState<Category[]>()
    const [varities, setVarities] = useState<Varity[]>()

    const loadCategories = useCallback(async () => {
        const res = await api.get<Category[]>("/categories")
        setCategories([...res.data].sort((a, b) => a.name.localeCompare(b.name)))
    }, [])

    const loadVarities = useCallback(async () => {
        const res = await api.get<[Varity[], number]>("/varities")
        setVarities(res.data[0])
    }, [])

    useEffect(() => {
        (async () => {
            await Promise.all([
                loadCategories().catch(() => setCategories([])),
                loadVarities().catch(() => setVarities([])),
            ])
        })()
    }, [loadCategories, loadVarities])

    return (
        <div className={style.page}>
            <h1 className={style.title}>Categorías y variedades</h1>
            <p className={style.subtitle}>
                Las <b>categorías</b> agrupan productos en la tienda (ej: Esmaltes, Uñas).
                Las <b>variedades</b> son las opciones de un producto (ej: colores o tonos) y se les asigna stock dentro de cada producto.
            </p>
            <div className={style.grid}>
                <CatalogPanel
                    title="Categorías"
                    singular="categoría"
                    items={categories}
                    onCreate={async (names) => {
                        if (names.length === 1) await api.post("/categories", { name: names[0] })
                        else await api.post("/categories/bulk", names.map(name => ({ name })))
                        await loadCategories()
                    }}
                    onDelete={async (category) => {
                        await api.delete(`/categories/${category.id}`)
                        await loadCategories()
                    }}
                />
                <CatalogPanel
                    title="Variedades"
                    singular="variedad"
                    items={varities}
                    onCreate={async (names) => {
                        if (names.length === 1) await api.post("/varities", { name: names[0] })
                        else await api.post("/varities/bulkCreate", names.map(name => ({ name })))
                        await loadVarities()
                    }}
                    deleteNote="Las variedades no se pueden eliminar desde acá porque pueden estar en uso en productos u órdenes."
                />
            </div>
        </div>
    )
}
