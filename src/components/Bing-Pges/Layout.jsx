import React, { useEffect, useRef } from "react"; // Import useRef and useEffect
import { Outlet, useLocation } from "react-router-dom"; // Import useLocation
import Nav from "./NavLink";

// Receive the necessary props
export default function Layout({ isBlackToggleOn, socket, gameId, telegramId, cartelaId, setCartelaIdInParent }) {
  const location = useLocation();
  const prevPathRef = useRef(null); // Initialize ref to null

  // This useEffect will now run as long as Layout is mounted
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current; // Get the *previous* path from the ref

    console.log("--- Layout Effect Path Change Debug ---");
    console.log("  currentPath:", currentPath);
    console.log("  prevPath (from ref):", prevPath);

    // isEnteringRoot: When we just landed on '/', and weren't on '/' before (prevPath is not '/')
    const isEnteringRoot = currentPath === "/" && prevPath !== "/";

    // isLeavingRootToNonGame: When we were on '/', and moved to something not '/' and not '/game'
    const isLeavingRootToNonGame =
      prevPath === "/" && currentPath !== "/" && !currentPath.startsWith("/game");

    console.log("  isEnteringRoot (condition):", isEnteringRoot);
    console.log("  isLeavingRootToNonGame (condition):", isLeavingRootToNonGame);


    // --- 1. (Optional) Reload once per visit ONLY when entering "/" ---
    // If you removed window.location.reload() from Bingo.jsx, you might still want this here,
    // or you might decide it's not needed at all for an SPA.
    // I'm keeping it commented out as per our previous discussion to avoid reload loops.
    /*
    const reloadKey = `hasRefreshed_${currentPath}`;
    if (isEnteringRoot) {
      const hasRefreshed = sessionStorage.getItem(reloadKey);
      if (!hasRefreshed) {
        sessionStorage.setItem(reloadKey, "true");
        console.log("Layout: Reloading page on entry to /");
        window.location.reload();
        return; // Prevent rest of effect after reload
      }
    }
    */


    // --- 2. Emit only when leaving "/" to a NON-/game route (via React Router) ---
    if (isLeavingRootToNonGame) {
      console.log("✅ LAYOUT EMIT: unselectCardOnLeave on route change!");
      // Ensure socket is available and connected before emitting
      if (socket && socket.connected) {
        socket.emit("unselectCardOnLeave", {
          gameId,
          telegramId,
          cardId: cartelaId ?? null, // Use the cartelaId passed from App
        });
        setCartelaIdInParent(null);
        sessionStorage.removeItem("hasRefreshed_/"); // Clear any related session storage
      } else {
        console.warn("Layout: Socket not connected or not available for emit on route change.");
      }
    }

    // IMPORTANT: Update prevPathRef.current *after* all checks for the *next* render cycle
    // This ensures 'prevPath' is correctly set for the *next* time this effect runs.
    prevPathRef.current = currentPath;
    console.log("  prevPathRef.current (updated to):", prevPathRef.current);
    console.log("--- End Layout Effect Path Change Debug ---");


    // --- 3. Emit again ONLY if closing tab or refreshing while on "/" (beforeunload event) ---
    // This listener needs access to the *latest* state variables (gameId, telegramId, cartelaId)
    // which are available from the useEffect's closure, or passed as dependencies.
    const handleBeforeUnload = () => {
      // This fires *just before* the page unloads
      if (location.pathname === "/") { // Check the current path at unload time
        console.log("📤 LAYOUT EMIT: unselectCardOnLeave on beforeunload!");
        if (socket && socket.connected) {
          socket.emit("unselectCardOnLeave", {
            gameId,
            telegramId,
            cardId: cartelaId ?? null,
          });
          sessionStorage.removeItem("hasRefreshed_/");
        } else {
            console.warn("Layout: Socket not connected or not available for emit on beforeunload.");
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup listener on unmount or dependency change
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [location.pathname, gameId, telegramId, cartelaId, socket]); // Dependencies for this useEffect

  return (
    <>
      {/* This will render the current page (child route) */}
      <Outlet />

      {/* This is the persistent Nav */}
      <Nav isBlackToggleOn={isBlackToggleOn} />
    </>
  );
}