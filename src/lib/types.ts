export interface Category {
    id: string
    name: string
    active: boolean
}

export interface Varity {
    id: string
    name: string
}

export interface ProductVarity {
    id: string
    stock: number
    active: boolean
    varity?: Varity
}

export interface Product {
    id: string
    createdAt: string
    updatedAt: string
    nombre: string
    price: string
    stock: number
    discountedPrice?: null | string
    description: string
    active: boolean
    categories: Category[]
    images?: { id: string, productId: string, url: string }[]
    productVarities: ProductVarity[]
}

export type SelectionMode = "fixed" | "custom"

/** Un componente de una promoción/combo, tal como lo espera el back (CreateProductComponentDto). */
export interface PromoComponent {
    key: string
    componentId: string
    stockReduce: number
    selectionMode: SelectionMode
    selectionQuantity: number
    /** id del productVarity del producto componente (solo modo "fixed", opcional) */
    varityId: string
}

export type PaymentMethod = "cash" | "transfer" | "card"
export type PaymentStatus = "pending" | "paid" | "failed"
export type OrderState = "pending" | "accept" | "rejected" | "delivered"
export type OrderSource = "web" | "admin"

export interface OrderProduct {
    orderId: string
    productId: string
    varityId: string | null
    quantity: number
    product: {
        id: string
        nombre: string
        price: string
        discountedPrice: string | null
        components?: { id: string }[]
    }
    varity: Varity | null
}

export interface Order {
    id: string
    order_number: number
    client_name: string
    client_surname: string
    phone: string
    amount: string
    paymentMethod: PaymentMethod
    paymentStatus: PaymentStatus
    coment: string | null
    state: OrderState
    delivered: string | null
    archived: boolean
    source: OrderSource
    shipping?: { street: string, number: number, floor?: number | null, letter?: string | null } | null
    orderProducts: OrderProduct[]
    created_at: string
}

export interface OrdersResponse {
    orders: Order[]
    total: number
    page: number
    limit: number
}
