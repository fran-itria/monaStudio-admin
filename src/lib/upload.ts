import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "./firebase.config"

/** Sube una imagen de producto a Firebase Storage y devuelve su URL pública. */
export async function uploadProductImage(file: File) {
    const safeName = file.name.replace(/[^\w.-]+/g, "_")
    const storageRef = ref(storage, `Productos/${Date.now()}-${safeName}`)
    await uploadBytes(storageRef, file, { contentType: file.type })
    return getDownloadURL(storageRef)
}
