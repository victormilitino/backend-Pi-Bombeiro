// test-opencage.ts
// Rode com: npx ts-node test-opencage.ts

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testOpenCage() {
  const apiKey = process.env.OPENCAGE_API_KEY;
  
  console.log('=== TESTE DO OPENCAGE ===\n');
  
  if (!apiKey) {
    console.log('❌ ERRO: OPENCAGE_API_KEY não encontrada no .env');
    console.log('Adicione: OPENCAGE_API_KEY=sua_chave_aqui');
    return;
  }
  
  console.log('✅ API Key encontrada:', apiKey.substring(0, 8) + '...');
  
  const testAddress = 'Avenida Boa Viagem, 3000, Boa Viagem, Recife, Pernambuco, Brasil';
  
  console.log('\n📍 Testando endereço:', testAddress);
  
  try {
    const response = await axios.get(
      'https://api.opencagedata.com/geocode/v1/json',
      {
        params: {
          q: testAddress,
          key: apiKey,
          limit: 1
        }
      }
    );
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      console.log('\n✅ GEOCODING FUNCIONANDO!');
      console.log('   Latitude:', result.geometry.lat);
      console.log('   Longitude:', result.geometry.lng);
      console.log('   Endereço formatado:', result.formatted);
      
      // Verifica se está em Recife (aproximadamente)
      const lat = result.geometry.lat;
      const lng = result.geometry.lng;
      
      if (lat >= -8.2 && lat <= -7.9 && lng >= -35.1 && lng <= -34.8) {
        console.log('\n✅ Coordenadas estão na região de Recife!');
      } else {
        console.log('\n⚠️ ATENÇÃO: Coordenadas podem estar fora de Recife');
      }
    } else {
      console.log('\n❌ Nenhum resultado encontrado');
      console.log('Resposta:', JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.log('\n❌ ERRO na requisição:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Mensagem:', error.response.data);
    } else {
      console.log('   ', error.message);
    }
  }
}

testOpenCage();
