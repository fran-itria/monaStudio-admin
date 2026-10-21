import './App.css'
import Login from "./components/Login/Login";
import { Route, Routes } from "react-router";
import Products from './components/Products/products';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/products" element={<Products />} />
      </Routes>
    </>
  )
}

export default App
