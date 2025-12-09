import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Garante que a pasta existe
const uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

export default {
  directory: uploadFolder,
  
  storage: multer.diskStorage({
    destination: uploadFolder,
    filename(req, file, callback) {
      // Cria um nome único: hash + nome original para evitar sobreposição
      const fileHash = crypto.randomBytes(10).toString('hex');
      const fileName = `${fileHash}-${file.originalname.replace(/\s/g, '')}`;

      return callback(null, fileName);
    }
  }),

  // Filtro para aceitar apenas imagens
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMimes = [
      'image/jpeg',
      'image/pjpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'));
    }
  },

  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB por foto
  }
};