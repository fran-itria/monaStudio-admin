import { useEffect, useState } from "react"
import api from "../../lib/axios.config"
import style from "./products.module.css";
import { storage } from "../../lib/firebase.config";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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
    images?: {
        id: string,
        productId: string,
        url: string
    }[],
    productVarities:
    {
        id: string,
        stock: number,
        active: boolean,
        varity?: {
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
    const [categories, setCategories] = useState<{ id: string, name: string, active: boolean }[]>()
    const [varities, setVarities] = useState<{ id: string, name: string }[]>()

    const [modal, setModal] = useState<ProductsProps | undefined>(undefined)
    const [newVarity, setNewVarity] = useState<{ id: string, stock: number }>({
        id: "",
        stock: 0,
    })
    const [newImages, setNewImages] = useState<File[]>([])
    const [loader, setLoader] = useState<string>("")
    useEffect(() => {
        (async () => {
            const categories = await api.get("/categories")
            const varities = await api.get("/varities")
            setCategories(categories.data)
            setVarities(varities.data[0])
        })()
    }, [])

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

    const searchProduct = async () => {
        const product = await api.get(`/products/byName/${search}`)
        setCopyProducts(product.data)
    }

    useEffect(() => {
        if (!search) {
            console.log("Reseteando products")
            console.log(products)
            setCopyProducts(products)
        }
    }, [search])

    useEffect(() => {
        document.body.style.overflow = modal ? "hidden" : "";

        return () => {
            document.body.style.overflow = "";
        };
    }, [modal]);

    const formatPrice = (value: number | string) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
        }).format(Number(value));

    return (
        <>
            <div style={{ justifyItems: "start", paddingBlock: "20px" }}>
                <p id="init" style={{ color: "#be554b", fontWeight: "bold" }}>Gestión de los productos de Mona Studio</p>
                <form className={style.search} onSubmit={(e) => {
                    e.preventDefault()
                    searchProduct()
                }}>
                    <p>Buscar producto: </p>
                    <input onChange={(e) => setSearch(e.target.value)}></input>
                    <button>🔍</button>
                </form>
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
                            <tr key={product.id} className={style.cell} onClick={() => {
                                console.log(product)
                                setModal(product)
                            }}>
                                <td>
                                    <div className={style.product}>
                                        <img
                                            src={product.images && product.images[0]?.url}
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
                                            {formatPrice(product.discountedPrice || 0)}
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

            {modal && <div className={style.modal}>
                <div className={style.modalContainer}>
                    <label>
                        Nombre:
                        <input
                            defaultValue={modal.nombre || ""}
                            onChange={(e) => {
                                setModal(prev => {
                                    if (!prev) return prev
                                    return {
                                        ...prev,
                                        nombre: e.target.value
                                    }
                                })
                            }}
                        ></input>
                    </label>
                    <label>
                        Precio:
                        <input
                            defaultValue={modal.price || ""}
                            onChange={(e) => {
                                setModal(prev => {
                                    if (!prev) return prev
                                    return {
                                        ...prev,
                                        price: e.target.value
                                    }
                                })
                            }}
                        ></input>
                    </label>
                    <label>
                        Precio de descuento:
                        <input
                            defaultValue={modal.discountedPrice || ""}
                            onChange={(e) => {
                                setModal(prev => {
                                    if (!prev) return prev
                                    return {
                                        ...prev,
                                        discountedPrice: e.target.value
                                    }
                                })
                            }}
                        ></input>
                    </label>
                    <label>
                        Descripción:
                        <textarea
                            defaultValue={modal.description || ""}
                            onChange={(e) => {
                                setModal(prev => {
                                    if (!prev) return prev
                                    return {
                                        ...prev,
                                        description: e.target.value
                                    }
                                })
                            }}
                        ></textarea>
                    </label>

                    {/* ---- IMAGENES ---- */}
                    <div className={style.modalImages}>
                        <p>Imagens</p>
                        <p>Se recomienda que las imagenes estén en formato <b>WEBP</b></p>
                        <div className={style.images}>
                            {modal.images && modal.images?.map(image => (
                                <div>
                                    <img src={image.url} />
                                    <button onClick={() => {
                                        setModal(prev => {
                                            if (!prev) return prev
                                            return {
                                                ...prev,
                                                images: prev.images?.filter(img => img.id != image.id)
                                            }
                                        })
                                    }}>X</button>
                                </div>
                            ))}
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const url = URL.createObjectURL(file)
                            setNewImages(prev => {
                                if (!prev) return prev
                                return [...prev, file]
                            })
                            setModal(prev => {
                                if (!prev) return prev

                                return {
                                    ...prev,
                                    images: prev.images ? [
                                        ...prev?.images,
                                        {
                                            id: crypto.randomUUID(),
                                            productId: prev?.id,
                                            url: url
                                        }
                                    ] : [
                                        {
                                            id: crypto.randomUUID(),
                                            productId: prev?.id,
                                            url: url
                                        }
                                    ]
                                }
                            })
                        }}></input>
                    </div>



                    {/* ------------------ VARIEDADES ------------------ */}
                    <div className={style.modalVaritiesContainer}>
                        <p>Variedades</p>
                        <div className={style.varities}>
                            {modal.productVarities?.map(varity => (
                                <div style={{ display: "flex" }} key={varity.id}>
                                    <div className={style.varity}>
                                        <label>
                                            Nombre:
                                            <input defaultValue={varity.varity?.name}></input>
                                        </label>
                                        <label>
                                            Stock:
                                            <input defaultValue={varity.stock} onChange={(e) => {
                                                const newStock = Number(e.target.value)
                                                setModal((prev) => {
                                                    if (!prev) return prev
                                                    const varities = prev.productVarities.map((element) =>
                                                        element.id != varity.id ? element : { ...varity, stock: newStock })
                                                    return {
                                                        ...prev,
                                                        productVarities: varities
                                                    }
                                                })
                                            }}></input>
                                        </label>
                                        <button
                                            className={style.delete}
                                            onClick={() => {
                                                console.log(varity.id)
                                                setModal(prev => {
                                                    if (!prev) return prev
                                                    return {
                                                        ...prev,
                                                        productVarities: prev.productVarities.filter(element => element.id != varity.id)
                                                    }
                                                })
                                            }}>
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div>
                                <div className={style.varity}>
                                    <label>
                                        Nombre:
                                        <select defaultValue={""} onChange={(e) => setNewVarity(prev => ({ ...prev, id: e.target.value }))}>
                                            <option></option>
                                            {varities?.map((varity) => <option value={varity.id}>{varity.name}</option>)}
                                        </select>
                                    </label>
                                    <label>
                                        Stock:
                                        <input defaultValue="" onChange={(e) => setNewVarity(prev => ({ ...prev, stock: Number(e.target.value) }))}></input>
                                    </label>
                                    <button
                                        className={style.save}
                                        style={{ paddingBlock: "0px" }}
                                        disabled={!newVarity.id || !newVarity.stock}
                                        onClick={() => {
                                            setModal(prev => {
                                                if (!prev) return prev
                                                return {
                                                    ...prev,
                                                    productVarities: [
                                                        ...prev.productVarities,
                                                        {
                                                            active: true,
                                                            id: newVarity.id,
                                                            stock: newVarity.stock,
                                                            varity: {
                                                                id: newVarity.id,
                                                                name: varities?.find(element => element.id == newVarity.id)?.name || ""
                                                            }
                                                        }
                                                    ]
                                                }
                                            })
                                            setNewVarity({
                                                id: "",
                                                stock: 0
                                            })
                                        }}
                                    >
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* ------------------ CATEGORÍAS ------------------ */}
                    <div className={style.categories}>
                        <p>Categorías <b>{"(vaya eligiendo para ir agregando la categoría)"}</b></p>
                        <select onChange={(e) => {
                            setModal(prev => {
                                if (!prev) return prev
                                const categorySelected = e.target.value
                                return {
                                    ...prev,
                                    categories: [
                                        ...prev.categories,
                                        {
                                            active: true,
                                            id: categorySelected,
                                            name: categories?.find(c => c.id == categorySelected)?.name || ""
                                        }
                                    ]
                                }
                            })
                        }}>
                            <option></option>
                            {categories?.map(category => <option value={category.id} id={category.id}>{category.name}</option>)}
                        </select>
                        <div>
                            {modal.categories.map(category => (
                                <div className={style.modalCategory}>
                                    <p>{category.name}</p>
                                    <button onClick={() => {
                                        setModal(prev => {
                                            if (!prev) return prev
                                            return {
                                                ...prev,
                                                categories: prev.categories?.filter(cat => cat.id != category.id)
                                            }
                                        })
                                    }}>X</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className={style.delete} style={{ paddingBlock: "7px", fontSize: "17px" }} onClick={() => setModal(undefined)}>Cancelar</button>
                    {!loader ?
                        <button
                            className={style.save}
                            onClick={async () => {
                                setLoader("Guardando cambios")
                                const {
                                    createdAt,
                                    updatedAt,
                                    active,
                                    images,
                                    productVarities,
                                    ...data
                                } = modal
                                try {
                                    const imagesProduct = modal.images?.filter(e => e.url.includes("firebasestorage")).map(e => e.url)
                                    console.log(newImages)
                                    if (newImages?.length)
                                        for (const image of newImages) {
                                            const storageRef = ref(
                                                storage,
                                                `Productos/${image.name}`
                                            )

                                            await uploadBytes(storageRef, image, { contentType: image.type })

                                            const url = await getDownloadURL(storageRef)
                                            imagesProduct?.push(url)
                                        }
                                    console.log(imagesProduct)
                                    const patch = await api.patch("products", {
                                        ...data,
                                        price: Number(data.price),
                                        discountedPrice: Number(data.discountedPrice),
                                        image: imagesProduct,
                                        varities: modal.productVarities.map(varity => ({ id: varity.varity?.id, productVarityId: varity.id, stock: varity.stock, active: varity.active }))
                                    })
                                    if (patch.data) {
                                        setCopyProducts(prev => {
                                            if (!prev) return prev
                                            return prev?.map(product => product.id == patch.data.id ? { ...patch.data, productVarities: patch.data.varities, images: patch.data.image } : product)
                                        })
                                        setModal(undefined)
                                        setLoader("")
                                    }
                                } catch (error) {
                                    setLoader("")
                                }
                            }}
                        >
                            Guardar cambios
                        </button>
                        :
                        <button>
                            {loader}
                            <span className={style.dots}></span>
                        </button>
                    }
                </div>
            </div>
            }
        </>
    )
}