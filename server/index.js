import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/import-export/upload', uploadRouter);

app.get('/', (req, res) => {
  res.send('ProSpaces Import/Export API running');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
