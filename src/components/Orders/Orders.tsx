import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router"
import api from "../../lib/axios.config"
import type { Order, OrderSource, OrderState, OrdersResponse, PaymentStatus } from "../../lib/types"
import { errorMessage, formatDate, formatPrice } from "../../lib/format"
import WhatsAppIcon from "./WhatsAppIcon"
import style from "./Orders.module.css"

const LIMIT = 20

const deliveryLabels: Record<string, string> = {
    "cadete": "Envío por cadete",
    "retiro en local": "Retiro en local",
    "acordar con vendedor": "Acordar con vendedor",
}

const paymentMethodLabels: Record<string, string> = {
    cash: "Efectivo",
    transfer: "Transferencia",
    card: "Tarjeta / Mercado Pago",
}

const paymentStatusLabels: Record<string, { label: string, tone: string }> = {
    pending: { label: "Pago pendiente", tone: "warn" },
    paid: { label: "Pagado", tone: "ok" },
    failed: { label: "Pago rechazado", tone: "bad" },
}

const stateLabels: Record<string, { label: string, tone: string }> = {
    pending: { label: "Pendiente", tone: "warn" },
    accept: { label: "Aceptada", tone: "ok" },
    rejected: { label: "Rechazada", tone: "bad" },
    delivered: { label: "Entregada / completada", tone: "done" },
}

/** Convierte un teléfono argentino al formato internacional que pide wa.me (549 + área + número). */
function whatsappNumber(phone: string) {
    let digits = phone.replace(/\D/g, "")
    if (digits.startsWith("54")) {
        digits = digits.slice(2)
        if (digits.startsWith("9")) digits = digits.slice(1)
    }
    digits = digits.replace(/^0/, "")
    return `549${digits}`
}

function whatsappLink(order: Order) {
    const text = `¡Hola ${order.client_name}! Te escribimos de Mona Studio por tu pedido #${order.order_number}.`
    return `https://wa.me/${whatsappNumber(order.phone)}?text=${encodeURIComponent(text)}`
}

/** Agrupa las filas de order_products por producto, juntando sus variedades. */
function groupProducts(order: Order) {
    const groups = new Map<string, {
        name: string,
        isPromo: boolean,
        unitPrice: number,
        quantity: number,
        varieties: { name: string, quantity: number }[]
    }>()
    for (const row of order.orderProducts ?? []) {
        const group = groups.get(row.productId) ?? {
            name: row.product?.nombre ?? "Producto eliminado",
            isPromo: !!row.product?.components?.length,
            unitPrice: Number(row.product?.discountedPrice) || Number(row.product?.price) || 0,
            quantity: 0,
            varieties: [],
        }
        if (row.varity) group.varieties.push({ name: row.varity.name, quantity: row.quantity })
        else group.quantity += row.quantity
        groups.set(row.productId, group)
    }
    return [...groups.values()]
}

function Badge({ tone, children }: { tone: string, children: React.ReactNode }) {
    return <span className={`${style.badge} ${style[tone]}`}>{children}</span>
}

type OrderPatch = Partial<{ state: OrderState, paymentStatus: PaymentStatus, archived: boolean }>

function OrderCard({ order, onUpdate }: { order: Order, onUpdate: (order: Order, patch: OrderPatch, done: string) => Promise<void> }) {
    const [busy, setBusy] = useState(false)
    const products = groupProducts(order)
    const payment = paymentStatusLabels[order.paymentStatus]
    const state = stateLabels[order.state]
    const shipping = order.shipping

    const act = async (patch: OrderPatch, done: string, confirmText?: string) => {
        if (confirmText && !confirm(confirmText)) return
        setBusy(true)
        try {
            await onUpdate(order, patch, done)
        } finally {
            setBusy(false)
        }
    }

    return (
        <article className={`${style.card} ${order.archived ? style.archived : ""}`} aria-busy={busy}>
            <header className={style.cardHeader}>
                <div>
                    <p className={style.number}>Orden #{order.order_number}</p>
                    <p className={style.date}>{formatDate(order.created_at)}</p>
                </div>
                <p className={style.amount}>{formatPrice(order.amount)}</p>
            </header>

            <div className={style.badges}>
                {state && <Badge tone={state.tone}>{state.label}</Badge>}
                {payment && <Badge tone={payment.tone}>{payment.label}</Badge>}
                <Badge tone="source">{order.source === "admin" ? "Cargada en el panel" : "Web"}</Badge>
                {order.archived && <Badge tone="muted">Archivada</Badge>}
            </div>

            <div className={style.client}>
                <div>
                    <p className={style.clientName}>{order.client_name} {order.client_surname}</p>
                    <p className={style.phone}>{order.phone}</p>
                </div>
                <a
                    className={style.whatsapp}
                    href={whatsappLink(order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Escribir por WhatsApp a ${order.client_name}`}
                    title="Escribir por WhatsApp"
                >
                    <WhatsAppIcon size={18} />
                    <span>WhatsApp</span>
                </a>
            </div>

            <dl className={style.details}>
                <div>
                    <dt>Entrega</dt>
                    <dd>{order.delivered ? deliveryLabels[order.delivered] ?? order.delivered : "Sin dato"}</dd>
                </div>
                <div>
                    <dt>Pago</dt>
                    <dd>{paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod}</dd>
                </div>
                {shipping &&
                    <div className={style.full}>
                        <dt>Dirección</dt>
                        <dd>
                            {shipping.street} {shipping.number}
                            {shipping.floor ? `, piso ${shipping.floor}` : ""}
                            {shipping.letter ? ` ${shipping.letter}` : ""}
                        </dd>
                    </div>
                }
                {order.coment &&
                    <div className={style.full}>
                        <dt>Comentario</dt>
                        <dd>“{order.coment}”</dd>
                    </div>
                }
            </dl>

            <ul className={style.products}>
                {products.map((product, i) => (
                    <li key={i}>
                        <div className={style.productRow}>
                            <span className={style.productName}>
                                {product.isPromo && <Badge tone="promo">Promo</Badge>}
                                {product.name}
                            </span>
                            {product.quantity > 0 && <span className={style.qty}>x{product.quantity}</span>}
                        </div>
                        {product.varieties.length > 0 &&
                            <ul className={style.varieties}>
                                {product.varieties.map((v, j) => (
                                    <li key={j}>{v.name} <b>x{v.quantity}</b></li>
                                ))}
                            </ul>
                        }
                    </li>
                ))}
            </ul>

            <div className={style.actions}>
                {order.state === "pending" &&
                    <button className={style.primary} disabled={busy} onClick={() => act({ state: "accept" }, "aceptada")}>Aceptar</button>}
                {order.state === "accept" &&
                    <button className={style.primary} disabled={busy} onClick={() => act({ state: "delivered" }, "marcada como entregada")}>Marcar entregada</button>}
                {(order.state === "pending" || order.state === "accept") &&
                    <button className={style.danger} disabled={busy}
                        onClick={() => act({ state: "rejected" }, "rechazada y su stock devuelto",
                            `¿Rechazar la orden #${order.order_number}?\n\nSe devuelve al stock todo lo que tenía. No se puede deshacer.`)}>
                        Rechazar
                    </button>}
                {order.paymentStatus !== "paid" && order.state !== "rejected" &&
                    <button className={style.primary} disabled={busy} onClick={() => act({ paymentStatus: "paid" }, "marcada como pagada")}>Pago recibido</button>}
                {order.paymentStatus === "paid" &&
                    <button className={style.ghost} disabled={busy}
                        onClick={() => act({ paymentStatus: "pending" }, "marcada con pago pendiente", `¿Volver el pago de la orden #${order.order_number} a pendiente?`)}>Pago pendiente</button>}
                {order.state === "delivered" &&
                    <button className={style.ghost} disabled={busy} onClick={() => act({ state: "accept" }, "vuelta a aceptada")}>Deshacer entrega</button>}
                <button className={style.ghost} disabled={busy}
                    onClick={() => act({ archived: !order.archived }, order.archived ? "desarchivada" : "archivada")}>
                    {order.archived ? "Desarchivar" : "Archivar"}
                </button>
            </div>
        </article>
    )
}

const stateFilters: { value: "" | OrderState, label: string }[] = [
    { value: "", label: "Todas" },
    { value: "pending", label: "Pendientes" },
    { value: "accept", label: "Aceptadas" },
    { value: "delivered", label: "Entregadas" },
]

type View = "active" | "rejected" | "archived"

const views: { value: View, label: string }[] = [
    { value: "active", label: "Activas" },
    { value: "rejected", label: "Rechazadas" },
    { value: "archived", label: "Archivadas" },
]

const sourceFilters: { value: "" | OrderSource, label: string }[] = [
    { value: "", label: "Todas" },
    { value: "web", label: "Web" },
    { value: "admin", label: "Cargadas en el panel" },
]

const paymentFilters: { value: "" | PaymentStatus, label: string }[] = [
    { value: "", label: "Todos" },
    { value: "paid", label: "Recibidos" },
    { value: "pending", label: "Pendientes" },
    { value: "failed", label: "Rechazados" },
]

function FilterGroup<T extends string>({ label, options, value, onChange }: {
    label: string,
    options: { value: T, label: string }[],
    value: T,
    onChange: (value: T) => void
}) {
    return (
        <div className={style.filterGroup} role="group" aria-label={label}>
            <span className={style.filterLabel}>{label}</span>
            <div className={style.segmented}>
                {options.map(o => (
                    <button key={o.value || "all"} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function Orders() {
    const location = useLocation()
    const created = (location.state as { created?: number } | null)?.created
    const [data, setData] = useState<OrdersResponse>()
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [reload, setReload] = useState(0)
    const [error, setError] = useState("")
    const [notice, setNotice] = useState(created != null ? `Se creó la orden #${created}.` : "")

    const [searchInput, setSearchInput] = useState("")
    const [search, setSearch] = useState("")
    const [delivery, setDelivery] = useState("")
    const [stateFilter, setStateFilter] = useState<"" | OrderState>("")
    const [paymentFilter, setPaymentFilter] = useState<"" | PaymentStatus>("")
    const [view, setView] = useState<View>("active")
    const [sourceFilter, setSourceFilter] = useState<"" | OrderSource>("")

    // Espera a que se deje de escribir para buscar en el servidor
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim())
            setPage(1)
        }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    useEffect(() => {
        (async () => {
            setLoading(true)
            setError("")
            const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), archived: String(view === "archived") })
            // Activas: sin las rechazadas · Rechazadas: solo esas · Archivadas: todas las archivadas
            if (view === "active") params.set("excludeState", "rejected")
            if (view === "rejected") params.set("state", "rejected")
            else if (stateFilter) params.set("state", stateFilter)
            if (paymentFilter) params.set("paymentStatus", paymentFilter)
            if (delivery) params.set("delivered", delivery)
            if (sourceFilter) params.set("source", sourceFilter)
            if (search) params.set("search", search)
            try {
                const res = await api.get<OrdersResponse>(`/orders?${params}`)
                setData(res.data)
            } catch (err) {
                setError(errorMessage(err, "No se pudieron cargar las órdenes"))
            } finally {
                setLoading(false)
            }
        })()
    }, [page, view, stateFilter, paymentFilter, delivery, sourceFilter, search, reload])

    const changeFilter = <T,>(setter: (v: T) => void) => (value: T) => {
        setter(value)
        setPage(1)
    }

    const updateOrder = async (order: Order, patch: OrderPatch, done: string) => {
        try {
            await api.patch(`/orders/${order.id}`, patch)
            setNotice(`Orden #${order.order_number} ${done}.`)
            setReload(r => r + 1)
        } catch (err) {
            setError(errorMessage(err, `No se pudo actualizar la orden #${order.order_number}`))
        }
    }

    const hasFilters = !!((view !== "rejected" && stateFilter) || paymentFilter || delivery || sourceFilter || search)
    const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

    return (
        <div className={style.page}>
            <div className={style.top}>
                <div>
                    <h1 className={style.title}>Órdenes</h1>
                    {data && <p className={style.subtitle}>
                        {data.total} orden{data.total === 1 ? "" : "es"} {hasFilters ? "con estos filtros" : { active: "activas", rejected: "rechazadas", archived: "archivadas" }[view].replace(/s$/, data.total === 1 ? "" : "s")}
                    </p>}
                </div>
                <Link to="/orders/new" className={style.newOrder}>+ Nueva orden</Link>
            </div>

            <div className={style.tabs} role="tablist">
                {views.map(v => (
                    <button key={v.value} role="tab" aria-selected={view === v.value} onClick={() => changeFilter(setView)(v.value)}>
                        {v.label}
                    </button>
                ))}
            </div>

            <div className={style.filterBar}>
                {view !== "rejected" &&
                    <FilterGroup label="Estado" options={stateFilters} value={stateFilter} onChange={changeFilter(setStateFilter)} />}
                <FilterGroup label="Pago" options={paymentFilters} value={paymentFilter} onChange={changeFilter(setPaymentFilter)} />
                <FilterGroup label="Origen" options={sourceFilters} value={sourceFilter} onChange={changeFilter(setSourceFilter)} />
                <div className={style.filters}>
                    <input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Buscar por nombre, teléfono o n°"
                        aria-label="Buscar órdenes"
                    />
                    <select value={delivery} onChange={(e) => changeFilter(setDelivery)(e.target.value)} aria-label="Filtrar por entrega">
                        <option value="">Todas las entregas</option>
                        {Object.entries(deliveryLabels).map(([value, label]) =>
                            <option key={value} value={value}>{label}</option>)}
                    </select>
                    {hasFilters &&
                        <button type="button" className={style.clear} onClick={() => {
                            setStateFilter(""); setPaymentFilter(""); setDelivery(""); setSourceFilter(""); setSearchInput(""); setSearch(""); setPage(1)
                        }}>Limpiar filtros</button>}
                </div>
            </div>

            {notice && <p className={style.success} role="status">
                {notice}
                <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice("")}>×</button>
            </p>}
            {error && <p className={style.error}>{error}</p>}
            {!data && !error && <p className={style.empty}>Cargando órdenes…</p>}
            {data && !data.orders.length &&
                <p className={style.empty}>{hasFilters ? "Ninguna orden coincide con los filtros"
                    : { active: "No hay órdenes activas", rejected: "No hay órdenes rechazadas", archived: "No hay órdenes archivadas" }[view]}</p>}

            <div className={style.grid} aria-busy={loading}>
                {data?.orders.map(order => <OrderCard key={order.id} order={order} onUpdate={updateOrder} />)}
            </div>

            {data && totalPages > 1 &&
                <div className={style.pagination}>
                    <button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} aria-label="Página anterior">{"<"}</button>
                    <span>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)} aria-label="Página siguiente">{">"}</button>
                </div>
            }
        </div>
    )
}
