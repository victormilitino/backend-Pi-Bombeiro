import { Router, Response } from 'express';
import multer from 'multer';
import uploadConfig from '../config/upload';
import { OccurrenceController } from '../controllers/occurrence.controller';
import { authMiddleware, checkPermission, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createOccurrenceValidator, updateOccurrenceValidator } from '../validators/occurrence.validator';

const router = Router();
const upload = multer(uploadConfig);
const occurrenceController = new OccurrenceController();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

/**
 * @route   GET /api/occurrences
 * @desc    Listar todas as ocorrências com filtros
 */
router.get('/', (req: AuthRequest, res: Response) => occurrenceController.list(req, res));

/**
 * @route   GET /api/occurrences/stats
 * @desc    Obter estatísticas das ocorrências
 */
router.get('/stats', (req: AuthRequest, res: Response) => occurrenceController.getStats(req, res));

/**
 * @route   GET /api/occurrences/:id
 * @desc    Obter uma ocorrência específica
 */
router.get('/:id', (req: AuthRequest, res: Response) => occurrenceController.getById(req, res));

/**
 * @route   POST /api/occurrences
 * @desc    Criar nova ocorrência (agora com suporte a upload de fotos)
 * @access  Private
 */
router.post(
  '/',
  checkPermission('Visualizar'), // Ajuste permissão se necessário
  upload.array('fotos', 5),      // Middleware Multer: campo 'fotos', máx 5 arquivos
  createOccurrenceValidator,     // Validações do express-validator
  validate,                      // Middleware de checagem de erros
  (req: AuthRequest, res: Response) => occurrenceController.create(req, res)
);

/**
 * @route   PUT /api/occurrences/:id
 * @desc    Atualizar ocorrência
 * @access  Private
 */
router.put(
  '/:id', 
  checkPermission('Editar'),
  updateOccurrenceValidator,
  validate,
  (req: AuthRequest, res: Response) => occurrenceController.update(req, res)
);

/**
 * @route   DELETE /api/occurrences/:id
 * @desc    Excluir ocorrência
 * @access  Private
 */
router.delete(
  '/:id', 
  checkPermission('Excluir'), 
  (req: AuthRequest, res: Response) => occurrenceController.delete(req, res)
);

export default router;