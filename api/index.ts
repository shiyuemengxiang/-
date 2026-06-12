let appHandler: any;
let startupError: any = null;

export default async function handler(req: any, res: any) {
  if (!appHandler && !startupError) {
    try {
      const server = await import('../server');
      appHandler = server.app;
    } catch (e: any) {
      startupError = e;
      console.error('Startup Error:', e);
    }
  }

  if (startupError) {
    return res.status(500).json({
      error: 'Startup error',
      message: startupError?.message || String(startupError),
      stack: startupError?.stack
    });
  }
  if (!appHandler) {
    return res.status(500).json({ error: 'App handler not loaded' });
  }
  return appHandler(req, res);
}


