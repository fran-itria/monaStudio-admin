import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import axios from "axios"
import api from "../../lib/axios.config"
import style from "./products.module.css";
import type { Product } from "../../lib/types";
import { errorMessage, formatPrice } from "../../lib/format";

const LIMIT = 20

type Tab = "inCatalog" | "outCatalog"

export default function Products() {
    const [tab, setTab] = useState<Tab>("inCatalog")
    const [products, setProducts] = useState<Product[]>()
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [hasNext, setHasNext] = useState(true)
    const [loadingList, setLoadingList] = useState(false)
    const [allProducts, setAllProducts] = useState<Product[]>()
    const [deletingId, setDeletingId] = useState("")
    const [notice, setNotice] = useState<{ type: "ok" | "error", text: string }>()
    const listTop = useRef<HTMLDivElement>(null)
    const scrollAfterLoad = useRef(false)

    useEffect(() => {
        (async () => {
            setLoadingList(true)
            try {
                const res = await api.get<Product[]>(`/products?orderBy=createdAt&page=${page}&limit=${LIMIT}&active=${tab}`)
                if (!res.data.length && page > 1) {
                    // La página anterior era justo la última: volvemos y deshabilitamos "Siguiente"
                    setHasNext(false)
                    setPage(page - 1)
                    return
                }
                setProducts(res.data)
                setHasNext(res.data.length === LIMIT)
                if (scrollAfterLoad.current) {
                    scrollAfterLoad.current = false
                    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
            } catch {
                setProducts([])
            } finally {
                setLoadingList(false)
            }
        })()
    }, [page, tab])

    /** Todos los productos de la pestaña actual, para buscar. Se cargan la primera vez que se busca. */
    const loadAllProducts = async () => {
        if (allProducts) return
        try {
            const all = await api.get<Product[]>(`/products?limit=500&orderBy=nombre&direction=ASC&active=${tab}`)
            setAllProducts(all.data)
        } catch {
            setAllProducts([])
        }
    }

    const changeTab = (next: Tab) => {
        if (next === tab) return
        setTab(next)
        setPage(1)
        setHasNext(true)
        setProducts(undefined)
        setAllProducts(undefined)
        setSearch("")
    }

    const removeFromLists = (id: string) => {
        setProducts(prev => prev?.filter(p => p.id !== id))
        setAllProducts(prev => prev?.filter(p => p.id !== id))
    }

    const deleteProduct = async (product: Product) => {
        if (!confirm(`¿Eliminar "${product.nombre}"?\n\nSe borran también sus variedades e imágenes. No se puede deshacer.`)) return
        setDeletingId(product.id)
        setNotice(undefined)
        try {
            await api.delete(`/products/${product.id}`)
            removeFromLists(product.id)
            setNotice({ type: "ok", text: `Se eliminó "${product.nombre}".` })
        } catch (error) {
            const code = axios.isAxiosError(error) ? error.response?.data?.errorCode : undefined
            // Con órdenes no se puede borrar: ofrecemos ocultarlo de la tienda
            if (code === "PRODUCT_HAS_ORDERS" && product.active &&
                confirm(`${errorMessage(error)}\n\n¿Querés ocultarlo de la tienda?`)) {
                try {
                    await api.patch("/products", { id: product.id, active: false })
                    removeFromLists(product.id)
                    setNotice({ type: "ok", text: `"${product.nombre}" quedó oculto de la tienda (pestaña "Ocultos / sin stock").` })
                } catch (err) {
                    setNotice({ type: "error", text: errorMessage(err, "No se pudo ocultar el producto") })
                }
            } else {
                setNotice({ type: "error", text: errorMessage(error, "No se pudo eliminar el producto") })
            }
        } finally {
            setDeletingId("")
        }
    }

    const goToPage = (next: number) => {
        scrollAfterLoad.current = true
        setPage(next)
    }

    const term = search.trim().toLowerCase()
    const visibleProducts = term
        ? allProducts?.filter(p => p.nombre.toLowerCase().includes(term))
        : products

    return (
        <div className={style.page}>
            <div className={style.intro}>
                <h1 className={style.title}>Productos</h1>
                <p className={style.subtitle}>
                    Antes de crear o modificar un producto, tenés que tener registradas sus variedades y categorías
                    en <Link to="/catalog">Categorías y variedades</Link>.
                </p>
            </div>

            <div className={style.tabs} role="tablist">
                <button role="tab" aria-selected={tab === "inCatalog"} onClick={() => changeTab("inCatalog")}>
                    En la tienda
                </button>
                <button role="tab" aria-selected={tab === "outCatalog"} onClick={() => changeTab("outCatalog")}>
                    Ocultos / sin stock
                </button>
            </div>

            <div className={style.toolbar} ref={listTop}>
                <input
                    className={style.searchInput}
                    type="search"
                    value={search}
                    onFocus={loadAllProducts}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto por nombre…"
                    aria-label="Buscar producto"
                />
                <Link className={style.addButton} to="/products/new">
                    + Agregar producto o promoción
                </Link>
            </div>

            {notice && <p className={notice.type === "ok" ? style.noticeOk : style.noticeError} role="status">
                {notice.text}
                <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(undefined)}>×</button>
            </p>}

            {term && <p className={style.resultInfo}>
                {visibleProducts?.length ?? 0} resultado{visibleProducts?.length === 1 ? "" : "s"} para “{search.trim()}”
                <button onClick={() => setSearch("")}>Limpiar</button>
            </p>}

            <div className={style.list} aria-busy={loadingList}>
                <div className={style.listHeader}>
                    <span>Producto</span>
                    <span>Precio</span>
                    <span>Stock</span>
                    <span>Categorías</span>
                    <span className={style.srOnly}>Acciones</span>
                </div>
                {visibleProducts?.length ? visibleProducts.map((product) => (
                    <div key={product.id} className={style.row} aria-busy={deletingId === product.id}>
                        <span className={style.product}>
                            {product.images?.[0]?.url
                                ? <img src={product.images[0].url} alt="" />
                                : <span className={style.noImage} aria-hidden="true">Sin foto</span>}
                            {/* El link cubre toda la fila (ver .rowLink::after) */}
                            <Link to={`/products/${product.id}`} className={style.rowLink}>{product.nombre}</Link>
                        </span>
                        <span className={style.prices}>
                            {Number(product.discountedPrice) > 0 ? <>
                                <span className={style.oldPrice}>{formatPrice(product.price)}</span>
                                <span className={style.price}>{formatPrice(product.discountedPrice || 0)}</span>
                            </> :
                                <span className={style.price}>{formatPrice(product.price)}</span>
                            }
                        </span>
                        <span className={style.stockCell}>
                            <span className={`${style.stock} ${!product.stock ? style.noStock : ""}`}>
                                {product.stock ?? 0} u.
                            </span>
                        </span>
                        <span className={style.chips}>
                            {product.categories?.map((cat) => (
                                <span key={cat.id} className={style.category}>{cat.name}</span>
                            ))}
                        </span>
                        <span className={style.rowActions}>
                            <button
                                type="button"
                                className={style.deleteButton}
                                disabled={deletingId === product.id}
                                onClick={() => deleteProduct(product)}
                                aria-label={`Eliminar ${product.nombre}`}
                                title="Eliminar producto"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6m6 5v6m4-6v6" />
                                </svg>
                                <span className={style.deleteLabel}>Eliminar</span>
                            </button>
                        </span>
                    </div>
                ))
                    :
                    <p className={style.empty}>
                        {loadingList || (term && !allProducts) || !visibleProducts
                            ? "Cargando…"
                            : term ? "No se encontraron productos con ese nombre"
                                : tab === "inCatalog" ? "Todavía no hay productos en la tienda" : "No hay productos ocultos"}
                    </p>
                }
            </div>

            {!term &&
                <div className={style.pagination}>
                    <button disabled={page === 1 || loadingList} onClick={() => goToPage(page - 1)}>‹ Anterior</button>
                    <span>Página {page}</span>
                    <button disabled={!hasNext || loadingList} onClick={() => goToPage(page + 1)}>Siguiente ›</button>
                </div>
            }
        </div>
    )
}
