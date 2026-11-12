import './App.css'
import Login from "./components/Login/Login";
import { Route, Routes } from "react-router";
import Products from './components/Products/products';
import Layout from './components/Layout/Layout';
import Catalog from './components/Catalog/Catalog';
import Orders from './components/Orders/Orders';
import ProductForm from './components/Products/ProductForm';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id" element={<ProductForm />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/orders" element={<Orders />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
