import React from "react";

const MainLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-blue-600 text-white p-4 text-2xl">Main Layout</header>
    <main className="p-8">{children}</main>
  </div>
);

export default MainLayout; 