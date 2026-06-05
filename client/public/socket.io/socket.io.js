// Fallback stub when opened directly without Node.js server.
// Real socket.io is auto-served by Express at /socket.io/socket.io.js when npm start is running.
window.io = function() {
  console.warn('GameHub: Running without server — online multiplayer disabled.');
  const noop = () => {};
  return { on: noop, emit: noop, off: noop, disconnect: noop };
};
