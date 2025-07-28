import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import EditorPage from "./pages/EditorPage";
import CreatePage from "./pages/CreatePage";
import EditorPageMod from "./pages/EditorPageMod";
import EditorPageReader from './pages/EditorPageReader';
import AdminPage from './pages/AdminPage';

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

const App = () => (
  <Router>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/editor/:id"
        element={
          <RequireAuth>
            <EditorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/create"
        element={
          <RequireAuth>
            <CreatePage />
          </RequireAuth>
        }
      />
      <Route path="/editor-mod/:id" element={<RequireAuth><EditorPageMod /></RequireAuth>} />
      <Route path="/editor-read/:id" element={<RequireAuth><EditorPageReader /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
    </Routes>
  </Router>
);

export default App;
