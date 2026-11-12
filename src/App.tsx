import './App.css'
import Login from "./components/Login/Login";
import { Route, Routes } from "react-router";
import Products from './components/Products/products';
import Layout from './components/Layout/Layout';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/products" element={<Products />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
