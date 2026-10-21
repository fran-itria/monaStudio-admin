import { useNavigate } from "react-router";
import logomona from "../../assets/Logo_MonaStudio.webp";
import style from "./Login.module.css"
import LoginUser from "./service";
import { useState } from "react";
export default function Login() {
    const navigate = useNavigate()
    const [loader, setLoader] = useState("")
    return <div className={style.container}>
        <img src={logomona} width={1000} />
        <form className={style.form} onSubmit={(e) => LoginUser(e, navigate, setLoader)}>
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
            {loader ?
                <button>
                    {loader}
                    <span className={style.dots}></span>
                </button>
                :
                <button>Iniciar sesión</button>
            }
        </form>
    </div>
}