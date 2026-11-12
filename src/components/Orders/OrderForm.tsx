import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import api from "../../lib/axios.config"
import type { Order, PaymentMethod, PaymentStatus, Product } from "../../lib/types"
import { errorMessage, formatPrice } from "../../lib/format"
import ProductPicker from "./ProductPicker"
import style from "./OrderForm.module.css"

/** Lo que devuelve GET /products/:id (lo mismo que usa la tienda) */
interface ProductDetail {
    id: string
    nombre: string
    price: string
    discountedPrice: string | null
    stock: number | null
    requiredSelections: number
    varities?: { id: string, name: string, stock: number, active: boolean }[]
}

interface Line {
    key: string
    product: ProductDetail
    quantity: number
    /** productVarityId -> cantidad elegida */
    picks: Record<string, number>
}

const deliveryOptions = [
    { value: "retiro en local", label: "Retiro en local" },
    { value: "cadete", label: "Envío por cadete" },
    { value: "acordar con vendedor", label: "Acordar con vendedor" },
]

const paymentOptions: { value: PaymentMethod, label: string }[] = [
    { value: "cash", label: "Efectivo" },
    { value: "transfer", label: "Transferencia" },
    { value: "card", label: "Tarjeta / Mercado Pago" },
]

const unitPrice = (p: ProductDetail) => Number(p.discountedPrice) || Number(p.price) || 0
const pickedTotal = (line: Line) => Object.values(line.picks).reduce((a, b) => a + b, 0)
/** Productos con variedades propias (requiredSelections = 1): la cantidad es la suma de las variedades elegidas. */
const quantityFromPicks = (line: Line) => line.product.requiredSelections === 1
const lineQuantity = (line: Line) => quantityFromPicks(line) ? pickedTotal(line) : line.quantity
const requiredPicks = (line: Line) => line.product.requiredSelections > 1 ? line.product.requiredSelections * line.quantity : 0

export default function OrderForm() {
    const navigate = useNavigate()
    const [products, setProducts] = useState<Product[]>([])
    const [adding, setAdding] = useState(false)
    const [lines, setLines] = useState<Line[]>([])

    const [clientName, setClientName] = useState("")
    const [clientSurname, setClientSurname] = useState("")
    const [phone, setPhone] = useState("")
    const [delivered, setDelivered] = useState("retiro en local")
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid")
    const [shipping, setShipping] = useState({ street: "", number: "", floor: "", letter: "" })
    const [coment, setComent] = useState("")

    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<Product[]>("/products?limit=500&orderBy=nombre&direction=ASC")
                setProducts(res.data.filter(p => (p.stock ?? 0) > 0))
            } catch (err) {
                setError(errorMessage(err, "No se pudieron cargar los productos"))
            }
        })()
    }, [])

    const addProduct = async (product: Product) => {
        if (lines.some(l => l.product.id === product.id)) return
        setAdding(true)
        setError("")
        try {
            const { data } = await api.get<ProductDetail>(`/products/${product.id}`)
            setLines(prev => [...prev, { key: crypto.randomUUID(), product: data, quantity: 1, picks: {} }])
        } catch (err) {
            setError(errorMessage(err, "No se pudo agregar el producto"))
        } finally {
            setAdding(false)
        }
    }

    const updateLine = (key: string, patch: Partial<Line>) =>
        setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))

    const setPick = (line: Line, varietyId: string, value: number) =>
        updateLine(line.key, { picks: { ...line.picks, [varietyId]: Math.max(0, value) } })

    const total = lines.reduce((acc, l) => acc + unitPrice(l.product) * lineQuantity(l), 0)

    const validate = (): string | null => {
        if (!clientName.trim() || !clientSurname.trim()) return "Completá nombre y apellido del cliente"
        if (!phone.trim()) return "Completá el teléfono del cliente"
        if (delivered === "cadete" && (!shipping.street.trim() || !shipping.number.trim()))
            return "Para envío por cadete completá calle y número"
        if (!lines.length) return "Agregá al menos un producto"
        for (const line of lines) {
            const name = line.product.nombre
            const qty = lineQuantity(line)
            if (qty < 1) return quantityFromPicks(line) ? `Elegí las variedades de "${name}"` : `La cantidad de "${name}" debe ser al menos 1`
            if (line.product.stock != null && qty > line.product.stock) return `Solo quedan ${line.product.stock} de "${name}"`
            const required = requiredPicks(line)
            if (required && pickedTotal(line) !== required)
                return `En "${name}" tenés que elegir ${required} variedades (elegiste ${pickedTotal(line)})`
            for (const v of line.product.varities ?? []) {
                if ((line.picks[v.id] ?? 0) > v.stock) return `Solo quedan ${v.stock} de "${v.name}" en "${name}"`
            }
        }
        return null
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const validation = validate()
        if (validation) {
            setError(validation)
            return
        }
        setError("")
        setSaving(true)
        try {
            const { data } = await api.post<Order>("/orders/admin", {
                client_name: clientName.trim(),
                client_surname: clientSurname.trim(),
                phone: phone.trim(),
                delivered,
                paymentMethod,
                paymentStatus,
                ...(delivered === "cadete" && {
                    shippingData: {
                        street: shipping.street.trim(),
                        number: Number(shipping.number),
                        ...(shipping.floor.trim() && { floor: Number(shipping.floor) }),
                        ...(shipping.letter.trim() && { letter: shipping.letter.trim() }),
                    },
                }),
                ...(coment.trim() && { coment: coment.trim() }),
                products: lines.map(line => {
                    const picks = Object.entries(line.picks)
                        .filter(([, quantity]) => quantity > 0)
                        .map(([id, quantity]) => ({ id, quantity }))
                    return {
                        id: line.product.id,
                        quantity: lineQuantity(line),
                        ...(picks.length && { varityId: picks }),
                    }
                }),
            })
            navigate("/orders", { state: { created: data?.order_number } })
        } catch (err) {
            setError(errorMessage(err, "No se pudo crear la orden"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className={style.page} onSubmit={submit} noValidate>
            <Link to="/orders" className={style.back}>← Volver a órdenes</Link>
            <h1 className={style.title}>Nueva orden</h1>
            <p className={style.warning}>
                Al crear la orden se descuenta el stock de los productos, igual que una compra en la tienda.
            </p>

            <div className={style.layout}>
                <section className={style.card}>
                    <h2>Productos</h2>
                    <ProductPicker
                        products={products}
                        selectedIds={lines.map(l => l.product.id)}
                        onPick={addProduct}
                        disabled={adding}
                    />
                    {adding && <p className={style.hint}>Agregando producto…</p>}

                    {!lines.length && <p className={style.hint}>Todavía no agregaste productos.</p>}

                    <ul className={style.lines}>
                        {lines.map(line => {
                            const varieties = (line.product.varities ?? []).filter(v => v.active && v.stock > 0)
                            const needsPicks = line.product.requiredSelections > 0 && varieties.length > 0
                            const required = requiredPicks(line)
                            const picked = pickedTotal(line)
                            return (
                                <li key={line.key} className={style.line}>
                                    <div className={style.lineHeader}>
                                        <div>
                                            <p className={style.lineName}>
                                                {line.product.requiredSelections > 1 && <span className={style.promo}>Promo</span>}
                                                {line.product.nombre}
                                            </p>
                                            <p className={style.hint}>
                                                {formatPrice(unitPrice(line.product))} c/u · stock {line.product.stock ?? 0}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className={style.remove}
                                            aria-label={`Quitar ${line.product.nombre}`}
                                            onClick={() => setLines(prev => prev.filter(l => l.key !== line.key))}
                                        >×</button>
                                    </div>

                                    {!quantityFromPicks(line) &&
                                        <label className={style.inline}>
                                            Cantidad
                                            <input
                                                type="number"
                                                min={1}
                                                max={line.product.stock ?? undefined}
                                                value={line.quantity}
                                                onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                                            />
                                        </label>
                                    }

                                    {needsPicks && <>
                                        <p className={style.pickInfo}>
                                            {quantityFromPicks(line)
                                                ? "Elegí cuántas unidades de cada variedad:"
                                                : <>Elegí <b>{required}</b> variedades ({line.product.requiredSelections} por promo)
                                                    · <span className={picked === required ? style.ok : style.pending}>{picked} de {required}</span></>}
                                        </p>
                                        <div className={style.picks}>
                                            {varieties.map(v => {
                                                const value = line.picks[v.id] ?? 0
                                                return (
                                                    <div key={v.id} className={value ? style.pickActive : style.pick}>
                                                        <span className={style.pickName}>{v.name}</span>
                                                        <span className={style.stepper}>
                                                            <button type="button" aria-label={`Quitar una ${v.name}`} disabled={!value} onClick={() => setPick(line, v.id, value - 1)}>−</button>
                                                            <span aria-live="polite">{value}</span>
                                                            <button type="button" aria-label={`Sumar una ${v.name}`} disabled={value >= v.stock} onClick={() => setPick(line, v.id, value + 1)}>+</button>
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>}

                                    <p className={style.subtotal}>Subtotal: <b>{formatPrice(unitPrice(line.product) * lineQuantity(line))}</b></p>
                                </li>
                            )
                        })}
                    </ul>
                </section>

                <div className={style.column}>
                    <section className={style.card}>
                        <h2>Cliente</h2>
                        <div className={style.row2}>
                            <label className={style.field}>
                                Nombre
                                <input value={clientName} onChange={(e) => setClientName(e.target.value)} autoComplete="off" />
                            </label>
                            <label className={style.field}>
                                Apellido
                                <input value={clientSurname} onChange={(e) => setClientSurname(e.target.value)} autoComplete="off" />
                            </label>
                        </div>
                        <label className={style.field}>
                            Teléfono (WhatsApp)
                            <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3434403870" autoComplete="off" />
                        </label>
                    </section>

                    <section className={style.card}>
                        <h2>Entrega y pago</h2>
                        <fieldset className={style.options}>
                            <legend>Entrega</legend>
                            {deliveryOptions.map(o => (
                                <label key={o.value} className={delivered === o.value ? style.optionActive : style.option}>
                                    <input type="radio" name="delivered" value={o.value} checked={delivered === o.value} onChange={() => setDelivered(o.value)} />
                                    {o.label}
                                </label>
                            ))}
                        </fieldset>

                        {delivered === "cadete" &&
                            <div className={style.address}>
                                <label className={style.field}>
                                    Calle
                                    <input value={shipping.street} onChange={(e) => setShipping(s => ({ ...s, street: e.target.value }))} />
                                </label>
                                <label className={style.field}>
                                    Número
                                    <input inputMode="numeric" value={shipping.number} onChange={(e) => setShipping(s => ({ ...s, number: e.target.value }))} />
                                </label>
                                <label className={style.field}>
                                    Piso <small>(opcional)</small>
                                    <input inputMode="numeric" value={shipping.floor} onChange={(e) => setShipping(s => ({ ...s, floor: e.target.value }))} />
                                </label>
                                <label className={style.field}>
                                    Depto <small>(opcional)</small>
                                    <input value={shipping.letter} onChange={(e) => setShipping(s => ({ ...s, letter: e.target.value }))} />
                                </label>
                            </div>
                        }

                        <fieldset className={style.options}>
                            <legend>Pago</legend>
                            {paymentOptions.map(o => (
                                <label key={o.value} className={paymentMethod === o.value ? style.optionActive : style.option}>
                                    <input type="radio" name="payment" value={o.value} checked={paymentMethod === o.value} onChange={() => setPaymentMethod(o.value)} />
                                    {o.label}
                                </label>
                            ))}
                        </fieldset>

                        <fieldset className={style.options}>
                            <legend>Estado del pago</legend>
                            {([["paid", "Pago recibido"], ["pending", "Pago pendiente"]] as const).map(([value, label]) => (
                                <label key={value} className={paymentStatus === value ? style.optionActive : style.option}>
                                    <input type="radio" name="paymentStatus" value={value} checked={paymentStatus === value} onChange={() => setPaymentStatus(value)} />
                                    {label}
                                </label>
                            ))}
                        </fieldset>
                        <p className={style.hint}>La orden queda <b>aceptada</b> porque la cargás vos.</p>

                        <label className={style.field}>
                            Comentario <small>(opcional)</small>
                            <textarea rows={2} maxLength={150} value={coment} onChange={(e) => setComent(e.target.value)} />
                        </label>
                    </section>
                </div>
            </div>

            <div className={style.footer}>
                {error && <p className={style.error} role="alert">{error}</p>}
                <div className={style.actions}>
                    <p className={style.total}>Total estimado <b>{formatPrice(total)}</b></p>
                    <button type="button" className={style.cancel} onClick={() => navigate("/orders")} disabled={saving}>Cancelar</button>
                    <button className={style.save} disabled={saving}>{saving ? "Creando orden…" : "Crear orden"}</button>
                </div>
            </div>
        </form>
    )
}
