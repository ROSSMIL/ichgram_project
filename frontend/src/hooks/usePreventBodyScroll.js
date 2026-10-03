import { useEffect } from "react";

export const usePreventBodyScroll = (isOpen, scrollableRef, onClose) => {
  useEffect(() => {
    if (!isOpen) return;

    const isInsideScrollable = (target) => {
      if (!scrollableRef?.current) return false;
      return scrollableRef.current.contains(target);
    };

    const handleWheel = (e) => {
      const isInside = isInsideScrollable(e.target);
      if (!isInside) {
        e.preventDefault();
      }
    };

    let startY = 0;
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      const isInside = isInsideScrollable(e.target);

      if (!isInside) {
        e.preventDefault();
        return;
      }

      const container = scrollableRef?.current;
      if (!container) return;

      const currentY = e.touches[0].clientY;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isScrollingUp = currentY > startY;
      const isScrollingDown = currentY < startY;

      if (scrollTop <= 0 && isScrollingUp) {
        e.preventDefault();
      } else if (
        scrollTop + clientHeight >= scrollHeight - 1 &&
        isScrollingDown
      ) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && typeof onClose === "function") {
        onClose();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, scrollableRef, onClose]);
};
