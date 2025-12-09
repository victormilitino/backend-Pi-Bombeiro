import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { OccurrenceService } from '../services/occurrence.service';

const occurrenceService = new OccurrenceService();
const prisma = new PrismaClient();

export class OccurrenceController {
  
  // ==================== CREATE ====================
  async create(req: AuthRequest, res: Response) {
    try {
      // O Multer adiciona o campo 'files' ao objeto req
      const files = req.files as Express.Multer.File[];

      const occurrence = await occurrenceService.create({
        ...req.body,
        criadoPorId: req.user!.id,
        files: files // Passamos os arquivos para o service
      });

      // Auditoria
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          acao: 'CREATE',
          entidade: 'OCCURRENCE',
          entidadeId: occurrence.id,
          detalhes: { 
            tipo: occurrence.tipo, 
            local: occurrence.local,
            fotosCount: files ? files.length : 0
          },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Ocorrência criada com sucesso',
        data: occurrence
      });
    } catch (error: any) {
      console.error('Create occurrence error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Erro ao criar ocorrência'
      });
    }
  }

  // ==================== UPDATE ====================
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const updatedOccurrence = await occurrenceService.update(
        id, 
        req.body, 
        req.user!.id
      );

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          acao: 'UPDATE',
          entidade: 'OCCURRENCE',
          entidadeId: id,
          detalhes: { changes: req.body },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.json({
        success: true,
        message: 'Ocorrência atualizada com sucesso',
        data: updatedOccurrence
      });
    } catch (error: any) {
      console.error('Update occurrence error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Erro ao atualizar ocorrência'
      });
    }
  }

  // ==================== LIST ALL ====================
  async list(req: AuthRequest, res: Response) {
    try {
      const {
        status, tipo, prioridade, dataInicio, dataFim, page = 1, limit = 50
      } = req.query;

      const where: any = {};

      if (status) where.status = status;
      if (tipo) where.tipo = tipo;
      if (prioridade) where.prioridade = prioridade;

      if (dataInicio || dataFim) {
        where.dataOcorrencia = {};
        if (dataInicio) where.dataOcorrencia.gte = new Date(dataInicio as string);
        if (dataFim) where.dataOcorrencia.lte = new Date(dataFim as string);
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [occurrences, total] = await Promise.all([
        prisma.occurrence.findMany({
          where,
          include: {
            criadoPor: { select: { nome: true, email: true, cargo: true } },
            responsavel: { select: { nome: true, email: true, cargo: true } }
          },
          orderBy: { dataOcorrencia: 'desc' },
          skip,
          take
        }),
        prisma.occurrence.count({ where })
      ]);

      return res.json({
        success: true,
        data: occurrences,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('List occurrences error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar ocorrências'
      });
    }
  }

  // ==================== Outros métodos (getById, delete, getStats) ====================
  // (Mantidos conforme o passo anterior, usando Prisma direto para leitura)
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const occurrence = await prisma.occurrence.findUnique({
        where: { id },
        include: {
          criadoPor: { select: { nome: true, email: true, cargo: true, telefone: true } },
          responsavel: { select: { nome: true, email: true, cargo: true, telefone: true } },
          historico: { orderBy: { createdAt: 'desc' } }
        }
      });

      if (!occurrence) return res.status(404).json({ success: false, message: 'Ocorrência não encontrada' });
      return res.json({ success: true, data: occurrence });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erro ao buscar ocorrência' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const occurrence = await prisma.occurrence.findUnique({ where: { id } });
      if (!occurrence) return res.status(404).json({ success: false, message: 'Ocorrência não encontrada' });
      
      await prisma.occurrence.delete({ where: { id } });
      
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          acao: 'DELETE',
          entidade: 'OCCURRENCE',
          entidadeId: id,
          detalhes: { tipo: occurrence.tipo },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
      return res.json({ success: true, message: 'Ocorrência excluída com sucesso' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erro ao excluir ocorrência' });
    }
  }

  async getStats(req: AuthRequest, res: Response) {
    try {
      const [total, novas, emAnalise, emAtendimento, concluidas, porTipo, porPrioridade] = await Promise.all([
        prisma.occurrence.count(),
        prisma.occurrence.count({ where: { status: 'NOVO' } }),
        prisma.occurrence.count({ where: { status: 'EM_ANALISE' } }),
        prisma.occurrence.count({ where: { status: 'EM_ATENDIMENTO' } }),
        prisma.occurrence.count({ where: { status: 'CONCLUIDO' } }),
        prisma.occurrence.groupBy({ by: ['tipo'], _count: true }),
        prisma.occurrence.groupBy({ by: ['prioridade'], _count: true })
      ]);

      return res.json({
        success: true,
        data: { total, porStatus: { novas, emAnalise, emAtendimento, concluidas }, porTipo, porPrioridade }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
    }
  }
}