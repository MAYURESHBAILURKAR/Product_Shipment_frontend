import React from "react";
import AdminDashboard from "../../src/components/AdminDashboard"; // We'll create this
import ProductionDashboard from "../../src/components/ProductionDashboard"; // We'll create this
import { useAuth } from "../../src/context/AuthContext";

export default function DashboardScreen() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <AdminDashboard />;
  }
  return <ProductionDashboard />;
}
