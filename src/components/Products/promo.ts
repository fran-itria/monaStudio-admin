import type { Product, PromoComponent } from "../../lib/types"

export const emptyComponent = (): PromoComponent => ({
    key: crypto.randomUUID(),
    componentId: "",
    stockReduce: 1,
    selectionMode: "fixed",
    selectionQuantity: 2,
    varityId: "",
})

/** Valida los componentes con las mismas reglas que aplica el back. Devuelve el primer error o null. */
export function validatePromo(components: PromoComponent[], products: Product[]): string | null {
    if (!components.length) return "Agregá al menos un producto a la promoción"
    for (const [index, component] of components.entries()) {
        const n = index + 1
        if (!component.componentId) return `Elegí el producto del ítem ${n} de la promoción`
        if (!component.stockReduce || component.stockReduce < 1) return `La cantidad del ítem ${n} debe ser al menos 1`
        if (component.selectionMode === "custom") {
            if (!component.selectionQuantity || component.selectionQuantity < 1)
                return `Indicá cuántas variedades elige el cliente en el ítem ${n}`
            const product = products.find(p => p.id === component.componentId)
            if (!product?.productVarities?.length)
                return `El producto del ítem ${n} no tiene variedades para que el cliente elija`
        }
    }
    if (components.filter(c => c.selectionMode === "custom").length > 1)
        return "Solo un ítem de la promoción puede dejar que el cliente elija variedades"
    return null
}

export function promoPayload(components: PromoComponent[]) {
    return components.map(c => ({
        componentId: c.componentId,
        stockReduce: c.stockReduce,
        selectionMode: c.selectionMode,
        ...(c.selectionMode === "custom" && { selectionQuantity: c.selectionQuantity }),
        ...(c.selectionMode === "fixed" && c.varityId && { varityId: c.varityId }),
    }))
}
