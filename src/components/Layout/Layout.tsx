import { NavLink, Outlet, useNavigate } from "react-router"
import logomona from "../../assets/Logo_MonaStudio.webp"
import style from "./Layout.module.css"

const links = [
    { to: "/products", label: "Productos" },
    { to: "/catalog", label: "Categorías y variedades" },
    { to: "/orders", label: "Órdenes" },
]

export default function Layout() {
    const navigate = useNavigate()
    return (
        <>
            <header className={style.header}>
                <img src={logomona} alt="Mona Studio" className={style.logo} />
                <nav className={style.nav}>
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => isActive ? `${style.link} ${style.active}` : style.link}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <button
                    className={style.logout}
                    onClick={() => {
                        localStorage.removeItem("tokenMona")
                        navigate("/")
                    }}
                >
                    Cerrar sesión
                </button>
            </header>
            <main className={style.main}>
                <Outlet />
            </main>
        </>
    )
}
