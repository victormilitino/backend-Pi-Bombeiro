import { PrismaClient, TipoOcorrencia, Prioridade, StatusOcorrencia } from '@prisma/client';
import axios from 'axios';
import { getIO } from '../socket';

const prisma = new PrismaClient();

interface CreateOccurrenceDTO {
  tipo: TipoOcorrencia;
  local: string;
  endereco: string;
  latitude?: number;
  longitude?: number;
  status?: StatusOcorrencia;
  prioridade?: Prioridade;
  descricao?: string;
  criadoPorId: string;
  responsavelId?: string;
  files?: Express.Multer.File[];
}

export class OccurrenceService {
  
  async create(data: CreateOccurrenceDTO) {
    // 1. CONVERSÃO CRÍTICA: Garantir que lat/lng sejam números (floats)
    // O formulário envia como string " -8.05", precisamos converter para -8.05
    let lat = data.latitude ? parseFloat(String(data.latitude)) : undefined;
    let lng = data.longitude ? parseFloat(String(data.longitude)) : undefined;

    // Extrai nomes dos arquivos
    const fotos = data.files?.map(file => file.filename) || [];

    // 2. Geocodificação Automática (se não vier coordenadas)
    // Força a busca ser em "Recife, Pernambuco" para evitar endereços da Europa/EUA
    if (!lat || !lng) {
      try {
        // Adiciona contexto 'Recife, Pernambuco' à busca
        const enderecoBusca = `${data.endereco}, Recife, Pernambuco, Brasil`;
        const geocoded = await this.geocodeAddress(enderecoBusca);
        lat = geocoded.latitude;
        lng = geocoded.longitude;
      } catch (error) {
        // Se falhar a geocodificação, usa coordenadas padrão do Marco Zero (Recife)
        // para não quebrar o sistema, mas avisa no log.
        console.warn('Falha na geocodificação, usando padrão:', error);
        lat = -8.0631;
        lng = -34.8711;
      }
    }

    // 3. Cria no Banco
    const occurrence = await prisma.occurrence.create({
      data: {
        tipo: data.tipo,
        local: data.local,
        endereco: data.endereco,
        latitude: lat,
        longitude: lng,
        status: data.status || 'NOVO',
        prioridade: data.prioridade || 'MEDIA',
        descricao: data.descricao,
        fotos: fotos, // Salva o array de nomes de arquivos
        criadoPorId: data.criadoPorId,
        responsavelId: data.responsavelId
      },
      include: {
        criadoPor: {
          select: { id: true, nome: true, email: true }
        },
        responsavel: {
          select: { id: true, nome: true }
        }
      }
    });

    // 4. Emite Socket para o Frontend ver em tempo real
    try {
      const io = getIO();
      io.emit('occurrence:new', occurrence);
    } catch (error) {
      console.error('Erro ao emitir socket:', error);
    }

    return occurrence;
  }

  async update(id: string, data: any, userId: string) {
    const current = await prisma.occurrence.findUnique({ where: { id } });
    
    if (!current) {
      throw { statusCode: 404, message: 'Ocorrência não encontrada' };
    }

    // Histórico
    if (data.status && data.status !== current.status) {
      await prisma.occurrenceHistory.create({
        data: {
          occurrenceId: id,
          statusAnterior: current.status,
          statusNovo: data.status,
          observacao: data.observacoes || 'Atualização de status',
          modificadoPor: userId
        }
      });
    }

    const updateData: any = { ...data, updatedAt: new Date() };

    // Atualiza datas
    if (data.status === 'EM_ATENDIMENTO' && !current.dataAtendimento) {
      updateData.dataAtendimento = new Date();
      updateData.tempoResposta = Math.floor(
        (new Date().getTime() - current.dataOcorrencia.getTime()) / 60000
      );
    }

    if (data.status === 'CONCLUIDO' && !current.dataConclusao) {
      updateData.dataConclusao = new Date();
    }

    // 1. Atualiza no Banco
    const updatedOccurrence = await prisma.occurrence.update({
      where: { id },
      data: updateData,
      include: {
        criadoPor: { select: { nome: true } },
        responsavel: { select: { nome: true } }
      }
    });

    // 2. Emite o evento para o Socket.io (Tempo Real)
    try {
      const io = getIO();
      io.emit('occurrence:update', updatedOccurrence);
    } catch (error) {
      console.error('Erro ao emitir socket na atualização:', error);
    }

    return updatedOccurrence;
  }

  private async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    const apiKey = process.env.OPENCAGE_API_KEY;
    
    if (!apiKey) {
      throw new Error('API Key de geocodificação não configurada');
    }

    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json`,
      {
        params: {
          q: `${address}, Recife, Pernambuco, Brasil`,
          key: apiKey,
          limit: 1
        }
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        latitude: result.geometry.lat,
        longitude: result.geometry.lng
      };
    }

    throw new Error('Endereço não encontrado');
  }
}