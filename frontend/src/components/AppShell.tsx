import { Link, NavLink, Outlet } from "react-router-dom";
import { useApp } from "../lib/app";
import { NETWORK_LABEL, explorerAddress, shortAddr, hasWallet } from "../lib/chain";
import { LiveBanner } from "./Common";

export function Brand({ dark }: { dark?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="Verdict home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden><circle cx="13" cy="13" r="12" fill="none" stroke={dark ? "#c4a574" : "#0b0b0b"} strokeWidth="1.5" /><path d="M5 10 H21 M13 6 V20 M7 10 L5 16 H9 Z M19 10 L17 16 H21 Z" stroke={dark ? "#c4a574" : "#0b0b0b"} strokeWidth="1.3" fill="none" /></svg>
      Verdict
    </Link>
  );
}

export function WalletButton() {
  const { account, connect, live } = useApp();
  if (account) return <a className="btn ghost sm mono" href={live.kind === "live" ? explorerAddress(account) : "#"} target="_blank" rel="noreferrer">{shortAddr(account)}</a>;
  return <button className="btn sm" onClick={() => void connect().catch((e) => alert(e instanceof Error ? e.message : String(e)))}>{hasWallet() ? "Connect wallet" : "Install a wallet"}</button>;
}

export default function AppShell() {
  const links: [string, string, boolean][] = [["/app", "Dashboard", true], ["/app/claims", "Claims", false], ["/app/new", "Post claim", false], ["/app/funds", "Funds", false]];
  return (
    <>
      <header className="nav">
        <div className="shell nav-in">
          <Brand />
          <nav className="nav-links">
            {links.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>{label}</NavLink>)}
            <span className="badge" style={{ marginLeft: 8 }}>{NETWORK_LABEL}</span>
            <WalletButton />
          </nav>
        </div>
      </header>
      <main className="shell" style={{ paddingBottom: 60 }}>
        <div style={{ paddingTop: 24 }}><LiveBanner /></div>
        <Outlet />
      </main>
      <footer className="shell">VERDICT · GenLayer Intelligent Contract · {NETWORK_LABEL} (chain 61997) · state may reset</footer>
    </>
  );
}
