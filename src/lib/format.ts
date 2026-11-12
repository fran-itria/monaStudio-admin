import axios from "axios"

export const formatPrice = (value: number | string) =>
    new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(Number(value))

export const formatDate = (value: string) =>
    new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value))

/** Devuelve el mensaje de error que manda el back, o uno genérico. */
export function errorMessage(error: unknown, fallback = "Ocurrió un error, intentá de nuevo") {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message
        if (Array.isArray(message)) return message.join(", ")
        if (typeof message === "string") return message
    }
    return fallback
}
