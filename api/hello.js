export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Hello from FinTrack V2!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}

