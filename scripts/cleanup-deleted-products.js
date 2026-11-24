const SUPABASE_URL = 'https://ogldhoxfbjhgvwpjocoj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbGRob3hmYmpoZ3Z3cGpvY29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjA2MzUsImV4cCI6MjEwODQzNjYzNX0.y0SC-PYdh0pXgAkmnjWS_GaOWbCdpgkhMTFlWgqbdGs';

const DELETED_IDS = [
  'p-combo-3-marmitas-m',
  'p-combo-3-marmitas-p',
  'p-marmita-prato-do-dia',
  'p-marmita-economica-10'
];

async function cleanup() {
  console.log('1. Buscando produtos atuais no Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ct_cloud_sync?id=eq.products&select=data`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  const rows = await res.json();
  const currentProducts = rows[0]?.data || [];
  console.log(`Total atual de produtos: ${currentProducts.length}`);

  const cleanedProducts = currentProducts.filter(p => !DELETED_IDS.includes(p.id));
  console.log(`Total após remoção dos 4 itens excluídos: ${cleanedProducts.length}`);

  // 2. Salvar produtos limpos no Supabase
  console.log('2. Salvando produtos atualizados no Supabase...');
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/ct_cloud_sync`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: 'products',
      data: cleanedProducts,
      updated_at: new Date().toISOString()
    })
  });

  if (!updateRes.ok) {
    throw new Error(`Erro ao atualizar produtos: ${await updateRes.text()}`);
  }
  console.log('✅ Produtos atualizados com sucesso no Supabase!');

  // 3. Salvar deleted_product_ids no Supabase para sincronização cross-device
  console.log('3. Salvando deleted_product_ids no Supabase...');
  const deletedRes = await fetch(`${SUPABASE_URL}/rest/v1/ct_cloud_sync`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: 'deleted_product_ids',
      data: DELETED_IDS,
      updated_at: new Date().toISOString()
    })
  });

  if (!deletedRes.ok) {
    throw new Error(`Erro ao salvar deleted_product_ids: ${await deletedRes.text()}`);
  }
  console.log('✅ deleted_product_ids sincronizado no Supabase!');

  // 4. Verificação final
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/ct_cloud_sync?id=eq.products&select=data`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  const verifyRows = await verifyRes.json();
  const verifyNames = (verifyRows[0]?.data || []).map(p => p.name);
  console.log('Contém combos deletados?:', verifyNames.filter(n => n.includes('Combo com Três') || n.includes('Bife a Cavalo') || n.includes('Econômica (A partir')));
  console.log('Contém marmitas restantes?:', verifyNames.filter(n => n.includes('Marmita')));
}

cleanup().catch(console.error);
