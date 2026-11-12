import './App.css'
import Login from "./components/Login/Login";
import { Route, Routes } from "react-router";
import Products from './components/Products/products';
import Layout from './components/Layout/Layout';
import Catalog from './components/Catalog/Catalog';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/products" element={<Products />} />
          <Route path="/catalog" element={<Catalog />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
