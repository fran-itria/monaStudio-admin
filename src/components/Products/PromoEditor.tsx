import type { Product, PromoComponent } from "../../lib/types"
import { emptyComponent } from "./promo"
import { formatPrice } from "../../lib/format"
import style from "./PromoEditor.module.css"

interface Props {
    components: PromoComponent[]
    onChange: (components: PromoComponent[]) => void
    products: Product[]
    promoPrice: number
}

export default function PromoEditor({ components, onChange, products, promoPrice }: Props) {
    const update = (key: string, patch: Partial<PromoComponent>) =>
        onChange(components.map(c => c.key === key ? { ...c, ...patch } : c))

    const regularTotal = components.reduce((acc, c) => {
        const product = products.find(p => p.id === c.componentId)
        if (!product) return acc
        const unit = Number(product.discountedPrice) || Number(product.price)
        return acc + unit * (c.stockReduce || 0)
    }, 0)
    const saving = regularTotal - promoPrice

    return (
        <div className={style.container}>
            <>
                <p className={style.help}>
                    Cuando se venda esta promoción, se descuenta stock de cada producto que agregues acá.
                    Usá <b>"El cliente elige variedades"</b> para promos tipo <i>2x1 en esmaltes</i>, donde el cliente
                    elige los colores al comprar.
                </p>

                {components.map((component, index) => {
                    const product = products.find(p => p.id === component.componentId)
                    const varieties = product?.productVarities?.filter(v => v.varity) ?? []
                    return (
                        <div key={component.key} className={style.item}>
                            <div className={style.itemHeader}>
                                <span>Ítem {index + 1}</span>
                                <button
                                    type="button"
                                    className={style.remove}
                                    onClick={() => onChange(components.filter(c => c.key !== component.key))}
                                    aria-label={`Quitar ítem ${index + 1}`}
                                >
                                    Quitar
                                </button>
                            </div>

                            <label>
                                Producto
                                <select
                                    value={component.componentId}
                                    onChange={(e) => update(component.key, { componentId: e.target.value, varityId: "" })}
                                >
                                    <option value="">Elegí un producto</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre} — stock {p.stock ?? 0}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Unidades que se descuentan por cada promo vendida
                                <input
                                    type="number"
                                    min={1}
                                    value={component.stockReduce || ""}
                                    onChange={(e) => update(component.key, { stockReduce: Number(e.target.value) })}
                                />
                            </label>

                            <div className={style.modes}>
                                <label className={style.mode}>
                                    <input
                                        type="radio"
                                        name={`mode-${component.key}`}
                                        checked={component.selectionMode === "fixed"}
                                        onChange={() => update(component.key, { selectionMode: "fixed" })}
                                    />
                                    Fijo
                                </label>
                                <label className={style.mode}>
                                    <input
                                        type="radio"
                                        name={`mode-${component.key}`}
                                        checked={component.selectionMode === "custom"}
                                        disabled={!!product && !varieties.length}
                                        onChange={() => update(component.key, { selectionMode: "custom", varityId: "" })}
                                    />
                                    El cliente elige variedades
                                </label>
                            </div>

                            {component.selectionMode === "custom" ?
                                <label>
                                    Cantidad de variedades que elige el cliente
                                    <input
                                        type="number"
                                        min={1}
                                        value={component.selectionQuantity || ""}
                                        onChange={(e) => update(component.key, { selectionQuantity: Number(e.target.value) })}
                                    />
                                </label>
                                : varieties.length > 0 &&
                                <label>
                                    Variedad fija (opcional)
                                    <select
                                        value={component.varityId}
                                        onChange={(e) => update(component.key, { varityId: e.target.value })}
                                    >
                                        <option value="">Cualquiera / sin variedad</option>
                                        {varieties.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.varity?.name} — stock {v.stock}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            }
                        </div>
                    )
                })}

                <button
                    type="button"
                    className={style.add}
                    onClick={() => onChange([...components, emptyComponent()])}
                >
                    + Agregar producto a la promoción
                </button>

                {regularTotal > 0 &&
                    <div className={style.summary}>
                        <p>Precio comprando por separado: <b>{formatPrice(regularTotal)}</b></p>
                        <p>Precio de la promo: <b>{formatPrice(promoPrice)}</b></p>
                        {promoPrice > 0 && saving > 0 &&
                            <p className={style.saving}>El cliente ahorra {formatPrice(saving)}</p>}
                        {promoPrice > 0 && saving < 0 &&
                            <p className={style.warning}>Ojo: la promo es más cara que comprar los productos por separado</p>}
                    </div>
                }
            </>
        </div>
    )
}
