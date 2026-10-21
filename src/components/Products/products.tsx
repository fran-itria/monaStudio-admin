import { useEffect, useState } from "react"
import api from "../../lib/axios.config"
import style from "./products.module.css";

interface ProductsProps {
    id: string,
    createdAt: string,
    updatedAt: string,
    nombre: string,
    price: string,
    stock: number,
    discountedPrice?: null | string,
    description: string,
    active: boolean,
    relatedProducts?: null,
    complementProducts?: null,
    section?: null,
    categories: {
        id: string,
        name: string,
        active: boolean
    }[],
    images: {
        id: string,
        productId: string,
        url: string
    }[],
    productVarities:
    {
        id: string,
        stock: number,
        active: boolean,
        varity: {
            id: string,
            name: string
        }
    }[]
}

export default function Products() {
    const [products, setProducts] = useState<ProductsProps[]>()
    const [copyProducts, setCopyProducts] = useState<ProductsProps[]>()
    const [search, setSearch] = useState<string>()
    const [page, setPage] = useState<string>("1")
    const [nextDisable, setNextDisabled] = useState(false)

    useEffect(() => {
        (async () => {
            const products = await api.get(`/products?page=${page}`)
            if (products.data.length > 0) {
                setProducts(products.data)
                setCopyProducts(products.data)
                document.getElementById("init")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            } else {
                setNextDisabled(true)
                setPage(prev => String(Number(prev) - 1))
            }
        })()
    }, [page])

    useEffect(() => {
        if (search) {
            const product = products?.filter(p => p.nombre.includes(search))
            if (product)
                setCopyProducts(product)
        } else setCopyProducts(products)
    }, [search])

    const formatPrice = (value: number | string) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
        }).format(Number(value));

    return <div style={{ justifyItems: "start", paddingBlock: "20px" }}>
        <p id="init" style={{ color: "#be554b", fontWeight: "bold" }}>Gestión de los productos de Mona Studio</p>
        <div className={style.search}>
            <p>Buscar producto: </p>
            <input onChange={(e) => setSearch(e.target.value)}></input>
        </div>
        <table className={style.table}>
            <thead className={style.head}>
                <tr>
                    <th style={{ width: "40%" }}>Producto</th>
                    <th style={{ textAlign: "center" }}>Precio</th>
                    <th style={{ textAlign: "center" }}>Stock</th>
                    <th style={{ textAlign: "center" }}>Categoría</th>
                </tr>
            </thead>

            <tbody>
                {copyProducts?.length ? copyProducts?.map((product) => (
                    <tr key={product.id} className={style.cell}>
                        <td>
                            <div className={style.product}>
                                <img
                                    src={product.images[0]?.url}
                                    alt={product.nombre}
                                />
                                <p>{product.nombre}</p>
                            </div>
                        </td>

                        <td>
                            <div className={style.prices}>
                                <p>
                                    <span>Original:</span>
                                    {formatPrice(product.price)}
                                </p>
                                <p>
                                    <span>Descuento:</span>
                                    {formatPrice(product.price)}
                                </p>
                            </div>
                        </td>

                        <td>
                            <span className={style.stock}>
                                {product.stock} unidades
                            </span>
                        </td>

                        <td>
                            <div className={style.categories}>
                                {product.categories.map((cat) => (
                                    <span key={cat.id} className={style.category}>
                                        {cat.name}
                                    </span>
                                ))}
                            </div>
                        </td>
                    </tr>
                ))
                    :
                    <td style={{ textAlign: "center", color: "#be554b", fontWeight: "bold" }}>No se encontraron productos con ese nombre</td>
                }
            </tbody>
        </table>
        <div className={style.pagination}>
            <button disabled={page == "1"} onClick={() => {
                setNextDisabled(false)
                setPage((prev) => String(Number(prev) - 1))
            }}>{"<"}</button>
            <button disabled={nextDisable} onClick={() => setPage((prev) => String(Number(prev) + 1))}>{">"}</button>
        </div>
    </div>
}