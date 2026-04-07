/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import GamePlay from './pages/GamePlay';
import { initAuth } from './store/useAuthStore';

export default function App() {
  useEffect(() => {
    initAuth();
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
