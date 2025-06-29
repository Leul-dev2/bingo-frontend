import { Outlet } from "react-router-dom"; // Outlet renders child route components
import Nav from "./NavLink";
export default function Layout( {isBlackToggleOn}) {
  return (
    <>
      {/* This will render the current page (child route) */}
      <Outlet />
      
      {/* This is the persistent Nav */}
      <Nav  isBlackToggleOn={isBlackToggleOn}/>
    </>
  );
}
