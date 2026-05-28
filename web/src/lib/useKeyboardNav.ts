'use client';

import { useEffect } from 'react';

/**
 * Global klavye gezinme hook'u.
 * Tüm sayfalarda Tab/Shift+Tab ile focusable elementler arasinda gezinmeyi garantiler.
 * Ayrica :focus stilinin her durumda gorunur olmasini saglar.
 */
export function useKeyboardNav() {
  useEffect(() => {
    // Focusable element selector — tum dogal ve ozel focusable elementler
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

    const handleKeyDown = (e: KeyboardEvent) => {
      // Sadece Tab tusunu yakala
      if (e.key !== 'Tab') return;

      const focusable = Array.from(document.querySelectorAll(FOCUSABLE)) as HTMLElement[];
      const visible = focusable.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetWidth > 0 && el.offsetHeight > 0;
      });

      if (visible.length === 0) return;

      const current = document.activeElement;
      const currentIndex = visible.indexOf(current as HTMLElement);

      let nextIndex: number;
      if (e.shiftKey) {
        // Shift+Tab: geriye dogru
        nextIndex = currentIndex <= 0 ? visible.length - 1 : currentIndex - 1;
      } else {
        // Tab: ileriye dogru
        nextIndex = currentIndex >= visible.length - 1 ? 0 : currentIndex + 1;
      }

      e.preventDefault();
      const nextEl = visible[nextIndex];
      nextEl.focus();

      // Zorla focus stilini goster (bazi tarayicilarda :focus-visible tetiklenmeyebilir)
      nextEl.style.outline = '2px solid #2DD4BF';
      nextEl.style.outlineOffset = '2px';
      // 500ms sonra stili temizle ki CSS :focus kurallari devralabilsin
      setTimeout(() => {
        nextEl.style.outline = '';
        nextEl.style.outlineOffset = '';
      }, 600);
    };

    // Sayfa yuklendiginde ilk focusable elemente odaklan
    const focusFirst = () => {
      const focusable = Array.from(document.querySelectorAll(FOCUSABLE)) as HTMLElement[];
      const visible = focusable.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
      });
      // Sadece body henuz focused degilse
      if (visible.length > 0 && document.activeElement === document.body) {
        // Ilk input veya button'a odaklan
        const firstInput = visible.find(el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        if (firstInput) {
          (firstInput as HTMLElement).focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Sayfa yuklendikten biraz sonra
    const t = setTimeout(focusFirst, 500);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(t);
    };
  }, []);
}
