export default async function (req: any, res: any) {
  try {
    const { app } = await import('../server');
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url === '/' ? '' : req.url);
    }
    return app(req, res);
  } catch (err: any) {
    res.status(500).json({ error: 'Server initialization error: ' + err.message, stack: err.stack });
  }
}
