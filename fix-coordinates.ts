import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.OPENCAGE_API_KEY;
  
  if (!apiKey) {
    console.log('API Key não configurada');
    return null;
  }

  try {
    const response = await axios.get(
      'https://api.opencagedata.com/geocode/v1/json',
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
      return { lat: result.geometry.lat, lng: result.geometry.lng };
    }
  } catch (error) {
    console.log(`Erro ao geocodificar`);
  }
  return null;
}

async function fixCoordinates() {
  console.log('=== CORRIGINDO COORDENADAS ===\n');

  const occurrences = await prisma.occurrence.findMany({
    select: { id: true, endereco: true, local: true, bairro: true }
  });

  console.log(`Total: ${occurrences.length} ocorrencias\n`);

  let ok = 0;

  for (const occ of occurrences) {
    const addr = occ.endereco || `${occ.local}, ${occ.bairro || ''}`;
    console.log(`[${ok + 1}/${occurrences.length}] ${addr}`);

    await new Promise(r => setTimeout(r, 1100));

    const coords = await geocodeAddress(addr);

    if (coords) {
      await prisma.occurrence.update({
        where: { id: occ.id },
        data: { latitude: coords.lat, longitude: coords.lng }
      });
      console.log(`   OK: ${coords.lat}, ${coords.lng}\n`);
      ok++;
    } else {
      console.log(`   ERRO\n`);
    }
  }

  console.log(`\nCorrigidas: ${ok}`);
}

fixCoordinates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());