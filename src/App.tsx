/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import GamePlay from './pages/GamePlay';
import { unlockSound } from './lib/sound';
import { initAuth } from './store/useAuthStore';

export default function App() {
  useEffect(() => {
    initAuth();
  }, []);

  // Browsers keep audio suspended until the player has interacted with the
  // page, so the first tap or key press is what starts it. Both are listened
  // for because a keyboard player may never point at anything.
  useEffect(() => {
    const start = () => {
      unlockSound();
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/play/:gameId" element={<GamePlay />} />
      </Routes>
    </BrowserRouter>
  );
}
