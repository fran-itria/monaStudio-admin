import type { NavigateFunction } from "react-router"
import api from "../../lib/axios.config"



export default async function LoginUser(
    e: React.SubmitEvent<HTMLFormElement>,
    navigate: NavigateFunction,
    setLoader: React.Dispatch<React.SetStateAction<string>>
) {
    e.preventDefault()
    setLoader("Iniciando sesión")
    try {
        const fomrData = new FormData(e.currentTarget)
        const login = await api.post("/auth/login", {
            mail: fomrData.get("mail"),
            contrasena: fomrData.get("contrasena")
        })
        if (login.status = 200) {
            navigate("products")
        }
    } catch (error) {
        setLoader("")
    }
}