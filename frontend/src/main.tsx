import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles.css";
import { AppProvider } from "./lib/app";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Claims from "./pages/Claims";
import ClaimDetail from "./pages/ClaimDetail";
import PostClaim from "./pages/PostClaim";
import Funds from "./pages/Funds";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="claims" element={<Claims />} />
            <Route path="claims/:claimId" element={<ClaimDetail />} />
            <Route path="new" element={<PostClaim />} />
            <Route path="funds" element={<Funds />} />
          </Route>
          <Route path="*" element={<Landing />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
