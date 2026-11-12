import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import api from "../../lib/axios.config"
import type { Category, Product, PromoComponent, SelectionMode, Varity } from "../../lib/types"
import { errorMessage } from "../../lib/format"
import { uploadProductImage } from "../../lib/upload"
import PromoEditor from "./PromoEditor"
import { emptyComponent, promoPayload, validatePromo } from "./promo"
import style from "./ProductForm.module.css"

type Kind = "product" | "promo"

interface ImageItem { key: string, url: string, file?: File }
interface VarietyItem { key: string, varityId: string, name: string, productVarityId?: string, stock: number }

/** Lo que devuelve GET /products/admin/:id */
interface AdminProduct extends Omit<Product, "productVarities"> {
    productVarities: { id: string, stock: number, active: boolean, varity: Varity }[]
    components: {
        componentId: string
        varityId: string | null
        stockReduce: number
        selectionMode: SelectionMode
        selectionQuantity: number | null
    }[]
}

const toNumber = (value: string) => value.trim() === "" ? NaN : Number(value)

export default function ProductForm() {
    const { id } = useParams()
    const isEdit = !!id
    const navigate = useNavigate()

    const [loading, setLoading] = useState(isEdit)
    const [loadError, setLoadError] = useState("")
    const [saving, setSaving] = useState("")
    const [formError, setFormError] = useState("")

    const [categories, setCategories] = useState<Category[]>([])
    const [varities, setVarities] = useState<Varity[]>([])
    const [allProducts, setAllProducts] = useState<Product[]>([])

    const [kind, setKind] = useState<Kind>("product")
    const [wasPromo, setWasPromo] = useState(false)
    const [nombre, setNombre] = useState("")
    const [description, setDescription] = useState("")
    const [price, setPrice] = useState("")
    const [discountedPrice, setDiscountedPrice] = useState("")
    const [stock, setStock] = useState("")
    const [active, setActive] = useState(true)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [images, setImages] = useState<ImageItem[]>([])
    const [varieties, setVarieties] = useState<VarietyItem[]>([])
    const [newVariety, setNewVariety] = useState({ varityId: "", stock: "" })
    const [promoComponents, setPromoComponents] = useState<PromoComponent[]>([])

    useEffect(() => {
        (async () => {
            try {
                const [cats, vars, inCatalog, outCatalog] = await Promise.all([
                    api.get<Category[]>("/categories"),
                    api.get<[Varity[], number]>("/varities"),
                    api.get<Product[]>("/products?limit=500&orderBy=nombre&direction=ASC"),
                    api.get<Product[]>("/products?limit=500&orderBy=nombre&direction=ASC&active=outCatalog"),
                ])
                setCategories([...cats.data].sort((a, b) => a.name.localeCompare(b.name)))
                setVarities(vars.data[0])
                setAllProducts([...inCatalog.data, ...outCatalog.data]
                    .filter(p => p.id !== id)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre)))

                if (!id) return
                const { data: product } = await api.get<AdminProduct>(`/products/admin/${id}`)
                setNombre(product.nombre)
                setDescription(product.description ?? "")
                setPrice(String(Number(product.price)))
                setDiscountedPrice(product.discountedPrice ? String(Number(product.discountedPrice)) : "")
                setStock(product.stock != null ? String(product.stock) : "")
                setActive(product.active)
                setSelectedCategories(product.categories.map(c => c.id))
                setImages((product.images ?? []).map(img => ({ key: img.id, url: img.url })))
                setVarieties(product.productVarities.map(pv => ({
                    key: pv.id,
                    varityId: pv.varity.id,
                    name: pv.varity.name,
                    productVarityId: pv.id,
                    stock: pv.stock,
                })))
                if (product.components?.length) {
                    setKind("promo")
                    setWasPromo(true)
                    setPromoComponents(product.components.map(c => ({
                        key: crypto.randomUUID(),
                        componentId: c.componentId,
                        stockReduce: c.stockReduce,
                        selectionMode: c.selectionMode,
                        selectionQuantity: c.selectionQuantity ?? 2,
                        varityId: c.varityId ?? "",
                    })))
                }
            } catch (error) {
                setLoadError(errorMessage(error, "No se pudo cargar el producto"))
            } finally {
                setLoading(false)
            }
        })()
    }, [id])

    const changeKind = (next: Kind) => {
        setKind(next)
        if (next === "promo" && !promoComponents.length) setPromoComponents([emptyComponent()])
    }

    const varietiesStock = varieties.reduce((acc, v) => acc + (v.stock || 0), 0)
    const availableVarities = varities.filter(v => !varieties.some(item => item.varityId === v.id))
    const promoPrice = toNumber(discountedPrice) || toNumber(price) || 0

    const validate = (): string | null => {
        if (!nombre.trim()) return "Escribí el nombre del producto"
        const p = toNumber(price)
        if (!(p > 0)) return "El precio debe ser mayor a 0"
        const d = toNumber(discountedPrice)
        if (!Number.isNaN(d) && d > 0 && d >= p) return "El precio con descuento debe ser menor al precio original"
        if (!selectedCategories.length) return "Elegí al menos una categoría"
        if (kind === "promo") {
            const promoError = validatePromo(promoComponents, allProducts)
            if (promoError) return promoError
            if (!(toNumber(stock) >= 1)) return "Indicá cuántas promociones se pueden vender (stock)"
        } else if (!varieties.length && Number.isNaN(toNumber(stock))) {
            return "Indicá el stock o agregá variedades"
        }
        return null
    }

    const save = async () => {
        const error = validate()
        if (error) {
            setFormError(error)
            return
        }
        setFormError("")
        try {
            const pending = images.filter(img => img.file)
            const urls: string[] = images.filter(img => !img.file).map(img => img.url)
            for (const [index, img] of pending.entries()) {
                setSaving(`Subiendo imagen ${index + 1} de ${pending.length}`)
                urls.push(await uploadProductImage(img.file!))
            }
            setSaving(isEdit ? "Guardando cambios" : "Creando")

            const discount = toNumber(discountedPrice)
            const usesVarieties = kind === "product" && varieties.length > 0
            const payload = {
                nombre: nombre.trim(),
                description: description.trim(),
                price: toNumber(price),
                discountedPrice: discount > 0 ? discount : null,
                ...(!usesVarieties && { stock: toNumber(stock) || 0 }),
                categories: selectedCategories,
                image: urls,
                varities: kind === "promo" ? [] : varieties.map(v => ({
                    id: v.varityId,
                    productVarityId: v.productVarityId,
                    stock: v.stock,
                    active: v.stock > 0,
                })),
                ...(kind === "promo"
                    ? { productsComponent: promoPayload(promoComponents) }
                    : (isEdit && wasPromo) && { productsComponent: [] }),
            }

            if (isEdit) await api.patch("/products", { id, active, ...payload })
            else await api.post("/products", payload)
            navigate("/products")
        } catch (err) {
            setFormError(errorMessage(err, isEdit ? "No se pudieron guardar los cambios" : "No se pudo crear el producto"))
        } finally {
            setSaving("")
        }
    }

    if (loading) return <div className={style.page}><p className={style.status}>Cargando producto…</p></div>
    if (loadError) return (
        <div className={style.page}>
            <p className={style.errorBox}>{loadError}</p>
            <Link to="/products" className={style.back}>← Volver a productos</Link>
        </div>
    )

    const title = isEdit
        ? (kind === "promo" ? "Editar promoción" : "Editar producto")
        : (kind === "promo" ? "Nueva promoción" : "Nuevo producto")

    return (
        <div className={style.page}>
            <Link to="/products" className={style.back}>← Volver a productos</Link>
            <h1 className={style.title}>{title}</h1>

            <div className={style.layout}>
                <div className={style.column}>
                    <section className={style.card}>
                        <h2>Tipo</h2>
                        <div className={style.kinds} role="radiogroup" aria-label="Tipo de producto">
                            <button
                                type="button"
                                role="radio"
                                aria-checked={kind === "product"}
                                className={kind === "product" ? style.kindActive : style.kind}
                                onClick={() => changeKind("product")}
                            >
                                <b>Producto individual</b>
                                <span>Tiene su propio stock y, si querés, variedades (colores, tonos).</span>
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={kind === "promo"}
                                className={kind === "promo" ? style.kindActive : style.kind}
                                onClick={() => changeKind("promo")}
                            >
                                <b>Promoción o combo</b>
                                <span>Al venderse descuenta stock de otros productos (2x1, kits).</span>
                            </button>
                        </div>
                    </section>

                    <section className={style.card}>
                        <h2>Datos</h2>
                        <label className={style.field}>
                            Nombre
                            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={kind === "promo" ? "Ej: 2x1 en Tinta Dapop" : "Ej: Tinta Dapop"} />
                        </label>
                        <div className={style.row2}>
                            <label className={style.field}>
                                Precio
                                <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                            </label>
                            <label className={style.field}>
                                Precio con descuento <small>(opcional)</small>
                                <input inputMode="decimal" value={discountedPrice} onChange={(e) => setDiscountedPrice(e.target.value)} placeholder="Sin descuento" />
                            </label>
                        </div>
                        <label className={style.field}>
                            Descripción
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                        </label>
                    </section>

                    {kind === "promo" ?
                        <section className={style.card}>
                            <h2>Productos de la promoción</h2>
                            <label className={style.field}>
                                Stock de la promoción <small>(cuántas promos se pueden vender)</small>
                                <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
                            </label>
                            <PromoEditor
                                components={promoComponents}
                                onChange={setPromoComponents}
                                products={allProducts}
                                promoPrice={promoPrice}
                            />
                        </section>
                        :
                        <section className={style.card}>
                            <h2>Stock y variedades</h2>
                            {varieties.length ?
                                <p className={style.hint}>Stock total: <b>{varietiesStock} unidades</b> (suma de las variedades)</p>
                                :
                                <label className={style.field}>
                                    Stock
                                    <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
                                </label>
                            }

                            {varieties.length > 0 &&
                                <ul className={style.varieties}>
                                    {varieties.map(v => (
                                        <li key={v.key}>
                                            <span className={style.varietyName}>{v.name}</span>
                                            <label className={style.inline}>
                                                Stock
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={v.stock}
                                                    onChange={(e) => setVarieties(prev => prev.map(item =>
                                                        item.key === v.key ? { ...item, stock: Number(e.target.value) } : item))}
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                className={style.remove}
                                                aria-label={`Quitar ${v.name}`}
                                                onClick={() => setVarieties(prev => prev.filter(item => item.key !== v.key))}
                                            >×</button>
                                        </li>
                                    ))}
                                </ul>
                            }

                            <div className={style.addVariety}>
                                <select
                                    value={newVariety.varityId}
                                    onChange={(e) => setNewVariety(prev => ({ ...prev, varityId: e.target.value }))}
                                    aria-label="Variedad a agregar"
                                >
                                    <option value="">Agregar variedad…</option>
                                    {availableVarities.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="Stock"
                                    value={newVariety.stock}
                                    onChange={(e) => setNewVariety(prev => ({ ...prev, stock: e.target.value }))}
                                    aria-label="Stock de la variedad"
                                />
                                <button
                                    type="button"
                                    className={style.secondary}
                                    disabled={!newVariety.varityId || newVariety.stock === ""}
                                    onClick={() => {
                                        const varity = varities.find(v => v.id === newVariety.varityId)
                                        if (!varity) return
                                        setVarieties(prev => [...prev, {
                                            key: crypto.randomUUID(),
                                            varityId: varity.id,
                                            name: varity.name,
                                            stock: Number(newVariety.stock),
                                        }])
                                        setNewVariety({ varityId: "", stock: "" })
                                    }}
                                >
                                    Agregar
                                </button>
                            </div>
                            <p className={style.hint}>
                                ¿Falta una variedad? Creala en <Link to="/catalog">Categorías y variedades</Link>.
                            </p>
                        </section>
                    }
                </div>

                <div className={style.column}>
                    {isEdit &&
                        <section className={style.card}>
                            <h2>Visibilidad</h2>
                            <label className={style.switch}>
                                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                                <span>{active ? "Visible en la tienda" : "Oculto de la tienda"}</span>
                            </label>
                            <p className={style.hint}>Cuando un producto se queda sin stock se oculta solo. Volvé a activarlo después de reponerlo.</p>
                        </section>
                    }

                    <section className={style.card}>
                        <h2>Categorías</h2>
                        {categories.length ?
                            <div className={style.chips}>
                                {categories.map(c => {
                                    const selected = selectedCategories.includes(c.id)
                                    return (
                                        <button
                                            type="button"
                                            key={c.id}
                                            aria-pressed={selected}
                                            className={selected ? style.chipActive : style.chip}
                                            onClick={() => setSelectedCategories(prev =>
                                                selected ? prev.filter(cid => cid !== c.id) : [...prev, c.id])}
                                        >
                                            {selected ? "✓ " : ""}{c.name}
                                        </button>
                                    )
                                })}
                            </div>
                            : <p className={style.hint}>No hay categorías. Creá una en <Link to="/catalog">Categorías y variedades</Link>.</p>
                        }
                    </section>

                    <section className={style.card}>
                        <h2>Imágenes</h2>
                        <p className={style.hint}>Se recomienda formato <b>WEBP</b>. La primera es la principal.</p>
                        <div className={style.images}>
                            {images.map((img, index) => (
                                <div key={img.key} className={style.image}>
                                    <img src={img.url} alt={`Imagen ${index + 1}`} />
                                    {index === 0 && <span className={style.mainBadge}>Principal</span>}
                                    <button
                                        type="button"
                                        aria-label={`Quitar imagen ${index + 1}`}
                                        onClick={() => setImages(prev => prev.filter(i => i.key !== img.key))}
                                    >×</button>
                                </div>
                            ))}
                            <label className={style.upload}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = [...(e.target.files ?? [])]
                                        setImages(prev => [...prev, ...files.map(file => ({
                                            key: crypto.randomUUID(),
                                            url: URL.createObjectURL(file),
                                            file,
                                        }))])
                                        e.target.value = ""
                                    }}
                                />
                                <span>+ Agregar</span>
                            </label>
                        </div>
                    </section>
                </div>
            </div>

            <div className={style.footer}>
                {formError && <p className={style.formError} role="alert">{formError}</p>}
                <div className={style.actions}>
                    <button type="button" className={style.cancel} onClick={() => navigate("/products")} disabled={!!saving}>
                        Cancelar
                    </button>
                    <button type="button" className={style.save} onClick={save} disabled={!!saving}>
                        {saving ? `${saving}…` : isEdit ? "Guardar cambios" : kind === "promo" ? "Crear promoción" : "Crear producto"}
                    </button>
                </div>
            </div>
        </div>
    )
}
