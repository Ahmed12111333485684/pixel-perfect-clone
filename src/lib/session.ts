type UnauthorizedHandler = () => void;

const handlers = new Set<UnauthorizedHandler>();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function notifyUnauthorized(): void {
  handlers.forEach((handler) => {
    try {
      handler();
    } catch {
      // ignore handler errors
    }
  });
}
