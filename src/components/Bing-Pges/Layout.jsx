// components/Bing-Pges/Layout.jsx
import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Nav from "./NavLink";

// Receive the necessary props, INCLUDING the new onClearClientCardState
export default function Layout({ isBlackToggleOn, socket, gameId, telegramId, cartelaId, setCartelaIdInParent, onClearClientCardState }) {
  const location = useLocation();
  const prevPathRef = useRef(null);

  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;

    console.log("--- Layout Effect Path Change Debug ---");
    console.log("   currentPath:", currentPath);
    console.log("   prevPath (from ref):", prevPath);

    const isEnteringRoot = currentPath === "/" && prevPath !== "/";
    const isLeavingRootToNonGame =
      prevPath === "/" && currentPath !== "/" && !currentPath.startsWith("/game");

    console.log("   isEnteringRoot (condition):", isEnteringRoot);
    console.log("socket when return", socket);
    console.log("   isLeavingRootToNonGame (condition):", isLeavingRootToNonGame);


    // --- 1. Clear session storage ONLY when entering "/" (Soft Reload) ---
    if (isEnteringRoot) {
      console.log("Layout: Navigating back to /, performing soft reload and clearing session storage.");
      sessionStorage.removeItem("mySelectedCardId");
      sessionStorage.removeItem("hasRefreshed_/");
      // If you want the full client-side card state to be reset here too, call the function:
      // onClearClientCardState(cartelaId); // Pass the current cardId if it's relevant, or just call it to reset
    }


    // --- 2. Emit only when leaving "/" to a NON-/game route (via React Router) ---
    if (isLeavingRootToNonGame) {
      console.log("✅ LAYOUT EMIT: unselectCardOnLeave on route change!");
      if (socket && socket.connected) {
        socket.emit("unselectCardOnLeave", {
          gameId,
          telegramId,
          cardId: cartelaId ?? null,
        });
        // Call the centralized client-side cleanup function after emitting to server
       // onClearClientCardState(cartelaId); // <--- CALL THE FUNCTION HERE
        // The following sessionStorage removals are redundant if onClearClientCardState handles them
        // sessionStorage.removeItem("mySelectedCardId");
        // sessionStorage.removeItem("hasRefreshed_/");
      } else {
        console.warn("Layout: Socket not connected or not available for emit on route change.");
      }
    }

    prevPathRef.current = currentPath;
    console.log("   prevPathRef.current (updated to):", prevPathRef.current);
    console.log("--- End Layout Effect Path Change Debug ---");


    // --- 3. Emit again ONLY if closing tab or refreshing while on "/" (beforeunload event) ---
    const handleBeforeUnload = () => {
      if (location.pathname === "/") {
        console.log("📤 LAYOUT EMIT: unselectCardOnLeave on beforeunload!");
        if (socket && socket.connected) {
          socket.emit("unselectCardOnLeave", {
            gameId,
            telegramId,
            cardId: cartelaId ?? null,
          });
          // Call the centralized client-side cleanup function
          onClearClientCardState(cartelaId); // <--- CALL THE FUNCTION HERE
          // The following sessionStorage removals are redundant if onClearClientCardState handles them
          // sessionStorage.removeItem("mySelectedCardId");
          // sessionStorage.removeItem("hasRefreshed_/");
        } else {
          console.warn("Layout: Socket not connected or not available for emit on beforeunload.");
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [location.pathname, gameId, telegramId, cartelaId, socket, onClearClientCardState]); // Add onClearClientCardState to dependencies

  return (
    <>
      <Outlet />
      <Nav isBlackToggleOn={isBlackToggleOn} />
    </>
  );
}