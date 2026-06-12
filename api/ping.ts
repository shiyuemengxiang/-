export default function (req: any, res: any) {
  res.status(200).json({ pong: true, url: req.url, originalUrl: req.originalUrl, query: req.query });
}
