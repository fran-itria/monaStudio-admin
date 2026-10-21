import { useNavigate } from "react-router";
import logomona from "../../assets/Logo_MonaStudio.webp";
import api from "../../lib/axios.config";
import style from "./Login.module.css"
export default function Login() {
    const navigate = useNavigate()

    return <div className={style.container}>
        <img src={logomona} width={1000} />
        <form className={style.form} onSubmit={async (e) => {
            e.preventDefault()
            const fomrData = new FormData(e.currentTarget)
            const login = await api.post("/auth/login", {
                mail: fomrData.get("mail"),
                contrasena: fomrData.get("contrasena")
            })
            if (login.status = 200) {
                navigate("products")
            }
            console.log("submit")
        }}>
            <div>
                <label className={style.label}>
                    Mail:
                </label>
                <input required type="text" className={style.input} name="mail">
                </input>
            </div>
            <div>
                <label className={style.label}>
                    Contraseña:
                </label>
                <input required type="text" className={style.input} name="contrasena">
                </input>
            </div>
            <button>Iniciar sesión</button>
        </form>
    </div>
}