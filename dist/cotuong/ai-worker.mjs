// Luồng phụ cho máy chơi cờ: nhận thế cờ (FEN), trả nước đi tốt nhất theo mức độ.
import { search, LEVELS } from './ai.mjs?v=1';
self.onmessage = event => {
  const { id, fen, level, history } = event.data || {};
  let move = null;
  try { move = search(fen, { ...(LEVELS[level] || LEVELS.vua), history: Array.isArray(history) ? history : [] }); } catch { move = null; }
  self.postMessage({ id, move });
};
