import { PrismaClient, TipoOcorrencia, Prioridade, StatusOcorrencia } from '@prisma/client';
import axios from 'axios';

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
  files?: Express.Multer.File[]; // Campo para os arquivos
}

export class OccurrenceService {
  
  async create(data: CreateOccurrenceDTO) {
    let lat = data.latitude;
    let lng = data.longitude;

    // Extrai apenas os nomes dos arquivos salvos para guardar no banco
    const fotos = data.files?.map(file => file.filename) || [];

    // Se não vier coordenadas, tenta buscar na API
    if (!lat || !lng) {
      try {
        const geocoded = await this.geocodeAddress(data.endereco);
        lat = geocoded.latitude;
        lng = geocoded.longitude;
      } catch (error) {
        throw { 
          statusCode: 400, 
          message: 'Não foi possível localizar as coordenadas deste endereço automaticamente. Por favor, insira a latitude e longitude manualmente.' 
        };
      }
    }

    // Garante que são números (form-data envia como string)
    const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
    const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;

    return await prisma.occurrence.create({
      data: {
        tipo: data.tipo,
        local: data.local,
        endereco: data.endereco,
        latitude: latitude!,
        longitude: longitude!,
        status: data.status || 'NOVO',
        prioridade: data.prioridade || 'MEDIA',
        descricao: data.descricao,
        criadoPorId: data.criadoPorId,
        responsavelId: data.responsavelId,
        fotos: fotos, // Salva o array de strings
        dataOcorrencia: new Date()
      },
      include: {
        criadoPor: { select: { nome: true, email: true, cargo: true } },
        responsavel: { select: { nome: true, email: true, cargo: true } }
      }
    });
  }

  async update(id: string, data: any, userId: string) {
    const current = await prisma.occurrence.findUnique({ where: { id } });
    
    if (!current) {
      throw { statusCode: 404, message: 'Ocorrência não encontrada' };
    }

    // Lógica de histórico
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

    // Atualiza datas e tempos automaticamente
    if (data.status === 'EM_ATENDIMENTO' && !current.dataAtendimento) {
      updateData.dataAtendimento = new Date();
      updateData.tempoResposta = Math.floor(
        (new Date().getTime() - current.dataOcorrencia.getTime()) / 60000
      );
    }

    if (data.status === 'CONCLUIDO' && !current.dataConclusao) {
      updateData.dataConclusao = new Date();
    }

    return await prisma.occurrence.update({
      where: { id },
      data: updateData,
      include: {
        criadoPor: { select: { nome: true } },
        responsavel: { select: { nome: true } }
      }
    });
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